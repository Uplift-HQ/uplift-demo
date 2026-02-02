// ============================================================
// UPLIFT DEMO API - COMPLETE (ALL FIXES)
// ============================================================

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const db = {
  query: (text, params) => pool.query(text, params),
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret-2026';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await db.query(
      `SELECT u.*, o.name as organization_name FROM users u JOIN organizations o ON o.id = u.organization_id WHERE u.id = $1`,
      [decoded.userId]
    );
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = {
      userId: result.rows[0].id,
      email: result.rows[0].email,
      role: result.rows[0].role,
      firstName: result.rows[0].first_name,
      lastName: result.rows[0].last_name,
      organizationId: result.rows[0].organization_id,
      organizationName: result.rows[0].organization_name,
    };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Health
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
// Map demo email aliases — website shows @uplifthq.co.uk but DB has @uplift.hr
const DEMO_EMAIL_ALIASES = {
  'demo-admin@uplifthq.co.uk': 'demo-admin@uplift.hr',
  'demo-manager@uplifthq.co.uk': 'demo-manager@uplift.hr',
  'demo-worker@uplifthq.co.uk': 'demo-worker@uplift.hr',
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const normalizedEmail = DEMO_EMAIL_ALIASES[email.toLowerCase()] || email.toLowerCase();
    const result = await db.query(
      `SELECT u.*, o.name as organization_name FROM users u JOIN organizations o ON o.id = u.organization_id WHERE u.email = $1`,
      [normalizedEmail]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const pwCheck = await db.query(
      `SELECT (password_hash = crypt($1, password_hash)) as valid FROM users WHERE id = $2`,
      [password, user.id]
    );
    if (!pwCheck.rows[0]?.valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, organizationId: user.organization_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      organizationId: req.user.organizationId,
      organizationName: req.user.organizationName,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// Organization Branding (public — no auth needed for login screen)
app.get('/api/organization/branding', (req, res) => {
  res.json({
    branding: {
      brandName: 'Uplift',
      primaryColor: '#FF6B35',
      secondaryColor: '#E55A2B',
      logoUrl: null,
      logoDarkUrl: null,
    },
  });
});

// Organization
app.get('/api/organization', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM organizations WHERE id = $1`, [req.user.organizationId]);
    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to get organization' });
  }
});

app.patch('/api/organization', authMiddleware, async (req, res) => {
  try {
    const { name, timezone, currency, date_format, week_starts_on, primary_color } = req.body;
    const result = await db.query(
      `UPDATE organizations SET name = COALESCE($1, name), timezone = COALESCE($2, timezone), currency = COALESCE($3, currency), date_format = COALESCE($4, date_format), week_starts_on = COALESCE($5, week_starts_on), primary_color = COALESCE($6, primary_color), updated_at = NOW() WHERE id = $7 RETURNING *`,
      [name, timezone, currency, date_format, week_starts_on, primary_color, req.user.organizationId]
    );
    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Dashboard - FIXED: weekMetrics returns numbers not strings
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const today = new Date().toISOString().split('T')[0];
    const [employees, locations, shiftsToday, pendingTimeOff, openShifts, weekMetrics] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM employees WHERE organization_id = $1 AND status = 'active'`, [orgId]),
      db.query(`SELECT COUNT(*) FROM locations WHERE organization_id = $1 AND status = 'active'`, [orgId]),
      db.query(`SELECT COUNT(*) FROM shifts WHERE organization_id = $1 AND date = $2`, [orgId, today]),
      db.query(`SELECT COUNT(*) FROM time_off_requests WHERE organization_id = $1 AND status = 'pending'`, [orgId]),
      db.query(`SELECT COUNT(*) FROM shifts WHERE organization_id = $1 AND is_open = true AND date >= $2`, [orgId, today]),
      db.query(`
        SELECT 
          COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600), 0) as scheduled,
          COALESCE(SUM(te.total_hours), 0) as worked,
          COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600 * COALESCE(r.default_hourly_rate, 12)), 0) as cost_scheduled,
          COALESCE(SUM(te.total_hours * COALESCE(r.default_hourly_rate, 12)), 0) as cost_actual
        FROM shifts s
        LEFT JOIN time_entries te ON te.shift_id = s.id
        LEFT JOIN roles r ON r.id = s.role_id
        WHERE s.organization_id = $1 AND s.date >= date_trunc('week', CURRENT_DATE) AND s.date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
      `, [orgId]),
    ]);
    const shiftsCount = parseInt(shiftsToday.rows[0].count);
    const employeeCount = parseInt(employees.rows[0].count);
    const onShift = Math.round(shiftsCount * 0.6);

    // Generate weekly chart data
    const weeklyChart = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const base = Math.round(shiftsCount * (0.8 + Math.random() * 0.4));
      weeklyChart.push({ day: dayNames[i], scheduled: base, actual: Math.round(base * (0.85 + Math.random() * 0.15)) });
    }

    res.json({
      today: { date: today, shifts: { total: shiftsCount, filled: Math.round(shiftsCount * 0.92) } },
      activeEmployees: employeeCount,
      activeLocations: parseInt(locations.rows[0].count),
      shiftsToday: shiftsCount,
      pendingApprovals: { time_off: parseInt(pendingTimeOff.rows[0].count), timesheets: 3 },
      openShifts: parseInt(openShifts.rows[0].count),
      weekMetrics: {
        scheduled: Math.round(parseFloat(weekMetrics.rows[0].scheduled || 0)),
        worked: Math.round(parseFloat(weekMetrics.rows[0].worked || 0) || parseFloat(weekMetrics.rows[0].scheduled || 0) * 0.78),
        cost_scheduled: Math.round(parseFloat(weekMetrics.rows[0].cost_scheduled || 0)),
        cost_actual: Math.round(parseFloat(weekMetrics.rows[0].cost_actual || 0) || parseFloat(weekMetrics.rows[0].cost_scheduled || 0) * 0.78),
      },
      weeklyChart,
      realtime: {
        onShiftNow: onShift,
        onBreak: Math.round(onShift * 0.08),
        clockedIn: Math.round(onShift * 0.12),
        runningLate: 2,
        openShifts: parseInt(openShifts.rows[0].count),
      },
      complianceAlerts: [
        { id: 'ca1', type: 'expiring', severity: 'warning', title: 'Food Hygiene Certificates Expiring', employees: [{ name: 'Tom Baker' }, { name: 'Lisa Chen' }, { name: 'Mark Evans' }] },
        { id: 'ca2', type: 'training', severity: 'error', title: 'Fire Safety Training Overdue', employees: [{ name: 'James Wilson' }, { name: 'Amy Taylor' }] },
        { id: 'ca3', type: 'document', severity: 'warning', title: 'Right to Work Documents Due', employees: [{ name: 'Priya Sharma' }] },
      ],
      activityFeed: [
        { id: 'af1', type: 'clock_in', user: 'Priya Sharma', message: 'Clocked in for Morning Shift', time: '2 min ago' },
        { id: 'af2', type: 'shift_swap', user: 'James Morrison', message: 'Approved shift swap request', time: '15 min ago' },
        { id: 'af3', type: 'time_off', user: 'Emily Watson', message: 'Requested 3 days annual leave', time: '1 hour ago' },
        { id: 'af4', type: 'badge', user: 'Tom Baker', message: 'Earned "Reliability Champion" badge', time: '2 hours ago' },
        { id: 'af5', type: 'clock_out', user: 'Lisa Chen', message: 'Completed Night Shift', time: '3 hours ago' },
      ],
      recentRecognitions: [
        { id: 'rr1', from: 'James Morrison', to: 'Priya Sharma', message: 'Outstanding guest service this week!', points: 50 },
        { id: 'rr2', from: 'Sarah Mitchell', to: 'Tom Baker', message: 'Great teamwork covering extra shifts', points: 30 },
      ],
      lifecycleMetrics: {
        newHires: 4,
        onProbation: 8,
        anniversaries: 3,
        attritionRisk: 2,
      },
      jobOpenings: [
        { id: 'jo1', title: 'Senior Receptionist', location: 'Grand Metropolitan Downtown', applicants: 12 },
        { id: 'jo2', title: 'Sous Chef', location: 'Harbourside Resort & Spa', applicants: 8 },
        { id: 'jo3', title: 'Night Auditor', location: 'Metropolitan Airport Hotel', applicants: 5 },
      ],
      upcomingShifts: [],
      timeOffBalance: [],
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Forecast - FIXED: Single optimized endpoint
app.get('/api/forecast', authMiddleware, async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 2;
    const result = await db.query(
      `SELECT 
        date::text,
        COUNT(*)::int as total,
        COUNT(employee_id)::int as filled,
        COUNT(*) FILTER (WHERE is_open = true)::int as open
       FROM shifts
       WHERE organization_id = $1 
         AND date >= CURRENT_DATE 
         AND date < CURRENT_DATE + ($2::int * 7)
       GROUP BY date 
       ORDER BY date`,
      [req.user.organizationId, weeks]
    );
    
    // Fill in missing dates with zeros
    const forecast = [];
    for (let i = 0; i < weeks * 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const existing = result.rows.find(r => r.date === dateStr);
      forecast.push({
        date: dateStr,
        shifts: existing ? existing.total : 0,
        filled: existing ? existing.filled : 0,
        open: existing ? existing.open : 0
      });
    }
    res.json({ forecast });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to get forecast' });
  }
});

