import { Router } from "express";



// imported routes: 
import authRoutes from "../modules/auth/routes/auth.routes";
import userRoutes from "../modules/users/user.routes";
import devRoutes from "./dev.routes";
import uploadsRouter from "../modules/uploads/uploads.routes";
import calendarRoutes from "../modules/calendar/calendar.routes";
import googleCalendarRoutes from "../modules/google/googleCalendar.routes";
import serviceAreaRoutes from "../modules/service-areas/service-area.routes";
import downloadsRouter from "../modules/downloads/routes/downloads.routes";
import annotationsRoutes from "../modules/annotations/annotations.routes";

const router = Router();



// Routes:
router.use("/auth", authRoutes);
router.use("/user", userRoutes);

router.use("/dev", devRoutes);
router.use("/uploads", uploadsRouter);

router.use("/events", calendarRoutes)
router.use("/google", googleCalendarRoutes)

// service routes:
router.use("/service-areas", serviceAreaRoutes);

router.use("/downloads", downloadsRouter);

router.use("/annotations", annotationsRoutes);

export default router;