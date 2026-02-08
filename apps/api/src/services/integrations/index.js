// ============================================================
// CUSTOMER DATA INTEGRATION FRAMEWORK
// Connectors, field mapping, and sync orchestration
// ============================================================

import { db } from '../../lib/database.js';

// ==================== IMPORT CONNECTORS ====================

import bamboohr from './connectors/bamboohr.js';
import hibob from './connectors/hibob.js';
import personio from './connectors/personio.js';
import sageHr from './connectors/sage-hr.js';
import breatheHr from './connectors/breathe-hr.js';
import charlieHr from './connectors/charlie-hr.js';
import xero from './connectors/xero.js';
import square from './connectors/square.js';
import slack from './connectors/slack.js';
import microsoftTeams from './connectors/microsoft-teams.js';
import whatsappBusiness from './connectors/whatsapp-business.js';
import googleWorkspace from './connectors/google-workspace.js';

// ==================== CONNECTOR REGISTRY ====================

const connectorRegistry = new Map();

// Register all connectors
const connectors = {
  bamboohr,
  hibob,
  personio,
  'sage-hr': sageHr,
  'breathe-hr': breatheHr,
  'charlie-hr': charlieHr,
  xero,
  square,
  slack,
  'microsoft-teams': microsoftTeams,
  'whatsapp-business': whatsappBusiness,
  'google-workspace': googleWorkspace
};

// Initialize registry
Object.entries(connectors).forEach(([id, connector]) => {
  connectorRegistry.set(id, connector);
});

/**
 * Register a new integration connector
 */
export function registerConnector(type, connector) {
  connectorRegistry.set(type, connector);
}

/**
 * Get a connector by ID
 */
export function getConnector(id) {
  return connectorRegistry.get(id);
}

/**
 * Get all available connectors with metadata
 */
export function listConnectors(category = null) {
  const allConnectors = Array.from(connectorRegistry.values()).map(c => ({
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    logo: c.logo,
    authType: c.authType,
    authFields: c.authFields
  }));

  if (category) {
    return allConnectors.filter(c => c.category === category);
  }

  return allConnectors;
}

/**
 * Get all available connector types (legacy)
 */
export function getAvailableConnectors() {
  return Array.from(connectorRegistry.keys());
}

/**
 * Test connection for a specific connector
 */
