import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/accessToken";
import { SessionService } from "../services/session.service";


// Attaches: req.user = { userId, sessionId }
export async function authenticateMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = verifyAccessToken(token);
    
    const isValid = await SessionService.validateSession(payload.sessionId);
    if (!isValid) return res.status(401).json({ error: "Unauthorized"});
    // Attach user info (for route use)
    (req as any).user = { userId: payload.userId, sessionId: payload.sessionId };
    next();
  
  } catch (_) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

