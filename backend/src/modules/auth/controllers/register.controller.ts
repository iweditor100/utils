import { Request, Response } from "express";
import { date, z } from "zod";
import { getPrisma } from "../../../prisma/client";
import bcrypt from "bcrypt";
import { emailService } from "../services/email.service";
import { generateEmailToken, hashEmailToken } from "../utils/emailTokens";
import { registerSchema } from "../validators/auth.validators";
import { audit } from "../../../services/audit/audit.service";
import { sendError, sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";

export async function registerController(req: Request, res: Response) {
  const parse = registerSchema.safeParse(req.body);
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
  const { email, password, name } = parse.data;
  const prisma = getPrisma();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Uniform timing; never indicate existing status
      await new Promise(r => setTimeout(r, 400));

      // check if the user is verified or not, ->resend verification. 
      if (!existing.emailVerifiedAt) {
        // if not verified
        await prisma.emailVerificationToken.updateMany({
          where: {userId: existing.id, usedAt: null},
          data: {usedAt: new Date()},
        });


        const { token, hash, expiresAt } = generateEmailToken({
          email, 
          purpose: "verify"
        });

        await prisma.emailVerificationToken.create({
          data: { userId: existing.id, tokenHash: hash, expiresAt}
        });

        await emailService.sendVerificationEmail({ to: email, token });
      }


      // send success even if that already exists
      return sendSuccess(
        res, 
        AUTH_CODES.USER_REGISTERED,
        HTTP_STATUS.CREATED
      )
    };


    const passwordHash = await bcrypt.hash(password, 12);
    // if (!existing) {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        status: "ACTIVE",
        identities: {
          create: [{ provider: "EMAIL", passwordHash }]
        },
      },
      include: { identities: true }
    });
    // }
    // Generate and store a one-time, expiring verification token
    const { token, hash, expiresAt } = generateEmailToken({ email, purpose: "verify" });
    await audit.logAudit({ userId: user!.id, event: "REGISTER" });
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user!.id, usedAt: null },
      data: { usedAt: new Date() }
    });
    await prisma.emailVerificationToken.create({
      data: { userId: user!.id, tokenHash: hash, expiresAt }
    });
    await emailService.sendVerificationEmail({ to: email, token });
    return sendSuccess(
      res,
      AUTH_CODES.USER_REGISTERED,
      HTTP_STATUS.CREATED
    )
  } catch (err) {
    // Intentionally uniform response (avoid account enumeration) — but log internally
    audit.logAudit({ event: "REGISTER", userId: undefined, metadata: { error: String(err) } });
    return sendError(
      res,
      AUTH_CODES.USER_REGISTERED,
      HTTP_STATUS.CREATED,
    )
  }
}

