import { Router } from "express";
import { CalendarController } from "./calendar.controller";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";

const router = Router();

router.use(authenticateMiddleware);

router.get("/", CalendarController.getEvents);
router.post("/", CalendarController.createEvent);
router.put("/:id", CalendarController.updateEvent);
router.delete("/:id", CalendarController.deleteEvent);


export default router;
