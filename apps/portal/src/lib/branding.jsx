// ============================================================
// BRANDING CONTEXT
// Fetches and provides white-label branding to all components
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { brandingApi, api } from './api';

const BrandingContext = createContext(null);

const DEFAULT_BRANDING = {
  brand_name: 'Grand Metropolitan',
  primary_color: '#1e3a5f',
  secondary_color: '#0f2847',
  logo_url: '/logo.svg',
  dark_logo_url: '/logo.svg',
  favicon_url: null,
  login_bg_url: null,
};

// Generate color shades from a hex color
function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function HSLToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateColorPalette(primaryHex) {
  const { h, s } = hexToHSL(primaryHex);
  return {
    50: HSLToHex(h, Math.min(s, 30), 95),
    100: HSLToHex(h, Math.min(s, 40), 90),
    200: HSLToHex(h, Math.min(s, 50), 80),
    300: HSLToHex(h, Math.min(s, 60), 65),
    400: HSLToHex(h, s, 50),
    500: primaryHex,
    600: HSLToHex(h, s, 35),
    700: HSLToHex(h, s, 28),
    800: HSLToHex(h, s, 20),
    900: HSLToHex(h, s, 12),
  };
}

function applyCSSProperties(branding) {
  const root = document.documentElement;
  if (branding.primary_color) {
    root.style.setProperty('--brand-primary', branding.primary_color);
    // Generate and apply all shades
    const palette = generateColorPalette(branding.primary_color);
    Object.entries(palette).forEach(([shade, color]) => {
      root.style.setProperty(`--brand-${shade}`, color);
    });
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
      } else {
        // Apply default branding
        applyCSSProperties(DEFAULT_BRANDING);
      }
    } catch (error) {
      // Silently fail — use defaults
      console.debug('Branding not available, using defaults');
      applyCSSProperties(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Apply default branding immediately on mount
    applyCSSProperties(DEFAULT_BRANDING);
    // Only fetch from API if user is authenticated (has token)
    const token = api.getToken();
    if (token) {
      fetchBranding();
    } else {
      setLoading(false);
    }
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
