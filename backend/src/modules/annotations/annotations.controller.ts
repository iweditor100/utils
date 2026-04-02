import type { Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils";
import { HTTP_STATUS, ANNOTATION_CODES } from "../../constants";
import { saveAnnotation, getAnnotation } from "./annotations.service";
import {
  AnnotationNotFoundError,
  AnnotationAccessDeniedError,
  AnnotationPayloadTooLargeError,
  AnnotationUnsupportedTypeError,
} from "./annotations.error";
import { createChildLogger } from "../../logger";

const log = createChildLogger("annotations");



export async function saveAnnotationController(req: Request, res: Response) {
  try {
    console.log(
      "BODY:",
      JSON.stringify(req.body, null, 2)
    );
    const userId = req.user?.userId as string;

    const { uploadId, data } = req.body;
    const annotation = await saveAnnotation(uploadId, userId, data);

    log.info({ userId, uploadId }, "Annotation saved");
    return sendSuccess(res, ANNOTATION_CODES.ANNOTATION_SAVED, { id: annotation.id, version: annotation.version });
  } catch (err) {
    if (err instanceof AnnotationNotFoundError) return sendError(res, ANNOTATION_CODES.ANNOTATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (err instanceof AnnotationAccessDeniedError) return sendError(res, ANNOTATION_CODES.ANNOTATION_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    if (err instanceof AnnotationPayloadTooLargeError) return sendError(res, ANNOTATION_CODES.ANNOTATION_PAYLOAD_TOO_LARGE, HTTP_STATUS.BAD_REQUEST);
    if (err instanceof AnnotationUnsupportedTypeError) return sendError(res, ANNOTATION_CODES.ANNOTATION_UNSUPPORTED_TYPE, HTTP_STATUS.BAD_REQUEST);
    log.error({ err }, "Save annotation failed");
    return sendError(res, ANNOTATION_CODES.ANNOTATION_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function getAnnotationController(req: Request, res: Response) {
  try {
    const userId = req.user?.userId as string;
    const { uploadId } = req.params;
    const annotation = await getAnnotation(uploadId, userId);
    return sendSuccess(res, ANNOTATION_CODES.ANNOTATION_FETCHED, { annotation: annotation ?? null });
  } catch (err) {
    if (err instanceof AnnotationNotFoundError) return sendError(res, ANNOTATION_CODES.ANNOTATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    if (err instanceof AnnotationAccessDeniedError) return sendError(res, ANNOTATION_CODES.ANNOTATION_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    if (err instanceof AnnotationUnsupportedTypeError) return sendError(res, ANNOTATION_CODES.ANNOTATION_UNSUPPORTED_TYPE, HTTP_STATUS.BAD_REQUEST);
    log.error({ err }, "Get annotation failed");
    return sendError(res, ANNOTATION_CODES.ANNOTATION_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
