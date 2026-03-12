import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// These 3 endpoints need to be added to your backend:
// POST /uploads/multipart/initiate  → { uploadId, key }
// POST /uploads/multipart/presign-part → { partUrl }  (body: { key, uploadId, partNumber })
// POST /uploads/multipart/complete → { publicUrl }  (body: { key, uploadId, parts: [{ETag, partNumber}] })
// POST /uploads/multipart/abort    → {}            (body: { key, uploadId })

export const multipartUploadApi = createApi({
    reducerPath: 'multipartUploadApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
    endpoints: (builder) => ({
        initiateMultipart: builder.mutation<
            { uploadId: string; key: string },
            { fileName: string; fileSize: number; mimeType: string; category: string }
        >({ query: (body) => ({ url: '/uploads/multipart/initiate', method: 'POST', body }) }),

        presignPart: builder.mutation<{ partUrl: string }, { key: string; uploadId: string; partNumber: number }>({
            query: (body) => ({ url: '/uploads/multipart/presign-part', method: 'POST', body }),
        }),

        completeMultipart: builder.mutation<
            { publicUrl: string },
            { key: string; uploadId: string; parts: { ETag: string; PartNumber: number }[] }
        >({ query: (body) => ({ url: '/uploads/multipart/complete', method: 'POST', body }) }),

        abortMultipart: builder.mutation<void, { key: string; uploadId: string }>({
            query: (body) => ({ url: '/uploads/multipart/abort', method: 'POST', body }),
        }),
    }),
});

export const {
    useInitiateMultipartMutation,
    usePresignPartMutation,
    useCompleteMultipartMutation,
    useAbortMultipartMutation,
} = multipartUploadApi;
