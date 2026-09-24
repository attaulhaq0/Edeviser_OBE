import { BrowserRouter } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { QueryClientProvider } from "@tanstack/react-query";
import { AccessibilityPreferencesProvider } from "@/providers/AccessibilityPreferencesProvider";
import { AccessibilityMotion } from "@/providers/AccessibilityMotion";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import AppToaster from "@/components/shared/AppToaster";
import GamificationFeedbackHost from "@/components/shared/GamificationFeedbackHost";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import AppRouter from "@/router/AppRouter";
import SkipToMain from "@/components/shared/SkipToMain";
import { offlineQueue } from "@/lib/offlineQueue";
import { queryClient } from "@/lib/queryClient";
import { lazy, Suspense } from "react";
import CookieConsentBanner from "@/components/shared/CookieConsentBanner";

const ReactQueryDevtoolsLazy = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  }))
);

// Initialize offline queue — auto-flushes queued events when connectivity returns
const cleanupOfflineQueue = offlineQueue.init();
if (import.meta.hot) {
  import.meta.hot.dispose(() => cleanupOfflineQueue());
}

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <NuqsAdapter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LanguageProvider>
              <ThemeProvider>
                <AccessibilityPreferencesProvider>
                  <AccessibilityMotion>
                    <SkipToMain />
                    <AppRouter />
                    <GamificationFeedbackHost />
                    <CookieConsentBanner />
                    <AppToaster />
                  </AccessibilityMotion>
                </AccessibilityPreferencesProvider>
              </ThemeProvider>
            </LanguageProvider>
          </AuthProvider>
          {import.meta.env.DEV && (
            <Suspense>
              <ReactQueryDevtoolsLazy initialIsOpen={false} />
            </Suspense>
          )}
        </QueryClientProvider>
      </NuqsAdapter>
    </BrowserRouter>
    <SpeedInsights />
    <Analytics />
  </ErrorBoundary>
);

export default App;
