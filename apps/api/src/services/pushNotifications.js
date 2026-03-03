// ============================================================
// UPLIFT PUSH NOTIFICATION SERVICE (Backend)
// Send push notifications via Expo Push API
// ============================================================

import { db } from '../lib/database.js';

// Use db.query for queries and db.getClient() for transactions
const pool = { 
  query: db.query.bind(db), 
  connect: db.getClient.bind(db) 
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// -------------------- Types --------------------

/**
 * @typedef {Object} PushMessage
 * @property {string} to - Expo push token
 * @property {string} title - Notification title
 * @property {string} body - Notification body
 * @property {Object} [data] - Custom data payload
 * @property {string} [sound] - Sound to play
 * @property {string} [channelId] - Android channel ID
 * @property {number} [badge] - Badge count (iOS)
 * @property {number} [ttl] - Time to live in seconds
 * @property {string} [priority] - 'default' | 'normal' | 'high'
 */

/**
 * @typedef {Object} PushTicket
 * @property {string} status - 'ok' | 'error'
 * @property {string} [id] - Ticket ID for receipts
 * @property {Object} [details] - Error details
 */

// -------------------- Token Management --------------------

/**
 * Store or update push token for a user
 */
export async function registerPushToken(userId, token, platform, deviceName) {
  const client = await pool.connect();
  try {
    // Upsert token - one token per device per user
    await client.query(`
      INSERT INTO push_tokens (user_id, token, platform, device_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (token) 
      DO UPDATE SET 
        user_id = $1,
        platform = $3,
        device_name = $4,
        updated_at = NOW(),
        failed_count = 0
    `, [userId, token, platform, deviceName || 'Unknown']);

    return { success: true };
  } finally {
    client.release();
  }
}

/**
 * Remove push token
 */
export async function removePushToken(token) {
  await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]);
  return { success: true };
}

/**
 * Remove all tokens for a user (e.g., on logout from all devices)
 */
export async function removeAllUserTokens(userId) {
  await pool.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);
  return { success: true };
}

/**
 * Get all active tokens for a user
 */
export async function getUserTokens(userId) {
  const result = await pool.query(`
    SELECT token, platform, device_name 
    FROM push_tokens 
    WHERE user_id = $1 AND failed_count < 3
  `, [userId]);
  return result.rows;
}

/**
 * Get all active tokens for multiple users
 */
export async function getMultipleUserTokens(userIds) {
  if (!userIds.length) return [];
  
  const result = await pool.query(`
    SELECT user_id, token, platform 
    FROM push_tokens 
    WHERE user_id = ANY($1) AND failed_count < 3
  `, [userIds]);
  return result.rows;
}

// -------------------- Send Notifications --------------------

/**
 * Send push notification to a single user
 */
export async function sendToUser(userId, notification) {
  const tokens = await getUserTokens(userId);
  if (!tokens.length) {
    console.log(`No push tokens for user ${userId}`);
    return { sent: 0, failed: 0 };
  }

  const messages = tokens.map(t => ({
    to: t.token,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.sound || 'default',
    channelId: notification.channelId || 'default',
    badge: notification.badge,
    ttl: notification.ttl || 86400, // 24 hours default
    priority: notification.priority || 'high',
  }));

  return sendBatch(messages);
}

/**
 * Send push notification to multiple users
 */
export async function sendToUsers(userIds, notification) {
  const tokens = await getMultipleUserTokens(userIds);
  if (!tokens.length) {
    console.log('No push tokens for specified users');
    return { sent: 0, failed: 0 };
  }

  const messages = tokens.map(t => ({
    to: t.token,
    title: notification.title,
    body: notification.body,
    data: { ...notification.data, userId: t.user_id },
    sound: notification.sound || 'default',
    channelId: notification.channelId || 'default',
    ttl: notification.ttl || 86400,
    priority: notification.priority || 'high',
  }));

  return sendBatch(messages);
}

/**
 * Send push notification to all employees in an organization
 */
