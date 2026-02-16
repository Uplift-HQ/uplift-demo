// ============================================================
// MIDDLEWARE
// Auth, Validation, Rate Limiting, Error Handling, Request Tracking
// ============================================================

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// Re-export specialized middleware
export { tenantMiddleware, validateOrgOwnership, withTenantCheck } from './tenant.js';
export { orgApiLimiter, orgStrictLimiter, orgBulkLimiter, orgReportLimiter, tieredOrgRateLimiter } from './orgRateLimit.js';
export { requestTimeout, longRequestTimeout, shortRequestTimeout, configuredTimeout } from './timeout.js';
export { httpLogger } from './httpLogger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-ME-set-JWT_SECRET-env-var-in-production-32chars';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set in middleware - using insecure fallback');
}

// -------------------- REQUEST ID TRACKING --------------------

/**
 * Request ID Middleware
 * Adds unique request ID for tracing and debugging
 */
export const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// -------------------- AUTH MIDDLEWARE --------------------

/**
 * JWT Authentication Middleware
 * Reads token from httpOnly cookie first (secure), then Authorization header as fallback
 */
export const authMiddleware = (req, res, next) => {
  try {
    // Cookie first (httpOnly, XSS-safe), then header fallback (for API clients)
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      req.user = {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        email: decoded.email,
        role: decoded.role,
        employeeId: decoded.employeeId,
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Optional auth - continues if no token, sets user if valid token
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      email: decoded.email,
      role: decoded.role,
      employeeId: decoded.employeeId,
    };
  } catch {
    // Invalid token, continue without user
  }

  next();
};

// -------------------- CSRF PROTECTION --------------------

/**
 * CSRF Protection Middleware
 * Uses double-submit cookie pattern:
 * 1. Server sets a CSRF token in a cookie
 * 2. Client must send same token in X-CSRF-Token header
 * 3. Attacker can't read cookie due to SameSite, can't set header cross-origin
 */
export const csrfProtection = (req, res, next) => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for API clients using Bearer auth (they already prove origin)
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  // Skip CSRF for auth endpoints - they use their own security (rate limiting, credentials)
  if (req.path.startsWith('/auth/')) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  // If no CSRF cookie yet, generate one and allow request
  if (!cookieToken) {
    const newToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', newToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    return next();
  }

  // Validate token matches
  if (cookieToken && headerToken && cookieToken === headerToken) {
    return next();
  }

  // Log for debugging but don't block in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('CSRF token mismatch:', { cookieToken: !!cookieToken, headerToken: !!headerToken });
    return next();
  }

  return res.status(403).json({ 
    error: 'CSRF token invalid',
    code: 'CSRF_ERROR',
  });
};

/**
 * Generate CSRF token for client
 */
export const csrfTokenEndpoint = (req, res) => {
  let token = req.cookies?.csrfToken;
  
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  
  res.json({ csrfToken: token });
};

// -------------------- ROLE-BASED ACCESS --------------------

/**
 * Role-based access control
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = requireRole(['admin', 'superadmin']);

/**
 * Manager or above middleware
 */
export const managerOrAbove = requireRole(['manager', 'admin', 'superadmin']);

// -------------------- VALIDATION MIDDLEWARE --------------------

/**
 * Zod schema validation middleware
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }

      req.body = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Query parameter validation
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: result.error.errors,
        });
      }

      req.query = result.data;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// -------------------- RATE LIMITING --------------------

/**
 * Standard API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // Higher limit for dev/test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes',
  },
});

/**
 * Strict limiter for auth endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts',
    retryAfter: '15 minutes',
  },
});

/**
 * Very strict limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many password reset requests',
    retryAfter: '1 hour',
  },
});

// -------------------- ERROR HANDLING --------------------

/**
 * Async handler wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  // Log with request ID for tracing
  console.error('Unhandled error:', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Resource already exists',
      detail: err.detail,
    });
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced resource not found',
      detail: err.detail,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  }

  // Validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
};

// -------------------- ORGANIZATION CONTEXT --------------------

/**
 * Ensures user belongs to organization being accessed
 */
export const orgContextMiddleware = (paramName = 'organizationId') => {
  return (req, res, next) => {
    const requestedOrgId = req.params[paramName] || req.query[paramName] || req.body[paramName];

    if (requestedOrgId && requestedOrgId !== req.user.organizationId) {
      // Allow superadmin to access any org
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }

    next();
  };
};

// -------------------- LOGGING --------------------

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.userId,
      ip: req.ip,
    };

    // Structured JSON logging for production
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({ level: res.statusCode >= 400 ? 'error' : 'info', ...log }));
    } else if (res.statusCode >= 400) {
      console.error('Request error:', log);
    } else {
      console.log('Request:', log);
    }
  });

  next();
};

