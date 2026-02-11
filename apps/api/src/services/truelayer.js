// ============================================================
// TRUELAYER INTEGRATION SERVICE
// Open Banking aggregator for corporate card transactions
// HSBC and other UK banks via TrueLayer API
// ============================================================

import crypto from 'crypto';
import { db } from '../lib/database.js';

// TrueLayer Configuration
const TRUELAYER_CLIENT_ID = process.env.TRUELAYER_CLIENT_ID || 'sandbox-uplift-763784';
const TRUELAYER_CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET || '83bdf377-ac51-43ed-adb9-d6735d1b398f';
const TRUELAYER_REDIRECT_URI = process.env.TRUELAYER_REDIRECT_URI || 'https://api.uplifthq.co.uk/api/integrations/truelayer/callback';
const TRUELAYER_SANDBOX = process.env.TRUELAYER_SANDBOX !== 'false';

// API Base URLs
const AUTH_BASE_URL = TRUELAYER_SANDBOX
  ? 'https://auth.truelayer-sandbox.com'
  : 'https://auth.truelayer.com';
const API_BASE_URL = TRUELAYER_SANDBOX
  ? 'https://api.truelayer-sandbox.com'
  : 'https://api.truelayer.com';

// Encryption for storing tokens
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_IV_LENGTH = 16;

/**
 * Encrypt sensitive data before storing
 */
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
function decrypt(text) {
  if (!text) return null;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[truelayer] Decryption failed:', e.message);
    return null;
  }
}

/**
 * Log sync activity to integration_sync_logs
 */
async function logSync(organizationId, connectionId, syncType, data) {
  try {
    const result = await db.query(`
      INSERT INTO integration_sync_logs (
        organization_id, integration_type, connection_id, sync_type,
        status, records_fetched, records_created, records_updated, records_skipped,
        error_message, error_details, request_summary, response_summary, completed_at
      )
      VALUES ($1, 'truelayer', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      organizationId,
      connectionId,
      syncType,
      data.status || 'success',
      data.recordsFetched || 0,
      data.recordsCreated || 0,
      data.recordsUpdated || 0,
      data.recordsSkipped || 0,
      data.errorMessage || null,
      data.errorDetails ? JSON.stringify(data.errorDetails) : null,
      data.requestSummary ? JSON.stringify(data.requestSummary) : null,
      data.responseSummary ? JSON.stringify(data.responseSummary) : null,
      data.status === 'running' ? null : new Date()
    ]);
    return result.rows[0];
  } catch (e) {
    console.error('[truelayer] Failed to log sync:', e.message);
  }
}

/**
 * Make HTTP request to TrueLayer API with retry and timeout
 */
async function truelayerFetch(url, options = {}, retryCount = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    // Handle rate limiting
    if (response.status === 429 && retryCount < 3) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
      console.log(`[truelayer] Rate limited, retrying after ${retryAfter}s`);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return truelayerFetch(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('TrueLayer API timeout');
    }
    throw error;
  }
}

/**
 * Get TrueLayer authorization URL
 * User opens this URL to connect their bank
 */
function getAuthUrl(organizationId, state = null) {
  const stateParam = state || `${organizationId}:${crypto.randomBytes(16).toString('hex')}`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TRUELAYER_CLIENT_ID,
    redirect_uri: TRUELAYER_REDIRECT_URI,
    scope: 'info cards cards:transactions offline_access',
    state: stateParam,
    // Provider selection - can be customized
    providers: 'uk-ob-hsbc uk-ob-barclays uk-ob-lloyds uk-ob-natwest uk-ob-santander',
  });

  return {
    url: `${AUTH_BASE_URL}/?${params.toString()}`,
    state: stateParam,
  };
}

/**
 * Exchange authorization code for access tokens
 * Called from OAuth callback
 */
async function handleCallback(code, state, connectedBy) {
  // Parse state to get organizationId
  const [organizationId] = state.split(':');
  if (!organizationId) {
    throw new Error('Invalid state parameter');
  }

  // Exchange code for tokens
  const response = await truelayerFetch(`${AUTH_BASE_URL}/connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: TRUELAYER_CLIENT_ID,
      client_secret: TRUELAYER_CLIENT_SECRET,
      redirect_uri: TRUELAYER_REDIRECT_URI,
      code,
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[truelayer] Token exchange failed:', errorData);
    throw new Error(errorData.error_description || 'Failed to exchange authorization code');
  }

  const tokens = await response.json();

  // Calculate expiry times
  const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
  const consentExpiresAt = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)); // 90 days UK Open Banking

  // Get provider info (make a test call to identify the bank)
  let providerInfo = { providerId: 'unknown', connectionName: 'Bank Connection' };
  try {
    const infoResponse = await truelayerFetch(`${API_BASE_URL}/data/v1/info`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      if (info.results && info.results[0]) {
        providerInfo = {
          providerId: info.results[0].provider?.provider_id || 'uk-ob-unknown',
          connectionName: info.results[0].provider?.display_name || 'Bank Connection',
        };
      }
    }
  } catch (e) {
    console.warn('[truelayer] Could not fetch provider info:', e.message);
  }

  // Store connection in database
  const connection = await db.query(`
    INSERT INTO truelayer_connections (
      organization_id, connection_name, provider_id,
      access_token, refresh_token, token_expires_at, consent_expires_at,
      status, connected_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
    RETURNING id, organization_id, connection_name, provider_id, status, created_at
  `, [
    organizationId,
    providerInfo.connectionName,
    providerInfo.providerId,
    encrypt(tokens.access_token),
    encrypt(tokens.refresh_token),
    tokenExpiresAt,
    consentExpiresAt,
    connectedBy,
  ]);

  // Log successful connection
  await logSync(organizationId, connection.rows[0].id, 'auth_callback', {
    status: 'success',
    responseSummary: { provider: providerInfo.providerId },
  });

  return connection.rows[0];
}

