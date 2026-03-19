import type { Request, Response } from "express";
import { z } from "zod";
import { sendError, sendSuccess } from "../../utils";
import { HTTP_STATUS, UPLOAD_CODES } from "../../constants";
import { listUploads } from "./uploads.service";

const listQuerySchema = z.object({
    page:  z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function listUploadsController(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return sendError(res, UPLOAD_CODES.UPLOAD_INVALID_INPUT, HTTP_STATUS.BAD_REQUEST);
    }

    const { page, limit } = parsed.data;
    const userId = req.user?.userId as string;

    try {
        const result = await listUploads(userId, page, limit);
        return sendSuccess(res, UPLOAD_CODES.UPLOAD_LIST_SUCCESS, result, HTTP_STATUS.OK);
    } catch (error) {
        console.error("[LIST UPLOADS] Unexpected error:", error);
        return sendError(res, UPLOAD_CODES.UPLOAD_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}
