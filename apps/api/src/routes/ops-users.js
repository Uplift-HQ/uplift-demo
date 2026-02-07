// ============================================================
// OPS USER MANAGEMENT ROUTES
// User CRUD, roles, sessions, MFA, audit logging
// ============================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { db } from '../lib/database.js';

const router = Router();

// ==================== CONSTANTS ====================

const SESSION_DURATION_HOURS = 8;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const PASSWORD_MIN_LENGTH = 12;

// ==================== HELPER FUNCTIONS ====================

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseUserAgent(ua) {
  if (!ua) return { device: 'unknown', browser: 'unknown', os: 'unknown' };

  let device = 'desktop';
  if (/mobile/i.test(ua)) device = 'mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'tablet';

  let browser = 'unknown';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';

  let os = 'unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua) && !/android/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain a special character' };
  }
  return { valid: true };
}

async function logAudit(params) {
  const {
    userId, userEmail, action, category, severity = 'info',
    entityType, entityId, entityName, description,
    previousValue, newValue, metadata,
    ipAddress, userAgent, sessionId, success = true, errorMessage
  } = params;

  await db.query(`
    INSERT INTO ops_audit_log (
      ops_user_id, ops_user_email, action, category, severity,
      entity_type, entity_id, entity_name, description,
      previous_value, new_value, metadata,
      ip_address, user_agent, session_id, success, error_message
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
  `, [
    userId, userEmail, action, category, severity,
    entityType, entityId, entityName, description,
    previousValue ? JSON.stringify(previousValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    metadata ? JSON.stringify(metadata) : null,
    ipAddress, userAgent?.substring(0, 500), sessionId, success, errorMessage
  ]);
}

// ==================== AUTH MIDDLEWARE ====================

const opsAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.OPS_JWT_SECRET || process.env.JWT_SECRET);

    // Check session if using session-based auth
    if (decoded.sessionId) {
      const session = await db.query(`
        SELECT s.*, u.*, r.name as role_name,
               r.can_manage_users, r.can_view_customers, r.can_edit_customers,
               r.can_manage_licenses, r.can_manage_billing, r.can_view_billing,
               r.can_manage_features, r.can_view_audit_log, r.can_onboard_customers,
               r.can_cancel_customers, r.can_view_activity
        FROM ops_sessions s
        JOIN ops_users u ON s.ops_user_id = u.id
        LEFT JOIN ops_roles r ON u.role_id = r.id
        WHERE s.id = $1 AND s.is_active = true AND s.expires_at > NOW()
      `, [decoded.sessionId]);

      if (!session.rows[0]) {
        return res.status(401).json({ error: 'Session expired' });
      }

      // Update last activity
      await db.query(`
        UPDATE ops_sessions SET last_activity_at = NOW() WHERE id = $1
      `, [decoded.sessionId]);

      req.opsUser = session.rows[0];
      req.sessionId = decoded.sessionId;
    } else {
      // Fallback to direct user lookup (backwards compat)
      const result = await db.query(`
        SELECT u.*, r.name as role_name,
               r.can_manage_users, r.can_view_customers, r.can_edit_customers,
               r.can_manage_licenses, r.can_manage_billing, r.can_view_billing,
               r.can_manage_features, r.can_view_audit_log, r.can_onboard_customers,
               r.can_cancel_customers, r.can_view_activity
        FROM ops_users u
        LEFT JOIN ops_roles r ON u.role_id = r.id
        WHERE u.id = $1 AND u.is_active = true
      `, [decoded.userId]);

      if (!result.rows[0]) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.opsUser = result.rows[0];
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Permission check middleware
const requirePermission = (permission) => (req, res, next) => {
  if (!req.opsUser[permission]) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// ==================== AUTHENTICATION ====================

/**
 * POST /api/ops/users/auth/login - Enhanced login with sessions
 */
router.post('/auth/login', async (req, res) => {
  const { email, password, mfaCode } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    // Find user
    const userResult = await db.query(`
      SELECT u.*, r.name as role_name, r.display_name as role_display_name,
             r.can_manage_users, r.can_view_customers, r.can_edit_customers,
             r.can_manage_licenses, r.can_manage_billing, r.can_view_billing,
             r.can_manage_features, r.can_view_audit_log, r.can_onboard_customers,
             r.can_cancel_customers, r.can_view_activity
      FROM ops_users u
      LEFT JOIN ops_roles r ON u.role_id = r.id
      WHERE u.email = $1
    `, [email?.toLowerCase()]);

    const user = userResult.rows[0];

    if (!user) {
      await logAudit({
        userEmail: email, action: 'auth.login_failed', category: 'authentication',
        severity: 'warning', description: 'User not found',
        ipAddress, userAgent, success: false, errorMessage: 'User not found'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      await logAudit({
        userId: user.id, userEmail: user.email, action: 'auth.login_blocked',
        category: 'authentication', severity: 'warning',
        description: `Account locked for ${remainingMinutes} more minutes`,
        ipAddress, userAgent, success: false, errorMessage: 'Account locked'
      });
      return res.status(423).json({
        error: `Account locked. Try again in ${remainingMinutes} minutes.`,
        lockedUntil: user.locked_until
      });
    }

    // Check if active
    if (!user.is_active) {
      await logAudit({
        userId: user.id, userEmail: user.email, action: 'auth.login_failed',
        category: 'authentication', severity: 'warning',
        description: 'Inactive account login attempt',
        ipAddress, userAgent, success: false, errorMessage: 'Account inactive'
      });
      return res.status(401).json({ error: 'Account disabled' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      let lockUntil = null;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      }

      await db.query(`
        UPDATE ops_users SET
          failed_login_attempts = $1,
          locked_until = $2
        WHERE id = $3
      `, [newAttempts, lockUntil, user.id]);

      await logAudit({
        userId: user.id, userEmail: user.email, action: 'auth.login_failed',
        category: 'authentication', severity: lockUntil ? 'critical' : 'warning',
        description: lockUntil ? `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts` : 'Invalid password',
        metadata: { attempts: newAttempts },
        ipAddress, userAgent, success: false, errorMessage: 'Invalid password'
      });

      if (lockUntil) {
        return res.status(423).json({
          error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
          lockedUntil: lockUntil
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials',
        remainingAttempts: MAX_FAILED_ATTEMPTS - newAttempts
      });
    }

    // Check MFA if enabled
    if (user.mfa_enabled) {
      if (!mfaCode) {
        return res.json({
          requiresMfa: true,
          message: 'MFA code required'
        });
      }

      const validMfa = authenticator.verify({
        token: mfaCode,
        secret: user.mfa_secret
      });

      if (!validMfa) {
        // Check backup codes
        let backupUsed = false;
        if (user.mfa_backup_codes?.length > 0) {
          const codeIndex = user.mfa_backup_codes.indexOf(mfaCode);
          if (codeIndex !== -1) {
            // Remove used backup code
            const newCodes = [...user.mfa_backup_codes];
            newCodes.splice(codeIndex, 1);
            await db.query(`
              UPDATE ops_users SET mfa_backup_codes = $1 WHERE id = $2
            `, [newCodes, user.id]);
            backupUsed = true;
          }
        }

        if (!backupUsed) {
          await logAudit({
            userId: user.id, userEmail: user.email, action: 'auth.mfa_failed',
            category: 'authentication', severity: 'warning',
            description: 'Invalid MFA code',
            ipAddress, userAgent, success: false, errorMessage: 'Invalid MFA code'
          });
          return res.status(401).json({ error: 'Invalid MFA code' });
        }
      }
    }

    // Success! Create session
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
    const { device, browser, os } = parseUserAgent(userAgent);

    const sessionResult = await db.query(`
      INSERT INTO ops_sessions (
        ops_user_id, token_hash, ip_address, user_agent,
        device_type, browser, os, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [user.id, tokenHash, ipAddress, userAgent?.substring(0, 500), device, browser, os, expiresAt]);

    const sessionId = sessionResult.rows[0].id;

    // Reset failed attempts and update login info
    await db.query(`
      UPDATE ops_users SET
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW(),
        last_login_ip = $1
      WHERE id = $2
    `, [ipAddress, user.id]);

    // Create JWT with session reference
    const token = jwt.sign(
      { userId: user.id, sessionId, role: user.role_name },
      process.env.OPS_JWT_SECRET || process.env.JWT_SECRET,
      { expiresIn: `${SESSION_DURATION_HOURS}h` }
    );

    await logAudit({
      userId: user.id, userEmail: user.email, action: 'auth.login_success',
      category: 'authentication', severity: 'info',
      description: 'User logged in successfully',
      metadata: { device, browser, os },
      ipAddress, userAgent, sessionId, success: true
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name || user.role,
        roleDisplayName: user.role_display_name,
        mfaEnabled: user.mfa_enabled,
        forcePasswordChange: user.force_password_change,
        permissions: {
          canManageUsers: user.can_manage_users,
          canViewCustomers: user.can_view_customers,
          canEditCustomers: user.can_edit_customers,
          canManageLicenses: user.can_manage_licenses,
          canManageBilling: user.can_manage_billing,
          canViewBilling: user.can_view_billing,
          canManageFeatures: user.can_manage_features,
          canViewAuditLog: user.can_view_audit_log,
          canOnboardCustomers: user.can_onboard_customers,
          canCancelCustomers: user.can_cancel_customers,
          canViewActivity: user.can_view_activity,
        }
      },
      expiresAt,
    });
  } catch (error) {
    console.error('Login error:', error);
    await logAudit({
      userEmail: email, action: 'auth.login_error', category: 'authentication',
      severity: 'critical', description: 'Login system error',
      ipAddress, userAgent, success: false, errorMessage: error.message
    });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/ops/users/auth/logout - Logout and terminate session
 */
router.post('/auth/logout', opsAuth, async (req, res) => {
  try {
    if (req.sessionId) {
      await db.query(`
        UPDATE ops_sessions SET
          is_active = false,
          terminated_at = NOW(),
          termination_reason = 'logout'
        WHERE id = $1
      `, [req.sessionId]);
    }

    await logAudit({
      userId: req.opsUser.id, userEmail: req.opsUser.email,
      action: 'auth.logout', category: 'authentication', severity: 'info',
      description: 'User logged out',
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/ops/users/auth/me - Get current user with permissions
 */
router.get('/auth/me', opsAuth, async (req, res) => {
  const user = req.opsUser;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role_name || user.role,
      roleDisplayName: user.role_display_name,
      mfaEnabled: user.mfa_enabled,
      forcePasswordChange: user.force_password_change,
      lastLoginAt: user.last_login_at,
      permissions: {
        canManageUsers: user.can_manage_users,
        canViewCustomers: user.can_view_customers,
        canEditCustomers: user.can_edit_customers,
        canManageLicenses: user.can_manage_licenses,
        canManageBilling: user.can_manage_billing,
        canViewBilling: user.can_view_billing,
        canManageFeatures: user.can_manage_features,
        canViewAuditLog: user.can_view_audit_log,
        canOnboardCustomers: user.can_onboard_customers,
        canCancelCustomers: user.can_cancel_customers,
        canViewActivity: user.can_view_activity,
      }
    },
  });
});

// Apply auth to all routes below
router.use(opsAuth);

// ==================== PASSWORD MANAGEMENT ====================

/**
 * POST /api/ops/users/auth/change-password - Change own password
 */
router.post('/auth/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.opsUser;

    // Verify current password
    const validCurrent = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validCurrent) {
      await logAudit({
        userId: user.id, userEmail: user.email, action: 'user.password_change_failed',
        category: 'user_management', severity: 'warning',
        description: 'Current password incorrect',
        ipAddress: req.ip, userAgent: req.headers['user-agent'],
        sessionId: req.sessionId, success: false
      });
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check password history (last 5 passwords)
    const historyResult = await db.query(`
      SELECT password_hash FROM ops_password_history
      WHERE ops_user_id = $1
      ORDER BY created_at DESC LIMIT 5
    `, [user.id]);

    for (const row of historyResult.rows) {
      if (await bcrypt.compare(newPassword, row.password_hash)) {
        return res.status(400).json({ error: 'Cannot reuse recent passwords' });
      }
    }

    // Hash and update
    const newHash = await bcrypt.hash(newPassword, 10);

    await db.query(`
      UPDATE ops_users SET
        password_hash = $1,
        password_changed_at = NOW(),
        force_password_change = false
      WHERE id = $2
    `, [newHash, user.id]);

    // Add to history
    await db.query(`
      INSERT INTO ops_password_history (ops_user_id, password_hash)
      VALUES ($1, $2)
    `, [user.id, user.password_hash]);

    // Terminate all other sessions
    await db.query(`
      UPDATE ops_sessions SET
        is_active = false,
        terminated_at = NOW(),
        termination_reason = 'password_change'
      WHERE ops_user_id = $1 AND id != $2
    `, [user.id, req.sessionId]);

    await logAudit({
      userId: user.id, userEmail: user.email, action: 'user.password_changed',
      category: 'user_management', severity: 'info',
      description: 'Password changed successfully',
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ==================== MFA MANAGEMENT ====================

/**
 * POST /api/ops/users/mfa/setup - Start MFA setup
 */
router.post('/mfa/setup', async (req, res) => {
  try {
    const user = req.opsUser;

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate QR code
    const otpauthUrl = authenticator.keyuri(user.email, 'Uplift Ops', secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store secret temporarily (not verified yet)
    await db.query(`
      UPDATE ops_users SET mfa_secret = $1, mfa_backup_codes = $2
      WHERE id = $3
    `, [secret, backupCodes, user.id]);

    res.json({
      secret,
      qrCode,
      backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code'
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

/**
 * POST /api/ops/users/mfa/verify - Verify and enable MFA
 */
router.post('/mfa/verify', async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.opsUser;

    if (!user.mfa_secret) {
      return res.status(400).json({ error: 'MFA not set up. Call /mfa/setup first.' });
    }

    const valid = authenticator.verify({ token: code, secret: user.mfa_secret });
    if (!valid) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    await db.query(`
      UPDATE ops_users SET mfa_enabled = true, mfa_verified_at = NOW()
      WHERE id = $1
    `, [user.id]);

    await logAudit({
      userId: user.id, userEmail: user.email, action: 'user.mfa_enabled',
      category: 'user_management', severity: 'info',
      description: 'MFA enabled successfully',
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ success: true, message: 'MFA enabled successfully' });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

/**
 * DELETE /api/ops/users/mfa - Disable MFA
 */
router.delete('/mfa', async (req, res) => {
  try {
    const { password } = req.body;
    const user = req.opsUser;

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    await db.query(`
      UPDATE ops_users SET
        mfa_enabled = false,
        mfa_secret = NULL,
        mfa_backup_codes = NULL,
        mfa_verified_at = NULL
      WHERE id = $1
    `, [user.id]);

    await logAudit({
      userId: user.id, userEmail: user.email, action: 'user.mfa_disabled',
      category: 'user_management', severity: 'warning',
      description: 'MFA disabled',
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ success: true, message: 'MFA disabled' });
  } catch (error) {
    console.error('Disable MFA error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

// ==================== SESSION MANAGEMENT ====================

/**
 * GET /api/ops/users/sessions - Get current user's active sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, ip_address, device_type, browser, os,
             last_activity_at, created_at, expires_at
      FROM ops_sessions
      WHERE ops_user_id = $1 AND is_active = true AND expires_at > NOW()
      ORDER BY last_activity_at DESC
    `, [req.opsUser.id]);

    res.json({
      sessions: result.rows,
      currentSession: req.sessionId
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * DELETE /api/ops/users/sessions/:id - Terminate a session
 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE ops_sessions SET
        is_active = false,
        terminated_at = NOW(),
        terminated_by = $1,
        termination_reason = 'forced'
      WHERE id = $2 AND ops_user_id = $3
      RETURNING id
    `, [req.opsUser.id, req.params.id, req.opsUser.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await logAudit({
      userId: req.opsUser.id, userEmail: req.opsUser.email,
      action: 'user.session_terminated', category: 'user_management', severity: 'info',
      entityType: 'session', entityId: req.params.id,
      description: 'Session terminated',
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

/**
 * DELETE /api/ops/users/sessions - Terminate all other sessions
 */
router.delete('/sessions', async (req, res) => {
  try {
    await db.query(`
      UPDATE ops_sessions SET
        is_active = false,
        terminated_at = NOW(),
        terminated_by = $1,
        termination_reason = 'forced'
      WHERE ops_user_id = $2 AND id != $3 AND is_active = true
    `, [req.opsUser.id, req.opsUser.id, req.sessionId]);

    await logAudit({
      userId: req.opsUser.id, userEmail: req.opsUser.email,
      action: 'user.sessions_terminated_all', category: 'user_management', severity: 'info',
      description: 'All other sessions terminated',
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Terminate all sessions error:', error);
    res.status(500).json({ error: 'Failed to terminate sessions' });
  }
});

// ==================== USER MANAGEMENT (super_admin only) ====================

/**
 * GET /api/ops/users - List all ops users
 */
router.get('/', requirePermission('can_manage_users'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.role_id,
             r.name as role_name, r.display_name as role_display_name,
             u.is_active, u.mfa_enabled, u.last_login_at,
             u.failed_login_attempts, u.locked_until, u.force_password_change,
             u.created_at, u.updated_at,
             creator.email as created_by_email
      FROM ops_users u
      LEFT JOIN ops_roles r ON u.role_id = r.id
      LEFT JOIN ops_users creator ON u.created_by = creator.id
      ORDER BY u.created_at DESC
    `);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /api/ops/users/roles - List available roles
 */
router.get('/roles', requirePermission('can_manage_users'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM ops_roles ORDER BY name
    `);
    res.json({ roles: result.rows });
  } catch (error) {
    console.error('List roles error:', error);
    res.status(500).json({ error: 'Failed to list roles' });
  }
});

/**
 * POST /api/ops/users - Create new ops user
 */
router.post('/', requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { email, firstName, lastName, roleId, password, sendInvite } = req.body;

    if (!email || !firstName || !lastName || !roleId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check email domain
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (emailDomain !== 'uplifthq.co.uk') {
      return res.status(400).json({ error: 'Email must be @uplifthq.co.uk' });
    }

    // Verify role exists
    const roleCheck = await db.query('SELECT id FROM ops_roles WHERE id = $1', [roleId]);
    if (!roleCheck.rows[0]) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Generate temporary password or use provided
    const tempPassword = password || crypto.randomBytes(16).toString('base64');
    const validation = validatePassword(password || tempPassword);
    if (password && !validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const passwordHash = await bcrypt.hash(password || tempPassword, 10);

    const result = await db.query(`
      INSERT INTO ops_users (
        email, password_hash, first_name, last_name, role, role_id,
        is_active, force_password_change, created_by
      )
      VALUES ($1, $2, $3, $4, 'user', $5, true, $6, $7)
      RETURNING id, email, first_name, last_name, role_id, is_active, created_at
    `, [
      email.toLowerCase(), passwordHash, firstName, lastName, roleId,
      !password, // force password change if no password provided
      req.opsUser.id
    ]);

    const newUser = result.rows[0];

    await logAudit({
      userId: req.opsUser.id, userEmail: req.opsUser.email,
      action: 'user.created', category: 'user_management', severity: 'info',
      entityType: 'ops_user', entityId: newUser.id, entityName: `${firstName} ${lastName}`,
      description: `Created ops user: ${email}`,
      newValue: { email, firstName, lastName, roleId },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    // TODO: Send invite email if sendInvite is true

    res.json({
      user: newUser,
      temporaryPassword: !password ? tempPassword : undefined,
      message: password ? 'User created' : 'User created with temporary password'
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.constraint === 'ops_users_email_key') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PATCH /api/ops/users/:id - Update ops user
 */
router.patch('/:id', requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, roleId, isActive } = req.body;

    // Get current state
    const current = await db.query('SELECT * FROM ops_users WHERE id = $1', [id]);
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deactivating yourself
    if (id === req.opsUser.id && isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    const updates = [];
    const params = [];
    let i = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${i++}`);
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${i++}`);
      params.push(lastName);
    }
    if (roleId !== undefined) {
      updates.push(`role_id = $${i++}`);
      params.push(roleId);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${i++}`);
      params.push(isActive);

      // If deactivating, terminate all sessions
      if (!isActive) {
        await db.query(`
          UPDATE ops_sessions SET
            is_active = false,
            terminated_at = NOW(),
            terminated_by = $1,
            termination_reason = 'forced'
          WHERE ops_user_id = $2 AND is_active = true
        `, [req.opsUser.id, id]);
      }
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${i++}`);
    params.push(req.opsUser.id);
    params.push(id);

    const result = await db.query(`
      UPDATE ops_users SET ${updates.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `, params);

    await logAudit({
      userId: req.opsUser.id, userEmail: req.opsUser.email,
      action: 'user.updated', category: 'user_management', severity: 'info',
      entityType: 'ops_user', entityId: id,
      entityName: `${result.rows[0].first_name} ${result.rows[0].last_name}`,
      description: `Updated ops user: ${result.rows[0].email}`,
      previousValue: { firstName: current.rows[0].first_name, lastName: current.rows[0].last_name, roleId: current.rows[0].role_id, isActive: current.rows[0].is_active },
      newValue: { firstName, lastName, roleId, isActive },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * POST /api/ops/users/:id/reset-password - Reset user password (admin)
 */
router.post('/:id/reset-password', requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await db.query('SELECT * FROM ops_users WHERE id = $1', [id]);
    if (!user.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate temporary password if not provided
    const tempPassword = newPassword || crypto.randomBytes(16).toString('base64');
    if (newPassword) {
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await db.query(`
      UPDATE ops_users SET
        password_hash = $1,
        force_password_change = true,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = NOW(),
        updated_by = $2
      WHERE id = $3
    `, [passwordHash, req.opsUser.id, id]);

    // Terminate all user sessions
    await db.query(`
      UPDATE ops_sessions SET
        is_active = false,
        terminated_at = NOW(),
        terminated_by = $1,
        termination_reason = 'password_change'
      WHERE ops_user_id = $2 AND is_active = true
    `, [req.opsUser.id, id]);

    await logAudit({
      userId: req.opsUser.id, userEmail: req.opsUser.email,
      action: 'user.password_reset', category: 'user_management', severity: 'warning',
      entityType: 'ops_user', entityId: id,
      entityName: `${user.rows[0].first_name} ${user.rows[0].last_name}`,
      description: `Password reset for: ${user.rows[0].email}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({
      success: true,
      temporaryPassword: !newPassword ? tempPassword : undefined,
      message: 'Password reset. User must change password on next login.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * POST /api/ops/users/:id/unlock - Unlock user account
 */
router.post('/:id/unlock', requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.query('SELECT * FROM ops_users WHERE id = $1', [id]);
    if (!user.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query(`
      UPDATE ops_users SET
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = NOW(),
        updated_by = $1
      WHERE id = $2
    `, [req.opsUser.id, id]);

    await logAudit({
      userId: req.opsUser.id, userEmail: req.opsUser.email,
      action: 'user.unlocked', category: 'user_management', severity: 'info',
      entityType: 'ops_user', entityId: id,
      entityName: `${user.rows[0].first_name} ${user.rows[0].last_name}`,
      description: `Unlocked account: ${user.rows[0].email}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Unlock user error:', error);
    res.status(500).json({ error: 'Failed to unlock user' });
  }
});

/**
 * POST /api/ops/users/:id/disable-mfa - Disable MFA for user (admin)
 */
router.post('/:id/disable-mfa', requirePermission('can_manage_users'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.query('SELECT * FROM ops_users WHERE id = $1', [id]);
    if (!user.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query(`
      UPDATE ops_users SET
        mfa_enabled = false,
        mfa_secret = NULL,
        mfa_backup_codes = NULL,
        mfa_verified_at = NULL,
        updated_at = NOW(),
        updated_by = $1
      WHERE id = $2
    `, [req.opsUser.id, id]);

    await logAudit({
      userId: req.opsUser.id, userEmail: req.opsUser.email,
      action: 'user.mfa_disabled_admin', category: 'user_management', severity: 'warning',
      entityType: 'ops_user', entityId: id,
      entityName: `${user.rows[0].first_name} ${user.rows[0].last_name}`,
      description: `MFA disabled by admin for: ${user.rows[0].email}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
      sessionId: req.sessionId, success: true
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Disable MFA error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

// ==================== AUDIT LOG ====================

/**
 * GET /api/ops/users/audit - Get audit log
 */
router.get('/audit', requirePermission('can_view_audit_log'), async (req, res) => {
  try {
    const {
      category, action, userId, severity,
      startDate, endDate,
      limit = 100, offset = 0
    } = req.query;

    let query = `
      SELECT a.*,
             u.first_name || ' ' || u.last_name as user_name
      FROM ops_audit_log a
      LEFT JOIN ops_users u ON a.ops_user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (category) {
      query += ` AND a.category = $${i++}`;
      params.push(category);
    }
    if (action) {
      query += ` AND a.action ILIKE $${i++}`;
      params.push(`%${action}%`);
    }
    if (userId) {
      query += ` AND a.ops_user_id = $${i++}`;
      params.push(userId);
    }
    if (severity) {
      query += ` AND a.severity = $${i++}`;
      params.push(severity);
    }
    if (startDate) {
      query += ` AND a.created_at >= $${i++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.created_at <= $${i++}`;
      params.push(endDate);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM ops_audit_log a WHERE 1=1`;
    const countParams = [];
    let j = 1;

    if (category) {
      countQuery += ` AND a.category = $${j++}`;
      countParams.push(category);
    }
    if (action) {
      countQuery += ` AND a.action ILIKE $${j++}`;
      countParams.push(`%${action}%`);
    }
    if (userId) {
      countQuery += ` AND a.ops_user_id = $${j++}`;
      countParams.push(userId);
    }
    if (severity) {
      countQuery += ` AND a.severity = $${j++}`;
      countParams.push(severity);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      audit: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

/**
 * GET /api/ops/users/audit/stats - Get audit log statistics
 */
router.get('/audit/stats', requirePermission('can_view_audit_log'), async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Events by category
    const byCategory = await db.query(`
      SELECT category, COUNT(*) as count
      FROM ops_audit_log
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY category
      ORDER BY count DESC
    `, [days]);

    // Events by severity
    const bySeverity = await db.query(`
      SELECT severity, COUNT(*) as count
      FROM ops_audit_log
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY severity
    `, [days]);

    // Failed events
    const failed = await db.query(`
      SELECT action, COUNT(*) as count
      FROM ops_audit_log
      WHERE created_at > NOW() - INTERVAL '1 day' * $1 AND success = false
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `, [days]);

    // Most active users
    const activeUsers = await db.query(`
      SELECT a.ops_user_id, u.email, u.first_name, u.last_name, COUNT(*) as count
      FROM ops_audit_log a
      JOIN ops_users u ON a.ops_user_id = u.id
      WHERE a.created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY a.ops_user_id, u.email, u.first_name, u.last_name
      ORDER BY count DESC
      LIMIT 10
    `, [days]);

    res.json({
      byCategory: byCategory.rows,
      bySeverity: bySeverity.rows,
      failed: failed.rows,
      activeUsers: activeUsers.rows
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Failed to get audit stats' });
  }
});

export default router;
