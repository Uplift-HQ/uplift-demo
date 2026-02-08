// ============================================================
// PER-ORGANIZATION RATE LIMITING
// Prevents single tenant from overwhelming the system
// ============================================================

import rateLimit from 'express-rate-limit';

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
 * Standard per-org rate limiter (1000 req/min)
 */
export const orgApiLimiter = createOrgRateLimiter({
  windowMs: 60 * 1000,
  max: 1000,
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
 */
export const tieredOrgRateLimiter = async (req, res, next) => {
  if (!req.user?.organizationId) {
    return next();
  }

  // Get org tier from user context or database
  // For now, use a simple mapping
  const tierLimits = {
    free: 100,
    starter: 500,
    professional: 1000,
    enterprise: 5000,
  };

  const tier = req.user.tier || 'professional';
  const max = tierLimits[tier] || tierLimits.professional;

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
