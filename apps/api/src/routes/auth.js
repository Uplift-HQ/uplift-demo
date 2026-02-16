// ============================================================
// AUTH API ROUTES
// Login, Register, Password Reset, MFA, SSO
// ============================================================

import { Router } from 'express';
import crypto from 'crypto';
import { authService, AuthError } from '../services/auth.js';
import { authMiddleware, validate, authLimiter, mfaLimiter, passwordResetLimiter, registrationLimiter } from '../middleware/index.js';
import { db } from '../lib/database.js';
import * as billingService from '../services/billing.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mfaSetupSchema,
} from '../validation/schemas.js';

const router = Router();

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res, token, expiresAt) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/api/auth',
  });
};

// Helper to set access token httpOnly cookie (XSS protection)
const setAccessTokenCookie = (res, token) => {
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });
};

// Helper to clear auth cookies
const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth' });
};

// -------------------- PUBLIC ROUTES --------------------

// Login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password, mfaCode } = req.body;

    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await authService.login(email, password, deviceInfo);

    if (result.requiresMfa) {
      return res.json({
        requiresMfa: true,
        mfaToken: result.mfaToken,
      });
    }

    setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    setAccessTokenCookie(res, result.accessToken);

    // Return tokens in body for mobile apps (in addition to cookies for web)
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: error.message, code: error.code });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MFA verification
router.post('/mfa/verify', mfaLimiter, async (req, res) => {
  try {
    const { mfaToken, code, method = 'totp' } = req.body;

    if (!mfaToken || !code) {
      return res.status(400).json({ error: 'MFA token and code required' });
    }

    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await authService.verifyMfaLogin(mfaToken, code, method, deviceInfo);

    setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    setAccessTokenCookie(res, result.accessToken);

    // Return tokens in body for mobile apps
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token (with rotation)
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await authService.refreshAccessToken(refreshToken, deviceInfo);
    
    // Token rotation: set both new tokens
    setAccessTokenCookie(res, result.accessToken);
    setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

    // Return tokens in body for mobile apps
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Clear cookies on invalid refresh token
      clearAuthCookies(res);
      return res.status(401).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    // Get user ID from token if possible
    const authHeader = req.headers.authorization;
    let userId;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = authService.verifyAccessToken(authHeader.slice(7));
        userId = decoded.userId;
      } catch {
        // Token might be expired, that's ok
      }
    }

    if (refreshToken) {
      await authService.logout(refreshToken, userId);
    }

    clearAuthCookies(res);
    res.json({ success: true });
  } catch (error) {
    // Logout should always succeed from client perspective
    clearAuthCookies(res);
    res.json({ success: true });
  }
});

// Password complexity validation
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return errors;
};

// Register new organization
router.post('/register', registrationLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { organizationName, email, password, firstName, lastName } = req.body;

    // Zod schema already validated password strength and all required fields
    const result = await authService.register({
      organizationName,
      email,
      password,
      firstName,
      lastName,
    });

    // Auto-login after registration
    const deviceInfo = { ip: req.ip, userAgent: req.get('user-agent') };
    const loginResult = await authService.login(email, password, deviceInfo);

    setRefreshTokenCookie(res, loginResult.refreshToken, loginResult.refreshTokenExpiresAt);
    setAccessTokenCookie(res, loginResult.accessToken);

    // Return tokens in body for mobile apps
    res.status(201).json({
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
      user: loginResult.user,
      organization: result.organization,
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request password reset
router.post('/password/forgot', passwordResetLimiter, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.json({ 
      success: true,
      message: 'If an account exists with this email, a reset link has been sent',
    });
  } catch (error) {
    // Don't reveal errors
    res.json({ success: true });
  }
});

// Validate reset token
router.get('/password/reset/:token', async (req, res) => {
  try {
    const { token } = req.params;

    await authService.validatePasswordResetToken(token);

    res.json({ valid: true });
  } catch (error) {
    res.json({ valid: false });
  }
});

// Reset password
router.post('/password/reset', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: passwordErrors[0], details: passwordErrors });
    }

    await authService.resetPassword(token, password);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept invitation
