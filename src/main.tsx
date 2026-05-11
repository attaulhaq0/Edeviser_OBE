import React from "react";
import ReactDOM from "react-dom/client";
import { validateEnv } from "@/lib/envValidation";
import { initAnalyticsIfConsented } from "@/lib/analyticsConsent";
import "@/lib/i18n";
import App from "@/App";
import "@/index.css";

// Validate required env vars before rendering — fails fast with clear message
validateEnv();

// Task 97.1: Initialize Sentry gated behind cookie consent
initAnalyticsIfConsented();

// Dev-only: log a11y violations to browser console via axe-core
if (import.meta.env.DEV) {
  import("@axe-core/react").then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}

// Task 82.3: Register service worker for PWA
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[SW] Registration failed:", err);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
