import { Router } from "express";
import { presignUploadController } from "./uploads.controller";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";
import { completeUploadController } from "./uploads.complete.controller";


const router = Router();
router.use(authenticateMiddleware);



router.post("/presign", presignUploadController);
router.post("/complete", completeUploadController);

export default router;