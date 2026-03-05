import { Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils";
import { CalendarService } from "./calendar.service";
import { AUTH_CODES, HTTP_STATUS } from "../../constants";
import { CreateCalendarEventInput } from "./calendar.types";
import { CALENDAR_CODES } from "../../constants/calendar.codes";


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

        const body = req.body as CreateCalendarEventInput;

        const event = await CalendarService.createEvent(userId, {
            title: body.title,
            startAt: new Date(body.start),
            endAt: new Date(body.end),
            category: body.category,
            timezone: body.timezone
        })

        return sendSuccess(res, CALENDAR_CODES.EVENT_CREATED, { event }, HTTP_STATUS.CREATED);
    }


    static async updateEvent(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const { id } = req.params;
        const body = req.body as CreateCalendarEventInput;

        const event = await CalendarService.updateEvent(userId, id, {
            title: body.title,
            startAt: new Date(body.start),
            endAt: new Date(body.end),
            category: body.category,
            timezone: body.timezone,
        })

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