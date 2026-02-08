// ============================================================
// UPLIFT INTEGRATIONS API
// Routes for API keys, webhooks, and OAuth integrations
// ============================================================

import express from 'express';
import crypto from 'crypto';
import { authMiddleware, requireRole } from '../middleware/index.js';
import apiKeys from '../services/apiKeys.js';
import { db } from '../lib/database.js';
import integrations, { getConnector, testConnection, runSync, listConnectors } from '../services/integrations/index.js';

// Use db.query for queries and db.getClient() for transactions
const pool = { 
  query: db.query.bind(db), 
  connect: db.getClient.bind(db) 
};

const router = express.Router();

// ==================== API KEYS ====================

/**
 * List API keys
 */
router.get('/api-keys', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const keys = await apiKeys.listApiKeys(req.user.organizationId);
    res.json({ keys });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * Create API key
 */
router.post('/api-keys', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, scopes, rateLimitTier, expiresAt, ipWhitelist } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const key = await apiKeys.createApiKey(
      req.user.organizationId,
      req.user.userId,
      { name, description, scopes, rateLimitTier, expiresAt, ipWhitelist }
    );
    
    res.status(201).json(key);
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * Get API key details
 */
router.get('/api-keys/:keyId', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const key = await apiKeys.getApiKey(req.params.keyId, req.user.organizationId);
    
    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json(key);
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({ error: 'Failed to get API key' });
  }
});

/**
 * Update API key
 */
router.patch('/api-keys/:keyId', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const key = await apiKeys.updateApiKey(
      req.params.keyId,
      req.user.organizationId,
      req.body
    );
    
    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json(key);
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

/**
 * Revoke API key
 */
router.delete('/api-keys/:keyId', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await apiKeys.revokeApiKey(req.params.keyId, req.user.organizationId);
    
    if (!result) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * Regenerate API key secret
 */
router.post('/api-keys/:keyId/regenerate', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await apiKeys.regenerateSecret(req.params.keyId, req.user.organizationId);
    
    if (!result) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Regenerate secret error:', error);
    res.status(500).json({ error: 'Failed to regenerate secret' });
  }
});

/**
 * Get API key usage stats
 */
