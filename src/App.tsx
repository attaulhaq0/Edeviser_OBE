import { BrowserRouter } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import * as Sentry from "@sentry/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import AppRouter from "@/router/AppRouter";
import SkipToMain from "@/components/shared/SkipToMain";
import { offlineQueue } from "@/lib/offlineQueue";
import { toast } from "sonner";
import { lazy, Suspense } from "react";

const ReactQueryDevtoolsLazy = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  }))
);

// Sentry is initialized only through the consent-gated path
// (initAnalyticsIfConsented in main.tsx / CookieConsentBanner), which guards on
// Sentry.isInitialized(). Do NOT call initSentry() unconditionally here — that
// would start error/replay capture before cookie consent is resolved (FERPA/GDPR).

// Initialize offline queue — auto-flushes queued events when connectivity returns
const cleanupOfflineQueue = offlineQueue.init();
if (import.meta.hot) {
  import.meta.hot.dispose(() => cleanupOfflineQueue());
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: (failureCount, error) => {
        // Don't retry on 429 — respect rate limits
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as { status: number }).status === 429
        ) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as { status: number }).status === 429
        ) {
          toast.error("Too many requests. Please wait a moment.");
        }
      },
    },
  },
});

const App = () => (
  <Sentry.ErrorBoundary fallback={<p>An unexpected error occurred.</p>}>
    <ErrorBoundary>
      <BrowserRouter>
        <NuqsAdapter>
          <QueryClientProvider client={queryClient}>
            <MotionConfig reducedMotion="user">
              <AuthProvider>
                <LanguageProvider>
                  <ThemeProvider>
                    <SkipToMain />
                    <AppRouter />
                    <Toaster richColors position="top-right" />
                  </ThemeProvider>
                </LanguageProvider>
              </AuthProvider>
            </MotionConfig>
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
  </Sentry.ErrorBoundary>
);

export default App;
