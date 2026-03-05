import { Router } from "express";
import { GoogleCalendarController } from "./googleCalendar.controller";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";


const router = Router();

// Public route (Google redirect)
router.get("/callback", GoogleCalendarController.callback);
router.post("/webhook", GoogleCalendarController.webhook);

// Protected routes
router.use(authenticateMiddleware);

router.get("/connect", GoogleCalendarController.connect);
router.post("/disconnect", GoogleCalendarController.disconnect); 
router.post("/import", GoogleCalendarController.importEvents);
router.post("/export", GoogleCalendarController.exportEvents);
router.get("/status", GoogleCalendarController.status);
router.post("/sync/toggle", GoogleCalendarController.toggleSync);


export default router;