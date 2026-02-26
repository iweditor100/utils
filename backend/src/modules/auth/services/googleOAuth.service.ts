import { OAuth2Client, TokenPayload } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(idToken: string): Promise<TokenPayload> {
  // Verify token via Google's public keys (not via JWT.decode or relying on frontend claims)
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google payload");
  // Validate issuer (defense in depth)
  if (!GOOGLE_ISSUERS.includes(payload.iss)) throw new Error("Invalid Google token issuer");
  if (!payload.email || !payload.email_verified) throw new Error("Email not verified by Google");
  if (!payload.sub) throw new Error("No Google sub (providerId)");
  return payload;
}

