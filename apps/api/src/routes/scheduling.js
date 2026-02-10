// ============================================================
// SCHEDULING API ROUTES
// Shifts, Templates, Swaps, Publishing
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import { notificationService } from '../services/notifications.js';

const router = Router();
router.use(authMiddleware);

// ============================================================
// SHIFTS
// ============================================================

// Get shifts for date range
router.get('/shifts', async (req, res) => {
  const { organizationId, role, employeeId: userEmployeeId } = req.user;
  const { 
    startDate, 
    endDate, 
    locationId, 
    employeeId, 
    status,
    includeOpen = 'true'
  } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  let query = `
    SELECT s.*, 
           e.first_name, e.last_name, e.avatar_url,
           l.name as location_name,
           r.name as role_name, r.color as role_color
    FROM shifts s
    LEFT JOIN employees e ON e.id = s.employee_id
    LEFT JOIN locations l ON l.id = s.location_id
    LEFT JOIN roles r ON r.id = s.role_id
    WHERE s.organization_id = $1
      AND s.date >= $2 AND s.date <= $3
  `;
  
  const params = [organizationId, startDate, endDate];
  let paramIndex = 4;

  // Workers only see their own shifts (unless viewing open shifts)
  if (role === 'worker') {
    query += ` AND (s.employee_id = $${paramIndex} OR s.is_open = TRUE)`;
    params.push(userEmployeeId);
    paramIndex++;
  } else if (employeeId) {
    query += ` AND s.employee_id = $${paramIndex++}`;
    params.push(employeeId);
  }

  if (locationId) {
    query += ` AND s.location_id = $${paramIndex++}`;
    params.push(locationId);
  }

  if (status) {
    query += ` AND s.status = $${paramIndex++}`;
    params.push(status);
  }

  if (includeOpen !== 'true') {
    query += ` AND s.is_open = FALSE`;
  }

  query += ` ORDER BY s.date, s.start_time`;

  const result = await db.query(query, params);

  res.json({ shifts: result.rows });
});

// Get single shift (UUID validation to avoid matching named routes like /shifts/swaps)
router.get('/shifts/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `SELECT s.*,
              e.first_name, e.last_name, e.email, e.phone, e.avatar_url,
              l.name as location_name, l.address_line1 as location_address,
              r.name as role_name
       FROM shifts s
       LEFT JOIN employees e ON e.id = s.employee_id
       LEFT JOIN locations l ON l.id = s.location_id
       LEFT JOIN roles r ON r.id = s.role_id
       WHERE s.id = $1 AND s.organization_id = $2`,
      [id, organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Get applicants if open shift
    const shift = result.rows[0];
    if (shift.is_open && shift.applicants?.length > 0) {
      const applicants = await db.query(
        `SELECT id, first_name, last_name, avatar_url FROM employees WHERE id = ANY($1)`,
        [shift.applicants]
      );
      shift.applicantDetails = applicants.rows;
    }

    res.json({ shift });
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({ error: 'Failed to get shift' });
  }
});

// Create shift
router.post('/shifts', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const {
    date,
    startTime,
    endTime,
    breakMinutes = 0,
    locationId,
    roleId,
    employeeId,
    isOpen = false,
    notes,
    color,
  } = req.body;

  // Validate times
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (end <= start) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }

  // Check for conflicts if assigning to employee
  if (employeeId) {
    const conflicts = await db.query(
      `SELECT id FROM shifts 
       WHERE organization_id = $1 
         AND employee_id = $2 
         AND date = $3
         AND status NOT IN ('cancelled')
         AND (
           (start_time <= $4 AND end_time > $4) OR
           (start_time < $5 AND end_time >= $5) OR
           (start_time >= $4 AND end_time <= $5)
         )`,
      [organizationId, employeeId, date, startTime, endTime]
    );

    if (conflicts.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Employee has conflicting shift',
        conflictingShiftId: conflicts.rows[0].id 
      });
    }
  }

  // Calculate estimated cost
  let estimatedCost = null;
  if (employeeId) {
    const emp = await db.query(
      `SELECT hourly_rate FROM employees WHERE id = $1`,
      [employeeId]
    );
    if (emp.rows[0]?.hourly_rate) {
      const hours = (end - start) / 3600000 - breakMinutes / 60;
      estimatedCost = hours * emp.rows[0].hourly_rate;
    }
  }

  const result = await db.query(
    `INSERT INTO shifts (
      organization_id, date, start_time, end_time, break_minutes,
      location_id, role_id, employee_id, is_open, notes, color,
      estimated_cost, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      organizationId, date, startTime, endTime, breakMinutes,
      locationId, roleId, employeeId, isOpen, notes, color,
      estimatedCost, userId
    ]
  );

  res.status(201).json({ shift: result.rows[0] });
});

