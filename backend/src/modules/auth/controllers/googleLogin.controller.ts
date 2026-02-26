import { Request, Response } from "express";
import { getPrisma } from "../../../prisma/client";
import { googleLoginSchema } from "../validators/google.validators";
import { verifyGoogleIdToken } from "../services/googleOAuth.service";
import { SessionService } from "../services/session.service";
import { signAccessToken } from "../utils/accessToken";
import { audit } from "../../../services/audit/audit.service";

export async function googleLoginController(req: Request, res: Response) {
  // Validate input
  const parse = googleLoginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { idToken } = parse.data;
  let payload;
  try {
    payload = await verifyGoogleIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid Google token" });
  }
  const prisma = getPrisma();
  // CASE 1: AuthIdentity exists for Google sub
  let user = null;
  let justLinkedGoogleIdentity = false;
  let userCreated = false;
  let googleIdentity = await prisma.authIdentity.findUnique({
    where: { provider_providerId: { provider: "GOOGLE", providerId: payload.sub } },
    include: { user: true }
  });
  if (googleIdentity && googleIdentity.user) {
    user = googleIdentity.user;
  } else {
    // CASE 2/3: Find by email (must prevent dupe)
    const emailUser = await prisma.user.findUnique({ where: { email: payload.email! } });
    if (emailUser) {
      // Link to existing user (if not already linked)
      await prisma.authIdentity.create({
        data: {
          userId: emailUser.id,
          provider: "GOOGLE",
          providerId: payload.sub,
          verifiedAt: new Date()
        }
      });
      user = emailUser;
      justLinkedGoogleIdentity = true;
    } else {
      // CASE 3: Completely new user
      user = await prisma.user.create({
        data: {
          email: payload.email!,
          name: payload.name,
          picture: payload.picture,
          emailVerifiedAt: new Date(),
          status: "ACTIVE",
          identities: {
            create: [{ provider: "GOOGLE", providerId: payload.sub, verifiedAt: new Date() }]
          }
        }
      });
      userCreated = true;
    }
  }
  // Guarantee never two users with same email
  if (!user) return res.status(500).json({ error: "Failed to resolve Google user" });
  // Create session (same as email login)
  const { sessionId, refreshTokenPlain, expiresAt } = await SessionService.createSession({
    userId: user.id,
    ipAddress: req.ip as string,
    userAgent: req.get("User-Agent") || "",
  });
  const accessToken = signAccessToken({ userId: user.id, sessionId });
  res.cookie("refresh_token", refreshTokenPlain, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    expires: expiresAt,
    path: "/auth"
  });
  await audit.logLogin(user.id, sessionId, req.ip, req.get("User-Agent") || "", { provider: "GOOGLE", userCreated, justLinkedGoogleIdentity });
  const { id, name, email, picture, status, emailVerifiedAt } = user;
  res.json({
    accessToken,
    user: { id, name, email, picture, status, emailVerifiedAt }
  });
}

