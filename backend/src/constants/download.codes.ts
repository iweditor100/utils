export const DOWNLOAD_CODES = {
    DOWNLOAD_SUCCESS:       20202,
    DOWNLOAD_QUEUED:        20203,
    DOWNLOAD_FAILED:        40202,
    DOWNLOAD_JOB_NOT_FOUND: 40404,
} as const;

export type DownloadCode = typeof DOWNLOAD_CODES[keyof typeof DOWNLOAD_CODES];
