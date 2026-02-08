// ============================================================
// TENANT ISOLATION MIDDLEWARE
// Ensures all requests are scoped to the user's organization
// ============================================================

import { logger } from '../lib/logger.js';

const securityLogger = logger?.child?.({ module: 'security' }) || console;

/**
 * Middleware that adds organization_id to all database queries
 * This is a safety net - routes should still explicitly filter
 */
export const tenantMiddleware = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // Attach org_id for easy access
  req.organizationId = req.user.organization_id || req.user.organizationId;

  // Validate org_id exists for authenticated users
  if (!req.organizationId) {
    securityLogger.error?.({ userId: req.user.id }, 'SECURITY: User without organization_id') ||
      console.error('SECURITY: User without organization_id', { userId: req.user.id });
    return res.status(403).json({ error: 'Organization context required' });
  }

  next();
};

/**
 * Helper to validate resource belongs to user's organization
 * Use this before any UPDATE or DELETE operation
 */
export const validateOrgOwnership = async (db, table, resourceId, organizationId) => {
  // Sanitize table name to prevent SQL injection
  const allowedTables = [
    'users', 'employees', 'shifts', 'locations', 'departments', 'roles',
    'time_entries', 'time_off_requests', 'shift_swaps', 'notifications',
    'chat_channels', 'chat_messages', 'compliance_items', 'expense_claims',
    'payslips', 'skills', 'job_postings', 'job_applications'
  ];

  if (!allowedTables.includes(table)) {
    securityLogger.error?.({ table }, 'SECURITY: Invalid table name in ownership check') ||
      console.error('SECURITY: Invalid table name in ownership check', { table });
    return { valid: false, reason: 'invalid_table' };
  }

  const result = await db.query(
    `SELECT organization_id FROM ${table} WHERE id = $1`,
    [resourceId]
  );

  if (result.rows.length === 0) {
    return { valid: false, reason: 'not_found' };
  }

  if (result.rows[0].organization_id !== organizationId) {
    securityLogger.error?.({
      table,
      resourceId,
      attemptedOrg: organizationId,
      actualOrg: result.rows[0].organization_id
    }, 'SECURITY: Cross-tenant access attempt') ||
      console.error('SECURITY: Cross-tenant access attempt', {
        table,
        resourceId,
        attemptedOrg: organizationId,
        actualOrg: result.rows[0].organization_id
      });
    return { valid: false, reason: 'forbidden' };
  }

  return { valid: true };
};

/**
 * Higher-order function to wrap route handlers with tenant validation
 */
export const withTenantCheck = (handler) => {
  return async (req, res, next) => {
    if (!req.organizationId && req.user) {
      return res.status(403).json({ error: 'Organization context required' });
    }
    return handler(req, res, next);
  };
};

export default tenantMiddleware;
