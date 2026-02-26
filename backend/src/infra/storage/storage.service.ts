// Presign PUT for R2. Backend does not download or upload image bytes; Worker handles processing.
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "./r2.client";
import { STORAGE_CONFIG } from "./storage.config";

export async function presignPutObject(params: {
  key: string;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: STORAGE_CONFIG.bucket,
    Key: params.key,
  });
  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: STORAGE_CONFIG.presignExpiresInSeconds,
  });
  return { uploadUrl };
}



