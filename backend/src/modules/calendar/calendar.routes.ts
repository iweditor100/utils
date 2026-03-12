import { Router } from "express";
import { CalendarController } from "./calendar.controller";
import { AvailabilityController } from "./availability.controller";
import { authenticateMiddleware } from "../auth/middlewares/authenticate.middleware";

const router = Router();

router.use(authenticateMiddleware);

router.get("/", CalendarController.getEvents);
router.post("/", CalendarController.createEvent);
router.delete("/all", CalendarController.deleteAllEvents);
router.put("/:id", CalendarController.updateEvent);
router.delete("/:id", CalendarController.deleteEvent);

// Availability routes
router.get("/availability", AvailabilityController.getAvailability);
router.get("/availability/slots", AvailabilityController.getSlotsForDate);
router.put("/availability/schedule", AvailabilityController.updateSchedule);
router.post("/availability/off-days", AvailabilityController.addOffDay);
router.delete("/availability/off-days/:date", AvailabilityController.removeOffDay);

export default router;
