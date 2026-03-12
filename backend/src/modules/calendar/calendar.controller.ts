import { Request, Response } from "express";
import { z } from "zod";
import { sendError, sendSuccess } from "../../utils";
import { CalendarService } from "./calendar.service";
import { AUTH_CODES, HTTP_STATUS } from "../../constants";
import { CALENDAR_CODES } from "../../constants/calendar.codes";

const eventSchema = z.object({
    title: z.string().min(1, "Title is required").max(500),
    start: z.string().datetime({ message: "Invalid start date" }),
    end: z.string().datetime({ message: "Invalid end date" }),
    category: z.enum(["PRIMARY", "SUCCESS", "WARNING", "DANGER"]),
    timezone: z.string().min(1).max(50),
}).refine(d => new Date(d.start) < new Date(d.end), {
    message: "End must be after start",
    path: ["end"],
});


export class CalendarController {
    static async getEvents(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED, [{ auth: "Unauthorized" }]);

        const events = await CalendarService.getUserEvents(userId)


        return sendSuccess(
            res,
            CALENDAR_CODES.EVENTS_FETCHED,
            { events },
            HTTP_STATUS.OK
        )
    }


    static async createEvent(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const parse = eventSchema.safeParse(req.body);
        if (!parse.success) {
            return sendError(res, CALENDAR_CODES.INVALID_EVENT_DATA, HTTP_STATUS.BAD_REQUEST,
                parse.error.errors.map(e => ({ [e.path.join(".")]: e.message }))
            );
        }

        const event = await CalendarService.createEvent(userId, {
            title: parse.data.title,
            startAt: new Date(parse.data.start),
            endAt: new Date(parse.data.end),
            category: parse.data.category,
            timezone: parse.data.timezone,
        });

        return sendSuccess(res, CALENDAR_CODES.EVENT_CREATED, { event }, HTTP_STATUS.CREATED);
    }


    static async updateEvent(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const { id } = req.params;

        const parse = eventSchema.safeParse(req.body);
        if (!parse.success) {
            return sendError(res, CALENDAR_CODES.INVALID_EVENT_DATA, HTTP_STATUS.BAD_REQUEST,
                parse.error.errors.map(e => ({ [e.path.join(".")]: e.message }))
            );
        }

        const event = await CalendarService.updateEvent(userId, id, {
            title: parse.data.title,
            startAt: new Date(parse.data.start),
            endAt: new Date(parse.data.end),
            category: parse.data.category,
            timezone: parse.data.timezone,
        });

        if (!event) return sendError(res, CALENDAR_CODES.EVENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

        return sendSuccess(res, CALENDAR_CODES.EVENT_UPDATED, { event }, HTTP_STATUS.OK);
    }



    static async deleteAllEvents(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const count = await CalendarService.deleteAllEvents(userId);
        return sendSuccess(res, CALENDAR_CODES.EVENTS_CLEARED, { count }, HTTP_STATUS.OK);
    }

    static async deleteEvent(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const { id } = req.params;

        const deleted = await CalendarService.deleteEvent(userId, id);
        if (!deleted) return sendError(res, CALENDAR_CODES.EVENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

        return sendSuccess(res, CALENDAR_CODES.EVENT_DELETED, null, HTTP_STATUS.OK);
    }
}