// Update shift
router.patch('/shifts/:id', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const updates = req.body;

  const fields = [
    'date', 'start_time', 'end_time', 'break_minutes', 'location_id',
    'role_id', 'employee_id', 'is_open', 'status', 'notes', 'color'
  ];

  const setClauses = [];
  const values = [id, organizationId];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(updates)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (fields.includes(snakeKey)) {
      setClauses.push(`${snakeKey} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const result = await db.query(
    `UPDATE shifts SET ${setClauses.join(', ')}
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Shift not found' });
  }

  // Notify employee if assigned
  if (updates.employeeId && result.rows[0].published) {
    await notificationService.sendShiftAssigned(result.rows[0]);
  }

  res.json({ shift: result.rows[0] });
});

// Delete shift
router.delete('/shifts/:id', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  // Get shift first to notify if needed
  const shift = await db.query(
    `SELECT * FROM shifts WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  if (shift.rows[0]?.employee_id && shift.rows[0]?.published) {
    await notificationService.sendShiftCancelled(shift.rows[0]);
  }

  await db.query(
    `DELETE FROM shifts WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  res.json({ success: true });
});

// Bulk create shifts
router.post('/shifts/bulk', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { shifts } = req.body;

  if (!Array.isArray(shifts) || shifts.length === 0) {
    return res.status(400).json({ error: 'shifts array required' });
  }

  const created = [];
  const errors = [];

  for (const shift of shifts) {
    try {
      const result = await db.query(
        `INSERT INTO shifts (
          organization_id, date, start_time, end_time, break_minutes,
          location_id, role_id, employee_id, is_open, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          organizationId, shift.date, shift.startTime, shift.endTime,
          shift.breakMinutes || 0, shift.locationId, shift.roleId,
          shift.employeeId, shift.isOpen || false, shift.notes, userId
        ]
      );
      created.push(result.rows[0]);
    } catch (error) {
      errors.push({ shift, error: error.message });
    }
  }

  res.status(201).json({ created, errors });
});

// ============================================================
// OPEN SHIFTS
// ============================================================

// Get open shifts available to employee
router.get('/shifts/open', async (req, res) => {
  const { organizationId, employeeId } = req.user;

  if (!employeeId) {
    return res.status(400).json({ error: 'No employee linked to user' });
  }

  // Get employee's locations and roles
  const emp = await db.query(
    `SELECT location_ids, role_ids, primary_location_id, primary_role_id 
     FROM employees WHERE id = $1`,
    [employeeId]
  );

  const employee = emp.rows[0];
  const locationIds = [...(employee.location_ids || []), employee.primary_location_id].filter(Boolean);
  const roleIds = [...(employee.role_ids || []), employee.primary_role_id].filter(Boolean);

  const result = await db.query(
    `SELECT s.*, l.name as location_name, r.name as role_name
     FROM shifts s
     JOIN locations l ON l.id = s.location_id
     LEFT JOIN roles r ON r.id = s.role_id
     WHERE s.organization_id = $1
       AND s.is_open = TRUE
       AND s.employee_id IS NULL
       AND s.date >= CURRENT_DATE
       AND s.status = 'scheduled'
       AND (s.open_to_location_ids IS NULL OR s.open_to_location_ids && $2)
       AND (s.open_to_role_ids IS NULL OR s.open_to_role_ids && $3)
       AND NOT ($4 = ANY(s.applicants))
     ORDER BY s.date, s.start_time`,
    [organizationId, locationIds, roleIds, employeeId]
  );

  res.json({ shifts: result.rows });
});

// Apply for open shift
router.post('/shifts/:id/apply', async (req, res) => {
  const { organizationId, employeeId } = req.user;
  const { id } = req.params;

  if (!employeeId) {
    return res.status(400).json({ error: 'No employee linked to user' });
  }

  // Check shift is open
  const shift = await db.query(
    `SELECT * FROM shifts WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  if (!shift.rows[0]) {
    return res.status(404).json({ error: 'Shift not found' });
  }

  if (!shift.rows[0].is_open) {
    return res.status(400).json({ error: 'Shift is not open' });
  }

  if (shift.rows[0].applicants?.includes(employeeId)) {
    return res.status(400).json({ error: 'Already applied' });
  }

  // Add to applicants
  const result = await db.query(
    `UPDATE shifts SET applicants = array_append(applicants, $3)
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, employeeId]
  );

  res.json({ shift: result.rows[0] });
});

// Assign open shift to applicant
router.post('/shifts/:id/assign', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const { employeeId } = req.body;

  const result = await db.query(
    `UPDATE shifts SET 
       employee_id = $3, 
       is_open = FALSE, 
       applicants = '{}',
       status = 'confirmed',
       confirmed_at = NOW()
     WHERE id = $1 AND organization_id = $2 AND is_open = TRUE
     RETURNING *`,
    [id, organizationId, employeeId]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Shift not found or not open' });
  }

  // Notify the assigned employee
  await notificationService.sendShiftAssigned(result.rows[0]);

  res.json({ shift: result.rows[0] });
});

// ============================================================
// SHIFT SWAPS
// ============================================================

// Get swap requests
router.get('/shifts/swaps', async (req, res) => {
  try {
    const { organizationId, role, employeeId } = req.user;
    const { status = 'pending' } = req.query;

    let query = `
      SELECT sw.*,
             fs.date as from_shift_date, fs.start_time as from_shift_start, fs.end_time as from_shift_end,
             fe.first_name as from_first_name, fe.last_name as from_last_name,
             ts.date as to_shift_date, ts.start_time as to_shift_start, ts.end_time as to_shift_end,
             te.first_name as to_first_name, te.last_name as to_last_name
      FROM shift_swaps sw
      JOIN shifts fs ON fs.id = sw.from_shift_id
      JOIN employees fe ON fe.id = sw.from_employee_id
      LEFT JOIN shifts ts ON ts.id = sw.to_shift_id
      LEFT JOIN employees te ON te.id = sw.to_employee_id
      WHERE sw.organization_id = $1 AND sw.status = $2
    `;

    const params = [organizationId, status];

    // Workers only see swaps they're involved in
    if (role === 'worker') {
      query += ` AND (sw.from_employee_id = $3 OR sw.to_employee_id = $3)`;
      params.push(employeeId);
    }

    query += ` ORDER BY sw.created_at DESC`;

    const result = await db.query(query, params);

    res.json({ swaps: result.rows });
  } catch (error) {
    console.error('Get shift swaps error:', error);
    res.status(500).json({ error: 'Failed to get shift swaps' });
  }
});

// Create swap request
router.post('/shifts/swaps', async (req, res) => {
  const { organizationId, employeeId } = req.user;
  const { fromShiftId, toShiftId, toEmployeeId, type = 'swap', reason } = req.body;

  // Verify employee owns the from shift
  const fromShift = await db.query(
    `SELECT * FROM shifts WHERE id = $1 AND employee_id = $2`,
    [fromShiftId, employeeId]
  );

  if (!fromShift.rows[0]) {
    return res.status(400).json({ error: 'You can only swap your own shifts' });
  }

  const result = await db.query(
    `INSERT INTO shift_swaps (
      organization_id, from_shift_id, from_employee_id,
      to_shift_id, to_employee_id, type, reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [organizationId, fromShiftId, employeeId, toShiftId, toEmployeeId, type, reason]
  );

  // Notify manager(s)
  await notificationService.sendSwapRequest(result.rows[0]);

  res.status(201).json({ swap: result.rows[0] });
});

// Approve/reject swap
router.post('/shifts/swaps/:id/:action', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { id, action } = req.params;
  const { notes } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';

  const result = await db.query(
    `UPDATE shift_swaps SET 
       status = $3, 
       reviewed_by = $4, 
       reviewed_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, status, userId]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Swap not found' });
  }

  const swap = result.rows[0];

  // If approved, actually swap the shifts
  if (action === 'approve') {
    if (swap.type === 'swap' && swap.to_shift_id) {
      // Swap employees on both shifts
      await db.query(
        `UPDATE shifts SET employee_id = $2 WHERE id = $1`,
        [swap.from_shift_id, swap.to_employee_id]
      );
      await db.query(
        `UPDATE shifts SET employee_id = $2 WHERE id = $1`,
        [swap.to_shift_id, swap.from_employee_id]
      );
    } else if (swap.type === 'drop') {
      // Make shift open
      await db.query(
        `UPDATE shifts SET employee_id = NULL, is_open = TRUE WHERE id = $1`,
        [swap.from_shift_id]
      );
    }
  }

  // Notify employees
  await notificationService.sendSwapDecision(swap, action);

  res.json({ swap: result.rows[0] });
});

// ============================================================
// SCHEDULE PUBLISHING
// ============================================================

// Get schedule period
router.get('/schedule/periods', async (req, res) => {
  const { organizationId } = req.user;
  const { locationId, status } = req.query;

  let query = `
    SELECT sp.*, l.name as location_name,
           u.first_name || ' ' || u.last_name as published_by_name
    FROM schedule_periods sp
    LEFT JOIN locations l ON l.id = sp.location_id
    LEFT JOIN users u ON u.id = sp.published_by
    WHERE sp.organization_id = $1
  `;
  
  const params = [organizationId];
  let paramIndex = 2;

  if (locationId) {
    query += ` AND sp.location_id = $${paramIndex++}`;
    params.push(locationId);
  }

  if (status) {
    query += ` AND sp.status = $${paramIndex++}`;
    params.push(status);
  }

  query += ` ORDER BY sp.start_date DESC`;

  const result = await db.query(query, params);

  res.json({ periods: result.rows });
});

// Create schedule period
router.post('/schedule/periods', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { startDate, endDate, locationId } = req.body;

  const result = await db.query(
    `INSERT INTO schedule_periods (organization_id, start_date, end_date, location_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [organizationId, startDate, endDate, locationId]
  );

  res.status(201).json({ period: result.rows[0] });
});

// Update schedule period
router.patch('/schedule/periods/:id', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const { startDate, endDate, locationId, status } = req.body;

  const result = await db.query(
    `UPDATE schedule_periods SET
       start_date = COALESCE($3, start_date),
       end_date = COALESCE($4, end_date),
       location_id = COALESCE($5, location_id),
       status = COALESCE($6, status),
       updated_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, startDate, endDate, locationId, status]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Period not found' });
  }

  res.json({ period: result.rows[0] });
});

// Publish schedule
router.post('/schedule/periods/:id/publish', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { id } = req.params;

  // Update period status
  const period = await db.query(
    `UPDATE schedule_periods SET 
       status = 'published', 
       published_at = NOW(), 
       published_by = $3
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, userId]
  );

  if (!period.rows[0]) {
    return res.status(404).json({ error: 'Period not found' });
  }

  // Mark all shifts in period as published
  await db.query(
    `UPDATE shifts SET published = TRUE, published_at = NOW()
     WHERE organization_id = $1 
       AND date >= $2 AND date <= $3
       AND ($4 IS NULL OR location_id = $4)`,
    [organizationId, period.rows[0].start_date, period.rows[0].end_date, period.rows[0].location_id]
  );

  // Get all employees with shifts in this period
  const employees = await db.query(
    `SELECT DISTINCT e.id, u.id as user_id
     FROM shifts s
     JOIN employees e ON e.id = s.employee_id
     JOIN users u ON u.employee_id = e.id
     WHERE s.organization_id = $1
       AND s.date >= $2 AND s.date <= $3
       AND ($4 IS NULL OR s.location_id = $4)`,
    [organizationId, period.rows[0].start_date, period.rows[0].end_date, period.rows[0].location_id]
  );

  // Notify all employees
  for (const emp of employees.rows) {
    await notificationService.sendSchedulePublished(emp.user_id, period.rows[0]);
  }

  res.json({ period: period.rows[0], notified: employees.rows.length });
});

// ============================================================
// SHIFT TEMPLATES
// ============================================================

router.get('/shift-templates', async (req, res) => {
  const { organizationId } = req.user;
  const { locationId } = req.query;

  let query = `
    SELECT st.*, l.name as location_name, r.name as role_name
    FROM shift_templates st
    LEFT JOIN locations l ON l.id = st.location_id
    LEFT JOIN roles r ON r.id = st.role_id
    WHERE st.organization_id = $1
  `;
  
  const params = [organizationId];

  if (locationId) {
    query += ` AND (st.location_id = $2 OR st.location_id IS NULL)`;
    params.push(locationId);
  }

  query += ` ORDER BY st.start_time`;

  const result = await db.query(query, params);

  res.json({ templates: result.rows });
});

router.post('/shift-templates', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { name, locationId, roleId, startTime, endTime, breakMinutes, daysOfWeek, color } = req.body;

  const result = await db.query(
    `INSERT INTO shift_templates (
      organization_id, name, location_id, role_id, 
      start_time, end_time, break_minutes, days_of_week, color
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [organizationId, name, locationId, roleId, startTime, endTime, breakMinutes || 0, daysOfWeek, color]
  );

  res.status(201).json({ template: result.rows[0] });
});

// Update shift template
router.patch('/shift-templates/:id', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const { name, locationId, roleId, startTime, endTime, breakMinutes, daysOfWeek, color } = req.body;

  const result = await db.query(
    `UPDATE shift_templates SET
       name = COALESCE($3, name),
       location_id = COALESCE($4, location_id),
       role_id = COALESCE($5, role_id),
       start_time = COALESCE($6, start_time),
       end_time = COALESCE($7, end_time),
       break_minutes = COALESCE($8, break_minutes),
       days_of_week = COALESCE($9, days_of_week),
       color = COALESCE($10, color),
       updated_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, name, locationId, roleId, startTime, endTime, breakMinutes, daysOfWeek, color]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({ template: result.rows[0] });
});

