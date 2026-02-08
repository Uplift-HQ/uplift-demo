// ============================================================
// UPLIFT API KEY MANAGEMENT SERVICE
// Generate and manage REST API keys for external integrations
// ============================================================

import { db } from '../lib/database.js';

// Use db.query for queries and db.getClient() for transactions
const pool = { 
  query: db.query.bind(db), 
  connect: db.getClient.bind(db) 
};
import crypto from 'crypto';

// -------------------- Constants --------------------

const API_KEY_PREFIX = 'uplift_';
const API_KEY_LENGTH = 32;
const SECRET_KEY_LENGTH = 48;

// Permission scopes available for API keys
export const API_SCOPES = {
  // Read scopes
  'employees:read': 'View employee information',
  'schedules:read': 'View schedules and shifts',
  'time:read': 'View time entries',
  'skills:read': 'View skills and certifications',
  'locations:read': 'View location information',
  'jobs:read': 'View job postings',
  'reports:read': 'Access reports data',
  
  // Write scopes
  'employees:write': 'Create and update employees',
  'schedules:write': 'Create and modify schedules',
  'time:write': 'Create and modify time entries',
  'skills:write': 'Manage skills and verifications',
  'locations:write': 'Manage locations',
  'jobs:write': 'Manage job postings',
  
  // Special scopes
  'webhooks:manage': 'Configure webhooks',
  'integrations:manage': 'Manage integrations',
  'admin': 'Full administrative access',
};

// Rate limit tiers
export const RATE_LIMIT_TIERS = {
  basic: { requestsPerMinute: 60, requestsPerDay: 10000 },
  standard: { requestsPerMinute: 120, requestsPerDay: 50000 },
  premium: { requestsPerMinute: 300, requestsPerDay: 200000 },
  unlimited: { requestsPerMinute: 1000, requestsPerDay: null },
};

// -------------------- Key Generation --------------------

/**
 * Generate a new API key pair
 * @returns {{ keyId: string, secretKey: string }}
 */
function generateKeyPair() {
  // Key ID: prefix + random string (visible, used for identification)
  const keyId = API_KEY_PREFIX + crypto.randomBytes(API_KEY_LENGTH / 2).toString('hex');
  
  // Secret key: longer random string (shown only once)
  const secretKey = crypto.randomBytes(SECRET_KEY_LENGTH / 2).toString('hex');
  
  // Hash the secret for storage
  const secretHash = hashSecret(secretKey);
  
  return { keyId, secretKey, secretHash };
}

/**
 * Hash a secret key for storage
 */
function hashSecret(secret) {
  return crypto
    .createHash('sha256')
    .update(secret)
    .digest('hex');
}

/**
 * Verify a secret against its hash
 */
function verifySecret(secret, hash) {
  const secretHash = hashSecret(secret);
  return crypto.timingSafeEqual(Buffer.from(secretHash), Buffer.from(hash));
}

// -------------------- CRUD Operations --------------------

/**
 * Create a new API key
 */
