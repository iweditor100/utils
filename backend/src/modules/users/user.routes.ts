import { Router } from "express";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";
import { updateMyProfileController } from "./controllers";
import { requestAvatarPresign } from "./controllers/avatar.controller";

const router = Router();
router.use(authenticateMiddleware);

router.patch("/me", updateMyProfileController);

router.post("/avatar/presign", requestAvatarPresign);

export default router;