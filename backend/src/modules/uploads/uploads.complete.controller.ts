import type { Request, Response } from "express";
import { z } from "zod";
import { sendError, sendSuccess } from "../../utils";
import { HTTP_STATUS } from "../../constants";
import { imageQueue } from "./image.queue";
import type { UploadCategory } from "./uploads.constants";



const COMPLETE_UPLOAD_CODE = 121214;
const INVALID_INPUT_CODE = 121215;


const completeSchema = z.object({
    key: z.string().min(1),
    category: z.string()
})

export async function completeUploadController(req: Request, res: Response) {
    try {
        console.log("[COMPLETE] Received request:", req.body);
        const userId = req.user?.userId

        const parsed = completeSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(
                res,
                INVALID_INPUT_CODE,
                HTTP_STATUS.BAD_REQUEST
            )
        }

        const { key, category } = parsed.data;

        // if (category !== "avatar") {
        //     return sendSuccess(res, COMPLETE_UPLOAD_CODE, {}, HTTP_STATUS.OK);
        // }


        try {
            console.log("Adding to imageQueue");
            await imageQueue.add(
                "generate-avatar-thumbnails",
                {
                    key,
                    userId,
                },
                {
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 2000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            );
        } catch (queueError) {
            console.error("[COMPLETE] Failed to add to imageQueue (Redis might be down):", queueError);
            // We still return success because the file is already in R2/S3
        }
        return sendSuccess(res, COMPLETE_UPLOAD_CODE, {}, HTTP_STATUS.OK);
    } catch (error) {
        return sendError(
            res,
            INVALID_INPUT_CODE,
            HTTP_STATUS.BAD_REQUEST,
        )
    }
}