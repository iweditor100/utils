import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

/** Request body for POST /uploads/presign. Must match backend presignUploadSchema. */
export type PresignUploadRequest = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: "avatar";
};

/** Response from presign: upload URL for direct PUT to R2, and key for building public URL. */
export type PresignUploadResponse = {
  uploadUrl: string;
  key: string;
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

    completeUpload: builder.mutation<
      ApiSuccess<{}>,
      { key: string; category: "avatar" }
    >({
      query: (body) => ({
        url: "/uploads/complete",
        method: "POST",
        data: body,
      })
    })
  }),
});

export const { usePresignUploadMutation, useCompleteUploadMutation } = uploadsApi;
