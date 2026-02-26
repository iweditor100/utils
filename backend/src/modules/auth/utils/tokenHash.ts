import crypto from "crypto";
import { RefreshTokenPlain, RefreshTokenHash } from "./tokenTypes";

// Hashes a token using a server-side secret via HMAC-SHA256.
// Hashing (instead of encryption) is used because the server will only ever need to verify
// a token against a stored value, never to retrieve the original token.
// HMAC with a secret ensures that even if the DB leaks, attacker's knowledge is limited.
const TOKEN_HASH_SECRET =
  process.env.REFRESH_TOKEN_SECRET || (() => { throw new Error("REFRESH_TOKEN_SECRET missing"); })();

export function hashToken(token: RefreshTokenPlain): RefreshTokenHash {
  // Deterministic, strong hash using secret key
  return crypto
    .createHmac("sha256", TOKEN_HASH_SECRET)
    .update(token)
    .digest("hex");
}

// Constant-time comparison to avoid timing attacks
export function verifyTokenHash(token: RefreshTokenPlain, hash: RefreshTokenHash): boolean {
  const computed = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
}

