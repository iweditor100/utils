import type { Request, Response } from "express";
import { z } from "zod";
import { sendError, sendSuccess } from "../../utils";
import { HTTP_STATUS, UPLOAD_CODES } from "../../constants";
import { imageQueue } from "./image.queue";
import { createUpload } from "./uploads.repository";

const completeSchema = z.object({
    key:      z.string().min(1),
    category: z.string().min(1),
    mimeType: z.string().min(1),
    size:     z.number().int().positive(),
});

export async function completeUploadController(req: Request, res: Response) {
    try {
        const userId = req.user?.userId;

        const parsed = completeSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, UPLOAD_CODES.UPLOAD_INVALID_INPUT, HTTP_STATUS.BAD_REQUEST);
        }

        const { key, category, mimeType, size } = parsed.data;

        // Verify the key was issued for this user. Keys are structured as
        // "{prefix}/{userId}/..." so the userId must appear as a path segment.
        // This prevents a user from completing (and thereby claiming) another
        // user's upload key.
        if (!key.includes(`/${userId}/`)) {
            return sendError(res, UPLOAD_CODES.UPLOAD_INVALID_KEY, HTTP_STATUS.FORBIDDEN);
        }

        // Persist file metadata. upsert is used so that duplicate /complete
        // calls (e.g. from a client retry) are idempotent.
        // mimeType and size come from the frontend but were already validated
        // against UPLOAD_LIMITS at presign time, so we trust them here.
        const upload = await createUpload({ ownerId: userId as string, key, mimeType, size, category });

        // Queue image processing if applicable. Failure here does NOT roll back
        // the DB record — the file is in R2 and tracked; processing can be
        // retried separately.
        try {
            await imageQueue.add(
                "generate-avatar-thumbnails",
                { key, userId },
                {
                    attempts: 3,
                    backoff: { type: "exponential", delay: 2000 },
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            );
        } catch (queueError) {
            console.error("[COMPLETE] Failed to enqueue image job:", queueError);
        }

        return sendSuccess(res, UPLOAD_CODES.UPLOAD_COMPLETE_SUCCESS, { id: upload.id }, HTTP_STATUS.OK);
    } catch (error) {
        console.error("[COMPLETE] Unexpected error:", error);
        return sendError(res, UPLOAD_CODES.UPLOAD_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}
