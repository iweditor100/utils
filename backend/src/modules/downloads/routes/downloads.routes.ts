import { Router } from "express";
import { authenticateMiddleware } from "../../auth/middlewares/authenticate.middleware";
import { createZipController } from "../controllers/createZip.controller";
import { getDownloadStatusController } from "../controllers/getDownloadStatus.controller";

const router = Router();
router.use(authenticateMiddleware);

router.post("/zip", createZipController);
router.get("/status/:jobId", getDownloadStatusController);

export default router;
