import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";
import type { ApiSuccess } from "../../types/api";
import type { AnnotationData, AnnotationRecord } from "./types";

type SaveAnnotationRequest = {
  uploadId: string;
  data: AnnotationData;
};

type SaveAnnotationResponse = {
  id: string;
  version: number;
};

type GetAnnotationResponse = {
  annotation: AnnotationRecord | null;
};

export const annotationApi = createApi({
  reducerPath: "annotationApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Annotation"],
  endpoints: (builder) => ({
    saveAnnotation: builder.mutation<ApiSuccess<SaveAnnotationResponse>, SaveAnnotationRequest>({
      query: (body) => ({
        url: "/annotations",
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, _err, arg) => [{ type: "Annotation", id: arg.uploadId }],
    }),

    getAnnotation: builder.query<ApiSuccess<GetAnnotationResponse>, string>({
      query: (uploadId) => ({
        url: `/annotations/${uploadId}`,
        method: "GET",
      }),
      providesTags: (_result, _err, uploadId) => [{ type: "Annotation", id: uploadId }],
    }),
  }),
});

export const { useSaveAnnotationMutation, useGetAnnotationQuery } = annotationApi;
