import { Component, type ReactNode, type ErrorInfo } from "react";
import ErrorState from "@/components/shared/ErrorState";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Task 97.2: Report to Sentry if initialized
    import("@sentry/react")
      .then((Sentry) => {
        if (Sentry.isInitialized()) {
          Sentry.captureException(error, {
            extra: { componentStack: errorInfo.componentStack },
          });
        }
      })
      .catch(() => {
        /* Sentry not available */
      });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <ErrorState
            title="Something went wrong"
            message={
              this.state.error?.message ?? "An unexpected error occurred."
            }
            icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
            onRetry={this.handleRetry}
            retryLabel="Try Again"
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
