import { BrowserRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as Sentry from '@sentry/react';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import AppRouter from '@/router/AppRouter';
import { initSentry } from '@/lib/sentry';

initSentry();

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
            <AuthProvider>
              <AppRouter />
              <Toaster richColors position="top-right" />
            </AuthProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </NuqsAdapter>
      </BrowserRouter>
    </ErrorBoundary>
  </Sentry.ErrorBoundary>
);

export default App;
