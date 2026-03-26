import IORedis from "ioredis";
import { env } from "../../config/env";

export const DOWNLOAD_EVENTS_CHANNEL = "download:events";

export type DownloadEvent =
    | { type: "progress"; userId: string; jobId: string; progress: number }
    | { type: "complete"; userId: string; jobId: string };

let publisher: IORedis | null = null;

function getPublisher(): IORedis {
    if (!publisher) {
        publisher = new IORedis({
            host: env.REDIS_HOST,
            port: Number(env.REDIS_PORT),
            maxRetriesPerRequest: null,
        });
    }
    return publisher;
}

export async function publishDownloadEvent(event: DownloadEvent) {
    await getPublisher().publish(DOWNLOAD_EVENTS_CHANNEL, JSON.stringify(event));
}
