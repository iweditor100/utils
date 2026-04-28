import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { RequireAuth } from "../features/auth/guards/RequireAuth";
import { RequireGuest } from "../features/auth/guards/RequireGuest";
import { AuthLayout } from "../layout/AuthLayout";
import { ProtectedLayout } from "../layout/ProtectedLayout";

// Eager — landing pages that must render instantly
import Home from "../pages/Dashboard/Home";
import NotFound from "../pages/OtherPage/NotFound";

// Auth pages (named exports — need .then wrapper)
const SignInPage = lazy(() => import("../features/auth/pages/SignInPage").then(m => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import("../features/auth/pages/SignUpPage").then(m => ({ default: m.SignUpPage })));
const VerifyEmailPage = lazy(() => import("../features/auth/pages/VerifyEmailPage").then(m => ({ default: m.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import("../features/auth/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("../features/auth/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));

// App pages (default exports)
const UserProfiles = lazy(() => import("../pages/UserProfiles"));
const Settings = lazy(() => import("../pages/Settings"));
const Calendar = lazy(() => import("../pages/Calendar"));
const AvailabilityPage = lazy(() => import("../pages/Availability"));
const Blank = lazy(() => import("../pages/Blank"));
const FormElements = lazy(() => import("../pages/Forms/FormElements"));
const BasicTables = lazy(() => import("../pages/Tables/BasicTables"));
const Alerts = lazy(() => import("../pages/UiElements/Alerts"));
const Avatars = lazy(() => import("../pages/UiElements/Avatars"));
const Badges = lazy(() => import("../pages/UiElements/Badges"));
const Buttons = lazy(() => import("../pages/UiElements/Buttons"));
const Images = lazy(() => import("../pages/UiElements/Images"));
const Videos = lazy(() => import("../pages/UiElements/Videos"));
const LineChart = lazy(() => import("../pages/Charts/LineChart"));
const BarChart = lazy(() => import("../pages/Charts/BarChart"));
const UploadsPage = lazy(() => import("../pages/Uploads"));
const DownloadReadyPage = lazy(() => import("../pages/DownloadReady"));
const AnnotationPage = lazy(() => import("../pages/AnnotationPage"));

// Feature pages (named exports — need .then wrapper)
const ServiceAreasPage = lazy(() => import("../features/serviceAreas/pages/ServiceAreasPage").then(m => ({ default: m.ServiceAreasPage })));
const UploadTester = lazy(() => import("../features/uploads/components/UploadTester").then(m => ({ default: m.UploadTester })));

// Experimental
const CalendarReplica = lazy(() => import("../experimental/calendar-replica/CalendarReplica"));

export const AppRoutes = () => {
    return (
        <Suspense fallback={null}>
            <Routes>
                {/* GUEST ONLY ROUTES */}
                <Route
                    element={
                        <RequireGuest>
                            <AuthLayout />
                        </RequireGuest>
                    }
                >
                    <Route path="/signin" element={<SignInPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>

                {/* AUTHENTICATED ROUTES */}
                <Route
                    element={
                        <RequireAuth>
                            <ProtectedLayout />
                        </RequireAuth>
                    }
                >
                    <Route path="/" element={<Home />} />
                    <Route path="/profile" element={<UserProfiles />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/service-areas" element={<ServiceAreasPage />} />
                    <Route path="/check-availability" element={<AvailabilityPage />} />
                    <Route path="/blank" element={<Blank />} />
                    <Route path="/form-elements" element={<FormElements />} />
                    <Route path="/basic-tables" element={<BasicTables />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/avatars" element={<Avatars />} />
                    <Route path="/badge" element={<Badges />} />
                    <Route path="/buttons" element={<Buttons />} />
                    <Route path="/images" element={<Images />} />
                    <Route path="/videos" element={<Videos />} />
                    <Route path="/line-chart" element={<LineChart />} />
                    <Route path="/bar-chart" element={<BarChart />} />
                    <Route path="/upload-test" element={<UploadTester />} />
                    <Route path="/uploads" element={<UploadsPage />} />
                    <Route path="/uploads/:uploadId/annotate" element={<AnnotationPage />} />
                    <Route path="/downloads/:jobId" element={<DownloadReadyPage />} />
                </Route>

                <Route path="/ui-test/calendar-replica" element={<CalendarReplica />} />

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
};
