// bucket name, base url, max size, expiry times. 
import { env } from "../../config/env";

export const STORAGE_CONFIG = {
    bucket: env.R2_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
    presignExpiresInSeconds: env.R2_PRESIGN_EXPIRES_IN_SECONDS,
    presignDownloadExpiresInSeconds: env.R2_PRESIGN_DOWNLOAD_EXPIRES_IN_SECONDS,
}