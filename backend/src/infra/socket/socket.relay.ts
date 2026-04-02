import IORedis from "ioredis";
import { env } from "../../config/env";
import { getIO } from "./socket";
import { DOWNLOAD_EVENTS_CHANNEL, type DownloadEvent } from "./download.publisher";
import { createChildLogger } from "../../logger";

const log = createChildLogger("socket-relay");

export function startSocketRelay() {
    const subscriber = new IORedis({
        host: env.REDIS_HOST,
        port: Number(env.REDIS_PORT),
        maxRetriesPerRequest: null,
    });

    subscriber.subscribe(DOWNLOAD_EVENTS_CHANNEL, (err) => {
        if (err) log.error({ err }, "Failed to subscribe to download events channel");
        else log.info({ channel: DOWNLOAD_EVENTS_CHANNEL }, "Subscribed to download events channel");
    });

    subscriber.on("message", (_channel, message) => {
        try {
            const event: DownloadEvent = JSON.parse(message);
            const io = getIO();

            if (event.type === "progress") {
                io.to(`user:${event.userId}`).emit("download:progress", {
                    jobId: event.jobId,
                    progress: event.progress,
                });
            } else if (event.type === "complete") {
                io.to(`user:${event.userId}`).emit("download:complete", {
                    jobId: event.jobId,
                });
            }
        } catch (err) {
            log.error({ err }, "Failed to handle socket relay message");
        }
    });

    return subscriber;
}
