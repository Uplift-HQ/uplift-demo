// ============================================================
// REQUEST TIMEOUT MIDDLEWARE
// Prevents hung requests from consuming resources
// ============================================================

/**
 * Create a timeout middleware with specified duration
 * @param {number} timeout - Timeout in milliseconds (default 30 seconds)
 */
export const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    // Skip for certain endpoints that are expected to be slow
    const slowEndpoints = ['/api/reports', '/api/export', '/api/import'];
    if (slowEndpoints.some(ep => req.url.startsWith(ep))) {
      return next();
    }

    // Set timeout on request
    req.setTimeout(timeout, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'The request took too long to process'
        });
      }
    });

    // Set timeout on response
    res.setTimeout(timeout, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'The request took too long to process'
        });
      }
    });

    next();
  };
};

/**
 * Long timeout for slow endpoints (2 minutes)
 */
export const longRequestTimeout = requestTimeout(120000);

/**
 * Short timeout for quick endpoints (10 seconds)
 */
export const shortRequestTimeout = requestTimeout(10000);

/**
 * Configurable timeout based on route configuration
 */
export const configuredTimeout = (config = {}) => {
  const defaults = {
    default: 30000,
    '/api/reports': 120000,
    '/api/export': 180000,
    '/api/import': 300000,
    '/api/health': 5000,
  };

  const timeouts = { ...defaults, ...config };

  return (req, res, next) => {
    // Find matching timeout
    let timeout = timeouts.default;
    for (const [path, ms] of Object.entries(timeouts)) {
      if (path !== 'default' && req.url.startsWith(path)) {
        timeout = ms;
        break;
      }
    }

    req.setTimeout(timeout);
    res.setTimeout(timeout);

    next();
  };
};

export default requestTimeout;
