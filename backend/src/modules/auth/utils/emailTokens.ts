import jwt from "jsonwebtoken";
import crypto from "crypto";

const EMAIL_TOKEN_SECRET = process.env.EMAIL_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET!;
const EMAIL_TOKEN_EXPIRY = 60 * 20; // 20 min

export function generateEmailToken({ email, purpose }: { email: string; purpose: string }) {
  const payload = { email, purpose };
  const token = jwt.sign(payload, EMAIL_TOKEN_SECRET, {
    expiresIn: EMAIL_TOKEN_EXPIRY,
    algorithm: "HS256"
  });
  const hash = hashEmailToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_TOKEN_EXPIRY * 1000);
  return { token, hash, expiresAt };
}

export function verifyAndDecodeEmailToken(token: string) {
  return jwt.verify(token, EMAIL_TOKEN_SECRET, { algorithms: ["HS256"] }) as { email: string; purpose: string; exp: number };
}

export function hashEmailToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

