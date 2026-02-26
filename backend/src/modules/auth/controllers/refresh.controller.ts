import { Request, Response } from "express";
import { SessionService } from "../services/session.service";
import { signAccessToken } from "../utils/accessToken";
import { sendError, sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";

export async function refreshController(req: Request, res: Response) {
  const refreshTokenPlain = req.cookies?.refresh_token;
  if (!refreshTokenPlain) {
    return sendError(
      res,
      AUTH_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      [{ auth: "Authentication required" }]
    )
  }
  try {
    const { userId, sessionId, refreshTokenPlain: newRefresh, expiresAt } = await SessionService.rotateRefreshToken({
      refreshTokenPlain,
      ipAddress: req.ip as string,
      userAgent: req.get("User-Agent") || ""
    });
    // New access token
    const accessToken = signAccessToken({ userId, sessionId });
    // Set refreshed cookie
    res.cookie("refresh_token", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      expires: expiresAt,
      path: "/auth"
    });
    return sendSuccess(
      res,
      AUTH_CODES.LOGIN_SUCCESS,
      { accessToken },
      HTTP_STATUS.OK
    )
  } catch (err) {
    // Always clear cookie on failure, to prevent re-use
    res.clearCookie("refresh_token", { path: "/auth" });
    return sendError(
      res,
      AUTH_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      [{ auth: "Authentication required" }]
    )
  }
}

