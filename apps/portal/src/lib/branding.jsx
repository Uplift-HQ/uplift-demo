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
        const apiBranding = result.branding;
        // Map API field names to our expected field names (handle both snake_case and camelCase)
        const merged = {
          ...DEFAULT_BRANDING,
          brand_name: apiBranding.brand_name || apiBranding.brandName || apiBranding.companyName || DEFAULT_BRANDING.brand_name,
          primary_color: apiBranding.primary_color || apiBranding.primaryColor || DEFAULT_BRANDING.primary_color,
          secondary_color: apiBranding.secondary_color || apiBranding.secondaryColor || DEFAULT_BRANDING.secondary_color,
          // For logo_url: only override if API returns a non-null value
          logo_url: apiBranding.logo_url || apiBranding.logoUrl || apiBranding.logo || DEFAULT_BRANDING.logo_url,
          dark_logo_url: apiBranding.dark_logo_url || apiBranding.darkLogoUrl || DEFAULT_BRANDING.dark_logo_url,
          favicon_url: apiBranding.favicon_url || apiBranding.faviconUrl || apiBranding.favicon || DEFAULT_BRANDING.favicon_url,
          login_bg_url: apiBranding.login_bg_url || apiBranding.loginBgUrl || DEFAULT_BRANDING.login_bg_url,
        };
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
  // Guarantee branding is never null/undefined - always merge with defaults
  return {
    ...ctx,
    branding: { ...DEFAULT_BRANDING, ...(ctx.branding || {}) },
  };
}