export async function sendToOrganization(organizationId, notification, excludeUserIds = []) {
  const result = await pool.query(`
    SELECT DISTINCT pt.token, pt.user_id
    FROM push_tokens pt
    JOIN users u ON u.id = pt.user_id
    WHERE u.organization_id = $1 
      AND pt.failed_count < 3
      AND u.id != ALL($2)
  `, [organizationId, excludeUserIds]);

  if (!result.rows.length) {
    console.log(`No push tokens for organization ${organizationId}`);
    return { sent: 0, failed: 0 };
  }

  const messages = result.rows.map(r => ({
    to: r.token,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.sound || 'default',
    channelId: notification.channelId || 'default',
    priority: 'high',
  }));

  return sendBatch(messages);
}

/**
 * Send push notification to employees at a specific location
 */
export async function sendToLocation(locationId, notification) {
  const result = await pool.query(`
    SELECT DISTINCT pt.token
    FROM push_tokens pt
    JOIN users u ON u.id = pt.user_id
    JOIN employees e ON e.user_id = u.id
    WHERE e.primary_location_id = $1 
      AND pt.failed_count < 3
  `, [locationId]);

  if (!result.rows.length) {
    return { sent: 0, failed: 0 };
  }

  const messages = result.rows.map(r => ({
    to: r.token,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.sound || 'default',
    channelId: notification.channelId || 'default',
    priority: 'high',
  }));

  return sendBatch(messages);
}

/**
 * Send batch of messages to Expo Push API
 */
