import { BrowserRouter } from "react-router-dom";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { AuthInitializer } from "./features/auth/components/AuthInitializer";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop/>
      <AuthInitializer>
        <AppRoutes/>
      </AuthInitializer>
    </BrowserRouter>
  )
}
