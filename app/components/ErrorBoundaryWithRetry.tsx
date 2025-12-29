/**
 * ErrorBoundaryWithRetry Component
 * Catches React errors and provides retry functionality
 * Prevents entire app from crashing
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void, retryCount: number) => ReactNode;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export default class ErrorBoundaryWithRetry extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    this.setState({ errorInfo });

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Send to error tracking service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (err) {
      console.error('[ErrorBoundary] Failed to log error:', err);
    }
  };

  retry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('[ErrorBoundary] Max retries reached');
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
    });

    console.log(`[ErrorBoundary] Retrying (${retryCount + 1}/${maxRetries})`);
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, maxRetries = 3 } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.retry, retryCount);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <i data-lucide="alert-triangle" className="w-8 h-8 text-red-400"></i>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Something went wrong</h2>
              <p className="text-zinc-400 text-sm">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>

            {retryCount < maxRetries ? (
              <button
                onClick={this.retry}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors mb-3"
              >
                Retry ({retryCount}/{maxRetries})
              </button>
            ) : (
              <div className="mb-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">
                  Maximum retry attempts reached. Please refresh the page.
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              Refresh Page
            </button>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-400">
                  Error Details
                </summary>
                <pre className="mt-2 p-4 bg-black rounded text-xs text-zinc-400 overflow-auto max-h-48">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary (for functional components)
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

/**
 * Example usage:
 *
 * // Wrap your app or specific components:
 * <ErrorBoundaryWithRetry
 *   maxRetries={3}
 *   onError={(error) => console.error(error)}
 * >
 *   <YourApp />
 * </ErrorBoundaryWithRetry>
 *
 * // With custom fallback:
 * <ErrorBoundaryWithRetry
 *   fallback={(error, retry, retryCount) => (
 *     <CustomErrorPage error={error} onRetry={retry} />
 *   )}
 * >
 *   <YourComponent />
 * </ErrorBoundaryWithRetry>
 *
 * // In functional component:
 * const handleError = useErrorHandler();
 * try {
 *   // risky operation
 * } catch (e) {
 *   handleError(e);
 * }
 */
