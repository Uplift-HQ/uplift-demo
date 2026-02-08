// ============================================================
// ACTIVITY LOG SERVICE
// Security and user activity logging
// ============================================================

import { db } from '../lib/database.js';

export const activityLog = {
  /**
   * Log a user activity
   */
  async log({
    userId,
    organizationId,
    action,
    actionDetails = null,
    ipAddress = null,
    userAgent = null,
    success = true,
    failureReason = null,
  }) {
    try {
      // Parse user agent for device info
      const deviceInfo = userAgent ? this.parseUserAgent(userAgent) : null;

      await db.query(
        `INSERT INTO user_activity_log 
         (user_id, organization_id, action, action_details, ip_address, user_agent, device_info, success, failure_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          organizationId,
          action,
          actionDetails ? JSON.stringify(actionDetails) : null,
          ipAddress,
          userAgent,
          deviceInfo ? JSON.stringify(deviceInfo) : null,
          success,
          failureReason,
        ]
      );
    } catch (error) {
      // Don't throw - logging should never break the main flow
      console.error('Failed to log activity:', error);
    }
  },

  /**
   * Parse user agent string into structured data
   */
  parseUserAgent(userAgent) {
    if (!userAgent) return null;

    const ua = userAgent.toLowerCase();
    
    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    // Detect device type
    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    return { browser, os, deviceType };
  },

  /**
   * Get activity summary for a user
   */
  async getUserSummary(userId, days = 30) {
    const safeDays = parseInt(days) || 30;
    const result = await db.query(
      `SELECT
        action,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
       FROM user_activity_log
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY action
       ORDER BY count DESC`,
      [userId, safeDays]
    );
    return result.rows;
  },

  /**
   * Get recent failed login attempts for security monitoring
   */
  async getFailedLogins(organizationId, hours = 24) {
    const safeHours = parseInt(hours) || 24;
    const result = await db.query(
      `SELECT
        user_id, ip_address, COUNT(*) as attempts,
        MIN(created_at) as first_attempt,
        MAX(created_at) as last_attempt
       FROM user_activity_log
       WHERE organization_id = $1
         AND action = 'login'
         AND success = false
         AND created_at > NOW() - INTERVAL '1 hour' * $2
       GROUP BY user_id, ip_address
       HAVING COUNT(*) >= 3
       ORDER BY attempts DESC`,
      [organizationId, safeHours]
    );
    return result.rows;
  },

  /**
   * Log common events (convenience methods)
   */
  async logLogin(user, ipAddress, userAgent, success, failureReason = null) {
    return this.log({
      userId: user?.id,
      organizationId: user?.organization_id,
      action: 'login',
      ipAddress,
      userAgent,
      success,
      failureReason,
    });
  },

  async logLogout(user, ipAddress, userAgent) {
    return this.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'logout',
      ipAddress,
      userAgent,
    });
  },

  async logPasswordChange(userId, organizationId, ipAddress, userAgent, forced = false) {
    return this.log({
      userId,
      organizationId,
      action: 'password_changed',
      actionDetails: { forced },
      ipAddress,
      userAgent,
    });
  },

  async logPasswordReset(email, ipAddress, userAgent, success) {
    return this.log({
      userId: null,
      organizationId: null,
      action: 'password_reset_requested',
      actionDetails: { email },
      ipAddress,
      userAgent,
      success,
    });
  },

  async logMfaEnabled(userId, organizationId, ipAddress, userAgent) {
    return this.log({
      userId,
      organizationId,
      action: 'mfa_enabled',
      ipAddress,
      userAgent,
    });
  },

  async logMfaDisabled(userId, organizationId, ipAddress, userAgent) {
    return this.log({
      userId,
      organizationId,
      action: 'mfa_disabled',
      ipAddress,
      userAgent,
    });
  },
};

export default activityLog;
