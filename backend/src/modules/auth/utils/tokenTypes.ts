// Explicit TypeScript types for token utilities only

export type AccessTokenPayload = {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
};

export type VerifiedAccessToken = AccessTokenPayload & {
  iss: string;
  aud: string;
};

export type RefreshTokenPlain = string;
export type RefreshTokenHash = string;

