import { S3Client, ListMultipartUploadsCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from backend root
config({ path: resolve(process.cwd(), "../../.env") });

const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "NEVER",
    responseChecksumValidation: "NEVER",
});

const BUCKET = process.env.R2_BUCKET!;

async function cleanupOrphanedUploads() {
    console.log(`Scanning bucket: ${BUCKET}`);

    const res = await client.send(new ListMultipartUploadsCommand({ Bucket: BUCKET }));

    const uploads = res.Uploads ?? [];
    console.log(`Found ${uploads.length} incomplete multipart upload(s)`);

    if (uploads.length === 0) {
        console.log("Nothing to clean up.");
        return;
    }

    for (const upload of uploads) {
        await client.send(new AbortMultipartUploadCommand({
            Bucket: BUCKET,
            Key: upload.Key!,
            UploadId: upload.UploadId!,
        }));
        console.log(`Aborted: ${upload.Key}  uploadId=${upload.UploadId}`);
    }

    console.log(`Done. Aborted ${uploads.length} upload(s).`);
}

cleanupOrphanedUploads().catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
});
