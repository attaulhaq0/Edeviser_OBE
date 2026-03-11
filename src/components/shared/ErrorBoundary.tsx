import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden max-w-md w-full">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <AlertTriangle className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Something went wrong</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                {this.state.error?.message ?? 'An unexpected error occurred.'}
              </p>
              <Button
                onClick={this.handleRetry}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
