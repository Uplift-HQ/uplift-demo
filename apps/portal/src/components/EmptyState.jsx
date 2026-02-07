// ============================================================
// EMPTY STATE COMPONENT
// Reusable component for displaying helpful empty states
// ============================================================

import { useTranslation } from 'react-i18next';

/**
 * EmptyState - A reusable component for displaying empty state messages
 *
 * @param {React.ReactNode} icon - Lucide icon component to display
 * @param {string} title - Main title text
 * @param {string} description - Descriptive text explaining what will appear
 * @param {React.ReactNode} action - Optional CTA button(s)
 * @param {string} className - Optional additional CSS classes
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}) {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-slate-500 max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <div className="flex flex-wrap gap-3 justify-center">
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * EmptyStateCard - Empty state wrapped in a card container
 */
export function EmptyStateCard(props) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <EmptyState {...props} />
    </div>
  );
}
