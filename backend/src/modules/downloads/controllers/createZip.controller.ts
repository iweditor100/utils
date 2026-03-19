import { Request, Response } from "express";
import { createDownloadJob } from "../services/download.service";
import { sendSuccess } from "../../../utils";
import { HTTP_STATUS } from "../../../constants";
import { DOWNLOAD_CODES } from "../../../constants/download.codes";

export const createZipController = async (req: Request, res: Response) => {
    const { fileKeys } = req.body;

    if (!fileKeys || !Array.isArray(fileKeys)) {
        return res.status(400).json({
            error: "fileKeys must be an array",
        });
    }

    const job = await createDownloadJob({
        userId: req.user?.userId,
        fileKeys,
    })


    return sendSuccess(res, DOWNLOAD_CODES.DOWNLOAD_SUCCESS, { jobId: job.id, }, HTTP_STATUS.OK)
}




