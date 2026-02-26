import { Request, Response } from "express";
import { getPrisma } from "../../../prisma/client";
import { sendError, sendSuccess } from "../../../utils";
import { AUTH_CODES, USER_CODES, HTTP_STATUS } from "../../../constants";
import { updateMyProfileSchema } from "../validators/user.validators";
import { env } from "../../../config/env";

/**
 * Extracts R2 object key from picture URL (e.g. https://base/avatars/uuid/original.ext -> avatars/uuid/original.ext).
 */
function extractAvatarKeyFromUrl(pictureUrl: string): string | null {
  try {
    const url = new URL(pictureUrl);
    const path = url.pathname.replace(/^\//, "");
    if (!path.startsWith("avatars/")) return null;
    return path;
  } catch {
    return null;
  }
}

export async function updateMyProfileController(req: Request, res: Response) {
  const { userId } = (req as any).user || {};

  if (!userId) {
    return sendError(
      res,
      AUTH_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      [{ auth: "Authentication required" }]
    );
  }

  const parse = updateMyProfileSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(
      res,
      AUTH_CODES.INVALID_CREDENTIALS,
      HTTP_STATUS.BAD_REQUEST,
      parse.error.errors.map((err) => ({
        [err.path.join(".")]: err.message,
      }))
    );
  }

  const { name, picture } = parse.data;
  const prisma = getPrisma();

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    return sendError(
      res,
      AUTH_CODES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  const updateData: { name?: string; picture?: string } = {};
  if (name !== undefined) updateData.name = name;
  if (picture !== undefined) updateData.picture = picture;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      picture: true,
      status: true,
      emailVerifiedAt: true,
    },
  });

  if (picture !== undefined) {
    const key = extractAvatarKeyFromUrl(picture);
    const ingestionUrl = env.IMAGE_QUEUE_INGESTION_URL;
    if (key && ingestionUrl) {
      void fetch(`${ingestionUrl.replace(/\/$/, "")}/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      }).catch(() => {});
    }
  }

  return sendSuccess(
    res,
    USER_CODES.USER_UPDATE_SUCCESS,
    { user: updatedUser },
    HTTP_STATUS.OK
  );
}
