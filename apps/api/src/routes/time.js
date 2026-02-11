// ============================================================
// TIME TRACKING & TIME OFF API ROUTES
// Clock in/out, Timesheets, Leave requests
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole, idempotencyMiddleware } from '../middleware/index.js';
import { notificationService } from '../services/notifications.js';
import { onShiftCompleted } from '../services/gamification.js';

const router = Router();
router.use(authMiddleware);

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ============================================================
// TIME ENTRIES (CLOCK IN/OUT)
// ============================================================

// Get current clock status for employee
router.get('/time/status', async (req, res) => {
  const { organizationId, employeeId } = req.user;

  if (!employeeId) {
    return res.status(400).json({ error: 'No employee linked to user' });
  }

  // Find any open time entry (clocked in but not out)
  const result = await db.query(
    `SELECT te.*, s.id as shift_id, s.start_time as shift_start, s.end_time as shift_end,
            l.name as location_name
     FROM time_entries te
     LEFT JOIN shifts s ON s.id = te.shift_id
     LEFT JOIN locations l ON l.id = te.location_id
     WHERE te.employee_id = $1 AND te.clock_out IS NULL
     ORDER BY te.clock_in DESC
     LIMIT 1`,
    [employeeId]
  );

  if (result.rows[0]) {
    return res.json({ 
      clockedIn: true, 
      entry: result.rows[0],
      clockedInAt: result.rows[0].clock_in,
    });
  }

  // Check for upcoming shift
  const upcomingShift = await db.query(
    `SELECT s.*, l.name as location_name, r.name as role_name
     FROM shifts s
     LEFT JOIN locations l ON l.id = s.location_id
     LEFT JOIN roles r ON r.id = s.role_id
     WHERE s.employee_id = $1 
       AND s.date = CURRENT_DATE
       AND s.start_time <= NOW() + INTERVAL '30 minutes'
       AND s.end_time > NOW()
       AND s.status IN ('scheduled', 'confirmed')
     ORDER BY s.start_time
     LIMIT 1`,
    [employeeId]
  );

  res.json({ 
    clockedIn: false,
    upcomingShift: upcomingShift.rows[0] || null,
  });
});

// Clock in (supports offline sync with idempotency)
router.post('/time/clock-in', idempotencyMiddleware, async (req, res) => {
  const { organizationId, employeeId } = req.user;
  const { shiftId, locationId, location, photo, offlineTimestamp } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'No employee linked to user' });
  }

  // Check not already clocked in
  const existing = await db.query(
    `SELECT id FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL`,
    [employeeId]
  );

  if (existing.rows[0]) {
    return res.status(400).json({ error: 'Already clocked in', entryId: existing.rows[0].id });
  }

  // Determine location
  let actualLocationId = locationId;
  if (shiftId && !locationId) {
    const shift = await db.query(`SELECT location_id FROM shifts WHERE id = $1`, [shiftId]);
    actualLocationId = shift.rows[0]?.location_id;
  }

  // Geofencing validation
  if (actualLocationId && location?.latitude && location?.longitude) {
    const locResult = await db.query(
      `SELECT latitude, longitude, geofence_radius FROM locations WHERE id = $1`,
      [actualLocationId]
    );
    
    const loc = locResult.rows[0];
    if (loc?.latitude && loc?.longitude && loc?.geofence_radius) {
      const distance = calculateDistance(
        location.latitude, location.longitude,
        loc.latitude, loc.longitude
      );
      
      if (distance > loc.geofence_radius) {
        return res.status(400).json({ 
          error: 'You are not within the allowed area for this location',
          code: 'GEOFENCE_ERROR',
          distance: Math.round(distance),
          allowedRadius: loc.geofence_radius,
        });
      }
    }
  }

  const result = await db.query(
    `INSERT INTO time_entries (
      organization_id, employee_id, shift_id, location_id,
      clock_in, clock_in_location
    ) VALUES ($1, $2, $3, $4, NOW(), $5)
    RETURNING *`,
    [organizationId, employeeId, shiftId, actualLocationId, JSON.stringify(location)]
  );

  // Update shift status if linked
  if (shiftId) {
    await db.query(
      `UPDATE shifts SET status = 'in_progress' WHERE id = $1`,
      [shiftId]
    );
  }

  res.status(201).json({ 
    entry: result.rows[0],
    message: 'Clocked in successfully',
  });
});

