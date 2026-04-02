import cron from "node-cron";
import { getPrisma } from "../../../prisma/client";
import { deleteObject } from "../../../infra/storage/storage.service";
import { createChildLogger } from "../../../logger";

const log = createChildLogger("cleanup-worker");

async function deleteExpiredArchives() {
    const prisma = getPrisma();

    const expired = await prisma.downloadJob.findMany({
        where: {
            status: "COMPLETED",
            zipKey: { not: null },
            expiresAt: { lte: new Date() },
        },
        select: { id: true, zipKey: true },
    });

    if (expired.length === 0) {
        log.info("No expired archives to clean up");
        return;
    }

    log.info({ count: expired.length }, "Cleaning up expired archives");

    let deleted = 0;
    let failed = 0;

    for (const job of expired) {
        try {
            await deleteObject(job.zipKey!);
            await prisma.downloadJob.update({
                where: { id: job.id },
                data: { zipKey: null },
            });
            deleted++;
            log.info({ jobId: job.id, zipKey: job.zipKey }, "Archive deleted");
        } catch (err: any) {
            // Already gone from R2 — still null the key so we don't retry it.
            if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
                await prisma.downloadJob.update({
                    where: { id: job.id },
                    data: { zipKey: null },
                });
                deleted++;
                log.warn({ jobId: job.id, zipKey: job.zipKey }, "Archive already absent from R2, cleared DB key");
            } else {
                log.error({ err, jobId: job.id, zipKey: job.zipKey }, "Failed to delete archive from R2");
                failed++;
            }
        }
    }

    log.info({ deleted, failed }, "Archive cleanup run complete");
}

export function createCleanupWorker() {
    // Runs every hour at :00. The 24h expiresAt window means at most 24 runs
    // before a given archive is caught — acceptable drift for a cleanup job.
    const task = cron.schedule("0 * * * *", async () => {
        log.info("Archive cleanup triggered");
        try {
            await deleteExpiredArchives();
        } catch (err) {
            log.error({ err }, "Archive cleanup run failed unexpectedly");
        }
    });

    log.info("Archive cleanup worker scheduled (hourly)");
    return task;
}
