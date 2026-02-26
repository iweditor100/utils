import { app } from "./app";
import { env } from "./config/env";
import { getPrisma } from "./prisma/client";
import { logger } from "./logger";
import { createServer } from "http";
import { Server } from "socket.io";
import { initSocketServer } from "./infra/socket/socket";

// Ensures Prisma connects on boot
async function bootstrap() {
  try {
    await getPrisma().$connect();

    const httpServer = createServer(app);
    initSocketServer(httpServer);

    httpServer.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, env: env.NODE_ENV },
        `🚀 Server ready — listening on port ${env.PORT}`
      );
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

bootstrap();

