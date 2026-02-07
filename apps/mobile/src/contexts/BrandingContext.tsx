import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const BRANDING_CACHE_KEY = '@uplift_branding';
const ORG_SLUG_KEY = '@uplift_org_slug';

export interface BrandingData {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
}

const DEFAULT_BRANDING: BrandingData = {
  brandName: 'Uplift',
  primaryColor: '#FF6B35',
  secondaryColor: '#E55A2B',
  logoUrl: null,
  logoDarkUrl: null,
};

interface BrandingContextValue {
  branding: BrandingData;
  loading: boolean;
  fetchBranding: (orgSlug: string) => Promise<boolean>;
  clearBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  loading: false,
  fetchBranding: async () => false,
  clearBranding: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);

  // Load cached branding on mount
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(BRANDING_CACHE_KEY);
        if (cached) {
          setBranding(JSON.parse(cached));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const fetchBranding = useCallback(async (orgSlug: string): Promise<boolean> => {
    if (!orgSlug.trim()) {
      setBranding(DEFAULT_BRANDING);
      return false;
    }
    setLoading(true);
    try {
      const data = await api.getBranding(orgSlug.trim());
      const brandingData: BrandingData = {
        brandName: data.branding?.brandName || DEFAULT_BRANDING.brandName,
        primaryColor: data.branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
        secondaryColor: data.branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
        logoUrl: data.branding?.logoUrl || null,
        logoDarkUrl: data.branding?.logoDarkUrl || null,
      };
      setBranding(brandingData);
      await AsyncStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(brandingData));
      await AsyncStorage.setItem(ORG_SLUG_KEY, orgSlug.trim());
      setLoading(false);
      return true;
    } catch {
      setLoading(false);
      return false;
    }
  }, []);

  const clearBranding = useCallback(async () => {
    setBranding(DEFAULT_BRANDING);
    await AsyncStorage.multiRemove([BRANDING_CACHE_KEY, ORG_SLUG_KEY]);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, fetchBranding, clearBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export { ORG_SLUG_KEY };
