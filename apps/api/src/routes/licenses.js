// ============================================================
// LICENSE KEY ROUTES
// Full lifecycle management for customer licenses
// ============================================================

import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../lib/database.js';

const router = Router();

// Ops auth middleware
const opsAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.OPS_JWT_SECRET || process.env.JWT_SECRET);
    const result = await db.query('SELECT * FROM ops_users WHERE id = $1 AND is_active = true', [decoded.userId]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Invalid token' });
    req.opsUser = result.rows[0];
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Log activity helper
async function logActivity(licenseId, action, previousValue, newValue, opsUser, req) {
  await db.query(`
    INSERT INTO license_activity (license_id, action, previous_value, new_value, performed_by, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    licenseId,
    action,
    previousValue ? JSON.stringify(previousValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    opsUser?.id || null,
    req?.ip || null,
    req?.headers?.['user-agent']?.substring(0, 500) || null
  ]);
}

// Log ops activity helper
async function logOpsActivity(opsUserId, action, entityType, entityId, details) {
  await db.query(`
    INSERT INTO ops_activity_log (ops_user_id, action, entity_type, entity_id, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [opsUserId, action, entityType, entityId, JSON.stringify(details)]);
}

// Generate a license key in format: UPL-{TYPE}-{RANDOM}-{CHECK}
function generateLicenseKey(keyType) {
  const typeMap = { annual: 'ANN', flex: 'FLX', trial: 'TRL', enterprise: 'ENT' };
  const prefix = typeMap[keyType] || 'STD';
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  const check = crypto.createHash('sha256').update(random).digest('hex').slice(0, 4).toUpperCase();
  return `UPL-${prefix}-${random}-${check}`;
}

/**
 * POST /api/ops/licenses/validate - Public validation endpoint (no auth)
 */
router.post('/validate', async (req, res) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      return res.json({ valid: false, error: 'License key is required' });
    }

    const result = await db.query(`
      SELECT lk.*, o.name as organization_name, o.slug as organization_slug
      FROM license_keys lk
      JOIN organizations o ON lk.organization_id = o.id
      WHERE lk.license_key = $1
    `, [licenseKey]);

    if (!result.rows[0]) {
      return res.json({ valid: false, error: 'License key not found' });
    }

    const license = result.rows[0];
    const isExpired = license.valid_until && new Date(license.valid_until) < new Date();
    const isActive = license.status === 'active' && !isExpired;

    // Log validation attempt
    await logActivity(license.id, 'validated', null, { valid: isActive }, null, req);

    res.json({
      valid: isActive,
      license: isActive ? {
        keyType: license.key_type,
        planType: license.plan_type,
        maxSeats: license.max_seats,
        flexSeatsLimit: license.flex_seats_limit,
        activatedSeats: license.activated_seats,
        validUntil: license.valid_until,
        organization: license.organization_name,
        organizationSlug: license.organization_slug,
      } : null,
      error: !isActive ? (isExpired ? 'License expired' : `License ${license.status}`) : null,
    });
  } catch (error) {
    console.error('Validate license error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// All routes below require ops auth
router.use(opsAuth);

/**
 * GET /api/ops/licenses - List all license keys
 */
router.get('/', async (req, res) => {
  try {
    const { status, orgId, keyType, planType, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT lk.*,
             o.name as organization_name,
             o.slug as organization_slug,
             ou.first_name || ' ' || ou.last_name as created_by_name
      FROM license_keys lk
      JOIN organizations o ON lk.organization_id = o.id
      LEFT JOIN ops_users ou ON lk.created_by = ou.id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (status) { query += ` AND lk.status = $${i++}`; params.push(status); }
    if (orgId) { query += ` AND lk.organization_id = $${i++}`; params.push(orgId); }
    if (keyType) { query += ` AND lk.key_type = $${i++}`; params.push(keyType); }
    if (planType) { query += ` AND lk.plan_type = $${i++}`; params.push(planType); }
    if (search) {
      query += ` AND (lk.license_key ILIKE $${i} OR o.name ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    query += ` ORDER BY lk.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get counts by status
    const countsResult = await db.query(`
      SELECT status, COUNT(*) as count FROM license_keys GROUP BY status
    `);
    const counts = {};
    countsResult.rows.forEach(row => { counts[row.status] = parseInt(row.count); });

    res.json({
      licenses: result.rows,
      counts,
      total: result.rows.length
    });
  } catch (error) {
    console.error('List licenses error:', error);
    res.status(500).json({ error: 'Failed to list licenses' });
  }
});

/**
 * GET /api/ops/licenses/org/:orgId - List keys for specific org
 */
router.get('/org/:orgId', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT lk.*, ou.first_name || ' ' || ou.last_name as created_by_name
      FROM license_keys lk
      LEFT JOIN ops_users ou ON lk.created_by = ou.id
      WHERE lk.organization_id = $1
      ORDER BY lk.created_at DESC
    `, [req.params.orgId]);

    res.json({ licenses: result.rows });
  } catch (error) {
    console.error('Get org licenses error:', error);
    res.status(500).json({ error: 'Failed to get licenses' });
  }
});

/**
 * GET /api/ops/licenses/:id - Get single license with activity
 */
router.get('/:id', async (req, res) => {
  try {
    const licenseResult = await db.query(`
      SELECT lk.*,
             o.name as organization_name,
             o.slug as organization_slug,
             ou.first_name || ' ' || ou.last_name as created_by_name
      FROM license_keys lk
      JOIN organizations o ON lk.organization_id = o.id
      LEFT JOIN ops_users ou ON lk.created_by = ou.id
      WHERE lk.id = $1
    `, [req.params.id]);

    if (!licenseResult.rows[0]) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Get activity log
    const activityResult = await db.query(`
      SELECT la.*, ou.first_name || ' ' || ou.last_name as performed_by_name
      FROM license_activity la
      LEFT JOIN ops_users ou ON la.performed_by = ou.id
      WHERE la.license_id = $1
      ORDER BY la.created_at DESC
      LIMIT 50
    `, [req.params.id]);

    // Get seat usage
    const usageResult = await db.query(`
      SELECT COUNT(*) FILTER (WHERE seat_type = 'core') as core_used,
             COUNT(*) FILTER (WHERE seat_type = 'flex') as flex_used
      FROM employees
      WHERE organization_id = $1 AND status = 'active'
    `, [licenseResult.rows[0].organization_id]);

    res.json({
      license: licenseResult.rows[0],
      activity: activityResult.rows,
      usage: usageResult.rows[0] || { core_used: 0, flex_used: 0 }
    });
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ error: 'Failed to get license' });
  }
});

/**
 * POST /api/ops/licenses - Generate new license key
 */
router.post('/', async (req, res) => {
  try {
    const {
      organizationId,
      keyType = 'annual',
      planType = 'growth',
      maxSeats = 50,
      flexSeatsLimit,
      validUntil
    } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    // Verify org exists
    const orgCheck = await db.query('SELECT id, name FROM organizations WHERE id = $1', [organizationId]);
    if (!orgCheck.rows[0]) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const licenseKey = generateLicenseKey(keyType);
    const calculatedFlexLimit = flexSeatsLimit ?? Math.floor(maxSeats * 0.5);

    // Set default expiry based on key type
    let defaultExpiry = validUntil;
    if (!defaultExpiry) {
      const now = new Date();
      if (keyType === 'trial') {
        defaultExpiry = new Date(now.setDate(now.getDate() + 30)).toISOString();
      } else {
        defaultExpiry = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      }
    }

    const result = await db.query(`
      INSERT INTO license_keys (
        organization_id, license_key, key_type, plan_type,
        max_seats, flex_seats_limit, valid_until,
        activated_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      RETURNING *
    `, [
      organizationId, licenseKey, keyType, planType,
      maxSeats, calculatedFlexLimit, defaultExpiry,
      req.opsUser?.id
    ]);

    const license = result.rows[0];

    // Log activity
    await logActivity(license.id, 'created', null, license, req.opsUser, req);
    await logOpsActivity(req.opsUser?.id, 'license_created', 'license', license.id, {
      organization: orgCheck.rows[0].name,
      keyType,
      planType,
      maxSeats
    });

    res.json({ license });
  } catch (error) {
    console.error('Generate license error:', error);
    res.status(500).json({ error: 'Failed to generate license' });
  }
});

/**
 * PATCH /api/ops/licenses/:id - Update license key
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status, maxSeats, flexSeatsLimit, validUntil, planType } = req.body;

    // Get current state
    const current = await db.query('SELECT * FROM license_keys WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'License not found' });
    }

    const previousState = { ...current.rows[0] };

    // Build update
    const updates = [];
    const params = [];
    let i = 1;

    if (status !== undefined) {
      updates.push(`status = $${i++}`);
      params.push(status);
      if (status === 'suspended') {
        updates.push(`suspended_at = NOW()`);
      }
    }
    if (maxSeats !== undefined) {
      updates.push(`max_seats = $${i++}`);
      params.push(maxSeats);
    }
    if (flexSeatsLimit !== undefined) {
      updates.push(`flex_seats_limit = $${i++}`);
      params.push(flexSeatsLimit);
    }
    if (validUntil !== undefined) {
      updates.push(`valid_until = $${i++}`);
      params.push(validUntil);
    }
    if (planType !== undefined) {
      updates.push(`plan_type = $${i++}`);
      params.push(planType);
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const result = await db.query(`
      UPDATE license_keys SET ${updates.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `, params);

    const license = result.rows[0];

    // Determine action type
    let action = 'updated';
    if (status === 'suspended') action = 'suspended';
    else if (status === 'active' && previousState.status === 'suspended') action = 'reactivated';
    else if (status === 'revoked') action = 'revoked';
    else if (maxSeats !== previousState.max_seats) action = 'seats_modified';
    else if (validUntil !== previousState.valid_until) action = 'expiry_extended';

    await logActivity(license.id, action, previousState, license, req.opsUser, req);
    await logOpsActivity(req.opsUser?.id, `license_${action}`, 'license', license.id, { action });

    res.json({ license });
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ error: 'Failed to update license' });
  }
});

/**
 * POST /api/ops/licenses/:id/suspend - Suspend license
 */
router.post('/:id/suspend', async (req, res) => {
  try {
    const { reason } = req.body;

    const current = await db.query('SELECT * FROM license_keys WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'License not found' });
    }

    const result = await db.query(`
      UPDATE license_keys SET
        status = 'suspended',
        suspended_at = NOW(),
        suspension_reason = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reason, req.params.id]);

    await logActivity(result.rows[0].id, 'suspended', current.rows[0], result.rows[0], req.opsUser, req);
    await logOpsActivity(req.opsUser?.id, 'license_suspended', 'license', req.params.id, { reason });

    res.json({ license: result.rows[0] });
  } catch (error) {
    console.error('Suspend license error:', error);
    res.status(500).json({ error: 'Failed to suspend license' });
  }
});

/**
 * POST /api/ops/licenses/:id/reactivate - Reactivate suspended license
 */
router.post('/:id/reactivate', async (req, res) => {
  try {
    const current = await db.query('SELECT * FROM license_keys WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (current.rows[0].status !== 'suspended') {
      return res.status(400).json({ error: 'License is not suspended' });
    }

    const result = await db.query(`
      UPDATE license_keys SET
        status = 'active',
        suspended_at = NULL,
        suspension_reason = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    await logActivity(result.rows[0].id, 'reactivated', current.rows[0], result.rows[0], req.opsUser, req);
    await logOpsActivity(req.opsUser?.id, 'license_reactivated', 'license', req.params.id, {});

    res.json({ license: result.rows[0] });
  } catch (error) {
    console.error('Reactivate license error:', error);
    res.status(500).json({ error: 'Failed to reactivate license' });
  }
});

/**
 * DELETE /api/ops/licenses/:id - Revoke license key
 */
router.delete('/:id', async (req, res) => {
  try {
    const current = await db.query('SELECT * FROM license_keys WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'License not found' });
    }

    const result = await db.query(`
      UPDATE license_keys SET status = 'revoked', updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [req.params.id]);

    await logActivity(result.rows[0].id, 'revoked', current.rows[0], result.rows[0], req.opsUser, req);
    await logOpsActivity(req.opsUser?.id, 'license_revoked', 'license', req.params.id, {});

    res.json({ success: true, license: result.rows[0] });
  } catch (error) {
    console.error('Revoke license error:', error);
    res.status(500).json({ error: 'Failed to revoke license' });
  }
});

export default router;
