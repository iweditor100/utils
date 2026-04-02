import { Request, Response } from "express";
import { SessionService } from "../services/session.service";
import { sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";
import { createChildLogger } from "../../../logger";

const log = createChildLogger("auth");

export async function logoutController(req: Request, res: Response) {
  const { sessionId, userId } = (req as any).user || {};
  if (!sessionId) {
    res.clearCookie("refresh_token", { path: "/auth" });
    log.warn("Logout called with no sessionId");
    return res.status(204).end();
  }
  await SessionService.revokeSession(sessionId);
  res.clearCookie("refresh_token", { path: "/auth" });
  log.info({ userId, sessionId }, "User logged out");
  res.status(204).end();
}
