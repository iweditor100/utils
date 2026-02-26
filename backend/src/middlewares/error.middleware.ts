import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

// Central error handler — no stack traces in response
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  logger.error({ err, url: req.originalUrl, method: req.method });

  res.status(500).json({
    error: "Internal Server Error"
  });
}