// Generate shifts from template
router.post('/shift-templates/:id/generate', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { id } = req.params;
  const { startDate, endDate, employeeId } = req.body;

  const template = await db.query(
    `SELECT * FROM shift_templates WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  if (!template.rows[0]) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const t = template.rows[0];
  const shifts = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (t.days_of_week.includes(dayOfWeek)) {
      const date = d.toISOString().split('T')[0];
      const startTime = new Date(`${date}T${t.start_time}`);
      const endTime = new Date(`${date}T${t.end_time}`);

      const result = await db.query(
        `INSERT INTO shifts (
          organization_id, date, start_time, end_time, break_minutes,
          location_id, role_id, employee_id, color, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          organizationId, date, startTime, endTime, t.break_minutes,
          t.location_id, t.role_id, employeeId, t.color, userId
        ]
      );
      shifts.push(result.rows[0]);
    }
  }

  res.status(201).json({ shifts, count: shifts.length });
});

// ============================================================
// AI DEMAND FORECASTING
// ============================================================

// Get demand forecast for upcoming period
router.get('/forecast', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { 
    weeks = 2,           // How many weeks ahead to forecast
    locationId,          // Optional filter
    granularity = 'day'  // 'day' or 'hour'
  } = req.query;

  const weeksToForecast = Math.min(parseInt(weeks) || 2, 8);
  const weeksOfHistory = 12; // Use 12 weeks of history for patterns

  // Get historical shift data for pattern analysis
  const historyParams = locationId ? [organizationId, weeksOfHistory, locationId] : [organizationId, weeksOfHistory];
  const historyResult = await db.query(`
    SELECT
      EXTRACT(DOW FROM s.date) as day_of_week,
      EXTRACT(HOUR FROM s.start_time) as start_hour,
      s.location_id,
      l.name as location_name,
      r.id as role_id,
      r.name as role_name,
      COUNT(*) as shift_count,
      SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600) as total_hours,
      AVG(CASE WHEN s.employee_id IS NOT NULL THEN 1 ELSE 0 END) as fill_rate
    FROM shifts s
    LEFT JOIN locations l ON l.id = s.location_id
    LEFT JOIN roles r ON r.id = s.role_id
    WHERE s.organization_id = $1
      AND s.date >= CURRENT_DATE - INTERVAL '1 week' * $2
      AND s.date < CURRENT_DATE
      ${locationId ? `AND s.location_id = $3` : ''}
    GROUP BY
      EXTRACT(DOW FROM s.date),
      EXTRACT(HOUR FROM s.start_time),
      s.location_id, l.name,
      r.id, r.name
    ORDER BY day_of_week, start_hour
  `, historyParams);

  // Get recent attendance patterns for adjustment
  const attendanceResult = await db.query(`
    SELECT
      EXTRACT(DOW FROM te.clock_in) as day_of_week,
      COUNT(*) as attendance_count,
      AVG(CASE WHEN te.clock_in <= s.start_time + INTERVAL '5 minutes' THEN 1 ELSE 0 END) as on_time_rate
    FROM time_entries te
    JOIN shifts s ON s.id = te.shift_id
    WHERE te.organization_id = $1
      AND te.clock_in >= CURRENT_DATE - INTERVAL '1 week' * $2
    GROUP BY EXTRACT(DOW FROM te.clock_in)
  `, [organizationId, weeksOfHistory]);

  // Build pattern maps
  const dayPatterns = {};
  const hourPatterns = {};
  const locationPatterns = {};
  const rolePatterns = {};

  historyResult.rows.forEach(row => {
    const dow = parseInt(row.day_of_week);
    const hour = parseInt(row.start_hour);
    
    // Day of week patterns
    if (!dayPatterns[dow]) {
      dayPatterns[dow] = { shifts: 0, hours: 0, fillRate: 0, count: 0 };
    }
    dayPatterns[dow].shifts += parseInt(row.shift_count);
    dayPatterns[dow].hours += parseFloat(row.total_hours);
    dayPatterns[dow].fillRate += parseFloat(row.fill_rate);
    dayPatterns[dow].count++;

    // Hour patterns
    if (!hourPatterns[hour]) {
      hourPatterns[hour] = { shifts: 0, hours: 0 };
    }
    hourPatterns[hour].shifts += parseInt(row.shift_count);
    hourPatterns[hour].hours += parseFloat(row.total_hours);

    // Location patterns
    if (row.location_id) {
      if (!locationPatterns[row.location_id]) {
        locationPatterns[row.location_id] = { 
          name: row.location_name, 
          shifts: 0, 
          hours: 0,
          byDay: {}
        };
      }
      locationPatterns[row.location_id].shifts += parseInt(row.shift_count);
      locationPatterns[row.location_id].hours += parseFloat(row.total_hours);
      
      if (!locationPatterns[row.location_id].byDay[dow]) {
        locationPatterns[row.location_id].byDay[dow] = { shifts: 0, hours: 0 };
      }
      locationPatterns[row.location_id].byDay[dow].shifts += parseInt(row.shift_count);
      locationPatterns[row.location_id].byDay[dow].hours += parseFloat(row.total_hours);
    }

    // Role patterns
    if (row.role_id) {
      if (!rolePatterns[row.role_id]) {
        rolePatterns[row.role_id] = { name: row.role_name, shifts: 0, hours: 0 };
      }
      rolePatterns[row.role_id].shifts += parseInt(row.shift_count);
      rolePatterns[row.role_id].hours += parseFloat(row.total_hours);
    }
  });

  // Normalize patterns to weekly averages
  Object.keys(dayPatterns).forEach(dow => {
    const p = dayPatterns[dow];
    p.avgShifts = Math.round(p.shifts / weeksOfHistory);
    p.avgHours = Math.round(p.hours / weeksOfHistory * 10) / 10;
    p.avgFillRate = p.count > 0 ? Math.round(p.fillRate / p.count * 100) : 0;
  });

  // Generate forecast for upcoming weeks
  const forecast = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let d = 0; d < weeksToForecast * 7; d++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + d);
    const dow = forecastDate.getDay();
    const pattern = dayPatterns[dow] || { avgShifts: 0, avgHours: 0, avgFillRate: 0 };

    // Apply seasonal adjustments (simplified)
    const month = forecastDate.getMonth();
    let seasonalFactor = 1.0;
    if (month === 11 || month === 0) seasonalFactor = 1.3; // Dec/Jan peak
    if (month === 6 || month === 7) seasonalFactor = 1.15; // Summer
    if (month === 1 || month === 2) seasonalFactor = 0.9; // Feb/Mar slow

    // Apply day-of-week confidence based on history
    const confidence = Math.min(95, 60 + (pattern.count || 0) * 3);

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      dayOfWeek: dow,
      dayName: dayNames[dow],
      predictedShifts: Math.round(pattern.avgShifts * seasonalFactor),
      predictedHours: Math.round(pattern.avgHours * seasonalFactor * 10) / 10,
      predictedHeadcount: Math.ceil(pattern.avgShifts * seasonalFactor / 2), // Assume 2 shifts per person avg
      expectedFillRate: pattern.avgFillRate,
      confidence: confidence,
      seasonalFactor: seasonalFactor,
      isWeekend: dow === 0 || dow === 6,
      alerts: []
    });

    // Add alerts for potential issues
    if (pattern.avgFillRate < 80) {
      forecast[forecast.length - 1].alerts.push({
        type: 'fill_rate',
        message: `Historical fill rate only ${pattern.avgFillRate}% for ${dayNames[dow]}s`,
        severity: pattern.avgFillRate < 60 ? 'high' : 'medium'
      });
    }
    if (seasonalFactor > 1.2) {
      forecast[forecast.length - 1].alerts.push({
        type: 'seasonal',
        message: 'Peak season - consider adding flex staff',
        severity: 'medium'
      });
    }
  }

  // Generate hourly breakdown if requested
  let hourlyForecast = null;
  if (granularity === 'hour') {
    hourlyForecast = {};
    Object.keys(hourPatterns).forEach(hour => {
      const h = parseInt(hour);
      hourlyForecast[h] = {
        hour: h,
        label: `${h.toString().padStart(2, '0')}:00`,
        avgShiftsStarting: Math.round(hourPatterns[hour].shifts / (weeksOfHistory * 7)),
        peakFactor: hourPatterns[hour].shifts / Math.max(...Object.values(hourPatterns).map(p => p.shifts))
      };
    });
  }

  // Summary statistics
  const summary = {
    totalPredictedShifts: forecast.reduce((sum, f) => sum + f.predictedShifts, 0),
    totalPredictedHours: Math.round(forecast.reduce((sum, f) => sum + f.predictedHours, 0)),
    avgDailyHeadcount: Math.round(forecast.reduce((sum, f) => sum + f.predictedHeadcount, 0) / forecast.length),
    peakDay: forecast.reduce((max, f) => f.predictedShifts > max.predictedShifts ? f : max, forecast[0]),
    lowDay: forecast.reduce((min, f) => f.predictedShifts < min.predictedShifts ? f : min, forecast[0]),
    weekendVsWeekday: {
      weekendAvg: Math.round(forecast.filter(f => f.isWeekend).reduce((sum, f) => sum + f.predictedShifts, 0) / forecast.filter(f => f.isWeekend).length),
      weekdayAvg: Math.round(forecast.filter(f => !f.isWeekend).reduce((sum, f) => sum + f.predictedShifts, 0) / forecast.filter(f => !f.isWeekend).length)
    },
    alertCount: forecast.reduce((sum, f) => sum + f.alerts.length, 0),
    dataQuality: historyResult.rows.length > 50 ? 'high' : historyResult.rows.length > 20 ? 'medium' : 'low'
  };

  // Location breakdown
  const locationForecast = Object.entries(locationPatterns).map(([id, data]) => ({
    locationId: id,
    locationName: data.name,
    avgWeeklyShifts: Math.round(data.shifts / weeksOfHistory),
    avgWeeklyHours: Math.round(data.hours / weeksOfHistory),
    peakDays: Object.entries(data.byDay)
      .sort((a, b) => b[1].shifts - a[1].shifts)
      .slice(0, 3)
      .map(([dow]) => dayNames[parseInt(dow)])
  }));

  // Role breakdown
  const roleForecast = Object.entries(rolePatterns).map(([id, data]) => ({
    roleId: id,
    roleName: data.name,
    avgWeeklyShifts: Math.round(data.shifts / weeksOfHistory),
    avgWeeklyHours: Math.round(data.hours / weeksOfHistory),
    percentOfTotal: Math.round(data.shifts / historyResult.rows.reduce((sum, r) => sum + parseInt(r.shift_count), 0) * 100)
  }));

  res.json({
    forecast,
    hourlyForecast,
    summary,
    locationForecast,
    roleForecast,
    metadata: {
      generatedAt: new Date().toISOString(),
      weeksOfHistory,
      weeksForecasted: weeksToForecast,
      granularity,
      organizationId
    }
  });
});

