// ============================================================
// UPLIFT CUSTOM ENDPOINTS SERVICE
// Create and manage custom REST API integrations (API Factory)
// ============================================================

import { db } from '../lib/database.js';
import crypto from 'crypto';

// -------------------- Constants --------------------

const TIMEOUT_MS = 30000; // 30 second timeout for requests
const MAX_RESPONSE_BODY_SIZE = 1024 * 1024; // 1MB max stored response

// Auth types
const AUTH_TYPES = ['none', 'api_key', 'bearer', 'basic', 'oauth2'];
const TRIGGER_TYPES = ['manual', 'schedule', 'event', 'webhook'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// -------------------- CRUD Operations --------------------

/**
 * Create a new custom endpoint
 */
export async function create(organizationId, userId, data) {
  const {
    name,
    description = '',
    method = 'GET',
    url,
    headers = {},
    body_template = null,
    auth_type = 'none',
    auth_config = {},
    trigger_type = 'manual',
    trigger_config = {},
    field_mappings = [],
  } = data;

  // Validate required fields
  if (!name || !name.trim()) {
    throw new Error('Name is required');
  }
  if (!url || !url.trim()) {
    throw new Error('URL is required');
  }
  if (!HTTP_METHODS.includes(method.toUpperCase())) {
    throw new Error(`Invalid method. Must be one of: ${HTTP_METHODS.join(', ')}`);
  }
  if (!AUTH_TYPES.includes(auth_type)) {
    throw new Error(`Invalid auth type. Must be one of: ${AUTH_TYPES.join(', ')}`);
  }
  if (!TRIGGER_TYPES.includes(trigger_type)) {
    throw new Error(`Invalid trigger type. Must be one of: ${TRIGGER_TYPES.join(', ')}`);
  }

  // Encrypt sensitive auth config data
  const encryptedAuthConfig = encryptAuthConfig(auth_config);

  const result = await db.query(`
    INSERT INTO custom_endpoints (
      organization_id,
      name,
      description,
      method,
      url,
      headers,
      body_template,
      auth_type,
      auth_config,
      trigger_type,
      trigger_config,
      field_mappings,
      created_by,
      is_active,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW())
    RETURNING *
  `, [
    organizationId,
    name.trim(),
    description,
    method.toUpperCase(),
    url.trim(),
    JSON.stringify(headers),
    body_template ? JSON.stringify(body_template) : null,
    auth_type,
    JSON.stringify(encryptedAuthConfig),
    trigger_type,
    JSON.stringify(trigger_config),
    JSON.stringify(field_mappings),
    userId,
  ]);

  // Log the creation
  await logSync(organizationId, null, result.rows[0].id, 'endpoint.created', 'success', {
    name: name.trim(),
    method: method.toUpperCase(),
  });

  return sanitizeEndpoint(result.rows[0]);
}

/**
 * List custom endpoints with pagination
 */
export async function list(organizationId, options = {}) {
  const { page = 1, limit = 20, search = '', active_only = true } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'organization_id = $1';
  const params = [organizationId];

  if (active_only) {
    whereClause += ' AND is_active = true';
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM custom_endpoints WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  const result = await db.query(`
    SELECT * FROM custom_endpoints
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset]);

  return {
    endpoints: result.rows.map(sanitizeEndpoint),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single endpoint by ID
 */
export async function getById(organizationId, endpointId) {
  const result = await db.query(`
    SELECT * FROM custom_endpoints
    WHERE id = $1 AND organization_id = $2
  `, [endpointId, organizationId]);

  if (!result.rows[0]) {
    return null;
  }

  return sanitizeEndpoint(result.rows[0]);
}

/**
 * Update an endpoint
 */
export async function update(organizationId, endpointId, data) {
  // First check if exists
  const existing = await getById(organizationId, endpointId);
  if (!existing) {
    return null;
  }

  const updates = [];
  const params = [endpointId, organizationId];
  let paramIndex = 3;

  // Build dynamic update query
  const allowedFields = [
    'name', 'description', 'method', 'url', 'headers',
    'body_template', 'auth_type', 'trigger_type', 'trigger_config',
    'field_mappings', 'is_active'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      let value = data[field];

      // Validate method
      if (field === 'method') {
        value = value.toUpperCase();
        if (!HTTP_METHODS.includes(value)) {
          throw new Error(`Invalid method. Must be one of: ${HTTP_METHODS.join(', ')}`);
        }
      }

      // Validate auth_type
      if (field === 'auth_type' && !AUTH_TYPES.includes(value)) {
        throw new Error(`Invalid auth type. Must be one of: ${AUTH_TYPES.join(', ')}`);
      }

      // Validate trigger_type
      if (field === 'trigger_type' && !TRIGGER_TYPES.includes(value)) {
        throw new Error(`Invalid trigger type. Must be one of: ${TRIGGER_TYPES.join(', ')}`);
      }

      // Serialize JSONB fields
      if (['headers', 'body_template', 'trigger_config', 'field_mappings'].includes(field)) {
        value = JSON.stringify(value);
      }

      updates.push(`${field} = $${paramIndex++}`);
      params.push(value);
    }
  }

  // Handle auth_config separately (needs encryption)
  if (data.auth_config !== undefined) {
    const encryptedAuthConfig = encryptAuthConfig(data.auth_config);
    updates.push(`auth_config = $${paramIndex++}`);
    params.push(JSON.stringify(encryptedAuthConfig));
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = NOW()`);

  const result = await db.query(`
    UPDATE custom_endpoints
    SET ${updates.join(', ')}
    WHERE id = $1 AND organization_id = $2
    RETURNING *
  `, params);

  // Log the update
  await logSync(organizationId, null, endpointId, 'endpoint.updated', 'success', {
    fields: Object.keys(data).filter(k => data[k] !== undefined),
  });

  return sanitizeEndpoint(result.rows[0]);
}

/**
 * Soft delete an endpoint (set is_active = false)
 */
export async function remove(organizationId, endpointId) {
  const result = await db.query(`
    UPDATE custom_endpoints
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND organization_id = $2
    RETURNING id
  `, [endpointId, organizationId]);

  if (!result.rows[0]) {
    return false;
  }

  // Log the deletion
  await logSync(organizationId, null, endpointId, 'endpoint.deleted', 'info', {});

  return true;
}

/**
 * Hard delete an endpoint (permanent)
 */
export async function hardDelete(organizationId, endpointId) {
  const result = await db.query(`
    DELETE FROM custom_endpoints
    WHERE id = $1 AND organization_id = $2
    RETURNING id
  `, [endpointId, organizationId]);

  return !!result.rows[0];
}

// -------------------- Execution --------------------

/**
 * Test an endpoint (makes real HTTP request)
 */
export async function test(organizationId, endpointId, overrides = {}) {
  return execute(organizationId, endpointId, 'test', {}, overrides);
}

/**
 * Execute an endpoint (makes real HTTP request)
 */
export async function execute(organizationId, endpointId, triggerType = 'manual', payload = {}, overrides = {}) {
  // Get endpoint config
  const result = await db.query(`
    SELECT * FROM custom_endpoints
    WHERE id = $1 AND organization_id = $2
  `, [endpointId, organizationId]);

  if (!result.rows[0]) {
    throw new Error('Endpoint not found');
  }

  const endpoint = result.rows[0];

  // Build request config
  const method = overrides.method || endpoint.method;
  let url = overrides.url || endpoint.url;
  let headers = { ...parseJsonField(endpoint.headers), ...overrides.headers };
  let body = overrides.body || parseJsonField(endpoint.body_template);

  // Apply auth
  const authConfig = decryptAuthConfig(parseJsonField(endpoint.auth_config));
  headers = applyAuth(headers, endpoint.auth_type, authConfig);

  // Apply field mappings if payload provided
  if (Object.keys(payload).length > 0 && body) {
    const mappings = parseJsonField(endpoint.field_mappings);
    body = applyFieldMappings(body, payload, mappings);
  }

  // Prepare request
  const requestConfig = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Uplift-API-Factory/1.0',
      ...headers,
    },
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestConfig.body = JSON.stringify(body);
  }

  // Create execution record
  const executionResult = await db.query(`
    INSERT INTO custom_endpoint_executions (
      endpoint_id,
      organization_id,
      trigger,
      request_method,
      request_url,
      request_headers,
      request_body,
      status,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
    RETURNING id
  `, [
    endpointId,
    organizationId,
    triggerType,
    method,
    url,
    JSON.stringify(sanitizeHeaders(headers)),
    body ? JSON.stringify(body) : null,
  ]);

  const executionId = executionResult.rows[0].id;

  // Execute the request
  const startTime = Date.now();
  let response = null;
  let responseBody = null;
  let responseHeaders = null;
  let status = 'success';
  let errorMessage = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    response = await fetch(url, {
      ...requestConfig,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    responseHeaders = Object.fromEntries(response.headers.entries());
    responseBody = await response.text();

    // Truncate if too large
    if (responseBody.length > MAX_RESPONSE_BODY_SIZE) {
      responseBody = responseBody.slice(0, MAX_RESPONSE_BODY_SIZE) + '... [truncated]';
    }

    if (!response.ok) {
      status = 'error';
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    status = 'error';
    errorMessage = error.name === 'AbortError'
      ? `Request timeout after ${TIMEOUT_MS}ms`
      : error.message;
  }

  const durationMs = Date.now() - startTime;

  // Update execution record
  await db.query(`
    UPDATE custom_endpoint_executions
    SET
      response_status = $1,
      response_headers = $2,
      response_body = $3,
      duration_ms = $4,
      status = $5,
      error_message = $6
    WHERE id = $7
  `, [
    response?.status || null,
    responseHeaders ? JSON.stringify(responseHeaders) : null,
    responseBody,
    durationMs,
    status,
    errorMessage,
    executionId,
  ]);

  // Log the execution
  await logSync(organizationId, null, endpointId, `endpoint.${triggerType}`, status, {
    executionId,
    responseStatus: response?.status,
    durationMs,
  });

  return {
    id: executionId,
    status,
    statusCode: response?.status || null,
    headers: responseHeaders,
    body: responseBody,
    durationMs,
    error: errorMessage,
  };
}

/**
 * Get execution logs for an endpoint
 */
export async function getLogs(organizationId, endpointId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await db.query(`
    SELECT COUNT(*) FROM custom_endpoint_executions
    WHERE endpoint_id = $1 AND organization_id = $2
  `, [endpointId, organizationId]);
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  const result = await db.query(`
    SELECT
      id,
      trigger,
      request_method,
      request_url,
      response_status,
      duration_ms,
      status,
      error_message,
      created_at
    FROM custom_endpoint_executions
    WHERE endpoint_id = $1 AND organization_id = $2
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
  `, [endpointId, organizationId, limit, offset]);

  return {
    logs: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single execution by ID (with full details)
 */
export async function getExecution(organizationId, executionId) {
  const result = await db.query(`
    SELECT * FROM custom_endpoint_executions
    WHERE id = $1 AND organization_id = $2
  `, [executionId, organizationId]);

  return result.rows[0] || null;
}

// -------------------- Field Mappings --------------------

/**
 * Get field mappings for an integration or endpoint
 */
export async function getFieldMappings(organizationId, integrationId = null, endpointId = null) {
  let query = 'SELECT * FROM integration_field_mappings WHERE organization_id = $1';
  const params = [organizationId];

  if (integrationId) {
    query += ' AND integration_id = $2';
    params.push(integrationId);
  } else if (endpointId) {
    query += ' AND endpoint_id = $2';
    params.push(endpointId);
  }

  query += ' AND is_active = true ORDER BY created_at';

  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Save field mappings (replaces existing)
 */
export async function saveFieldMappings(organizationId, integrationId, endpointId, mappings) {
  // Start transaction
  return db.transaction(async (client) => {
    // Delete existing mappings
    await client.query(`
      DELETE FROM integration_field_mappings
      WHERE organization_id = $1
      AND (integration_id = $2 OR ($2 IS NULL AND integration_id IS NULL))
      AND (endpoint_id = $3 OR ($3 IS NULL AND endpoint_id IS NULL))
    `, [organizationId, integrationId, endpointId]);

    // Insert new mappings
    const insertedMappings = [];
    for (const mapping of mappings) {
      const result = await client.query(`
        INSERT INTO integration_field_mappings (
          organization_id,
          integration_id,
          endpoint_id,
          source_field,
          target_field,
          transform,
          transform_config,
          is_active,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
        RETURNING *
      `, [
        organizationId,
        integrationId,
        endpointId,
        mapping.source_field,
        mapping.target_field,
        mapping.transform || 'direct',
        mapping.transform_config ? JSON.stringify(mapping.transform_config) : null,
      ]);
      insertedMappings.push(result.rows[0]);
    }

    return insertedMappings;
  });
}

/**
 * Delete field mappings
 */
export async function deleteFieldMappings(organizationId, integrationId = null, endpointId = null) {
  let query = 'DELETE FROM integration_field_mappings WHERE organization_id = $1';
  const params = [organizationId];

  if (integrationId) {
    query += ' AND integration_id = $2';
    params.push(integrationId);
  } else if (endpointId) {
    query += ' AND endpoint_id = $2';
    params.push(endpointId);
  }

  await db.query(query, params);
  return true;
}

// -------------------- Sync Logs --------------------

/**
 * Log a sync/integration action
 */
export async function logSync(organizationId, integrationId, endpointId, action, status, details = {}) {
  await db.query(`
    INSERT INTO integration_sync_logs (
      organization_id,
      integration_id,
      endpoint_id,
      action,
      status,
      records_processed,
      records_failed,
      details,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  `, [
    organizationId,
    integrationId,
    endpointId,
    action,
    status,
    details.recordsProcessed || 0,
    details.recordsFailed || 0,
    JSON.stringify(details),
  ]);
}

/**
 * Get sync logs
 */
export async function getSyncLogs(organizationId, options = {}) {
  const { integrationId, endpointId, page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'organization_id = $1';
  const params = [organizationId];

  if (integrationId) {
    params.push(integrationId);
    whereClause += ` AND integration_id = $${params.length}`;
  }
  if (endpointId) {
    params.push(endpointId);
    whereClause += ` AND endpoint_id = $${params.length}`;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM integration_sync_logs WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  const result = await db.query(`
    SELECT * FROM integration_sync_logs
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset]);

  return {
    logs: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// -------------------- Helper Functions --------------------

/**
 * Parse a JSONB field safely
 */
function parseJsonField(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Sanitize endpoint for API response (remove sensitive data)
 */
function sanitizeEndpoint(endpoint) {
  if (!endpoint) return null;

  return {
    id: endpoint.id,
    name: endpoint.name,
    description: endpoint.description,
    method: endpoint.method,
    url: endpoint.url,
    headers: parseJsonField(endpoint.headers) || {},
    body_template: parseJsonField(endpoint.body_template),
    auth_type: endpoint.auth_type,
    // Don't expose auth_config values, just show configured fields
    auth_config_keys: Object.keys(parseJsonField(endpoint.auth_config) || {}),
    trigger_type: endpoint.trigger_type,
    trigger_config: parseJsonField(endpoint.trigger_config) || {},
    field_mappings: parseJsonField(endpoint.field_mappings) || [],
    is_active: endpoint.is_active,
    created_at: endpoint.created_at,
    updated_at: endpoint.updated_at,
  };
}

/**
 * Sanitize headers for logging (remove sensitive values)
 */
function sanitizeHeaders(headers) {
  const sensitive = ['authorization', 'x-api-key', 'api-key', 'apikey', 'token'];
  const sanitized = { ...headers };

  for (const key of Object.keys(sanitized)) {
    if (sensitive.includes(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    }
  }

  return sanitized;
}

/**
 * Encrypt auth config for storage
 * In production, use proper encryption (e.g., AWS KMS, Vault)
 */
function encryptAuthConfig(config) {
  // For now, just base64 encode - in production use proper encryption
  // TODO: Implement proper encryption with environment-based key
  if (!config || Object.keys(config).length === 0) return {};

  const encrypted = {};
  for (const [key, value] of Object.entries(config)) {
    if (value && typeof value === 'string') {
      encrypted[key] = Buffer.from(value).toString('base64');
    } else {
      encrypted[key] = value;
    }
  }
  encrypted._encrypted = true;
  return encrypted;
}

/**
 * Decrypt auth config for use
 */
function decryptAuthConfig(config) {
  if (!config || !config._encrypted) return config || {};

  const decrypted = {};
  for (const [key, value] of Object.entries(config)) {
    if (key === '_encrypted') continue;
    if (value && typeof value === 'string') {
      try {
        decrypted[key] = Buffer.from(value, 'base64').toString('utf8');
      } catch {
        decrypted[key] = value;
      }
    } else {
      decrypted[key] = value;
    }
  }
  return decrypted;
}

/**
 * Apply authentication to headers
 */
function applyAuth(headers, authType, authConfig) {
  const result = { ...headers };

  switch (authType) {
    case 'api_key':
      if (authConfig.header_name && authConfig.api_key) {
        result[authConfig.header_name] = authConfig.api_key;
      } else if (authConfig.api_key) {
        result['X-API-Key'] = authConfig.api_key;
      }
      break;

    case 'bearer':
      if (authConfig.token) {
        result['Authorization'] = `Bearer ${authConfig.token}`;
      }
      break;

    case 'basic':
      if (authConfig.username && authConfig.password) {
        const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
        result['Authorization'] = `Basic ${credentials}`;
      }
      break;

    case 'oauth2':
      if (authConfig.access_token) {
        result['Authorization'] = `Bearer ${authConfig.access_token}`;
      }
      break;
  }

  return result;
}

/**
 * Apply field mappings to transform data
 */
function applyFieldMappings(template, data, mappings) {
  if (!mappings || !mappings.length) return template;

  let result = JSON.stringify(template);

  for (const mapping of mappings) {
    const sourceValue = getNestedValue(data, mapping.source_field);
    if (sourceValue !== undefined) {
      const transformedValue = applyTransform(sourceValue, mapping.transform, mapping.transform_config);
      // Replace placeholder in template
      result = result.replace(
        new RegExp(`\\{\\{${mapping.target_field}\\}\\}`, 'g'),
        JSON.stringify(transformedValue).slice(1, -1) // Remove quotes for embedding
      );
    }
  }

  return JSON.parse(result);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Apply transform to a value
 */
function applyTransform(value, transform, config) {
  switch (transform) {
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'format_date':
      return formatDate(value, config?.format);
    case 'concat':
      return config?.prefix + String(value) + (config?.suffix || '');
    case 'custom':
      // Custom transforms would need a safe eval or template engine
      return value;
    default:
      return value;
  }
}

/**
 * Format a date value
 */
function formatDate(value, format = 'ISO') {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  switch (format) {
    case 'ISO':
      return date.toISOString();
    case 'DATE':
      return date.toISOString().split('T')[0];
    case 'TIMESTAMP':
      return Math.floor(date.getTime() / 1000);
    default:
      return date.toISOString();
  }
}

// Export all functions
export default {
  create,
  list,
  getById,
  update,
  remove,
  hardDelete,
  test,
  execute,
  getLogs,
  getExecution,
  getFieldMappings,
  saveFieldMappings,
  deleteFieldMappings,
  logSync,
  getSyncLogs,
};
