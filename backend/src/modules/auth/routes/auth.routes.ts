import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginController, meController, refreshController, logoutController, registerController, verifyEmailController, forgotPasswordController, resetPasswordController, changePasswordController, googleLoginController } from "../controllers";
import { authenticateMiddleware } from "../middlewares/authenticate.middleware";

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts, please try again later." },
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many password reset requests, please try again later." },
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many registration attempts, please try again later." },
});

router.post("/login", loginLimiter, loginController);
router.get("/me", authenticateMiddleware, meController);
router.post("/refresh", refreshController);
router.post("/logout", authenticateMiddleware, logoutController);
router.post("/register", registerLimiter, registerController);
router.get("/verify-email", verifyEmailController);
router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordController);
router.post("/reset-password", forgotPasswordLimiter, resetPasswordController);
router.post("/change-password", authenticateMiddleware, changePasswordController);
router.post("/google", loginLimiter, googleLoginController);

export default router;
