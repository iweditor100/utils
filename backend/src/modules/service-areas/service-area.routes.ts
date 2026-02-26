import { Router } from "express";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";
import {
    createServiceAreaController,
    getServiceAreasController,
    deleteServiceAreaController,
    checkServiceAreaController,
} from "./service-area.controller";

const router = Router();

router.use(authenticateMiddleware);

router.post("/", createServiceAreaController);
router.get("/", getServiceAreasController);
router.delete("/:id", deleteServiceAreaController);
router.post("/check", checkServiceAreaController);

export default router;
