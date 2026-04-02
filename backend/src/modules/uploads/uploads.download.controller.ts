import type { Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils";
import { HTTP_STATUS, UPLOAD_CODES } from "../../constants";
import { fileIdParamSchema } from "./uploads.validators";
import { getDownloadUrl } from "./uploads.service";
import { UploadNotFoundError, UploadAccessDeniedError } from "./uploads.errors";
import { createChildLogger } from "../../logger";

const log = createChildLogger("uploads");

export async function getDownloadUrlController(req: Request, res: Response) {
    const parsed = fileIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return sendError(res, UPLOAD_CODES.UPLOAD_INVALID_INPUT, HTTP_STATUS.BAD_REQUEST);
    }

    const { fileId } = parsed.data;
    const userId = req.user?.userId as string;

    try {
        const result = await getDownloadUrl(fileId, userId);
        return sendSuccess(res, UPLOAD_CODES.UPLOAD_URL_SUCCESS, result, HTTP_STATUS.OK);
    } catch (error) {
        if (error instanceof UploadNotFoundError) {
            return sendError(res, UPLOAD_CODES.UPLOAD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }
        if (error instanceof UploadAccessDeniedError) {
            return sendError(res, UPLOAD_CODES.UPLOAD_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
        }
        log.error({ err: error, fileId, userId }, "Download URL generation failed");
        return sendError(res, UPLOAD_CODES.UPLOAD_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}
