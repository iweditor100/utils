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

        importFromGoogle: builder.mutation<ApiSuccess<{}>, void>({
            query: () => ({
                url: "/google/import",
                method: "POST",
            }),
            invalidatesTags: ["GoogleCalendar"],
        }),

        exportToGoogle: builder.mutation<ApiSuccess<{}>, void>({
            query: () => ({
                url: "/google/export",
                method: "POST",
            }),
            invalidatesTags: ["GoogleCalendar"],
        }),
    }),
});

export const {
    useConnectGoogleMutation,
    useGetGoogleStatusQuery,
    useToggleGoogleSyncMutation,
    useImportFromGoogleMutation,
    useExportToGoogleMutation,
} = googleCalendarApi;