import { Router } from "express";
import { loginController, meController, refreshController, logoutController, registerController, verifyEmailController, forgotPasswordController, resetPasswordController, changePasswordController, googleLoginController } from "../controllers";
import { authenticateMiddleware } from "../middlewares/authenticate.middleware";

const router = Router();



router.post("/login", loginController);
router.get("/me", authenticateMiddleware, meController);
router.post("/refresh", refreshController);
router.post("/logout", authenticateMiddleware, logoutController);
router.post("/register", registerController);
router.get("/verify-email", verifyEmailController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);
router.post("/change-password", authenticateMiddleware, changePasswordController);
router.post("/google", googleLoginController);

export default router;
