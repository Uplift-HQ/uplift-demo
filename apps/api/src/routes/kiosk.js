// ============================================================
// KIOSK API ROUTES
// Authentication via X-Kiosk-Key header for kiosk devices
// ============================================================

import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();

/**
 * Validate kiosk API key and return kiosk + organization info
 */
async function validateKioskKey(req, res, next) {
  const apiKey = req.headers['x-kiosk-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-Kiosk-Key header' });
  }

  const prefix = apiKey.substring(0, 8);
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const result = await db.query(
    `SELECT k.*, l.name as location_name, l.latitude, l.longitude,
            o.name as org_name, o.logo_url, o.primary_color, o.timezone
     FROM kiosks k
     JOIN organizations o ON o.id = k.organization_id
     LEFT JOIN locations l ON l.id = k.location_id
     WHERE k.api_key_prefix = $1 AND k.api_key_hash = $2 AND k.is_active = TRUE`,
    [prefix, keyHash]
  );

  if (!result.rows[0]) {
    return res.status(401).json({ error: 'Invalid or inactive kiosk key' });
  }

  // Update last seen
  await db.query(
    `UPDATE kiosks SET last_seen_at = NOW(), last_seen_ip = $2 WHERE id = $1`,
    [result.rows[0].id, req.ip]
  );

  req.kiosk = result.rows[0];
  req.organizationId = result.rows[0].organization_id;
  next();
}

// ============================================================
// KIOSK ENDPOINTS (authenticated via X-Kiosk-Key)
// ============================================================

/**
 * GET /api/kiosk/config
 * Get kiosk configuration (org logo, location name, etc.)
 */
router.get('/config', validateKioskKey, async (req, res) => {
  const { kiosk } = req;

  res.json({
    kiosk_id: kiosk.id,
    kiosk_name: kiosk.name,
    org_name: kiosk.org_name,
    logo_url: kiosk.logo_url,
    primary_color: kiosk.primary_color || '#F26522',
    location_id: kiosk.location_id,
    location_name: kiosk.location_name || 'All Locations',
    timezone: kiosk.timezone || 'Europe/London',
  });
});

/**
 * GET /api/kiosk/lookup
 * Look up employee by ID, PIN, or badge
 */
router.get('/lookup', validateKioskKey, async (req, res) => {
  const { employee_id, pin, badge_id } = req.query;
  const { organizationId, kiosk } = req;

  if (!employee_id && !pin && !badge_id) {
    return res.status(400).json({ error: 'Provide employee_id, pin, or badge_id' });
  }

  let query = `
    SELECT e.id, e.first_name, e.last_name, e.avatar_url, e.employee_number, e.badge_id,
           l.name as location_name
    FROM employees e
    LEFT JOIN locations l ON l.id = e.location_id
    WHERE e.organization_id = $1 AND e.status = 'active'
  `;
  const params = [organizationId];

  if (employee_id) {
    // Support both UUID and employee_number lookup
    if (employee_id.length === 36 && employee_id.includes('-')) {
      query += ` AND e.id = $2`;
    } else {
      query += ` AND (e.employee_number = $2 OR e.badge_id = $2)`;
    }
    params.push(employee_id);
  } else if (badge_id) {
    query += ` AND e.badge_id = $2`;
    params.push(badge_id);
  } else if (pin) {
    // PIN is typically stored in badge_id field for simplicity
    query += ` AND e.badge_id = $2`;
    params.push(pin);
  }

  const result = await db.query(query, params);

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const employee = result.rows[0];

  // Check current clock status
  const clockStatus = await db.query(
    `SELECT id, clock_in, location_id FROM time_entries
     WHERE employee_id = $1 AND clock_out IS NULL
     ORDER BY clock_in DESC LIMIT 1`,
    [employee.id]
  );

  const clockedIn = clockStatus.rows.length > 0;
  const lastClockEntry = clockStatus.rows[0];

  // Get last clock action if clocked out
  let lastAction = null;
  if (!clockedIn) {
    const lastEntry = await db.query(
      `SELECT clock_out, clock_in FROM time_entries
       WHERE employee_id = $1 AND clock_out IS NOT NULL
       ORDER BY clock_out DESC LIMIT 1`,
      [employee.id]
    );
    if (lastEntry.rows[0]) {
      lastAction = {
        action: 'out',
        time: lastEntry.rows[0].clock_out,
      };
    }
  } else {
    lastAction = {
      action: 'in',
      time: lastClockEntry.clock_in,
    };
  }

  res.json({
    employee_id: employee.id,
    name: `${employee.first_name} ${employee.last_name}`,
    first_name: employee.first_name,
    last_name: employee.last_name,
    photo_url: employee.avatar_url,
    employee_number: employee.employee_number,
    location_name: employee.location_name,
    clocked_in: clockedIn,
    current_entry_id: lastClockEntry?.id || null,
    last_clock_time: lastAction?.time || null,
    last_clock_action: lastAction?.action || null,
  });
});

