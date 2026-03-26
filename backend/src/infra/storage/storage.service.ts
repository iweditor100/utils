// Presign PUT/GET for R2. Backend does not stream file bytes.
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import type { Readable } from "stream";
import { r2Client } from "./r2.client";
import { STORAGE_CONFIG } from "./storage.config";

export async function presignPutObject(params: {
  key: string;
  contentType: string;
  fileSize: number;
}) {
  const command = new PutObjectCommand({
    Bucket: STORAGE_CONFIG.bucket,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.fileSize,
  });
  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: STORAGE_CONFIG.presignExpiresInSeconds,
  });

  return { uploadUrl };
}

// Presign GET: issues a time-limited read URL for a private R2 object.
// Expiry is intentionally shorter than PUT (15 min default) since these URLs
// are issued on-demand and should not remain valid longer than a user session action.
export async function presignGetObject(key: string) {
  const command = new GetObjectCommand({
    Bucket: STORAGE_CONFIG.bucket,
    Key: key,
  });
  const downloadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: STORAGE_CONFIG.presignDownloadExpiresInSeconds,
  });
  return { downloadUrl };
}

// Streams a Readable directly into R2 via multipart upload.
// Use this for large or dynamically-generated content (e.g. ZIP files)
// where Content-Length is unknown upfront.
export async function uploadStreamToR2(key: string, stream: Readable, contentType = "application/zip") {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: STORAGE_CONFIG.bucket,
      Key: key,
      Body: stream,
      ContentType: contentType,
    },
  });
  await upload.done();
}

// Returns the raw Node.js Readable stream for a key without buffering.
export async function getFileStreamFromR2(key: string): Promise<Readable> {
  const response = await r2Client.send(
    new GetObjectCommand({ Bucket: STORAGE_CONFIG.bucket, Key: key })
  );
  return response.Body as Readable;
}

// Permanently removes an object from R2.
export async function deleteObject(key: string) {
  await r2Client.send(
    new DeleteObjectCommand({ Bucket: STORAGE_CONFIG.bucket, Key: key })
  );
}



// Returns true if the key exists in R2, false if not found.
export async function headObject(key: string): Promise<boolean> {
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: STORAGE_CONFIG.bucket, Key: key }));
    return true;
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}