// Pending Time Entries
app.get('/api/time/pending', authMiddleware, async (req, res) => {
  try {
    const { locationId } = req.query;
    let query = `
      SELECT te.*, e.first_name, e.last_name, l.name as location_name
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      LEFT JOIN locations l ON l.id = te.location_id
      WHERE te.organization_id = $1 AND te.status = 'pending'
    `;
    const params = [req.user.organizationId];
    if (locationId && locationId !== 'undefined') {
      query += ` AND te.location_id = $2`;
      params.push(locationId);
    }
    query += ` ORDER BY te.clock_in DESC LIMIT 50`;
    const result = await db.query(query, params);
    res.json({ entries: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Get pending time error:', error);
    res.status(500).json({ error: 'Failed to get pending time entries' });
  }
});

// Employees by Skill
app.get('/api/skills/:id/employees', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.id, e.first_name, e.last_name, e.email, es.level
      FROM employee_skills es
      JOIN employees e ON e.id = es.employee_id
      WHERE es.skill_id = $1 AND e.organization_id = $2 AND e.status = 'active'
      ORDER BY es.level DESC, e.last_name
    `, [req.params.id, req.user.organizationId]);
    res.json({ employees: result.rows });
  } catch (error) {
    console.error('Get skill employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

// Employees
app.get('/api/employees', authMiddleware, async (req, res) => {
  try {
    const { location, department, status, search, limit = 100, offset = 0 } = req.query;
    let query = `
      SELECT e.*, l.name as location_name, d.name as department_name, r.name as role_name, r.default_hourly_rate as hourly_rate
      FROM employees e
      LEFT JOIN locations l ON l.id = e.primary_location_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN roles r ON r.id = e.primary_role_id
      WHERE e.organization_id = $1
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;
    if (location && location !== 'undefined') {
      query += ` AND e.primary_location_id = $${paramIndex++}`;
      params.push(location);
    }
    if (department && department !== 'undefined') {
      query += ` AND e.department_id = $${paramIndex++}`;
      params.push(department);
    }
    if (status && status !== 'undefined') {
      query += ` AND e.status = $${paramIndex++}`;
      params.push(status);
    }
    if (search) {
      query += ` AND (e.first_name ILIKE $${paramIndex} OR e.last_name ILIKE $${paramIndex} OR e.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    query += ` ORDER BY e.last_name, e.first_name LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, params);
    const countResult = await db.query(`SELECT COUNT(*) FROM employees WHERE organization_id = $1`, [req.user.organizationId]);
    res.json({ employees: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

app.get('/api/employees/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, l.name as location_name, d.name as department_name, r.name as role_name, r.default_hourly_rate as hourly_rate
       FROM employees e
       LEFT JOIN locations l ON l.id = e.primary_location_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN roles r ON r.id = e.primary_role_id
       WHERE e.id = $1 AND e.organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const skills = await db.query(
      `SELECT s.*, es.proficiency, es.verified FROM employee_skills es JOIN skills s ON s.id = es.skill_id WHERE es.employee_id = $1`,
      [req.params.id]
    );
    res.json({ employee: { ...result.rows[0], skills: skills.rows } });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Failed to get employee' });
  }
});

app.post('/api/employees', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, locationId, departmentId, roleId, employmentType } = req.body;
    const result = await db.query(
      `INSERT INTO employees (organization_id, first_name, last_name, email, phone, primary_location_id, department_id, primary_role_id, employment_type, status, start_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', CURRENT_DATE) RETURNING *`,
      [req.user.organizationId, firstName, lastName, email, phone, locationId, departmentId, roleId, employmentType || 'full-time']
    );
    res.status(201).json({ employee: result.rows[0] });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

app.patch('/api/employees/:id', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, locationId, departmentId, roleId, employmentType, status } = req.body;
    const result = await db.query(
      `UPDATE employees SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), email = COALESCE($3, email), phone = COALESCE($4, phone), primary_location_id = COALESCE($5, primary_location_id), department_id = COALESCE($6, department_id), primary_role_id = COALESCE($7, primary_role_id), employment_type = COALESCE($8, employment_type), status = COALESCE($9, status), updated_at = NOW() WHERE id = $10 AND organization_id = $11 RETURNING *`,
      [firstName, lastName, email, phone, locationId, departmentId, roleId, employmentType, status, req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ employee: result.rows[0] });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Locations
app.get('/api/locations', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, (SELECT COUNT(*) FROM employees e WHERE e.primary_location_id = l.id AND e.status = 'active') as employee_count
       FROM locations l WHERE l.organization_id = $1 ORDER BY l.name`,
      [req.user.organizationId]
    );
    res.json({ locations: result.rows });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

app.get('/api/locations/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM locations WHERE id = $1 AND organization_id = $2`, [req.params.id, req.user.organizationId]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json({ location: result.rows[0] });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

app.post('/api/locations', authMiddleware, async (req, res) => {
  try {
    const { name, code, type, addressLine1, city, postcode, country, timezone } = req.body;
    const result = await db.query(
      `INSERT INTO locations (organization_id, name, code, type, address_line1, city, postcode, country, timezone, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active') RETURNING *`,
      [req.user.organizationId, name, code, type || 'office', addressLine1, city, postcode, country || 'GB', timezone || 'Europe/London']
    );
    res.status(201).json({ location: result.rows[0] });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Departments
app.get('/api/departments', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT d.*, (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'active') as employee_count
       FROM departments d WHERE d.organization_id = $1 ORDER BY d.name`,
      [req.user.organizationId]
    );
    res.json({ departments: result.rows });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

app.post('/api/departments', authMiddleware, async (req, res) => {
  try {
    const { name, code } = req.body;
    const result = await db.query(`INSERT INTO departments (organization_id, name, code) VALUES ($1, $2, $3) RETURNING *`, [req.user.organizationId, name, code]);
    res.status(201).json({ department: result.rows[0] });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Roles
app.get('/api/roles', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM roles WHERE organization_id = $1 ORDER BY name`, [req.user.organizationId]);
    res.json({ roles: result.rows });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

app.post('/api/roles', authMiddleware, async (req, res) => {
  try {
    const { name, hourlyRate } = req.body;
    const result = await db.query(`INSERT INTO roles (organization_id, name, default_hourly_rate) VALUES ($1, $2, $3) RETURNING *`, [req.user.organizationId, name, hourlyRate]);
    res.status(201).json({ role: result.rows[0] });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Skills
app.get('/api/skills', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, (SELECT COUNT(*) FROM employee_skills es WHERE es.skill_id = s.id) as employee_count
       FROM skills s WHERE s.organization_id = $1 ORDER BY s.category, s.name`,
      [req.user.organizationId]
    );
    res.json({ skills: result.rows });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

app.post('/api/skills', authMiddleware, async (req, res) => {
  try {
    const { name, category } = req.body;
    const result = await db.query(`INSERT INTO skills (organization_id, name, category) VALUES ($1, $2, $3) RETURNING *`, [req.user.organizationId, name, category || 'technical']);
    res.status(201).json({ skill: result.rows[0] });
  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

// Shifts
app.get('/api/shifts', authMiddleware, async (req, res) => {
  try {
    const { start, end, location, employee } = req.query;
    let query = `
      SELECT s.*, e.first_name as employee_first_name, e.last_name as employee_last_name, l.name as location_name, r.name as role_name
      FROM shifts s
      LEFT JOIN employees e ON e.id = s.employee_id
      LEFT JOIN locations l ON l.id = s.location_id
      LEFT JOIN roles r ON r.id = s.role_id
      WHERE s.organization_id = $1
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;
    if (start) {
      query += ` AND s.date >= $${paramIndex++}`;
      params.push(start);
    }
    if (end) {
      query += ` AND s.date <= $${paramIndex++}`;
      params.push(end);
    }
    if (location && location !== 'undefined' && location !== 'null') {
      query += ` AND s.location_id = $${paramIndex++}`;
      params.push(location);
    }
    if (employee && employee !== 'undefined' && employee !== 'null') {
      query += ` AND s.employee_id = $${paramIndex++}`;
      params.push(employee);
    }
    query += ` ORDER BY s.date, s.start_time LIMIT 500`;
    const result = await db.query(query, params);
    res.json({ shifts: result.rows });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Failed to get shifts' });
  }
});

app.post('/api/shifts', authMiddleware, async (req, res) => {
  try {
    const { employeeId, locationId, roleId, date, startTime, endTime } = req.body;
    const result = await db.query(
      `INSERT INTO shifts (organization_id, employee_id, location_id, role_id, date, start_time, end_time, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled') RETURNING *`,
      [req.user.organizationId, employeeId, locationId, roleId, date, startTime, endTime]
    );
    res.status(201).json({ shift: result.rows[0] });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

app.patch('/api/shifts/:id', authMiddleware, async (req, res) => {
  try {
    const { employeeId, date, startTime, endTime, status } = req.body;
    const result = await db.query(
      `UPDATE shifts SET employee_id = COALESCE($1, employee_id), date = COALESCE($2, date), start_time = COALESCE($3, start_time), end_time = COALESCE($4, end_time), status = COALESCE($5, status), updated_at = NOW() WHERE id = $6 AND organization_id = $7 RETURNING *`,
      [employeeId, date, startTime, endTime, status, req.params.id, req.user.organizationId]
    );
    res.json({ shift: result.rows[0] });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

app.delete('/api/shifts/:id', authMiddleware, async (req, res) => {
  try {
    await db.query(`DELETE FROM shifts WHERE id = $1 AND organization_id = $2`, [req.params.id, req.user.organizationId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

// Open Shifts
app.get('/api/open-shifts', authMiddleware, async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = `
      SELECT s.*, l.name as location_name, r.name as role_name
      FROM shifts s
      LEFT JOIN locations l ON l.id = s.location_id
      LEFT JOIN roles r ON r.id = s.role_id
      WHERE s.organization_id = $1 AND s.is_open = true
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;
    if (start) {
      query += ` AND s.date >= $${paramIndex++}`;
      params.push(start);
    }
    if (end) {
      query += ` AND s.date <= $${paramIndex++}`;
      params.push(end);
    }
    query += ` ORDER BY s.date, s.start_time LIMIT 100`;
    const result = await db.query(query, params);
    res.json({ shifts: result.rows });
  } catch (error) {
    console.error('Get open shifts error:', error);
    res.status(500).json({ error: 'Failed to get open shifts' });
  }
});

// Shift Templates
app.get('/api/shift-templates', authMiddleware, (req, res) => {
  res.json({ templates: [] });
});

// Shift Swaps
app.get('/api/shift-swaps', authMiddleware, (req, res) => {
  res.json({ swaps: [] });
});

app.post('/api/shift-swaps', authMiddleware, (req, res) => {
  res.status(201).json({ swap: { id: 'demo', status: 'pending' } });
});

// Time Off
app.get('/api/time-off/policies', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM time_off_policies WHERE organization_id = $1 ORDER BY name`, [req.user.organizationId]);
    res.json({ policies: result.rows });
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Failed to get policies' });
  }
});

app.get('/api/time-off/requests', authMiddleware, async (req, res) => {
  try {
    const { status, employee } = req.query;
    let query = `
      SELECT tor.*, e.first_name as employee_first_name, e.last_name as employee_last_name, p.name as policy_name
      FROM time_off_requests tor
      JOIN employees e ON e.id = tor.employee_id
      LEFT JOIN time_off_policies p ON p.id = tor.policy_id
      WHERE tor.organization_id = $1
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;
    if (status && status !== 'undefined') {
      query += ` AND tor.status = $${paramIndex++}`;
      params.push(status);
    }
    if (employee && employee !== 'undefined') {
      query += ` AND tor.employee_id = $${paramIndex++}`;
      params.push(employee);
    }
    query += ` ORDER BY tor.start_date DESC`;
    const result = await db.query(query, params);
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get time off requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

app.post('/api/time-off/requests/:id/approve', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE time_off_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2 AND organization_id = $3 RETURNING *`,
      [req.user.userId, req.params.id, req.user.organizationId]
    );
    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

app.post('/api/time-off/requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { notes } = req.body;
    const result = await db.query(
      `UPDATE time_off_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2 WHERE id = $3 AND organization_id = $4 RETURNING *`,
      [req.user.userId, notes, req.params.id, req.user.organizationId]
    );
    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Time Tracking
app.get('/api/time/entries', authMiddleware, async (req, res) => {
  try {
    const { start, end, employee, status } = req.query;
    let query = `
      SELECT te.*, e.first_name as employee_first_name, e.last_name as employee_last_name
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      WHERE te.organization_id = $1
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;
    if (start) {
      query += ` AND te.clock_in >= $${paramIndex++}`;
      params.push(start);
    }
    if (end) {
      query += ` AND te.clock_in <= $${paramIndex++}`;
      params.push(end);
    }
    if (employee && employee !== 'undefined') {
      query += ` AND te.employee_id = $${paramIndex++}`;
      params.push(employee);
    }
    if (status && status !== 'undefined') {
      query += ` AND te.status = $${paramIndex++}`;
      params.push(status);
    }
    query += ` ORDER BY te.clock_in DESC LIMIT 500`;
    const result = await db.query(query, params);
    res.json({ entries: result.rows });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ error: 'Failed to get entries' });
  }
});

// Jobs
app.get('/api/jobs', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT jp.*, l.name as location_name, d.name as department_name
      FROM job_postings jp
      LEFT JOIN locations l ON l.id = jp.location_id
      LEFT JOIN departments d ON d.id = jp.department_id
      WHERE jp.organization_id = $1
    `;
    const params = [req.user.organizationId];
    if (status && status !== 'undefined') {
      query += ` AND jp.status = $2`;
      params.push(status);
    }
    query += ` ORDER BY jp.posted_at DESC`;
    const result = await db.query(query, params);
    res.json({ jobs: result.rows });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

app.get('/api/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT jp.*, l.name as location_name, d.name as department_name
       FROM job_postings jp
       LEFT JOIN locations l ON l.id = jp.location_id
       LEFT JOIN departments d ON d.id = jp.department_id
       WHERE jp.id = $1 AND jp.organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ job: result.rows[0] });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// Users
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, status, last_login_at, created_at FROM users WHERE organization_id = $1 ORDER BY last_name, first_name`,
      [req.user.organizationId]
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.patch('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const result = await db.query(
      `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $4 RETURNING id, email, first_name, last_name, phone, role`,
      [firstName, lastName, phone, req.user.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Notifications
app.get('/api/notifications', authMiddleware, (req, res) => {
  res.json({ notifications: [], unreadCount: 0 });
});

// Integrations
app.get('/api/integrations', authMiddleware, (req, res) => {
  res.json({
    integrations: [
      { id: '1', name: 'ADP Workforce', type: 'hris', status: 'available', description: 'Sync employee data with ADP' },
      { id: '2', name: 'Workday', type: 'hris', status: 'available', description: 'Bidirectional sync with Workday HCM' },
      { id: '3', name: 'BambooHR', type: 'hris', status: 'available', description: 'Import employees from BambooHR' },
      { id: '4', name: 'SAP SuccessFactors', type: 'hris', status: 'available', description: 'Enterprise HR integration' },
      { id: '5', name: 'Slack', type: 'notification', status: 'available', description: 'Send shift notifications to Slack' },
      { id: '6', name: 'Microsoft Teams', type: 'notification', status: 'available', description: 'Teams integration for alerts' },
    ],
  });
});

app.get('/api/integrations/api-keys', authMiddleware, (req, res) => {
  res.json({
    apiKeys: [
      { id: '1', name: 'Production Key', prefix: 'uplift_live_', created_at: '2025-01-01', last_used: '2025-01-20' },
      { id: '2', name: 'Development Key', prefix: 'uplift_test_', created_at: '2025-01-15', last_used: null },
    ],
  });
});

// Reports
app.get('/api/reports/hours', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await db.query(
      `SELECT e.id as employee_id, e.first_name, e.last_name, l.name as location_name,
              COUNT(te.id) as entry_count, COALESCE(SUM(te.total_hours), 0) as total_hours,
              COALESCE(SUM(te.regular_hours), 0) as regular_hours, COALESCE(SUM(te.overtime_hours), 0) as overtime_hours
       FROM employees e
       LEFT JOIN locations l ON l.id = e.primary_location_id
       LEFT JOIN time_entries te ON te.employee_id = e.id 
         AND te.clock_in >= COALESCE($2::date, CURRENT_DATE - INTERVAL '30 days')
         AND te.clock_in <= COALESCE($3::date, CURRENT_DATE) + INTERVAL '1 day'
       WHERE e.organization_id = $1 AND e.status = 'active'
       GROUP BY e.id, e.first_name, e.last_name, l.name
       HAVING COUNT(te.id) > 0
       ORDER BY total_hours DESC LIMIT 50`,
      [req.user.organizationId, startDate, endDate]
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Get hours report error:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   UPLIFT DEMO API                          ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                          ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
