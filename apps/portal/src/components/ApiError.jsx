// ============================================================
// API ERROR COMPONENT
// Reusable error display for failed API requests
// ============================================================

import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, Shield } from 'lucide-react';

/**
 * ApiError - Display error state for failed API requests
 *
 * @param {Error|string} error - Error object or message
 * @param {function} onRetry - Callback to retry the failed request
 * @param {string} context - Context description for the error
 * @param {string} className - Additional CSS classes
 */
export default function ApiError({
  error,
  onRetry,
  context,
  className = ''
}) {
  const { t } = useTranslation();

  // Determine error type and message
  const errorMessage = error?.message || error || 'An unexpected error occurred';
  const statusCode = error?.response?.status;

  // Map error types to icons and messages
  let Icon = AlertCircle;
  let title = t('errors.somethingWentWrong', 'Something went wrong');
  let description = errorMessage;

  if (statusCode === 401 || statusCode === 403) {
    Icon = Shield;
    title = t('errors.unauthorized', 'Access denied');
    description = t('errors.unauthorizedDesc', 'You do not have permission to view this content.');
  } else if (statusCode === 404) {
    Icon = AlertCircle;
    title = t('errors.notFound', 'Not found');
    description = t('errors.notFoundDesc', 'The requested content could not be found.');
  } else if (statusCode >= 500) {
    Icon = ServerCrash;
    title = t('errors.serverError', 'Server error');
    description = t('errors.serverErrorDesc', 'Our servers are having trouble. Please try again later.');
  } else if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK') {
    Icon = WifiOff;
    title = t('errors.networkError', 'Connection error');
    description = t('errors.networkErrorDesc', 'Unable to connect to the server. Please check your internet connection.');
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-red-500" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {title}
      </h3>

      <p className="text-slate-500 max-w-md mb-2">
        {description}
      </p>

      {context && (
        <p className="text-sm text-slate-400 mb-6">
          {t('errors.context', 'Context')}: {context}
        </p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('errors.tryAgain', 'Try Again')}
        </button>
      )}
    </div>
  );
}

/**
 * ApiErrorCard - API error wrapped in a card container
 */
export function ApiErrorCard(props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <ApiError {...props} />
    </div>
  );
}

/**
 * InlineApiError - Compact inline error display
 */
export function InlineApiError({ error, onRetry, className = '' }) {
  const { t } = useTranslation();
  const message = error?.message || error || 'Error loading data';

  return (
    <div className={`flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg ${className}`}>
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <span className="text-sm text-red-700 flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          {t('common.retry', 'Retry')}
        </button>
      )}
    </div>
  );
}
