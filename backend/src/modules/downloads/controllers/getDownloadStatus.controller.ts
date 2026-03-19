import { Request, Response } from "express";
import { getDownloadJob } from "../services/download.service";
import { sendSuccess, sendError } from "../../../utils";
import { HTTP_STATUS } from "../../../constants";
import { DOWNLOAD_CODES } from "../../../constants/download.codes";
import { presignGetObject } from "../../../infra/storage/storage.service";

export const getDownloadStatusController = async (req: Request, res: Response) => {
    const { jobId } = req.params;

    const job = await getDownloadJob(jobId);

    if (!job) {
        return sendError(res, DOWNLOAD_CODES.DOWNLOAD_JOB_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (job.status === "COMPLETED" && job.zipKey) {
        const { downloadUrl } = await presignGetObject(job.zipKey);
        return sendSuccess(res, DOWNLOAD_CODES.DOWNLOAD_SUCCESS, {
            status: job.status,
            downloadUrl,
            expiresAt: job.expiresAt,
        }, HTTP_STATUS.OK);
    }

    return sendSuccess(res, DOWNLOAD_CODES.DOWNLOAD_SUCCESS, {
        status: job.status,
        progress: job.progress ?? 0,
        error: job.error ?? null,
    }, HTTP_STATUS.OK);
};
