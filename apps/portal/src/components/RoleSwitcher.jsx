// ============================================================
// ROLE SWITCHER COMPONENT
// Workday-style toggle between Management View and My View
// Only visible for Admins and Managers - Workers don't see this
// ============================================================

import { useView } from '../lib/viewContext';
import { useTranslation } from 'react-i18next';

export default function RoleSwitcher() {
  const { t } = useTranslation();
  const {
    viewMode,
    setViewMode,
    showSwitcher,
    managementViewLabel,
    managementViewLabelShort,
  } = useView();

  // Don't render for workers
  if (!showSwitcher) {
    return null;
  }

  const isManagement = viewMode === 'management';
  const isPersonal = viewMode === 'personal';

  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
      {/* Management View Button */}
      <button
        onClick={() => setViewMode('management')}
        className={`
          relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ease-out
          ${isManagement
            ? 'bg-momentum-500 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
          }
        `}
      >
        {/* Full label on desktop, short on mobile */}
        <span className="hidden md:inline">{managementViewLabel}</span>
        <span className="md:hidden">{managementViewLabelShort}</span>
      </button>

      {/* Personal View Button */}
      <button
        onClick={() => setViewMode('personal')}
        className={`
          relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ease-out
          ${isPersonal
            ? 'bg-momentum-500 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
          }
        `}
      >
        {/* Full label on desktop, short on mobile */}
        <span className="hidden md:inline">{t('nav.myView', 'My View')}</span>
        <span className="md:hidden">{t('nav.me', 'Me')}</span>
      </button>
    </div>
  );
}
