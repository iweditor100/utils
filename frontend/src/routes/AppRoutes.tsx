import { Routes, Route } from "react-router-dom";
import { RequireAuth } from "../features/auth/guards/RequireAuth";
import { RequireGuest } from "../features/auth/guards/RequireGuest";
import { AuthLayout } from "../layout/AuthLayout";
import { ProtectedLayout } from "../layout/ProtectedLayout";

// Auth Pages
import { SignInPage } from "../features/auth/pages/SignInPage";
import { SignUpPage } from "../features/auth/pages/SignUpPage";
import { VerifyEmailPage } from "../features/auth/pages/VerifyEmailPage";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";

// Dashboard
import Home from "../pages/Dashboard/Home";

// Other Pages
import UserProfiles from "../pages/UserProfiles";
import Calendar from "../pages/Calendar";
import { ServiceAreasPage } from "../features/serviceAreas/pages/ServiceAreasPage";
import Blank from "../pages/Blank";
import FormElements from "../pages/Forms/FormElements";
import BasicTables from "../pages/Tables/BasicTables";
import Alerts from "../pages/UiElements/Alerts";
import Avatars from "../pages/UiElements/Avatars";
import Badges from "../pages/UiElements/Badges";
import Buttons from "../pages/UiElements/Buttons";
import Images from "../pages/UiElements/Images";
import Videos from "../pages/UiElements/Videos";
import LineChart from "../pages/Charts/LineChart";
import BarChart from "../pages/Charts/BarChart";
import NotFound from "../pages/OtherPage/NotFound";
import CalendarReplica from "../experimental/calendar-replica/CalendarReplica";

export const AppRoutes = () => {
    return (
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
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/service-areas" element={<ServiceAreasPage />} />
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
            </Route>

            <Route path="/ui-test/calendar-replica" element={<CalendarReplica/>}/>

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};