export async function createApiKey(organizationId, userId, options = {}) {
  const {
    name = 'API Key',
    description = '',
    scopes = ['employees:read', 'schedules:read'],
    rateLimitTier = 'standard',
    expiresAt = null,
    ipWhitelist = [],
    metadata = {},
  } = options;
  
  const { keyId, secretKey, secretHash } = generateKeyPair();
  
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO api_keys (
        organization_id, 
        created_by_user_id,
        key_id, 
        secret_hash, 
        name, 
        description,
        scopes, 
        rate_limit_tier,
        expires_at,
        ip_whitelist,
        metadata,
        created_at,
        last_used_at,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NULL, true)
      RETURNING id, key_id, name, scopes, rate_limit_tier, created_at, expires_at
    `, [
      organizationId,
      userId,
      keyId,
      secretHash,
      name,
      description,
      JSON.stringify(scopes),
      rateLimitTier,
      expiresAt,
      JSON.stringify(ipWhitelist),
      JSON.stringify(metadata),
    ]);
    
    const apiKey = result.rows[0];
    
    return {
      ...apiKey,
      // Only return secret key on creation - never stored in plain text
      secretKey: secretKey,
      fullKey: `${keyId}.${secretKey}`,
      message: 'Save this secret key - it will not be shown again',
    };
  } finally {
    client.release();
  }
}

/**
 * List API keys for an organization
 */
export async function listApiKeys(organizationId) {
  const result = await pool.query(`
    SELECT 
      id,
      key_id,
      name,
      description,
      scopes,
      rate_limit_tier,
      is_active,
      created_at,
      expires_at,
      last_used_at,
      request_count,
      ip_whitelist
    FROM api_keys
    WHERE organization_id = $1
    ORDER BY created_at DESC
  `, [organizationId]);
  
  return result.rows.map(row => ({
    ...row,
    scopes: typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes,
    ipWhitelist: typeof row.ip_whitelist === 'string' ? JSON.parse(row.ip_whitelist) : row.ip_whitelist,
    // Mask the key ID for display
    maskedKeyId: maskKeyId(row.key_id),
  }));
}

/**
 * Get API key details
 */
export async function getApiKey(keyId, organizationId) {
  const result = await pool.query(`
    SELECT 
      ak.*,
      u.first_name || ' ' || u.last_name as created_by_name
    FROM api_keys ak
    LEFT JOIN users u ON u.id = ak.created_by_user_id
    WHERE ak.key_id = $1 AND ak.organization_id = $2
  `, [keyId, organizationId]);
  
  if (!result.rows[0]) {
    return null;
  }
  
  const key = result.rows[0];
  return {
    ...key,
    scopes: typeof key.scopes === 'string' ? JSON.parse(key.scopes) : key.scopes,
    ipWhitelist: typeof key.ip_whitelist === 'string' ? JSON.parse(key.ip_whitelist) : key.ip_whitelist,
    metadata: typeof key.metadata === 'string' ? JSON.parse(key.metadata) : key.metadata,
  };
}

/**
 * Update API key
 */
export async function updateApiKey(keyId, organizationId, updates) {
  const allowedUpdates = ['name', 'description', 'scopes', 'rate_limit_tier', 'expires_at', 'ip_whitelist', 'is_active'];
  
  const setClauses = [];
  const values = [keyId, organizationId];
  let paramIndex = 3;
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedUpdates.includes(key)) {
      const dbKey = key === 'ipWhitelist' ? 'ip_whitelist' : key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (key === 'scopes' || key === 'ip_whitelist' || key === 'ipWhitelist') {
        setClauses.push(`${dbKey} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }
  
  if (!setClauses.length) {
    return null;
  }
  
  setClauses.push('updated_at = NOW()');
  
  const result = await pool.query(`
    UPDATE api_keys 
    SET ${setClauses.join(', ')}
    WHERE key_id = $1 AND organization_id = $2
    RETURNING id, key_id, name, scopes, is_active, updated_at
  `, values);
  
  return result.rows[0] || null;
}

/**
 * Revoke (delete) API key
 */
export async function revokeApiKey(keyId, organizationId) {
  const result = await pool.query(`
    DELETE FROM api_keys
    WHERE key_id = $1 AND organization_id = $2
    RETURNING id, key_id, name
  `, [keyId, organizationId]);
  
  return result.rows[0] || null;
}

/**
 * Regenerate API key secret
 */
export async function regenerateSecret(keyId, organizationId) {
  const { secretKey, secretHash } = generateKeyPair();
  
  const result = await pool.query(`
    UPDATE api_keys
    SET secret_hash = $3, updated_at = NOW()
    WHERE key_id = $1 AND organization_id = $2
    RETURNING key_id, name
  `, [keyId, organizationId, secretHash]);
  
  if (!result.rows[0]) {
    return null;
  }
  
  return {
    ...result.rows[0],
    secretKey,
    fullKey: `${keyId}.${secretKey}`,
    message: 'Save this new secret key - it will not be shown again',
  };
}

