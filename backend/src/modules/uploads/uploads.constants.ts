// modules/uploads/uploads.constants.ts
export const UPLOAD_LIMITS = {
  avatar: {
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    prefix: "avatars",
  },

  document: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    prefix: "documents",
  },

  video: {
    maxSizeBytes: 1024 * 1024 * 1024,
    allowedMimeTypes: ["video/mp4", "video/webm"],
    prefix: "videos",
  },

  testing: {
    maxSizeBytes: 1024 * 1024 * 1024,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/CR2",
      "application/octet-stream"
    ],
    prefix: "testing",
  },
} as const;

export type UploadCategory = keyof typeof UPLOAD_LIMITS;
