import { Router } from "express";
import { presignUploadController } from "./uploads.controller";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";
import { completeUploadController } from "./uploads.complete.controller";
import { getDownloadUrlController } from "./uploads.download.controller";

const router = Router();
router.use(authenticateMiddleware);

router.post("/presign", presignUploadController);
router.post("/complete", completeUploadController);
router.get("/:fileId/url", getDownloadUrlController);

export default router;