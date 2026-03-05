import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

export type CalendarEventDTO = {
    id: string;
    title: string;
    startAt: string;    //utc
    endAt: string;      //utc
    category: "PRIMARY" | "SUCCESS" | "WARNING" | "DANGER";
}

export type CreateEventInput = {
    title: string;
    start: string;
    end: string;
    category: "PRIMARY" | "SUCCESS" | "WARNING" | "DANGER";
    timezone: string;
}


export const calendarApi = createApi({
    reducerPath: "calendarApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["CalendarEvent"],
    endpoints: (builder) => ({
        getEvents: builder.query<ApiSuccess<{ events: CalendarEventDTO[] }>, void>({
            query: () => ({
                url: "/events",
                method: "GET",
            }),
            // providesTags: ["CalendarEvent"],
        }),
        createEvent: builder.mutation<ApiSuccess<{ event: CalendarEventDTO }>, CreateEventInput>({
            query: (body) => ({
                url: "/events",
                method: "POST",
                data: body,
            }),
            // invalidatesTags: ["CalendarEvent"],
        }),

        updateEvent: builder.mutation<ApiSuccess<{ event: CalendarEventDTO }>, { id: string; body: CreateEventInput }>({
            query: ({ id, body }) => ({
                url: `/events/${id}`,
                method: "PUT",
                data: body,
            }),
            // invalidatesTags: ["CalendarEvent"],
        }),

        deleteEvent: builder.mutation<ApiSuccess<null>, string>({
            query: (id) => ({
                url: `/events/${id}`,
                method: "DELETE",
            }),
            // invalidatesTags: ["CalendarEvent"],
        }),

        deleteAllEvents: builder.mutation<ApiSuccess<{ count: number }>, void>({
            query: () => ({
                url: "/events/all",
                method: "DELETE",
            }),
        }),
    }),
});

export const {
    useGetEventsQuery,
    useCreateEventMutation,
    useUpdateEventMutation,
    useDeleteEventMutation,
    useDeleteAllEventsMutation,
} = calendarApi;