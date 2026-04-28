import { findUploadById } from "../uploads/uploads.repository";
import { upsertAnnotation, findAnnotationByUploadId } from "./annotations.repository";

import { AnnotationNotFoundError, AnnotationAccessDeniedError, AnnotationPayloadTooLargeError, AnnotationUnsupportedTypeError } from "./annotations.error";

import type { AnnotationData } from "./annotations.types";

const MAX_OBJECTS = 500;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function saveAnnotation(uploadId: string, userId: string, data: AnnotationData) {
    if (data.objects.length > MAX_OBJECTS) throw new AnnotationPayloadTooLargeError();

    const upload = await findUploadById(uploadId);

    if (!upload) throw new AnnotationNotFoundError();

    if (upload.ownerId !== userId) throw new AnnotationAccessDeniedError();

    if (!ALLOWED_MIME_TYPES.includes(upload.mimeType.toLowerCase())) throw new AnnotationUnsupportedTypeError();

    return upsertAnnotation(uploadId, userId, data);
}

export async function getAnnotation(uploadId: string, userId: string) {
    const upload = await findUploadById(uploadId);

    if (!upload) throw new AnnotationNotFoundError();
    if (upload.ownerId !== userId) throw new AnnotationAccessDeniedError();
    if (!ALLOWED_MIME_TYPES.includes(upload.mimeType.toLowerCase())) throw new AnnotationUnsupportedTypeError();

    return findAnnotationByUploadId(uploadId);
}