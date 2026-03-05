import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

export const googleCalendarApi = createApi({
    reducerPath: "googleCalendarApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["GoogleCalendar", "GoogleStatus"],
    endpoints: (builder) => ({
        connectGoogle: builder.mutation<ApiSuccess<{ url: string }>, void>({
            query: () => ({
                url: "/google/connect",
                method: "GET",
            }),
        }),

        disconnectGoogle: builder.mutation<ApiSuccess<{}>, void>({
            query: () => ({ url: "/google/disconnect", method: "POST"}),
            invalidatesTags: ["GoogleStatus"]
        }),

        getGoogleStatus: builder.query<ApiSuccess<{ connected: boolean; email?: string; isSyncEnabled?: boolean }>, void>({
            query: () => ({
                url: "/google/status",
                method: "GET",
            }),
            providesTags: ["GoogleStatus"],
        }),

        toggleGoogleSync: builder.mutation<ApiSuccess<{ enabled: boolean }>, { enabled: boolean }>({
            query: (body) => ({
                url: "/google/sync/toggle",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ["GoogleStatus"],
        }),

        importFromGoogle: builder.mutation<ApiSuccess<{}>, { startDate?: string; endDate?: string }>({
            query: (body) => ({
                url: "/google/import",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ["GoogleCalendar"],
        }),

        exportToGoogle: builder.mutation<ApiSuccess<{}>, { startDate?: string; endDate?: string }>({
            query: (body) => ({
                url: "/google/export",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ["GoogleCalendar"],
        }),
    }),
});

export const {
    useConnectGoogleMutation,
    useDisconnectGoogleMutation,
    useGetGoogleStatusQuery,
    useToggleGoogleSyncMutation,
    useImportFromGoogleMutation,
    useExportToGoogleMutation,
} = googleCalendarApi;