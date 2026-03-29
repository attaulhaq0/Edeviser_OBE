import { BrowserRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import AppRouter from '@/router/AppRouter';
import { initSentry } from '@/lib/sentry';
import SkipToMain from '@/components/shared/SkipToMain';
import { offlineQueue } from '@/lib/offlineQueue';

initSentry();

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
      retry: 3,
      refetchOnWindowFocus: false,
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
                <ThemeProvider>
                  <SkipToMain />
                  <AppRouter />
                  <Toaster richColors position="top-right" />
                </ThemeProvider>
              </AuthProvider>
            </MotionConfig>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </NuqsAdapter>
      </BrowserRouter>
    </ErrorBoundary>
  </Sentry.ErrorBoundary>
);

export default App;
