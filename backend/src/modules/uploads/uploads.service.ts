import crypto from "crypto";
import { enforceUploadPolicy } from "./uploads.policy";
import { UPLOAD_LIMITS } from "./uploads.constants";
import type { PresignUploadInput, PresignUploadResult } from "./uploads.types";
import { presignPutObject, presignGetObject } from "../../infra/storage/storage.service";
import { findUploadById, findUploadsByOwnerId } from "./uploads.repository";
import { UploadNotFoundError, UploadAccessDeniedError } from "./uploads.errors";

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
            : `${prefix}/${input.userId}/${crypto.randomUUID()}/${Date.now()}.${ext}`;

    const { uploadUrl } = await presignPutObject({
        key,
        contentType: input.mimeType,
        fileSize: input.fileSize,
    })


    return { uploadUrl, key };
}

export async function getDownloadUrl(fileId: string, userId: string) {
    const upload = await findUploadById(fileId);

    if (!upload) {
        throw new UploadNotFoundError();
    }

    if (upload.ownerId !== userId) {
        throw new UploadAccessDeniedError();
    }

    const { downloadUrl } = await presignGetObject(upload.key);
    return { url: downloadUrl };
}

export async function listUploads(userId: string, page: number, limit: number) {
    const { uploads, total } = await findUploadsByOwnerId(userId, page, limit);
    return {
        uploads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}