router.post('/invitation/accept', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: passwordErrors[0], details: passwordErrors });
    }

    const user = await authService.acceptInvitation(token, password);

    // Auto-login
    const deviceInfo = { ip: req.ip, userAgent: req.get('user-agent') };
    const loginResult = await authService.login(user.email, password, deviceInfo);

    setRefreshTokenCookie(res, loginResult.refreshToken, loginResult.refreshTokenExpiresAt);

    res.json({
      accessToken: loginResult.accessToken,
      user: loginResult.user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- PROTECTED ROUTES --------------------

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/password/change', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: passwordErrors[0], details: passwordErrors });
    }

    await authService.changePassword(req.user.userId, currentPassword, newPassword);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Setup MFA
router.post('/mfa/setup', authMiddleware, async (req, res) => {
  try {
    const result = await authService.setupMfa(req.user.userId);

    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify and enable MFA
router.post('/mfa/enable', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code required' });
    }

    await authService.verifyAndEnableMfa(req.user.userId, code);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable MFA
router.post('/mfa/disable', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    await authService.disableMfa(req.user.userId, password);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Regenerate MFA backup codes
router.post('/mfa/backup-codes', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const result = await authService.regenerateBackupCodes(req.user.userId, password);

    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite user (portal calls /auth/users/invite)
router.post(['/invite', '/users/invite'], authMiddleware, async (req, res) => {
  try {
    const { email, firstName, lastName, role } = req.body;

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check seat availability before inviting user
    try {
      await billingService.enforceSeatLimit(req.user.organizationId);
    } catch (seatError) {
      if (seatError.code === 'SEAT_LIMIT_EXCEEDED') {
        return res.status(403).json({ error: seatError.message, code: 'SEAT_LIMIT_EXCEEDED' });
      }
      throw seatError;
    }

    const result = await authService.inviteUser(
      req.user.organizationId,
      { email, firstName, lastName, role },
      req.user.userId
    );

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List users in organization
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const result = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.created_at, u.last_login_at,
              e.id as employee_id, e.department_id
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.organization_id = $1
       ORDER BY u.first_name, u.last_name`,
      [organizationId]
    );
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke all sessions
router.post('/sessions/revoke-all', authMiddleware, async (req, res) => {
  try {
    await authService.revokeAllUserTokens(req.user.userId);

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// PUBLIC AUTH ROUTES (No auth required)
// ============================================================

/**
 * POST /api/auth/forgot-password (alias: /password/reset-request)
 * Request password reset email
 */
router.post(['/forgot-password', '/password/reset-request'], async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user (don't reveal if exists or not)
    const result = await db.query(
      `SELECT id, email, first_name, last_name, organization_id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows[0]) {
      const user = result.rows[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      // Store hashed token
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      await db.query(
        `UPDATE users SET 
          password_reset_token = $2,
          password_reset_expires = $3,
          updated_at = NOW()
         WHERE id = $1`,
        [user.id, hashedToken, resetExpires]
      );

      // Send email
      const { emailService } = await import('../services/email.js');
      await emailService.sendPasswordReset(user, resetToken);

      // Log activity
      const { activityLog } = await import('../services/activity.js');
      await activityLog.log({
        userId: user.id,
        organizationId: user.organization_id,
        action: 'password_reset_requested',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    // Always return success (don't reveal if email exists)
    res.json({ 
      success: true, 
      message: 'If an account exists with this email, you will receive a password reset link.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }

    // Hash the token to compare
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      `SELECT id, email, first_name, last_name, organization_id 
       FROM users 
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [hashedToken]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    // Hash new password
    const passwordHash = await authService.hashPassword(password);

    // Update password and clear reset token
    await db.query(
      `UPDATE users SET 
        password_hash = $2,
        password_reset_token = NULL,
        password_reset_expires = NULL,
        password_changed_at = NOW(),
        force_password_change = false,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [user.id, passwordHash]
    );

    // Send confirmation email
    const { emailService } = await import('../services/email.js');
    await emailService.sendPasswordChanged(user, { ip: req.ip });

    // Log activity
    const { activityLog } = await import('../services/activity.js');
    await activityLog.log({
      userId: user.id,
      organizationId: user.organization_id,
      action: 'password_reset_completed',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Password has been reset. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/accept-invitation
 * Accept invitation and set password
 */
router.post('/accept-invitation', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }

    // Find invited user
    const result = await db.query(
      `SELECT id, email, first_name, last_name, organization_id 
       FROM users 
       WHERE invitation_token = $1 
         AND invitation_expires > NOW() 
         AND status = 'invited'`,
      [token]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    const user = result.rows[0];

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Activate user
    await db.query(
      `UPDATE users SET 
        password_hash = $2,
        status = 'active',
        invitation_token = NULL,
        invitation_expires = NULL,
        email_verified = true,
        email_verified_at = NOW(),
        updated_at = NOW()
       WHERE id = $1`,
      [user.id, passwordHash]
    );

    // Log activity
    const { activityLog } = await import('../services/activity.js');
    await activityLog.log({
      userId: user.id,
      organizationId: user.organization_id,
      action: 'invitation_accepted',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Auto-login
    const fullUser = await db.query(`SELECT * FROM users WHERE id = $1`, [user.id]);
    const loginResult = await authService.completeLogin(fullUser.rows[0], {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Set cookies
    res.cookie('accessToken', loginResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', loginResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ 
      success: true, 
      user: loginResult.user,
      message: 'Welcome to Uplift!' 
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = await db.query(
      `SELECT id, email, first_name, organization_id 
       FROM users 
       WHERE email_verification_token = $1 
         AND email_verification_expires > NOW()`,
      [token]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];

    await db.query(
      `UPDATE users SET 
        email_verified = true,
        email_verified_at = NOW(),
        email_verification_token = NULL,
        email_verification_expires = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Log activity
    const { activityLog } = await import('../services/activity.js');
    await activityLog.log({
      userId: user.id,
      organizationId: user.organization_id,
      action: 'email_verified',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification
 */
router.post('/resend-verification', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, email_verified FROM users WHERE id = $1`,
      [req.user.userId]
    );

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.query(
      `UPDATE users SET 
        email_verification_token = $2,
        email_verification_expires = $3,
        updated_at = NOW()
       WHERE id = $1`,
      [user.id, verificationToken, verificationExpires]
    );

    const { emailService } = await import('../services/email.js');
    await emailService.sendEmailVerification(user, verificationToken);

    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification' });
  }
});

// ============================================================
// SSO ROUTES
// ============================================================

/**
 * POST /api/auth/sso/check
 * Check if SSO is configured for an email domain
 */
router.post('/sso/check', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.getSsoRedirectUrl(email);

    if (result) {
      res.json({
        ssoRequired: true,
        provider: result.provider,
        redirectUrl: result.redirectUrl,
      });
    } else {
      res.json({ ssoRequired: false });
    }
  } catch (error) {
    console.error('SSO check error:', error);
    res.status(500).json({ error: 'Failed to check SSO configuration' });
  }
});

/**
 * GET /api/auth/sso/:provider/callback
 * Handle SSO callback from providers (Google, Microsoft, Okta)
 */
router.get('/sso/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`${process.env.PORTAL_URL}/login?error=sso_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.PORTAL_URL}/login?error=sso_invalid`);
    }

    // Verify state
    const stateResult = await db.query(
      `SELECT * FROM sso_states WHERE state = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [state]
    );

    if (!stateResult.rows[0]) {
      return res.redirect(`${process.env.PORTAL_URL}/login?error=sso_expired`);
    }

    const ssoState = stateResult.rows[0];

    // Mark state as used
    await db.query(
      `UPDATE sso_states SET used_at = NOW() WHERE id = $1`,
      [ssoState.id]
    );

    // Get SSO config
    const configResult = await db.query(
      `SELECT * FROM sso_configurations 
       WHERE organization_id = $1 AND provider = $2 AND enabled = TRUE`,
      [ssoState.organization_id, provider]
    );

    if (!configResult.rows[0]) {
      return res.redirect(`${process.env.PORTAL_URL}/login?error=sso_not_configured`);
    }

    const config = configResult.rows[0];
    let profile;

    // Exchange code for tokens and get profile
    if (provider === 'google') {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.client_id,
          client_secret: config.client_secret,
          redirect_uri: `${process.env.API_URL}/api/auth/sso/google/callback`,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json();

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const googleProfile = await profileRes.json();

      profile = {
        id: googleProfile.id,
        email: googleProfile.email,
        firstName: googleProfile.given_name,
        lastName: googleProfile.family_name,
        picture: googleProfile.picture,
      };
    } else if (provider === 'microsoft') {
      const tokenRes = await fetch(`https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.client_id,
          client_secret: config.client_secret,
          redirect_uri: `${process.env.API_URL}/api/auth/sso/microsoft/callback`,
          grant_type: 'authorization_code',
          scope: 'openid email profile',
        }),
      });
      const tokens = await tokenRes.json();

      const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const msProfile = await profileRes.json();

      profile = {
        id: msProfile.id,
        email: msProfile.mail || msProfile.userPrincipalName,
        firstName: msProfile.givenName,
        lastName: msProfile.surname,
        displayName: msProfile.displayName,
      };
    } else if (provider === 'okta') {
      const tokenRes = await fetch(`${config.entry_point.replace('/authorize', '/token')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.client_id,
          client_secret: config.client_secret,
          redirect_uri: `${process.env.API_URL}/api/auth/sso/okta/callback`,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json();

      const profileRes = await fetch(`${config.entry_point.replace('/authorize', '/userinfo')}`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const oktaProfile = await profileRes.json();

      profile = {
        id: oktaProfile.sub,
        email: oktaProfile.email,
        firstName: oktaProfile.given_name,
        lastName: oktaProfile.family_name,
      };
    }

    if (!profile || !profile.email) {
      return res.redirect(`${process.env.PORTAL_URL}/login?error=sso_profile_error`);
    }

    // Complete SSO login
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const loginResult = await authService.handleSsoCallback(
      provider,
      profile,
      ssoState.organization_id,
      deviceInfo
    );

    // Set cookies
    setRefreshTokenCookie(res, loginResult.refreshToken, loginResult.refreshTokenExpiresAt);
    setAccessTokenCookie(res, loginResult.accessToken);

    // Redirect to portal
    res.redirect(`${process.env.PORTAL_URL}/dashboard`);
  } catch (error) {
    console.error('SSO callback error:', error);
    res.redirect(`${process.env.PORTAL_URL}/login?error=sso_error`);
  }
});

/**
 * GET /api/auth/sso/config
 * Get SSO configuration for organization (admin only)
 */
router.get('/sso/config', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const configs = await authService.getSsoConfig(req.user.organizationId);

    // Don't expose secrets
    const safeConfigs = configs.map(c => ({
      id: c.id,
      provider: c.provider,
      domain: c.domain,
      enabled: c.enabled,
      ssoJitProvisioning: c.sso_jit_provisioning,
      createdAt: c.created_at,
    }));

    res.json({ configurations: safeConfigs });
  } catch (error) {
    console.error('Get SSO config error:', error);
    res.status(500).json({ error: 'Failed to get SSO configuration' });
  }
});

/**
 * POST /api/auth/sso/config
 * Configure SSO for organization (admin only)
 */
router.post('/sso/config', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { provider, clientId, clientSecret, tenantId, entryPoint, certificate, domain } = req.body;

    if (!provider || !domain) {
      return res.status(400).json({ error: 'Provider and domain are required' });
    }

    await authService.configureSso(req.user.organizationId, provider, {
      clientId,
      clientSecret,
      tenantId,
      entryPoint,
      certificate,
      domain,
    });

    res.json({ success: true, message: 'SSO configured successfully' });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    console.error('Configure SSO error:', error);
    res.status(500).json({ error: 'Failed to configure SSO' });
  }
});

/**
 * POST /api/auth/sso/test
 * Test SSO connection by validating metadata URL or SSO endpoint
 * Attempts to fetch and parse IdP metadata to verify configuration
 */
router.post('/sso/test', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { provider, metadataUrl, ssoUrl, entityId } = req.body;

    // Need at least one URL to test
    const urlToTest = metadataUrl || ssoUrl;
    if (!urlToTest) {
      return res.status(400).json({
        success: false,
        error: 'A metadata URL or SSO URL is required to test the connection'
      });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(urlToTest);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        details: { errorCode: 'INVALID_URL' }
      });
    }

    // Ensure HTTPS for security
    if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      return res.status(400).json({
        success: false,
        error: 'SSO endpoints must use HTTPS',
        details: { errorCode: 'HTTPS_REQUIRED' }
      });
    }

    try {
      // Attempt to fetch the URL with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(urlToTest, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, application/samlmetadata+xml, */*',
          'User-Agent': 'Uplift-SSO-Validator/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.json({
          success: false,
          error: `Failed to fetch metadata: HTTP ${response.status} ${response.statusText}`,
          details: {
            errorCode: 'HTTP_ERROR',
            httpStatus: response.status,
          }
        });
      }

      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();

      // Determine what type of response we got
      let detectedInfo = {
        provider: provider || 'unknown',
      };

      // Try to parse as SAML metadata XML
      if (contentType.includes('xml') || body.trim().startsWith('<?xml') || body.includes('EntityDescriptor')) {
        // Look for common SAML metadata elements
        const entityIdMatch = body.match(/entityID="([^"]+)"/);
        const ssoLocationMatch = body.match(/SingleSignOnService[^>]+Location="([^"]+)"/);
        const idpSsoMatch = body.match(/IDPSSODescriptor/);
        const x509Match = body.match(/X509Certificate>([^<]+)</);

        if (entityIdMatch || ssoLocationMatch || idpSsoMatch) {
          detectedInfo = {
            ...detectedInfo,
            entityId: entityIdMatch ? entityIdMatch[1] : null,
            ssoUrl: ssoLocationMatch ? ssoLocationMatch[1] : null,
            hasCertificate: !!x509Match,
            metadataType: 'SAML',
          };

          // Try to detect the IdP provider from the metadata
          if (body.includes('okta.com') || body.includes('Okta')) {
            detectedInfo.provider = 'Okta';
          } else if (body.includes('microsoftonline.com') || body.includes('Azure')) {
            detectedInfo.provider = 'Azure AD';
          } else if (body.includes('google.com/a/') || body.includes('Google')) {
            detectedInfo.provider = 'Google Workspace';
          } else if (body.includes('onelogin.com') || body.includes('OneLogin')) {
            detectedInfo.provider = 'OneLogin';
          }

          return res.json({
            success: true,
            message: 'Connection successful - SAML metadata received and validated',
            details: detectedInfo,
          });
        }
      }

      // Try to parse as OIDC discovery document
      if (contentType.includes('json') || body.trim().startsWith('{')) {
        try {
          const oidcConfig = JSON.parse(body);
          if (oidcConfig.issuer || oidcConfig.authorization_endpoint) {
            detectedInfo = {
              ...detectedInfo,
              entityId: oidcConfig.issuer || null,
              ssoUrl: oidcConfig.authorization_endpoint || null,
              tokenUrl: oidcConfig.token_endpoint || null,
              metadataType: 'OIDC',
            };

            return res.json({
              success: true,
              message: 'Connection successful - OIDC discovery document received',
              details: detectedInfo,
            });
          }
        } catch {
          // Not valid JSON, continue
        }
      }

      // We got a response but couldn't parse it as IdP metadata
      // Still consider it a partial success - the URL is reachable
      return res.json({
        success: true,
        message: 'Connection successful - endpoint is reachable',
        details: {
          ...detectedInfo,
          note: 'Response received but could not parse as SAML or OIDC metadata. You may need to enter configuration details manually.',
        },
      });

    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        return res.json({
          success: false,
          error: 'Connection timed out - the IdP endpoint did not respond within 10 seconds',
          details: { errorCode: 'TIMEOUT' }
        });
      }

      // Network or DNS error
      return res.json({
        success: false,
        error: `Failed to connect: ${fetchError.message}`,
        details: {
          errorCode: 'CONNECTION_FAILED',
          technicalDetails: fetchError.code || fetchError.message,
        }
      });
    }

  } catch (error) {
    console.error('SSO test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal error while testing SSO connection',
      details: { errorCode: 'INTERNAL_ERROR' }
    });
  }
});

/**
 * DELETE /api/auth/sso/config/:provider
 * Remove SSO configuration (admin only)
 */
router.delete('/sso/config/:provider', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { provider } = req.params;

    await db.query(
      `DELETE FROM sso_configurations
       WHERE organization_id = $1 AND provider = $2`,
      [req.user.organizationId, provider]
    );

    res.json({ success: true, message: 'SSO configuration removed' });
  } catch (error) {
    console.error('Remove SSO config error:', error);
    res.status(500).json({ error: 'Failed to remove SSO configuration' });
  }
});

// ============================================================
// PERMISSIONS ROUTES
// ============================================================

/**
 * GET /api/auth/permissions
 * Get all available permissions
 */
router.get('/permissions', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const permissions = await authService.getAllPermissions();

    // Group by category
    const grouped = permissions.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});

    res.json({ permissions: grouped });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

/**
 * GET /api/auth/roles/:role/permissions
 * Get permissions for a specific role
 */
router.get('/roles/:role/permissions', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { role } = req.params;
    const permissions = await authService.getRolePermissions(role);

    res.json({ role, permissions });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ error: 'Failed to get role permissions' });
  }
});

/**
 * PUT /api/auth/roles/:role/permissions
 * Update permissions for a role (superadmin only)
 */
router.put('/roles/:role/permissions', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin access required' });
    }

    const { role } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'permissionIds must be an array' });
    }

    await authService.updateRolePermissions(role, permissionIds, req.user.userId);

    res.json({ success: true, message: 'Role permissions updated' });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    console.error('Update role permissions error:', error);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

export default router;
