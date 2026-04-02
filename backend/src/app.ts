import express from "express";
import { corsMiddleware } from "./config/cors";
import { helmetMiddleware } from "./config/security";
import cookieParser from "cookie-parser";
import { logger } from "./logger";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";
import { asyncHandler } from "./utils/asyncHandler";
import router from "./routes";

const app = express();

// Global middlewares
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Health endpoint — only public route
app.get(
  "/health",
  asyncHandler(async (_req, res) => {
    logger.info("Health check");
    res.status(200).json({ status: "ok" });
  })
);


// Routes:
app.use("/", router);

// 404 handler
app.use(notFoundMiddleware);

// Global error handler
app.use(errorMiddleware);

export { app };