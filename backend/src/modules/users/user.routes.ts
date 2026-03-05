import { Router } from "express";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";
import { updateMyProfileController } from "./controllers";
import { requestAvatarPresign } from "./controllers/avatar.controller";
import { UserSettingsController } from "./controllers/userSettings.controller";

const router = Router();
router.use(authenticateMiddleware);

router.patch("/me", updateMyProfileController);
router.post("/avatar/presign", requestAvatarPresign);

router.get("/settings", UserSettingsController.getSettings);
router.patch("/settings", UserSettingsController.updateSettings);

export default router;