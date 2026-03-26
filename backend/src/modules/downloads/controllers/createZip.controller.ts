import { Request, Response } from "express";
import { createDownloadJob } from "../services/download.service";
import { sendSuccess, sendError } from "../../../utils";
import { HTTP_STATUS } from "../../../constants";
import { DOWNLOAD_CODES } from "../../../constants/download.codes";
import { findUploadsByKeysAndOwner } from "../../uploads/uploads.repository";

export const createZipController = async (req: Request, res: Response) => {
    const { fileKeys } = req.body;

    const MAX_ZIP_FILES = 100;

    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
        return res.status(400).json({ error: "fileKeys must be a non-empty array" });
    }

    if (fileKeys.length > MAX_ZIP_FILES) {
        return res.status(400).json({ error: `Cannot ZIP more than ${MAX_ZIP_FILES} files at once` });
    }

    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Deduplicate to avoid inflating the ownership check count
    const uniqueKeys = [...new Set(fileKeys)];

    // Verify every key belongs to the requesting user
    const ownedUploads = await findUploadsByKeysAndOwner(uniqueKeys, userId);
    if (ownedUploads.length !== uniqueKeys.length) {
        return sendError(res, DOWNLOAD_CODES.DOWNLOAD_JOB_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const job = await createDownloadJob({ userId, fileKeys: uniqueKeys });

    return sendSuccess(res, DOWNLOAD_CODES.DOWNLOAD_SUCCESS, { jobId: job.id }, HTTP_STATUS.OK);
}




