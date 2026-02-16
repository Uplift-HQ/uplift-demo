// ============================================================
// AUDIT MIDDLEWARE
// Automatic audit logging for sensitive operations
// ============================================================

import { activityLog } from '../services/activity.js';

/**
 * Audit middleware factory
 * Creates middleware that logs the action after successful completion
 *
 * @param {string} action - The action name to log
 * @param {Object} options - Configuration options
 * @param {Function} options.getDetails - Function to extract details from req/res
 * @param {string} options.entityType - Type of entity being modified
 * @param {Function} options.getEntityId - Function to get entity ID from req
 */
export const audit = (action, options = {}) => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to intercept response
    res.json = (body) => {
      // Only log on success (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          userId: req.user?.userId,
          organizationId: req.user?.organizationId,
          action,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          actionDetails: {},
        };

        // Add entity info if provided
        if (options.entityType) {
          logData.actionDetails.entityType = options.entityType;
        }

        if (options.getEntityId) {
          logData.actionDetails.entityId = options.getEntityId(req, body);
        }

        // Add custom details
        if (options.getDetails) {
          const details = options.getDetails(req, body);
          logData.actionDetails = { ...logData.actionDetails, ...details };
        }

        // Log asynchronously (don't wait)
        activityLog.log(logData).catch(console.error);
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Audit data changes with before/after tracking
 * Use this for UPDATE operations where you want to track what changed
 */
export const auditDataChange = (entityType, options = {}) => {
  return async (req, res, next) => {
    const getEntityId = options.getEntityId || ((req) => req.params.id);
    const entityId = getEntityId(req);

    // Store original data before modification
    if (options.getOriginal && entityId) {
      try {
        req._auditOriginal = await options.getOriginal(entityId, req);
      } catch (err) {
        console.error('Audit: Failed to get original data:', err);
      }
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = req.method === 'DELETE' ? 'delete' :
                       req.method === 'POST' ? 'create' : 'update';

        activityLog.logDataChange({
          userId: req.user?.userId,
          organizationId: req.user?.organizationId,
          action,
          entityType,
          entityId: entityId || body?.id || body?.[entityType]?.id,
          oldValue: req._auditOriginal || null,
          newValue: req.body,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch(console.error);
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Audit financial operations
 */
export const auditFinancial = (action, options = {}) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        activityLog.logFinancialOperation({
          userId: req.user?.userId,
          organizationId: req.user?.organizationId,
          action,
          amount: options.getAmount ? options.getAmount(req, body) : body?.amount,
          currency: options.getCurrency ? options.getCurrency(req, body) : body?.currency || 'GBP',
          affectedEmployees: options.getAffectedEmployees ? options.getAffectedEmployees(req, body) : null,
          referenceId: options.getReferenceId ? options.getReferenceId(req, body) : body?.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch(console.error);
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Audit data exports (GDPR compliance)
 */
export const auditExport = (exportType, options = {}) => {
  return (req, res, next) => {
    // For exports, we need to capture when the response is sent
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    const logExport = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        activityLog.logDataExport({
          userId: req.user?.userId,
          organizationId: req.user?.organizationId,
          exportType,
          recordCount: options.getRecordCount ? options.getRecordCount(req, body) : body?.length || body?.data?.length || 1,
          format: options.format || req.query.format || 'json',
          filters: req.query,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch(console.error);
      }
    };

    res.send = (body) => {
      logExport(body);
      return originalSend(body);
    };

    res.json = (body) => {
      logExport(body);
      return originalJson(body);
    };

    next();
  };
};

/**
 * Audit role/permission changes
 */
export const auditRoleChange = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.body.role) {
      activityLog.logRoleChange({
        userId: req.user?.userId,
        organizationId: req.user?.organizationId,
        targetUserId: req.params.id || req.params.userId || body?.id,
        oldRole: req._auditOriginal?.role,
        newRole: req.body.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }).catch(console.error);
    }

    return originalJson(body);
  };

  next();
};

export default {
  audit,
  auditDataChange,
  auditFinancial,
  auditExport,
  auditRoleChange,
};
