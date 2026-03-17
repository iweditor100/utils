import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

/** Request body for POST /uploads/presign. Must match backend presignUploadSchema. */
export type PresignUploadRequest = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
};

/** Response from presign: upload URL for direct PUT to R2, and key for building public URL. */
export type PresignUploadResponse = {
  uploadUrl: string;
  key: string;
};

/** Request body for POST /uploads/complete. */
export type CompleteUploadRequest = {
  key: string;
  category: string;
  mimeType: string;
  size: number;
};

/** Response from complete: DB id of the created upload record. */
export type CompleteUploadResponse = {
  id: string;
};

/** Response from GET /uploads/:fileId/url */
export type GetDownloadUrlResponse = {
  url: string;
};

export const uploadsApi = createApi({
  reducerPath: "uploadsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [],
  endpoints: (builder) => ({
    /** Get presigned PUT URL and object key. Auth required. */
    presignUpload: builder.mutation<
      ApiSuccess<PresignUploadResponse>,
      PresignUploadRequest
    >({
      query: (body) => ({
        url: "/uploads/presign",
        method: "POST",
        data: body,
      }),
    }),

    /** Notify backend the upload is done. Persists metadata and returns the DB file id. */
    completeUpload: builder.mutation<
      ApiSuccess<CompleteUploadResponse>,
      CompleteUploadRequest
    >({
      query: (body) => ({
        url: "/uploads/complete",
        method: "POST",
        data: body,
      }),
    }),

    /** Get a short-lived presigned GET URL for a file the user owns. */
    getDownloadUrl: builder.query<
      ApiSuccess<GetDownloadUrlResponse>,
      string // fileId
    >({
      query: (fileId) => ({
        url: `/uploads/${fileId}/url`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  usePresignUploadMutation,
  useCompleteUploadMutation,
  useLazyGetDownloadUrlQuery,
} = uploadsApi;
