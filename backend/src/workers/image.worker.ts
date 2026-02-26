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
import { resolve } from "path";
import { rejects } from "assert";
import { buffer } from "stream/consumers";

const connection = new IORedis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    maxRetriesPerRequest: null,
});

function streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    })
}

const worker = new Worker(
    "image-processing",
    async (job) => {
        const { key } = job.data;

        if (!key.includes("original")) {
            console.log("Skipping non-original file:", key);
            return; //silently just return. 
        }


        const thumbKey = key.replace("original", "thumb");
        const mediumKey = key.replace("original", "medium");

        // Idempotency check. 
        try {
            await r2Client.send(
                new HeadObjectCommand({
                    Bucket: env.R2_BUCKET,
                    Key: thumbKey,
                })
            );

            console.log("thumbnails already exist for this key: ", key);
            return;
        } catch {
            // not found -> continue from here. no return
        }

        console.log("Processing: ", key);
        const startTime = new Date().toISOString();
        console.log("time: ", startTime);


        // download the original: 
        const originalObject = await r2Client.send(
            new GetObjectCommand({
                Bucket: env.R2_BUCKET,
                Key: key,
            })
        )

        if (!originalObject.Body) {
            throw new Error("No body found for key: " + key);
        }

        const originalBuffer = await streamToBuffer(originalObject.Body);

        if (originalBuffer.length > 10 * 1024 * 1024) {
            throw new Error("File too large: " + key);
        }

        const contentType = originalObject.ContentType || "image/jpeg";

        // Generate thumbnails
        const thumb = await sharp(originalBuffer)
            .resize(200, 200, { fit: "cover" })
            .toBuffer();

        const medium = await sharp(originalBuffer)
            .resize(500, 500, { fit: "cover" })
            .toBuffer();



        const sharpTime = new Date().toISOString();
        console.log("time after sharp: ", sharpTime);

        // upload the thumb. 
        await r2Client.send(
            new PutObjectCommand({
                Bucket: env.R2_BUCKET,
                Key: thumbKey,
                Body: thumb,
                ContentType: contentType,
            })
        )

        // upload the medium.
        await r2Client.send(
            new PutObjectCommand({
                Bucket: env.R2_BUCKET,
                Key: mediumKey,
                Body: medium,
                ContentType: contentType,
            })
        )

        const uploadTime = new Date().toISOString();
        console.log("time after upload: ", uploadTime);
        console.log("Thumbs generated for: ", key);
    }, {
    connection,
    concurrency: 2,
}
);


worker.on("completed", (job) => {
    console.log("Job completed: ", job.id);
});

worker.on("failed", (job, error) => {
    console.log("Job failed: ", job?.id, error);
});

process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    await worker.close();
    console.log("Worker closed");
    process.exit(0);
});



console.log("Image worker started");