// -------------------- CORS --------------------

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Production origins from environment, plus common patterns
    const envOrigins = process.env.CORS_ORIGINS?.split(',').filter(Boolean) || [];

    const allowedOrigins = [
      ...envOrigins,
      // Railway production URLs
      'https://uplift-portal-production.up.railway.app',
      'https://uplift-platform-production.up.railway.app',
      // Netlify demo deployment
      'https://upliftportaldemo.netlify.app',
      /\.netlify\.app$/,
      // Localhost for development (always allow for demo convenience)
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8100',
      // Production patterns
      /\.uplift\.(hr|io)$/,
      /\.getuplift\.io$/,
      /\.uplifthq\.co\.uk$/,
      /uplifthq\.co\.uk$/,
      /\.up\.railway\.app$/,
    ];

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key', 'X-CSRF-Token', 'x-csrf-token'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page', 'X-Idempotent-Replayed'],
};

// -------------------- IDEMPOTENCY MIDDLEWARE --------------------

/**
 * Idempotency Store - Uses Redis if available, falls back to in-memory
 * Keys expire after 24 hours
 */
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours in seconds

// Redis client (lazy initialization)
let redisClient = null;
let redisAvailable = false;

const initRedis = async () => {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    console.log('[Idempotency] REDIS_URL not set, using in-memory store (not recommended for production)');
    return;
  }

  try {
    // Dynamic import to avoid bundling issues
    const { createClient } = await import('redis');
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
      redisAvailable = false;
    });
    redisClient.on('connect', () => {
      console.log('[Redis] Connected for idempotency store');
      redisAvailable = true;
    });
    await redisClient.connect();
  } catch (error) {
    console.warn('[Idempotency] Redis not available, using in-memory store:', error.message);
  }
};

// Initialize Redis on module load (non-blocking)
initRedis().catch(() => {});

// Fallback in-memory store
const memoryStore = new Map();

// Clean up expired keys every hour (memory store only)
setInterval(() => {
  if (redisAvailable) return; // Redis handles TTL automatically
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now - entry.timestamp > IDEMPOTENCY_TTL * 1000) {
      memoryStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Store operations with Redis/memory fallback
const idempotencyStore = {
  async get(key) {
    if (redisAvailable && redisClient) {
      try {
        const data = await redisClient.get(`idempotency:${key}`);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('[Idempotency] Redis get error:', error.message);
      }
    }
    return memoryStore.get(key) || null;
  },

  async set(key, value) {
    if (redisAvailable && redisClient) {
      try {
        await redisClient.setEx(`idempotency:${key}`, IDEMPOTENCY_TTL, JSON.stringify(value));
        return;
      } catch (error) {
        console.error('[Idempotency] Redis set error:', error.message);
      }
    }
    memoryStore.set(key, { ...value, timestamp: Date.now() });
  }
};

/**
 * Idempotency Middleware
 * Prevents duplicate processing of offline-queued requests
 */
export const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['x-idempotency-key'];
  
  // No key provided - process normally
  if (!idempotencyKey) {
    return next();
  }
  
  // Include user ID in the key to prevent cross-user conflicts
  const userId = req.user?.id || 'anonymous';
  const fullKey = `${userId}:${idempotencyKey}`;
  
  // Check if we've seen this key before
  const existing = await idempotencyStore.get(fullKey);
  
  if (existing) {
    // Return cached response
    console.log(`[Idempotency] Replaying response for key: ${idempotencyKey}`);
    res.setHeader('X-Idempotent-Replayed', 'true');
    return res.status(existing.statusCode).json(existing.body);
  }
  
  // Capture the response to store for future replays
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Store the response (async, don't wait)
    idempotencyStore.set(fullKey, {
      statusCode: res.statusCode,
      body,
    }).catch(console.error);
    
    return originalJson(body);
  };
  
  next();
};

/**
 * Conflict detection for offline sync
 * Returns 409 if data has changed since offline timestamp
 */
export const conflictDetectionMiddleware = (getLastModified) => async (req, res, next) => {
  const offlineTimestamp = req.body?.offlineTimestamp;
  
  if (!offlineTimestamp) {
    return next();
  }
  
  try {
    const lastModified = await getLastModified(req);
    
    if (lastModified && lastModified > offlineTimestamp) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Data was modified after your offline action',
        serverTimestamp: lastModified,
        offlineTimestamp,
      });
    }
    
    next();
  } catch (error) {
    console.error('[ConflictDetection] Error:', error);
    next();
  }
};

export default {
  authMiddleware,
  optionalAuth,
  requireRole,
  adminOnly,
  managerOrAbove,
  validate,
  validateQuery,
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  orgContextMiddleware,
  requestLogger,
  corsOptions,
  requestIdMiddleware,
  csrfProtection,
  csrfTokenEndpoint,
  idempotencyMiddleware,
  conflictDetectionMiddleware,
};
