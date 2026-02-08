// ============================================================
// OPS ROUTES
// Internal admin API for Uplift operations team
// Version: 2026-02-07-v3 - Enhanced with RBAC, MFA, Audit
// ============================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import { db } from '../lib/database.js';
import * as billingService from '../services/billing.js';

// Configure TOTP settings
authenticator.options = {
  window: 1, // Allow 1 step tolerance (30 seconds before/after)
  step: 30,  // 30 second intervals
};

const router = Router();

// ==================== CONSTANTS ====================

const LOCKOUT_THRESHOLD = 5;  // Failed attempts before lockout
const LOCKOUT_DURATION = 30;  // Minutes
const SESSION_DURATION = 8;   // Hours
const PASSWORD_MIN_LENGTH = 12;

// ==================== HELPER FUNCTIONS ====================

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function validatePassword(password) {
  if (password.length < PASSWORD_MIN_LENGTH) return 'Password must be at least 12 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain a special character';
  return null;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function logAudit(userId, userEmail, action, targetType, targetId, targetName, details, req, success = true, errorMessage = null) {
  try {
    await db.query(`
      INSERT INTO ops_audit_log (ops_user_id, ops_user_email, action, target_type, target_id, target_name, details, ip_address, user_agent, success, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [userId, userEmail, action, targetType, targetId, targetName, JSON.stringify(details || {}), req?.ip || null, req?.headers?.['user-agent'] || null, success, errorMessage]);
  } catch (err) {
    // Silently fail if ops_audit_log table doesn't exist yet
    if (!err.message?.includes('does not exist')) {
      console.error('Audit log error:', err);
    }
  }
}

async function getUserPermissions(userId) {
  const result = await db.query(`
    SELECT r.permissions FROM ops_users u
    JOIN ops_roles r ON u.role_id = r.id
    WHERE u.id = $1
  `, [userId]);
  return result.rows[0]?.permissions || [];
}

// ==================== OPS AUTH MIDDLEWARE ====================

const opsAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.OPS_JWT_SECRET || process.env.JWT_SECRET);

    // Try session-based auth first, gracefully fallback if tables don't exist
    let user = null;
    let sessionFound = false;
    const tokenHash = hashToken(token);

    try {
      const sessionResult = await db.query(`
        SELECT s.*, u.* FROM ops_sessions s
        JOIN ops_users u ON s.ops_user_id = u.id
        WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
        AND u.is_active = true AND u.status = 'active'
      `, [tokenHash]);
      user = sessionResult.rows[0];
      sessionFound = !!user;
    } catch (err) {
      // ops_sessions table may not exist yet - continue with fallback
    }

    // Fallback to old token-based auth if no session
    if (!user) {
      try {
        const userResult = await db.query(
          `SELECT u.*, r.permissions, r.name as role_name FROM ops_users u
           LEFT JOIN ops_roles r ON u.role_id = r.id
           WHERE u.id = $1 AND u.is_active = true AND (u.status = 'active' OR u.status IS NULL)`,
          [decoded.userId]
        );
        user = userResult.rows[0];
      } catch (err) {
        // ops_roles table may not exist - try simple query
        const userResult = await db.query(
          `SELECT * FROM ops_users WHERE id = $1 AND is_active = true`,
          [decoded.userId]
        );
        user = userResult.rows[0];
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check if account is locked (if column exists)
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ error: 'Account locked', lockedUntil: user.locked_until });
    }

    // Update session last active (ignore errors if table doesn't exist)
    if (sessionFound) {
      try {
        await db.query(`UPDATE ops_sessions SET last_active_at = NOW() WHERE token_hash = $1`, [tokenHash]);
      } catch (err) { /* ignore */ }
    }

    req.opsUser = user;
    req.opsToken = token;
    req.opsPermissions = user.permissions || [];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requirePermission = (permission) => (req, res, next) => {
  const permissions = req.opsPermissions || [];
  // Super admin has all permissions
  if (req.opsUser.role === 'super_admin' || req.opsUser.role_name === 'super_admin') {
    return next();
  }
  if (!permissions.includes(permission)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireOpsRole = (roles) => (req, res, next) => {
  const userRole = req.opsUser.role || req.opsUser.role_name;
  if (!roles.includes(userRole)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// ==================== PUBLIC AUTH ROUTES ====================

router.get('/ping', (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() });
});

router.post('/auth/login', async (req, res) => {
  const { email, password, mfaToken } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  try {
    // Try with roles table first, fallback to simple query
    let result;
    try {
      result = await db.query(`
        SELECT u.*, r.permissions, r.name as role_name FROM ops_users u
        LEFT JOIN ops_roles r ON u.role_id = r.id
        WHERE u.email = $1 AND u.is_active = true
      `, [email.toLowerCase()]);
    } catch (err) {
      // ops_roles table may not exist - fallback
      result = await db.query(`
        SELECT * FROM ops_users WHERE email = $1 AND is_active = true
      `, [email.toLowerCase()]);
    }

    const user = result.rows[0];

    // Check if user exists
    if (!user) {
      await logAudit(null, email, 'user.login_failed', 'user', null, email, { reason: 'user_not_found' }, req, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logAudit(user.id, email, 'user.login_failed', 'user', user.id, email, { reason: 'account_locked' }, req, false);
      return res.status(403).json({ error: 'Account locked', lockedUntil: user.locked_until });
    }

    // Check if account is suspended/disabled
    if (user.status === 'suspended' || user.status === 'disabled') {
      await logAudit(user.id, email, 'user.login_failed', 'user', user.id, email, { reason: 'account_' + user.status }, req, false);
      return res.status(403).json({ error: `Account ${user.status}` });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // Increment failed login count (if columns exist)
      try {
        const newFailedCount = (user.failed_login_count || 0) + 1;
        const lockUntil = newFailedCount >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_DURATION * 60 * 1000) : null;

        await db.query(`
          UPDATE ops_users SET failed_login_count = $1, locked_until = $2 WHERE id = $3
        `, [newFailedCount, lockUntil, user.id]);

        await logAudit(user.id, email, 'user.login_failed', 'user', user.id, email, { reason: 'invalid_password', failedCount: newFailedCount }, req, false);

        if (lockUntil) {
          await logAudit(user.id, email, 'user.locked', 'user', user.id, email, { lockedUntil: lockUntil, reason: 'too_many_failed_attempts' }, req);
          return res.status(403).json({ error: 'Account locked due to too many failed attempts', lockedUntil: lockUntil });
        }
      } catch (err) {
        // Columns may not exist yet
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check MFA if enabled
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return res.status(200).json({ requireMfa: true, message: 'MFA token required' });
      }

      // Validate MFA token format
      if (!mfaToken || mfaToken.length !== 6 || !/^\d{6}$/.test(mfaToken)) {
        await logAudit(user.id, email, 'user.login_failed', 'user', user.id, email, { reason: 'invalid_mfa_format' }, req, false);
        return res.status(401).json({ error: 'Invalid MFA token format' });
      }

      // Decrypt the stored secret and verify TOTP
      let secret = user.mfa_secret;
      try {
        secret = crypto
          .createDecipher('aes-256-cbc', process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET)
          .update(user.mfa_secret, 'hex', 'utf8');
      } catch (e) {
        // If decryption fails, use as-is (backwards compatibility)
      }

      const isValid = authenticator.verify({ token: mfaToken, secret });
      if (!isValid) {
        await logAudit(user.id, email, 'user.login_failed', 'user', user.id, email, { reason: 'invalid_mfa' }, req, false);
        return res.status(401).json({ error: 'Invalid MFA token' });
      }
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_DURATION * 60 * 60 * 1000);

    // Create session (ignore error if table doesn't exist)
    try {
      await db.query(`
        INSERT INTO ops_sessions (ops_user_id, token_hash, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.id, tokenHash, ip, userAgent, expiresAt]);
    } catch (err) {
      // ops_sessions table may not exist yet - continue
    }

    // Reset failed login count and update last login (with fallback for missing columns)
    try {
      await db.query(`
        UPDATE ops_users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1
        WHERE id = $1
      `, [user.id]);
    } catch (err) {
      // Columns may not exist - try simple update
      await db.query(`UPDATE ops_users SET updated_at = NOW() WHERE id = $1`, [user.id]);
    }

    // Generate JWT (for backward compatibility)
    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role || user.role_name, sessionHash: tokenHash },
      process.env.OPS_JWT_SECRET || process.env.JWT_SECRET,
      { expiresIn: `${SESSION_DURATION}h` }
    );

    await logAudit(user.id, email, 'user.login', 'user', user.id, email, { ip, userAgent: userAgent?.substring(0, 100) }, req);

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || user.role_name,
        permissions: user.permissions || [],
        mfaEnabled: user.mfa_enabled,
        forcePasswordChange: user.force_password_change,
      },
    });
  } catch (error) {
    console.error('Ops login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/logout', opsAuth, async (req, res) => {
  try {
    const tokenHash = hashToken(req.opsToken);
    await db.query(`UPDATE ops_sessions SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);
    await logAudit(req.opsUser.id, req.opsUser.email, 'user.logout', 'user', req.opsUser.id, req.opsUser.email, {}, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/auth/me', opsAuth, async (req, res) => {
  const permissions = await getUserPermissions(req.opsUser.id);
  res.json({
    user: {
      id: req.opsUser.id,
      email: req.opsUser.email,
      name: req.opsUser.name || `${req.opsUser.first_name} ${req.opsUser.last_name}`,
      firstName: req.opsUser.first_name,
      lastName: req.opsUser.last_name,
      role: req.opsUser.role || req.opsUser.role_name,
      permissions: permissions,
      mfaEnabled: req.opsUser.mfa_enabled || false,
      forcePasswordChange: req.opsUser.force_password_change || false,
    },
  });
});

router.post('/auth/change-password', opsAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Verify current password
    const valid = await bcrypt.compare(currentPassword, req.opsUser.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password
    const pwError = validatePassword(newPassword);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    // Hash and save new password
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(`
      UPDATE ops_users SET password_hash = $1, force_password_change = false, updated_at = NOW()
      WHERE id = $2
    `, [hash, req.opsUser.id]);

    await logAudit(req.opsUser.id, req.opsUser.email, 'user.password_changed', 'user', req.opsUser.id, req.opsUser.email, {}, req);

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.post('/auth/setup-mfa', opsAuth, async (req, res) => {
  try {
    // Generate a real TOTP secret using otplib
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(
      req.opsUser.email,
      'Uplift Ops',
      secret
    );

    // Store secret temporarily (not enabled yet - will be enabled after verification)
    // Encrypt the secret before storing
    const encryptedSecret = crypto
      .createCipher('aes-256-cbc', process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET)
      .update(secret, 'utf8', 'hex');

    await db.query(`UPDATE ops_users SET mfa_secret = $1 WHERE id = $2`, [encryptedSecret, req.opsUser.id]);

    res.json({
      secret,
      otpAuthUrl,
      qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`,
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

router.post('/auth/verify-mfa', opsAuth, async (req, res) => {
  const { token } = req.body;

  try {
    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      return res.status(400).json({ error: 'Invalid MFA token format' });
    }

    // Get the stored secret
    const userResult = await db.query(
      `SELECT mfa_secret FROM ops_users WHERE id = $1`,
      [req.opsUser.id]
    );

    if (!userResult.rows[0]?.mfa_secret) {
      return res.status(400).json({ error: 'MFA not set up. Please run setup first.' });
    }

    // Decrypt the secret
    const encryptedSecret = userResult.rows[0].mfa_secret;
    let secret;
    try {
      secret = crypto
        .createDecipher('aes-256-cbc', process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET)
        .update(encryptedSecret, 'hex', 'utf8');
    } catch (e) {
      // If decryption fails, try using it as-is (for backwards compatibility)
      secret = encryptedSecret;
    }

    // Verify the TOTP token using otplib
    const isValid = authenticator.verify({ token, secret });

    if (!isValid) {
      await logAudit(req.opsUser.id, req.opsUser.email, 'mfa.verify_failed', 'user', req.opsUser.id, req.opsUser.email, {}, req, false);
      return res.status(401).json({ error: 'Invalid MFA token' });
    }

    await db.query(`UPDATE ops_users SET mfa_enabled = true WHERE id = $1`, [req.opsUser.id]);
    await logAudit(req.opsUser.id, req.opsUser.email, 'mfa.enabled', 'user', req.opsUser.id, req.opsUser.email, {}, req);

    res.json({ success: true, message: 'MFA enabled successfully' });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

router.post('/auth/disable-mfa', opsAuth, async (req, res) => {
  const { password } = req.body;

  try {
    // Verify password
    const valid = await bcrypt.compare(password, req.opsUser.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await db.query(`UPDATE ops_users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1`, [req.opsUser.id]);
    await logAudit(req.opsUser.id, req.opsUser.email, 'mfa.disabled', 'user', req.opsUser.id, req.opsUser.email, {}, req);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

// ==================== SESSION MANAGEMENT ====================

router.get('/sessions', opsAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, ip_address, user_agent, created_at, last_active_at, expires_at
      FROM ops_sessions
      WHERE ops_user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY last_active_at DESC
    `, [req.opsUser.id]);

    const currentTokenHash = hashToken(req.opsToken);

    res.json({
      sessions: result.rows.map(s => ({
        ...s,
        isCurrent: false, // Would need to compare session ids
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.delete('/sessions/:id', opsAuth, async (req, res) => {
  try {
    await db.query(`
      UPDATE ops_sessions SET revoked_at = NOW()
      WHERE id = $1 AND ops_user_id = $2
    `, [req.params.id, req.opsUser.id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

router.delete('/sessions', opsAuth, async (req, res) => {
  try {
    const currentTokenHash = hashToken(req.opsToken);
    await db.query(`
      UPDATE ops_sessions SET revoked_at = NOW()
      WHERE ops_user_id = $1 AND token_hash != $2
    `, [req.opsUser.id, currentTokenHash]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// Apply auth to all routes below
router.use(opsAuth);

// ==================== USER MANAGEMENT (super_admin only) ====================

router.get('/users', requireOpsRole(['super_admin']), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.role, r.name as role_name,
             u.status, u.mfa_enabled, u.last_login_at, u.login_count, u.locked_until,
             u.force_password_change, u.created_at,
             (SELECT COUNT(*) FROM ops_sessions s WHERE s.ops_user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > NOW()) as active_sessions
      FROM ops_users u
      LEFT JOIN ops_roles r ON u.role_id = r.id
      WHERE u.is_active = true
      ORDER BY u.created_at DESC
    `);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', requireOpsRole(['super_admin']), async (req, res) => {
  try {
    const userResult = await db.query(`
      SELECT u.*, r.name as role_name, r.permissions
      FROM ops_users u
      LEFT JOIN ops_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [req.params.id]);

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent audit logs
    const auditResult = await db.query(`
      SELECT action, target_type, target_name, created_at, ip_address
      FROM ops_audit_log
      WHERE ops_user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.params.id]);

    // Get active sessions
    const sessionsResult = await db.query(`
      SELECT id, ip_address, user_agent, created_at, last_active_at
      FROM ops_sessions
      WHERE ops_user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY last_active_at DESC
    `, [req.params.id]);

    res.json({
      user: userResult.rows[0],
      auditLog: auditResult.rows,
      sessions: sessionsResult.rows,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.get('/roles', requireOpsRole(['super_admin']), async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM ops_roles ORDER BY name`);
    res.json({ roles: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.post('/users', requireOpsRole(['super_admin']), async (req, res) => {
  const { email, name, roleId } = req.body;

  try {
    // Check if email exists
    const existing = await db.query(`SELECT id FROM ops_users WHERE email = $1`, [email.toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate temp password
    const tempPassword = generatePassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    // Get role name
    const roleResult = await db.query(`SELECT name FROM ops_roles WHERE id = $1`, [roleId]);
    const roleName = roleResult.rows[0]?.name || 'admin';

    const [firstName, ...lastParts] = (name || '').split(' ');
    const lastName = lastParts.join(' ') || '';

    const result = await db.query(`
      INSERT INTO ops_users (email, name, first_name, last_name, password_hash, role_id, role, status, force_password_change, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', true, true, $8)
      RETURNING id, email, name
    `, [email.toLowerCase(), name, firstName, lastName, hash, roleId, roleName, req.opsUser.id]);

    await logAudit(req.opsUser.id, req.opsUser.email, 'user.created', 'user', result.rows[0].id, email, { roleId, roleName }, req);

    res.json({
      user: result.rows[0],
      tempPassword,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/users/:id', requireOpsRole(['super_admin']), async (req, res) => {
  const { name, roleId, status } = req.body;

  try {
    // Cannot edit self's role or status
    if (req.params.id === req.opsUser.id && (roleId || status)) {
      return res.status(400).json({ error: 'Cannot modify your own role or status' });
    }

    // Get role name if changing role
    let roleName = null;
    if (roleId) {
      const roleResult = await db.query(`SELECT name FROM ops_roles WHERE id = $1`, [roleId]);
      roleName = roleResult.rows[0]?.name;
    }

    const result = await db.query(`
      UPDATE ops_users SET
        name = COALESCE($1, name),
        role_id = COALESCE($2, role_id),
        role = COALESCE($3, role),
        status = COALESCE($4, status),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, email, name, status
    `, [name, roleId, roleName, status, req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAudit(req.opsUser.id, req.opsUser.email, 'user.edited', 'user', req.params.id, result.rows[0].email, { name, roleId, status }, req);

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', requireOpsRole(['super_admin']), async (req, res) => {
  try {
    // Cannot delete self
    if (req.params.id === req.opsUser.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const result = await db.query(`
      UPDATE ops_users SET is_active = false, status = 'disabled', updated_at = NOW()
      WHERE id = $1
      RETURNING email
    `, [req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Revoke all sessions
    await db.query(`UPDATE ops_sessions SET revoked_at = NOW() WHERE ops_user_id = $1`, [req.params.id]);

    await logAudit(req.opsUser.id, req.opsUser.email, 'user.deleted', 'user', req.params.id, result.rows[0].email, {}, req);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/users/:id/reset-password', requireOpsRole(['super_admin']), async (req, res) => {
  try {
    const tempPassword = generatePassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const result = await db.query(`
      UPDATE ops_users SET password_hash = $1, force_password_change = true, updated_at = NOW()
      WHERE id = $2
      RETURNING email
    `, [hash, req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAudit(req.opsUser.id, req.opsUser.email, 'user.password_reset', 'user', req.params.id, result.rows[0].email, {}, req);

    res.json({ tempPassword });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/users/:id/unlock', requireOpsRole(['super_admin']), async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE ops_users SET locked_until = NULL, failed_login_count = 0, updated_at = NOW()
      WHERE id = $1
      RETURNING email
    `, [req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAudit(req.opsUser.id, req.opsUser.email, 'user.unlocked', 'user', req.params.id, result.rows[0].email, {}, req);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlock user' });
  }
});

// ==================== AUDIT LOG ====================

router.get('/audit', requireOpsRole(['super_admin', 'admin']), async (req, res) => {
  const { userId, action, targetType, startDate, endDate, search, limit = 100, offset = 0 } = req.query;

  try {
    let query = `
      SELECT a.*, u.name as user_name
      FROM ops_audit_log a
      LEFT JOIN ops_users u ON a.ops_user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND a.ops_user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (action) {
      query += ` AND a.action = $${paramIndex++}`;
      params.push(action);
    }
    if (targetType) {
      query += ` AND a.target_type = $${paramIndex++}`;
      params.push(targetType);
    }
    if (startDate) {
      query += ` AND a.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (search) {
      query += ` AND (a.target_name ILIKE $${paramIndex} OR a.ops_user_email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get unique actions for filter
    const actionsResult = await db.query(`SELECT DISTINCT action FROM ops_audit_log ORDER BY action`);

    res.json({
      entries: result.rows,
      actions: actionsResult.rows.map(r => r.action),
    });
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

router.get('/audit/my', opsAuth, async (req, res) => {
  const { limit = 50 } = req.query;

  try {
    const result = await db.query(`
      SELECT action, target_type, target_name, details, ip_address, created_at
      FROM ops_audit_log
      WHERE ops_user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [req.opsUser.id, parseInt(limit)]);

    res.json({ entries: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ==================== DASHBOARD ====================

router.get('/dashboard', requirePermission('customers.view'), async (req, res) => {
  try {
    // Key metrics - each query wrapped to handle missing columns
    let metrics = {
      total_customers: 0,
      active_subscriptions: 0,
      total_seats: 0,
      trials: 0,
      past_due: 0,
      pending_cancellations: 0
    };

    try {
      const r = await db.query(`SELECT COUNT(*) as c FROM organizations WHERE status = 'active'`);
      metrics.total_customers = parseInt(r.rows[0]?.c) || 0;
    } catch (e) { /* ignore */ }

    try {
      const r = await db.query(`SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active'`);
      metrics.active_subscriptions = parseInt(r.rows[0]?.c) || 0;
    } catch (e) { /* ignore */ }

    try {
      const r = await db.query(`SELECT COALESCE(SUM(core_seats), 0) as c FROM subscriptions WHERE status = 'active'`);
      metrics.total_seats = parseInt(r.rows[0]?.c) || 0;
    } catch (e) { /* ignore */ }

    try {
      const r = await db.query(`SELECT COUNT(*) as c FROM subscriptions WHERE status = 'trialing'`);
      metrics.trials = parseInt(r.rows[0]?.c) || 0;
    } catch (e) { /* ignore */ }

    try {
      const r = await db.query(`SELECT COUNT(*) as c FROM subscriptions WHERE status = 'past_due'`);
      metrics.past_due = parseInt(r.rows[0]?.c) || 0;
    } catch (e) { /* ignore */ }

    // MRR calculation
    let mrr = 0;
    try {
      const mrrResult = await db.query(`
        SELECT COALESCE(SUM(
          (s.core_seats * COALESCE(p.core_price_per_seat, 0)) +
          (COALESCE(s.flex_seats, 0) * COALESCE(p.flex_price_per_seat, 0))
        ), 0) as mrr
        FROM subscriptions s
        LEFT JOIN plans p ON s.plan_id = p.id
        WHERE s.status IN ('active', 'trialing', 'past_due')
      `);
      mrr = parseInt(mrrResult.rows[0]?.mrr) || 0;
    } catch (e) { /* ignore */ }

    // Recent activity from subscriptions
    let recentActivity = [];
    try {
      const activityResult = await db.query(`
        SELECT
          'subscription_created' as type,
          o.name as org_name,
          s.created_at
        FROM subscriptions s
        JOIN organizations o ON s.organization_id = o.id
        ORDER BY s.created_at DESC
        LIMIT 10
      `);
      recentActivity = activityResult.rows;
    } catch (e) { /* ignore */ }

    // Failed payments
    let failedPayments = [];
    try {
      const fpResult = await db.query(`
        SELECT
          o.name as org_name,
          i.total,
          i.currency,
          i.created_at
        FROM invoices i
        JOIN organizations o ON i.organization_id = o.id
        WHERE i.status = 'open'
        ORDER BY i.created_at DESC
        LIMIT 5
      `);
      failedPayments = fpResult.rows;
    } catch (e) { /* ignore */ }

    res.json({
      metrics: {
        ...metrics,
        mrr,
      },
      recentActivity,
      failedPayments,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ==================== CUSTOMERS ====================

router.get('/customers', requirePermission('customers.view'), async (req, res) => {
  try {
    const {
      search,
      status,
      plan,
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    // Simple query - minimal columns to avoid missing column errors
    let query = `
      SELECT
        o.id, o.name, o.created_at,
        s.status as subscription_status,
        COALESCE(s.core_seats, 0) as core_seats,
        p.name as plan_name
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (o.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (plan) {
      query += ` AND p.slug = $${paramIndex}`;
      params.push(plan);
      paramIndex++;
    }

    // Sorting
    const allowedSorts = ['created_at', 'name', 'core_seats', 'health_score'];
    const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn === 'name' ? 'o.name' : sortColumn} ${order}`;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (o.name ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    if (status) {
      countQuery += ` AND s.status = $${countParamIndex}`;
      countParams.push(status);
    }
    if (plan) {
      countQuery += ` AND p.slug = $${countParamIndex}`;
      countParams.push(plan);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

router.get('/customers/:id', requirePermission('customers.view'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get org details
    const orgResult = await db.query(`
      SELECT o.*, 
        s.*, 
        p.name as plan_name,
        p.slug as plan_slug,
        p.features as plan_features
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE o.id = $1
    `, [id]);

    if (!orgResult.rows[0]) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = orgResult.rows[0];

    // Get seat usage
    const usageResult = await db.query(`
      SELECT seat_type, COUNT(*) as count
      FROM employees
      WHERE organization_id = $1 AND status = 'active'
      GROUP BY seat_type
    `, [id]);

    const usage = { core: 0, flex: 0 };
    usageResult.rows.forEach(row => {
      usage[row.seat_type] = parseInt(row.count);
    });

    // Get admins
    const adminsResult = await db.query(`
      SELECT id, email, first_name, last_name, last_login_at
      FROM users
      WHERE organization_id = $1 AND role = 'admin'
    `, [id]);

    // Get recent invoices
    const invoicesResult = await db.query(`
      SELECT id, stripe_invoice_number, total, status, paid_at, created_at
      FROM invoices
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 6
    `, [id]);

    // Get notes
    const notesResult = await db.query(`
      SELECT n.*, ou.first_name as author_first_name, ou.last_name as author_last_name
      FROM customer_notes n
      LEFT JOIN ops_users ou ON n.ops_user_id = ou.id
      WHERE n.organization_id = $1
      ORDER BY n.is_pinned DESC, n.created_at DESC
      LIMIT 20
    `, [id]);

    // Get health score
    const healthResult = await db.query(`
      SELECT * FROM customer_health WHERE organization_id = $1
    `, [id]);

    res.json({
      customer,
      usage,
      admins: adminsResult.rows,
      invoices: invoicesResult.rows,
      notes: notesResult.rows,
      health: healthResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Get customer detail error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// ==================== CUSTOMER ACTIONS ====================

router.post('/customers/:id/notes', requirePermission('customers.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { note, noteType = 'general' } = req.body;

    const result = await db.query(`
      INSERT INTO customer_notes (organization_id, ops_user_id, note, note_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, req.opsUser.id, note, noteType]);

    await logOpsActivity(req.opsUser.id, 'note_added', 'organization', id, { noteType });

    res.json({ note: result.rows[0] });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

router.post('/customers/:id/seats', requireOpsRole(['admin', 'support']), async (req, res) => {
  try {
    const { id } = req.params;
    const { coreSeats, flexSeats, reason } = req.body;

    // Get current subscription
    const currentSub = await billingService.getSubscription(id);
    if (!currentSub) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    // Update seats via billing service (which updates Stripe and prorates)
    const results = {};
    if (coreSeats !== undefined && coreSeats !== currentSub.core_seats) {
      results.core = await billingService.updateCoreSeats(id, coreSeats);
    }
    if (flexSeats !== undefined && flexSeats !== currentSub.flex_seats) {
      results.flex = await billingService.updateFlexSeats(id, flexSeats);
    }

    await logOpsActivity(req.opsUser.id, 'seats_modified', 'organization', id, {
      coreSeats, flexSeats, reason, changes: results
    });

    res.json({ success: true, changes: results });
  } catch (error) {
    console.error('Update seats error:', error);
    res.status(400).json({ error: error.message || 'Failed to update seats' });
  }
});

router.post('/customers/:id/extend-trial', requireOpsRole(['admin', 'sales']), async (req, res) => {
  try {
    const { id } = req.params;
    const { days, reason } = req.body;

    // Get current subscription
    const sub = await billingService.getSubscription(id);
    if (!sub?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }
    if (sub.status !== 'trialing') {
      return res.status(400).json({ error: 'Subscription is not in trial period' });
    }

    // Calculate new trial end
    const newTrialEnd = new Date(sub.trial_end || Date.now());
    newTrialEnd.setDate(newTrialEnd.getDate() + (parseInt(days) || 14));

    // Update Stripe subscription trial
    await billingService.stripe.subscriptions.update(sub.stripe_subscription_id, {
      trial_end: Math.floor(newTrialEnd.getTime() / 1000),
    });

    // Update local database
    await db.query(
      `UPDATE subscriptions SET trial_end = $1, updated_at = NOW() WHERE organization_id = $2`,
      [newTrialEnd, id]
    );

    await logOpsActivity(req.opsUser.id, 'trial_extended', 'organization', id, {
      days, reason, newEndDate: newTrialEnd
    });

    res.json({ success: true, trialEnd: newTrialEnd });
  } catch (error) {
    console.error('Extend trial error:', error);
    res.status(400).json({ error: error.message || 'Failed to extend trial' });
  }
});

router.post('/customers/:id/credit', requireOpsRole(['admin', 'finance']), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    // Get Stripe customer ID
    const subResult = await db.query(`
      SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1
    `, [id]);

    if (!subResult.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    // Create credit balance transaction in Stripe
    const credit = await billingService.stripe.customers.createBalanceTransaction(
      subResult.rows[0].stripe_customer_id,
      {
        amount: -Math.round(amount * 100), // Negative = credit, convert to pence
        currency: 'gbp',
        description: reason || `Credit issued by ${req.opsUser.email}`,
      }
    );

    await logOpsActivity(req.opsUser.id, 'credit_applied', 'organization', id, {
      amount, reason, stripe_txn: credit.id
    });

    res.json({ success: true, amount, creditId: credit.id });
  } catch (error) {
    console.error('Apply credit error:', error);
    res.status(400).json({ error: error.message || 'Failed to apply credit' });
  }
});

// ==================== BILLING OVERVIEW ====================

router.get('/billing/overview', requirePermission('billing.view'), async (req, res) => {
  try {
    // MRR by plan
    const mrrByPlan = await db.query(`
      SELECT 
        p.name as plan_name,
        p.slug as plan_slug,
        COUNT(s.id) as customer_count,
        SUM(s.core_seats) as total_core_seats,
        SUM(s.flex_seats) as total_flex_seats,
        SUM((s.core_seats * p.core_price_per_seat) + (s.flex_seats * p.flex_price_per_seat)) as mrr
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status IN ('active', 'trialing')
      GROUP BY p.id, p.name, p.slug
      ORDER BY mrr DESC
    `);

    // Recent seat changes
    const recentChanges = await db.query(`
      SELECT 
        sc.*,
        o.name as org_name
      FROM seat_changes sc
      JOIN organizations o ON sc.organization_id = o.id
      ORDER BY sc.created_at DESC
      LIMIT 20
    `);

    // Upcoming renewals
    const upcomingRenewals = await db.query(`
      SELECT 
        o.name as org_name,
        s.core_seats,
        s.flex_seats,
        s.current_period_end,
        p.name as plan_name,
        (s.core_seats * p.core_price_per_seat) + (s.flex_seats * p.flex_price_per_seat) as amount
      FROM subscriptions s
      JOIN organizations o ON s.organization_id = o.id
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
        AND s.current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      ORDER BY s.current_period_end
    `);

    // Failed payments
    const failedPayments = await db.query(`
      SELECT 
        o.id as org_id,
        o.name as org_name,
        i.total,
        i.currency,
        i.due_date,
        i.stripe_hosted_invoice_url
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.status = 'open' AND i.amount_due > 0
      ORDER BY i.due_date
    `);

    res.json({
      mrrByPlan: mrrByPlan.rows,
      recentChanges: recentChanges.rows,
      upcomingRenewals: upcomingRenewals.rows,
      failedPayments: failedPayments.rows,
    });
  } catch (error) {
    console.error('Billing overview error:', error);
    res.status(500).json({ error: 'Failed to load billing overview' });
  }
});

// ==================== RETRY PAYMENT ====================

router.post('/billing/retry-payment', requireOpsRole(['admin', 'finance']), async (req, res) => {
  try {
    const { invoiceId } = req.body;

    const invoiceResult = await db.query(
      `SELECT stripe_invoice_id, organization_id FROM invoices WHERE id = $1`,
      [invoiceId]
    );

    if (!invoiceResult.rows[0]?.stripe_invoice_id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await billingService.stripe.invoices.pay(invoiceResult.rows[0].stripe_invoice_id);

    await db.query(
      `UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [invoiceId]
    );

    await logOpsActivity(req.opsUser.id, 'payment_retried', 'invoice', invoiceId, {
      organizationId: invoiceResult.rows[0].organization_id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Retry payment error:', error);
    res.status(400).json({ error: error.message || 'Failed to retry payment' });
  }
});

// ==================== INVOICES ====================

router.get('/invoices', requirePermission('billing.view'), async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        i.*,
        o.name as org_name
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (o.name ILIKE $${paramIndex} OR i.stripe_invoice_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// ==================== ACTIVITY LOG ====================

router.get('/activity', requirePermission('activity.view'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const result = await db.query(`
      SELECT 
        a.*,
        ou.first_name, ou.last_name, ou.email
      FROM ops_activity_log a
      LEFT JOIN ops_users ou ON a.ops_user_id = ou.id
      ORDER BY a.created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({ activity: result.rows });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ==================== FEATURE FLAGS ====================

router.get('/features/:orgId', requirePermission('features.view'), async (req, res) => {
  try {
    const { orgId } = req.params;

    const result = await db.query(`
      SELECT * FROM feature_overrides
      WHERE organization_id = $1
      ORDER BY feature_key
    `, [orgId]);

    res.json({ features: result.rows });
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

router.post('/features/:orgId', requireOpsRole(['admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { featureKey, enabled, reason, expiresAt } = req.body;

    const result = await db.query(`
      INSERT INTO feature_overrides (organization_id, feature_key, enabled, reason, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (organization_id, feature_key) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        reason = EXCLUDED.reason,
        expires_at = EXCLUDED.expires_at,
        created_by = EXCLUDED.created_by
      RETURNING *
    `, [orgId, featureKey, enabled, reason, expiresAt, req.opsUser.id]);

    await logOpsActivity(req.opsUser.id, 'feature_toggled', 'organization', orgId, {
      featureKey, enabled, reason
    });

    res.json({ feature: result.rows[0] });
  } catch (error) {
    console.error('Toggle feature error:', error);
    res.status(500).json({ error: 'Failed to toggle feature' });
  }
});

// ==================== IMPERSONATION ====================

router.post('/impersonate/:orgId', requireOpsRole(['admin']), async (req, res) => {
  try {
    const { orgId } = req.params;

    // Get an admin user from the org
    const userResult = await db.query(`
      SELECT id, email, organization_id
      FROM users
      WHERE organization_id = $1 AND role = 'admin'
      LIMIT 1
    `, [orgId]);

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'No admin user found' });
    }

    // Generate a short-lived token for impersonation
    const token = jwt.sign(
      {
        userId: userResult.rows[0].id,
        organizationId: orgId,
        impersonatedBy: req.opsUser.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await logOpsActivity(req.opsUser.id, 'impersonation_started', 'organization', orgId, {
      targetUser: userResult.rows[0].email
    });

    res.json({
      token,
      portalUrl: `${process.env.PORTAL_URL}?impersonate=${token}`,
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ error: 'Failed to start impersonation' });
  }
});

// ==================== LICENSES ====================

router.get('/licenses', requirePermission('licenses.view'), async (req, res) => {
  try {
    const { search, status, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT
        lk.*,
        o.name as org_name
      FROM license_keys lk
      LEFT JOIN organizations o ON lk.organization_id = o.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (lk.license_key ILIKE $${paramIndex} OR o.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND lk.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY lk.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    res.json({ licenses: result.rows });
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

router.post('/licenses', requirePermission('licenses.edit'), async (req, res) => {
  try {
    const { organizationId, planType, keyType, maxSeats, flexSeatsLimit, validDays } = req.body;

    // Generate a unique license key
    const key = 'UPL-' +
      crypto.randomBytes(4).toString('hex').toUpperCase() + '-' +
      crypto.randomBytes(4).toString('hex').toUpperCase() + '-' +
      crypto.randomBytes(4).toString('hex').toUpperCase();

    const validUntil = validDays ? new Date(Date.now() + validDays * 86400000) : null;

    const result = await db.query(`
      INSERT INTO license_keys (organization_id, license_key, plan_type, key_type, max_seats, flex_seats_limit, valid_until, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [organizationId, key, planType || 'growth', keyType || 'annual', maxSeats || 50, flexSeatsLimit, validUntil, req.opsUser.id]);

    await logOpsActivity(req.opsUser.id, 'license_created', 'license', result.rows[0].id, {
      organizationId, planType, maxSeats
    });

    res.json({ license: result.rows[0] });
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

router.patch('/licenses/:id', requirePermission('licenses.edit'), async (req, res) => {
  try {
    const { status, maxSeats, flexSeatsLimit, validUntil } = req.body;

    const result = await db.query(`
      UPDATE license_keys SET
        status = COALESCE($1, status),
        max_seats = COALESCE($2, max_seats),
        flex_seats_limit = COALESCE($3, flex_seats_limit),
        valid_until = COALESCE($4, valid_until),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, maxSeats, flexSeatsLimit, validUntil, req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json({ license: result.rows[0] });
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ error: 'Failed to update license' });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function logOpsActivity(opsUserId, action, entityType, entityId, details = {}) {
  await db.query(`
    INSERT INTO ops_activity_log (ops_user_id, action, entity_type, entity_id, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [opsUserId, action, entityType, entityId, JSON.stringify(details)]);
}

// ==================== FX RATES ====================

// Cache FX rates for 1 hour
let fxCache = { rates: {}, fetchedAt: 0 };

router.get('/fx-rates', async (req, res) => {
  try {
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - fxCache.fetchedAt < ONE_HOUR && Object.keys(fxCache.rates).length > 0) {
      return res.json({ rates: fxCache.rates, base: 'GBP', cached: true });
    }

    // Try fetching from exchangerate-api (free tier: 1500 reqs/mo)
    const response = await fetch('https://open.er-api.com/v6/latest/GBP');
    if (response.ok) {
      const data = await response.json();
      fxCache = { rates: data.rates || {}, fetchedAt: Date.now() };
      return res.json({ rates: fxCache.rates, base: 'GBP' });
    }

    // Fallback: hardcoded approximate rates (GBP base)
    const fallbackRates = {
      GBP: 1, USD: 1.27, EUR: 1.17, CAD: 1.72, AUD: 1.95, JPY: 190,
      CHF: 1.12, SEK: 13.2, NOK: 13.5, DKK: 8.7, SGD: 1.71, NZD: 2.12,
      BRL: 6.2, INR: 106, ZAR: 23.1, MXN: 21.8, AED: 4.66, PLN: 5.12,
      RON: 5.82,
    };
    res.json({ rates: fallbackRates, base: 'GBP', fallback: true });
  } catch (error) {
    console.error('FX rates error:', error);
    res.json({ rates: { GBP: 1, USD: 1.27, EUR: 1.17 }, base: 'GBP', fallback: true });
  }
});

// ==================== ONBOARDING (ops-accessible) ====================

// Get plans (for onboarding wizard)
router.get('/plans', requirePermission('onboard'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM plans WHERE is_active = true ORDER BY sort_order, name');
    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

// Create organization (for onboarding wizard)
router.post('/onboard/organization', requirePermission('onboard'), async (req, res) => {
  try {
    const { name, billingEmail, billingName, taxId } = req.body;
    if (!name || !billingEmail) return res.status(400).json({ error: 'Name and billing email required' });

    const result = await db.query(`
      INSERT INTO organizations (name, billing_email, billing_name, tax_id, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
    `, [name, billingEmail, billingName || null, taxId || null]);

    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Create org error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Create subscription for org (for onboarding wizard)
router.post('/onboard/subscription', requirePermission('onboard'), async (req, res) => {
  try {
    const { organizationId, planSlug, coreSeats, flexSeats, trialDays } = req.body;

    if (!organizationId || !planSlug) {
      return res.status(400).json({ error: 'organizationId and planSlug required' });
    }

    // Use billing service to create Stripe customer and subscription
    const result = await billingService.createSubscription(
      organizationId,
      planSlug,
      coreSeats || 5,
      { trialDays: trialDays || 14 }
    );

    // Add flex seats if specified
    if (flexSeats > 0) {
      await billingService.updateFlexSeats(organizationId, flexSeats);
    }

    // Get the created subscription
    const subscription = await billingService.getSubscription(organizationId);

    await logOpsActivity(req.opsUser.id, 'subscription_created', 'organization', organizationId, {
      planSlug, coreSeats, flexSeats, trialDays,
      stripeSubscriptionId: result.subscription?.id
    });

    res.json({
      subscription,
      clientSecret: result.clientSecret, // For payment setup if needed
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(400).json({ error: error.message || 'Failed to create subscription' });
  }
});

// Create admin user for org (for onboarding wizard)
router.post('/onboard/user', requirePermission('onboard'), async (req, res) => {
  try {
    const { organizationId, email, firstName, lastName, password } = req.body;
    if (!organizationId || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

    const bcryptLib = await import('bcryptjs');
    const hash = await bcryptLib.default.hash(password, 10);

    const result = await db.query(`
      INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, status)
      VALUES ($1, $2, $3, $4, $5, 'admin', 'active')
      RETURNING id, email, first_name, last_name, role
    `, [organizationId, email.toLowerCase(), hash, firstName, lastName]);

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ==================== MANAGE (ops-accessible admin actions) ====================

// Edit organization
router.patch('/manage/organizations/:id', requirePermission('customers.edit'), async (req, res) => {
  try {
    const { name, billingEmail, taxId } = req.body;
    const result = await db.query(`
      UPDATE organizations SET
        name = COALESCE($1, name),
        billing_email = COALESCE($2, billing_email),
        tax_id = COALESCE($3, tax_id),
        updated_at = NOW()
      WHERE id = $4 RETURNING *
    `, [name, billingEmail, taxId, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Organization not found' });
    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Update org error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Change plan / create subscription
router.post('/manage/organizations/:id/subscription', requirePermission('customers.edit'), async (req, res) => {
  try {
    const { planSlug } = req.body;

    // Check if subscription exists
    const existingSub = await billingService.getSubscription(req.params.id);

    let result;
    if (existingSub?.stripe_subscription_id) {
      // Update existing subscription via billing service
      result = await billingService.changePlan(req.params.id, planSlug);
    } else {
      // Create new subscription
      result = await billingService.createSubscription(req.params.id, planSlug, 5, { trialDays: 14 });
    }

    const subscription = await billingService.getSubscription(req.params.id);

    res.json({ subscription, planChange: result });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(400).json({ error: error.message || 'Failed to change plan' });
  }
});

// Cancel subscription
router.post('/manage/organizations/:id/subscription/cancel', requirePermission('customers.edit'), async (req, res) => {
  try {
    const { immediate, reason } = req.body;

    // Use billing service to cancel in Stripe
    const result = await billingService.cancelSubscription(req.params.id, immediate, reason);

    const subscription = await billingService.getSubscription(req.params.id);
    res.json({ subscription, canceled: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(400).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

export default router;
