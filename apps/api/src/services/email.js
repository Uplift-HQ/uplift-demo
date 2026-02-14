// ============================================================
// EMAIL SERVICE
// Email notifications for security and account events
// Multi-language support: en, de, fr, es, pt, pl, zh, ar
// ============================================================

import { db } from '../lib/database.js';
import postmark from 'postmark';
import { getTemplate, isLanguageSupported, isRTL } from './emailTemplates/index.js';

// Configure Postmark if server token is available
const postmarkClient = process.env.POSTMARK_SERVER_TOKEN
  ? new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN)
  : null;

if (postmarkClient) {
  console.log('[email] Postmark configured');
} else {
  console.log('[email] No POSTMARK_SERVER_TOKEN — emails will log to console');
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@uplift.app';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@uplift.app';

// Default branding values (can be overridden by organization settings)
const DEFAULT_PRIMARY_COLOR = '#F26522';
const DEFAULT_TEAM_NAME = process.env.EMAIL_TEAM_NAME || 'The Uplift Team';

/**
 * Get organization branding for emails
 * @param {string} organizationId - Organization ID
 * @returns {object} Branding object with primaryColor and teamName
 */
async function getOrgBranding(organizationId) {
  if (!organizationId) {
    return { primaryColor: DEFAULT_PRIMARY_COLOR, teamName: DEFAULT_TEAM_NAME };
  }
  try {
    const result = await db.query(
      `SELECT name, primary_color FROM organizations WHERE id = $1`,
      [organizationId]
    );
    if (result.rows[0]) {
      return {
        primaryColor: result.rows[0].primary_color || DEFAULT_PRIMARY_COLOR,
        teamName: result.rows[0].name ? `The ${result.rows[0].name} Team` : DEFAULT_TEAM_NAME,
      };
    }
  } catch (error) {
    console.warn('Failed to get org branding for email:', error.message);
  }
  return { primaryColor: DEFAULT_PRIMARY_COLOR, teamName: DEFAULT_TEAM_NAME };
}

// Legacy templates (fallback) - kept for backwards compatibility
const templates = {
  password_changed: {
    subject: 'Your Uplift password was changed',
    html: (data) => `
      <h2>Password Changed</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your Uplift account password was changed on ${new Date().toLocaleString()}.</p>
      <p><strong>Device:</strong> ${data.device || 'Unknown'}</p>
      <p><strong>IP Address:</strong> ${data.ipAddress || 'Unknown'}</p>
      <p>If you didn't make this change, please contact your administrator immediately and reset your password.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Password Changed

Hi ${data.firstName},

Your Uplift account password was changed on ${new Date().toLocaleString()}.

Device: ${data.device || 'Unknown'}
IP Address: ${data.ipAddress || 'Unknown'}

If you didn't make this change, please contact your administrator immediately.

— The Uplift Team
    `,
  },

  new_device_login: {
    subject: 'New device login to your Uplift account',
    html: (data) => `
      <h2>New Device Login</h2>
      <p>Hi ${data.firstName},</p>
      <p>We noticed a new sign-in to your Uplift account:</p>
      <ul>
        <li><strong>Device:</strong> ${data.device || 'Unknown'}</li>
        <li><strong>Browser:</strong> ${data.browser || 'Unknown'}</li>
        <li><strong>Location:</strong> ${data.location || 'Unknown'}</li>
        <li><strong>IP Address:</strong> ${data.ipAddress || 'Unknown'}</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>If this was you, you can ignore this email. If you don't recognize this activity, please change your password immediately and enable two-factor authentication.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
New Device Login

Hi ${data.firstName},

We noticed a new sign-in to your Uplift account:

Device: ${data.device || 'Unknown'}
Browser: ${data.browser || 'Unknown'}
Location: ${data.location || 'Unknown'}
IP Address: ${data.ipAddress || 'Unknown'}
Time: ${new Date().toLocaleString()}

If this was you, you can ignore this email. If you don't recognize this activity, please change your password immediately.

— The Uplift Team
    `,
  },

  account_locked: {
    subject: 'Your Uplift account has been locked',
    html: (data) => `
      <h2>Account Locked</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your Uplift account has been temporarily locked due to multiple failed login attempts.</p>
      <p>Your account will be automatically unlocked in <strong>30 minutes</strong>.</p>
      <p>If you need immediate access, please contact your administrator to unlock your account.</p>
      <p>If you didn't attempt to log in, someone may be trying to access your account. We recommend changing your password once your account is unlocked.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Account Locked

Hi ${data.firstName},

Your Uplift account has been temporarily locked due to multiple failed login attempts.

Your account will be automatically unlocked in 30 minutes.

If you need immediate access, please contact your administrator.

— The Uplift Team
    `,
  },

  account_unlocked: {
    subject: 'Your Uplift account has been unlocked',
    html: (data) => `
      <h2>Account Unlocked</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your Uplift account has been unlocked by an administrator. You can now log in.</p>
      <p>If you've forgotten your password, please use the "Forgot Password" link on the login page.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Account Unlocked

Hi ${data.firstName},

Your Uplift account has been unlocked. You can now log in.

— The Uplift Team
    `,
  },

  password_reset_required: {
    subject: 'Password reset required for your Uplift account',
    html: (data) => `
      <h2>Password Reset Required</h2>
      <p>Hi ${data.firstName},</p>
      <p>An administrator has required you to change your password on your next login.</p>
      <p>Please log in to Uplift and set a new password.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Password Reset Required

Hi ${data.firstName},

An administrator has required you to change your password on your next login.

Please log in to Uplift and set a new password.

— The Uplift Team
    `,
  },

  invitation: {
    subject: 'You\'ve been invited to join Uplift',
    html: (data) => `
      <h2>You're Invited!</h2>
      <p>Hi ${data.firstName},</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> has invited you to join their team on Uplift.</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || 'https://app.uplifthq.co.uk'}/accept-invitation?token=${data.invitationToken}" 
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Accept Invitation
        </a>
      </p>
      <p>This invitation will expire in 7 days.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
You're Invited!

Hi ${data.firstName},

${data.invitedBy?.first_name} ${data.invitedBy?.last_name} has invited you to join their team on Uplift.

Accept your invitation: ${process.env.APP_URL || 'https://app.uplifthq.co.uk'}/accept-invitation?token=${data.invitationToken}

This invitation will expire in 7 days.

— The Uplift Team
    `,
  },

  password_reset: {
    subject: 'Reset your Uplift password',
    html: (data) => `
      <h2>Password Reset</h2>
      <p>Hi ${data.firstName},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || 'https://app.uplifthq.co.uk'}/reset-password?token=${data.resetToken}" 
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Password Reset

Hi ${data.firstName},

We received a request to reset your password.

Reset your password: ${process.env.APP_URL || 'https://app.uplifthq.co.uk'}/reset-password?token=${data.resetToken}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

— The Uplift Team
    `,
  },

  deletion_requested: {
    subject: 'Account deletion request received',
    html: (data) => `
      <h2>Account Deletion Requested</h2>
      <p>Hi ${data.firstName},</p>
      <p>We've received your request to delete your Uplift account.</p>
      <p>Your account and all associated data will be permanently deleted in <strong>30 days</strong>.</p>
      <p>If you change your mind, you can cancel this request by logging in to your account and going to Settings → My Account → Cancel Deletion.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Account Deletion Requested

Hi ${data.firstName},

We've received your request to delete your Uplift account.

Your account will be permanently deleted in 30 days.

If you change your mind, log in and go to Settings → My Account → Cancel Deletion.

— The Uplift Team
    `,
  },

  email_verification: {
    subject: 'Verify your Uplift email address',
    html: (data) => `
      <h2>Verify Your Email</h2>
      <p>Hi ${data.firstName},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || 'https://app.uplifthq.co.uk'}/verify-email?token=${data.verificationToken}" 
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verify Email
        </a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Verify Your Email

Hi ${data.firstName},

Please verify your email: ${process.env.APP_URL || 'https://app.uplifthq.co.uk'}/verify-email?token=${data.verificationToken}

This link will expire in 24 hours.

— The Uplift Team
    `,
  },

  account_deactivated: {
    subject: 'Your Uplift account has been deactivated',
    html: (data) => `
      <h2>Account Deactivated</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your Uplift account has been deactivated by an administrator.</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      <p>If you believe this was done in error, please contact your organization's administrator.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Account Deactivated

Hi ${data.firstName},

Your Uplift account has been deactivated by an administrator.

${data.reason ? `Reason: ${data.reason}` : ''}

If you believe this was done in error, please contact your administrator.

— The Uplift Team
    `,
  },

  payment_failed: {
    subject: 'Payment failed for your Uplift subscription',
    html: (data) => `
      <h2>Payment Failed</h2>
      <p>Hi ${data.firstName},</p>
      <p>We were unable to process your payment for your Uplift subscription.</p>
      <p><strong>Amount:</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p><strong>Invoice Number:</strong> ${data.invoiceNumber || 'N/A'}</p>
      <p>Please update your payment method to avoid any interruption to your service.</p>
      <p><a href="${data.billingPortalUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Update Payment Method</a></p>
      <p>If you need assistance, please contact our support team.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `
Payment Failed

Hi ${data.firstName},

We were unable to process your payment for your Uplift subscription.

Amount: ${data.currency} ${(data.amount / 100).toFixed(2)}
Invoice Number: ${data.invoiceNumber || 'N/A'}

Please update your payment method at: ${data.billingPortalUrl}

— The Uplift Team
    `,
  },

  // General notification template for in-app notifications sent via email
  notification: {
    subject: (data) => data.title,
    html: (data) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F26522; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Uplift</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin: 0 0 16px 0;">${data.title}</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">${data.body}</p>
          ${data.actionUrl ? `
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'https://app.uplifthq.co.uk'}${data.actionUrl}"
               style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Details
            </a>
          </p>
          ` : ''}
        </div>
        <div style="padding: 20px; background-color: #f8fafc; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            You're receiving this because you have email notifications enabled in your Uplift account.
          </p>
        </div>
      </div>
    `,
    text: (data) => `
${data.title}

${data.body}

${data.actionUrl ? `View details: ${process.env.APP_URL || 'https://app.uplifthq.co.uk'}${data.actionUrl}` : ''}

— The Uplift Team
    `,
  },
};

