// ============================================================
// PER-ORGANIZATION RATE LIMITING
// Prevents single tenant from overwhelming the system
// Environment-configurable limits
// ============================================================

import rateLimit from 'express-rate-limit';

// Rate limit configuration from environment
const RATE_LIMIT_CONFIG = {
  // Default API limits
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Auth endpoint limits (stricter)
  authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
  authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10,

  // Per-organization limits
  orgWindowMs: 60 * 1000, // 1 minute
  orgMaxRequests: 1000,

  // Tier-based limits
  tierLimits: {
    free: parseInt(process.env.RATE_LIMIT_FREE) || 100,
    starter: parseInt(process.env.RATE_LIMIT_STARTER) || 500,
    professional: parseInt(process.env.RATE_LIMIT_PROFESSIONAL) || 1000,
    enterprise: parseInt(process.env.RATE_LIMIT_ENTERPRISE) || 5000,
  },
};

// Rate limit store (in-memory or Redis)
let redisClient = null;
let redisAvailable = false;

const initRedis = async () => {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) return;

  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', () => { redisAvailable = false; });
    redisClient.on('connect', () => { redisAvailable = true; });
    await redisClient.connect();
  } catch (error) {
    console.warn('[OrgRateLimit] Redis not available, using in-memory store');
  }
};

// Initialize Redis on module load
initRedis().catch(() => {});

// In-memory store for rate limiting
const memoryStore = new Map();

// Clean up expired entries every minute
setInterval(() => {
  if (redisAvailable) return;
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Get rate limit count for an organization
 */
async function getOrgCount(orgId, windowMs) {
  const key = `ratelimit:org:${orgId}`;

  if (redisAvailable && redisClient) {
    try {
      const multi = redisClient.multi();
      multi.incr(key);
      multi.pTTL(key);
      const results = await multi.exec();
      const count = results[0];
      const ttl = results[1];

      // Set expiry if new key
      if (ttl === -1) {
        await redisClient.pExpire(key, windowMs);
      }

      return count;
    } catch (error) {
      console.error('[OrgRateLimit] Redis error:', error.message);
    }
  }

  // Fallback to in-memory
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return 1;
  }

  entry.count++;
  return entry.count;
}

/**
 * Create per-organization rate limiter
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 1 minute)
 * @param {number} options.max - Max requests per org per window (default: 1000)
 * @param {string} options.message - Error message
 */
export const createOrgRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 1000, // 1000 requests per minute per org
    message = 'Too many requests from your organization',
  } = options;

  return async (req, res, next) => {
    // Skip if no user/org context
    if (!req.user?.organizationId) {
      return next();
    }

    const orgId = req.user.organizationId;

    try {
      const count = await getOrgCount(orgId, windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));

      if (count > max) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);

        return res.status(429).json({
          error: message,
          retryAfter: `${retryAfter} seconds`,
        });
      }

      next();
    } catch (error) {
      console.error('[OrgRateLimit] Error:', error.message);
      // Allow request on error to prevent DoS
      next();
    }
  };
};

/**
 * Standard per-org rate limiter (configurable, default 1000 req/min)
 */
export const orgApiLimiter = createOrgRateLimiter({
  windowMs: RATE_LIMIT_CONFIG.orgWindowMs,
  max: RATE_LIMIT_CONFIG.orgMaxRequests,
});

/**
 * Strict per-org rate limiter for expensive operations (100 req/min)
 */
export const orgStrictLimiter = createOrgRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests for this resource',
});

/**
 * Bulk operations limiter (10 req/min)
 */
export const orgBulkLimiter = createOrgRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many bulk operations',
});

/**
 * Report generation limiter (5 req/min)
 */
export const orgReportLimiter = createOrgRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many report requests',
});

/**
 * Tier-based rate limiting based on subscription plan
 * Configurable via environment variables
 */
export const tieredOrgRateLimiter = async (req, res, next) => {
  if (!req.user?.organizationId) {
    return next();
  }

  const tier = req.user.tier || 'professional';
  const max = RATE_LIMIT_CONFIG.tierLimits[tier] || RATE_LIMIT_CONFIG.tierLimits.professional;

  const limiter = createOrgRateLimiter({
    windowMs: 60 * 1000,
    max,
  });

  return limiter(req, res, next);
};

export default {
  createOrgRateLimiter,
  orgApiLimiter,
  orgStrictLimiter,
  orgBulkLimiter,
  orgReportLimiter,
  tieredOrgRateLimiter,
};
