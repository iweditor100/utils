import { Request, Response } from "express";
import { getPrisma } from "../../../prisma/client";
import { verifyAndDecodeEmailToken, hashEmailToken } from "../utils/emailTokens";
import { audit } from "../../../services/audit/audit.service";
import { sendError, sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";
import { createChildLogger } from "../../../logger";

const log = createChildLogger("auth");

export async function verifyEmailController(req: Request, res: Response) {
  const rawToken = req.query.token as string | undefined;
  if (!rawToken) {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      [{ auth: "Missing token" }]
    )
  }
  let decoded;
  try {
    decoded = verifyAndDecodeEmailToken(rawToken);
  } catch {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      [{ auth: "Invalid or expired token" }]
    )
  }
  const hash = hashEmailToken(rawToken);
  const prisma = getPrisma();
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });
  if (!record || record.usedAt || !record.user || record.expiresAt < new Date()) {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      [{ auth: "Invalid or expired token" }]
    )
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() }
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
  ]);
  await audit.logAudit({ userId: record.userId, event: "EMAIL_VERIFY" });
  log.info({ userId: record.userId }, "Email verified");
  return sendSuccess(
    res,
    AUTH_CODES.EMAIL_VERIFIED,
    HTTP_STATUS.OK
  )
}

