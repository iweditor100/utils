import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import type { User } from "../../types/common";
import { setCredentials } from "../auth/authSlice";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

export type UpdateMyProfileInput = {
  name?: string;
  picture?: string;
};

export type PresignAvatarResponse = {
    uploadUrl: string;
    publicUrl: string;
}

export type PresignAvatarInput = {
    fileSize: number;
    contentType: string;
}

export const usersApi = createApi({
    reducerPath: 'usersApi',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['User'],
    endpoints: (builder) => ({
        updateMyProfile: builder.mutation<
            ApiSuccess<{ user: User }>,
            UpdateMyProfileInput
        >({
            query: (body) => ({
                url: '/user/me',
                method: 'PATCH',
                data: body,
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    // Backend returns: { status: "success", statusCode, message, data: { user } }
                    // Update auth state with new user data, keep existing accessToken
                    dispatch(setCredentials({ user: data.data.user }));
                } catch {
                    // Error handled by UI
                }
            },
        }),
        presignAvatarUpload: builder.mutation<
            ApiSuccess<PresignAvatarResponse>,
            {fileSize: number, contentType: string}
        >({
            query: (body) => ({
                url: "/user/avatar/presign",
                method: "POST",
                data: body,
            })
        })
    }),
});

export const {
    useUpdateMyProfileMutation,
    usePresignAvatarUploadMutation
} = usersApi;
