import type { Request, Response } from "express";
import { presignUploadSchema } from "./uploads.validators";
import { presignUpload } from "./uploads.service";
import { sendError, sendSuccess } from "../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../constants";
import { SessionService } from "../auth/services/session.service";
import { UploadCategory } from "./uploads.constants";
import { createChildLogger } from "../../logger";

const log = createChildLogger("uploads");

const INVALID_INPUT_CODE = 121212;
const UPLOAD_PRESIGNED_CODE = 121213;

export async function presignUploadController(req: Request, res: Response) {
    try {

        const { userId } = (req as any).user;

        const parsed = presignUploadSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(
                res,
                INVALID_INPUT_CODE,
                HTTP_STATUS.BAD_REQUEST,
                parsed.error.flatten().fieldErrors as unknown as { [key: string]: string[] }[]
            );
        }

        const result = await presignUpload({
            ...parsed.data,
            userId: userId as string, //here when we pass in the userid, on the userId we can have the limits and restrictions, basically the whole business logic of which user to upload what type of file can be derived from here. 
            category: parsed.data.category as UploadCategory,
        });

        log.info({ userId, category: parsed.data.category }, "Upload presigned");

        return sendSuccess(
            res,
            UPLOAD_PRESIGNED_CODE,
            result,
            HTTP_STATUS.OK
        );
    } catch (error) {
        log.error({ err: error }, "Presign upload failed");
        return sendError(
            res,
            INVALID_INPUT_CODE,
            HTTP_STATUS.BAD_REQUEST,
            [error]
        );
    }
}

//   created the codes just for testing purposes, to be replaced with the actual codes