router.get('/api-keys/:keyId/usage', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const stats = await apiKeys.getUsageStats(req.params.keyId, req.user.organizationId);
    
    if (!stats) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

/**
 * Get available scopes
 */
router.get('/api-keys/scopes/available', authMiddleware, async (req, res) => {
  res.json({ scopes: apiKeys.API_SCOPES });
});

/**
 * Get OpenAPI documentation
 */
router.get('/api-docs', authMiddleware, async (req, res) => {
  try {
    // Get organization slug
    const orgResult = await pool.query(
      'SELECT slug FROM organizations WHERE id = $1',
      [req.user.organizationId]
    );
    
    const slug = orgResult.rows[0]?.slug || 'default';
    const baseUrl = process.env.API_BASE_URL || 'https://api.uplifthq.co.uk';
    
    const spec = apiKeys.generateOpenApiSpec(slug, baseUrl);
    res.json(spec);
  } catch (error) {
    console.error('Generate API docs error:', error);
    res.status(500).json({ error: 'Failed to generate API documentation' });
  }
});

// ==================== WEBHOOKS ====================

/**
 * List webhooks
 */
router.get('/webhooks', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, url, events, is_active, 
        created_at, last_triggered_at, 
        success_count, failure_count,
        last_response_status
      FROM webhooks
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `, [req.user.organizationId]);
    
    const webhooks = result.rows.map(w => ({
      ...w,
      events: typeof w.events === 'string' ? JSON.parse(w.events) : w.events,
      successRate: w.success_count + w.failure_count > 0 
        ? Math.round((w.success_count / (w.success_count + w.failure_count)) * 100)
        : 100,
    }));
    
    res.json({ webhooks });
  } catch (error) {
    console.error('List webhooks error:', error);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

/**
 * Create webhook
 */
router.post('/webhooks', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { url, events, secret } = req.body;
    
    if (!url || !events || !events.length) {
      return res.status(400).json({ error: 'URL and events are required' });
    }
    
    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');
    
    const result = await pool.query(`
      INSERT INTO webhooks (organization_id, url, events, secret, is_active, created_at)
      VALUES ($1, $2, $3, $4, true, NOW())
      RETURNING id, url, events, is_active, created_at
    `, [req.user.organizationId, url, JSON.stringify(events), webhookSecret]);
    
    res.status(201).json({
      webhook: {
        ...result.rows[0],
        events: events,
        secret: webhookSecret,
        message: 'Save this secret - it is used to verify webhook payloads',
      },
    });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * Update webhook
 */
router.patch('/webhooks/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { url, events, is_active } = req.body;
    
    const setClauses = [];
    const values = [req.params.id, req.user.organizationId];
    let paramIndex = 3;
    
    if (url !== undefined) {
      setClauses.push(`url = $${paramIndex++}`);
      values.push(url);
    }
    if (events !== undefined) {
      setClauses.push(`events = $${paramIndex++}`);
      values.push(JSON.stringify(events));
    }
    if (is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    
    if (!setClauses.length) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const result = await pool.query(`
      UPDATE webhooks
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id, url, events, is_active
    `, values);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json({ webhook: result.rows[0] });
  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * Delete webhook
 */
router.delete('/webhooks/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM webhooks
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `, [req.params.id, req.user.organizationId]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

/**
 * Test webhook
 */
router.post('/webhooks/:id/test', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT url, secret FROM webhooks
      WHERE id = $1 AND organization_id = $2
    `, [req.params.id, req.user.organizationId]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    const webhook = result.rows[0];
    const payload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Uplift',
        organizationId: req.user.organizationId,
      },
    };
    
    // Sign the payload
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Uplift-Signature': signature,
          'X-Uplift-Event': 'test',
        },
        body: JSON.stringify(payload),
      });
      
      res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (fetchError) {
      res.json({
        success: false,
        error: fetchError.message,
      });
    }
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

/**
 * Get webhook events list
 */
router.get('/webhooks/events/available', authMiddleware, async (req, res) => {
  res.json({
    events: {
      'employee.created': 'When a new employee is added',
      'employee.updated': 'When an employee is updated',
      'employee.deleted': 'When an employee is removed',
      'shift.created': 'When a new shift is created',
      'shift.updated': 'When a shift is modified',
      'shift.deleted': 'When a shift is cancelled',
      'shift.claimed': 'When an open shift is claimed',
      'time.clock_in': 'When an employee clocks in',
      'time.clock_out': 'When an employee clocks out',
      'timeoff.requested': 'When time off is requested',
      'timeoff.approved': 'When time off is approved',
      'timeoff.rejected': 'When time off is rejected',
      'skill.verified': 'When a skill is verified',
      'skill.expired': 'When a skill certification expires',
    },
  });
});

// ==================== OAUTH INTEGRATIONS ====================

// OAuth providers configuration
const OAUTH_PROVIDERS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/drive.readonly'],
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['Calendars.ReadWrite', 'User.Read'],
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'users:read', 'channels:read'],
  },
  xero: {
    authUrl: 'https://login.xero.com/identity/connect/authorize',
    tokenUrl: 'https://identity.xero.com/connect/token',
    scopes: ['openid', 'profile', 'email', 'payroll.employees', 'payroll.timesheets'],
  },
  quickbooks: {
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    scopes: ['com.intuit.quickbooks.accounting', 'com.intuit.quickbooks.payroll'],
  },
  adp: {
    authUrl: 'https://accounts.adp.com/auth/oauth/v2/authorize',
    tokenUrl: 'https://accounts.adp.com/auth/oauth/v2/token',
    scopes: ['api'],
  },
};

/**
 * List connected integrations
 */
router.get('/oauth', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, provider, status, connected_at, 
        last_sync_at, sync_status, metadata
      FROM integrations
      WHERE organization_id = $1
      ORDER BY provider
    `, [req.user.organizationId]);
    
    res.json({
      integrations: result.rows.map(i => ({
        ...i,
        metadata: typeof i.metadata === 'string' ? JSON.parse(i.metadata) : i.metadata,
      })),
    });
  } catch (error) {
    console.error('List integrations error:', error);
    res.status(500).json({ error: 'Failed to list integrations' });
  }
});

