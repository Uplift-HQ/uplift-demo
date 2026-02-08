// ============================================================
// STRUCTURED LOGGING
// Production-ready logging with pino
// ============================================================

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Create base logger
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Pretty print in development
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,

  // Production: JSON format for log aggregation
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },

  // Add base fields to all logs
  base: {
    service: 'uplift-api',
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'development',
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'newPassword',
      'oldPassword',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'api_key',
      'creditCard',
      'ssn',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]'
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Child loggers for specific modules
export const authLogger = logger.child({ module: 'auth' });
export const dbLogger = logger.child({ module: 'database' });
export const apiLogger = logger.child({ module: 'api' });
export const billingLogger = logger.child({ module: 'billing' });
export const securityLogger = logger.child({ module: 'security' });
export const jobLogger = logger.child({ module: 'jobs' });

// Helper for request logging
export const createRequestLogger = (req) => {
  return logger.child({
    requestId: req.id || req.headers['x-request-id'],
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    organizationId: req.user?.organization_id,
  });
};

// Log levels helper
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
};

export default logger;
