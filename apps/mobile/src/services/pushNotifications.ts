// ============================================================
// UPLIFT PUSH NOTIFICATIONS SERVICE
// Expo Push Notifications with Firebase Cloud Messaging
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Storage key for push token
const PUSH_TOKEN_KEY = '@uplift_push_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// -------------------- Types --------------------

export interface PushNotificationData {
  type: 'shift_reminder' | 'shift_change' | 'time_off_approved' | 'time_off_rejected' | 
        'new_opportunity' | 'skill_verified' | 'achievement' | 'recognition' | 
        'swap_request' | 'swap_approved' | 'task_assigned' | 'announcement' | 'chat_message';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationResponse {
  notification: Notifications.Notification;
  actionIdentifier: string;
}

// -------------------- Token Management --------------------

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Only works on physical devices
  if (!Device.isDevice) {
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PROJECT_ID || 'uplift-workforce',
    });
    
    const token = tokenData.data;

    // Store locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    // Register with backend
    await registerTokenWithBackend(token);

    // Configure Android channel
    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    return token;
  } catch (error) {
    // Non-blocking - push notification failure shouldn't block user
    if (__DEV__) console.warn('[PushNotifications] Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Send push token to backend for storage
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await api.publicRequest('/auth/push-token', {
      method: 'POST',
      body: {
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName || 'Unknown',
      },
    });
  } catch (error) {
    // Non-blocking - backend registration failure shouldn't block user
    if (__DEV__) console.warn('[PushNotifications] Failed to register token with backend:', error);
  }
}

/**
 * Unregister push token (e.g., on logout)
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await api.publicRequest('/auth/push-token', {
        method: 'DELETE',
        body: { token },
      });
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (error) {
    // Non-blocking - unregister failure shouldn't block user
    if (__DEV__) console.warn('[PushNotifications] Failed to unregister push token:', error);
  }
}

// -------------------- Android Channels --------------------

async function setupAndroidChannels(): Promise<void> {
  // Default channel
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF732D',
  });

  // Shift notifications
  await Notifications.setNotificationChannelAsync('shifts', {
    name: 'Shift Notifications',
    description: 'Reminders and updates about your shifts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF732D',
  });

  // Time off
  await Notifications.setNotificationChannelAsync('time-off', {
    name: 'Time Off',
    description: 'Updates on your time off requests',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  // Achievements
  await Notifications.setNotificationChannelAsync('achievements', {
    name: 'Achievements',
    description: 'Badges, recognition, and milestones',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#10B981',
  });

  // Chat/Messages
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    description: 'Team messages and announcements',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// -------------------- Notification Handlers --------------------

type NotificationHandler = (response: NotificationResponse) => void;
type ForegroundHandler = (notification: Notifications.Notification) => void;

let notificationResponseListener: Notifications.Subscription | null = null;
let notificationReceivedListener: Notifications.Subscription | null = null;

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived: ForegroundHandler,
  onNotificationTapped: NotificationHandler
): () => void {
  // Foreground notification received
  notificationReceivedListener = Notifications.addNotificationReceivedListener(
    (notification: Notifications.Notification) => {
      onNotificationReceived(notification);
    }
  );

  // User tapped notification
  notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
    (response: Notifications.NotificationResponse) => {
      onNotificationTapped({
        notification: response.notification,
        actionIdentifier: response.actionIdentifier,
      });
    }
  );

  // Return cleanup function
  return () => {
    if (notificationReceivedListener) {
      notificationReceivedListener.remove();
    }
    if (notificationResponseListener) {
      notificationResponseListener.remove();
    }
  };
}

/**
 * Get the notification that opened the app (if any)
 */
export async function getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

// -------------------- Local Notifications --------------------

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null = immediate
  });

  return id;
}

/**
 * Schedule shift reminder notification
 */
export async function scheduleShiftReminder(
  shiftId: string,
  shiftDate: Date,
  shiftTime: string,
  locationName: string,
  minutesBefore: number = 60
): Promise<string> {
  const reminderTime = new Date(shiftDate.getTime() - minutesBefore * 60 * 1000);
  
  // Don't schedule if reminder time is in the past
  if (reminderTime <= new Date()) {
    return '';
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Shift Reminder',
      body: `Your shift at ${locationName} starts at ${shiftTime}`,
      data: { type: 'shift_reminder', shiftId },
      sound: true,
      categoryIdentifier: 'shifts',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
    },
  });

  // Store reminder ID for potential cancellation
  const reminders = JSON.parse(await AsyncStorage.getItem('@shift_reminders') || '{}');
  reminders[shiftId] = id;
  await AsyncStorage.setItem('@shift_reminders', JSON.stringify(reminders));

  return id;
}

/**
 * Cancel a scheduled shift reminder
 */
export async function cancelShiftReminder(shiftId: string): Promise<void> {
  const reminders = JSON.parse(await AsyncStorage.getItem('@shift_reminders') || '{}');
  const notificationId = reminders[shiftId];
  
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    delete reminders[shiftId];
    await AsyncStorage.setItem('@shift_reminders', JSON.stringify(reminders));
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem('@shift_reminders');
}

// -------------------- Badge Management --------------------

/**
 * Set app badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear app badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// -------------------- Utility --------------------

/**
 * Check if push notifications are enabled
 */
export async function arePushNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Get stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

// -------------------- Navigation Helper --------------------

/**
 * Get navigation route from notification data
 */
export function getNavigationFromNotification(
  data: PushNotificationData['data'] & { type: PushNotificationData['type'] }
): { screen: string; params?: Record<string, any> } | null {
  switch (data.type) {
    case 'shift_reminder':
    case 'shift_change':
      return { screen: 'ShiftDetail', params: { shiftId: data.shiftId } };
    
    case 'time_off_approved':
    case 'time_off_rejected':
      return { screen: 'TimeOffRequest' };
    
    case 'new_opportunity':
      return { screen: 'JobBoard' };
    
    case 'skill_verified':
      return { screen: 'Skills' };
    
    case 'achievement':
      return { screen: 'Badges' };
    
    case 'recognition':
      return { screen: 'Feed' };
    
    case 'swap_request':
    case 'swap_approved':
      return { screen: 'Schedule' };
    
    case 'task_assigned':
      return { screen: 'Tasks', params: { taskId: data.taskId } };
    
    case 'announcement':
      return { screen: 'Feed' };
    
    case 'chat_message':
      return { screen: 'Feed' };
    
    default:
      return { screen: 'Home' };
  }
}
