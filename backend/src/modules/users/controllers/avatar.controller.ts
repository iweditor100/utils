import { Request, Response } from "express";
import { presignAvatarUpload } from "../services/avatarPresign.services";
import { sendSuccess, sendError } from "../../../utils";
import { AUTH_CODES, USER_CODES, HTTP_STATUS } from "../../../constants";
import { presignAvatarSchema } from "../validators/user.validators";

export async function requestAvatarPresign(req: Request, res: Response) {
    const userId = (req as any).user?.userId;

    if (!userId) {
        return sendError(
            res,
            AUTH_CODES.UNAUTHORIZED,
            HTTP_STATUS.UNAUTHORIZED,
            [{ auth: "Authentication required" }]
        );
    }

    const parse = presignAvatarSchema.safeParse(req.body);
    if (!parse.success) {
        return sendError(
            res,
            USER_CODES.AVATAR_VALIDATION_FAILED,
            HTTP_STATUS.BAD_REQUEST,
            parse.error.errors.map((err) => ({
                [err.path.join(".")]: err.message,
            }))
        );
    }

    const { fileSize, contentType } = parse.data;

    try {
        const result = await presignAvatarUpload(userId, fileSize, contentType);
        return sendSuccess(
            res,
            USER_CODES.AVATAR_PRESIGN_SUCCESS,
            result,
            HTTP_STATUS.OK
        );
    } catch {
        return sendError(
            res,
            USER_CODES.AVATAR_VALIDATION_FAILED,
            HTTP_STATUS.BAD_REQUEST
        );
    }
}
