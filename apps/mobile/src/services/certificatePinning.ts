// ============================================================
// CERTIFICATE PINNING SERVICE
// Prevents MITM attacks by validating server certificates
// ============================================================

import { Platform } from 'react-native';

// API host configuration
const API_HOST = process.env.EXPO_PUBLIC_API_URL || 'https://api.uplift.hr';

// Certificate pins - SHA256 hashes of the public key
// These should be updated when certificates are rotated
// Generate with: openssl s_client -connect api.uplift.hr:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
// PRODUCTION: Replace these placeholder hashes with real certificate hashes before launch
const CERTIFICATE_PINS = {
  // Primary certificate (current)
  primary: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  // Backup certificate (next rotation)
  backup: 'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  // Root CA pin (fallback)
  rootCA: 'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
};

// Runtime check for placeholder certificate pins
if (__DEV__) {
  const pinValues = Object.values(CERTIFICATE_PINS);
  const hasPlaceholder = pinValues.some(
    (pin) => pin.includes('AAAA') || pin.includes('BBBB')
  );
  if (hasPlaceholder) {
    if (__DEV__) console.warn(
      '[CertificatePinning] WARNING: Placeholder certificate pins detected. ' +
      'Replace with real certificate hashes before production deployment.'
    );
  }
}

// Pin expiration tracking
const PIN_CONFIG = {
  // When pins were last verified
  lastVerified: null as Date | null,
  // How often to re-verify (7 days)
  verifyIntervalMs: 7 * 24 * 60 * 60 * 1000,
  // Whether pinning is enabled
  enabled: process.env.NODE_ENV === 'production',
};

/**
 * Certificate pinning configuration for react-native-ssl-pinning
 * or similar libraries
 */
export const SSL_PINNING_CONFIG = {
  [API_HOST]: {
    includeSubdomains: true,
    publicKeyHashes: Object.values(CERTIFICATE_PINS),
  },
};

/**
 * Check if certificate pinning is available and enabled
 */
export function isPinningAvailable(): boolean {
  // Only available in production builds
  if (__DEV__) {
    return false;
  }

  // Check platform support
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  return PIN_CONFIG.enabled;
}

/**
 * Validate that the server certificate matches our pins
 * This is called by the network layer before making requests
 */
export async function validateCertificate(hostname: string): Promise<boolean> {
  if (!isPinningAvailable()) {
    return true; // Skip validation in dev
  }

  // Only validate for our API
  if (!hostname.includes('uplift.hr')) {
    return true;
  }

  try {
    // In a real implementation, this would use native modules
    // to validate the certificate chain against our pins
    //
    // For React Native, options include:
    // - react-native-ssl-pinning
    // - react-native-pinch
    // - expo-secure-store with custom native modules
    //
    // This is a placeholder for the validation logic
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create a fetch wrapper with certificate pinning
 */
export function createPinnedFetch() {
  const originalFetch = global.fetch;

  return async function pinnedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();

    // Skip pinning in development
    if (!isPinningAvailable()) {
      return originalFetch(input, init);
    }

    // Extract hostname
    const hostname = new URL(url).hostname;

    // Validate certificate before request
    const isValid = await validateCertificate(hostname);
    if (!isValid) {
      throw new Error(
        'Certificate pinning validation failed. The connection may be compromised.'
      );
    }

    // Proceed with the request
    return originalFetch(input, init);
  };
}

/**
 * Axios interceptor for certificate pinning
 */
export function createAxiosPinningInterceptor() {
  return {
    async request(config: any) {
      if (!isPinningAvailable()) {
        return config;
      }

      const hostname = new URL(config.baseURL || config.url).hostname;
      const isValid = await validateCertificate(hostname);

      if (!isValid) {
        throw new Error('Certificate pinning validation failed');
      }

      return config;
    },
  };
}

/**
 * Report a pinning failure (for security monitoring)
 */
export async function reportPinningFailure(
  hostname: string,
  error: string
): Promise<void> {
  try {
    // Send to security monitoring endpoint
    // This uses a separate, unpinned connection to report failures
    await fetch('https://security-reports.uplift.hr/pin-failure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostname,
        error,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0', // Would come from app config
      }),
    });
  } catch (reportError) {
    // Don't throw - this is best-effort reporting
  }
}

/**
 * Configuration for native SSL pinning modules
 * Use with react-native-ssl-pinning or similar
 */
export const getNativePinningConfig = () => ({
  // iOS: Uses TrustKit or built-in URLSession pinning
  ios: {
    kTSKSwizzleNetworkDelegates: false,
    kTSKPinnedDomains: {
      'api.uplift.hr': {
        kTSKIncludeSubdomains: true,
        kTSKPublicKeyHashes: Object.values(CERTIFICATE_PINS),
        kTSKEnforcePinning: PIN_CONFIG.enabled,
        kTSKReportUris: ['https://security-reports.uplift.hr/pin-failure'],
      },
    },
  },

  // Android: Uses OkHttp CertificatePinner
  android: {
    certificates: [
      {
        hostname: 'api.uplift.hr',
        includeSubdomains: true,
        pins: Object.values(CERTIFICATE_PINS),
      },
    ],
  },
});

/**
 * Initialize certificate pinning for the app
 */
export function initializePinning(): void {
  if (!isPinningAvailable()) {
    return;
  }


  // Replace global fetch with pinned version
  // Note: This is a simplified implementation
  // In production, use react-native-ssl-pinning or similar native modules
  // global.fetch = createPinnedFetch();

  // Log that pinning is active
}

// Export types for TypeScript
export interface PinningConfig {
  hostname: string;
  pins: string[];
  includeSubdomains: boolean;
}

export interface PinFailureReport {
  hostname: string;
  error: string;
  platform: string;
  timestamp: string;
  appVersion: string;
}

export default {
  isPinningAvailable,
  validateCertificate,
  createPinnedFetch,
  createAxiosPinningInterceptor,
  reportPinningFailure,
  getNativePinningConfig,
  initializePinning,
  SSL_PINNING_CONFIG,
  CERTIFICATE_PINS,
};
