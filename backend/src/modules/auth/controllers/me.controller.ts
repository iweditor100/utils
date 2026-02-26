import { Request, Response } from "express";
import { getPrisma } from "../../../prisma/client";
import { SessionService } from "../services/session.service";
import { sendError, sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";

export async function meController(req: Request, res: Response) {
  const { userId, sessionId } = (req as any).user || {};
  if (!userId || !sessionId) {
    return sendError(
      res,
      AUTH_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      [{ auth: "Authentication required" }]
    )
  }
  // Validate session status
  const valid = await SessionService.validateSession(sessionId);
  if (!valid) {
    return sendError(
      res,
      AUTH_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      [{ auth: "Authentication required" }]
    )
  }
  // Fetch safe user object
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return sendError(
      res,
      AUTH_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      [{ auth: "Authentication required" }]
    )
  }
  const { id, name, email, picture, status, emailVerifiedAt } = user;
  return sendSuccess(
    res,
    AUTH_CODES.USER_REGISTERED,
    {
      user: { id, name, email, picture, status, emailVerifiedAt }
    },
    HTTP_STATUS.OK
  )
}

