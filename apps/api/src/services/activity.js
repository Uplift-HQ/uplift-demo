// ============================================================
// ACTIVITY LOG SERVICE
// Security, audit, and user activity logging
// GDPR & SOC 2 compliant audit trail
// ============================================================

import { db } from '../lib/database.js';

// Sensitive action categories for compliance
const AUDIT_CATEGORIES = {
  AUTH: 'authentication',
  DATA: 'data_access',
  ADMIN: 'administration',
  FINANCE: 'financial',
  HR: 'human_resources',
  SECURITY: 'security',
  EXPORT: 'data_export',
  CONFIG: 'configuration',
};

// Actions requiring mandatory audit
const MANDATORY_AUDIT_ACTIONS = new Set([
  'login', 'logout', 'login_failed',
  'password_changed', 'password_reset_requested', 'password_reset_completed',
  'mfa_enabled', 'mfa_disabled', 'mfa_failed',
  'role_changed', 'permissions_changed',
  'employee_created', 'employee_deleted', 'employee_terminated',
  'payroll_generated', 'payroll_approved', 'payroll_exported',
  'expense_approved', 'expense_rejected', 'bulk_expense_paid',
  'data_exported', 'report_generated',
  'settings_changed', 'sso_configured',
  'api_key_created', 'api_key_revoked',
  'backup_created', 'data_deleted',
]);

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

  // ==================== AUDIT LOGGING ====================

  /**
   * Log data modification (create, update, delete)
   */
  async logDataChange({
    userId,
    organizationId,
    action, // 'create', 'update', 'delete'
    entityType, // 'employee', 'shift', 'expense', etc.
    entityId,
    oldValue = null,
    newValue = null,
    ipAddress,
    userAgent,
  }) {
    // Compute diff for updates
    let changes = null;
    if (action === 'update' && oldValue && newValue) {
      changes = this.computeDiff(oldValue, newValue);
    }

    return this.log({
      userId,
      organizationId,
      action: `${entityType}_${action}d`,
      actionDetails: {
        entityType,
        entityId,
        changes,
        // Don't log full values for privacy - just field names changed
        fieldsChanged: changes ? Object.keys(changes) : null,
      },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Compute diff between old and new values (for audit trail)
   */
  computeDiff(oldValue, newValue) {
    const diff = {};
    const sensitiveFields = ['password', 'password_hash', 'ssn', 'national_insurance', 'bank_account', 'sort_code'];

    for (const key of Object.keys(newValue)) {
      if (oldValue[key] !== newValue[key]) {
        // Mask sensitive fields
        if (sensitiveFields.includes(key.toLowerCase())) {
          diff[key] = { old: '[REDACTED]', new: '[REDACTED]' };
        } else {
          diff[key] = { old: oldValue[key], new: newValue[key] };
        }
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  },

  /**
   * Log role/permission changes (security critical)
   */
  async logRoleChange({
    userId,
    organizationId,
    targetUserId,
    oldRole,
    newRole,
    ipAddress,
    userAgent,
  }) {
    return this.log({
      userId,
      organizationId,
      action: 'role_changed',
      actionDetails: {
        targetUserId,
        oldRole,
        newRole,
        severity: 'high',
      },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log financial operations (SOC 2 compliance)
   */
  async logFinancialOperation({
    userId,
    organizationId,
    action, // 'payroll_generated', 'expense_approved', 'payment_processed'
    amount,
    currency,
    affectedEmployees,
    referenceId,
    ipAddress,
    userAgent,
  }) {
    return this.log({
      userId,
      organizationId,
      action,
      actionDetails: {
        category: AUDIT_CATEGORIES.FINANCE,
        amount,
        currency,
        affectedEmployeeCount: affectedEmployees?.length || 0,
        referenceId,
        severity: 'high',
      },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log data export (GDPR compliance)
   */
  async logDataExport({
    userId,
    organizationId,
    exportType, // 'employees', 'payroll', 'timesheet', 'report'
    recordCount,
    format, // 'csv', 'pdf', 'excel'
    filters,
    ipAddress,
    userAgent,
  }) {
    return this.log({
      userId,
      organizationId,
      action: 'data_exported',
      actionDetails: {
        category: AUDIT_CATEGORIES.EXPORT,
        exportType,
        recordCount,
        format,
        filters: filters ? JSON.stringify(filters) : null,
        severity: 'medium',
      },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log configuration changes
   */
  async logConfigChange({
    userId,
    organizationId,
    configType, // 'org_settings', 'billing', 'integrations', 'sso'
    changes,
    ipAddress,
    userAgent,
  }) {
    return this.log({
      userId,
      organizationId,
      action: 'settings_changed',
      actionDetails: {
        category: AUDIT_CATEGORIES.CONFIG,
        configType,
        // Only log field names, not values (may contain secrets)
        fieldsChanged: changes ? Object.keys(changes) : [],
        severity: 'medium',
      },
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log sensitive data access (for GDPR Subject Access Requests)
   */
  async logSensitiveAccess({
    userId,
    organizationId,
    accessType, // 'view', 'download', 'export'
    dataType, // 'employee_pii', 'payroll_data', 'medical_info'
    targetEmployeeId,
    ipAddress,
    userAgent,
  }) {
    return this.log({
      userId,
      organizationId,
      action: 'sensitive_data_accessed',
      actionDetails: {
        category: AUDIT_CATEGORIES.DATA,
        accessType,
        dataType,
        targetEmployeeId,
        severity: 'high',
      },
      ipAddress,
      userAgent,
    });
  },

  // ==================== AUDIT REPORTING ====================

  /**
   * Get audit log for compliance reporting
   */
  async getAuditLog({
    organizationId,
    startDate,
    endDate,
    actions = null, // filter by specific actions
    userId = null, // filter by specific user
    category = null, // filter by category
    limit = 100,
    offset = 0,
  }) {
    let query = `
      SELECT ual.*, u.email, u.first_name, u.last_name
      FROM user_activity_log ual
      LEFT JOIN users u ON u.id = ual.user_id
      WHERE ual.organization_id = $1
    `;
    const params = [organizationId];

    if (startDate) {
      query += ` AND ual.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND ual.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    if (actions && actions.length > 0) {
      query += ` AND ual.action = ANY($${params.length + 1})`;
      params.push(actions);
    }

    if (userId) {
      query += ` AND ual.user_id = $${params.length + 1}`;
      params.push(userId);
    }

    if (category) {
      query += ` AND ual.action_details->>'category' = $${params.length + 1}`;
      params.push(category);
    }

    // Count total
    const countQuery = query.replace('SELECT ual.*, u.email, u.first_name, u.last_name', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY ual.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return {
      logs: result.rows,
      total,
      limit,
      offset,
    };
  },

  /**
   * Get security events summary for dashboard
   */
  async getSecuritySummary(organizationId, days = 7) {
    const result = await db.query(`
      SELECT
        action,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE success = false) as failed_count,
        MAX(created_at) as last_occurrence
      FROM user_activity_log
      WHERE organization_id = $1
        AND created_at > NOW() - INTERVAL '1 day' * $2
        AND action IN ('login', 'login_failed', 'password_changed', 'mfa_enabled', 'mfa_disabled', 'role_changed')
      GROUP BY action
      ORDER BY count DESC
    `, [organizationId, days]);

    return result.rows;
  },

  /**
   * Get all activity for a specific employee (GDPR SAR support)
   */
  async getEmployeeActivityReport(employeeUserId, organizationId) {
    const result = await db.query(`
      SELECT
        action,
        action_details,
        ip_address,
        created_at
      FROM user_activity_log
      WHERE user_id = $1 AND organization_id = $2
      ORDER BY created_at DESC
    `, [employeeUserId, organizationId]);

    return result.rows;
  },

  /**
   * Check if action requires audit (for middleware)
   */
  requiresAudit(action) {
    return MANDATORY_AUDIT_ACTIONS.has(action);
  },

  AUDIT_CATEGORIES,
  MANDATORY_AUDIT_ACTIONS,
};

export default activityLog;
