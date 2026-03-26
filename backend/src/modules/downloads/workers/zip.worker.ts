import { Worker } from "bullmq";
import IORedis from "ioredis";
import archiver from "archiver";
import { PassThrough } from "stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import { r2Client } from "../../../infra/storage/r2.client";
import { uploadStreamToR2 } from "../../../infra/storage/storage.service";
import { publishDownloadEvent } from "../../../infra/socket/download.publisher";
import { getPrisma } from "../../../prisma/client";
import { env } from "../../../config/env";
import type { CreateZipJobPayload } from "../downloads.types";
import { emailService } from "../../auth/services/email.service";

const FETCH_CONCURRENCY = 4;

type FetchedFile = { filename: string; body: Readable } | null;

// Fetches all R2 objects concurrently (up to FETCH_CONCURRENCY at a time),
// preserving the original key order in the returned array.
async function fetchFilesFromR2(keys: string[]): Promise<FetchedFile[]> {
    const results: FetchedFile[] = new Array(keys.length).fill(null);
    let cursor = 0;

    async function worker() {
        while (true) {
            const i = cursor++;
            if (i >= keys.length) break;
            const key = keys[i];
            try {
                const response = await r2Client.send(
                    new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key })
                );
                if (response.Body) {
                    // Key structure: category/userId/uuid/original.ext
                    // Use uuid + original filename so every file in the ZIP is unique.
                    const segments = key.split("/");
                    const originalName = segments.pop() ?? key;
                    const uuid = segments.pop() ?? "";
                    const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : "";
                    const filename = uuid ? `${uuid}${ext}` : originalName;

                    results[i] = {
                        body: response.Body as Readable,
                        filename,
                    };
                } else {
                    console.warn(`[zip] empty body for key: ${key}`);
                }
            } catch (err: any) {
                if (err?.name === "NoSuchKey" || err?.Code === "NoSuchKey") {
                    console.warn(`[zip] file not found, skipping: ${key}`);
                } else {
                    throw err;
                }
            }
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(FETCH_CONCURRENCY, keys.length) }, () => worker())
    );
    return results;
}

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
            const { jobId, userId, fileKeys } = job.data;
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

                // Fetch all files from R2 in parallel, then append to archive in order.
                const total = fileKeys.length;
                let processed = 0;

                const fetched = await fetchFilesFromR2(fileKeys);

                for (const file of fetched) {
                    processed++;
                    if (!file) continue; // was skipped (NoSuchKey / empty body)

                    archive.append(file.body, { name: file.filename });
                    console.log(`[zip] appended: ${file.filename}`);

                    const progress = Math.round((processed / total) * 100);
                    await safeUpdateJob(jobId, { progress });
                    await publishDownloadEvent({ type: "progress", userId, jobId, progress });
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

                await publishDownloadEvent({ type: "complete", userId, jobId });
                console.log(`[zip] completed job=${jobId} key=${zipKey}`);

                // Send email notification — fire and forget, never blocks the worker.
                // Socket event above already handles users with the tab open.
                // Email is the fallback for users who closed the tab.
                if (userId !== "anonymous") {
                    const prisma = getPrisma();
                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { email: true },
                    });
                    if (user?.email) {
                        console.log(`[zip] sending email to ${user.email} for job=${jobId}`);
                        emailService.sendZipReadyEmail({ to: user.email, jobId });
                        console.log(`[zip] email dispatched to ${user.email}`);
                    }
                }
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
            // Each job fetches up to FETCH_CONCURRENCY R2 streams in parallel.
            // 4 concurrent jobs = up to 16 simultaneous R2 connections — fine for most setups.
            // Increase if you add more worker processes or have higher throughput needs.
            concurrency: 4,
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
