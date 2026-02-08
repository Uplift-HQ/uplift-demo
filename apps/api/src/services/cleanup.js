// ============================================================
// DATA RETENTION & CLEANUP SERVICE
// GDPR-compliant data purging
// ============================================================

import { db } from '../lib/database.js';
import { logger } from '../lib/logger.js';

const cleanupLogger = logger.child({ service: 'cleanup' });

export const cleanupService = {
  /**
   * Delete accounts marked for deletion after grace period
   * GDPR: 30-day grace period before permanent deletion
   */
  async purgeDeletedAccounts() {
    try {
      // First, get users to be deleted for logging
      const usersToDelete = await db.query(`
        SELECT id, email, organization_id
        FROM users
        WHERE deletion_requested_at IS NOT NULL
          AND deletion_requested_at < NOW() - INTERVAL '30 days'
      `);

      if (usersToDelete.rows.length === 0) {
        return 0;
      }

      const userIds = usersToDelete.rows.map(u => u.id);

      // Delete user data in order (respecting foreign keys)
      await db.query(`DELETE FROM user_sessions WHERE user_id = ANY($1)`, [userIds]);
      await db.query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1)`, [userIds]);
      await db.query(`DELETE FROM user_consents WHERE user_id = ANY($1)`, [userIds]);
      await db.query(`DELETE FROM marketing_consents WHERE user_id = ANY($1)`, [userIds]);
      await db.query(`DELETE FROM cookie_consents WHERE user_id = ANY($1)`, [userIds]);
      await db.query(`DELETE FROM notifications WHERE user_id = ANY($1)`, [userIds]);
      await db.query(`DELETE FROM push_tokens WHERE user_id = ANY($1)`, [userIds]);

      // Finally delete users
      const result = await db.query(`
        DELETE FROM users WHERE id = ANY($1) RETURNING id, email
      `, [userIds]);

      const count = result.rowCount;
      if (count > 0) {
        cleanupLogger.info({ count, userIds }, 'Purged deleted accounts');
      }
      return count;
    } catch (error) {
      cleanupLogger.error({ err: error }, 'Failed to purge deleted accounts');
      throw error;
    }
  },

  /**
   * Clean up expired sessions
   */
  async purgeExpiredSessions() {
    try {
      const result = await db.query(`
        DELETE FROM user_sessions
        WHERE expires_at < NOW() - INTERVAL '7 days'
           OR revoked_at < NOW() - INTERVAL '7 days'
        RETURNING id
      `);

      const count = result.rowCount;
      if (count > 0) {
        cleanupLogger.info({ count }, 'Purged expired sessions');
      }
      return count;
    } catch (error) {
      cleanupLogger.error({ err: error }, 'Failed to purge sessions');
      throw error;
    }
  },

  /**
   * Clean up expired refresh tokens
   */
  async purgeExpiredTokens() {
    try {
      const result = await db.query(`
        DELETE FROM refresh_tokens
        WHERE expires_at < NOW() - INTERVAL '7 days'
           OR revoked_at < NOW() - INTERVAL '7 days'
        RETURNING id
      `);

      const count = result.rowCount;
      if (count > 0) {
        cleanupLogger.info({ count }, 'Purged expired tokens');
      }
      return count;
    } catch (error) {
      cleanupLogger.error({ err: error }, 'Failed to purge tokens');
      throw error;
    }
  },

  /**
   * Archive old audit logs (keep 2 years in main table)
   */
  async archiveOldAuditLogs() {
    try {
      // Move to archive table
      const insertResult = await db.query(`
        INSERT INTO audit_log_archive
        SELECT * FROM audit_log
        WHERE created_at < NOW() - INTERVAL '2 years'
        ON CONFLICT DO NOTHING
        RETURNING id
      `);

      // Delete from main table
      const deleteResult = await db.query(`
        DELETE FROM audit_log
        WHERE created_at < NOW() - INTERVAL '2 years'
        RETURNING id
      `);

      const count = deleteResult.rowCount;
      if (count > 0) {
        cleanupLogger.info({ count }, 'Archived old audit logs');
      }
      return count;
    } catch (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        cleanupLogger.warn('Audit log archive table does not exist');
        return 0;
      }
      cleanupLogger.error({ err: error }, 'Failed to archive audit logs');
      throw error;
    }
  },

  /**
   * Clean up old notifications (90 days for read, 365 for unread)
   */
  async purgeOldNotifications() {
    try {
      const result = await db.query(`
        DELETE FROM notifications
        WHERE (created_at < NOW() - INTERVAL '90 days' AND read_at IS NOT NULL)
           OR (created_at < NOW() - INTERVAL '365 days')
        RETURNING id
      `);

      const count = result.rowCount;
      if (count > 0) {
        cleanupLogger.info({ count }, 'Purged old notifications');
      }
      return count;
    } catch (error) {
      cleanupLogger.error({ err: error }, 'Failed to purge notifications');
      throw error;
    }
  },

  /**
   * Clean up orphaned files (files not referenced in database)
   */
  async cleanupOrphanedFiles() {
    try {
      // This would scan the upload directory and check against database
      // For now, just log that we would do this
      cleanupLogger.info('Orphaned file cleanup would run here');
      return 0;
    } catch (error) {
      cleanupLogger.error({ err: error }, 'Failed to cleanup orphaned files');
      throw error;
    }
  },

  /**
   * Clean up old cookie consents (withdrawn > 30 days ago)
   */
  async purgeOldCookieConsents() {
    try {
      const result = await db.query(`
        DELETE FROM cookie_consents
        WHERE withdrawn_at IS NOT NULL
          AND withdrawn_at < NOW() - INTERVAL '30 days'
        RETURNING id
      `);

      const count = result.rowCount;
      if (count > 0) {
        cleanupLogger.info({ count }, 'Purged old cookie consents');
      }
      return count;
    } catch (error) {
      cleanupLogger.error({ err: error }, 'Failed to purge cookie consents');
      throw error;
    }
  },

  /**
   * Run all cleanup tasks
   */
  async runAll() {
    cleanupLogger.info('Starting cleanup jobs');
    const startTime = Date.now();

    const results = {
      deletedAccounts: 0,
      expiredSessions: 0,
      expiredTokens: 0,
      archivedAuditLogs: 0,
      oldNotifications: 0,
      oldCookieConsents: 0,
    };

    try {
      results.deletedAccounts = await this.purgeDeletedAccounts();
    } catch (e) { /* logged in individual method */ }

    try {
      results.expiredSessions = await this.purgeExpiredSessions();
    } catch (e) { /* logged in individual method */ }

    try {
      results.expiredTokens = await this.purgeExpiredTokens();
    } catch (e) { /* logged in individual method */ }

    try {
      results.archivedAuditLogs = await this.archiveOldAuditLogs();
    } catch (e) { /* logged in individual method */ }

    try {
      results.oldNotifications = await this.purgeOldNotifications();
    } catch (e) { /* logged in individual method */ }

    try {
      results.oldCookieConsents = await this.purgeOldCookieConsents();
    } catch (e) { /* logged in individual method */ }

    const duration = Date.now() - startTime;
    cleanupLogger.info({ results, durationMs: duration }, 'Cleanup jobs completed');

    return results;
  }
};

export default cleanupService;
