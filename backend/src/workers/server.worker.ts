import { createImageWorker } from "./image.worker";
import { createZipWorker } from "../modules/downloads/workers/zip.worker";
import { createCleanupWorker } from "../modules/downloads/workers/cleanup.worker";
import { createChildLogger } from "../logger";

const log = createChildLogger("worker-server");

log.info("Worker server starting");

const workers = [
    createImageWorker(),
    createZipWorker(),
];

const cronJobs = [
    // createCleanupWorker(),
];

log.info({ count: workers.length }, "Workers initialized");

process.on("SIGTERM", async () => {
    log.info("SIGTERM received, shutting down workers");

    // cronJobs.forEach((job) => job.stop());
    await Promise.all(workers.map((w) => w.close()));

    log.info("All workers closed");
    process.exit(0);
});
