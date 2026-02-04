// ============================================================
// ERROR BOUNDARY
// Catches React rendering errors and displays fallback UI
// ============================================================

import React from 'react';
import { withTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    
    // Log to error reporting service
    if (import.meta.env.DEV) console.error('React Error Boundary caught:', error, errorInfo);
    
    // In production, send to error tracking (Sentry, etc.)
    if (import.meta.env.PROD) {
      // window.Sentry?.captureException(error, { extra: errorInfo });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              {this.props.t('errors.somethingWentWrong', 'Something went wrong')}
            </h1>
            
            <p className="text-slate-600 mb-6">
              We encountered an unexpected error. This has been logged and we'll look into it.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleGoHome}
                className="btn btn-secondary"
              >
                <Home className="w-4 h-4" />
                {this.props.t('errors.goHome', 'Go Home')}
              </button>
              <button
                onClick={this.handleReload}
                className="btn btn-primary"
              >
                <RefreshCw className="w-4 h-4" />
                {this.props.t('errors.tryAgain', 'Try Again')}
              </button>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                  {this.props.t('errors.technicalDetails', 'Technical Details')}
                </summary>
                <pre className="mt-2 p-3 bg-slate-100 rounded text-xs text-red-600 overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary helper for async errors
export function useErrorHandler() {
  const [error, setError] = React.useState(null);

  if (error) {
    throw error;
  }

  return React.useCallback((err) => {
    setError(err);
  }, []);
}

export default withTranslation()(ErrorBoundary);
