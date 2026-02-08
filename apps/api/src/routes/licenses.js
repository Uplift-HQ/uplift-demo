// ============================================================
// LICENSE KEY ROUTES
// Manage license keys for customer organizations
// ============================================================

import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../lib/database.js';

const router = Router();

// Ops auth middleware (same as ops.js)
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

// Apply auth to all routes except validate
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
    const result = await db.query(`
      SELECT lk.*, o.name as organization_name
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

    res.json({
      valid: isActive,
      license: isActive ? {
        keyType: license.key_type,
        maxSeats: license.max_seats,
        activatedSeats: license.activated_seats,
        validUntil: license.valid_until,
        organization: license.organization_name,
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
    const { status, orgId, keyType, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT lk.*, o.name as organization_name
      FROM license_keys lk
      JOIN organizations o ON lk.organization_id = o.id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (status) { query += ` AND lk.status = $${i++}`; params.push(status); }
    if (orgId) { query += ` AND lk.organization_id = $${i++}`; params.push(orgId); }
    if (keyType) { query += ` AND lk.key_type = $${i++}`; params.push(keyType); }
    if (search) {
      query += ` AND (lk.license_key ILIKE $${i} OR o.name ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    query += ` ORDER BY lk.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    res.json({ licenses: result.rows });
  } catch (error) {
    console.error('List licenses error:', error);
    res.status(500).json({ error: 'Failed to list licenses' });
  }
});

/**
 * GET /api/ops/licenses/:orgId - List keys for specific org
 */
router.get('/:orgId', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM license_keys
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `, [req.params.orgId]);

    res.json({ licenses: result.rows });
  } catch (error) {
    console.error('Get org licenses error:', error);
    res.status(500).json({ error: 'Failed to get licenses' });
  }
});

/**
 * POST /api/ops/licenses - Generate new license key
 */
router.post('/', async (req, res) => {
  try {
    const { organizationId, keyType, maxSeats, validUntil } = req.body;

    if (!organizationId || !keyType) {
      return res.status(400).json({ error: 'organizationId and keyType are required' });
    }

    const licenseKey = generateLicenseKey(keyType);

    const result = await db.query(`
      INSERT INTO license_keys (organization_id, license_key, key_type, max_seats, valid_until, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [organizationId, licenseKey, keyType, maxSeats || 0, validUntil || null, req.opsUser?.id || null]);

    res.json({ license: result.rows[0] });
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
    const { status, maxSeats, validUntil } = req.body;

    const result = await db.query(`
      UPDATE license_keys SET
        status = COALESCE($1, status),
        max_seats = COALESCE($2, max_seats),
        valid_until = COALESCE($3, valid_until),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, maxSeats, validUntil, req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json({ license: result.rows[0] });
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ error: 'Failed to update license' });
  }
});

/**
 * DELETE /api/ops/licenses/:id - Revoke license key
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE license_keys SET status = 'revoked', updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke license error:', error);
    res.status(500).json({ error: 'Failed to revoke license' });
  }
});

export default router;
