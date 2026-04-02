import { Request, Response } from "express";
import { getPrisma } from "../../../prisma/client";
import { z } from "zod";
import { audit } from "../../../services/audit/audit.service";
import { emailService } from "../services/email.service";
import { generateEmailToken } from "../utils/emailTokens";
import { sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";
import { createChildLogger } from "../../../logger";

const log = createChildLogger("auth");


const forgotSchema = z.object({ email: z.string().email() });

export async function forgotPasswordController(req: Request, res: Response) {
  const parse = forgotSchema.safeParse(req.body);
  if (!parse.success) {
    return sendSuccess(
      res,
      AUTH_CODES.PASSWORD_RESET_SENT,
      {},
      HTTP_STATUS.OK
    )
  }

  const { email } = parse.data;
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.emailVerifiedAt) {
    const { token, hash, expiresAt } = generateEmailToken({ email, purpose: "reset" });
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt }
    });
    await emailService.sendResetPasswordEmail({ to: email, token });
    await audit.logAudit({ userId: user.id, event: "FORGOT_PASSWORD" });
    log.info({ userId: user.id }, "Password reset email dispatched");
  } else {
    await new Promise(r => setTimeout(r, 400));
  }
  return sendSuccess(
    res,
    AUTH_CODES.PASSWORD_RESET_SENT,
    {},
    HTTP_STATUS.OK
  )
}