/**
 * Initiate OAuth flow
 */
router.get('/oauth/:provider/connect', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { provider } = req.params;
    const config = OAUTH_PROVIDERS[provider];
    
    if (!config) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }
    
    // Generate state token
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state for verification
    await pool.query(`
      INSERT INTO oauth_states (state, organization_id, provider, created_at, expires_at)
      VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '10 minutes')
    `, [state, req.user.organizationId, provider]);
    
    // Get client credentials from env
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/integrations/oauth/${provider}/callback`;
    
    if (!clientId) {
      return res.status(500).json({ error: `${provider} integration not configured` });
    }
    
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: state,
      access_type: 'offline', // For refresh tokens
      prompt: 'consent',
    });
    
    res.json({
      authUrl: `${config.authUrl}?${params.toString()}`,
      state,
    });
  } catch (error) {
    console.error('OAuth connect error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * OAuth callback
 */
router.get('/oauth/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;
    
    if (oauthError) {
      return res.redirect(`/settings/integrations?error=${encodeURIComponent(oauthError)}`);
    }
    
    if (!code || !state) {
      return res.redirect('/settings/integrations?error=missing_params');
    }
    
    // Verify state
    const stateResult = await pool.query(`
      SELECT organization_id FROM oauth_states
      WHERE state = $1 AND provider = $2 AND expires_at > NOW()
    `, [state, provider]);
    
    if (!stateResult.rows[0]) {
      return res.redirect('/settings/integrations?error=invalid_state');
    }
    
    const organizationId = stateResult.rows[0].organization_id;
    
    // Clean up state
    await pool.query('DELETE FROM oauth_states WHERE state = $1', [state]);
    
    // Exchange code for tokens
    const config = OAUTH_PROVIDERS[provider];
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/integrations/oauth/${provider}/callback`;
    
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      // Only log safe error info - never log tokens
      console.error('OAuth token exchange failed:', {
        error: tokens.error,
        error_description: tokens.error_description,
        provider,
      });
      return res.redirect('/settings/integrations?error=token_exchange_failed');
    }
    
    // Store integration
    await pool.query(`
      INSERT INTO integrations (
        organization_id, provider, status, 
        access_token, refresh_token, token_expires_at,
        connected_at, metadata
      )
      VALUES ($1, $2, 'connected', $3, $4, NOW() + INTERVAL '1 hour' * $5, NOW(), '{}')
      ON CONFLICT (organization_id, provider)
      DO UPDATE SET
        status = 'connected',
        access_token = $3,
        refresh_token = COALESCE($4, integrations.refresh_token),
        token_expires_at = NOW() + INTERVAL '1 hour' * $5,
        connected_at = NOW()
    `, [
      organizationId,
      provider,
      tokens.access_token,
      tokens.refresh_token,
      (tokens.expires_in || 3600) / 3600,
    ]);
    
    res.redirect('/settings/integrations?success=connected');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/settings/integrations?error=callback_failed');
  }
});

/**
 * Disconnect integration
 */
