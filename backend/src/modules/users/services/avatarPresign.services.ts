import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { env } from "../../../config/env";
import { r2Client } from "../../../infra/storage/r2.client";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function presignAvatarUpload(
    userId: string,
    fileSize: number,
    contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
    if (!ALLOWED_TYPES.includes(contentType)) {
        throw new Error("Unsupported image format or file type");
    }

    if (fileSize > MAX_SIZE) {
        throw new Error("File size exceeds the maximum allowed size");
    }

    const ext = contentType.split("/")[1];
    const key = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
        expiresIn: env.R2_PRESIGN_EXPIRES_IN_SECONDS,
    });

    return {
        uploadUrl,
        publicUrl: `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`,
    };
}