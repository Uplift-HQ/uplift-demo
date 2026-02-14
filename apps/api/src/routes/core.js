// ============================================================
// CORE API ROUTES
// Employees, Locations, Departments, Roles, Shifts
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole, validate } from '../middleware/index.js';
import { z } from 'zod';
import * as billingService from '../services/billing.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// EMPLOYEES
// ============================================================

// Get current user's employee record
router.get('/employees/me', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    // Find employee linked to current user
    const result = await db.query(`
      SELECT e.*, 
             d.name as department_name,
             r.name as role_name,
             l.name as location_name,
             m.first_name || ' ' || m.last_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN roles r ON r.id = e.primary_role_id
      LEFT JOIN locations l ON l.id = e.primary_location_id
      LEFT JOIN employees m ON m.id = e.manager_id
      WHERE e.user_id = $1 AND e.organization_id = $2
    `, [userId, organizationId]);

    if (!result.rows[0]) {
      // Check if user exists but has no employee record
      const userResult = await db.query(
        `SELECT id, first_name, last_name, email FROM users WHERE id = $1`,
        [userId]
      );
      
      if (userResult.rows[0]) {
        // Return basic user info if no employee record
        return res.json({ 
          employee: null,
          user: userResult.rows[0],
          message: 'No employee record linked to this user'
        });
      }
      
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ employee: result.rows[0] });
  } catch (error) {
    console.error('Get my employee record error:', error);
    res.status(500).json({ error: 'Failed to get employee record' });
  }
});

// List employees
router.get('/employees', async (req, res) => {
  const { organizationId } = req.user;
  const { 
    status = 'active', 
    locationId, 
    departmentId, 
    search,
    limit = 50, 
    offset = 0 
  } = req.query;

  let query = `
    SELECT e.*, 
           d.name as department_name,
           r.name as role_name,
           l.name as location_name,
           m.first_name || ' ' || m.last_name as manager_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN roles r ON r.id = e.primary_role_id
    LEFT JOIN locations l ON l.id = e.primary_location_id
    LEFT JOIN employees m ON m.id = e.manager_id
    WHERE e.organization_id = $1
  `;
  
  const params = [organizationId];
  let paramIndex = 2;

  if (status && status !== 'all') {
    query += ` AND e.status = $${paramIndex++}`;
    params.push(status);
  }

  if (locationId) {
    query += ` AND (e.primary_location_id = $${paramIndex} OR $${paramIndex} = ANY(e.location_ids))`;
    params.push(locationId);
    paramIndex++;
  }

  if (departmentId) {
    query += ` AND e.department_id = $${paramIndex++}`;
    params.push(departmentId);
  }

  if (search) {
    query += ` AND (
      e.first_name ILIKE $${paramIndex} OR 
      e.last_name ILIKE $${paramIndex} OR 
      e.email ILIKE $${paramIndex} OR
      e.employee_number ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` ORDER BY e.last_name, e.first_name LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await db.query(query, params);
  
  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM employees WHERE organization_id = $1 AND status = $2`,
    [organizationId, status]
  );

  res.json({
    employees: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

// Get single employee
router.get('/employees/:id', async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  const result = await db.query(
    `SELECT e.*, 
            d.name as department_name,
            r.name as role_name,
            l.name as location_name,
            m.first_name || ' ' || m.last_name as manager_name,
            u.id as user_id, u.role as user_role
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN roles r ON r.id = e.primary_role_id
     LEFT JOIN locations l ON l.id = e.primary_location_id
     LEFT JOIN employees m ON m.id = e.manager_id
     LEFT JOIN users u ON u.employee_id = e.id
     WHERE e.id = $1 AND e.organization_id = $2`,
    [id, organizationId]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  // Get skills
  const skills = await db.query(
    `SELECT es.*, s.name, s.category 
     FROM employee_skills es
     JOIN skills s ON s.id = es.skill_id
     WHERE es.employee_id = $1`,
    [id]
  );

  res.json({
    employee: result.rows[0],
    skills: skills.rows,
  });
});

// Create employee
const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  employeeNumber: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'casual', 'contractor']).default('full_time'),
  startDate: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  primaryRoleId: z.string().uuid().optional(),
  primaryLocationId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  hourlyRate: z.number().optional(),
  contractedHoursPerWeek: z.number().optional(),
});

router.post('/employees', requireRole(['admin', 'manager']), validate(createEmployeeSchema), async (req, res) => {
  const { organizationId, userId } = req.user;
  const data = req.body;

  try {
    // Check seat availability before creating employee
    const seatCheck = await billingService.enforceSeatLimit(organizationId);

    const result = await db.query(
      `INSERT INTO employees (
        organization_id, first_name, last_name, email, phone, employee_number,
        employment_type, start_date, department_id, primary_role_id,
        primary_location_id, manager_id, hourly_rate, contracted_hours_per_week,
        seat_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active')
      RETURNING *`,
      [
        organizationId, data.firstName, data.lastName, data.email, data.phone,
        data.employeeNumber, data.employmentType, data.startDate,
        data.departmentId, data.primaryRoleId, data.primaryLocationId,
        data.managerId, data.hourlyRate, data.contractedHoursPerWeek,
        seatCheck.seatType // 'core' or 'flex'
      ]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_log (organization_id, user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, $2, 'create', 'employee', $3, $4)`,
      [organizationId, userId, result.rows[0].id, JSON.stringify({ ...data, seatType: seatCheck.seatType })]
    );

    res.status(201).json({ employee: result.rows[0], seatType: seatCheck.seatType });
  } catch (error) {
    if (error.code === 'SEAT_LIMIT_EXCEEDED') {
      return res.status(403).json({ error: error.message });
    }
    throw error;
  }
});

