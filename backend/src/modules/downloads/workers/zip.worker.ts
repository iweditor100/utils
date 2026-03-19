import { Worker } from "bullmq";
import IORedis from "ioredis";
import archiver from "archiver";
import { PassThrough } from "stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

import { r2Client } from "../../../infra/storage/r2.client";
import { uploadStreamToR2 } from "../../../infra/storage/storage.service";
import { getPrisma } from "../../../prisma/client";
import { env } from "../../../config/env";
import type { CreateZipJobPayload } from "../downloads.types";

// Safely update a DownloadJob. If the record doesn't exist (e.g. dev test jobs
// pushed directly to queue without a DB row), log and continue instead of crashing.
async function safeUpdateJob(id: string, data: Record<string, unknown>) {
    const prisma = getPrisma();
    try {
        await prisma.downloadJob.update({ where: { id }, data });
    } catch (err: any) {
        if (err?.code === "P2025") {
            console.warn(`[zip] no DB record for jobId=${id}, skipping status update`);
            return;
        }
        throw err;
    }
}

export const createZipWorker = () => {
    const connection = new IORedis({
        host: env.REDIS_HOST,
        port: Number(env.REDIS_PORT),
        maxRetriesPerRequest: null,
    });

    const worker = new Worker<CreateZipJobPayload>(
        "zip-jobs",
        async (job) => {
            const { jobId, fileKeys } = job.data;
            console.log(`[zip] starting job=${jobId} files=${fileKeys.length}`);

            await safeUpdateJob(jobId, { status: "PROCESSING" });

            const zipKey = `zips/${jobId}/archive.zip`;

            try {
                const archive = archiver("zip", { zlib: { level: 6 } });
                const passThrough = new PassThrough();

                archive.pipe(passThrough);

                // Start upload immediately — reads from passThrough as archiver writes.
                const uploadPromise = uploadStreamToR2(zipKey, passThrough);

                archive.on("warning", (err) => {
                    if (err.code !== "ENOENT") throw err;
                    console.warn("[zip] archive warning:", err.message);
                });

                archive.on("error", (err) => {
                    throw err;
                });

                // Stream each file from R2 and append to archive.
                for (const key of fileKeys) {
                    let response;
                    try {
                        response = await r2Client.send(
                            new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key })
                        );
                    } catch (err: any) {
                        if (err?.name === "NoSuchKey" || err?.Code === "NoSuchKey") {
                            console.warn(`[zip] file not found, skipping: ${key}`);
                            continue;
                        }
                        throw err;
                    }

                    if (!response.Body) {
                        console.warn(`[zip] empty body for key: ${key}`);
                        continue;
                    }

                    const filename = key.split("/").pop() ?? key;
                    archive.append(response.Body as Readable, { name: filename });
                    console.log(`[zip] appended: ${filename}`);
                }

                // Finalize signals end-of-archive → ends passThrough → upload resolves.
                await archive.finalize();
                await uploadPromise;

                await safeUpdateJob(jobId, {
                    status: "COMPLETED",
                    zipKey,
                    progress: 100,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
                });

                console.log(`[zip] completed job=${jobId} key=${zipKey}`);
            } catch (err: any) {
                console.error(`[zip] failed job=${jobId}:`, err);
                await safeUpdateJob(jobId, {
                    status: "FAILED",
                    error: err?.message ?? "Unknown error",
                });
                throw err;
            }
        },
        {
            connection,
            concurrency: 1,
        }
    );

    worker.on("completed", (job) => {
        console.log("[zip] job completed:", job.id);
    });

    worker.on("failed", (job, error) => {
        console.error("[zip] job failed:", job?.id, error.message);
    });

    return worker;
};