export async function testConnection(connectorId, credentials) {
  const connector = getConnector(connectorId);
  if (!connector) {
    return { success: false, error: `Connector not found: ${connectorId}` };
  }

  try {
    return await connector.testConnection(credentials);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Run a sync for a specific connector and save to database
 */
export async function runSync(connectorId, credentials, organizationId, options = {}) {
  const connector = getConnector(connectorId);
  if (!connector) {
    throw new Error(`Connector not found: ${connectorId}`);
  }

  const syncLog = {
    id: null,
    connector_id: connectorId,
    organization_id: organizationId,
    started_at: new Date(),
    status: 'running'
  };

  try {
    // Create sync log
    const logResult = await db.query(`
      INSERT INTO integration_sync_logs (organization_id, connector_type, status, started_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `, [organizationId, connectorId, 'running']);
    syncLog.id = logResult.rows[0]?.id;

    // Run the sync
    const result = await connector.syncEmployees(credentials, options);

    if (!result.success) {
      throw new Error(result.error || 'Sync failed');
    }

    // Upsert employees
    let created = 0;
    let updated = 0;
    const errors = [...(result.errors || [])];

    for (const employee of result.employees) {
      try {
        const upsertResult = await db.query(`
          INSERT INTO employees (
            organization_id, external_id, external_source, email, first_name, last_name,
            phone, job_title, department, location_id, start_date, employment_type,
            hourly_rate, is_active, metadata, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
          ON CONFLICT (organization_id, external_id, external_source)
          DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            job_title = EXCLUDED.job_title,
            department = EXCLUDED.department,
            location_id = EXCLUDED.location_id,
            start_date = EXCLUDED.start_date,
            employment_type = EXCLUDED.employment_type,
            hourly_rate = EXCLUDED.hourly_rate,
            is_active = EXCLUDED.is_active,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `, [
          organizationId,
          employee.external_id,
          connectorId,
          employee.email,
          employee.first_name,
          employee.last_name,
          employee.phone,
          employee.job_title,
          employee.department,
          null, // location_id would need lookup
          employee.start_date,
          employee.employment_type,
          employee.hourly_rate,
          employee.is_active,
          JSON.stringify(employee.metadata || {})
        ]);

        if (upsertResult.rows[0]?.inserted) {
          created++;
        } else {
          updated++;
        }
      } catch (empError) {
        errors.push({
          external_id: employee.external_id,
          error: empError.message
        });
      }
    }

    // Update sync log with success
    if (syncLog.id) {
      await db.query(`
        UPDATE integration_sync_logs
        SET status = 'completed', completed_at = NOW(),
            results = $2
        WHERE id = $1
      `, [syncLog.id, JSON.stringify({ created, updated, errors: errors.length })]);
    }

    return {
      success: true,
      syncId: syncLog.id,
      created,
      updated,
      errors,
      metadata: result.metadata
    };

  } catch (error) {
    // Update sync log with failure
    if (syncLog.id) {
      await db.query(`
        UPDATE integration_sync_logs
        SET status = 'failed', completed_at = NOW(),
            results = $2
        WHERE id = $1
      `, [syncLog.id, JSON.stringify({ error: error.message })]);
    }

    return {
      success: false,
      syncId: syncLog.id,
      error: error.message,
      created: 0,
      updated: 0,
      errors: [{ error: error.message }]
    };
  }
}

// ==================== BASE CONNECTOR CLASS ====================

export class BaseConnector {
  constructor(config) {
    this.config = config;
    this.organizationId = config.organizationId;
    this.credentials = config.credentials || {};
  }

  /**
   * Test the connection to the external system
   */
  async testConnection() {
    throw new Error('testConnection must be implemented');
  }

  /**
   * Fetch data from the external system
   */
  async fetchData(entityType, options = {}) {
    throw new Error('fetchData must be implemented');
  }

  /**
   * Push data to the external system
   */
  async pushData(entityType, data, options = {}) {
    throw new Error('pushData must be implemented');
  }

  /**
   * Get available entity types for this connector
   */
  getEntityTypes() {
    return [];
  }

  /**
   * Get field schema for an entity type
   */
  getFieldSchema(entityType) {
    return {};
  }
}

// ==================== FIELD MAPPING SERVICE ====================

export const fieldMappingService = {
  /**
   * Get field mappings for an integration
   */
  async getMappings(integrationId) {
    const result = await db.query(`
      SELECT * FROM integration_field_mappings
      WHERE integration_id = $1
      ORDER BY entity_type, target_field
    `, [integrationId]);
    return result.rows;
  },

  /**
   * Save field mappings for an integration
   */
  async saveMappings(integrationId, mappings) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Delete existing mappings
      await client.query(
        'DELETE FROM integration_field_mappings WHERE integration_id = $1',
        [integrationId]
      );

      // Insert new mappings
      for (const mapping of mappings) {
        await client.query(`
          INSERT INTO integration_field_mappings (
            integration_id, entity_type, source_field, target_field,
            transform, default_value, is_required
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          integrationId,
          mapping.entityType,
          mapping.sourceField,
          mapping.targetField,
          mapping.transform || null,
          mapping.defaultValue || null,
          mapping.isRequired || false
        ]);
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Apply field mappings to transform data
   */
  applyMappings(data, mappings, direction = 'import') {
    const result = {};

    for (const mapping of mappings) {
      const sourceKey = direction === 'import' ? mapping.source_field : mapping.target_field;
      const targetKey = direction === 'import' ? mapping.target_field : mapping.source_field;

      let value = data[sourceKey];

      // Apply transform if specified
      if (mapping.transform && value !== undefined) {
        value = this.applyTransform(value, mapping.transform);
      }

      // Use default value if needed
      if (value === undefined || value === null) {
        value = mapping.default_value;
      }

      if (value !== undefined && value !== null) {
        result[targetKey] = value;
      }
    }

    return result;
  },

  /**
   * Apply a transform function to a value
   */
  applyTransform(value, transform) {
    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'date_iso':
        return new Date(value).toISOString();
      case 'date_short':
        return new Date(value).toISOString().split('T')[0];
      case 'number':
        return parseFloat(value) || 0;
      case 'integer':
        return parseInt(value) || 0;
      case 'boolean':
        return Boolean(value);
      case 'json_parse':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'json_stringify':
        return JSON.stringify(value);
      default:
        return value;
    }
  }
};

// ==================== SYNC ORCHESTRATION SERVICE ====================

export const syncOrchestrator = {
  /**
   * Run a full sync for an integration
   */
  async runSync(integrationId, options = {}) {
    const syncLog = await this.createSyncLog(integrationId);

    try {
      // Get integration config
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const connector = getConnector(integration.connector_type);
      if (!connector) {
        throw new Error(`Connector not found: ${integration.connector_type}`);
      }

      // Initialize connector
      const connectorInstance = new connector({
        organizationId: integration.organization_id,
        credentials: integration.credentials,
        settings: integration.settings,
      });

      // Get mappings
      const mappings = await fieldMappingService.getMappings(integrationId);
      const mappingsByEntity = this.groupMappingsByEntity(mappings);

      // Run sync for each entity type
      const results = {
        imported: 0,
        updated: 0,
        errors: [],
      };

      for (const [entityType, entityMappings] of Object.entries(mappingsByEntity)) {
        if (options.entityTypes && !options.entityTypes.includes(entityType)) {
          continue;
        }

        try {
          const entityResult = await this.syncEntityType(
            connectorInstance,
            integration,
            entityType,
            entityMappings,
            options
          );
          results.imported += entityResult.imported;
          results.updated += entityResult.updated;
          results.errors.push(...entityResult.errors);
        } catch (error) {
          results.errors.push({
            entityType,
            error: error.message,
          });
        }
      }

      // Update sync log
      await this.completeSyncLog(syncLog.id, 'completed', results);

      return {
        syncId: syncLog.id,
        ...results,
      };
    } catch (error) {
      await this.completeSyncLog(syncLog.id, 'failed', { error: error.message });
      throw error;
    }
  },

  /**
   * Sync a specific entity type
   */
  async syncEntityType(connector, integration, entityType, mappings, options = {}) {
    const result = {
      imported: 0,
      updated: 0,
      errors: [],
    };

    // Fetch data from external system
    const externalData = await connector.fetchData(entityType, {
      since: options.since || integration.last_sync_at,
      limit: options.limit,
    });

    // Process each record
    for (const record of externalData) {
      try {
        const mappedData = fieldMappingService.applyMappings(record, mappings, 'import');

        // Check if record exists
        const existing = await this.findExistingRecord(
          integration.organization_id,
          entityType,
          record,
          integration.id
        );

        if (existing) {
          await this.updateRecord(entityType, existing.id, mappedData);
          result.updated++;
        } else {
          await this.createRecord(entityType, integration.organization_id, mappedData, {
            integrationId: integration.id,
            externalId: record.id || record.external_id,
          });
          result.imported++;
        }
      } catch (error) {
        result.errors.push({
          record: record.id || record.external_id,
          error: error.message,
        });
      }
    }

    return result;
  },

  /**
   * Find existing record by external ID
   */
  async findExistingRecord(organizationId, entityType, externalRecord, integrationId) {
    const externalId = externalRecord.id || externalRecord.external_id;

    const result = await db.query(`
      SELECT e.id FROM ${this.getTableName(entityType)} e
      JOIN integration_sync_records sr ON sr.entity_id = e.id
      WHERE sr.integration_id = $1
        AND sr.entity_type = $2
        AND sr.external_id = $3
    `, [integrationId, entityType, externalId]);

    return result.rows[0];
  },

  /**
   * Create a new record
   */
  async createRecord(entityType, organizationId, data, meta) {
    const tableName = this.getTableName(entityType);
    const fields = ['organization_id', ...Object.keys(data)];
    const values = [organizationId, ...Object.values(data)];
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const result = await db.query(`
      INSERT INTO ${tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING id
    `, values);

    // Create sync record for tracking
    await db.query(`
      INSERT INTO integration_sync_records (
        integration_id, entity_type, entity_id, external_id, last_synced_at
      )
      VALUES ($1, $2, $3, $4, NOW())
    `, [meta.integrationId, entityType, result.rows[0].id, meta.externalId]);

    return result.rows[0];
  },

  /**
   * Update an existing record
   */
  async updateRecord(entityType, id, data) {
    const tableName = this.getTableName(entityType);
    const setClauses = Object.keys(data).map((key, i) => `${key} = $${i + 2}`);
    const values = [id, ...Object.values(data)];

    await db.query(`
      UPDATE ${tableName}
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $1
    `, values);
  },

  /**
   * Get table name for entity type
   */
  getTableName(entityType) {
    const tableMap = {
      employees: 'employees',
      locations: 'locations',
      departments: 'departments',
      shifts: 'shifts',
      time_entries: 'time_entries',
      skills: 'skills',
    };
    return tableMap[entityType] || entityType;
  },

  /**
   * Group mappings by entity type
   */
  groupMappingsByEntity(mappings) {
    return mappings.reduce((acc, mapping) => {
      if (!acc[mapping.entity_type]) {
        acc[mapping.entity_type] = [];
      }
      acc[mapping.entity_type].push(mapping);
      return acc;
    }, {});
  },

  /**
   * Get integration by ID
   */
  async getIntegration(id) {
    const result = await db.query(
      'SELECT * FROM integrations WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  /**
   * Create sync log entry
   */
  async createSyncLog(integrationId) {
    const result = await db.query(`
      INSERT INTO integration_sync_logs (integration_id, status, started_at)
      VALUES ($1, 'running', NOW())
      RETURNING *
    `, [integrationId]);
    return result.rows[0];
  },

  /**
   * Complete sync log entry
   */
  async completeSyncLog(id, status, results) {
    await db.query(`
      UPDATE integration_sync_logs
      SET status = $2, completed_at = NOW(), results = $3
      WHERE id = $1
    `, [id, status, JSON.stringify(results)]);

    // Update integration last sync time if successful
    if (status === 'completed') {
      const log = await db.query('SELECT integration_id FROM integration_sync_logs WHERE id = $1', [id]);
      await db.query(`
        UPDATE integrations
        SET last_sync_at = NOW(), last_sync_status = 'success'
        WHERE id = $1
      `, [log.rows[0].integration_id]);
    }
  },

  /**
   * Get sync history for an integration
   */
  async getSyncHistory(integrationId, limit = 20) {
    const result = await db.query(`
      SELECT * FROM integration_sync_logs
      WHERE integration_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `, [integrationId, limit]);
    return result.rows;
  },
};

// ==================== WEBHOOK HANDLER ====================

export const webhookHandler = {
  /**
   * Process incoming webhook from external system
   */
  async processWebhook(integrationId, payload, signature) {
    const integration = await syncOrchestrator.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Verify signature if configured
    if (integration.webhook_secret) {
      const isValid = this.verifySignature(payload, signature, integration.webhook_secret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Log webhook
    await db.query(`
      INSERT INTO integration_webhook_logs (integration_id, payload, received_at)
      VALUES ($1, $2, NOW())
    `, [integrationId, JSON.stringify(payload)]);

    // Process based on event type
    const eventType = payload.event || payload.type || payload.action;

    switch (eventType) {
      case 'employee.created':
      case 'employee.updated':
        return this.handleEmployeeEvent(integration, payload);
      case 'shift.created':
      case 'shift.updated':
        return this.handleShiftEvent(integration, payload);
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
        return { processed: false, reason: 'Unhandled event type' };
    }
  },

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  },

  /**
   * Handle employee-related webhook events
   */
  async handleEmployeeEvent(integration, payload) {
    // Trigger incremental sync for employees
    return syncOrchestrator.runSync(integration.id, {
      entityTypes: ['employees'],
      since: new Date(Date.now() - 60000), // Last minute
    });
  },

  /**
   * Handle shift-related webhook events
   */
  async handleShiftEvent(integration, payload) {
    return syncOrchestrator.runSync(integration.id, {
      entityTypes: ['shifts'],
      since: new Date(Date.now() - 60000),
    });
  },
};

export default {
  // Connector management
  registerConnector,
  getConnector,
  getAvailableConnectors,
  listConnectors,
  testConnection,
  runSync,

  // Base classes
  BaseConnector,

  // Services
  fieldMappingService,
  syncOrchestrator,
  webhookHandler,

  // Individual connectors (for direct access)
  connectors: {
    bamboohr,
    hibob,
    personio,
    sageHr,
    breatheHr,
    charlieHr,
    xero,
    square,
    slack,
    microsoftTeams,
    whatsappBusiness,
    googleWorkspace
  }
};
