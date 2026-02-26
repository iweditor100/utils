import { getPrisma } from "../../prisma/client";
import { logger } from "../../logger";
import type { AuthEvent } from "@prisma/client";

const prisma = getPrisma();

export const audit = {
  async logAudit(input: {
    event: AuthEvent;
    userId?: string;
    adminId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: unknown;
  }) {
    try {
      await prisma.authAuditLog.create({
        data: {
          userId: input.userId,
          adminId: input.adminId,
          sessionId: input.sessionId,
          event: input.event,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: input.metadata as any
        }
      });
    } catch (e) {
      logger.warn({ msg: "Audit log failed", error: e, event: input.event });
    }
  },
  // Write login event
  async logLogin(userId: string, sessionId: string | undefined, ip?: string, userAgent?: string, metadata?: any) {
    await audit.logAudit({ userId, sessionId, ipAddress: ip, userAgent, metadata, event: "LOGIN" });
  },
  async logLogout(userId?: string, sessionId?: string, ip?: string, userAgent?: string, metadata?: any) {
    await audit.logAudit({ userId, sessionId, ipAddress: ip, userAgent, metadata, event: "LOGOUT" });
  },
  async logRefresh(userId: string, sessionId: string, ip?: string, userAgent?: string, metadata?: any) {
    await audit.logAudit({ userId, sessionId, ipAddress: ip, userAgent, metadata, event: "REFRESH" });
  },
  async logTokenRotation(userId: string, sessionId: string, ip?: string, userAgent?: string, metadata?: any) {
    await audit.logAudit({ userId, sessionId, ipAddress: ip, userAgent, metadata, event: "TOKEN_ROTATION" });
  },
  async logReplayDetected(userId: string, sessionId: string, ip?: string, userAgent?: string, metadata?: any) {
    await audit.logAudit({
      userId,
      sessionId,
      ipAddress: ip,
      userAgent,
      metadata: { ...metadata, replayDetected: true },
      event: "TOKEN_ROTATION"
    });
  },
  async logInvalidRefreshAttempt(userId?: string, sessionId?: string, ip?: string, userAgent?: string, metadata?: any) {
    await audit.logAudit({
      userId,
      sessionId,
      ipAddress: ip,
      userAgent,
      metadata: { ...metadata, invalidAttempt: true },
      event: "REFRESH"
    });
  }
};
