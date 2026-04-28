import { useCompleteUploadMutation, usePresignUploadMutation } from "../features/uploads/uploadsApi";
import { useUpdateMyProfileMutation } from "../features/users/usersApi";
import { env } from "../config/env";

/** Client-side limits for avatar upload. Must match backend UPLOAD_LIMITS.avatar. */
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const AVATAR_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

function getPublicUrlForKey(key: string): string {
  const base = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  if (!base) {
    throw new Error("VITE_R2_PUBLIC_BASE_URL is not set; cannot build profile image URL.");
  }
  return `${base}/${key}`;
}

export function useAvatarUpload() {
  const [presign] = usePresignUploadMutation();
  const [completeUpload] = useCompleteUploadMutation();
  const [updateProfile] = useUpdateMyProfileMutation();

  const uploadAvatar = async (file: File): Promise<string> => {
    // Client-side validation before calling backend
    if (!file.type.startsWith("image/") || !AVATAR_ALLOWED_MIME.includes(file.type as (typeof AVATAR_ALLOWED_MIME)[number])) {
      throw new Error("Allowed types: JPEG, PNG, WebP.");
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new Error("Image must be 2 MB or smaller.");
    }

    // 1. Get presigned PUT URL and key from our backend (auth is applied by baseQuery)
    const presignRes = await presign({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category: "avatar",
    }).unwrap();

    const { uploadUrl, key } = presignRes.data;

    // 2. Upload file directly to R2 (no auth headers; presigned URL is the auth)
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!putRes.ok) {
      throw new Error("Upload to storage failed.");
    }

    // notify the backend upload completed.
    await completeUpload({ key, category: "avatar", mimeType: file.type, size: file.size }).unwrap();

    // 3. Build public URL from key and update user profile so UI and auth state reflect new image
    let pictureUrl = getPublicUrlForKey(key);

    pictureUrl = pictureUrl + "?v=" + Date.now();

    await updateProfile({ picture: pictureUrl }).unwrap();

    return pictureUrl;
  };

  return { uploadAvatar };
}
