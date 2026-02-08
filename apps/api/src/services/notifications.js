// ============================================================
// NOTIFICATION SERVICE
// Push notifications, Email, In-app notifications
// ============================================================

import { db } from '../lib/database.js';
import { emailService } from './email.js';

export const notificationService = {
  // -------------------- CORE METHODS --------------------

  /**
   * Create in-app notification
   */
  async create({ userId, organizationId, type, title, body, relatedType, relatedId, actionUrl }) {
    const result = await db.query(
      `INSERT INTO notifications (
        user_id, organization_id, type, title, body, 
        related_type, related_id, action_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [userId, organizationId, type, title, body, relatedType, relatedId, actionUrl]
    );
    
    return result.rows[0];
  },

  /**
   * Get user preferences
   */
  async getPreferences(userId) {
    const result = await db.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    
    return result.rows[0] || {
      email_enabled: true,
      push_enabled: true,
      sms_enabled: false,
      shift_reminders: true,
      shift_reminder_hours: 24,
    };
  },

  /**
   * Send notification through configured channels
   */
  async send({ userId, organizationId, type, title, body, relatedType, relatedId, actionUrl }) {
    // Get user and preferences
    const user = await db.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    const prefs = await this.getPreferences(userId);

    if (!user.rows[0]) return null;

    // Create in-app notification
    const notification = await this.create({
      userId, organizationId, type, title, body, relatedType, relatedId, actionUrl
    });

    const channelsSent = [];

    // Push notification
    if (prefs.push_enabled) {
      try {
        await this.sendPush(userId, title, body, actionUrl);
        channelsSent.push('push');
      } catch (error) {
        console.error('Push notification failed:', error);
      }
    }

    // Email
    if (prefs.email_enabled) {
      try {
        await this.sendEmail(user.rows[0].email, title, body, actionUrl);
        channelsSent.push('email');
      } catch (error) {
        console.error('Email notification failed:', error);
      }
    }

    // Update channels sent
    await db.query(
      `UPDATE notifications SET channels_sent = $2 WHERE id = $1`,
      [notification.id, channelsSent]
    );

    return notification;
  },

  /**
   * Send push notification
   */
  async sendPush(userId, title, body, actionUrl) {
    // Get active push tokens
    const tokens = await db.query(
      `SELECT token, platform FROM push_tokens 
       WHERE user_id = $1 AND active = TRUE`,
      [userId]
    );

    if (tokens.rows.length === 0) return;

    // In production, use Firebase Cloud Messaging or similar
    // For now, just log
    console.log(`[PUSH] To user ${userId}:`, { title, body, tokens: tokens.rows.length });

    // Example FCM implementation:
    // const messaging = getMessaging();
    // await messaging.sendMulticast({
    //   tokens: tokens.rows.map(t => t.token),
    //   notification: { title, body },
    //   data: { actionUrl },
    // });
  },

  /**
   * Send email notification
   */
  async sendEmail(email, subject, body, actionUrl) {
    try {
      // Use the email service for production-ready delivery
      await emailService.sendNotification(email, {
        title: subject,
        body,
        actionUrl,
      });
    } catch (error) {
      console.error(`[EMAIL] Failed to queue email to ${email}:`, error);
    }
  },

  /**
   * Send SMS notification
   */
  async sendSms(phone, message) {
    // In production, use Twilio or similar
    console.log(`[SMS] To ${phone}:`, message);
  },

  // -------------------- SHIFT NOTIFICATIONS --------------------

  /**
   * Notify employee of assigned shift
   */
  async sendShiftAssigned(shift) {
    // Get employee's user ID
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [shift.employee_id]
    );

    if (!user.rows[0]) return;

    const date = new Date(shift.date).toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    const startTime = new Date(shift.start_time).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'shift_assigned',
      title: 'New Shift Assigned',
      body: `You've been assigned a shift on ${date} at ${startTime}`,
      relatedType: 'shift',
      relatedId: shift.id,
      actionUrl: `/schedule?date=${shift.date}`,
    });
  },

  /**
   * Notify employee of cancelled shift
   */
  async sendShiftCancelled(shift) {
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [shift.employee_id]
    );

    if (!user.rows[0]) return;

    const date = new Date(shift.date).toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'shift_cancelled',
      title: 'Shift Cancelled',
      body: `Your shift on ${date} has been cancelled`,
      relatedType: 'shift',
      relatedId: shift.id,
      actionUrl: `/schedule`,
    });
  },

  /**
   * Send shift reminders (called by scheduler)
   */
  async sendShiftReminders() {
    // Find shifts starting within reminder window
    const shifts = await db.query(`
      SELECT s.*, e.id as emp_id, u.id as user_id, np.shift_reminder_hours
      FROM shifts s
      JOIN employees e ON e.id = s.employee_id
      JOIN users u ON u.employee_id = e.id
      LEFT JOIN notification_preferences np ON np.user_id = u.id
      WHERE s.start_time BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        AND s.status IN ('scheduled', 'confirmed')
        AND s.published = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.related_type = 'shift' 
            AND n.related_id = s.id 
            AND n.type = 'shift_reminder'
        )
    `);

    for (const shift of shifts.rows) {
      const hoursUntil = (new Date(shift.start_time) - new Date()) / 3600000;
      const reminderHours = shift.shift_reminder_hours || 24;

      if (hoursUntil <= reminderHours) {
        const date = new Date(shift.date).toLocaleDateString('en-GB', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        });
        const startTime = new Date(shift.start_time).toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        await this.send({
          userId: shift.user_id,
          organizationId: shift.organization_id,
          type: 'shift_reminder',
          title: 'Shift Reminder',
          body: `Your shift starts ${date} at ${startTime}`,
          relatedType: 'shift',
          relatedId: shift.id,
          actionUrl: `/schedule?date=${shift.date}`,
        });
      }
    }
  },

  /**
   * Notify about schedule published
   */
  async sendSchedulePublished(userId, period) {
    const user = await db.query(`SELECT organization_id FROM users WHERE id = $1`, [userId]);
    if (!user.rows[0]) return;

    const startDate = new Date(period.start_date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    });
    const endDate = new Date(period.end_date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    });

    await this.send({
      userId,
      organizationId: user.rows[0].organization_id,
      type: 'schedule_published',
      title: 'New Schedule Available',
      body: `The schedule for ${startDate} - ${endDate} has been published`,
      relatedType: 'schedule_period',
      relatedId: period.id,
      actionUrl: `/schedule?date=${period.start_date}`,
    });
  },

  // -------------------- SWAP NOTIFICATIONS --------------------

  /**
   * Notify managers of swap request
   */
  async sendSwapRequest(swap) {
    // Get managers for the location
    const shift = await db.query(
      `SELECT s.location_id, s.organization_id, e.first_name, e.last_name
       FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       WHERE s.id = $1`,
      [swap.from_shift_id]
    );

    if (!shift.rows[0]) return;

    const managers = await db.query(
      `SELECT u.id FROM users u
       WHERE u.organization_id = $1 
         AND u.role IN ('admin', 'manager')`,
      [shift.rows[0].organization_id]
    );

    const employeeName = `${shift.rows[0].first_name} ${shift.rows[0].last_name}`;

    for (const manager of managers.rows) {
      await this.send({
        userId: manager.id,
        organizationId: shift.rows[0].organization_id,
        type: 'swap_request',
        title: 'Shift Swap Request',
        body: `${employeeName} has requested a shift ${swap.type}`,
        relatedType: 'shift_swap',
        relatedId: swap.id,
        actionUrl: `/approvals?tab=swaps`,
      });
    }
  },

  /**
   * Notify employee of swap decision
   */
  async sendSwapDecision(swap, decision) {
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [swap.from_employee_id]
    );

    if (!user.rows[0]) return;

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'swap_decision',
      title: `Shift ${swap.type.charAt(0).toUpperCase() + swap.type.slice(1)} ${decision === 'approve' ? 'Approved' : 'Denied'}`,
      body: `Your shift ${swap.type} request has been ${decision === 'approve' ? 'approved' : 'denied'}`,
      relatedType: 'shift_swap',
      relatedId: swap.id,
      actionUrl: `/schedule`,
    });
  },

  // -------------------- TIME OFF NOTIFICATIONS --------------------

  /**
   * Notify managers of time off request
   */
  async sendTimeOffRequest(request) {
    const employee = await db.query(
      `SELECT e.first_name, e.last_name, e.manager_id 
       FROM employees e WHERE e.id = $1`,
      [request.employee_id]
    );

    // Notify direct manager if exists, otherwise all admins
    let managers;
    if (employee.rows[0]?.manager_id) {
      managers = await db.query(
        `SELECT u.id FROM users u WHERE u.employee_id = $1`,
        [employee.rows[0].manager_id]
      );
    }
    
    if (!managers?.rows?.length) {
      managers = await db.query(
        `SELECT u.id FROM users u
         WHERE u.organization_id = $1 AND u.role IN ('admin', 'manager')`,
        [request.organization_id]
      );
    }

    const employeeName = `${employee.rows[0].first_name} ${employee.rows[0].last_name}`;
    const startDate = new Date(request.start_date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    });

    for (const manager of managers.rows) {
      await this.send({
        userId: manager.id,
        organizationId: request.organization_id,
        type: 'time_off_request',
        title: 'Time Off Request',
        body: `${employeeName} has requested ${request.total_days} days off from ${startDate}`,
        relatedType: 'time_off_request',
        relatedId: request.id,
        actionUrl: `/approvals?tab=time-off`,
      });
    }
  },

  /**
   * Notify employee of time off decision
   */
  async sendTimeOffDecision(request, decision) {
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [request.employee_id]
    );

    if (!user.rows[0]) return;

    const startDate = new Date(request.start_date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    });

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'time_off_decision',
      title: `Time Off ${decision === 'approve' ? 'Approved' : 'Denied'}`,
      body: `Your time off request for ${startDate} has been ${decision === 'approve' ? 'approved' : 'denied'}`,
      relatedType: 'time_off_request',
      relatedId: request.id,
      actionUrl: `/time-off`,
    });
  },

  /**
   * Notify employee of time entry decision
   */
  async sendTimeEntryDecision(entry, decision) {
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [entry.employee_id]
    );

    if (!user.rows[0]) return;

    const date = new Date(entry.clock_in).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    });

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'time_entry_decision',
      title: `Timesheet ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
      body: `Your timesheet entry for ${date} has been ${decision === 'approve' ? 'approved' : 'rejected'}`,
      relatedType: 'time_entry',
      relatedId: entry.id,
      actionUrl: `/timesheets`,
    });
  },

  // -------------------- USER NOTIFICATION METHODS --------------------

  /**
   * Get user's notifications
   */
  async getForUser(userId, { limit = 20, unreadOnly = false } = {}) {
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    
    if (unreadOnly) {
      query += ` AND read = FALSE`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $2`;

    const result = await db.query(query, [userId, limit]);
    return result.rows;
  },

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const result = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  },

  /**
   * Mark as read
   */
  async markAsRead(notificationId, userId) {
    await db.query(
      `UPDATE notifications SET read = TRUE, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  },

  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    await db.query(
      `UPDATE notifications SET read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );
  },

  /**
   * Register push token
   */
  async registerPushToken(userId, token, platform, deviceName) {
    await db.query(
      `INSERT INTO push_tokens (user_id, token, platform, device_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, token) DO UPDATE SET 
         active = TRUE, 
         last_used_at = NOW()`,
      [userId, token, platform, deviceName]
    );
  },

  /**
   * Unregister push token
   */
  async unregisterPushToken(userId, token) {
    await db.query(
      `UPDATE push_tokens SET active = FALSE WHERE user_id = $1 AND token = $2`,
      [userId, token]
    );
  },

  // -------------------- EXPENSE NOTIFICATIONS --------------------

  /**
   * Notify employee of expense decision
   */
  async sendExpenseDecision(expense, decision) {
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [expense.employee_id]
    );

    if (!user.rows[0]) return;

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'expense_decision',
      title: `Expense ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
      body: `Your expense claim for £${(expense.amount / 100).toFixed(2)} has been ${decision === 'approve' ? 'approved' : 'rejected'}`,
      relatedType: 'expense',
      relatedId: expense.id,
      actionUrl: `/expenses`,
    });
  },

  // -------------------- PAYSLIP NOTIFICATIONS --------------------

  /**
   * Notify employee of new payslip
   */
  async sendPayslipAvailable(payslip) {
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [payslip.employee_id]
    );

    if (!user.rows[0]) return;

    const payDate = new Date(payslip.pay_date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'payslip_available',
      title: 'New Payslip Available',
      body: `Your payslip for ${payDate} is now available to view`,
      relatedType: 'payslip',
      relatedId: payslip.id,
      actionUrl: `/payslips/${payslip.id}`,
    });
  },

  // -------------------- DOCUMENT NOTIFICATIONS --------------------

  /**
   * Notify employee of document requiring signature
   */
  async sendDocumentSignatureRequired(document, userId, organizationId) {
    await this.send({
      userId,
      organizationId,
      type: 'document_signature_required',
      title: 'Signature Required',
      body: `Please sign: ${document.name}`,
      relatedType: 'document',
      relatedId: document.id,
      actionUrl: `/documents/${document.id}/sign`,
    });
  },

  // -------------------- RECOGNITION NOTIFICATIONS --------------------

  /**
   * Notify employee of recognition received
   */
  async sendRecognitionReceived(recognition, fromUserName) {
    await this.send({
      userId: recognition.to_user_id,
      organizationId: recognition.organization_id,
      type: 'recognition_received',
      title: 'You Received Recognition!',
      body: `${fromUserName} gave you kudos: "${recognition.message.substring(0, 50)}${recognition.message.length > 50 ? '...' : ''}"`,
      relatedType: 'recognition',
      relatedId: recognition.id,
      actionUrl: `/recognition`,
    });
  },

  /**
   * Notify employee of badge earned
   */
  async sendBadgeEarned(userId, organizationId, badge) {
    await this.send({
      userId,
      organizationId,
      type: 'badge_earned',
      title: 'New Badge Earned!',
      body: `You've earned the "${badge.name}" badge`,
      relatedType: 'badge',
      relatedId: badge.id,
      actionUrl: `/recognition/badges`,
    });
  },

  // -------------------- PERFORMANCE NOTIFICATIONS --------------------

  /**
   * Notify employee of performance review assigned
   */
  async sendPerformanceReviewAssigned(review) {
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [review.employee_id]
    );

    if (!user.rows[0]) return;

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'performance_review_assigned',
      title: 'Performance Review Assigned',
      body: `Your ${review.review_period} performance review is ready for self-assessment`,
      relatedType: 'performance_review',
      relatedId: review.id,
      actionUrl: `/performance/reviews/${review.id}`,
    });
  },

  /**
   * Notify employee of goal assigned
   */
  async sendGoalAssigned(goal, employeeId) {
    const user = await db.query(
      `SELECT u.id, u.organization_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE e.id = $1`,
      [employeeId]
    );

    if (!user.rows[0]) return;

    await this.send({
      userId: user.rows[0].id,
      organizationId: user.rows[0].organization_id,
      type: 'goal_assigned',
      title: 'New Goal Assigned',
      body: `You have a new goal: "${goal.title}"`,
      relatedType: 'goal',
      relatedId: goal.id,
      actionUrl: `/performance/goals/${goal.id}`,
    });
  },

  /**
   * Notify employee of feedback received
   */
  async sendFeedbackReceived(feedback, fromUserName, isAnonymous) {
    await this.send({
      userId: feedback.to_user_id,
      organizationId: feedback.organization_id,
      type: 'feedback_received',
      title: 'New Feedback Received',
      body: isAnonymous ? 'You received anonymous feedback' : `${fromUserName} gave you feedback`,
      relatedType: 'feedback',
      relatedId: feedback.id,
      actionUrl: `/performance/feedback`,
    });
  },

  // -------------------- LEARNING NOTIFICATIONS --------------------

  /**
   * Notify employee of course assigned
   */
  async sendCourseAssigned(enrollment, courseName) {
    await this.send({
      userId: enrollment.user_id,
      organizationId: enrollment.organization_id,
      type: 'course_assigned',
      title: 'New Training Assigned',
      body: `You've been enrolled in: ${courseName}`,
      relatedType: 'enrollment',
      relatedId: enrollment.id,
      actionUrl: `/learning/courses/${enrollment.course_id}`,
    });
  },

  /**
   * Notify employee of overdue training
   */
  async sendTrainingOverdue(enrollment, courseName) {
    await this.send({
      userId: enrollment.user_id,
      organizationId: enrollment.organization_id,
      type: 'training_overdue',
      title: 'Training Overdue',
      body: `Your training "${courseName}" is now overdue. Please complete it as soon as possible.`,
      relatedType: 'enrollment',
      relatedId: enrollment.id,
      actionUrl: `/learning/courses/${enrollment.course_id}`,
    });
  },

  /**
   * Notify employee of certificate expiring
   */
  async sendCertificateExpiring(certification, daysUntilExpiry) {
    await this.send({
      userId: certification.user_id,
      organizationId: certification.organization_id,
      type: 'certificate_expiring',
      title: 'Certification Expiring Soon',
      body: `Your "${certification.certification_name}" expires in ${daysUntilExpiry} days`,
      relatedType: 'certification',
      relatedId: certification.id,
      actionUrl: `/learning/certifications`,
    });
  },
};

// Export helper functions for direct import
export async function notifyPayslipAvailable(employeeId, organizationId, period) {
  return notificationService.sendPayslipAvailable({
    employee_id: employeeId,
    organization_id: organizationId,
    pay_date: period.payPeriodEnd,
    id: period.payslipId
  });
}

export default notificationService;
