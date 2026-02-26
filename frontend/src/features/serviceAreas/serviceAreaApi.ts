import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";
import type { ServiceAreaDTO, CreateServiceAreaInput } from "./types";

export const serviceAreaApi = createApi({
    reducerPath: "serviceAreaApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["ServiceArea"],
    endpoints: (builder) => ({
        getServiceAreas: builder.query<ApiSuccess<ServiceAreaDTO[]>, void>({
            query: () => ({
                url: "/service-areas",
                method: "GET",
            }),
            providesTags: ["ServiceArea"],
        }),
        createServiceArea: builder.mutation<ApiSuccess<null>, CreateServiceAreaInput>({
            query: (body) => ({
                url: "/service-areas",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ["ServiceArea"],
        }),
        deleteServiceArea: builder.mutation<ApiSuccess<null>, string>({
            query: (id) => ({
                url: `/service-areas/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["ServiceArea"],
        }),
        checkServiceArea: builder.mutation<ApiSuccess<{ isUnderService: boolean }>, { longitude: number; latitude: number }>({
            query: (body) => ({
                url: "/service-areas/check",
                method: "POST",
                data: body,
            }),
        }),
    }),
});

export const {
    useGetServiceAreasQuery,
    useCreateServiceAreaMutation,
    useDeleteServiceAreaMutation,
    useCheckServiceAreaMutation,
} = serviceAreaApi;