/**
 * Refresh access token using refresh token
 */
async function refreshToken(connectionId) {
  // Get connection with encrypted tokens
  const conn = await db.query(`
    SELECT * FROM truelayer_connections WHERE id = $1
  `, [connectionId]);

  if (!conn.rows[0]) {
    throw new Error('Connection not found');
  }

  const connection = conn.rows[0];
  const currentRefreshToken = decrypt(connection.refresh_token);

  if (!currentRefreshToken) {
    // Mark as expired if we can't decrypt
    await db.query(`
      UPDATE truelayer_connections
      SET status = 'expired', sync_error = 'Refresh token unavailable'
      WHERE id = $1
    `, [connectionId]);
    throw new Error('Refresh token unavailable - re-authentication required');
  }

  const response = await truelayerFetch(`${AUTH_BASE_URL}/connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: TRUELAYER_CLIENT_ID,
      client_secret: TRUELAYER_CLIENT_SECRET,
      refresh_token: currentRefreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[truelayer] Token refresh failed:', errorData);

    // Mark connection as expired
    await db.query(`
      UPDATE truelayer_connections
      SET status = 'expired', sync_error = $2
      WHERE id = $1
    `, [connectionId, errorData.error_description || 'Token refresh failed']);

    await logSync(connection.organization_id, connectionId, 'token_refresh', {
      status: 'failed',
      errorMessage: errorData.error_description || 'Token refresh failed',
    });

    throw new Error(errorData.error_description || 'Failed to refresh token');
  }

  const tokens = await response.json();
  const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

  // Update tokens in database
  await db.query(`
    UPDATE truelayer_connections
    SET access_token = $1, refresh_token = $2, token_expires_at = $3,
        status = 'active', sync_error = NULL, updated_at = NOW()
    WHERE id = $4
  `, [
    encrypt(tokens.access_token),
    encrypt(tokens.refresh_token),
    tokenExpiresAt,
    connectionId,
  ]);

  await logSync(connection.organization_id, connectionId, 'token_refresh', {
    status: 'success',
  });

  return tokens.access_token;
}

/**
 * Get valid access token (refreshes if expired)
 */
async function getAccessToken(connectionId) {
  const conn = await db.query(`
    SELECT * FROM truelayer_connections WHERE id = $1
  `, [connectionId]);

  if (!conn.rows[0]) {
    throw new Error('Connection not found');
  }

  const connection = conn.rows[0];

  // Check if token is expired or about to expire (5 min buffer)
  const bufferTime = 5 * 60 * 1000;
  if (new Date(connection.token_expires_at) <= new Date(Date.now() + bufferTime)) {
    console.log('[truelayer] Token expired, refreshing...');
    return refreshToken(connectionId);
  }

  return decrypt(connection.access_token);
}

/**
 * Get cards for a connection
 */
async function getCards(connectionId) {
  const accessToken = await getAccessToken(connectionId);

  const response = await truelayerFetch(`${API_BASE_URL}/data/v1/cards`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token invalid, try refresh
      const newToken = await refreshToken(connectionId);
      const retryResponse = await truelayerFetch(`${API_BASE_URL}/data/v1/cards`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryResponse.ok) {
        throw new Error('Failed to fetch cards after token refresh');
      }
      const data = await retryResponse.json();
      return data.results || [];
    }
    throw new Error('Failed to fetch cards');
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Get transactions for a specific card
 */
async function getCardTransactions(connectionId, cardAccountId, from, to) {
  const accessToken = await getAccessToken(connectionId);

  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const url = `${API_BASE_URL}/data/v1/cards/${cardAccountId}/transactions${params.toString() ? '?' + params.toString() : ''}`;

  const response = await truelayerFetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const newToken = await refreshToken(connectionId);
      const retryResponse = await truelayerFetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryResponse.ok) {
        throw new Error('Failed to fetch transactions after token refresh');
      }
      const data = await retryResponse.json();
      return data.results || [];
    }
    throw new Error('Failed to fetch card transactions');
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Get pending transactions for a card
 */
async function getPendingTransactions(connectionId, cardAccountId) {
  const accessToken = await getAccessToken(connectionId);

  const url = `${API_BASE_URL}/data/v1/cards/${cardAccountId}/transactions/pending`;

  const response = await truelayerFetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // No pending transactions endpoint for this provider
      return [];
    }
    if (response.status === 401) {
      const newToken = await refreshToken(connectionId);
      const retryResponse = await truelayerFetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryResponse.ok && retryResponse.status !== 404) {
        throw new Error('Failed to fetch pending transactions');
      }
      if (retryResponse.status === 404) return [];
      const data = await retryResponse.json();
      return data.results || [];
    }
    throw new Error('Failed to fetch pending transactions');
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Auto-categorize transaction based on mapping rules
 */
async function autoCategorizeTransaction(organizationId, transaction) {
  // Get mapping rules ordered by priority
  const mappings = await db.query(`
    SELECT ecm.*, ec.id as category_id, ec.name as category_name
    FROM expense_category_mappings ecm
    JOIN expense_categories ec ON ec.id = ecm.expense_category_id
    WHERE ecm.organization_id = $1 AND ecm.is_active = true
    ORDER BY ecm.priority ASC
  `, [organizationId]);

  const merchantName = (transaction.merchant_name || transaction.description || '').toUpperCase();
  const tlCategory = transaction.transaction_category || '';
  const tlClassification = Array.isArray(transaction.transaction_classification)
    ? transaction.transaction_classification.join(' > ')
    : '';

  for (const mapping of mappings.rows) {
    let match = false;

    // Check TrueLayer category
    if (mapping.truelayer_category && tlCategory === mapping.truelayer_category) {
      match = true;
    }

    // Check TrueLayer classification (with LIKE pattern)
    if (mapping.truelayer_classification) {
      const pattern = mapping.truelayer_classification.replace(/%/g, '.*');
      if (new RegExp(pattern, 'i').test(tlClassification)) {
        match = true;
      }
    }

    // Check merchant pattern (with LIKE/regex)
    if (mapping.merchant_pattern) {
      const pattern = mapping.merchant_pattern.replace(/%/g, '.*');
      if (new RegExp(pattern, 'i').test(merchantName)) {
        match = true;
      }
    }

    if (match) {
      return {
        categoryId: mapping.category_id,
        categoryName: mapping.category_name,
        autoCategorized: true,
      };
    }
  }

  return { categoryId: null, categoryName: null, autoCategorized: false };
}

/**
 * Sync transactions from TrueLayer to database
 * Main sync function - fetches all cards and their transactions
 */
async function syncTransactions(organizationId, connectionId) {
  const result = {
    imported: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  // Get connection
  const conn = await db.query(`
    SELECT * FROM truelayer_connections WHERE id = $1 AND organization_id = $2
  `, [connectionId, organizationId]);

  if (!conn.rows[0]) {
    throw new Error('Connection not found');
  }

  const connection = conn.rows[0];

  if (connection.status !== 'active') {
    throw new Error(`Connection is ${connection.status} - re-authentication required`);
  }

  // Log start of sync
  const syncLog = await logSync(organizationId, connectionId, 'transactions', {
    status: 'running',
  });

  try {
    // Get all cards for this connection
    const cards = await getCards(connectionId);
    console.log(`[truelayer] Found ${cards.length} cards for connection ${connectionId}`);

    // Get corporate cards registered for this organization
    const corporateCards = await db.query(`
      SELECT * FROM corporate_cards
      WHERE organization_id = $1 AND truelayer_connection_id = $2 AND is_active = true
    `, [organizationId, connectionId]);

    // Create a map of TrueLayer card ID to corporate card
    const cardMap = new Map();
    for (const cc of corporateCards.rows) {
      if (cc.truelayer_card_id) {
        cardMap.set(cc.truelayer_card_id, cc);
      }
    }

    // Also try to match by last 4 digits if no TrueLayer ID
    for (const tlCard of cards) {
      const last4 = tlCard.partial_card_number?.slice(-4);
      if (last4 && !cardMap.has(tlCard.account_id)) {
        for (const cc of corporateCards.rows) {
          if (cc.card_last_four === last4 && !cardMap.has(tlCard.account_id)) {
            // Update corporate card with TrueLayer ID
            await db.query(`
              UPDATE corporate_cards SET truelayer_card_id = $1 WHERE id = $2
            `, [tlCard.account_id, cc.id]);
            cardMap.set(tlCard.account_id, cc);
            break;
          }
        }
      }
    }

    // Determine date range for sync
    const lastSynced = connection.last_synced_at
      ? new Date(connection.last_synced_at)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const from = lastSynced.toISOString().split('T')[0];
    const to = new Date().toISOString().split('T')[0];

    // Fetch transactions for each mapped card
    for (const [tlCardId, corporateCard] of cardMap) {
      try {
        console.log(`[truelayer] Fetching transactions for card ${corporateCard.card_last_four}`);

        const transactions = await getCardTransactions(connectionId, tlCardId, from, to);
        const pendingTransactions = await getPendingTransactions(connectionId, tlCardId);
        const allTransactions = [...transactions, ...pendingTransactions];

        console.log(`[truelayer] Found ${allTransactions.length} transactions`);

        for (const txn of allTransactions) {
          try {
            // Check for duplicate
            const existing = await db.query(`
              SELECT id FROM card_transactions WHERE truelayer_transaction_id = $1
            `, [txn.transaction_id]);

            if (existing.rows.length > 0) {
              result.skipped++;
              continue;
            }

            // Auto-categorize
            const category = await autoCategorizeTransaction(organizationId, txn);

            // Determine if receipt is required (based on category rules or amount > £25)
            let receiptRequired = false;
            if (category.categoryId) {
              const catInfo = await db.query(`
                SELECT requires_receipt FROM expense_categories WHERE id = $1
              `, [category.categoryId]);
              receiptRequired = catInfo.rows[0]?.requires_receipt || false;
            }
            if (Math.abs(txn.amount) >= 25) {
              receiptRequired = true;
            }

            // Insert transaction
            await db.query(`
              INSERT INTO card_transactions (
                organization_id, corporate_card_id, employee_id, truelayer_transaction_id,
                transaction_date, posted_date, description, merchant_name,
                amount, currency, original_amount, original_currency,
                transaction_category, transaction_classification,
                expense_category_id, auto_categorized, receipt_required,
                status, raw_data
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending', $18)
            `, [
              organizationId,
              corporateCard.id,
              corporateCard.employee_id,
              txn.transaction_id,
              txn.timestamp || txn.transaction_date,
              txn.settlement_date,
              txn.description,
              txn.merchant_name,
              Math.abs(txn.amount) * (txn.amount < 0 ? -1 : 1), // Normalize: positive = spend
              txn.currency || 'GBP',
              txn.meta?.original_amount,
              txn.meta?.original_currency,
              txn.transaction_category,
              JSON.stringify(txn.transaction_classification),
              category.categoryId,
              category.autoCategorized,
              receiptRequired,
              JSON.stringify(txn),
            ]);

            result.imported++;
          } catch (txnError) {
            console.error('[truelayer] Transaction import error:', txnError.message);
            result.errors++;
            result.errorDetails.push({
              transactionId: txn.transaction_id,
              error: txnError.message,
            });
          }
        }
      } catch (cardError) {
        console.error(`[truelayer] Card sync error for ${corporateCard.card_last_four}:`, cardError.message);
        result.errors++;
        result.errorDetails.push({
          cardId: corporateCard.id,
          error: cardError.message,
        });
      }
    }

    // Update last_synced_at
    await db.query(`
      UPDATE truelayer_connections SET last_synced_at = NOW() WHERE id = $1
    `, [connectionId]);

    // Log completion
    await logSync(organizationId, connectionId, 'transactions', {
      status: result.errors > 0 ? 'partial' : 'success',
      recordsFetched: result.imported + result.skipped,
      recordsCreated: result.imported,
      recordsSkipped: result.skipped,
      errorMessage: result.errors > 0 ? `${result.errors} errors during import` : null,
      errorDetails: result.errorDetails.length > 0 ? result.errorDetails : null,
    });

  } catch (error) {
    console.error('[truelayer] Sync failed:', error);

    // Update connection error
    await db.query(`
      UPDATE truelayer_connections SET sync_error = $2 WHERE id = $1
    `, [connectionId, error.message]);

    await logSync(organizationId, connectionId, 'transactions', {
      status: 'failed',
      errorMessage: error.message,
    });

    throw error;
  }

  return result;
}

/**
 * Get all connections for an organization
 */
async function getConnections(organizationId) {
  const result = await db.query(`
    SELECT
      tc.id, tc.connection_name, tc.provider_id, tc.status,
      tc.consent_expires_at, tc.last_synced_at, tc.sync_error,
      tc.created_at,
      u.first_name || ' ' || u.last_name as connected_by_name
    FROM truelayer_connections tc
    LEFT JOIN users u ON u.id = tc.connected_by
    WHERE tc.organization_id = $1
    ORDER BY tc.created_at DESC
  `, [organizationId]);

  return result.rows;
}

/**
 * Disconnect (revoke) a connection
 */
async function disconnect(organizationId, connectionId) {
  const result = await db.query(`
    UPDATE truelayer_connections
    SET status = 'revoked', access_token = NULL, refresh_token = NULL
    WHERE id = $1 AND organization_id = $2
    RETURNING id
  `, [connectionId, organizationId]);

  if (!result.rows[0]) {
    throw new Error('Connection not found');
  }

  // Also deactivate associated corporate cards
  await db.query(`
    UPDATE corporate_cards SET is_active = false
    WHERE truelayer_connection_id = $1
  `, [connectionId]);

  await logSync(organizationId, connectionId, 'disconnect', {
    status: 'success',
  });

  return { success: true };
}

// Export service
const truelayerService = {
  getAuthUrl,
  handleCallback,
  refreshToken,
  getCards,
  getCardTransactions,
  getPendingTransactions,
  syncTransactions,
  getConnections,
  disconnect,
  autoCategorizeTransaction,
};

export default truelayerService;
export {
  getAuthUrl,
  handleCallback,
  refreshToken,
  getCards,
  getCardTransactions,
  getPendingTransactions,
  syncTransactions,
  getConnections,
  disconnect,
  autoCategorizeTransaction,
};
