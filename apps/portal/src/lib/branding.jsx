// ============================================================
// BRANDING CONTEXT
// Fetches and provides white-label branding to all components
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { brandingApi } from './api';

const BrandingContext = createContext(null);

const DEFAULT_BRANDING = {
  brand_name: 'Uplift',
  primary_color: '#F26522',
  secondary_color: '#1E293B',
  logo_url: null,
  dark_logo_url: null,
  favicon_url: null,
  login_bg_url: null,
};

function applyCSSProperties(branding) {
  const root = document.documentElement;
  if (branding.primary_color) {
    root.style.setProperty('--brand-primary', branding.primary_color);
  }
  if (branding.secondary_color) {
    root.style.setProperty('--brand-secondary', branding.secondary_color);
  }
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    try {
      const result = await brandingApi.get();
      if (result?.branding) {
        const merged = { ...DEFAULT_BRANDING, ...result.branding };
        setBranding(merged);
        applyCSSProperties(merged);
      }
    } catch (error) {
      // Silently fail — use defaults
      console.debug('Branding not available, using defaults');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const updateBranding = useCallback((newBranding) => {
    const merged = { ...branding, ...newBranding };
    setBranding(merged);
    applyCSSProperties(merged);
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, loading, updateBranding, refetch: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return { branding: DEFAULT_BRANDING, loading: false, updateBranding: () => {}, refetch: () => {} };
  }
  return ctx;
}
