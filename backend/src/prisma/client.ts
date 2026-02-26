import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { logger } from "../logger";

const isDev = env.NODE_ENV === "development";

let prisma: PrismaClient | undefined;
let shutdownHooksInstalled = false;

export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: isDev ? ["error", "warn"] : ["error", "warn"]
    });
  }

  if (prisma && !shutdownHooksInstalled) {
    shutdownHooksInstalled = true;

    const disconnect = async (signal: string) => {
      try {
        logger.info({ signal }, "Disconnecting Prisma client");
        await prisma?.$disconnect();
      } catch (err) {
        logger.error({ err, signal }, "Error while disconnecting Prisma client");
      }
    };

    process.once("beforeExit", () => void disconnect("beforeExit"));
    process.once("SIGINT", () => void disconnect("SIGINT"));
    process.once("SIGTERM", () => void disconnect("SIGTERM"));
  }
  return prisma;
}

