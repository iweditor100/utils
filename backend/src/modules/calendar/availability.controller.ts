import { Request, Response } from "express";
import { z } from "zod";
import { sendError, sendSuccess } from "../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../constants";
import { CALENDAR_CODES } from "../../constants/calendar.codes";
import { AvailabilityService } from "./availability.service";

const timeRegex = /^\d{2}:\d{2}$/;

const updateScheduleSchema = z.object({
    slots: z.array(
        z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string().regex(timeRegex, "Must be HH:MM"),
            endTime: z.string().regex(timeRegex, "Must be HH:MM"),
        }).refine((s) => s.startTime < s.endTime, {
            message: "startTime must be before endTime",
        })
    ),
});

const addOffDaySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    reason: z.string().max(200).optional(),
});

export class AvailabilityController {
    static async getAvailability(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const data = await AvailabilityService.getAvailability(userId);
        return sendSuccess(res, CALENDAR_CODES.AVAILABILITY_FETCHED, data, HTTP_STATUS.OK);
    }

    static async updateSchedule(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const parse = updateScheduleSchema.safeParse(req.body);
        if (!parse.success) {
            return sendError(
                res,
                CALENDAR_CODES.INVALID_AVAILABILITY_DATA,
                HTTP_STATUS.BAD_REQUEST,
                parse.error.errors.map((e) => ({ [e.path.join(".")]: e.message }))
            );
        }

        const slots = await AvailabilityService.updateSchedule(userId, parse.data.slots);
        return sendSuccess(res, CALENDAR_CODES.AVAILABILITY_UPDATED, { slots }, HTTP_STATUS.OK);
    }

    static async addOffDay(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const parse = addOffDaySchema.safeParse(req.body);
        if (!parse.success) {
            return sendError(
                res,
                CALENDAR_CODES.INVALID_AVAILABILITY_DATA,
                HTTP_STATUS.BAD_REQUEST,
                parse.error.errors.map((e) => ({ [e.path.join(".")]: e.message }))
            );
        }

        const offDay = await AvailabilityService.addOffDay(userId, parse.data.date, parse.data.reason);
        return sendSuccess(res, CALENDAR_CODES.OFF_DAY_ADDED, { offDay }, HTTP_STATUS.CREATED);
    }

    static async removeOffDay(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const { date } = req.params;
        const deleted = await AvailabilityService.removeOffDay(userId, date);
        if (!deleted) return sendError(res, CALENDAR_CODES.OFF_DAY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

        return sendSuccess(res, CALENDAR_CODES.OFF_DAY_REMOVED, null, HTTP_STATUS.OK);
    }
}
