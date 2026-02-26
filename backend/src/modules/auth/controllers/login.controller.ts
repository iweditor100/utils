import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";


import { getPrisma } from "../../../prisma/client";
import { signAccessToken } from "../utils/accessToken";
import { SessionService } from "../services/session.service";
import { sendSuccess, sendError } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";
import { error } from "console";



const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function loginController(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      parse.error.errors.map((err) => ({
        [err.path.join(".")]: err.message
      }))
    )
  }
  const { email, password } = parse.data;
  const prisma = getPrisma();
  // Fetch user and EMAIL identity
  const user = await prisma.user.findUnique({
    where: { email },
    include: { identities: true }
  });
  const identity = user?.identities.find(
    (i: any) => i.provider === "EMAIL" && i.passwordHash
  );
  // Check status and existence
  if (!user || !identity || !identity.passwordHash || !user.emailVerifiedAt || user.status !== "ACTIVE") {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.UNAUTHORIZED,

    )
  }
  const passwordValid = await bcrypt.compare(password, identity.passwordHash);
  if (!passwordValid) {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }
  // Create session & refresh token
  const { sessionId, refreshTokenPlain, expiresAt } = await SessionService.createSession({
    userId: user.id,
    ipAddress: req.ip ?? "unknown",
    userAgent: req.get("User-Agent") ?? "unknown",
  });

  // Sign access token with REAL sessionId
  const accessToken = signAccessToken({
    userId: user.id,
    sessionId,
  });

  // Store REAL refresh token
  res.cookie("refresh_token", refreshTokenPlain, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    expires: expiresAt,
    path: "/auth",
  });

  // Return safe user object
  const { id, name, email: returnedEmail, picture, status, emailVerifiedAt } = user;
  // res.json({
  //   accessToken,
  //   user: { id, name, email: returnedEmail, picture, status, emailVerifiedAt }
  // });
  return sendSuccess(
    res,
    AUTH_CODES.LOGIN_SUCCESS,
    {
      accessToken,
      user: { id, name, email: returnedEmail, picture, status, emailVerifiedAt },
    },
    HTTP_STATUS.OK
  )
}

