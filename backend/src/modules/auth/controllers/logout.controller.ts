import { Request, Response } from "express";
import { SessionService } from "../services/session.service";
import { sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";

export async function logoutController(req: Request, res: Response) {
  const { sessionId } = (req as any).user || {};
  if (!sessionId) {
    res.clearCookie("refresh_token", { path: "/auth" });
    return res.status(204).end();
  }
  await SessionService.revokeSession(sessionId);
  res.clearCookie("refresh_token", { path: "/auth" });
  res.status(204).end();
}

