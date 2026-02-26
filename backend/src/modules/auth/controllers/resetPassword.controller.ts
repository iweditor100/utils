import { Request, Response } from "express";
import { z } from "zod";
import { getPrisma } from "../../../prisma/client";
import { hashEmailToken, verifyAndDecodeEmailToken } from "../utils/emailTokens";
import { SessionService } from "../services/session.service";
import bcrypt from "bcrypt";
import { audit } from "../../../services/audit/audit.service";
import { sendError, sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";
const resetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
});

export async function resetPasswordController(req: Request, res: Response) {
  const parse = resetSchema.safeParse(req.body);
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
  const { token, newPassword } = parse.data;
  let decoded;
  try {
    decoded = verifyAndDecodeEmailToken(token);
  } catch {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      [{ auth: "Invalid or expired token" }]
    )
  }
  const hash = hashEmailToken(token);
  const prisma = getPrisma();
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hash },
    include: { user: { include: { identities: true } } },
  });
  if (!record || record.usedAt || !record.user || record.expiresAt < new Date()) {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      [{ auth: "Invalid or expired token" }]
    )
  }
  const emailIdentity = record.user.identities.find((i) => i.provider === "EMAIL");
  if (!emailIdentity) {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      [{ msg: "This type of account does not support change password" }]
    )
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.authIdentity.update({
      where: { id: emailIdentity.id },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
  ]);
  await SessionService.revokeAllSessions(record.userId);
  await audit.logAudit({ userId: record.userId, event: "RESET_PASSWORD" });
  return sendSuccess(
    res,
    AUTH_CODES.PASSWORD_RESET_SUCCESS,
    HTTP_STATUS.OK
  )
}

