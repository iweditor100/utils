import crypto from "crypto";
import { RefreshTokenPlain } from "./tokenTypes";

// Generate a securely random refresh token. 64 bytes (512 bits) of entropy is chosen for security margin
// and to be far above typical attack capability. Recommended by modern NIST/OWASP guidelines.
// The output is URL-safe by using base64url encoding.
// This token is *not* a JWT—there is no internal structure; it is unparseable and unforgeable.
export function generateRefreshToken(): RefreshTokenPlain {
  return crypto.randomBytes(64).toString("base64url");
}