// Clock out (supports offline sync with idempotency)
router.post('/time/clock-out', idempotencyMiddleware, async (req, res) => {
  const { employeeId } = req.user;
  const { location, photo, breakMinutes, offlineTimestamp } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'No employee linked to user' });
  }

  // Find open entry
  const entry = await db.query(
    `SELECT * FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL`,
    [employeeId]
  );

  if (!entry.rows[0]) {
    return res.status(400).json({ error: 'Not clocked in' });
  }

  const result = await db.query(
    `UPDATE time_entries SET
       clock_out = NOW(),
       clock_out_location = $2,
       total_break_minutes = COALESCE($3, total_break_minutes)
     WHERE id = $1
     RETURNING *`,
    [entry.rows[0].id, JSON.stringify(location), breakMinutes]
  );

  // Update shift status if linked
  if (result.rows[0].shift_id) {
    await db.query(
      `UPDATE shifts SET status = 'completed' WHERE id = $1`,
      [result.rows[0].shift_id]
    );

    // Award gamification points for shift completion
    try {
      await onShiftCompleted(req.user.organizationId, employeeId, result.rows[0].shift_id);
    } catch (err) {
      console.error('Gamification points award failed:', err);
    }
  }

  res.json({
    entry: result.rows[0],
    message: 'Clocked out successfully',
    totalHours: result.rows[0].total_hours,
  });
});

// Start/end break (supports offline sync with idempotency)
router.post('/time/break/:action', idempotencyMiddleware, async (req, res) => {
  const { employeeId } = req.user;
  const { action } = req.params;
  const { offlineTimestamp } = req.body;

  const entry = await db.query(
    `SELECT * FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL`,
    [employeeId]
  );

  if (!entry.rows[0]) {
    return res.status(400).json({ error: 'Not clocked in' });
  }

  if (action === 'start') {
    await db.query(
      `UPDATE time_entries SET break_start = NOW() WHERE id = $1`,
      [entry.rows[0].id]
    );
    res.json({ message: 'Break started' });
  } else if (action === 'end') {
    // Calculate break duration
    const result = await db.query(
      `UPDATE time_entries SET 
         break_end = NOW(),
         total_break_minutes = COALESCE(total_break_minutes, 0) + 
           EXTRACT(EPOCH FROM (NOW() - break_start)) / 60
       WHERE id = $1
       RETURNING *`,
      [entry.rows[0].id]
    );
    res.json({ message: 'Break ended', breakMinutes: result.rows[0].total_break_minutes });
  }
});

// Get time entries (for employee or all)
router.get('/time/entries', async (req, res) => {
  const { organizationId, role, employeeId: userEmployeeId } = req.user;
  const { 
    employeeId, 
    locationId, 
    startDate, 
    endDate, 
    status,
    limit = 50,
    offset = 0 
  } = req.query;

  let query = `
    SELECT te.*, 
           e.first_name, e.last_name,
           l.name as location_name,
           s.start_time as shift_start, s.end_time as shift_end
    FROM time_entries te
    JOIN employees e ON e.id = te.employee_id
    LEFT JOIN locations l ON l.id = te.location_id
    LEFT JOIN shifts s ON s.id = te.shift_id
    WHERE te.organization_id = $1
  `;

  const params = [organizationId];
  let paramIndex = 2;

  // Workers only see their own entries
  if (role === 'worker') {
    query += ` AND te.employee_id = $${paramIndex++}`;
    params.push(userEmployeeId);
  } else if (employeeId) {
    query += ` AND te.employee_id = $${paramIndex++}`;
    params.push(employeeId);
  }

  if (locationId) {
    query += ` AND te.location_id = $${paramIndex++}`;
    params.push(locationId);
  }

  if (startDate) {
    query += ` AND te.clock_in >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND te.clock_in <= $${paramIndex++}`;
    params.push(endDate);
  }

  if (status) {
    query += ` AND te.status = $${paramIndex++}`;
    params.push(status);
  }

  query += ` ORDER BY te.clock_in DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await db.query(query, params);

  res.json({ entries: result.rows });
});

// Get pending approvals
router.get('/time/pending', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { locationId } = req.query;

  let query = `
    SELECT te.*, 
           e.first_name, e.last_name, e.avatar_url,
           l.name as location_name
    FROM time_entries te
    JOIN employees e ON e.id = te.employee_id
    LEFT JOIN locations l ON l.id = te.location_id
    WHERE te.organization_id = $1 AND te.status = 'pending'
  `;

  const params = [organizationId];

  if (locationId) {
    query += ` AND te.location_id = $2`;
    params.push(locationId);
  }

  query += ` ORDER BY te.clock_in DESC`;

  const result = await db.query(query, params);

  res.json({ entries: result.rows });
});

// Approve/reject time entry
router.post('/time/entries/:id/:action', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { id, action } = req.params;
  const { reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';

  const result = await db.query(
    `UPDATE time_entries SET 
       status = $3,
       approved_by = $4,
       approved_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, status, userId]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  // Notify employee
  await notificationService.sendTimeEntryDecision(result.rows[0], action);

  res.json({ entry: result.rows[0] });
});