async function sendBatch(messages) {
  if (!messages.length) return { sent: 0, failed: 0 };

  // Expo recommends batches of 100
  const chunks = chunkArray(messages, 100);
  let sent = 0;
  let failed = 0;
  const failedTokens = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      
      if (result.data) {
        result.data.forEach((ticket, index) => {
          if (ticket.status === 'ok') {
            sent++;
          } else {
            failed++;
            // Track failed tokens for cleanup
            if (ticket.details?.error === 'DeviceNotRegistered') {
              failedTokens.push(chunk[index].to);
            }
          }
        });
      }
    } catch (error) {
      console.error('Push notification batch failed:', error);
      failed += chunk.length;
    }
  }

  // Clean up invalid tokens
  if (failedTokens.length) {
    await markTokensFailed(failedTokens);
  }

  console.log(`Push notifications: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Mark tokens as failed (for cleanup)
 */
async function markTokensFailed(tokens) {
  if (!tokens.length) return;
  
  await pool.query(`
    UPDATE push_tokens 
    SET failed_count = failed_count + 1, updated_at = NOW()
    WHERE token = ANY($1)
  `, [tokens]);
}

// -------------------- Notification Templates --------------------

export const NotificationTemplates = {
  // Shift notifications
  shiftReminder: (shiftTime, locationName) => ({
    title: 'Shift Reminder',
    body: `Your shift at ${locationName} starts at ${shiftTime}`,
    channelId: 'shifts',
    data: { type: 'shift_reminder' },
  }),

  shiftChanged: (shiftDate, change) => ({
    title: 'Shift Updated',
    body: `Your shift on ${shiftDate} has been ${change}`,
    channelId: 'shifts',
    data: { type: 'shift_change' },
  }),

  shiftCancelled: (shiftDate) => ({
    title: 'Shift Cancelled',
    body: `Your shift on ${shiftDate} has been cancelled`,
    channelId: 'shifts',
    data: { type: 'shift_change' },
  }),

  newOpenShift: (role, locationName, time) => ({
    title: 'Open Shift Available',
    body: `${role} shift at ${locationName} - ${time}`,
    channelId: 'shifts',
    data: { type: 'new_open_shift' },
  }),

  // Time off
  timeOffApproved: (dates) => ({
    title: 'Time Off Approved',
    body: `Your time off request for ${dates} has been approved`,
    channelId: 'time-off',
    data: { type: 'time_off_approved' },
  }),

  timeOffRejected: (dates, reason) => ({
    title: 'Time Off Request Update',
    body: reason 
      ? `Your request for ${dates} was declined: ${reason}`
      : `Your time off request for ${dates} was declined`,
    channelId: 'time-off',
    data: { type: 'time_off_rejected' },
  }),

  // Swap requests
  swapRequested: (requesterName, shiftDate) => ({
    title: 'Shift Swap Request',
    body: `${requesterName} wants to swap shifts on ${shiftDate}`,
    channelId: 'shifts',
    data: { type: 'swap_request' },
  }),

  swapApproved: (shiftDate) => ({
    title: 'Swap Approved',
    body: `Your shift swap for ${shiftDate} has been approved`,
    channelId: 'shifts',
    data: { type: 'swap_approved' },
  }),

  // Achievements & Recognition
  badgeEarned: (badgeName) => ({
    title: 'Badge Earned!',
    body: `Congratulations! You earned the "${badgeName}" badge`,
    channelId: 'achievements',
    data: { type: 'achievement' },
  }),

  recognition: (fromName, message) => ({
    title: `Recognition from ${fromName}`,
    body: message.substring(0, 100),
    channelId: 'achievements',
    data: { type: 'recognition' },
  }),

  streakMilestone: (days) => ({
    title: 'Streak Milestone!',
    body: `Amazing! You've maintained a ${days}-day streak`,
    channelId: 'achievements',
    data: { type: 'achievement' },
  }),

  // Skills
  skillVerified: (skillName) => ({
    title: 'Skill Verified',
    body: `Your ${skillName} skill has been verified`,
    channelId: 'achievements',
    data: { type: 'skill_verified' },
  }),

  // Career
  newOpportunity: (jobTitle, matchScore) => ({
    title: 'New Opportunity',
    body: `${jobTitle} - ${matchScore}% match with your skills`,
    channelId: 'default',
    data: { type: 'new_opportunity' },
  }),

  applicationUpdate: (jobTitle, status) => ({
    title: 'Application Update',
    body: `Your application for ${jobTitle}: ${status}`,
    channelId: 'default',
    data: { type: 'application_update' },
  }),

  // Tasks
  taskAssigned: (taskTitle) => ({
    title: 'New Task',
    body: `You've been assigned: ${taskTitle}`,
    channelId: 'default',
    data: { type: 'task_assigned' },
  }),

  taskDueSoon: (taskTitle, dueTime) => ({
    title: 'Task Due Soon',
    body: `"${taskTitle}" is due ${dueTime}`,
    channelId: 'default',
    data: { type: 'task_due' },
  }),

  // Announcements
  announcement: (title, preview) => ({
    title: title,
    body: preview.substring(0, 100),
    channelId: 'messages',
    data: { type: 'announcement' },
  }),

  // Manager notifications
  approvalNeeded: (type, employeeName) => ({
    title: 'Approval Needed',
    body: `${employeeName} submitted a ${type} request`,
    channelId: 'default',
    data: { type: 'approval_needed' },
  }),

  clockInAlert: (employeeName, location) => ({
    title: 'Clock-In Alert',
    body: `${employeeName} clocked in at ${location}`,
    channelId: 'default',
    data: { type: 'clock_in' },
  }),

  // Expense notifications
  expenseApproved: (amount) => ({
    title: 'Expense Approved',
    body: `Your expense claim for ${amount} has been approved`,
    channelId: 'expenses',
    data: { type: 'expense_approved' },
  }),

  expenseRejected: (amount, reason) => ({
    title: 'Expense Declined',
    body: reason
      ? `Your expense claim for ${amount} was declined: ${reason}`
      : `Your expense claim for ${amount} was declined`,
    channelId: 'expenses',
    data: { type: 'expense_rejected' },
  }),

  expensePaid: (amount) => ({
    title: 'Expense Reimbursed',
    body: `Your expense claim for ${amount} has been paid`,
    channelId: 'expenses',
    data: { type: 'expense_paid' },
  }),

  expenseSubmitted: (employeeName, amount) => ({
    title: 'New Expense Submitted',
    body: `${employeeName} submitted an expense claim for ${amount}`,
    channelId: 'expenses',
    data: { type: 'expense_submitted' },
  }),
};

// -------------------- Utility --------------------

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default {
  registerPushToken,
  removePushToken,
  removeAllUserTokens,
  sendToUser,
  sendToUsers,
  sendToOrganization,
  sendToLocation,
  NotificationTemplates,
};
