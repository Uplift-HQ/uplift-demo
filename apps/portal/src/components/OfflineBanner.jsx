// ============================================================
// OFFLINE BANNER COMPONENT
// Detects online/offline status and shows appropriate banner
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Only show "back online" if we were offline
      if (wasOffline) {
        setShowBackOnline(true);
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
          setShowBackOnline(false);
        }, 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setWasOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Show "Back online" banner (green)
  if (showBackOnline) {
    return (
      <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium animate-fade-in">
        <Wifi className="w-4 h-4" />
        <span>{t('offline.backOnline', 'Back online')}</span>
      </div>
    );
  }

  // Show "You're offline" banner (orange)
  if (!isOnline) {
    return (
      <div className="bg-momentum-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="w-4 h-4" />
        <span>{t('offline.youAreOffline', "You're offline. Some features may be limited.")}</span>
      </div>
    );
  }

  // Online and not showing "back online" message
  return null;
}
