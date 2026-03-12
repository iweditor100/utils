import { UPLOAD_LIMITS } from "./uploads.constants";
import { UploadTooLargeError, InvalidMimeTypeError, UploadCategoryNotAllowedError } from "./uploads.errors";

type PolicyInput = {
  category: keyof typeof UPLOAD_LIMITS;
  fileSize: number;
  mimeType: string;
};

export function enforceUploadPolicy(input: PolicyInput) {
  const rules = UPLOAD_LIMITS[input.category];

  if (!rules) {
    throw new UploadCategoryNotAllowedError(input.category);
  }

  if (input.fileSize > rules.maxSizeBytes) {
    throw new UploadTooLargeError(rules.maxSizeBytes);
  }

  if (!rules.allowedMimeTypes.includes(input.mimeType as string as never)) {
    throw new InvalidMimeTypeError(input.mimeType);
  }
}