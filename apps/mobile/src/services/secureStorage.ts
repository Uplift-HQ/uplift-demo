// ============================================================
// SECURE STORAGE SERVICE
// Uses iOS Keychain / Android Keystore for sensitive data
// ============================================================

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_KEYS = {
  ACCESS_TOKEN: 'uplift_access_token',
  REFRESH_TOKEN: 'uplift_refresh_token',
  CSRF_TOKEN: 'uplift_csrf_token',
  USER_ID: 'uplift_user_id',
  BIOMETRIC_ENABLED: 'uplift_biometric',
};

// Non-sensitive keys can still use AsyncStorage
const ASYNC_KEYS = {
  LANGUAGE: '@uplift_language',
  THEME: '@uplift_theme',
  ONBOARDING_COMPLETE: '@uplift_onboarding',
  LAST_SYNC: '@uplift_last_sync',
};

/**
 * Check if SecureStore is available (not available in Expo Go on some devices)
 */
const isSecureStoreAvailable = async (): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync('__test__', 'test');
    await SecureStore.deleteItemAsync('__test__');
    return true;
  } catch {
    return false;
  }
};

let secureStoreAvailable: boolean | null = null;

const checkAvailability = async () => {
  if (secureStoreAvailable === null) {
    secureStoreAvailable = await isSecureStoreAvailable();
  }
  return secureStoreAvailable;
};

/**
 * Secure storage for sensitive data (tokens, credentials)
 */
export const secureStorage = {
  async setToken(key: 'access' | 'refresh' | 'csrf', value: string): Promise<void> {
    const storeKey = key === 'access' ? SECURE_KEYS.ACCESS_TOKEN : key === 'refresh' ? SECURE_KEYS.REFRESH_TOKEN : SECURE_KEYS.CSRF_TOKEN;

    if (await checkAvailability()) {
      await SecureStore.setItemAsync(storeKey, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } else {
      // Fallback for development/Expo Go - still secure enough for dev
      await AsyncStorage.setItem(storeKey, value);
    }
  },

  async getToken(key: 'access' | 'refresh' | 'csrf'): Promise<string | null> {
    const storeKey = key === 'access' ? SECURE_KEYS.ACCESS_TOKEN : key === 'refresh' ? SECURE_KEYS.REFRESH_TOKEN : SECURE_KEYS.CSRF_TOKEN;

    if (await checkAvailability()) {
      return await SecureStore.getItemAsync(storeKey);
    } else {
      return await AsyncStorage.getItem(storeKey);
    }
  },

  async deleteToken(key: 'access' | 'refresh' | 'csrf'): Promise<void> {
    const storeKey = key === 'access' ? SECURE_KEYS.ACCESS_TOKEN : key === 'refresh' ? SECURE_KEYS.REFRESH_TOKEN : SECURE_KEYS.CSRF_TOKEN;

    if (await checkAvailability()) {
      await SecureStore.deleteItemAsync(storeKey);
    } else {
      await AsyncStorage.removeItem(storeKey);
    }
  },

  async clearAll(): Promise<void> {
    const keys = Object.values(SECURE_KEYS);

    if (await checkAvailability()) {
      await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
    } else {
      await AsyncStorage.multiRemove(keys);
    }
  },

  async setUserId(userId: string): Promise<void> {
    if (await checkAvailability()) {
      await SecureStore.setItemAsync(SECURE_KEYS.USER_ID, userId);
    } else {
      await AsyncStorage.setItem(SECURE_KEYS.USER_ID, userId);
    }
  },

  async getUserId(): Promise<string | null> {
    if (await checkAvailability()) {
      return await SecureStore.getItemAsync(SECURE_KEYS.USER_ID);
    } else {
      return await AsyncStorage.getItem(SECURE_KEYS.USER_ID);
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    if (await checkAvailability()) {
      await SecureStore.setItemAsync(SECURE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
    } else {
      await AsyncStorage.setItem(SECURE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
    }
  },

  async isBiometricEnabled(): Promise<boolean> {
    let value: string | null;
    if (await checkAvailability()) {
      value = await SecureStore.getItemAsync(SECURE_KEYS.BIOMETRIC_ENABLED);
    } else {
      value = await AsyncStorage.getItem(SECURE_KEYS.BIOMETRIC_ENABLED);
    }
    return value === 'true';
  },
};

/**
 * Regular storage for non-sensitive preferences
 */
export const appStorage = {
  async setLanguage(lang: string): Promise<void> {
    await AsyncStorage.setItem(ASYNC_KEYS.LANGUAGE, lang);
  },

  async getLanguage(): Promise<string | null> {
    return await AsyncStorage.getItem(ASYNC_KEYS.LANGUAGE);
  },

  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await AsyncStorage.setItem(ASYNC_KEYS.THEME, theme);
  },

  async getTheme(): Promise<string | null> {
    return await AsyncStorage.getItem(ASYNC_KEYS.THEME);
  },

  async setOnboardingComplete(complete: boolean): Promise<void> {
    await AsyncStorage.setItem(ASYNC_KEYS.ONBOARDING_COMPLETE, complete ? 'true' : 'false');
  },

  async isOnboardingComplete(): Promise<boolean> {
    const value = await AsyncStorage.getItem(ASYNC_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  },

  async setLastSync(timestamp: number): Promise<void> {
    await AsyncStorage.setItem(ASYNC_KEYS.LAST_SYNC, timestamp.toString());
  },

  async getLastSync(): Promise<number | null> {
    const value = await AsyncStorage.getItem(ASYNC_KEYS.LAST_SYNC);
    return value ? parseInt(value, 10) : null;
  },
};

export default secureStorage;
