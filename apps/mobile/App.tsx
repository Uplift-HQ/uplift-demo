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

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeLanguage();

        // Web: auto-login when ?demo=true is in the URL
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (params.get('demo') === 'true') {
            const isManager = window.location.pathname.includes('/manager');
            const email = isManager
              ? 'demo-manager@uplifthq.co.uk'
              : 'demo-worker@uplifthq.co.uk';
            try {
              await login(email, 'demo123');
            } catch (e) {
              if (__DEV__) {
                console.warn('Demo auto-login failed:', e);
              }
            }
          }
        }
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