// Update employee
router.patch('/employees/:id', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { id } = req.params;
  const updates = req.body;

  // Build dynamic update query
  const fields = [
    'first_name', 'last_name', 'preferred_name', 'email', 'phone', 'avatar_url',
    'date_of_birth', 'address_line1', 'city', 'postcode', 'country',
    'employee_number', 'employment_type', 'start_date', 'end_date',
    'department_id', 'primary_role_id', 'primary_location_id', 'manager_id',
    'location_ids', 'role_ids', 'hourly_rate', 'contracted_hours_per_week',
    'availability', 'emergency_contact_name', 'emergency_contact_phone',
    'status', 'custom_fields'
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
    `UPDATE employees SET ${setClauses.join(', ')}
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json({ employee: result.rows[0] });
});

// Delete/deactivate employee
router.delete('/employees/:id', requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  // Soft delete - set status to terminated
  await db.query(
    `UPDATE employees SET status = 'terminated', end_date = CURRENT_DATE
     WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  res.json({ success: true });
});

// ============================================================
// LOCATIONS
// ============================================================

router.get('/locations', async (req, res) => {
  const { organizationId } = req.user;
  const { status = 'active' } = req.query;

  const result = await db.query(
    `SELECT l.*, 
            (SELECT COUNT(*) FROM employees e WHERE e.primary_location_id = l.id AND e.status = 'active') as employee_count
     FROM locations l
     WHERE l.organization_id = $1 AND ($2 = 'all' OR l.status = $2)
     ORDER BY l.name`,
    [organizationId, status]
  );

  res.json({ locations: result.rows });
});

router.get('/locations/:id', async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  const result = await db.query(
    `SELECT * FROM locations WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Location not found' });
  }

  res.json({ location: result.rows[0] });
});

const createLocationSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  type: z.enum(['store', 'warehouse', 'office', 'remote']).default('store'),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().length(2).default('GB'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  geofenceRadius: z.number().default(100),
  timezone: z.string().optional(),
  phone: z.string().optional(),
  operatingHours: z.record(z.any()).optional(),
});

router.post('/locations', requireRole(['admin']), validate(createLocationSchema), async (req, res) => {
  const { organizationId } = req.user;
  const data = req.body;

  const result = await db.query(
    `INSERT INTO locations (
      organization_id, name, code, type, address_line1, address_line2,
      city, state, postcode, country, latitude, longitude, geofence_radius,
      timezone, phone, operating_hours
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      organizationId, data.name, data.code, data.type, data.addressLine1,
      data.addressLine2, data.city, data.state, data.postcode, data.country,
      data.latitude, data.longitude, data.geofenceRadius, data.timezone,
      data.phone, JSON.stringify(data.operatingHours)
    ]
  );

  res.status(201).json({ location: result.rows[0] });
});

router.patch('/locations/:id', requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const updates = req.body;

  const fields = [
    'name', 'code', 'type', 'address_line1', 'address_line2', 'city',
    'state', 'postcode', 'country', 'latitude', 'longitude', 'geofence_radius',
    'timezone', 'phone', 'operating_hours', 'status'
  ];

  const setClauses = [];
  const values = [id, organizationId];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(updates)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (fields.includes(snakeKey)) {
      setClauses.push(`${snakeKey} = $${paramIndex++}`);
      values.push(snakeKey === 'operating_hours' ? JSON.stringify(value) : value);
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const result = await db.query(
    `UPDATE locations SET ${setClauses.join(', ')}
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    values
  );

  res.json({ location: result.rows[0] });
});

// ============================================================
// DEPARTMENTS
// ============================================================

router.get('/departments', async (req, res) => {
  const { organizationId } = req.user;

  const result = await db.query(
    `SELECT d.*, 
            m.first_name || ' ' || m.last_name as manager_name,
            (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'active') as employee_count
     FROM departments d
     LEFT JOIN employees m ON m.id = d.manager_id
     WHERE d.organization_id = $1
     ORDER BY d.name`,
    [organizationId]
  );

  res.json({ departments: result.rows });
});

router.post('/departments', requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { name, code, parentId, managerId, color } = req.body;

  const result = await db.query(
    `INSERT INTO departments (organization_id, name, code, parent_id, manager_id, color)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [organizationId, name, code, parentId, managerId, color]
  );

  res.status(201).json({ department: result.rows[0] });
});

