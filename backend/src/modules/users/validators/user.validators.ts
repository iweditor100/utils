import { z } from "zod";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export const updateMyProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  picture: z.string().url().max(500).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided",
  }
);

export const presignAvatarSchema = z.object({
  fileSize: z.number().int().min(1).max(MAX_AVATAR_SIZE),
  contentType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
});
