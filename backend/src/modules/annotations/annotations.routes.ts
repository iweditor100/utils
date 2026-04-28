import { Router } from "express";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";
import { getAnnotationController, saveAnnotationController } from "./annotations.controller";
import { validate } from "../../middlewares/validate";
import { saveAnnotationSchema, uploadIdParamSchema, } from "./annotations.schema";

const router = Router();

router.use(authenticateMiddleware);

router.post("/", validate(saveAnnotationSchema, "body"), saveAnnotationController);
router.get("/:uploadId", validate(uploadIdParamSchema, "params"), getAnnotationController);

export default router;