router.patch('/departments/:id', requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const { name, code, parentId, managerId, color } = req.body;

  const result = await db.query(
    `UPDATE departments SET name = COALESCE($3, name), code = COALESCE($4, code),
     parent_id = COALESCE($5, parent_id), manager_id = COALESCE($6, manager_id),
     color = COALESCE($7, color)
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, name, code, parentId, managerId, color]
  );

  res.json({ department: result.rows[0] });
});

// ============================================================
// ROLES
// ============================================================

router.get('/roles', async (req, res) => {
  const { organizationId } = req.user;

  const result = await db.query(
    `SELECT r.*, d.name as department_name,
            (SELECT COUNT(*) FROM employees e WHERE e.primary_role_id = r.id AND e.status = 'active') as employee_count
     FROM roles r
     LEFT JOIN departments d ON d.id = r.department_id
     WHERE r.organization_id = $1
     ORDER BY r.name`,
    [organizationId]
  );

  res.json({ roles: result.rows });
});

router.post('/roles', requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { name, code, departmentId, defaultHourlyRate, color } = req.body;

  const result = await db.query(
    `INSERT INTO roles (organization_id, name, code, department_id, default_hourly_rate, color)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [organizationId, name, code, departmentId, defaultHourlyRate, color]
  );

  res.status(201).json({ role: result.rows[0] });
});

// Update role
router.patch('/roles/:id', requireRole(['admin']), async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const { name, code, departmentId, defaultHourlyRate, color } = req.body;

  const result = await db.query(
    `UPDATE roles SET
       name = COALESCE($3, name),
       code = COALESCE($4, code),
       department_id = COALESCE($5, department_id),
       default_hourly_rate = COALESCE($6, default_hourly_rate),
       color = COALESCE($7, color),
       updated_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, organizationId, name, code, departmentId, defaultHourlyRate, color]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Role not found' });
  }

  res.json({ role: result.rows[0] });
});

// ============================================================
// SKILLS
// ============================================================

router.get('/skills', async (req, res) => {
  const { organizationId } = req.user;

  const result = await db.query(
    `SELECT s.*,
            (SELECT COUNT(*) FROM employee_skills es WHERE es.skill_id = s.id) as employee_count,
            (SELECT COUNT(*) FROM employee_skills es WHERE es.skill_id = s.id AND es.verified = true) as verified_count
     FROM skills s
     WHERE s.organization_id = $1
     ORDER BY s.category, s.name`,
    [organizationId]
  );

  res.json({ skills: result.rows });
});

router.post('/skills', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { name, category, requiresVerification, expiresAfterDays } = req.body;

  const result = await db.query(
    `INSERT INTO skills (organization_id, name, category, requires_verification, expires_after_days)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [organizationId, name, category, requiresVerification, expiresAfterDays]
  );

  res.status(201).json({ skill: result.rows[0] });
});

// Add skill to employee
router.post('/employees/:employeeId/skills', requireRole(['admin', 'manager']), async (req, res) => {
  const { userId } = req.user;
  const { employeeId } = req.params;
  const { skillId, level, verified } = req.body;

  const result = await db.query(
    `INSERT INTO employee_skills (employee_id, skill_id, level, verified, verified_by, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (employee_id, skill_id) DO UPDATE SET
       level = EXCLUDED.level,
       verified = EXCLUDED.verified,
       verified_by = EXCLUDED.verified_by,
       verified_at = EXCLUDED.verified_at
     RETURNING *`,
    [employeeId, skillId, level || 1, verified || false, verified ? userId : null, verified ? new Date() : null]
  );

  res.json({ employeeSkill: result.rows[0] });
});

// Verify skill
router.post('/employees/:employeeId/skills/:skillId/verify', requireRole(['admin', 'manager']), async (req, res) => {
  const { userId } = req.user;
  const { employeeId, skillId } = req.params;

  const result = await db.query(
    `UPDATE employee_skills SET verified = TRUE, verified_by = $3, verified_at = NOW()
     WHERE employee_id = $1 AND skill_id = $2
     RETURNING *`,
    [employeeId, skillId, userId]
  );

  res.json({ employeeSkill: result.rows[0] });
});

// ============================================================
// FEATURE FLAGS
// ============================================================

// Get organization's feature flags (combines plan features + overrides)
router.get('/features', async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Get plan features from subscription
    const planResult = await db.query(`
      SELECT p.features, p.slug as plan_slug
      FROM subscriptions s
      JOIN plans p ON p.slug = s.plan_slug
      WHERE s.organization_id = $1 AND s.status IN ('active', 'trialing')
    `, [organizationId]);

    const planFeatures = planResult.rows[0]?.features || [];

    // Get feature overrides (enabled/disabled by ops team)
    const overrideResult = await db.query(`
      SELECT feature_key, enabled
      FROM feature_overrides
      WHERE organization_id = $1
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [organizationId]);

    // Build final feature map
    const features = {};

    // Start with plan features (all enabled)
    for (const feature of planFeatures) {
      features[feature] = true;
    }

    // Apply overrides
    for (const override of overrideResult.rows) {
      features[override.feature_key] = override.enabled;
    }

    res.json({ features });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load features' });
  }
});

export default router;
