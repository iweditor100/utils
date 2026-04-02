import { Worker } from "bullmq";
import IORedis from "ioredis";
import sharp from "sharp";
import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

import { r2Client } from "../infra/storage/r2.client";
import { env } from "../config/env";
import { createChildLogger } from "../logger";

const log = createChildLogger("image-worker");

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export const createImageWorker = () => {
  const connection = new IORedis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    "image-processing",
    async (job) => {
      const { key } = job.data;

      if (!key?.includes("original")) {
        log.debug({ key }, "Skipping non-original image");
        return;
      }

      // Skip unsupported formats before fetching from R2.
      // CR2/NEF/ARW and other RAW formats are not supported by Sharp —
      // downloading them just to fail wastes bandwidth and saturates the event loop.
      const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff"]);
      const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        log.warn({ key, ext }, "Unsupported image format, skipping");
        return;
      }

      const thumbKey = key.replace("original", "thumb");
      const mediumKey = key.replace("original", "medium");

      // Idempotency (check BOTH)
      const [thumbExists, mediumExists] = await Promise.allSettled([
        r2Client.send(
          new HeadObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: thumbKey,
          })
        ),
        r2Client.send(
          new HeadObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: mediumKey,
          })
        ),
      ]);

      if (
        thumbExists.status === "fulfilled" &&
        mediumExists.status === "fulfilled"
      ) {
        log.debug({ key }, "Image already processed, skipping");
        return;
      }

      // Fetch original (defensive)
      let originalObject;
      try {
        originalObject = await r2Client.send(
          new GetObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
          })
        );
      } catch (err: any) {
        if (err?.Code === "NoSuchKey") {
          log.warn({ key }, "Original image missing in R2, skipping");
          return; // DO NOT FAIL
        }
        throw err; // retry infra issues
      }

      if (!originalObject.Body) {
        log.warn({ key }, "Empty body from R2, skipping");
        return;
      }

      const originalBuffer = await streamToBuffer(originalObject.Body);
      const contentType = originalObject.ContentType || "image/jpeg";

      // Process with sharp (defensive)
      let thumb: Buffer;
      let medium: Buffer;

      try {
        thumb = await sharp(originalBuffer)
          .resize(200, 200, { fit: "cover" })
          .toBuffer();

        medium = await sharp(originalBuffer)
          .resize(500, 500, { fit: "cover" })
          .toBuffer();
      } catch (err) {
        log.error({ err, key }, "Sharp processing failed, skipping");
        return; // bad image → skip
      }

      // Upload (retry-worthy if fails)
      try {
        await Promise.all([
          r2Client.send(
            new PutObjectCommand({
              Bucket: env.R2_BUCKET,
              Key: thumbKey,
              Body: thumb,
              ContentType: contentType,
            })
          ),
          r2Client.send(
            new PutObjectCommand({
              Bucket: env.R2_BUCKET,
              Key: mediumKey,
              Body: medium,
              ContentType: contentType,
            })
          ),
        ]);
      } catch (err) {
        log.error({ err, key }, "R2 upload failed");
        throw err; // retry this
      }

      log.info({ key }, "Image processed successfully");
    },
    {
      connection,
      concurrency: 2,
      limiter: {
        max: 50,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    log.info({ jobId: job.id }, "Image worker: job completed");
  });

  worker.on("failed", (job, error) => {
    log.error({ jobId: job?.id, err: error }, "Image worker: job failed");
  });

  return worker;
};
