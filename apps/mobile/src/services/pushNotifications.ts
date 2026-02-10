// ============================================================
// UPLIFT PUSH NOTIFICATIONS SERVICE
// STUB - Push notifications disabled for demo app
// ============================================================

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
  notification: any;
  actionIdentifier: string;
}

// -------------------- Token Management --------------------

export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications disabled for demo app
  return null;
}

export async function unregisterPushToken(): Promise<void> {
  // No-op for demo
}

// -------------------- Notification Handlers --------------------

type NotificationHandler = (response: NotificationResponse) => void;
type ForegroundHandler = (notification: any) => void;

export function setupNotificationListeners(
  _onNotificationReceived: ForegroundHandler,
  _onNotificationTapped: NotificationHandler
): () => void {
  // Return no-op cleanup
  return () => {};
}

export async function getInitialNotification(): Promise<any | null> {
  return null;
}

// -------------------- Local Notifications --------------------

export async function scheduleLocalNotification(
  _title: string,
  _body: string,
  _data?: Record<string, any>,
  _trigger?: any
): Promise<string> {
  return '';
}

export async function scheduleShiftReminder(
  _shiftId: string,
  _shiftDate: Date,
  _shiftTime: string,
  _locationName: string,
  _minutesBefore: number = 60
): Promise<string> {
  return '';
}

export async function cancelShiftReminder(_shiftId: string): Promise<void> {
  // No-op for demo
}

export async function cancelAllNotifications(): Promise<void> {
  // No-op for demo
}

// -------------------- Badge Management --------------------

export async function setBadgeCount(_count: number): Promise<void> {
  // No-op for demo
}

export async function clearBadge(): Promise<void> {
  // No-op for demo
}

// -------------------- Utility --------------------

export async function arePushNotificationsEnabled(): Promise<boolean> {
  return false;
}

export async function getStoredPushToken(): Promise<string | null> {
  return null;
}

// -------------------- Navigation Helper --------------------

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
