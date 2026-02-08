// ============================================================
// SKELETON LOADING COMPONENTS
// Reusable loading state placeholders with shimmer animation
// ============================================================

/**
 * Base Skeleton - Animated placeholder element
 * @param {string} className - Additional CSS classes for sizing
 */
export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-slate-200 animate-pulse rounded ${className}`} />
  );
}

/**
 * SkeletonText - Text-shaped skeleton lines
 * @param {number} lines - Number of lines to show
 * @param {string} className - Additional CSS classes
 */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - Card-shaped skeleton with header and content
 * @param {boolean} showHeader - Whether to show header skeleton
 * @param {boolean} showFooter - Whether to show footer skeleton
 * @param {string} className - Additional CSS classes
 */
export function SkeletonCard({ showHeader = true, showFooter = false, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      )}
      <SkeletonText lines={3} />
      {showFooter && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonTable - Table-shaped skeleton with rows
 * @param {number} rows - Number of data rows
 * @param {number} cols - Number of columns
 * @param {string} className - Additional CSS classes
 */
export function SkeletonTable({ rows = 5, cols = 5, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-4">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {[...Array(rows)].map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-4 flex gap-4 items-center">
            {[...Array(cols)].map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={`h-4 flex-1 ${colIdx === 0 ? 'max-w-[180px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonStats - Grid of stat cards
 * @param {number} count - Number of stat cards
 * @param {string} className - Additional CSS classes
 */
export function SkeletonStats({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonList - List of items with avatars
 * @param {number} count - Number of list items
 * @param {string} className - Additional CSS classes
 */
export function SkeletonList({ count = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonPage - Full page loading skeleton
 * @param {string} type - Page type: 'dashboard', 'table', 'detail'
 */
export function SkeletonPage({ type = 'dashboard' }) {
  switch (type) {
    case 'table':
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          {/* Toolbar */}
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          {/* Table */}
          <SkeletonTable rows={8} cols={6} />
        </div>
      );

    case 'detail':
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SkeletonCard showHeader showFooter />
            </div>
            <div>
              <SkeletonCard showHeader />
            </div>
          </div>
        </div>
      );

    case 'dashboard':
    default:
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          {/* Stats */}
          <SkeletonStats count={4} />
          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard showHeader />
            <SkeletonCard showHeader />
          </div>
          {/* Table */}
          <SkeletonTable rows={5} cols={5} />
        </div>
      );
  }
}

export default Skeleton;
