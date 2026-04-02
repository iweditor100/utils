import { getPrisma } from "../../../prisma/client";
import { generateRefreshToken } from "../utils/refreshToken";
import { hashToken } from "../utils/tokenHash";
import { audit } from "../../../services/audit/audit.service";
import { redis } from "../../../infra/redis";
import { createChildLogger } from "../../../logger";

const log = createChildLogger("session");

const prisma = getPrisma();

/**
 * Helper to generate Redis cache key for session validation.
 * Format: session:valid:<sessionId>
 * 
 * This key is used as a positive cache only - it indicates a session
 * was recently validated as valid. Negative results are never cached.
 */
function getSessionValidationKey(sessionId: string): string {
  return `session:valid:${sessionId}`;
}

export class SessionService {
  /**
   * Create a new session and associated refresh token.
   * Returns the session id, plaintext refresh token and expiry.
   */
  static async createSession(input: {
    userId: string;
    ipAddress: string;
    userAgent: string;
    deviceLabel?: string;
  }): Promise<{ sessionId: string; refreshTokenPlain: string; expiresAt: Date }> {
    const sessionExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
    const refreshTokenPlain = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshTokenPlain);

    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          userId: input.userId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          deviceLabel: input.deviceLabel,
          expiresAt: sessionExpiresAt
        }
      });
      await redis.set(getSessionValidationKey(session.id), "1", "EX", 300).catch(() => {});
      await tx.refreshToken.create({
        data: {
          userId: input.userId,
          sessionId: session.id,
          tokenHash: refreshTokenHash,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          expiresAt: sessionExpiresAt
        }
      });
      await audit.logLogin(input.userId, session.id, input.ipAddress, input.userAgent);
      return {
        sessionId: session.id,
        refreshTokenPlain,
        expiresAt: sessionExpiresAt
      };
    });
  }

  /**
   * Rotate a refresh token, enforcing strict replay safety.
   * If replay detected, all user sessions and tokens are revoked.
   */
  static async rotateRefreshToken(input: {
    refreshTokenPlain: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{ userId: string; sessionId: string; refreshTokenPlain: string; expiresAt: Date }> {
    const refreshTokenHash = hashToken(input.refreshTokenPlain);
    const now = new Date();

    // Find token, including relations for user/session lookup
    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: { user: true, session: true }
    });

    // Validation: real token, live, not rotated/revoked, not expired
    if (!existing || existing.revokedAt || existing.expiresAt <= now) {
      await audit.logInvalidRefreshAttempt(existing?.userId, existing?.sessionId ?? undefined, input.ipAddress, input.userAgent);
      throw new Error("Invalid or expired refresh token");
    }
    // Must be bound to an active session
    if (!existing.sessionId || !existing.session || existing.session.revokedAt || existing.session.expiresAt <= now) {
      await audit.logInvalidRefreshAttempt(existing.userId, existing.sessionId ?? undefined, input.ipAddress, input.userAgent, {
        reason: "Session invalid for refresh token"
      });
      throw new Error("Invalid session for refresh token");
    }
    const sessionId = existing.sessionId;
    // Replay detection: if replacedById exists, this is a reuse, REVOKE ALL
    if (existing.replacedById) {
      await SessionService.revokeAllSessions(existing.userId);
      await audit.logReplayDetected(existing.userId, existing.sessionId, input.ipAddress, input.userAgent);
      throw new Error("Refresh token replay detected; all sessions revoked");
    }
    // Rotate: create new, revoke old in transaction, maintain replacedById chain
    const sessionExpiresAt = existing.session.expiresAt;
    const newRefreshTokenPlain = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshTokenPlain);
    return await prisma.$transaction(async (tx) => {
      // Mark old as revoked and replaced
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: {
          revokedAt: now,
          replacedById: undefined // will update after new token
        }
      });
      // Create new
      const newToken = await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          sessionId,
          tokenHash: newRefreshTokenHash,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          expiresAt: sessionExpiresAt
        }
      });
      // Chain old token to new via replacedById
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { replacedById: newToken.id }
      });
      await audit.logTokenRotation(existing.userId, sessionId, input.ipAddress, input.userAgent);
      return {
        userId: existing.userId,
        sessionId,
        refreshTokenPlain: newRefreshTokenPlain,
        expiresAt: sessionExpiresAt
      };
    });
  }

  /**
   * Revoke all tokens for a specific session, and mark session as revoked.
   * After DB revocation, invalidates the Redis cache entry for this session.
   * Redis deletion is best-effort and never throws.
   */
  static async revokeSession(sessionId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      await tx.session.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    });

    // Invalidate Redis cache entry (best-effort, must not throw)
    // This ensures revoked sessions don't appear valid in cache
    try {
      await redis.del(getSessionValidationKey(sessionId));
    } catch {
      // Redis failure must not impact logout flow
      // Cache will expire naturally via TTL, or be invalidated on next validation
    }
    
    await audit.logLogout(undefined, sessionId);
  }

  /**
   * Logout everywhere: revoke all sessions and refresh tokens for user.
   * After DB revocation, invalidates all Redis cache entries for active sessions.
   * Redis deletion is best-effort, runs outside DB transaction, and never throws.
   */
  static async revokeAllSessions(userId: string): Promise<void> {
    // Fetch active session IDs before revocation (needed for Redis cleanup)
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: { id: true },
    });
    
    // Revoke all sessions and tokens in DB transaction
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    });

    // Invalidate Redis cache entries for all revoked sessions (best-effort, must not throw)
    // This runs outside the DB transaction to avoid blocking on Redis
    // Cache will expire naturally via TTL if Redis deletion fails
    try {
      if (sessions.length > 0) {
        const keys = sessions.map((s) => getSessionValidationKey(s.id));
        await redis.del(...keys);
      }
    } catch {
      // Redis failure must not impact logout flow
      // Individual cache entries will expire via TTL or be invalidated on next validation
    }
    
    await audit.logLogout(userId, undefined);
  }
  
  /**
   * Determines if a session is currently valid (exists, unexpired, not revoked).
   * 
   * Cache semantics:
   * - Redis is used as a short-lived positive cache only (TTL ≤ 5 minutes)
   * - PostgreSQL is the authoritative source of truth
   * - Redis failures are ignored; validation always falls back to DB
   * - Only valid sessions are cached; invalid/revoked sessions are never cached
   * - Cache hit: returns true immediately (fast path)
   * - Cache miss: queries DB, caches result if valid, returns validation result
   * 
   * This ensures Redis is never a hard dependency - auth works even if Redis is down.
   */
  static async validateSession(sessionId: string): Promise<boolean> {
    const start = process.hrtime.bigint();
    const cacheKey = getSessionValidationKey(sessionId);
    const now = new Date();

    // Redis fast path: check positive cache (best-effort, must not block)
    // If Redis is down or key doesn't exist, we fall through to DB validation
    try {
      const redisStart = process.hrtime.bigint();
      const cached = await redis.get(cacheKey);
      const redisEnd = process.hrtime.bigint();

      // Cache hit: session was recently validated as valid
      if (cached === "1") {
        log.debug({
          redis_ms: Number(redisEnd - redisStart) / 1e6,
          total_ms: Number(redisEnd - start) / 1e6,
        }, "Session validation: Redis HIT");
        return true;
      }
    } catch {
      // Redis error: silently fall through to DB validation
      // This ensures Redis failures never cause auth failures
    }

    // Database validation: authoritative source of truth
    const dbStart = process.hrtime.bigint();
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    const dbEnd = process.hrtime.bigint();

    // Validate session exists, is not revoked, and not expired
    if (!session) return false;
    if (session.revokedAt) return false;
    if (session.expiresAt <= now) return false;

    // Session is valid: cache positive result for future fast-path lookups
    // TTL of 300 seconds (5 minutes) keeps cache fresh and limits stale data window
    // Redis failure is ignored - cache is performance optimization only
    try {
      await redis.set(cacheKey, "1", "EX", 300);
    } catch {
      // Redis failure must not impact validation result
      // Next validation will query DB again (acceptable performance trade-off)
    }

    return true;
  }
}
