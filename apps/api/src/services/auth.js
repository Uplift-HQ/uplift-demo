// ============================================================
// AUTHENTICATION SERVICE
// JWT, refresh tokens, password reset, MFA (TOTP), SSO (Google, Microsoft, SAML)
// ============================================================

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { db } from '../lib/database.js';
import { emailService } from './email.js';
import { activityLog } from './activity.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-ME-set-JWT_SECRET-env-var-in-production-32chars';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set - using insecure fallback. Set JWT_SECRET env var!');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 30;
const PASSWORD_RESET_EXPIRES_HOURS = 2;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

// Configure otplib
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
  step: 30,  // 30 second intervals
};

// -------------------- TOKEN GENERATION --------------------

export const authService = {
  /**
   * Generate JWT access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        organizationId: user.organization_id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        employeeId: user.employee_id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  },

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId, deviceInfo = {}) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    const result = await db.query(
      `INSERT INTO refresh_tokens (user_id, token, device_info, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, token, JSON.stringify(deviceInfo), expiresAt]
    );

    return { id: result.rows[0].id, token, expiresAt };
  },

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthError('Token expired', 'TOKEN_EXPIRED');
      }
      throw new AuthError('Invalid token', 'INVALID_TOKEN');
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken, deviceInfo = {}) {
    const result = await db.query(
      `SELECT rt.*, u.* FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (!result.rows[0]) {
      throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const user = result.rows[0];
    
    if (user.status !== 'active') {
      throw new AuthError('Account is not active', 'ACCOUNT_INACTIVE');
    }

    // Token rotation: revoke old token, issue new one
    await this.revokeRefreshToken(refreshToken);
    const newRefreshToken = await this.generateRefreshToken(user.user_id, deviceInfo);

    // Get permissions
    const permsResult = await db.query(
      `SELECT p.permission_key FROM role_permissions rp 
       JOIN permissions p ON p.id = rp.permission_id 
       WHERE rp.role = $1`,
      [user.role]
    );
    user.permissions = permsResult.rows.map(r => r.permission_key);

    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: newRefreshToken.token,
      refreshTokenExpiresAt: newRefreshToken.expiresAt,
      user: this.sanitizeUser(user),
    };
  },

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token) {
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1`,
      [token]
    );
  },

  /**
   * Revoke all refresh tokens for user
   */
  async revokeAllUserTokens(userId) {
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() 
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  },

  // -------------------- PASSWORD AUTH --------------------

  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  },

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  /**
   * Login with email/password
   */
  async login(email, password, deviceInfo = {}) {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      throw new AuthError(
        `Account locked. Try again in ${minutesLeft} minutes`,
        'ACCOUNT_LOCKED'
      );
    }

    // Check status
    if (user.status === 'suspended') {
      throw new AuthError('Account suspended', 'ACCOUNT_SUSPENDED');
    }
    if (user.status === 'deactivated') {
      throw new AuthError('Account deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    if (!user.password_hash) {
      throw new AuthError('Please use SSO to login', 'SSO_REQUIRED');
    }

    const validPassword = await this.verifyPassword(password, user.password_hash);

    if (!validPassword) {
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        await db.query(
          `UPDATE users SET failed_login_attempts = $1, locked_until = $2, locked_reason = 'Too many failed login attempts' WHERE id = $3`,
          [failedAttempts, new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000), user.id]
        );
        
        await emailService.sendAccountLocked(user);
        await activityLog.logLogin(user, deviceInfo.ip, deviceInfo.userAgent, false, 'Account locked');
        
        throw new AuthError(
          `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes`,
          'ACCOUNT_LOCKED'
        );
      }

      await db.query(
        `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`,
        [failedAttempts, user.id]
      );
      
      await activityLog.logLogin(user, deviceInfo.ip, deviceInfo.userAgent, false, 'Invalid password');
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if force password change required
    if (user.force_password_change) {
      const changeToken = jwt.sign(
        { userId: user.id, type: 'force_password_change' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      return {
        requiresPasswordChange: true,
        changeToken,
      };
    }

    // Check if MFA required
    if (user.mfa_enabled) {
      const mfaToken = jwt.sign(
        { userId: user.id, type: 'mfa_pending' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      return {
        requiresMfa: true,
        mfaToken,
        mfaMethods: this.getAvailableMfaMethods(user),
      };
    }

    return this.completeLogin(user, deviceInfo);
  },

  getAvailableMfaMethods(user) {
    const methods = [];
    if (user.mfa_secret) {
      methods.push({ type: 'totp', name: 'Authenticator App' });
    }
    if (user.mfa_backup_codes?.length > 0) {
      methods.push({ type: 'backup', name: 'Backup Code', remaining: user.mfa_backup_codes.length });
    }
    return methods;
  },

  /**
   * Complete login (after MFA if required)
   */
  async completeLogin(user, deviceInfo = {}) {
    const isNewDevice = await this.checkNewDevice(user.id, deviceInfo);
    
    await db.query(
      `UPDATE users SET 
        failed_login_attempts = 0, 
        locked_until = NULL,
        locked_reason = NULL,
        last_login_at = NOW(),
        last_login_ip = $2,
        last_login_device = $3
       WHERE id = $1`,
      [user.id, deviceInfo.ip, deviceInfo.userAgent]
    );

    // Get permissions
    const permsResult = await db.query(
      `SELECT p.permission_key FROM role_permissions rp 
       JOIN permissions p ON p.id = rp.permission_id 
       WHERE rp.role = $1`,
      [user.role]
    );
    user.permissions = permsResult.rows.map(r => r.permission_key);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, deviceInfo);
    
    await this.createSession(user.id, refreshToken.id, deviceInfo);
    await activityLog.logLogin(user, deviceInfo.ip, deviceInfo.userAgent, true);
    
    if (isNewDevice) {
      const parsedDevice = activityLog.parseUserAgent(deviceInfo.userAgent);
      await emailService.sendNewDeviceLogin(user, {
        device: parsedDevice?.deviceType,
        browser: parsedDevice?.browser,
        location: deviceInfo.location,
        ip: deviceInfo.ip,
      });
    }

    return {
      accessToken,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      user: this.sanitizeUser(user),
    };
  },

  async checkNewDevice(userId, deviceInfo) {
    if (!deviceInfo.userAgent) return false;
    
    const result = await db.query(
      `SELECT 1 FROM sessions WHERE user_id = $1 AND device_info->>'userAgent' = $2 LIMIT 1`,
      [userId, deviceInfo.userAgent]
    );
    
    return result.rows.length === 0;
  },

  async createSession(userId, refreshTokenId, deviceInfo) {
    try {
      await db.query(
        `INSERT INTO sessions (user_id, refresh_token_id, device_info, ip_address, last_active_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, refreshTokenId, JSON.stringify(deviceInfo), deviceInfo.ip]
      );
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  },

  // -------------------- REGISTRATION --------------------

  async register(userData, deviceInfo = {}) {
    const { email, password, firstName, lastName, organizationName } = userData;
    
    const existing = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    
    if (existing.rows[0]) {
      throw new AuthError('Email already registered', 'EMAIL_EXISTS');
    }

    const passwordHash = await this.hashPassword(password);

    let organizationId;
    if (organizationName) {
      const orgResult = await db.query(
        `INSERT INTO organizations (name, slug)
         VALUES ($1, $2)
         RETURNING id`,
        [organizationName, organizationName.toLowerCase().replace(/\s+/g, '-')]
      );
      organizationId = orgResult.rows[0].id;
    }

    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, organization_id, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [email.toLowerCase(), passwordHash, firstName, lastName, organizationId, organizationId ? 'admin' : 'worker']
    );

    const user = result.rows[0];
    await emailService.sendWelcome(user);
    await this.logAuthEvent(user.id, organizationId, 'registration', { ip: deviceInfo.ip });

    return this.completeLogin(user, deviceInfo);
  },

  // -------------------- PASSWORD RESET --------------------

  async requestPasswordReset(email, deviceInfo = {}) {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) return { success: true };

    if (!user.password_hash && user.sso_provider) {
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_HOURS * 60 * 60 * 1000);

    await db.query(
      `UPDATE users SET 
        password_reset_token = $1,
        password_reset_expires = $2
       WHERE id = $3`,
      [tokenHash, expiresAt, user.id]
    );

    await emailService.sendPasswordReset(user, token);
    await this.logAuthEvent(user.id, user.organization_id, 'password_reset_requested', { ip: deviceInfo.ip });

    return { success: true };
  },

  async validateResetToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      `SELECT id, email FROM users 
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [tokenHash]
    );

    return result.rows[0] ? { valid: true, email: result.rows[0].email } : { valid: false };
  },

  async resetPassword(token, newPassword) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      `SELECT id FROM users 
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [tokenHash]
    );

    if (!result.rows[0]) {
      throw new AuthError('Invalid or expired reset token', 'INVALID_TOKEN');
    }

    const userId = result.rows[0].id;
    const passwordHash = await this.hashPassword(newPassword);

    await db.query(
      `UPDATE users SET 
        password_hash = $1,
        password_reset_token = NULL,
        password_reset_expires = NULL,
        password_changed_at = NOW(),
        force_password_change = FALSE
       WHERE id = $2`,
      [passwordHash, userId]
    );

    await this.revokeAllUserTokens(userId);

    const user = await db.query(`SELECT organization_id FROM users WHERE id = $1`, [userId]);
    await this.logAuthEvent(userId, user.rows[0].organization_id, 'password_reset', {});

    return { success: true };
  },

  async changePassword(userId, currentPassword, newPassword, deviceInfo = {}) {
    const result = await db.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user.password_hash) {
      throw new AuthError('Cannot change password for SSO accounts', 'SSO_ACCOUNT');
    }

    const valid = await this.verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      throw new AuthError('Current password is incorrect', 'INVALID_PASSWORD');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await db.query(
      `UPDATE users SET 
        password_hash = $1, 
        password_changed_at = NOW(),
        force_password_change = false,
        updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, userId]
    );

    await activityLog.logPasswordChange(userId, user.organization_id, deviceInfo.ip, deviceInfo.userAgent, false);
    await emailService.sendPasswordChanged(user, deviceInfo);

    return { success: true };
  },

  // -------------------- MFA (TOTP) --------------------

  /**
   * Generate MFA setup (secret + QR code)
   */
  async setupMfa(userId) {
    const result = await db.query(
      `SELECT email, first_name, last_name FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    // Generate secret using otplib
    const secret = authenticator.generateSecret();
    
    // Store secret (not enabled yet - need verification)
    await db.query(
      `UPDATE users SET mfa_secret = $1, mfa_enabled = FALSE WHERE id = $2`,
      [secret, userId]
    );

    // Generate OTP Auth URL
    const accountName = user.email;
    const issuer = 'Uplift';
    const otpAuthUrl = authenticator.keyuri(accountName, issuer, secret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Generate backup codes
    const backupCodes = Array(10).fill(null).map(() => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store backup codes (hashed for security)
    const hashedBackupCodes = backupCodes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );
    
    await db.query(
      `UPDATE users SET mfa_backup_codes = $1 WHERE id = $2`,
      [hashedBackupCodes, userId]
    );

    return {
      secret,
      otpAuthUrl,
      qrCode: qrCodeDataUrl,
      backupCodes,
    };
  },

  /**
   * Verify MFA code and enable MFA
   */
  async verifyAndEnableMfa(userId, code) {
    const result = await db.query(
      `SELECT mfa_secret, organization_id FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user?.mfa_secret) {
      throw new AuthError('MFA not set up. Call /mfa/setup first', 'MFA_NOT_SETUP');
    }

    // Verify TOTP code using otplib
    const isValid = authenticator.verify({ token: code, secret: user.mfa_secret });
    
    if (!isValid) {
      throw new AuthError('Invalid MFA code', 'INVALID_MFA_CODE');
    }

    // Enable MFA
    await db.query(
      `UPDATE users SET mfa_enabled = TRUE WHERE id = $1`,
      [userId]
    );

    await this.logAuthEvent(userId, user.organization_id, 'mfa_enabled', {});

    return { 
      success: true,
      message: 'MFA enabled successfully. Save your backup codes in a secure location.'
    };
  },

  /**
   * Verify MFA during login
   */
  async verifyMfaLogin(mfaToken, code, method = 'totp', deviceInfo = {}) {
    let payload;
    try {
      payload = jwt.verify(mfaToken, JWT_SECRET);
    } catch {
      throw new AuthError('MFA session expired. Please login again.', 'INVALID_MFA_SESSION');
    }

    if (payload.type !== 'mfa_pending') {
      throw new AuthError('Invalid MFA session', 'INVALID_MFA_SESSION');
    }

    const result = await db.query(
      `SELECT * FROM users WHERE id = $1`,
      [payload.userId]
    );

    const user = result.rows[0];
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    let isValid = false;

    if (method === 'totp' || method === 'authenticator') {
      isValid = authenticator.verify({ token: code, secret: user.mfa_secret });
    } else if (method === 'backup') {
      const codeHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
      
      if (user.mfa_backup_codes?.includes(codeHash)) {
        isValid = true;
        const remainingCodes = user.mfa_backup_codes.filter(c => c !== codeHash);
        await db.query(
          `UPDATE users SET mfa_backup_codes = $1 WHERE id = $2`,
          [remainingCodes, user.id]
        );
        
        if (remainingCodes.length <= 2) {
          await emailService.sendLowBackupCodes(user, remainingCodes.length);
        }
      }
    }

    if (!isValid) {
      await this.logAuthEvent(user.id, user.organization_id, 'mfa_failed', { 
        method,
        ip: deviceInfo.ip 
      });
      throw new AuthError('Invalid MFA code', 'INVALID_MFA_CODE');
    }

    return this.completeLogin(user, deviceInfo);
  },

  /**
   * Disable MFA
   */
  async disableMfa(userId, password) {
    const result = await db.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    const valid = await this.verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new AuthError('Invalid password', 'INVALID_PASSWORD');
    }

    await db.query(
      `UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1`,
      [userId]
    );

    await this.logAuthEvent(userId, user.organization_id, 'mfa_disabled', {});
    await emailService.sendMfaDisabled(user);

    return { success: true };
  },

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId, password) {
    const result = await db.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    const valid = await this.verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new AuthError('Invalid password', 'INVALID_PASSWORD');
    }

    const backupCodes = Array(10).fill(null).map(() => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    const hashedBackupCodes = backupCodes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );
    
    await db.query(
      `UPDATE users SET mfa_backup_codes = $1 WHERE id = $2`,
      [hashedBackupCodes, userId]
    );

    await this.logAuthEvent(userId, user.organization_id, 'mfa_backup_codes_regenerated', {});

    return { backupCodes };
  },

  // -------------------- SSO --------------------

  async getSsoConfig(organizationId) {
    const result = await db.query(
      `SELECT * FROM sso_configurations WHERE organization_id = $1 AND enabled = TRUE`,
      [organizationId]
    );
    return result.rows;
  },

  async configureSso(organizationId, provider, config) {
    const { clientId, clientSecret, tenantId, entryPoint, certificate, domain } = config;

    const validProviders = ['google', 'microsoft', 'saml', 'okta'];
    if (!validProviders.includes(provider)) {
      throw new AuthError('Invalid SSO provider', 'INVALID_PROVIDER');
    }

    await db.query(
      `INSERT INTO sso_configurations 
        (organization_id, provider, client_id, client_secret, tenant_id, entry_point, certificate, domain, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       ON CONFLICT (organization_id, provider) 
       DO UPDATE SET 
        client_id = $3,
        client_secret = $4,
        tenant_id = $5,
        entry_point = $6,
        certificate = $7,
        domain = $8,
        enabled = TRUE,
        updated_at = NOW()`,
      [organizationId, provider, clientId, clientSecret, tenantId, entryPoint, certificate, domain]
    );

    return { success: true };
  },

  async handleSsoCallback(provider, profile, organizationId = null, deviceInfo = {}) {
    let result = await db.query(
      `SELECT * FROM users WHERE sso_provider = $1 AND sso_id = $2`,
      [provider, profile.id]
    );

    let user = result.rows[0];

    if (!user) {
      result = await db.query(
        `SELECT * FROM users WHERE email = $1`,
        [profile.email.toLowerCase()]
      );

      user = result.rows[0];

      if (user) {
        await db.query(
          `UPDATE users SET sso_provider = $1, sso_id = $2 WHERE id = $3`,
          [provider, profile.id, user.id]
        );
      } else if (organizationId) {
        const orgResult = await db.query(
          `SELECT sso_jit_provisioning, sso_default_role FROM organizations WHERE id = $1`,
          [organizationId]
        );
        
        const org = orgResult.rows[0];
        
        if (org?.sso_jit_provisioning) {
          const newUserResult = await db.query(
            `INSERT INTO users (
              email, first_name, last_name, organization_id, 
              sso_provider, sso_id, role, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            RETURNING *`,
            [
              profile.email.toLowerCase(),
              profile.firstName || profile.displayName?.split(' ')[0] || 'User',
              profile.lastName || profile.displayName?.split(' ').slice(1).join(' ') || '',
              organizationId,
              provider,
              profile.id,
              org.sso_default_role || 'worker'
            ]
          );
          
          user = newUserResult.rows[0];
          
          await this.logAuthEvent(user.id, organizationId, 'sso_jit_provisioned', {
            provider,
            email: profile.email
          });
        }
      }
    }

    if (!user) {
      throw new AuthError('No account found. Please contact your administrator.', 'SSO_NO_ACCOUNT');
    }

    if (user.status !== 'active') {
      throw new AuthError('Account is not active', 'ACCOUNT_INACTIVE');
    }

    await this.logAuthEvent(user.id, user.organization_id, 'sso_login', {
      provider,
      ip: deviceInfo.ip
    });

    return this.completeLogin(user, deviceInfo);
  },

  async getSsoRedirectUrl(email) {
    const domain = email.split('@')[1];
    
    const result = await db.query(
      `SELECT sc.*, o.id as org_id FROM sso_configurations sc
       JOIN organizations o ON o.id = sc.organization_id
       WHERE sc.domain = $1 AND sc.enabled = TRUE`,
      [domain]
    );

    if (!result.rows[0]) {
      return null;
    }

    const config = result.rows[0];
    
    const state = crypto.randomBytes(32).toString('hex');
    
    await db.query(
      `INSERT INTO sso_states (state, organization_id, provider, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [state, config.org_id, config.provider]
    );

    let redirectUrl;
    const callbackUrl = `${process.env.API_URL}/api/auth/sso/${config.provider}/callback`;

    switch (config.provider) {
      case 'google':
        redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${config.client_id}` +
          `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
          `&response_type=code` +
          `&scope=openid%20email%20profile` +
          `&state=${state}`;
        break;
        
      case 'microsoft':
        redirectUrl = `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/authorize?` +
          `client_id=${config.client_id}` +
          `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
          `&response_type=code` +
          `&scope=openid%20email%20profile` +
          `&state=${state}`;
        break;
        
      case 'okta':
        redirectUrl = `${config.entry_point}?` +
          `client_id=${config.client_id}` +
          `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
          `&response_type=code` +
          `&scope=openid%20email%20profile` +
          `&state=${state}`;
        break;
        
      case 'saml':
        redirectUrl = config.entry_point;
        break;
    }

    return {
      provider: config.provider,
      redirectUrl,
      state,
    };
  },

  // -------------------- PERMISSIONS --------------------

  hasPermission(user, permission) {
    if (user.role === 'superadmin') return true;
    return user.permissions?.includes(permission);
  },

  async getRolePermissions(role) {
    const result = await db.query(
      `SELECT p.* FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role = $1
       ORDER BY p.category, p.name`,
      [role]
    );
    return result.rows;
  },

  async getAllPermissions() {
    const result = await db.query(
      `SELECT * FROM permissions ORDER BY category, name`
    );
    return result.rows;
  },

  async updateRolePermissions(role, permissionIds, updatedBy) {
    if (role === 'superadmin') {
      throw new AuthError('Cannot modify superadmin permissions', 'FORBIDDEN');
    }

    await db.query(
      `DELETE FROM role_permissions WHERE role = $1`,
      [role]
    );

    if (permissionIds.length > 0) {
      const values = permissionIds.map((id, i) => `($1, $${i + 2})`).join(', ');
      await db.query(
        `INSERT INTO role_permissions (role, permission_id) VALUES ${values}`,
        [role, ...permissionIds]
      );
    }

    return { success: true };
  },

  // -------------------- HELPERS --------------------

  sanitizeUser(user) {
    return {
      id: user.id,
      organizationId: user.organization_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar_url,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions || [],
      employeeId: user.employee_id,
      mfaEnabled: user.mfa_enabled,
      ssoProvider: user.sso_provider,
      status: user.status,
      language: user.language || 'en',
    };
  },

  async logAuthEvent(userId, organizationId, action, metadata) {
    try {
      await db.query(
        `INSERT INTO audit_log (user_id, organization_id, action, entity_type, entity_id, new_values, ip_address)
         VALUES ($1, $2, $3, 'user', $1, $4, $5)`,
        [userId, organizationId, action, JSON.stringify(metadata), metadata.ip]
      );
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  },

  async getUserById(userId) {
    const result = await db.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );
    
    if (!result.rows[0]) return null;
    
    const user = result.rows[0];
    const permsResult = await db.query(
      `SELECT p.permission_key FROM role_permissions rp 
       JOIN permissions p ON p.id = rp.permission_id 
       WHERE rp.role = $1`,
      [user.role]
    );
    user.permissions = permsResult.rows.map(r => r.permission_key);
    
    return this.sanitizeUser(user);
  },

  async getUserSessions(userId) {
    const result = await db.query(
      `SELECT s.id, s.device_info, s.ip_address, s.last_active_at, s.created_at
       FROM sessions s
       JOIN refresh_tokens rt ON rt.id = s.refresh_token_id
       WHERE s.user_id = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
       ORDER BY s.last_active_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async revokeSession(userId, sessionId) {
    const result = await db.query(
      `SELECT refresh_token_id FROM sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (!result.rows[0]) {
      throw new AuthError('Session not found', 'SESSION_NOT_FOUND');
    }

    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [result.rows[0].refresh_token_id]
    );

    return { success: true };
  },
};

class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

export { AuthError };
export default authService;