/**
 * POST /api/kiosk/clock
 * Clock in or out via kiosk
 */
router.post('/clock', validateKioskKey, async (req, res) => {
  const { employee_id, action } = req.body;
  const { organizationId, kiosk } = req;

  if (!employee_id) {
    return res.status(400).json({ error: 'employee_id required' });
  }

  if (!['in', 'out'].includes(action)) {
    return res.status(400).json({ error: 'action must be "in" or "out"' });
  }

  // Verify employee exists and is active
  const empResult = await db.query(
    `SELECT id, first_name, last_name FROM employees
     WHERE id = $1 AND organization_id = $2 AND status = 'active'`,
    [employee_id, organizationId]
  );

  if (!empResult.rows[0]) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const employee = empResult.rows[0];

  if (action === 'in') {
    // Check not already clocked in
    const existing = await db.query(
      `SELECT id FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL`,
      [employee_id]
    );

    if (existing.rows[0]) {
      return res.status(400).json({
        error: 'Already clocked in',
        entry_id: existing.rows[0].id
      });
    }

    // Create clock-in entry
    const result = await db.query(
      `INSERT INTO time_entries (
        organization_id, employee_id, location_id, clock_in,
        clock_in_method, kiosk_id, status
      ) VALUES ($1, $2, $3, NOW(), 'kiosk', $4, 'pending')
      RETURNING *`,
      [organizationId, employee_id, kiosk.location_id, kiosk.id]
    );

    res.status(201).json({
      success: true,
      action: 'clock_in',
      entry_id: result.rows[0].id,
      clock_time: result.rows[0].clock_in,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      message: `Clocked in at ${new Date(result.rows[0].clock_in).toLocaleTimeString()}`,
    });

  } else {
    // Clock out
    const entry = await db.query(
      `SELECT id, clock_in FROM time_entries
       WHERE employee_id = $1 AND clock_out IS NULL`,
      [employee_id]
    );

    if (!entry.rows[0]) {
      return res.status(400).json({ error: 'Not clocked in' });
    }

    const result = await db.query(
      `UPDATE time_entries SET clock_out = NOW()
       WHERE id = $1
       RETURNING *`,
      [entry.rows[0].id]
    );

    const hoursWorked = result.rows[0].total_hours ||
      ((new Date(result.rows[0].clock_out) - new Date(result.rows[0].clock_in)) / 3600000).toFixed(2);

    res.json({
      success: true,
      action: 'clock_out',
      entry_id: result.rows[0].id,
      clock_in: result.rows[0].clock_in,
      clock_out: result.rows[0].clock_out,
      hours_worked: parseFloat(hoursWorked),
      employee_name: `${employee.first_name} ${employee.last_name}`,
      message: `Clocked out at ${new Date(result.rows[0].clock_out).toLocaleTimeString()}`,
    });
  }
});

// ============================================================
// ADMIN ENDPOINTS (authenticated via JWT)
// ============================================================

/**
 * GET /api/kiosk/list
 * List all kiosks for the organization
 */
router.get('/list', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;

  const result = await db.query(
    `SELECT k.id, k.name, k.location_id, k.is_active, k.last_seen_at, k.last_seen_ip,
            k.api_key_prefix, k.created_at,
            l.name as location_name,
            u.first_name || ' ' || u.last_name as created_by_name
     FROM kiosks k
     LEFT JOIN locations l ON l.id = k.location_id
     LEFT JOIN users u ON u.id = k.created_by
     WHERE k.organization_id = $1
     ORDER BY k.created_at DESC`,
    [organizationId]
  );

  res.json({ kiosks: result.rows });
});

/**
 * POST /api/kiosk/create
 * Create a new kiosk and return the API key (only shown once)
 */