// Bulk approve
router.post('/time/entries/bulk-approve', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { entryIds } = req.body;

  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return res.status(400).json({ error: 'entryIds array required' });
  }

  const result = await db.query(
    `UPDATE time_entries SET 
       status = 'approved',
       approved_by = $3,
       approved_at = NOW()
     WHERE id = ANY($1) AND organization_id = $2
     RETURNING id`,
    [entryIds, organizationId, userId]
  );

  res.json({ approved: result.rows.length });
});

// Adjust time entry
router.patch('/time/entries/:id', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { id } = req.params;
  const { clockIn, clockOut, breakMinutes, reason } = req.body;

  // Get original values for audit
  const original = await db.query(
    `SELECT clock_in, clock_out FROM time_entries WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  if (!original.rows[0]) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const result = await db.query(
    `UPDATE time_entries SET 
       clock_in = COALESCE($3, clock_in),
       clock_out = COALESCE($4, clock_out),
       total_break_minutes = COALESCE($5, total_break_minutes),
       adjusted = TRUE,
       adjusted_by = $6,
       adjustment_reason = $7,
       original_clock_in = CASE WHEN original_clock_in IS NULL THEN $8 ELSE original_clock_in END,
       original_clock_out = CASE WHEN original_clock_out IS NULL THEN $9 ELSE original_clock_out END
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [
      id, organizationId, clockIn, clockOut, breakMinutes, userId, reason,
      original.rows[0].clock_in, original.rows[0].clock_out
    ]
  );

  res.json({ entry: result.rows[0] });
});

// ============================================================
// TIME OFF
// ============================================================

// Get time off policies
router.get('/time-off/policies', async (req, res) => {
  const { organizationId } = req.user;

  const result = await db.query(
    `SELECT * FROM time_off_policies WHERE organization_id = $1 ORDER BY name`,
    [organizationId]
  );

  res.json({ policies: result.rows });
});

// Create policy
router.post('/time-off/policies', requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { name, code, accrualType, accrualAmount, maxBalance, allowCarryover, maxCarryover, requiresApproval, isPaid, color } = req.body;

  const result = await db.query(
    `INSERT INTO time_off_policies (
      organization_id, name, code, accrual_type, accrual_amount,
      max_balance, allow_carryover, max_carryover, requires_approval, is_paid, color
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [organizationId, name, code, accrualType, accrualAmount, maxBalance, allowCarryover, maxCarryover, requiresApproval, isPaid, color]
  );

  res.status(201).json({ policy: result.rows[0] });
});

// Get employee balances
router.get('/time-off/balances', async (req, res) => {
  const { organizationId, employeeId: userEmployeeId, role } = req.user;
  const { employeeId } = req.query;

  const targetEmployeeId = role === 'worker' ? userEmployeeId : (employeeId || userEmployeeId);

  const result = await db.query(
    `SELECT tob.*, top.name as policy_name, top.color
     FROM time_off_balances tob
     JOIN time_off_policies top ON top.id = tob.policy_id
     WHERE tob.employee_id = $1 AND tob.year = EXTRACT(YEAR FROM CURRENT_DATE)`,
    [targetEmployeeId]
  );

  res.json({ balances: result.rows });
});

// Get time off requests
router.get('/time-off/requests', async (req, res) => {
  try {
    const { organizationId, role, employeeId: userEmployeeId } = req.user;
    const { status, employeeId, startDate, endDate } = req.query;

    let query = `
      SELECT tor.*,
             e.first_name, e.last_name, e.avatar_url,
             top.name as policy_name, top.color,
             u.first_name || ' ' || u.last_name as reviewed_by_name
      FROM time_off_requests tor
      JOIN employees e ON e.id = tor.employee_id
      JOIN time_off_policies top ON top.id = tor.policy_id
      LEFT JOIN users u ON u.id = tor.reviewed_by
      WHERE tor.organization_id = $1
    `;

    const params = [organizationId];
    let paramIndex = 2;

    // Workers only see their own
    if (role === 'worker') {
      query += ` AND tor.employee_id = $${paramIndex++}`;
      params.push(userEmployeeId);
    } else if (employeeId) {
      query += ` AND tor.employee_id = $${paramIndex++}`;
      params.push(employeeId);
    }

    if (status) {
      query += ` AND tor.status = $${paramIndex++}`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND tor.end_date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND tor.start_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY tor.start_date DESC`;

    const result = await db.query(query, params);

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get time off requests error:', error);
    res.status(500).json({ error: 'Failed to get time off requests' });
  }
});

