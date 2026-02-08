// ============================================================
// EMAIL TEMPLATES - English (en)
// ============================================================

const APP_URL = process.env.APP_URL || 'https://app.uplifthq.co.uk';

export default {
  password_changed: {
    subject: 'Your Uplift password was changed',
    html: (data) => `
      <h2>Password Changed</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your Uplift account password was changed on ${data.timestamp || new Date().toLocaleString('en')}.</p>
      <p><strong>Device:</strong> ${data.device || 'Unknown'}</p>
      <p><strong>IP Address:</strong> ${data.ipAddress || 'Unknown'}</p>
      <p>If you didn't make this change, please contact your administrator immediately and reset your password.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Password Changed\n\nHi ${data.firstName},\n\nYour Uplift account password was changed on ${data.timestamp || new Date().toLocaleString('en')}.\n\nDevice: ${data.device || 'Unknown'}\nIP Address: ${data.ipAddress || 'Unknown'}\n\nIf you didn't make this change, please contact your administrator immediately.\n\n— The Uplift Team`,
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
        <li><strong>Time:</strong> ${data.timestamp || new Date().toLocaleString('en')}</li>
      </ul>
      <p>If this was you, you can ignore this email. If you don't recognize this activity, please change your password immediately.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `New Device Login\n\nHi ${data.firstName},\n\nWe noticed a new sign-in to your Uplift account:\n\nDevice: ${data.device || 'Unknown'}\nBrowser: ${data.browser || 'Unknown'}\nLocation: ${data.location || 'Unknown'}\nIP Address: ${data.ipAddress || 'Unknown'}\nTime: ${data.timestamp || new Date().toLocaleString('en')}\n\nIf this was you, you can ignore this email.\n\n— The Uplift Team`,
  },

  account_locked: {
    subject: 'Your Uplift account has been locked',
    html: (data) => `
      <h2>Account Locked</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your Uplift account has been temporarily locked due to multiple failed login attempts.</p>
      <p>Your account will be automatically unlocked in <strong>30 minutes</strong>.</p>
      <p>If you need immediate access, please contact your administrator to unlock your account.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Account Locked\n\nHi ${data.firstName},\n\nYour Uplift account has been temporarily locked due to multiple failed login attempts.\n\nYour account will be automatically unlocked in 30 minutes.\n\n— The Uplift Team`,
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
    text: (data) => `Account Unlocked\n\nHi ${data.firstName},\n\nYour Uplift account has been unlocked. You can now log in.\n\n— The Uplift Team`,
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
    text: (data) => `Password Reset Required\n\nHi ${data.firstName},\n\nAn administrator has required you to change your password on your next login.\n\n— The Uplift Team`,
  },

  invitation: {
    subject: "You've been invited to join Uplift",
    html: (data) => `
      <h2>You're Invited!</h2>
      <p>Hi ${data.firstName},</p>
      <p><strong>${data.invitedBy?.first_name} ${data.invitedBy?.last_name}</strong> has invited you to join their team on Uplift.</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/accept-invitation?token=${data.invitationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Accept Invitation
        </a>
      </p>
      <p>This invitation will expire in 7 days.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `You're Invited!\n\nHi ${data.firstName},\n\n${data.invitedBy?.first_name} ${data.invitedBy?.last_name} has invited you to join their team on Uplift.\n\nAccept your invitation: ${APP_URL}/accept-invitation?token=${data.invitationToken}\n\nThis invitation will expire in 7 days.\n\n— The Uplift Team`,
  },

  password_reset: {
    subject: 'Reset your Uplift password',
    html: (data) => `
      <h2>Password Reset</h2>
      <p>Hi ${data.firstName},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/reset-password?token=${data.resetToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Password Reset\n\nHi ${data.firstName},\n\nWe received a request to reset your password.\n\nReset your password: ${APP_URL}/reset-password?token=${data.resetToken}\n\nThis link will expire in 1 hour.\n\n— The Uplift Team`,
  },

  deletion_requested: {
    subject: 'Account deletion request received',
    html: (data) => `
      <h2>Account Deletion Requested</h2>
      <p>Hi ${data.firstName},</p>
      <p>We've received your request to delete your Uplift account.</p>
      <p>Your account and all associated data will be permanently deleted in <strong>30 days</strong>.</p>
      <p>If you change your mind, you can cancel this request by logging in to your account.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Account Deletion Requested\n\nHi ${data.firstName},\n\nWe've received your request to delete your Uplift account.\n\nYour account will be permanently deleted in 30 days.\n\n— The Uplift Team`,
  },

  email_verification: {
    subject: 'Verify your Uplift email address',
    html: (data) => `
      <h2>Verify Your Email</h2>
      <p>Hi ${data.firstName},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/verify-email?token=${data.verificationToken}"
           style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verify Email
        </a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Verify Your Email\n\nHi ${data.firstName},\n\nPlease verify your email: ${APP_URL}/verify-email?token=${data.verificationToken}\n\nThis link will expire in 24 hours.\n\n— The Uplift Team`,
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
    text: (data) => `Account Deactivated\n\nHi ${data.firstName},\n\nYour Uplift account has been deactivated by an administrator.\n\n${data.reason ? `Reason: ${data.reason}\n\n` : ''}— The Uplift Team`,
  },

  payment_failed: {
    subject: 'Payment failed for your Uplift subscription',
    html: (data) => `
      <h2>Payment Failed</h2>
      <p>Hi ${data.firstName},</p>
      <p>We were unable to process your payment for your Uplift subscription.</p>
      <p><strong>Amount:</strong> ${data.currency} ${(data.amount / 100).toFixed(2)}</p>
      <p>Please update your payment method to avoid any interruption to your service.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.billingPortalUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Update Payment Method
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Payment Failed\n\nHi ${data.firstName},\n\nWe were unable to process your payment for your Uplift subscription.\n\nAmount: ${data.currency} ${(data.amount / 100).toFixed(2)}\n\nPlease update your payment method at: ${data.billingPortalUrl}\n\n— The Uplift Team`,
  },

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
            <a href="${APP_URL}${data.actionUrl}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Details
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    `,
    text: (data) => `${data.title}\n\n${data.body}\n\n${data.actionUrl ? `View details: ${APP_URL}${data.actionUrl}` : ''}\n\n— The Uplift Team`,
  },

  // ============================================================
  // HR-SPECIFIC TEMPLATES
  // ============================================================

  shift_assigned: {
    subject: 'New shift assigned to you',
    html: (data) => `
      <h2>Shift Assigned</h2>
      <p>Hi ${data.firstName},</p>
      <p>You have been assigned a new shift:</p>
      <ul>
        <li><strong>Date:</strong> ${data.shiftDate}</li>
        <li><strong>Time:</strong> ${data.startTime} - ${data.endTime}</li>
        <li><strong>Location:</strong> ${data.location || 'See schedule for details'}</li>
        ${data.role ? `<li><strong>Role:</strong> ${data.role}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/schedule" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Schedule
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Shift Assigned\n\nHi ${data.firstName},\n\nYou have been assigned a new shift:\n\nDate: ${data.shiftDate}\nTime: ${data.startTime} - ${data.endTime}\nLocation: ${data.location || 'See schedule for details'}\n${data.role ? `Role: ${data.role}\n` : ''}\nView your schedule: ${APP_URL}/schedule\n\n— The Uplift Team`,
  },

  time_off_decision: {
    subject: (data) => `Your time off request has been ${data.approved ? 'approved' : 'declined'}`,
    html: (data) => `
      <h2>Time Off Request ${data.approved ? 'Approved' : 'Declined'}</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your time off request has been <strong>${data.approved ? 'approved' : 'declined'}</strong>.</p>
      <ul>
        <li><strong>Type:</strong> ${data.leaveType}</li>
        <li><strong>Dates:</strong> ${data.startDate} - ${data.endDate}</li>
        <li><strong>Days:</strong> ${data.totalDays}</li>
        ${data.reviewedBy ? `<li><strong>Reviewed by:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/time-off" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Time Off
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Time Off Request ${data.approved ? 'Approved' : 'Declined'}\n\nHi ${data.firstName},\n\nYour time off request has been ${data.approved ? 'approved' : 'declined'}.\n\nType: ${data.leaveType}\nDates: ${data.startDate} - ${data.endDate}\nDays: ${data.totalDays}\n${data.reviewedBy ? `Reviewed by: ${data.reviewedBy}\n` : ''}${data.notes ? `Notes: ${data.notes}\n` : ''}\nView details: ${APP_URL}/time-off\n\n— The Uplift Team`,
  },

  payslip_available: {
    subject: (data) => `Your payslip for ${data.payPeriod} is ready`,
    html: (data) => `
      <h2>Payslip Available</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your payslip for <strong>${data.payPeriod}</strong> is now available.</p>
      <ul>
        <li><strong>Pay Date:</strong> ${data.payDate}</li>
        <li><strong>Net Pay:</strong> ${data.currency} ${data.netPay}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/payslips" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Payslip
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Payslip Available\n\nHi ${data.firstName},\n\nYour payslip for ${data.payPeriod} is now available.\n\nPay Date: ${data.payDate}\nNet Pay: ${data.currency} ${data.netPay}\n\nView payslip: ${APP_URL}/payslips\n\n— The Uplift Team`,
  },

  review_assigned: {
    subject: 'Performance review assigned to you',
    html: (data) => `
      <h2>Performance Review Assigned</h2>
      <p>Hi ${data.firstName},</p>
      <p>You have been assigned a performance review${data.reviewee ? ` for <strong>${data.reviewee}</strong>` : ''}.</p>
      <ul>
        <li><strong>Review Type:</strong> ${data.reviewType}</li>
        <li><strong>Due Date:</strong> ${data.dueDate}</li>
        ${data.reviewPeriod ? `<li><strong>Review Period:</strong> ${data.reviewPeriod}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/performance/reviews/${data.reviewId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Start Review
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Performance Review Assigned\n\nHi ${data.firstName},\n\nYou have been assigned a performance review${data.reviewee ? ` for ${data.reviewee}` : ''}.\n\nReview Type: ${data.reviewType}\nDue Date: ${data.dueDate}\n${data.reviewPeriod ? `Review Period: ${data.reviewPeriod}\n` : ''}\nStart review: ${APP_URL}/performance/reviews/${data.reviewId || ''}\n\n— The Uplift Team`,
  },

  course_assigned: {
    subject: (data) => `New training course assigned: ${data.courseName}`,
    html: (data) => `
      <h2>Training Course Assigned</h2>
      <p>Hi ${data.firstName},</p>
      <p>You have been assigned a new training course:</p>
      <ul>
        <li><strong>Course:</strong> ${data.courseName}</li>
        ${data.description ? `<li><strong>Description:</strong> ${data.description}</li>` : ''}
        <li><strong>Due Date:</strong> ${data.dueDate}</li>
        ${data.estimatedDuration ? `<li><strong>Estimated Duration:</strong> ${data.estimatedDuration}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/learning/courses/${data.courseId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Start Course
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Training Course Assigned\n\nHi ${data.firstName},\n\nYou have been assigned a new training course:\n\nCourse: ${data.courseName}\n${data.description ? `Description: ${data.description}\n` : ''}Due Date: ${data.dueDate}\n${data.estimatedDuration ? `Estimated Duration: ${data.estimatedDuration}\n` : ''}\nStart course: ${APP_URL}/learning/courses/${data.courseId || ''}\n\n— The Uplift Team`,
  },

  recognition_received: {
    subject: (data) => `${data.senderName} sent you recognition!`,
    html: (data) => `
      <h2>You've Been Recognized!</h2>
      <p>Hi ${data.firstName},</p>
      <p><strong>${data.senderName}</strong> has recognized you for your great work!</p>
      ${data.badge ? `<p style="text-align: center; font-size: 48px;">${data.badge}</p>` : ''}
      ${data.message ? `<blockquote style="border-left: 4px solid #F26522; padding-left: 16px; margin: 20px 0; font-style: italic;">"${data.message}"</blockquote>` : ''}
      ${data.points ? `<p><strong>Points Earned:</strong> ${data.points}</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/recognition" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Recognition
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `You've Been Recognized!\n\nHi ${data.firstName},\n\n${data.senderName} has recognized you for your great work!\n\n${data.message ? `"${data.message}"\n\n` : ''}${data.points ? `Points Earned: ${data.points}\n` : ''}\nView recognition: ${APP_URL}/recognition\n\n— The Uplift Team`,
  },

  expense_decision: {
    subject: (data) => `Your expense claim has been ${data.approved ? 'approved' : 'declined'}`,
    html: (data) => `
      <h2>Expense Claim ${data.approved ? 'Approved' : 'Declined'}</h2>
      <p>Hi ${data.firstName},</p>
      <p>Your expense claim has been <strong>${data.approved ? 'approved' : 'declined'}</strong>.</p>
      <ul>
        <li><strong>Description:</strong> ${data.description}</li>
        <li><strong>Amount:</strong> ${data.currency} ${data.amount}</li>
        <li><strong>Submitted:</strong> ${data.submittedDate}</li>
        ${data.reviewedBy ? `<li><strong>Reviewed by:</strong> ${data.reviewedBy}</li>` : ''}
      </ul>
      ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
      ${data.approved ? `<p>The amount will be included in your next payroll.</p>` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/expenses" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Expenses
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Expense Claim ${data.approved ? 'Approved' : 'Declined'}\n\nHi ${data.firstName},\n\nYour expense claim has been ${data.approved ? 'approved' : 'declined'}.\n\nDescription: ${data.description}\nAmount: ${data.currency} ${data.amount}\nSubmitted: ${data.submittedDate}\n${data.reviewedBy ? `Reviewed by: ${data.reviewedBy}\n` : ''}${data.notes ? `Notes: ${data.notes}\n` : ''}${data.approved ? `\nThe amount will be included in your next payroll.\n` : ''}\nView expenses: ${APP_URL}/expenses\n\n— The Uplift Team`,
  },

  document_signature_required: {
    subject: (data) => `Document requires your signature: ${data.documentName}`,
    html: (data) => `
      <h2>Signature Required</h2>
      <p>Hi ${data.firstName},</p>
      <p>A document requires your signature:</p>
      <ul>
        <li><strong>Document:</strong> ${data.documentName}</li>
        ${data.description ? `<li><strong>Description:</strong> ${data.description}</li>` : ''}
        ${data.requestedBy ? `<li><strong>Requested by:</strong> ${data.requestedBy}</li>` : ''}
        ${data.dueDate ? `<li><strong>Due Date:</strong> ${data.dueDate}</li>` : ''}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/documents/${data.documentId || ''}" style="background-color: #F26522; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Review & Sign
        </a>
      </p>
      <p>— The Uplift Team</p>
    `,
    text: (data) => `Signature Required\n\nHi ${data.firstName},\n\nA document requires your signature:\n\nDocument: ${data.documentName}\n${data.description ? `Description: ${data.description}\n` : ''}${data.requestedBy ? `Requested by: ${data.requestedBy}\n` : ''}${data.dueDate ? `Due Date: ${data.dueDate}\n` : ''}\nReview & Sign: ${APP_URL}/documents/${data.documentId || ''}\n\n— The Uplift Team`,
  },
};