// -------------------- Authentication --------------------

/**
 * Authenticate an API request
 * @param {string} authHeader - Authorization header value
 * @returns {Promise<{ valid: boolean, key?: object, error?: string }>}
 */
export async function authenticateRequest(authHeader) {
  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }
  
  // Support both "Bearer keyId.secret" and "Api-Key keyId.secret" formats
  let fullKey;
  if (authHeader.startsWith('Bearer ')) {
    fullKey = authHeader.substring(7);
  } else if (authHeader.startsWith('Api-Key ')) {
    fullKey = authHeader.substring(8);
  } else {
    return { valid: false, error: 'Invalid authorization format' };
  }
  
  const [keyId, secret] = fullKey.split('.');
  
  if (!keyId || !secret) {
    return { valid: false, error: 'Invalid API key format' };
  }
  
  // Look up the key
  const result = await pool.query(`
    SELECT 
      ak.*,
      o.slug as organization_slug
    FROM api_keys ak
    JOIN organizations o ON o.id = ak.organization_id
    WHERE ak.key_id = $1 AND ak.is_active = true
  `, [keyId]);
  
  const key = result.rows[0];
  
  if (!key) {
    return { valid: false, error: 'API key not found or inactive' };
  }
  
  // Check expiration
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }
  
  // Verify secret
  if (!verifySecret(secret, key.secret_hash)) {
    return { valid: false, error: 'Invalid API key secret' };
  }
  
  // Update usage stats (async, don't await)
  updateUsageStats(key.id).catch(console.error);
  
  return {
    valid: true,
    key: {
      id: key.id,
      keyId: key.key_id,
      organizationId: key.organization_id,
      organizationSlug: key.organization_slug,
      scopes: typeof key.scopes === 'string' ? JSON.parse(key.scopes) : key.scopes,
      rateLimitTier: key.rate_limit_tier,
      ipWhitelist: typeof key.ip_whitelist === 'string' ? JSON.parse(key.ip_whitelist) : key.ip_whitelist,
    },
  };
}

/**
 * Check if API key has required scope
 */
export function hasScope(keyScopes, requiredScope) {
  if (!keyScopes || !Array.isArray(keyScopes)) return false;
  
  // Admin scope grants all access
  if (keyScopes.includes('admin')) return true;
  
  // Check exact match
  if (keyScopes.includes(requiredScope)) return true;
  
  // Check wildcard (e.g., 'employees:*' matches 'employees:read')
  const [resource, action] = requiredScope.split(':');
  if (keyScopes.includes(`${resource}:*`)) return true;
  
  return false;
}

// -------------------- Rate Limiting --------------------

/**
 * Check rate limit for an API key
 */
export async function checkRateLimit(keyId, tier) {
  const limits = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.standard;
  
  // In production, use Redis for distributed rate limiting
  // This is a simplified in-memory version
  const now = Date.now();
  const minuteKey = `ratelimit:${keyId}:${Math.floor(now / 60000)}`;
  const dayKey = `ratelimit:${keyId}:${Math.floor(now / 86400000)}`;
  
  // For now, return allowed (implement with Redis in production)
  return {
    allowed: true,
    remaining: {
      perMinute: limits.requestsPerMinute,
      perDay: limits.requestsPerDay,
    },
    limits,
  };
}

// -------------------- Usage Tracking --------------------

/**
 * Update usage statistics for an API key
 */
async function updateUsageStats(keyId) {
  await pool.query(`
    UPDATE api_keys
    SET 
      last_used_at = NOW(),
      request_count = COALESCE(request_count, 0) + 1
    WHERE id = $1
  `, [keyId]);
}

/**
 * Get usage statistics for an API key
 */
