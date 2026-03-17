// Presign PUT/GET for R2. Backend does not stream file bytes.
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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



