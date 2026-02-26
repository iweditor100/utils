import jwt, { SignOptions, VerifyOptions, JwtPayload } from "jsonwebtoken";
import { AccessTokenPayload, VerifiedAccessToken } from "./tokenTypes";

// Secret read at startup for determinism/purity
const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || (() => { throw new Error("ACCESS_TOKEN_SECRET missing"); })();

const ISSUER = "my.saas";       // Set to service/domain
const AUDIENCE = "my.saas";     // Can be frontend/global/specific client
const ACCESS_TOKEN_LIFETIME_SEC = 900; // 15 minutes

// Signs a JWT access token; options are explicit for security.
export function signAccessToken(payload: {
  userId: string;
  sessionId: string;
}): string {
  const opts: SignOptions = {
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: ACCESS_TOKEN_LIFETIME_SEC,
    algorithm: "HS256",
  };

  return jwt.sign(
    {
      userId: payload.userId,
      sessionId: payload.sessionId,
    },
    ACCESS_TOKEN_SECRET,
    opts
  );
}


// Verifies and decodes JWT access token. Throws if invalid/expired/structure wrong.
export function verifyAccessToken(token: string): VerifiedAccessToken {
  const opts: VerifyOptions = {
    issuer: ISSUER,
    audience: AUDIENCE,
    clockTolerance: 5, // seconds (leeway)
    algorithms: ["HS256"],
  };
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, opts) as JwtPayload;
  if (
    typeof decoded !== "object" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.sessionId !== "string" ||
    typeof decoded.iat !== "number" ||
    typeof decoded.exp !== "number"
  ) {
    throw new Error("Invalid token payload structure");
  }

  return {
    userId: decoded.userId,
    sessionId: decoded.sessionId,
    iat: decoded.iat,
    exp: decoded.exp,
    iss: decoded.iss as string,
    aud: decoded.aud as string,
  };
}

