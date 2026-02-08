// ============================================================
// USER MANAGEMENT ROUTES
// Account status, sessions, invitations, GDPR
// ============================================================

import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import { authService } from '../services/auth.js';
import { emailService } from '../services/email.js';
import { activityLog } from '../services/activity.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// USER LISTING & DETAILS (Admin)
// ============================================================

// GET /api/users - List users in organization
router.get('/', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, email, first_name, last_name, role, status, avatar_url,
        email_verified, mfa_enabled, last_login_at, locked_until,
        force_password_change, invited_at, invited_by, created_at,
        deactivated_at, deactivation_reason
      FROM users 
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;

    if (status) {
      // Handle 'locked' as a virtual status
      if (status === 'locked') {
        query += ` AND locked_until > NOW()`;
      } else {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    }

    if (search) {
      query += ` AND (
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count total
    const countResult = await db.query(
      query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Add computed locked status
    const users = result.rows.map(user => ({
      ...user,
      isLocked: user.locked_until && new Date(user.locked_until) > new Date(),
    }));

    res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// GET /api/users/:id - Get user details
router.get('/:id', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id, email, first_name, last_name, role, status, avatar_url, phone,
        email_verified, mfa_enabled, last_login_at, last_login_ip, last_login_device,
        locked_until, locked_reason, force_password_change, 
        invited_at, invited_by, created_at, updated_at,
        deactivated_at, deactivated_by, deactivation_reason,
        password_changed_at
      FROM users 
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    user.isLocked = user.locked_until && new Date(user.locked_until) > new Date();

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============================================================
// ACCOUNT STATUS MANAGEMENT (Admin)
// ============================================================

// POST /api/users/:id/unlock - Unlock a locked account
router.post('/:id/unlock', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users 
       SET locked_until = NULL, failed_login_attempts = 0, locked_reason = NULL, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id, email, first_name, last_name`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await activityLog.log({
      userId: req.params.id,
      organizationId: req.user.organizationId,
      action: 'account_unlocked',
      actionDetails: { unlockedBy: req.user.userId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Unlock user error:', error);
    res.status(500).json({ error: 'Failed to unlock user' });
  }
});

// POST /api/users/:id/deactivate - Deactivate a user
router.post('/:id/deactivate', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { reason } = req.body;

    // Can't deactivate yourself
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const result = await db.query(
      `UPDATE users 
       SET status = 'inactive', 
           deactivated_at = NOW(), 
           deactivated_by = $3,
           deactivation_reason = $4,
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id, email, first_name, last_name`,
      [req.params.id, req.user.organizationId, req.user.userId, reason]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Revoke all sessions
    await db.query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.params.id]
    );

    // Revoke all refresh tokens
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.params.id]
    );

    await activityLog.log({
      userId: req.params.id,
      organizationId: req.user.organizationId,
      action: 'account_deactivated',
      actionDetails: { deactivatedBy: req.user.userId, reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// POST /api/users/:id/reactivate - Reactivate a user
router.post('/:id/reactivate', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users 
       SET status = 'active', 
           deactivated_at = NULL, 
           deactivated_by = NULL,
           deactivation_reason = NULL,
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id, email, first_name, last_name`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await activityLog.log({
      userId: req.params.id,
      organizationId: req.user.organizationId,
      action: 'account_reactivated',
      actionDetails: { reactivatedBy: req.user.userId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

// PATCH /api/users/:id/role - Change user role
router.patch('/:id/role', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['worker', 'manager', 'admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Can't change your own role
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Only superadmin can create admins
    if (role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can assign admin role' });
    }

    const result = await db.query(
      `UPDATE users 
       SET role = $3, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id, email, first_name, last_name, role`,
      [req.params.id, req.user.organizationId, role]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await activityLog.log({
      userId: req.params.id,
      organizationId: req.user.organizationId,
      action: 'role_changed',
      actionDetails: { changedBy: req.user.userId, newRole: role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Failed to change role' });
  }
});

// POST /api/users/:id/force-password-reset - Require password change on next login
router.post('/:id/force-password-reset', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users 
       SET force_password_change = true, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id, email, first_name, last_name`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send notification email
    await emailService.sendPasswordResetRequired(result.rows[0]);

    await activityLog.log({
      userId: req.params.id,
      organizationId: req.user.organizationId,
      action: 'force_password_reset',
      actionDetails: { forcedBy: req.user.userId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Force password reset error:', error);
    res.status(500).json({ error: 'Failed to force password reset' });
  }
});

// ============================================================
// INVITATION MANAGEMENT (Admin)
// ============================================================

// POST /api/users/:id/resend-invitation - Resend invitation email
router.post('/:id/resend-invitation', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    // Check user is in invited status
    const userResult = await db.query(
      `SELECT id, email, first_name, last_name, status, invitation_token
       FROM users 
       WHERE id = $1 AND organization_id = $2 AND status = 'invited' AND deleted_at IS NULL`,
      [req.params.id, req.user.organizationId]
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'Invited user not found' });
    }

    const user = userResult.rows[0];

    // Generate new invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      `UPDATE users 
       SET invitation_token = $3, invitation_expires = $4, invited_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId, invitationToken, invitationExpires]
    );

    // Send invitation email
    await emailService.sendInvitation({
      ...user,
      invitationToken,
      invitedBy: req.user,
    });

    await activityLog.log({
      userId: req.params.id,
      organizationId: req.user.organizationId,
      action: 'invitation_resent',
      actionDetails: { resentBy: req.user.userId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

// POST /api/users/:id/cancel-invitation - Cancel pending invitation
router.post('/:id/cancel-invitation', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM users 
       WHERE id = $1 AND organization_id = $2 AND status = 'invited'
       RETURNING id, email`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Invited user not found' });
    }

    await activityLog.log({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'invitation_cancelled',
      actionDetails: { cancelledUser: result.rows[0].email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

// ============================================================
// SESSION MANAGEMENT (Admin + Self)
// ============================================================

// GET /api/users/:id/sessions - Get user's active sessions
router.get('/:id/sessions', async (req, res) => {
  try {
    // Users can view their own sessions, admins can view any user's
    if (req.params.id !== req.user.userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify user belongs to same org
    if (req.params.id !== req.user.userId) {
      const userCheck = await db.query(
        'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
        [req.params.id, req.user.organizationId]
      );
      if (!userCheck.rows[0]) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    const result = await db.query(
      `SELECT 
        id, device_name, device_type, browser, os, ip_address, location,
        is_current, last_active_at, created_at
       FROM user_sessions 
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY last_active_at DESC`,
      [req.params.id]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// DELETE /api/users/:id/sessions/:sessionId - Revoke specific session
router.delete('/:id/sessions/:sessionId', async (req, res) => {
  try {
    // Users can revoke their own sessions, admins can revoke any user's
    if (req.params.id !== req.user.userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `UPDATE user_sessions 
       SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
       RETURNING id, refresh_token_id`,
      [req.params.sessionId, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Also revoke associated refresh token
    if (result.rows[0].refresh_token_id) {
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
        [result.rows[0].refresh_token_id]
      );
    }

    await activityLog.log({
      userId: req.params.id,
      organizationId: req.user.organizationId,
      action: 'session_revoked',
      actionDetails: { sessionId: req.params.sessionId, revokedBy: req.user.userId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// POST /api/users/:id/sessions/revoke-all - Revoke all sessions
router.post('/:id/sessions/revoke-all', async (req, res) => {
  try {
    const { exceptCurrent } = req.body;

    // Users can revoke their own sessions, admins can revoke any user's
    if (req.params.id !== req.user.userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      UPDATE user_sessions 
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `;
    const params = [req.params.id];

    if (exceptCurrent) {
      query += ` AND is_current = false`;
    }

    query += ` RETURNING refresh_token_id`;

    const result = await db.query(query, params);

    // Revoke associated refresh tokens
    const tokenIds = result.rows.map(r => r.refresh_token_id).filter(Boolean);
    if (tokenIds.length > 0) {
      await db.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ANY($1)`,
        [tokenIds]
      );
    }

    await activityLog.log({
      userId: req.params.id,
      organizationId: req.user.organizationId,
      action: 'all_sessions_revoked',
      actionDetails: { revokedBy: req.user.userId, count: result.rowCount, exceptCurrent },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, revokedCount: result.rowCount });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// ============================================================
// ACTIVITY LOG (Admin)
// ============================================================

// GET /api/users/:id/activity - Get user's activity log
router.get('/:id/activity', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT 
        id, action, action_details, ip_address, success, failure_reason, created_at
       FROM user_activity_log 
       WHERE user_id = $1 AND organization_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.params.id, req.user.organizationId, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM user_activity_log WHERE user_id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );

    res.json({
      activities: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// ============================================================
// SELF-SERVICE (Current User)
// ============================================================

// GET /api/users/me/sessions - Get my sessions
router.get('/me/sessions', async (req, res) => {
  req.params.id = req.user.userId;
  return router.handle(req, res);
});

// POST /api/users/me/sessions/revoke-others - Sign out other devices
router.post('/me/sessions/revoke-others', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE user_sessions 
       SET revoked_at = NOW()
       WHERE user_id = $1 AND is_current = false AND revoked_at IS NULL
       RETURNING refresh_token_id`,
      [req.user.userId]
    );

    // Revoke associated refresh tokens
    const tokenIds = result.rows.map(r => r.refresh_token_id).filter(Boolean);
    if (tokenIds.length > 0) {
      await db.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ANY($1)`,
        [tokenIds]
      );
    }

    await activityLog.log({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'other_sessions_revoked',
      actionDetails: { count: result.rowCount },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, revokedCount: result.rowCount });
  } catch (error) {
    console.error('Revoke other sessions error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// ============================================================
// GDPR - DATA EXPORT & DELETION
// ============================================================

// GET /api/users/me/data-export - Download all my data
router.get('/me/data-export', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Gather all user data
    const userData = await db.query(
      `SELECT 
        id, email, first_name, last_name, phone, avatar_url,
        role, status, email_verified, mfa_enabled,
        last_login_at, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    const activityData = await db.query(
      `SELECT action, action_details, ip_address, created_at
       FROM user_activity_log WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1000`,
      [userId]
    );

    const sessionData = await db.query(
      `SELECT device_name, device_type, browser, os, ip_address, location, created_at
       FROM user_sessions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 100`,
      [userId]
    );

    // Get employee data if linked
    let employeeData = null;
    if (userData.rows[0]) {
      const empResult = await db.query(
        `SELECT * FROM employees WHERE id = (
          SELECT employee_id FROM users WHERE id = $1
        )`,
        [userId]
      );
      employeeData = empResult.rows[0] || null;
    }

    // Get time entries
    const timeEntries = await db.query(
      `SELECT * FROM time_entries WHERE employee_id = (
        SELECT employee_id FROM users WHERE id = $1
      ) ORDER BY clock_in DESC LIMIT 1000`,
      [userId]
    );

    // Get shifts
    const shifts = await db.query(
      `SELECT * FROM shifts WHERE employee_id = (
        SELECT employee_id FROM users WHERE id = $1
      ) ORDER BY date DESC LIMIT 500`,
      [userId]
    );

    const exportData = {
      exportDate: new Date().toISOString(),
      user: userData.rows[0],
      employee: employeeData,
      activityLog: activityData.rows,
      sessions: sessionData.rows,
      timeEntries: timeEntries.rows,
      shifts: shifts.rows,
    };

    await activityLog.log({
      userId,
      organizationId: req.user.organizationId,
      action: 'data_exported',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="uplift-data-export-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /api/users/me/request-deletion - Request account deletion
router.post('/me/request-deletion', async (req, res) => {
  try {
    const { password, reason } = req.body;

    // Verify password
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bcrypt = await import('bcryptjs');
    const validPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Mark for deletion (30 day grace period)
    await db.query(
      `UPDATE users 
       SET deletion_requested_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [req.user.userId]
    );

    // Send confirmation email
    await emailService.sendDeletionRequested(req.user);

    await activityLog.log({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'deletion_requested',
      actionDetails: { reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ 
      success: true, 
      message: 'Deletion requested. Your account will be permanently deleted in 30 days unless you cancel.',
    });
  } catch (error) {
    console.error('Request deletion error:', error);
    res.status(500).json({ error: 'Failed to request deletion' });
  }
});

// POST /api/users/me/cancel-deletion - Cancel deletion request
router.post('/me/cancel-deletion', async (req, res) => {
  try {
    await db.query(
      `UPDATE users 
       SET deletion_requested_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.user.userId]
    );

    await activityLog.log({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: 'deletion_cancelled',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel deletion error:', error);
    res.status(500).json({ error: 'Failed to cancel deletion' });
  }
});

export default router;
