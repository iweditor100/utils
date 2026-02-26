import { Request, Response } from "express";
import { serviceAreaService } from "./service-area.service";
import { checkServiceAreaSchema, createServiceAreaSchema } from "./service-area.validators";
import { sendSuccess } from "../../utils";
import { HTTP_STATUS } from "../../constants";

export async function createServiceAreaController(req: Request, res: Response) {
    const body = createServiceAreaSchema.parse(req.body);
    const userId = (req as any).user.userId;

    await serviceAreaService.createServiceArea(userId, body);


    return sendSuccess(res, 0, { success: true }, HTTP_STATUS.CREATED);
}

export async function getServiceAreasController(req: Request, res: Response) {
    const userId = (req as any).user.userId;

    const serviceAreas = await serviceAreaService.getUserServiceAreas(userId);

    return sendSuccess(res, 0, serviceAreas, HTTP_STATUS.OK);
}

export async function deleteServiceAreaController(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    await serviceAreaService.deleteServiceArea(id, userId);

    return sendSuccess(res, 0, { success: true }, HTTP_STATUS.OK);
}



export async function checkServiceAreaController(req: Request, res: Response) {
    const { longitude, latitude } = checkServiceAreaSchema.parse(req.body);
    const userId = (req as any).user.userId;


    const isUnderService = await serviceAreaService.isPointInsideUserArea(
        userId,
        longitude,
        latitude
    )

    return sendSuccess(
        res,
        0,
        { isUnderService },
        HTTP_STATUS.OK
    )
}