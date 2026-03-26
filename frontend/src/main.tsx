import { Provider } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google"

import App from "./App.tsx";
import { store } from "./app/store.ts";

import "./index.css";
import "swiper/swiper-bundle.css";

import "flatpickr/dist/flatpickr.css";

import { StrictMode } from "react";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { SocketProvider } from "./context/SocketProvider.tsx";
import { createRoot } from "react-dom/client";
import { AppWrapper } from "./components/common/PageMeta.tsx";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
        <SocketProvider>
          <AppWrapper>
            <App />
          </AppWrapper>
        </SocketProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </Provider>
);
