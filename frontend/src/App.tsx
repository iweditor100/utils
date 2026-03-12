import { BrowserRouter } from "react-router-dom";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { AuthInitializer } from "./features/auth/components/AuthInitializer";
import { AppRoutes } from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <ScrollToTop />
      <AuthInitializer>
        <AppRoutes />
      </AuthInitializer>
    </BrowserRouter>
  )
}
