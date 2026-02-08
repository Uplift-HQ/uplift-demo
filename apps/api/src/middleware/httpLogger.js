// ============================================================
// HTTP REQUEST LOGGER
// Structured logging for all HTTP requests
// ============================================================

import pinoHttp from 'pino-http';
import { logger } from '../lib/logger.js';

export const httpLogger = pinoHttp({
  logger,

  // Generate request ID if not present
  genReqId: (req) => {
    return req.id || req.headers['x-request-id'] || crypto.randomUUID();
  },

  // Custom log level based on status code
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (res.statusCode >= 300) return 'info';
    return 'info';
  },

  // Add custom fields to each request log
  customProps: (req, res) => ({
    organizationId: req.user?.organization_id,
    userId: req.user?.id,
    userAgent: req.headers['user-agent'],
  }),

  // Customize success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  // Customize error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },

  // Serialize request (what gets logged)
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      remoteAddress: req.ip || req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },

  // Don't log these paths (health checks, static assets)
  autoLogging: {
    ignore: (req) => {
      const ignorePaths = [
        '/health',
        '/api/health',
        '/api/health/ready',
        '/metrics',
        '/favicon.ico',
      ];
      return ignorePaths.includes(req.url);
    }
  },

  // Custom attribute keys
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },

  // Quiet mode for tests
  quietReqLogger: process.env.NODE_ENV === 'test',
});

export default httpLogger;
