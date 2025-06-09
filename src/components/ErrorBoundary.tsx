import React, { Component, ReactNode } from 'react';
import { trackError } from '../utils/analytics';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Track error in analytics
    trackError(error, {
      component: 'ErrorBoundary',
      action: 'component_error',
      additional: {
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.state.retryCount,
      },
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to external error monitoring service
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: { ...errorInfo, errorId: this.state.errorId },
        tags: { componentStack: errorInfo.componentStack ? 'available' : 'unavailable' },
      });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
      }));

      // Track retry attempt
      trackError(new Error('Error boundary retry'), {
        component: 'ErrorBoundary',
        action: 'retry_attempt',
        additional: {
          retryCount: this.state.retryCount + 1,
          originalErrorId: this.state.errorId,
        },
      });
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportIssue = () => {
    const errorDetails = encodeURIComponent(
      `Error ID: ${this.state.errorId}\n` +
      `Error: ${this.state.error?.message}\n` +
      `Stack: ${this.state.error?.stack}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `URL: ${window.location.href}\n` +
      `Timestamp: ${new Date().toISOString()}`
    );

    window.open(
      `mailto:support@memeforge.app?subject=Error Report&body=${errorDetails}`,
      '_blank'
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <div className="flex justify-center mb-6">
              <AlertCircle size={64} className="text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong</h1>
            
            <p className="text-gray-300 mb-6">
              We're sorry for the inconvenience. An unexpected error occurred while rendering this component.
            </p>

            {/* Error details for development */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-gray-700 rounded p-4 mb-6 text-left">
                <div className="text-sm font-mono text-red-300 break-all">
                  <div className="font-bold text-red-400 mb-2">Error:</div>
                  <div className="mb-2">{this.state.error.message}</div>
                  <div className="font-bold text-red-400 mb-2">Error ID:</div>
                  <div className="text-xs">{this.state.errorId}</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Retry button (if retries available) */}
              {this.state.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md transition-colors"
                >
                  <RefreshCw size={18} />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </button>
              )}

              {/* Go to home button */}
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-md transition-colors"
              >
                <Home size={18} />
                Go to Home
              </button>

              {/* Report issue button */}
              <button
                onClick={this.handleReportIssue}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors text-sm"
              >
                <Bug size={16} />
                Report Issue
              </button>
            </div>

            {/* Additional help text */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs">
                If this problem persists, please contact our support team at{' '}
                <a 
                  href="mailto:support@memeforge.app" 
                  className="text-blue-400 hover:text-blue-300"
                >
                  support@memeforge.app
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;