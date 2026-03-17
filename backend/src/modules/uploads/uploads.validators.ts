import { z } from "zod";

import { UPLOAD_LIMITS } from "./uploads.constants";

export const presignUploadSchema = z.object({
    fileName: z.string().min(1),
    fileSize: z.number().int().positive(),
    mimeType: z.string().min(1),
    category: z.enum(Object.keys(UPLOAD_LIMITS) as [string, ...string[]]),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export const fileIdParamSchema = z.object({
    fileId: z.string().uuid(),
});
