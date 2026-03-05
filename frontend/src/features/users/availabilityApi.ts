import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

export type AvailabilitySlot = {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

export type OffDay = {
    id: string;
    date: string;
    reason?: string | null;
};

export type AvailabilityData = {
    slots: AvailabilitySlot[];
    offDays: OffDay[];
};

export type SlotInput = {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

export const availabilityApi = createApi({
    reducerPath: "availabilityApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["Availability"],
    endpoints: (builder) => ({
        getAvailability: builder.query<ApiSuccess<AvailabilityData>, void>({
            query: () => ({ url: "/events/availability", method: "GET" }),
            providesTags: ["Availability"],
        }),
        updateSchedule: builder.mutation<ApiSuccess<{ slots: AvailabilitySlot[] }>, SlotInput[]>({
            query: (slots) => ({
                url: "/events/availability/schedule",
                method: "PUT",
                data: { slots },
            }),
            invalidatesTags: ["Availability"],
        }),
        addOffDay: builder.mutation<ApiSuccess<{ offDay: OffDay }>, { date: string; reason?: string }>({
            query: (body) => ({
                url: "/events/availability/off-days",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ["Availability"],
        }),
        removeOffDay: builder.mutation<ApiSuccess<null>, string>({
            query: (date) => ({
                url: `/events/availability/off-days/${date}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Availability"],
        }),
    }),
});

export const {
    useGetAvailabilityQuery,
    useUpdateScheduleMutation,
    useAddOffDayMutation,
    useRemoveOffDayMutation,
} = availabilityApi;
