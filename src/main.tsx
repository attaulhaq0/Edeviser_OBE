import React from "react";
import ReactDOM from "react-dom/client";
import { validateEnv } from "@/lib/envValidation";
import { initAnalyticsIfConsented } from "@/lib/analyticsConsent";
import "@/lib/i18n";
import App from "@/App";
import "@/design-system/tokens.css";
import "@/index.css";

// Validate required env vars before rendering — warns clearly if missing
const envValid = validateEnv();

// If env validation fails, render a visible error instead of a blank page
if (!envValid) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="font-family:system-ui;padding:2rem;max-width:600px;margin:0 auto">
        <h1 style="color:#ef4444">⚠️ Configuration Error</h1>
        <p>Required environment variables are missing. Check the browser console for details.</p>
        <p style="color:#64748b;font-size:0.875rem">Copy <code>.env.example</code> to <code>.env.local</code> and configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</p>
      </div>
    `;
  }
} else {
  // Task 97.1: Initialize Sentry gated behind cookie consent
  initAnalyticsIfConsented();

  // Dev-only: log a11y violations to browser console via axe-core
  if (import.meta.env.DEV) {
    import("@axe-core/react").then((axe) => {
      const auditWhenReady = (startedAt: number) => {
        const hasSkipTarget = document.getElementById("main-content") !== null;
        const timedOut = Date.now() - startedAt >= 5000;

        if (hasSkipTarget || timedOut) {
          axe.default(React, ReactDOM, 1000);
          return;
        }

        window.setTimeout(() => auditWhenReady(startedAt), 100);
      };

      auditWhenReady(Date.now());
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
}
