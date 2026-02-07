// ============================================================
// UPLIFT LOGO COMPONENT
// The official Uplift logo with rising U mark
// ============================================================

import React from 'react';

/**
 * Uplift Logo - Rising U mark with optional wordmark
 * @param {Object} props
 * @param {number} props.size - Size of the icon (default 32)
 * @param {boolean} props.showWordmark - Show "Uplift" text (default false)
 * @param {string} props.variant - 'default' | 'white' | 'dark'
 * @param {string} props.className - Additional CSS classes
 */
export function UpliftLogo({ 
  size = 32, 
  showWordmark = false, 
  variant = 'default',
  className = '' 
}) {
  const iconColor = variant === 'white' ? '#FFFFFF' : '#FF6B35'; // Momentum Orange
  const markColor = variant === 'white' ? '#FF6B35' : '#FFFFFF';
  const textColor = variant === 'white' ? '#FFFFFF' : variant === 'dark' ? '#FFFFFF' : '#0F172A';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon - Rising U in rounded square */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 160 160" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Rounded square background */}
        <rect width="160" height="160" rx="32" fill={iconColor} />
        
        {/* Rising U mark */}
        <path 
          d="M40 36 L40 108 Q40 132 64 132 L104 132 Q128 132 128 108 L128 72 L112 52 L112 108 Q112 114 104 114 L64 114 Q56 114 56 108 L56 36 Z" 
          fill={markColor}
        />
        
        {/* Rising arrow */}
        <path 
          d="M112 52 L128 72 L144 52 L128 32 Z" 
          fill={markColor}
        />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span 
          className="font-semibold"
          style={{ 
            color: textColor,
            fontSize: size * 0.6,
          }}
        >
          Uplift
        </span>
      )}
    </div>
  );
}

/**
 * Compact logo mark only (no text)
 */
export function UpliftMark({ size = 32, variant = 'default', className = '' }) {
  const iconColor = variant === 'white' ? '#FFFFFF' : '#FF6B35';
  const markColor = variant === 'white' ? '#FF6B35' : '#FFFFFF';

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 160 160" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="160" height="160" rx="32" fill={iconColor} />
      <path 
        d="M40 36 L40 108 Q40 132 64 132 L104 132 Q128 132 128 108 L128 72 L112 52 L112 108 Q112 114 104 114 L64 114 Q56 114 56 108 L56 36 Z" 
        fill={markColor}
      />
      <path 
        d="M112 52 L128 72 L144 52 L128 32 Z" 
        fill={markColor}
      />
    </svg>
  );
}

export default UpliftLogo;