export const emailService = {
  /**
   * Queue an email for sending (with multi-language support)
   * @param {string} template - Template name (e.g., 'password_changed')
   * @param {string} toEmail - Recipient email
   * @param {string} toName - Recipient name
   * @param {object} data - Template data
   * @param {string} lang - Language code (default: 'en'). Supported: en, de, fr, es, pt, pl, zh, ar
   */
  async queueEmail(template, toEmail, toName, data, lang = 'en') {
    // Try to get localized template, fallback to English, then to legacy templates
    let templateConfig = getTemplate(template, lang);

    // If not found in new templates, try legacy templates
    if (!templateConfig) {
      templateConfig = templates[template];
    }

    if (!templateConfig) {
      console.error(`Unknown email template: ${template}`);
      return;
    }

    try {
      const subject = typeof templateConfig.subject === 'function'
        ? templateConfig.subject(data)
        : templateConfig.subject;

      await db.query(
        `INSERT INTO email_queue (to_email, to_name, template, template_data, subject, body_html, body_text, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          toEmail,
          toName,
          template,
          JSON.stringify(data),
          subject,
          templateConfig.html(data),
          templateConfig.text(data),
          lang,
        ]
      );
    } catch (error) {
      console.error('Failed to queue email:', error);
    }
  },

  /**
   * Send password changed notification
   * @param {object} user - User object with email, first_name, last_name, preferred_language
   * @param {object} deviceInfo - Device info (device, ip)
   */
  async sendPasswordChanged(user, deviceInfo = {}) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('password_changed', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
      device: deviceInfo.device,
      ipAddress: deviceInfo.ip,
      timestamp: new Date().toLocaleString(lang),
    }, lang);
  },

  /**
   * Send new device login alert
   */
  async sendNewDeviceLogin(user, deviceInfo = {}) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('new_device_login', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      location: deviceInfo.location,
      ipAddress: deviceInfo.ip,
      timestamp: new Date().toLocaleString(lang),
    }, lang);
  },

  /**
   * Send account locked notification
   */
  async sendAccountLocked(user) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('account_locked', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
    }, lang);
  },

  /**
   * Send account unlocked notification
   */
  async sendAccountUnlocked(user) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('account_unlocked', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
    }, lang);
  },

  /**
   * Send password reset required notification
   */
  async sendPasswordResetRequired(user) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('password_reset_required', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
    }, lang);
  },

  /**
   * Send invitation email
   */
  async sendInvitation(data) {
    const lang = data.preferred_language || 'en';
    await this.queueEmail('invitation', data.email, `${data.first_name} ${data.last_name}`, {
      firstName: data.first_name,
      invitationToken: data.invitationToken,
      invitedBy: data.invitedBy,
    }, lang);
  },

  /**
   * Send welcome email to new user
   */
  async sendWelcome(user) {
    const lang = user.preferred_language || 'en';
    const appUrl = process.env.APP_URL || 'https://app.uplifthq.co.uk';
    const branding = await getOrgBranding(user.organization_id);

    // Use inline template since welcome template may not exist in all languages
    const subject = 'Welcome to Uplift';
    const htmlBody = `
      <h2>Welcome to Uplift!</h2>
      <p>Hi ${user.first_name},</p>
      <p>Thank you for joining Uplift. Your account is now active and ready to use.</p>
      <p><a href="${appUrl}/login" style="display:inline-block;padding:12px 24px;background:${branding.primaryColor};color:white;text-decoration:none;border-radius:6px;">Login to Uplift</a></p>
      <p>If you have any questions, please contact your administrator or our support team.</p>
      <p>— ${branding.teamName}</p>
    `;
    const textBody = `Welcome to Uplift!\n\nHi ${user.first_name},\n\nThank you for joining Uplift. Your account is now active and ready to use.\n\nLogin at: ${appUrl}/login\n\n— ${branding.teamName}`;

    try {
      await db.query(
        `INSERT INTO email_queue (to_email, to_name, template, template_data, subject, body_html, body_text, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.email,
          `${user.first_name} ${user.last_name}`,
          'welcome',
          JSON.stringify({ firstName: user.first_name }),
          subject,
          htmlBody,
          textBody,
          lang,
        ]
      );
    } catch (error) {
      // Don't fail registration if email queueing fails
      console.error('Failed to queue welcome email:', error);
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(user, resetToken) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('password_reset', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
      resetToken,
    }, lang);
  },

  /**
   * Send deletion requested confirmation
   */
  async sendDeletionRequested(user) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('deletion_requested', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
    }, lang);
  },

  /**
   * Send email verification
   */
  async sendEmailVerification(user, verificationToken) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('email_verification', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
      verificationToken,
    }, lang);
  },

  /**
   * Send account deactivated notification
   */
  async sendAccountDeactivated(user, reason) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('account_deactivated', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
      reason,
    }, lang);
  },

  /**
   * Send low backup codes warning
   */
  async sendLowBackupCodes(user, remainingCount) {
    const lang = user.preferred_language || 'en';
    const appUrl = process.env.APP_URL || 'https://app.uplifthq.co.uk';
    const branding = await getOrgBranding(user.organization_id);

    const subject = 'Low MFA Backup Codes Warning';
    const htmlBody = `
      <h2>Low Backup Codes Warning</h2>
      <p>Hi ${user.first_name},</p>
      <p>You only have <strong>${remainingCount}</strong> MFA backup code${remainingCount === 1 ? '' : 's'} remaining.</p>
      <p>We recommend generating new backup codes to ensure you can always access your account.</p>
      <p><a href="${appUrl}/settings/security" style="display:inline-block;padding:12px 24px;background:${branding.primaryColor};color:white;text-decoration:none;border-radius:6px;">Manage Security Settings</a></p>
      <p>— ${branding.teamName}</p>
    `;
    const textBody = `Low Backup Codes Warning\n\nHi ${user.first_name},\n\nYou only have ${remainingCount} MFA backup code${remainingCount === 1 ? '' : 's'} remaining.\n\nGenerate new codes at: ${appUrl}/settings/security\n\n— ${branding.teamName}`;

    try {
      await db.query(
        `INSERT INTO email_queue (to_email, to_name, template, template_data, subject, body_html, body_text, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.email, `${user.first_name} ${user.last_name}`, 'low_backup_codes', JSON.stringify({ firstName: user.first_name, remainingCount }), subject, htmlBody, textBody, lang]
      );
    } catch (error) {
      console.error('Failed to queue low backup codes email:', error);
    }
  },

  /**
   * Send MFA disabled notification
   */
  async sendMfaDisabled(user) {
    const lang = user.preferred_language || 'en';
    const appUrl = process.env.APP_URL || 'https://app.uplifthq.co.uk';
    const branding = await getOrgBranding(user.organization_id);

    const subject = 'Two-Factor Authentication Disabled';
    const htmlBody = `
      <h2>Two-Factor Authentication Disabled</h2>
      <p>Hi ${user.first_name},</p>
      <p>Two-factor authentication has been disabled on your Uplift account.</p>
      <p>If you did not make this change, please re-enable 2FA immediately and contact your administrator.</p>
      <p><a href="${appUrl}/settings/security" style="display:inline-block;padding:12px 24px;background:${branding.primaryColor};color:white;text-decoration:none;border-radius:6px;">Security Settings</a></p>
      <p>— ${branding.teamName}</p>
    `;
    const textBody = `Two-Factor Authentication Disabled\n\nHi ${user.first_name},\n\nTwo-factor authentication has been disabled on your Uplift account.\n\nIf you did not make this change, please re-enable 2FA immediately.\n\nSecurity settings: ${appUrl}/settings/security\n\n— ${branding.teamName}`;

    try {
      await db.query(
        `INSERT INTO email_queue (to_email, to_name, template, template_data, subject, body_html, body_text, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.email, `${user.first_name} ${user.last_name}`, 'mfa_disabled', JSON.stringify({ firstName: user.first_name }), subject, htmlBody, textBody, lang]
      );
    } catch (error) {
      console.error('Failed to queue MFA disabled email:', error);
    }
  },

  /**
   * Send payment failed notification
   */
  async sendPaymentFailed(user, paymentData) {
    const lang = user.preferred_language || 'en';
    await this.queueEmail('payment_failed', user.email, `${user.first_name} ${user.last_name}`, {
      firstName: user.first_name,
      amount: paymentData.amount,
      currency: paymentData.currency?.toUpperCase() || 'GBP',
      invoiceNumber: paymentData.invoiceNumber,
      billingPortalUrl: paymentData.billingPortalUrl || `${process.env.API_URL}/settings/billing`,
    }, lang);
  },

  /**
   * Send a generic notification email
   * @param {string} email - Recipient email
   * @param {object} options - Notification options
   * @param {string} lang - Language code (default: 'en')
   */
  async sendNotification(email, { title, body, actionUrl }, lang = 'en') {
    await this.queueNotificationEmail(email, { title, body, actionUrl }, lang);
  },

  /**
   * Queue a notification email with dynamic subject (multi-language)
   */
  async queueNotificationEmail(toEmail, data, lang = 'en') {
    let templateConfig = getTemplate('notification', lang);
    if (!templateConfig) {
      templateConfig = templates.notification;
    }

    if (!templateConfig) {
      console.error('Notification template not found');
      return;
    }

    try {
      const subject = typeof templateConfig.subject === 'function'
        ? templateConfig.subject(data)
        : templateConfig.subject;

      await db.query(
        `INSERT INTO email_queue (to_email, to_name, template, template_data, subject, body_html, body_text, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          toEmail,
          null,
          'notification',
          JSON.stringify(data),
          subject,
          templateConfig.html(data),
          templateConfig.text(data),
          lang,
        ]
      );
    } catch (error) {
      console.error('Failed to queue notification email:', error);
    }
  },

  /**
   * Process email queue (call this from a background job)
   */
  async processQueue() {
    const result = await db.query(
      `SELECT * FROM email_queue
       WHERE status = 'pending' AND attempts < 3
       ORDER BY created_at ASC
       LIMIT 10`
    );

    for (const email of result.rows) {
      try {
        if (postmarkClient) {
          await postmarkClient.sendEmail({
            From: EMAIL_FROM,
            To: email.to_email,
            ReplyTo: EMAIL_REPLY_TO,
            Subject: email.subject,
            HtmlBody: email.body_html,
            TextBody: email.body_text,
            MessageStream: 'outbound',
          });
        } else {
          // Development: log instead of sending
          console.log(`[email] ${email.template} -> ${email.to_email}: ${email.subject}`);
        }

        await db.query(
          `UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [email.id]
        );
      } catch (error) {
        console.error(`Failed to send email ${email.id}:`, error);
        await db.query(
          `UPDATE email_queue SET attempts = attempts + 1, last_attempt_at = NOW(), error = $2 WHERE id = $1`,
          [email.id, error.message]
        );
      }
    }
  },
};

export default emailService;
