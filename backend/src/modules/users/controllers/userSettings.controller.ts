import { Request, Response } from "express";
import { z } from "zod";
import { sendError, sendSuccess } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";
import { USER_CODES } from "../../../constants/user.codes";
import { UserSettingsService } from "../services/userSettings.service";

const urlOrEmpty = z.string().url().max(300).or(z.literal("")).optional();

const updateSettingsSchema = z.object({
    phone: z.string().max(30).optional(),
    bio: z.string().max(500).optional(),
    address: z
        .object({
            street: z.string().max(200).optional(),
            city: z.string().max(100).optional(),
            state: z.string().max(100).optional(),
            zip: z.string().max(20).optional(),
            country: z.string().max(100).optional(),
        })
        .optional(),
    social: z
        .object({
            twitter: urlOrEmpty,
            linkedin: urlOrEmpty,
            github: urlOrEmpty,
            website: urlOrEmpty,
        })
        .optional(),
});

export class UserSettingsController {
    static async getSettings(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const settings = await UserSettingsService.getSettings(userId);
        return sendSuccess(res, USER_CODES.USER_SETTINGS_FETCHED, { settings }, HTTP_STATUS.OK);
    }

    static async updateSettings(req: Request, res: Response) {
        const userId = req.user?.userId;
        if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);

        const parse = updateSettingsSchema.safeParse(req.body);
        if (!parse.success) {
            return sendError(
                res,
                USER_CODES.USER_SETTINGS_INVALID,
                HTTP_STATUS.BAD_REQUEST,
                parse.error.errors.map((e) => ({ [e.path.join(".")]: e.message }))
            );
        }

        const settings = await UserSettingsService.updateSettings(userId, parse.data);
        return sendSuccess(res, USER_CODES.USER_SETTINGS_UPDATED, { settings }, HTTP_STATUS.OK);
    }
}
