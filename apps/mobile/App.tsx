import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigation } from './src/navigation/AppNavigation';
import { OfflineBanner } from './src/components/OfflineIndicators';
import { AlertProvider } from './src/utils/alert';
import { initializeLanguage } from './src/i18n';
import { useAuthStore } from './src/store/authStore';
import { initializeBackgroundSync } from './src/services/backgroundSync';

// CRITICAL: Check demo params SYNCHRONOUSLY before any React render
// This prevents the race condition where onboarding shows before demo login completes
// Fixes: Windows browsers showing OnboardingWelcome instead of demo app
function initDemoModeSync() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const demoRole = params.get('demo');
    if (demoRole === 'worker' || demoRole === 'manager') {
      useAuthStore.getState().loginDemoUser(demoRole);
      return true;
    } else if (demoRole === 'true') {
      const isManager = window.location.pathname.includes('/manager');
      useAuthStore.getState().loginDemoUser(isManager ? 'manager' : 'worker');
      return true;
    }
  }
  return false;
}

// Run BEFORE component mounts - sets auth state synchronously
const isDemoMode = initDemoModeSync();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeLanguage();

        // Initialize background sync for offline queue (native platforms only)
        if (Platform.OS !== 'web') {
          await initializeBackgroundSync();
        }
        // Demo mode already initialized synchronously above (initDemoModeSync)
      } catch (error) {
        if (__DEV__) {
          console.error('Failed to initialize:', error);
        }
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <OfflineBanner />
        <AppNavigation />
        <StatusBar style="auto" />
      </AlertProvider>
    </GestureHandlerRootView>
  );
}
