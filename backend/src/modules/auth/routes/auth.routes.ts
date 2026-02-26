import { Router } from "express";
import { loginController, meController, refreshController, logoutController, registerController, verifyEmailController, forgotPasswordController, resetPasswordController, changePasswordController, googleLoginController } from "../controllers";
import { authenticateMiddleware } from "../middlewares/authenticate.middleware";

const router = Router();

router.post("/login", loginController); //working fine
router.get("/me", authenticateMiddleware, meController); //working fine
router.post("/refresh", refreshController); //working fine. 
router.post("/logout", authenticateMiddleware, logoutController); //working fine. 
router.post("/register", registerController); //working fine, sends the verification email to the gmail we register with
router.get("/verify-email", verifyEmailController); //working fine, go to this route with ?token="YOUR_TOKEN" the token which is given in the email. 
router.post("/forgot-password", forgotPasswordController); // working fine, sends the token to the email we forgot the password for. 
router.post("/reset-password", resetPasswordController); // working fine, go to this route with body {token(the token you got in email after hitting the forgot password) and newPassword}
router.post("/change-password", authenticateMiddleware, changePasswordController);  //working fine. 
router.post("/google", googleLoginController);

export default router;
