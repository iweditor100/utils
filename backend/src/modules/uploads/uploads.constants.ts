// modules/uploads/uploads.constants.ts

export const UPLOAD_LIMITS = {
    avatar: {
      maxSizeBytes: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      prefix: "avatars",
    },
  
    document: {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      prefix: "documents",
    },
  
    video: {
      maxSizeBytes: 1024 * 1024 * 1024, // 1GB
      allowedMimeTypes: ["video/mp4", "video/webm"],
      prefix: "videos",
    },
  } as const;
  
  export type UploadCategory = keyof typeof UPLOAD_LIMITS;
  