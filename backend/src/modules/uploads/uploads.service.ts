import crypto from "crypto";
import { enforceUploadPolicy } from "./uploads.policy";
import { UPLOAD_LIMITS } from "./uploads.constants";
import type { PresignUploadInput, PresignUploadResult } from "./uploads.types";
import { presignPutObject } from "../../infra/storage/storage.service";

function extractExtension(fileName: string): string {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.pop()! : "bin";
}

export async function presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    enforceUploadPolicy({
        category: input.category,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
    });


    const ext = extractExtension(input.fileName);
    const prefix = UPLOAD_LIMITS[input.category].prefix;
    // Avatar keys use original.<ext> so the image-worker's consumer can process them
    const key =
        input.category === "avatar"
            ? `${prefix}/${input.userId}/original.${ext}`
            : `${prefix}/${input.userId}/${crypto.randomUUID()}/testing/original.${ext}`;

    const { uploadUrl } = await presignPutObject({
        key,
        contentType: input.mimeType,
        fileSize: input.fileSize,
    })


    return { uploadUrl, key };
}