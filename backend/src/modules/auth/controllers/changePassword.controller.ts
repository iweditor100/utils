import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { getPrisma } from "../../../prisma/client";
import { audit } from "../../../services/audit/audit.service";
import { SessionService } from "../services/session.service";
import { sendSuccess, sendError } from "../../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../../constants";

const changePasswordSchema = z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8)
});

export async function changePasswordController(req: Request, res: Response) {
    // validate input. 
    const parse = changePasswordSchema.safeParse(req.body);
    if (!parse.success) {
        return sendError(
            res,
            AUTH_CODES.INVALID_CREDENTIALS,
            HTTP_STATUS.BAD_REQUEST,
            parse.error.errors.map((err) => ({
                [err.path.join(".")]: err.message
            }))
        )
    };

    const { currentPassword, newPassword } = parse.data;

    // auth context injected by authenticateMiddleware. 
    const { userId, sessionId } = (req as any).user || {};

    if (!userId || !sessionId) {
        return sendError(
            res,
            AUTH_CODES.UNAUTHORIZED,
            HTTP_STATUS.UNAUTHORIZED,
            [
                {
                    auth: "Authentication required"
                }
            ]
        )
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { identities: true },
    });


    if (!user) {
        return sendError(
            res,
            AUTH_CODES.USER_NOT_FOUND,
            HTTP_STATUS.NOT_FOUND,
        )
    }

    // email identitiy only: 
    const emailIdentity = user.identities.find(id => id.provider === "EMAIL" && id.passwordHash);
    if (!emailIdentity) {
        return sendError(
            res,
            AUTH_CODES.USER_NOT_FOUND,
            HTTP_STATUS.NOT_FOUND,
            [{
                account: "Password change is not supported for this account"
            }]
        )
    }

    // valid current password: 
    const valid = await bcrypt.compare(currentPassword, emailIdentity.passwordHash!);
    if (!valid) {
        return sendError(
            res,
            AUTH_CODES.INVALID_CREDENTIALS,
            HTTP_STATUS.UNAUTHORIZED,
            [{
                currentPassword: "Current password is incorrect"
            }]
        )
    }

    // sameAsOld: 
    const sameAsOld = await bcrypt.compare(newPassword, emailIdentity.passwordHash!);
    if (sameAsOld) {
        return sendError(
            res,
            AUTH_CODES.PASSWORD_WEAK,
            HTTP_STATUS.BAD_REQUEST,
            [{
                newPassword: "New password must be different from the old password"
            }]
        )
    }

    // hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.authIdentity.update({
        where: { id: emailIdentity.id },
        data: { passwordHash: newHash }
    });

    // Revoke all sessions ( including current? )
    await SessionService.revokeAllSessions(userId);

    // Audit
    // await audit.logAudit({ userId, event: "CHANGE_PASSWORD" });

    return sendSuccess(res, AUTH_CODES.CHANGE_PASSWORD_SUCCESS, {})
}
