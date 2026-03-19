import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

export type DownloadStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type CreateZipJobRequest = {
    fileKeys: string[];
};

export type CreateZipJobResponse = {
    jobId: string;
};

export type GetDownloadStatusResponse = {
    status: DownloadStatus;
    // Present when COMPLETED
    downloadUrl?: string;
    expiresAt?: string;
    // Present when IN_PROGRESS
    progress?: number;
    // Present when FAILED
    error?: string | null;
};

export const downloadsApi = createApi({
    reducerPath: "downloadsApi",
    baseQuery: baseQueryWithReauth,
    endpoints: (builder) => ({
        /** Create a ZIP job. Backend enqueues it and returns jobId immediately. */
        createZipJob: builder.mutation<
            ApiSuccess<CreateZipJobResponse>,
            CreateZipJobRequest
        >({
            query: (body) => ({
                url: "/downloads/zip",
                method: "POST",
                data: body,
            }),
        }),

        /** Poll this endpoint after creating a ZIP job. Returns status + presigned URL when done. */
        getDownloadStatus: builder.query<
            ApiSuccess<GetDownloadStatusResponse>,
            string // jobId
        >({
            query: (jobId) => ({
                url: `/downloads/status/${jobId}`,
                method: "GET",
            }),
        }),
    }),
});

export const {
    useCreateZipJobMutation,
    useGetDownloadStatusQuery,
    useLazyGetDownloadStatusQuery,
} = downloadsApi;