router.post('/create', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { name, location_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name required' });
  }

  // Generate API key
  const apiKey = `ksk_${crypto.randomBytes(32).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyPrefix = apiKey.substring(0, 8);

  try {
    const result = await db.query(
      `INSERT INTO kiosks (organization_id, name, location_id, api_key_hash, api_key_prefix, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, location_id, api_key_prefix, created_at`,
      [organizationId, name, location_id || null, apiKeyHash, apiKeyPrefix, userId]
    );

    res.status(201).json({
      kiosk: result.rows[0],
      api_key: apiKey, // Only returned on creation
      message: 'Save this API key - it will not be shown again',
    });
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'A kiosk with this name already exists' });
    }
    throw error;
  }
});

/**
 * DELETE /api/kiosk/:id
 * Delete a kiosk
 */
router.delete('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  const result = await db.query(
    `DELETE FROM kiosks WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, organizationId]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Kiosk not found' });
  }

  res.json({ success: true });
});

/**
 * PATCH /api/kiosk/:id
 * Update kiosk (activate/deactivate, rename, change location)
 */
router.patch('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const { name, location_id, is_active } = req.body;

  const updates = [];
  const values = [id, organizationId];
  let paramIndex = 3;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (location_id !== undefined) {
    updates.push(`location_id = $${paramIndex++}`);
    values.push(location_id || null);
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(is_active);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  const result = await db.query(
    `UPDATE kiosks SET ${updates.join(', ')}
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Kiosk not found' });
  }

  res.json({ kiosk: result.rows[0] });
});

/**
 * POST /api/kiosk/:id/regenerate-key
 * Regenerate API key for a kiosk
 */
router.post('/:id/regenerate-key', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  // Generate new API key
  const apiKey = `ksk_${crypto.randomBytes(32).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyPrefix = apiKey.substring(0, 8);

  const result = await db.query(
    `UPDATE kiosks SET api_key_hash = $3, api_key_prefix = $4
     WHERE id = $1 AND organization_id = $2
     RETURNING id, name`,
    [id, organizationId, apiKeyHash, apiKeyPrefix]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Kiosk not found' });
  }

  res.json({
    kiosk: result.rows[0],
    api_key: apiKey,
    message: 'Save this API key - it will not be shown again',
  });
});

// ============================================================
// CLOCK-IN SETTINGS ENDPOINTS
// ============================================================

/**
 * GET /api/kiosk/settings
 * Get organization clock-in method settings
 */
router.get('/settings', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;

  const result = await db.query(
    `SELECT features FROM organizations WHERE id = $1`,
    [organizationId]
  );

  const features = result.rows[0]?.features || {};

  // Default clock methods settings
  const clockMethods = features.clock_methods || {
    gps: true,
    kiosk: false,
    badge: false,
    qr: false,
  };

  const gpsSettings = {
    geofence_radius: features.gps_geofence_radius || 100,
    require_selfie: features.gps_require_selfie || false,
  };

  res.json({
    clock_methods: clockMethods,
    gps_settings: gpsSettings,
  });
});

/**
 * PUT /api/kiosk/settings
 * Update organization clock-in method settings
 */
router.put('/settings', authMiddleware, requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { clock_methods, gps_settings } = req.body;

  // Get current features
  const current = await db.query(
    `SELECT features FROM organizations WHERE id = $1`,
    [organizationId]
  );

  const features = current.rows[0]?.features || {};

  // Update clock methods
  if (clock_methods) {
    features.clock_methods = {
      gps: clock_methods.gps !== false, // Default true
      kiosk: clock_methods.kiosk === true,
      badge: clock_methods.badge === true,
      qr: clock_methods.qr === true,
    };
  }

  // Update GPS settings
  if (gps_settings) {
    if (gps_settings.geofence_radius !== undefined) {
      features.gps_geofence_radius = parseInt(gps_settings.geofence_radius) || 100;
    }
    if (gps_settings.require_selfie !== undefined) {
      features.gps_require_selfie = gps_settings.require_selfie === true;
    }
  }

  await db.query(
    `UPDATE organizations SET features = $2 WHERE id = $1`,
    [organizationId, JSON.stringify(features)]
  );

  res.json({
    clock_methods: features.clock_methods,
    gps_settings: {
      geofence_radius: features.gps_geofence_radius || 100,
      require_selfie: features.gps_require_selfie || false,
    },
  });
});

export default router;
