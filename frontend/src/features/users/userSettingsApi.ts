import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

export interface SettingsAddress {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}

export interface SettingsSocial {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
}

export interface UserSettings {
    phone?: string;
    bio?: string;
    address?: SettingsAddress;
    social?: SettingsSocial;
}

export const userSettingsApi = createApi({
    reducerPath: "userSettingsApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["UserSettings"],
    endpoints: (builder) => ({
        getSettings: builder.query<ApiSuccess<{ settings: UserSettings }>, void>({
            query: () => ({ url: "/user/settings", method: "GET" }),
            providesTags: ["UserSettings"],
        }),
        updateSettings: builder.mutation<ApiSuccess<{ settings: UserSettings }>, Partial<UserSettings>>({
            query: (body) => ({
                url: "/user/settings",
                method: "PATCH",
                data: body,
            }),
            invalidatesTags: ["UserSettings"],
        }),
    }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = userSettingsApi;