// Create time off request
router.post('/time-off/requests', async (req, res) => {
  const { organizationId, employeeId } = req.user;
  const { policyId, startDate, endDate, totalDays, reason } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'No employee linked to user' });
  }

  // Check balance
  const balance = await db.query(
    `SELECT * FROM time_off_balances 
     WHERE employee_id = $1 AND policy_id = $2 AND year = EXTRACT(YEAR FROM $3::date)`,
    [employeeId, policyId, startDate]
  );

  if (balance.rows[0]) {
    const available = (balance.rows[0].entitlement || 0) + 
                     (balance.rows[0].carried_over || 0) - 
                     (balance.rows[0].used || 0) - 
                     (balance.rows[0].pending || 0);
    
    if (totalDays > available) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        available,
        requested: totalDays,
      });
    }
  }

  // Check for overlapping requests
  const overlapping = await db.query(
    `SELECT id FROM time_off_requests 
     WHERE employee_id = $1 
       AND status NOT IN ('rejected', 'cancelled')
       AND start_date <= $3 AND end_date >= $2`,
    [employeeId, startDate, endDate]
  );

  if (overlapping.rows.length > 0) {
    return res.status(400).json({ error: 'Overlapping time off request exists' });
  }

  const result = await db.query(
    `INSERT INTO time_off_requests (
      organization_id, employee_id, policy_id, start_date, end_date, total_days, reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [organizationId, employeeId, policyId, startDate, endDate, totalDays, reason]
  );

  // Update pending balance
  await db.query(
    `UPDATE time_off_balances SET pending = pending + $3
     WHERE employee_id = $1 AND policy_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
    [employeeId, policyId, totalDays]
  );

  // Notify managers
  await notificationService.sendTimeOffRequest(result.rows[0]);

  res.status(201).json({ request: result.rows[0] });
});

// Approve/reject time off
router.post('/time-off/requests/:id/:action', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { id, action } = req.params;
  const { notes } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';

  // Get request details first
  const request = await db.query(
    `SELECT * FROM time_off_requests WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  if (!request.rows[0]) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const req_data = request.rows[0];

  // Update request
  const result = await db.query(
    `UPDATE time_off_requests SET 
       status = $3,
       reviewed_by = $4,
       reviewed_at = NOW(),
       review_notes = $5
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, status, userId, notes]
  );

  // Update balances
  if (action === 'approve') {
    // Move from pending to used
    await db.query(
      `UPDATE time_off_balances SET 
         pending = pending - $3,
         used = used + $3
       WHERE employee_id = $1 AND policy_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [req_data.employee_id, req_data.policy_id, req_data.total_days]
    );
  } else {
    // Remove from pending
    await db.query(
      `UPDATE time_off_balances SET pending = pending - $3
       WHERE employee_id = $1 AND policy_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [req_data.employee_id, req_data.policy_id, req_data.total_days]
    );
  }

  // Notify employee
  await notificationService.sendTimeOffDecision(result.rows[0], action);

  res.json({ request: result.rows[0] });
});

// Cancel time off request
router.post('/time-off/requests/:id/cancel', async (req, res) => {
  const { organizationId, employeeId, role } = req.user;
  const { id } = req.params;

  // Get request
  const request = await db.query(
    `SELECT * FROM time_off_requests WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  if (!request.rows[0]) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const req_data = request.rows[0];

  // Workers can only cancel their own
  if (role === 'worker' && req_data.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Only pending/approved can be cancelled
  if (!['pending', 'approved'].includes(req_data.status)) {
    return res.status(400).json({ error: 'Cannot cancel this request' });
  }

  // Update request
  await db.query(
    `UPDATE time_off_requests SET status = 'cancelled' WHERE id = $1`,
    [id]
  );

  // Update balances
  if (req_data.status === 'pending') {
    await db.query(
      `UPDATE time_off_balances SET pending = pending - $3
       WHERE employee_id = $1 AND policy_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [req_data.employee_id, req_data.policy_id, req_data.total_days]
    );
  } else if (req_data.status === 'approved') {
    await db.query(
      `UPDATE time_off_balances SET used = used - $3
       WHERE employee_id = $1 AND policy_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [req_data.employee_id, req_data.policy_id, req_data.total_days]
    );
  }

  res.json({ success: true });
});

export default router;