export async function getUsageStats(keyId, organizationId) {
  const result = await pool.query(`
    SELECT 
      request_count,
      last_used_at,
      created_at,
      EXTRACT(DAY FROM NOW() - created_at) as days_active
    FROM api_keys
    WHERE key_id = $1 AND organization_id = $2
  `, [keyId, organizationId]);
  
  if (!result.rows[0]) return null;
  
  const key = result.rows[0];
  const daysActive = Math.max(1, parseInt(key.days_active) || 1);
  
  return {
    totalRequests: key.request_count || 0,
    avgRequestsPerDay: Math.round((key.request_count || 0) / daysActive),
    lastUsed: key.last_used_at,
    createdAt: key.created_at,
    daysActive,
  };
}

// -------------------- API Documentation Generation --------------------

/**
 * Generate OpenAPI spec for organization's API
 */
export function generateOpenApiSpec(organizationSlug, baseUrl) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Uplift API',
      description: 'Workforce management API for your organization',
      version: '1.0.0',
      contact: {
        name: 'Uplift Support',
        email: 'support@uplift.hr',
      },
    },
    servers: [
      {
        url: `${baseUrl}/api/v1/${organizationSlug}`,
        description: 'Production API',
      },
    ],
    security: [
      { ApiKeyAuth: [] },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'API key in format: Bearer {keyId}.{secret}',
        },
      },
      schemas: {
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'onboarding'] },
            departmentId: { type: 'string', format: 'uuid' },
            primaryLocationId: { type: 'string', format: 'uuid' },
            hireDate: { type: 'string', format: 'date' },
          },
        },
        Shift: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date' },
            startTime: { type: 'string', format: 'time' },
            endTime: { type: 'string', format: 'time' },
            employeeId: { type: 'string', format: 'uuid' },
            locationId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'] },
          },
        },
        TimeEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            employeeId: { type: 'string', format: 'uuid' },
            clockIn: { type: 'string', format: 'date-time' },
            clockOut: { type: 'string', format: 'date-time' },
            totalHours: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' },
          },
        },
      },
    },
    paths: {
      '/employees': {
        get: {
          summary: 'List employees',
          tags: ['Employees'],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'locationId', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            200: {
              description: 'List of employees',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      employees: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create employee',
          tags: ['Employees'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Employee' },
              },
            },
          },
          responses: {
            201: { description: 'Employee created' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/employees/{id}': {
        get: {
          summary: 'Get employee by ID',
          tags: ['Employees'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Employee details' },
            404: { description: 'Employee not found' },
          },
        },
      },
      '/schedules': {
        get: {
          summary: 'List shifts',
          tags: ['Schedules'],
          parameters: [
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'locationId', in: 'query', schema: { type: 'string' } },
            { name: 'employeeId', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'List of shifts' },
          },
        },
      },
      '/time-entries': {
        get: {
          summary: 'List time entries',
          tags: ['Time Tracking'],
          responses: {
            200: { description: 'List of time entries' },
          },
        },
      },
      '/webhooks': {
        get: {
          summary: 'List webhooks',
          tags: ['Webhooks'],
          responses: {
            200: { description: 'List of configured webhooks' },
          },
        },
        post: {
          summary: 'Create webhook',
          tags: ['Webhooks'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    events: { type: 'array', items: { type: 'string' } },
                    secret: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Webhook created' },
          },
        },
      },
    },
  };
}

// -------------------- Helpers --------------------

/**
 * Mask an API key ID for display
 */
function maskKeyId(keyId) {
  if (!keyId || keyId.length < 12) return keyId;
  return keyId.substring(0, 12) + '...' + keyId.substring(keyId.length - 4);
}

export default {
  createApiKey,
  listApiKeys,
  getApiKey,
  updateApiKey,
  revokeApiKey,
  regenerateSecret,
  authenticateRequest,
  hasScope,
  checkRateLimit,
  getUsageStats,
  generateOpenApiSpec,
  API_SCOPES,
  RATE_LIMIT_TIERS,
};