// Get AI scheduling recommendations
router.get('/forecast/recommendations', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;

  // Get current week's schedule vs forecast
  const currentWeekShifts = await db.query(`
    SELECT 
      EXTRACT(DOW FROM date) as day_of_week,
      COUNT(*) as scheduled_shifts,
      SUM(CASE WHEN employee_id IS NOT NULL THEN 1 ELSE 0 END) as filled_shifts,
      SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) as scheduled_hours
    FROM shifts
    WHERE organization_id = $1
      AND date >= CURRENT_DATE
      AND date < CURRENT_DATE + INTERVAL '7 days'
    GROUP BY EXTRACT(DOW FROM date)
  `, [organizationId]);

  // Get historical averages
  const historicalAvg = await db.query(`
    SELECT 
      EXTRACT(DOW FROM date) as day_of_week,
      AVG(daily_shifts) as avg_shifts,
      AVG(daily_hours) as avg_hours
    FROM (
      SELECT 
        date,
        COUNT(*) as daily_shifts,
        SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) as daily_hours
      FROM shifts
      WHERE organization_id = $1
        AND date >= CURRENT_DATE - INTERVAL '8 weeks'
        AND date < CURRENT_DATE
      GROUP BY date
    ) daily
    GROUP BY EXTRACT(DOW FROM date)
  `, [organizationId]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const recommendations = [];

  // Build lookup maps
  const currentMap = {};
  currentWeekShifts.rows.forEach(r => {
    currentMap[parseInt(r.day_of_week)] = r;
  });

  const histMap = {};
  historicalAvg.rows.forEach(r => {
    histMap[parseInt(r.day_of_week)] = r;
  });

  // Generate recommendations
  for (let dow = 0; dow < 7; dow++) {
    const current = currentMap[dow];
    const hist = histMap[dow];

    if (!hist) continue;

    const avgShifts = parseFloat(hist.avg_shifts) || 0;
    const scheduledShifts = current ? parseInt(current.scheduled_shifts) : 0;
    const filledShifts = current ? parseInt(current.filled_shifts) : 0;

    // Understaffed recommendation
    if (scheduledShifts < avgShifts * 0.8) {
      recommendations.push({
        type: 'understaffed',
        severity: scheduledShifts < avgShifts * 0.5 ? 'high' : 'medium',
        dayOfWeek: dow,
        dayName: dayNames[dow],
        message: `${dayNames[dow]} is ${Math.round((1 - scheduledShifts/avgShifts) * 100)}% below typical staffing`,
        action: `Add ${Math.ceil(avgShifts - scheduledShifts)} more shifts`,
        impact: 'May affect service levels and existing staff workload'
      });
    }

    // Overstaffed recommendation
    if (scheduledShifts > avgShifts * 1.3) {
      recommendations.push({
        type: 'overstaffed',
        severity: 'low',
        dayOfWeek: dow,
        dayName: dayNames[dow],
        message: `${dayNames[dow]} is ${Math.round((scheduledShifts/avgShifts - 1) * 100)}% above typical staffing`,
        action: `Consider reducing by ${Math.floor(scheduledShifts - avgShifts)} shifts`,
        impact: `Potential labour cost savings of £${Math.floor((scheduledShifts - avgShifts) * 8 * 12)}`
      });
    }

    // Unfilled shifts recommendation
    if (current && filledShifts < scheduledShifts * 0.7) {
      recommendations.push({
        type: 'unfilled',
        severity: filledShifts < scheduledShifts * 0.5 ? 'high' : 'medium',
        dayOfWeek: dow,
        dayName: dayNames[dow],
        message: `${scheduledShifts - filledShifts} shifts unfilled for ${dayNames[dow]}`,
        action: 'Post to shift marketplace or contact available workers',
        impact: 'Risk of understaffing if not addressed'
      });
    }
  }

  // Get workers approaching overtime
  const overtimeRisk = await db.query(`
    SELECT 
      e.id, e.first_name, e.last_name,
      COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600), 0) as scheduled_hours
    FROM employees e
    LEFT JOIN shifts s ON s.employee_id = e.id 
      AND s.date >= CURRENT_DATE 
      AND s.date < CURRENT_DATE + INTERVAL '7 days'
    WHERE e.organization_id = $1 AND e.status = 'active'
    GROUP BY e.id, e.first_name, e.last_name
    HAVING COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600), 0) > 35
    ORDER BY scheduled_hours DESC
    LIMIT 5
  `, [organizationId]);

  overtimeRisk.rows.forEach(worker => {
    if (parseFloat(worker.scheduled_hours) > 40) {
      recommendations.push({
        type: 'overtime',
        severity: 'medium',
        employee: `${worker.first_name} ${worker.last_name}`,
        message: `${worker.first_name} has ${Math.round(worker.scheduled_hours)}h scheduled (overtime)`,
        action: 'Reassign some shifts to avoid overtime costs',
        impact: `Potential overtime premium of £${Math.round((worker.scheduled_hours - 40) * 12 * 1.5)}`
      });
    }
  });

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  res.json({
    recommendations,
    summary: {
      total: recommendations.length,
      high: recommendations.filter(r => r.severity === 'high').length,
      medium: recommendations.filter(r => r.severity === 'medium').length,
      low: recommendations.filter(r => r.severity === 'low').length
    },
    generatedAt: new Date().toISOString()
  });
});

export default router;
