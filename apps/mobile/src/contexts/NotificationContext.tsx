// ============================================================
// UPLIFT NOTIFICATION CONTEXT
// Global notification management with Expo Push
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import {
  registerForPushNotifications,
  setupNotificationListeners,
  getInitialNotification,
  getNavigationFromNotification,
  clearBadge,
  unregisterPushToken,
} from '../services/pushNotifications';

// -------------------- Types --------------------

interface NotificationContextValue {
  expoPushToken: string | null;
  notification: any | null;
  permissionStatus: string | null;
  registerForNotifications: () => Promise<void>;
  unregister: () => Promise<void>;
}

// -------------------- Context --------------------

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// -------------------- Provider --------------------

interface NotificationProviderProps {
  children: React.ReactNode;
  onNotificationTapped?: (data: any) => void;
}

export function NotificationProvider({ children, onNotificationTapped }: NotificationProviderProps) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Register for push notifications
  const registerForNotifications = useCallback(async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        setPermissionStatus('granted');
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      setPermissionStatus('error');
    }
  }, []);

  // Unregister (logout)
  const unregister = useCallback(async () => {
    try {
      await unregisterPushToken();
      setExpoPushToken(null);
    } catch (error) {
    }
  }, []);

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback((notification: any) => {
    setNotification(notification);
  }, []);

  // Handle notification tapped
  const handleNotificationTapped = useCallback(({ notification, actionIdentifier }: any) => {
    
    const data = notification.request.content.data as Record<string, any> & { type: string };
    if (data && data.type && onNotificationTapped) {
      const nav = getNavigationFromNotification(data as any);
      if (nav) {
        onNotificationTapped(nav);
      }
    }
    
    setNotification(null);
  }, [onNotificationTapped]);

  // Handle app state changes (clear badge when app opens)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        clearBadge();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Register for notifications
    registerForNotifications();

    // Set up listeners
    cleanupRef.current = setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationTapped
    );

    // Check for initial notification (app opened from notification)
    getInitialNotification().then(response => {
      if (response) {
        const data = response.notification.request.content.data as Record<string, any> & { type: string };
        if (data && data.type && onNotificationTapped) {
          setTimeout(() => {
            const nav = getNavigationFromNotification(data as any);
            if (nav) {
              onNotificationTapped(nav);
            }
          }, 500); // Small delay to ensure navigation is ready
        }
      }
    });

    // Cleanup
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [registerForNotifications, handleNotificationReceived, handleNotificationTapped, onNotificationTapped]);

  const value: NotificationContextValue = {
    expoPushToken,
    notification,
    permissionStatus,
    registerForNotifications,
    unregister,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// -------------------- Notification Banner Component --------------------

import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';

export function NotificationBanner() {
  const { notification } = useNotifications();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (notification) {
      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [notification, translateY]);

  if (!notification) return null;

  const { title, body } = notification.request.content;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.bannerBody} numberOfLines={2}>
          {body}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.slate900,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
  },
  bannerBody: {
    color: colors.slate300,
    fontSize: 13,
  },
});