router.delete('/oauth/:provider', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { provider } = req.params;
    
    const result = await pool.query(`
      UPDATE integrations
      SET status = 'disconnected', access_token = NULL, refresh_token = NULL
      WHERE organization_id = $1 AND provider = $2
      RETURNING id
    `, [req.user.organizationId, provider]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

/**
 * Sync integration data
 */
router.post('/oauth/:provider/sync', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { provider } = req.params;
    const { entityTypes } = req.body;

    // Get integration record
    const integrationResult = await pool.query(`
      SELECT id, access_token, refresh_token, metadata
      FROM integrations
      WHERE organization_id = $1 AND provider = $2 AND status = 'connected'
    `, [req.user.organizationId, provider]);

    if (!integrationResult.rows[0]) {
      return res.status(404).json({ error: 'Integration not connected' });
    }

    const integration = integrationResult.rows[0];

    // Update sync status to running
    await pool.query(`
      UPDATE integrations
      SET sync_status = 'syncing', last_sync_at = NOW()
      WHERE organization_id = $1 AND provider = $2
    `, [req.user.organizationId, provider]);

    // Build credentials object
    const credentials = {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      ...(integration.metadata || {})
    };

    // Run the actual sync using the integration framework
    const result = await runSync(provider, credentials, req.user.organizationId, { entityTypes });

    // Update sync status based on result
    await pool.query(`
      UPDATE integrations
      SET sync_status = $3, metadata = metadata || $4
      WHERE organization_id = $1 AND provider = $2
    `, [
      req.user.organizationId,
      provider,
      result.success ? 'completed' : 'failed',
      JSON.stringify({ lastSyncResult: result })
    ]);

    res.json({
      success: result.success,
      message: result.success ? 'Sync completed' : 'Sync failed',
      created: result.created,
      updated: result.updated,
      errors: result.errors?.length || 0
    });
  } catch (error) {
    console.error('Sync integration error:', error);

    // Update status to failed
    await pool.query(`
      UPDATE integrations
      SET sync_status = 'failed'
      WHERE organization_id = $1 AND provider = $2
    `, [req.user.organizationId, req.params.provider]).catch(() => {});

    res.status(500).json({ error: 'Failed to sync: ' + error.message });
  }
});

// ==================== CONNECTOR MANAGEMENT ====================

/**
 * List all available integration connectors
 */
router.get('/connectors', authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    const connectors = listConnectors(category || null);
    res.json({ connectors });
  } catch (error) {
    console.error('List connectors error:', error);
    res.status(500).json({ error: 'Failed to list connectors' });
  }
});

/**
 * Test connection for a connector with provided credentials
 */
router.post('/connectors/:connectorId/test', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { connectorId } = req.params;
    const credentials = req.body;

    const result = await testConnection(connectorId, credentials);
    res.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Run sync for a specific connector (API key based integrations)
 */
router.post('/connectors/:connectorId/sync', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { connectorId } = req.params;
    const { credentials, options = {} } = req.body;

    if (!credentials) {
      return res.status(400).json({ error: 'Credentials required' });
    }

    const result = await runSync(connectorId, credentials, req.user.organizationId, options);
    res.json(result);
  } catch (error) {
    console.error('Connector sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send a Slack notification (for testing/admin use)
 */
router.post('/slack/send', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { channel, text, blocks } = req.body;

    // Get Slack integration credentials
    const integrationResult = await pool.query(`
      SELECT access_token FROM integrations
      WHERE organization_id = $1 AND provider = 'slack' AND status = 'connected'
    `, [req.user.organizationId]);

    if (!integrationResult.rows[0]) {
      return res.status(404).json({ error: 'Slack not connected' });
    }

    const connector = getConnector('slack');
    const credentials = { access_token: integrationResult.rows[0].access_token };

    const result = await connector.sendMessage(credentials, { channel, text, blocks });
    res.json(result);
  } catch (error) {
    console.error('Slack send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Slack channels list
 */
router.get('/slack/channels', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const integrationResult = await pool.query(`
      SELECT access_token FROM integrations
      WHERE organization_id = $1 AND provider = 'slack' AND status = 'connected'
    `, [req.user.organizationId]);

    if (!integrationResult.rows[0]) {
      return res.status(404).json({ error: 'Slack not connected' });
    }

    const connector = getConnector('slack');
    const credentials = { access_token: integrationResult.rows[0].access_token };

    const result = await connector.listChannels(credentials);
    res.json(result);
  } catch (error) {
    console.error('Slack channels error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
