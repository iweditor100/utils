import type { UploadCategory } from "./uploads.constants";

export type PresignUploadInput = {
    fileName: string;
    fileSize: number;
    mimeType: string;
    category: UploadCategory;
    userId: string;
};


export type PresignUploadResult = {
    uploadUrl: string;
    key: string;
}
