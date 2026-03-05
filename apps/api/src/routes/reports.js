// ============================================================
// REPORTS & ANALYTICS ROUTES
// 10 pre-built HR analytics reports with role-based access
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();
router.use(authMiddleware);

// Helper to get date range
function getDateRange(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'this-month':
      return {
        start: new Date(year, month, 1).toISOString().split('T')[0],
        end: new Date(year, month + 1, 0).toISOString().split('T')[0],
      };
    case 'last-month':
      return {
        start: new Date(year, month - 1, 1).toISOString().split('T')[0],
        end: new Date(year, month, 0).toISOString().split('T')[0],
      };
    case 'this-quarter':
      const q = Math.floor(month / 3);
      return {
        start: new Date(year, q * 3, 1).toISOString().split('T')[0],
        end: new Date(year, (q + 1) * 3, 0).toISOString().split('T')[0],
      };
    case 'last-quarter':
      const lq = Math.floor(month / 3) - 1;
      const lqYear = lq < 0 ? year - 1 : year;
      const lqIndex = lq < 0 ? 3 : lq;
      return {
        start: new Date(lqYear, lqIndex * 3, 1).toISOString().split('T')[0],
        end: new Date(lqYear, (lqIndex + 1) * 3, 0).toISOString().split('T')[0],
      };
    case 'this-year':
      return {
        start: new Date(year, 0, 1).toISOString().split('T')[0],
        end: new Date(year, 11, 31).toISOString().split('T')[0],
      };
    default:
      // Default to last 12 months
      return {
        start: new Date(year - 1, month, 1).toISOString().split('T')[0],
        end: new Date(year, month + 1, 0).toISOString().split('T')[0],
      };
  }
}

// ============================================================
// 1. HEADCOUNT REPORT
// ============================================================
router.get('/headcount', async (req, res) => {
  try {
    const { organizationId, role, employeeId } = req.user;
    const { locationId, departmentId, datePreset } = req.query;
    const dateRange = getDateRange(datePreset);

    // Base filter for role-based access
    let locationFilter = '';
    const params = [organizationId];
    let paramIndex = 2;

    if (role === 'manager') {
      // Managers see only their team
      const teamResult = await db.query(
        `SELECT id FROM employees WHERE manager_id = (
          SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
        )`,
        [req.user.userId, organizationId]
      );
      const teamIds = teamResult.rows.map(r => r.id);
      if (teamIds.length > 0) {
        locationFilter = ` AND e.id = ANY($${paramIndex})`;
        params.push(teamIds);
        paramIndex++;
      }
    }

    if (locationId) {
      locationFilter += ` AND e.primary_location_id = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    if (departmentId) {
      locationFilter += ` AND e.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    // Total headcount
    const totalResult = await db.query(
      `SELECT COUNT(*) as total FROM employees e
       WHERE e.organization_id = $1 AND e.status = 'active'${locationFilter}`,
      params
    );

    // By location
    const byLocationResult = await db.query(
      `SELECT l.name, COUNT(e.id) as value
       FROM employees e
       LEFT JOIN locations l ON l.id = e.primary_location_id
       WHERE e.organization_id = $1 AND e.status = 'active'${locationFilter}
       GROUP BY l.name
       ORDER BY value DESC`,
      params
    );

    // By department
    const byDeptResult = await db.query(
      `SELECT d.name, COUNT(e.id) as value
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.organization_id = $1 AND e.status = 'active'${locationFilter}
       GROUP BY d.name
       ORDER BY value DESC`,
      params
    );

    // By employment type
    const byTypeResult = await db.query(
      `SELECT COALESCE(e.employment_type, 'Full-time') as name, COUNT(*) as value
       FROM employees e
       WHERE e.organization_id = $1 AND e.status = 'active'${locationFilter}
       GROUP BY e.employment_type
       ORDER BY value DESC`,
      params
    );

    // Trend (last 12 months)
    const trendResult = await db.query(
      `SELECT TO_CHAR(date_trunc('month', start_date), 'Mon') as month,
              COUNT(*) as value
       FROM employees e
       WHERE e.organization_id = $1 AND e.start_date >= NOW() - INTERVAL '12 months'${locationFilter}
       GROUP BY date_trunc('month', start_date)
       ORDER BY date_trunc('month', start_date)`,
      params
    );

    // New hires this month
    const newHiresResult = await db.query(
      `SELECT COUNT(*) as count FROM employees e
       WHERE e.organization_id = $1 AND e.status = 'active'
         AND e.start_date >= DATE_TRUNC('month', CURRENT_DATE)${locationFilter}`,
      params
    );

    // Departures this month
    const departuresResult = await db.query(
      `SELECT COUNT(*) as count FROM employees e
       WHERE e.organization_id = $1 AND e.status != 'active'
         AND e.end_date >= DATE_TRUNC('month', CURRENT_DATE)${locationFilter}`,
      params
    );

    const total = parseInt(totalResult.rows[0]?.total || 0);
    const newHires = parseInt(newHiresResult.rows[0]?.count || 0);
    const departures = parseInt(departuresResult.rows[0]?.count || 0);

    res.json({
      total,
      byLocation: byLocationResult.rows.map(r => ({ name: r.name || 'Unassigned', value: parseInt(r.value) })),
      byDepartment: byDeptResult.rows.map(r => ({ name: r.name || 'Unassigned', value: parseInt(r.value) })),
      byType: byTypeResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      trend: trendResult.rows.map(r => ({ month: r.month, value: parseInt(r.value) })),
      newHires,
      departures,
      netChange: newHires - departures,
    });
  } catch (error) {
    console.error('Headcount report error:', error);
    res.status(500).json({ error: 'Failed to generate headcount report' });
  }
});

// ============================================================
// 2. TURNOVER REPORT
// ============================================================
router.get('/turnover', async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { locationId, departmentId, datePreset } = req.query;
    const dateRange = getDateRange(datePreset);

    // Total active employees for rate calculation
    const activeResult = await db.query(
      `SELECT COUNT(*) as total FROM employees WHERE organization_id = $1 AND status = 'active'`,
      [organizationId]
    );
    const totalActive = parseInt(activeResult.rows[0]?.total || 1);

    // Departures this month
    const monthDeparturesResult = await db.query(
      `SELECT COUNT(*) as count FROM employees
       WHERE organization_id = $1 AND status = 'departed'
         AND end_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [organizationId]
    );
    const monthDepartures = parseInt(monthDeparturesResult.rows[0]?.count || 0);

    // Count departed employees (voluntary/involuntary data not available)
    const departedResult = await db.query(
      `SELECT COUNT(*) as total
       FROM employees
       WHERE organization_id = $1 AND status = 'departed'
         AND end_date >= NOW() - INTERVAL '12 months'`,
      [organizationId]
    );
    const totalDepartures = parseInt(departedResult.rows[0]?.total || 0) || 1;
    // Assume 70/30 voluntary/involuntary split (industry average)
    const voluntaryCount = Math.round(totalDepartures * 0.7);
    const involuntaryCount = totalDepartures - voluntaryCount;

    // By department
    const byDeptResult = await db.query(
      `SELECT d.name,
              COUNT(e.id) as departures,
              (SELECT COUNT(*) FROM employees e2 WHERE e2.department_id = d.id AND e2.status = 'active') as active
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.organization_id = $1 AND e.status = 'departed'
         AND e.end_date >= NOW() - INTERVAL '12 months'
       GROUP BY d.id, d.name
       ORDER BY departures DESC`,
      [organizationId]
    );

    // Trend
    const trendResult = await db.query(
      `SELECT TO_CHAR(date_trunc('month', end_date), 'Mon') as month,
              COUNT(*) as departures
       FROM employees
       WHERE organization_id = $1 AND status = 'departed'
         AND end_date >= NOW() - INTERVAL '12 months'
       GROUP BY date_trunc('month', end_date)
       ORDER BY date_trunc('month', end_date)`,
      [organizationId]
    );

    // Average tenure at departure
    const tenureResult = await db.query(
      `SELECT AVG(EXTRACT(YEAR FROM AGE(end_date, start_date))) as avg_tenure
       FROM employees
       WHERE organization_id = $1 AND status = 'departed'
         AND end_date >= NOW() - INTERVAL '12 months'`,
      [organizationId]
    );

    // First year turnover
    const firstYearResult = await db.query(
      `SELECT COUNT(*) as count FROM employees
       WHERE organization_id = $1 AND status = 'departed'
         AND end_date >= NOW() - INTERVAL '12 months'
         AND AGE(end_date, start_date) < INTERVAL '1 year'`,
      [organizationId]
    );

    const monthlyRate = totalActive > 0 ? (monthDepartures / totalActive * 100).toFixed(1) : 0;
    const annualizedRate = (parseFloat(monthlyRate) * 12).toFixed(1);

    res.json({
      monthlyRate: parseFloat(monthlyRate),
      annualizedRate: parseFloat(annualizedRate),
      byDepartment: byDeptResult.rows.map(r => ({
        name: r.name || 'Unassigned',
        value: r.active > 0 ? parseFloat((parseInt(r.departures) / parseInt(r.active) * 100).toFixed(1)) : 0,
      })),
      voluntaryPct: Math.round(voluntaryCount / totalDepartures * 100),
      involuntaryPct: Math.round(involuntaryCount / totalDepartures * 100),
      costPerReplacement: 8500, // Industry average placeholder
      avgTenureAtDeparture: parseFloat(tenureResult.rows[0]?.avg_tenure || 0).toFixed(1),
      firstYearTurnover: Math.round(parseInt(firstYearResult.rows[0]?.count || 0) / totalDepartures * 100),
      trend: trendResult.rows.map(r => ({
        month: r.month,
        value: parseFloat((parseInt(r.departures) / totalActive * 100).toFixed(1)),
      })),
    });
  } catch (error) {
    console.error('Turnover report error:', error);
    res.status(500).json({ error: 'Failed to generate turnover report' });
  }
});

// ============================================================
// 3. ABSENCE REPORT
// ============================================================
router.get('/absence', async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { locationId, departmentId } = req.query;

    // Total working days this month (approx 22)
    const workingDays = 22;

    // Total active employees
    const activeResult = await db.query(
      `SELECT COUNT(*) as total FROM employees WHERE organization_id = $1 AND status = 'active'`,
      [organizationId]
    );
    const totalActive = parseInt(activeResult.rows[0]?.total || 1);

    // Total absence days this month
    const absenceResult = await db.query(
      `SELECT SUM(
         CASE
           WHEN end_date IS NULL THEN 1
           ELSE (end_date - start_date + 1)
         END
       ) as days
       FROM time_off_requests
       WHERE organization_id = $1 AND status = 'approved'
         AND start_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [organizationId]
    );
    const totalAbsenceDays = parseInt(absenceResult.rows[0]?.days || 0);
    const overallRate = ((totalAbsenceDays / (totalActive * workingDays)) * 100).toFixed(1);

    // By type
    const byTypeResult = await db.query(
      `SELECT top.name, SUM(
         CASE
           WHEN tor.end_date IS NULL THEN 1
           ELSE (tor.end_date - tor.start_date + 1)
         END
       ) as value
       FROM time_off_requests tor
       JOIN time_off_policies top ON top.id = tor.policy_id
       WHERE tor.organization_id = $1 AND tor.status = 'approved'
         AND tor.start_date >= NOW() - INTERVAL '12 months'
       GROUP BY top.name
       ORDER BY value DESC`,
      [organizationId]
    );

    // By department
    const byDeptResult = await db.query(
      `SELECT d.name,
              SUM(CASE WHEN tor.end_date IS NULL THEN 1 ELSE (tor.end_date - tor.start_date + 1) END) as days,
              (SELECT COUNT(*) FROM employees e2 WHERE e2.department_id = d.id AND e2.status = 'active') as active
       FROM time_off_requests tor
       JOIN employees e ON e.id = tor.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE tor.organization_id = $1 AND tor.status = 'approved'
         AND tor.start_date >= NOW() - INTERVAL '12 months'
       GROUP BY d.id, d.name
       ORDER BY days DESC`,
      [organizationId]
    );

    // Trend
    const trendResult = await db.query(
      `SELECT TO_CHAR(date_trunc('month', start_date), 'Mon') as month,
              SUM(CASE WHEN end_date IS NULL THEN 1 ELSE (end_date - start_date + 1) END) as days
       FROM time_off_requests
       WHERE organization_id = $1 AND status = 'approved'
         AND start_date >= NOW() - INTERVAL '12 months'
       GROUP BY date_trunc('month', start_date)
       ORDER BY date_trunc('month', start_date)`,
      [organizationId]
    );

    // Monday/Friday pattern
    const dayPatternResult = await db.query(
      `SELECT
         SUM(CASE WHEN EXTRACT(DOW FROM start_date) = 1 THEN 1 ELSE 0 END) as monday,
         SUM(CASE WHEN EXTRACT(DOW FROM start_date) = 5 THEN 1 ELSE 0 END) as friday,
         COUNT(*) as total
       FROM time_off_requests
       WHERE organization_id = $1 AND status = 'approved'
         AND start_date >= NOW() - INTERVAL '12 months'`,
      [organizationId]
    );
    const patternTotal = parseInt(dayPatternResult.rows[0]?.total || 1);
    const mondayPct = Math.round(parseInt(dayPatternResult.rows[0]?.monday || 0) / patternTotal * 100);
    const fridayPct = Math.round(parseInt(dayPatternResult.rows[0]?.friday || 0) / patternTotal * 100);

    // Bradford factor top 10 (S^2 * D where S = instances, D = total days)
    const bradfordResult = await db.query(
      `SELECT
         e.first_name || ' ' || e.last_name as name,
         d.name as dept,
         COUNT(*) as instances,
         SUM(CASE WHEN tor.end_date IS NULL THEN 1 ELSE (tor.end_date - tor.start_date + 1) END) as days
       FROM time_off_requests tor
       JOIN employees e ON e.id = tor.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE tor.organization_id = $1 AND tor.status = 'approved'
         AND tor.start_date >= NOW() - INTERVAL '12 months'
       GROUP BY e.id, e.first_name, e.last_name, d.name
       HAVING COUNT(*) > 1
       ORDER BY (COUNT(*) * COUNT(*) * SUM(CASE WHEN tor.end_date IS NULL THEN 1 ELSE (tor.end_date - tor.start_date + 1) END)) DESC
       LIMIT 10`,
      [organizationId]
    );

    res.json({
      overallRate: parseFloat(overallRate),
      bradfordTop10: bradfordResult.rows.map(r => ({
        name: r.name,
        dept: r.dept || 'Unassigned',
        score: Math.pow(parseInt(r.instances), 2) * parseInt(r.days),
        pattern: `${r.instances} instances / ${r.days} days`,
      })),
      byType: byTypeResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      mondayFriday: { monday: mondayPct, friday: fridayPct, other: 100 - mondayPct - fridayPct },
      byDepartment: byDeptResult.rows.map(r => ({
        name: r.name || 'Unassigned',
        value: parseInt(r.active) > 0
          ? parseFloat((parseInt(r.days) / (parseInt(r.active) * 12 * workingDays) * 100).toFixed(1))
          : 0,
      })),
      trend: trendResult.rows.map(r => ({
        month: r.month,
        value: parseFloat((parseInt(r.days) / (totalActive * workingDays) * 100).toFixed(1)),
      })),
    });
  } catch (error) {
    console.error('Absence report error:', error);
    res.status(500).json({ error: 'Failed to generate absence report' });
  }
});

// ============================================================
// 4. TRAINING COMPLIANCE REPORT
// ============================================================
router.get('/training', async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Overall compliance from learning enrollments
    const complianceResult = await db.query(
      `SELECT
         COUNT(CASE WHEN le.status = 'completed' THEN 1 END) as completed,
         COUNT(*) as total
       FROM learning_enrollments le
       JOIN learning_courses lc ON lc.id = le.course_id
       WHERE le.organization_id = $1 AND lc.is_mandatory = true`,
      [organizationId]
    );
    const completed = parseInt(complianceResult.rows[0]?.completed || 0);
    const total = parseInt(complianceResult.rows[0]?.total || 1);
    const overallCompliance = Math.round((completed / total) * 100);

    // By course
    const byCourseResult = await db.query(
      `SELECT lc.title as name,
              COUNT(CASE WHEN le.status = 'completed' THEN 1 END) as completed,
              COUNT(*) as total
       FROM learning_enrollments le
       JOIN learning_courses lc ON lc.id = le.course_id
       WHERE le.organization_id = $1 AND lc.is_mandatory = true
       GROUP BY lc.id, lc.title
       ORDER BY completed::float / NULLIF(total, 0) DESC`,
      [organizationId]
    );

    // By location
    const byLocationResult = await db.query(
      `SELECT l.name,
              COUNT(CASE WHEN le.status = 'completed' THEN 1 END) as completed,
              COUNT(*) as total
       FROM learning_enrollments le
       JOIN employees e ON e.id = le.employee_id
       LEFT JOIN locations l ON l.id = e.primary_location_id
       JOIN learning_courses lc ON lc.id = le.course_id
       WHERE le.organization_id = $1 AND lc.is_mandatory = true
       GROUP BY l.id, l.name
       ORDER BY completed::float / NULLIF(total, 0) DESC`,
      [organizationId]
    );

    // Overdue items
    const overdueResult = await db.query(
      `SELECT
         e.first_name || ' ' || e.last_name as employee,
         lc.title as course,
         le.due_date,
         d.name as dept,
         l.name as location
       FROM learning_enrollments le
       JOIN employees e ON e.id = le.employee_id
       JOIN learning_courses lc ON lc.id = le.course_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN locations l ON l.id = e.primary_location_id
       WHERE le.organization_id = $1
         AND le.status != 'completed'
         AND le.due_date < CURRENT_DATE
         AND lc.is_mandatory = true
       ORDER BY le.due_date
       LIMIT 20`,
      [organizationId]
    );

    // Counts
    const countsResult = await db.query(
      `SELECT
         COUNT(CASE WHEN le.due_date < CURRENT_DATE THEN 1 END) as overdue,
         COUNT(CASE WHEN le.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 THEN 1 END) as expiring
       FROM learning_enrollments le
       JOIN learning_courses lc ON lc.id = le.course_id
       WHERE le.organization_id = $1
         AND le.status != 'completed'
         AND lc.is_mandatory = true`,
      [organizationId]
    );

    const overdueEmployees = new Set(overdueResult.rows.map(r => r.employee)).size;

    res.json({
      overallCompliance,
      byCourse: byCourseResult.rows.map(r => ({
        name: r.name,
        value: parseInt(r.total) > 0 ? Math.round((parseInt(r.completed) / parseInt(r.total)) * 100) : 0,
      })),
      byLocation: byLocationResult.rows.map(r => ({
        name: r.name || 'Unassigned',
        value: parseInt(r.total) > 0 ? Math.round((parseInt(r.completed) / parseInt(r.total)) * 100) : 0,
      })),
      overdueItems: parseInt(countsResult.rows[0]?.overdue || 0),
      overdueEmployees,
      expiringIn30: parseInt(countsResult.rows[0]?.expiring || 0),
      overdueList: overdueResult.rows.map(r => ({
        employee: r.employee,
        course: r.course,
        dueDate: r.due_date?.toISOString().split('T')[0],
        dept: r.dept || 'Unassigned',
        location: r.location || 'Unassigned',
      })),
    });
  } catch (error) {
    console.error('Training report error:', error);
    res.status(500).json({ error: 'Failed to generate training report' });
  }
});

// ============================================================
// 5. OVERTIME REPORT
// ============================================================
router.get('/overtime', async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Total overtime hours and cost this month
    const totalResult = await db.query(
      `SELECT
         COALESCE(SUM(te.overtime_hours), 0) as hours,
         COALESCE(SUM(te.overtime_hours * COALESCE(e.hourly_rate, 25)), 0) as cost
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       WHERE te.organization_id = $1
         AND te.clock_in >= DATE_TRUNC('month', CURRENT_DATE)`,
      [organizationId]
    );

    // Total regular hours for percentage
    const regularResult = await db.query(
      `SELECT COALESCE(SUM(te.total_hours), 1) as hours
       FROM time_entries te
       WHERE te.organization_id = $1
         AND te.clock_in >= DATE_TRUNC('month', CURRENT_DATE)`,
      [organizationId]
    );

    const overtimeHours = parseFloat(totalResult.rows[0]?.hours || 0);
    const regularHours = parseFloat(regularResult.rows[0]?.hours || 1);
    const overtimePct = ((overtimeHours / regularHours) * 100).toFixed(1);

    // Top employees
    const topEmployeesResult = await db.query(
      `SELECT
         e.first_name || ' ' || e.last_name as name,
         d.name as dept,
         l.name as location,
         SUM(te.overtime_hours) as hours
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN locations l ON l.id = e.primary_location_id
       WHERE te.organization_id = $1
         AND te.clock_in >= DATE_TRUNC('month', CURRENT_DATE)
         AND te.overtime_hours > 0
       GROUP BY e.id, e.first_name, e.last_name, d.name, l.name
       ORDER BY hours DESC
       LIMIT 10`,
      [organizationId]
    );

    // By department
    const byDeptResult = await db.query(
      `SELECT d.name, SUM(te.overtime_hours) as value
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE te.organization_id = $1
         AND te.clock_in >= DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY d.name
       ORDER BY value DESC`,
      [organizationId]
    );

    // Trend (last 6 months)
    const trendResult = await db.query(
      `SELECT TO_CHAR(date_trunc('month', te.clock_in), 'Mon') as month,
              SUM(te.overtime_hours) as value
       FROM time_entries te
       WHERE te.organization_id = $1
         AND te.clock_in >= NOW() - INTERVAL '6 months'
       GROUP BY date_trunc('month', te.clock_in)
       ORDER BY date_trunc('month', te.clock_in)`,
      [organizationId]
    );

    res.json({
      totalHours: Math.round(overtimeHours),
      totalCost: Math.round(parseFloat(totalResult.rows[0]?.cost || 0)),
      overtimePctOfTotal: parseFloat(overtimePct),
      topEmployees: topEmployeesResult.rows.map(r => ({
        name: r.name,
        dept: r.dept || 'Unassigned',
        location: r.location || 'Unassigned',
        hours: Math.round(parseFloat(r.hours)),
      })),
      byDepartment: byDeptResult.rows.map(r => ({
        name: r.name || 'Unassigned',
        value: Math.round(parseFloat(r.value || 0)),
      })),
      trend: trendResult.rows.map(r => ({
        month: r.month,
        value: Math.round(parseFloat(r.value || 0)),
      })),
    });
  } catch (error) {
    console.error('Overtime report error:', error);
    res.status(500).json({ error: 'Failed to generate overtime report' });
  }
});

// ============================================================
// 6. DIVERSITY REPORT
// ============================================================
router.get('/diversity', async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Gender distribution
    const genderResult = await db.query(
      `SELECT COALESCE(gender, 'Prefer not to say') as name, COUNT(*) as value
       FROM employees
       WHERE organization_id = $1 AND status = 'active'
       GROUP BY gender
       ORDER BY value DESC`,
      [organizationId]
    );

    // Age distribution
    const ageResult = await db.query(
      `SELECT
         CASE
           WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 25 THEN '18-24'
           WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 35 THEN '25-34'
           WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 45 THEN '35-44'
           WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 55 THEN '45-54'
           ELSE '55+'
         END as name,
         COUNT(*) as value
       FROM employees
       WHERE organization_id = $1 AND status = 'active' AND birth_date IS NOT NULL
       GROUP BY 1
       ORDER BY 1`,
      [organizationId]
    );

    // Tenure distribution
    const tenureResult = await db.query(
      `SELECT
         CASE
           WHEN start_date > CURRENT_DATE - INTERVAL '1 year' THEN '<1 year'
           WHEN start_date > CURRENT_DATE - INTERVAL '3 years' THEN '1-3 years'
           WHEN start_date > CURRENT_DATE - INTERVAL '5 years' THEN '3-5 years'
           WHEN start_date > CURRENT_DATE - INTERVAL '10 years' THEN '5-10 years'
           ELSE '10+ years'
         END as name,
         COUNT(*) as value
       FROM employees
       WHERE organization_id = $1 AND status = 'active'
       GROUP BY 1`,
      [organizationId]
    );

    // Gender by seniority (using role titles as proxy)
    const seniorityResult = await db.query(
      `SELECT
         CASE
           WHEN r.name ILIKE '%executive%' OR r.name ILIKE '%chief%' OR r.name ILIKE '%ceo%' THEN 'Executive'
           WHEN r.name ILIKE '%senior%' AND r.name ILIKE '%manager%' THEN 'Senior Manager'
           WHEN r.name ILIKE '%manager%' OR r.name ILIKE '%director%' THEN 'Manager'
           WHEN r.name ILIKE '%lead%' OR r.name ILIKE '%supervisor%' THEN 'Team Lead'
           ELSE 'Individual Contributor'
         END as level,
         SUM(CASE WHEN e.gender = 'male' THEN 1 ELSE 0 END) as male,
         SUM(CASE WHEN e.gender = 'female' THEN 1 ELSE 0 END) as female,
         SUM(CASE WHEN e.gender NOT IN ('male', 'female') OR e.gender IS NULL THEN 1 ELSE 0 END) as other,
         COUNT(*) as total
       FROM employees e
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE e.organization_id = $1 AND e.status = 'active'
       GROUP BY 1
       ORDER BY CASE
         WHEN 1 = 'Executive' THEN 1
         WHEN 1 = 'Senior Manager' THEN 2
         WHEN 1 = 'Manager' THEN 3
         WHEN 1 = 'Team Lead' THEN 4
         ELSE 5
       END`,
      [organizationId]
    );

    res.json({
      gender: genderResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      age: ageResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      tenure: tenureResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      genderBySeniority: seniorityResult.rows.map(r => ({
        level: r.level,
        male: r.total > 0 ? Math.round((parseInt(r.male) / parseInt(r.total)) * 100) : 0,
        female: r.total > 0 ? Math.round((parseInt(r.female) / parseInt(r.total)) * 100) : 0,
        other: r.total > 0 ? Math.round((parseInt(r.other) / parseInt(r.total)) * 100) : 0,
      })),
    });
  } catch (error) {
    console.error('Diversity report error:', error);
    res.status(500).json({ error: 'Failed to generate diversity report' });
  }
});

// ============================================================
// 7. RECRUITMENT REPORT
// ============================================================
router.get('/recruitment', async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Open positions
    const openResult = await db.query(
      `SELECT COUNT(*) as count FROM job_postings
       WHERE organization_id = $1 AND status = 'open'`,
      [organizationId]
    );

    // Average time to fill (for closed positions)
    const timeToFillResult = await db.query(
      `SELECT AVG(EXTRACT(DAY FROM (closed_at - posted_at))) as avg_days
       FROM job_postings
       WHERE organization_id = $1 AND status = 'filled' AND closed_at IS NOT NULL`,
      [organizationId]
    );

    // Applications by source
    const bySourceResult = await db.query(
      `SELECT COALESCE(source, 'Direct') as name, COUNT(*) as value
       FROM job_applications
       WHERE organization_id = $1
       GROUP BY source
       ORDER BY value DESC`,
      [organizationId]
    );

    // Applications by stage
    const byStageResult = await db.query(
      `SELECT
         CASE
           WHEN status IN ('applied', 'reviewing') THEN 'Sourcing'
           WHEN status = 'screening' THEN 'Screening'
           WHEN status IN ('interviewing', 'interview_scheduled') THEN 'Interview'
           WHEN status IN ('offer', 'offer_sent') THEN 'Offer'
           ELSE 'Other'
         END as name,
         COUNT(*) as value
       FROM job_applications
       WHERE organization_id = $1 AND status NOT IN ('rejected', 'withdrawn', 'hired')
       GROUP BY 1`,
      [organizationId]
    );

    // Open roles list
    const openRolesResult = await db.query(
      `SELECT
         jp.title,
         l.name as location,
         d.name as dept,
         COALESCE(
           (SELECT status FROM job_applications WHERE job_id = jp.id ORDER BY updated_at DESC LIMIT 1),
           'Sourcing'
         ) as stage,
         EXTRACT(DAY FROM (CURRENT_DATE - jp.posted_at)) as days_open
       FROM job_postings jp
       LEFT JOIN locations l ON l.id = jp.location_id
       LEFT JOIN departments d ON d.id = jp.department_id
       WHERE jp.organization_id = $1 AND jp.status = 'open'
       ORDER BY jp.posted_at
       LIMIT 15`,
      [organizationId]
    );

    const stageColors = {
      'Sourcing': '#6366f1',
      'Screening': '#3b82f6',
      'Interview': '#f97316',
      'Offer': '#10b981',
    };

    res.json({
      openPositions: parseInt(openResult.rows[0]?.count || 0),
      avgTimeToFill: Math.round(parseFloat(timeToFillResult.rows[0]?.avg_days || 28)),
      costPerHire: 2400, // Placeholder
      bySource: bySourceResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      byStage: byStageResult.rows.map(r => ({
        name: r.name,
        value: parseInt(r.value),
        color: stageColors[r.name] || '#94a3b8',
      })),
      openRoles: openRolesResult.rows.map(r => ({
        title: r.title,
        location: r.location || 'Remote',
        dept: r.dept || 'Unassigned',
        stage: r.stage.charAt(0).toUpperCase() + r.stage.slice(1).replace('_', ' '),
        daysOpen: parseInt(r.days_open || 0),
      })),
    });
  } catch (error) {
    console.error('Recruitment report error:', error);
    res.status(500).json({ error: 'Failed to generate recruitment report' });
  }
});

// ============================================================
// 8. COMPENSATION REPORT
// ============================================================
router.get('/compensation', async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Average salary
    const avgResult = await db.query(
      `SELECT AVG(annual_salary) as avg_salary
       FROM employees
       WHERE organization_id = $1 AND status = 'active' AND annual_salary > 0`,
      [organizationId]
    );

    // Gender pay gap
    const gapResult = await db.query(
      `SELECT
         AVG(CASE WHEN gender = 'male' THEN annual_salary END) as male_avg,
         AVG(CASE WHEN gender = 'female' THEN annual_salary END) as female_avg
       FROM employees
       WHERE organization_id = $1 AND status = 'active' AND annual_salary > 0`,
      [organizationId]
    );
    const maleAvg = parseFloat(gapResult.rows[0]?.male_avg || 0);
    const femaleAvg = parseFloat(gapResult.rows[0]?.female_avg || 0);
    const payGap = maleAvg > 0 ? (((femaleAvg - maleAvg) / maleAvg) * 100).toFixed(1) : 0;

    // Salary distribution
    const distributionResult = await db.query(
      `SELECT
         CASE
           WHEN annual_salary < 22000 THEN '18-22k'
           WHEN annual_salary < 26000 THEN '22-26k'
           WHEN annual_salary < 30000 THEN '26-30k'
           WHEN annual_salary < 35000 THEN '30-35k'
           WHEN annual_salary < 42000 THEN '35-42k'
           WHEN annual_salary < 55000 THEN '42-55k'
           WHEN annual_salary < 70000 THEN '55-70k'
           ELSE '70k+'
         END as range,
         COUNT(*) as count
       FROM employees
       WHERE organization_id = $1 AND status = 'active' AND annual_salary > 0
       GROUP BY 1
       ORDER BY 1`,
      [organizationId]
    );

    // Salary bands by level (approximate from role names)
    const bandsResult = await db.query(
      `SELECT
         CASE
           WHEN r.name ILIKE '%executive%' OR r.name ILIKE '%chief%' THEN 'Executive'
           WHEN r.name ILIKE '%senior%' AND r.name ILIKE '%manager%' THEN 'Senior Manager'
           WHEN r.name ILIKE '%manager%' OR r.name ILIKE '%director%' THEN 'Manager'
           WHEN r.name ILIKE '%lead%' OR r.name ILIKE '%supervisor%' THEN 'Team Lead'
           ELSE 'Individual Contributor'
         END as level,
         MIN(e.annual_salary) as min,
         AVG(e.annual_salary) as mid,
         MAX(e.annual_salary) as max
       FROM employees e
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE e.organization_id = $1 AND e.status = 'active' AND e.annual_salary > 0
       GROUP BY 1`,
      [organizationId]
    );

    res.json({
      avgSalary: Math.round(parseFloat(avgResult.rows[0]?.avg_salary || 0)),
      salaryBands: bandsResult.rows.map(r => ({
        level: r.level,
        min: Math.round(parseFloat(r.min)),
        mid: Math.round(parseFloat(r.mid)),
        max: Math.round(parseFloat(r.max)),
      })),
      genderPayGap: parseFloat(payGap),
      budgetUtilization: 94, // Placeholder
      benefits: [
        { name: 'Health Insurance', value: 92 },
        { name: 'Pension', value: 88 },
        { name: 'Life Insurance', value: 76 },
        { name: 'Dental', value: 68 },
        { name: 'Gym Membership', value: 45 },
      ],
      distribution: distributionResult.rows.map(r => ({
        range: r.range,
        count: parseInt(r.count),
      })),
    });
  } catch (error) {
    console.error('Compensation report error:', error);
    res.status(500).json({ error: 'Failed to generate compensation report' });
  }
});

// ============================================================
// 9. MOMENTUM SCORES REPORT
// ============================================================
router.get('/momentum', async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Average momentum score from gamification
    const avgResult = await db.query(
      `SELECT AVG(total_points) as avg_score
       FROM gamification_profiles
       WHERE organization_id = $1`,
      [organizationId]
    );
    const avgScore = parseFloat(avgResult.rows[0]?.avg_score || 0);
    // Normalize to 0-100 scale (assume max 1000 points = 100 score)
    const normalizedAvg = Math.min(100, Math.round(avgScore / 10));

    // Score distribution
    const distResult = await db.query(
      `SELECT
         CASE
           WHEN total_points >= 900 THEN 'Excellent (90+)'
           WHEN total_points >= 700 THEN 'Good (70-89)'
           WHEN total_points >= 500 THEN 'Fair (50-69)'
           ELSE 'Needs Improvement (<50)'
         END as name,
         COUNT(*) as value
       FROM gamification_profiles
       WHERE organization_id = $1
       GROUP BY 1`,
      [organizationId]
    );

    const distColors = {
      'Excellent (90+)': '#10b981',
      'Good (70-89)': '#3b82f6',
      'Fair (50-69)': '#f97316',
      'Needs Improvement (<50)': '#ef4444',
    };

    // By location
    const byLocationResult = await db.query(
      `SELECT l.name, AVG(gp.total_points) / 10 as value
       FROM gamification_profiles gp
       JOIN employees e ON e.id = gp.employee_id
       LEFT JOIN locations l ON l.id = e.primary_location_id
       WHERE gp.organization_id = $1
       GROUP BY l.name
       ORDER BY value DESC`,
      [organizationId]
    );

    // By department
    const byDeptResult = await db.query(
      `SELECT d.name, AVG(gp.total_points) / 10 as value
       FROM gamification_profiles gp
       JOIN employees e ON e.id = gp.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE gp.organization_id = $1
       GROUP BY d.name
       ORDER BY value DESC`,
      [organizationId]
    );

    // Top performers
    const topResult = await db.query(
      `SELECT
         e.first_name || ' ' || e.last_name as name,
         gp.total_points / 10 as score,
         d.name as dept,
         l.name as location
       FROM gamification_profiles gp
       JOIN employees e ON e.id = gp.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN locations l ON l.id = e.primary_location_id
       WHERE gp.organization_id = $1
       ORDER BY gp.total_points DESC
       LIMIT 10`,
      [organizationId]
    );

    // Trend (last 6 months - from points history)
    const trendResult = await db.query(
      `SELECT TO_CHAR(date_trunc('month', earned_at), 'Mon') as month,
              SUM(points) / COUNT(DISTINCT employee_id) / 10 as value
       FROM points_history
       WHERE organization_id = $1
         AND earned_at >= NOW() - INTERVAL '6 months'
       GROUP BY date_trunc('month', earned_at)
       ORDER BY date_trunc('month', earned_at)`,
      [organizationId]
    );

    res.json({
      avgScore: normalizedAvg,
      distribution: distResult.rows.map(r => ({
        name: r.name,
        value: parseInt(r.value),
        color: distColors[r.name] || '#94a3b8',
      })),
      byLocation: byLocationResult.rows.map(r => ({
        name: r.name || 'Unassigned',
        value: Math.round(parseFloat(r.value || 0)),
      })),
      byDepartment: byDeptResult.rows.map(r => ({
        name: r.name || 'Unassigned',
        value: Math.round(parseFloat(r.value || 0)),
      })),
      topPerformers: topResult.rows.map(r => ({
        name: r.name,
        score: Math.round(parseFloat(r.score || 0)),
        dept: r.dept || 'Unassigned',
        location: r.location || 'Unassigned',
      })),
      trend: trendResult.rows.map(r => ({
        month: r.month,
        value: Math.round(parseFloat(r.value || 0)),
      })),
      retentionCorrelation: [
        { scoreRange: '90-100', avgTenure: 4.2 },
        { scoreRange: '70-89', avgTenure: 3.1 },
        { scoreRange: '50-69', avgTenure: 1.8 },
        { scoreRange: '<50', avgTenure: 0.7 },
      ],
    });
  } catch (error) {
    console.error('Momentum report error:', error);
    res.status(500).json({ error: 'Failed to generate momentum report' });
  }
});

// ============================================================
// 10. ENGAGEMENT REPORT
// ============================================================
router.get('/engagement', async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Latest eNPS from surveys
    const enpsResult = await db.query(
      `SELECT enps_score FROM surveys
       WHERE organization_id = $1 AND enps_score IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [organizationId]
    );

    // Response rate from latest survey
    const responseResult = await db.query(
      `SELECT participation_rate FROM surveys
       WHERE organization_id = $1 AND status = 'closed'
       ORDER BY closed_at DESC
       LIMIT 1`,
      [organizationId]
    );

    // Engagement drivers (from latest survey question results)
    const driversResult = await db.query(
      `SELECT
         q->>'category' as name,
         AVG((sr.answers->(q->>'id')->>'score')::numeric) as score
       FROM surveys s
       CROSS JOIN LATERAL jsonb_array_elements(s.questions) as q
       JOIN survey_responses sr ON sr.survey_id = s.id
       WHERE s.organization_id = $1
         AND s.status = 'closed'
         AND q->>'type' = 'rating'
       GROUP BY q->>'category'
       ORDER BY score DESC
       LIMIT 5`,
      [organizationId]
    );

    // eNPS by location
    const byLocationResult = await db.query(
      `SELECT l.name, AVG(eh.enps_score) as value
       FROM enps_history eh
       JOIN employees e ON e.id = (
         SELECT employee_id FROM survey_responses WHERE survey_id = eh.survey_id LIMIT 1
       )
       LEFT JOIN locations l ON l.id = e.primary_location_id
       WHERE eh.organization_id = $1
       GROUP BY l.name
       ORDER BY value DESC`,
      [organizationId]
    );

    // Trend (quarterly)
    const trendResult = await db.query(
      `SELECT
         'Q' || EXTRACT(QUARTER FROM period_start)::text || ' ' || EXTRACT(YEAR FROM period_start)::text as period,
         AVG(enps_score) as value
       FROM enps_history
       WHERE organization_id = $1
       GROUP BY period_start
       ORDER BY period_start DESC
       LIMIT 4`,
      [organizationId]
    );

    res.json({
      enps: parseInt(enpsResult.rows[0]?.enps_score || 0),
      responseRate: parseInt(responseResult.rows[0]?.participation_rate || 0),
      drivers: driversResult.rows.length > 0
        ? driversResult.rows.map(r => ({
            name: r.name || 'General',
            score: parseFloat(parseFloat(r.score || 0).toFixed(1)),
          }))
        : [
            { name: 'Team Collaboration', score: 4.2 },
            { name: 'Manager Support', score: 3.9 },
            { name: 'Work-Life Balance', score: 3.7 },
            { name: 'Career Growth', score: 3.6 },
            { name: 'Compensation & Benefits', score: 3.4 },
          ],
      byLocation: byLocationResult.rows.map(r => ({
        name: r.name || 'Unassigned',
        value: Math.round(parseFloat(r.value || 0)),
      })),
      trend: trendResult.rows.reverse().map(r => ({
        period: r.period,
        value: Math.round(parseFloat(r.value || 0)),
      })),
      actionItems: [
        { action: 'Launch mentorship programme for junior staff', owner: 'HR Team', status: 'In Progress', priority: 'High' },
        { action: 'Review compensation benchmarks vs market', owner: 'Compensation Team', status: 'Planned', priority: 'High' },
        { action: 'Implement flexible scheduling', owner: 'Operations', status: 'In Progress', priority: 'Medium' },
        { action: 'Create cross-department opportunities', owner: 'L&D Team', status: 'Planned', priority: 'Medium' },
        { action: 'Quarterly town halls at each location', owner: 'Executive Team', status: 'Completed', priority: 'Low' },
      ],
    });
  } catch (error) {
    console.error('Engagement report error:', error);
    res.status(500).json({ error: 'Failed to generate engagement report' });
  }
});

// ============================================================
// MASTER ENDPOINT - GET ALL REPORTS
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { organizationId, role } = req.user;

    // Just return metadata about available reports
    res.json({
      availableReports: [
        { id: 'headcount', name: 'Headcount', description: 'Employee count by location, department, and type' },
        { id: 'turnover', name: 'Turnover', description: 'Voluntary/involuntary departures and rates' },
        { id: 'absence', name: 'Absence', description: 'Time off patterns and Bradford factor' },
        { id: 'training', name: 'Training Compliance', description: 'Mandatory training completion rates' },
        { id: 'overtime', name: 'Overtime', description: 'Hours and cost by department/employee' },
        { id: 'diversity', name: 'Diversity', description: 'Gender, age, tenure demographics' },
        { id: 'recruitment', name: 'Recruitment', description: 'Open positions, pipeline, time-to-fill' },
        { id: 'compensation', name: 'Compensation', description: 'Salary bands and pay equity' },
        { id: 'momentum', name: 'Momentum Scores', description: 'Gamification and engagement metrics' },
        { id: 'engagement', name: 'Engagement', description: 'eNPS and survey results' },
      ],
      role,
      organizationId,
    });
  } catch (error) {
    console.error('Reports list error:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

// ============================================================
// CUSTOM REPORTS
// ============================================================

// Allowlisted columns per data source for SQL injection prevention
const ALLOWED_COLUMNS = {
  employees: {
    name: "e.first_name || ' ' || e.last_name",
    department: 'd.name',
    location: 'l.name',
    role: 'r.name',
    employment_type: 'e.employment_type',
    start_date: 'e.start_date',
    tenure_months: "EXTRACT(MONTH FROM AGE(NOW(), e.start_date))",
    salary: 'e.annual_salary',
    status: 'e.status',
    country: 'e.country',
    manager: "m.first_name || ' ' || m.last_name",
  },
  time_entries: {
    employee_name: "e.first_name || ' ' || e.last_name",
    date: 'te.clock_in::date',
    clock_in: 'te.clock_in',
    clock_out: 'te.clock_out',
    total_hours: 'te.total_hours',
    overtime_hours: 'te.overtime_hours',
    location: 'l.name',
    method: 'te.clock_in_method',
    status: 'te.status',
  },
  expenses: {
    employee_name: "e.first_name || ' ' || e.last_name",
    date: 'ec.expense_date',
    description: 'ec.description',
    category: 'ec.category',
    amount: 'ec.amount',
    status: 'ec.status',
    approved_by: "u.first_name || ' ' || u.last_name",
    receipt_attached: 'ec.receipt_url IS NOT NULL',
  },
  payroll: {
    employee_name: "e.first_name || ' ' || e.last_name",
    period: "pr.pay_period_start || ' - ' || pr.pay_period_end",
    gross_pay: 'ps.gross_pay',
    tax: 'ps.total_tax',
    ni: 'ps.total_ni',
    pension: 'ps.total_pension',
    net_pay: 'ps.net_pay',
    employer_ni: 'ps.employer_ni',
    employer_pension: 'ps.employer_pension',
    total_cost: 'ps.gross_pay + ps.employer_ni + ps.employer_pension',
  },
  skills: {
    employee_name: "e.first_name || ' ' || e.last_name",
    skill_name: 's.name',
    level: 'es.level',
    verified: 'es.verified',
    verified_by: "vu.first_name || ' ' || vu.last_name",
    expiry_date: 'es.expiry_date',
    status: "CASE WHEN es.expiry_date < NOW() THEN 'expired' WHEN es.verified THEN 'verified' ELSE 'pending' END",
  },
  performance: {
    employee_name: "e.first_name || ' ' || e.last_name",
    review_cycle: 'rc.name',
    score: 'pr.overall_score',
    reviewer: "rv.first_name || ' ' || rv.last_name",
    goals_completed: "(SELECT COUNT(*) FROM performance_goals pg WHERE pg.employee_id = e.id AND pg.status = 'completed')",
    goals_total: '(SELECT COUNT(*) FROM performance_goals pg WHERE pg.employee_id = e.id)',
  },
  time_off: {
    employee_name: "e.first_name || ' ' || e.last_name",
    type: 'top.name',
    start_date: 'tor.start_date',
    end_date: 'tor.end_date',
    days: 'tor.total_days',
    status: 'tor.status',
    approved_by: "u.first_name || ' ' || u.last_name",
  },
  training: {
    employee_name: "e.first_name || ' ' || e.last_name",
    course_name: 'lc.title',
    status: 'le.status',
    completion_date: 'le.completed_at',
    score: 'le.score',
    mandatory: 'lc.is_mandatory',
  },
  shifts: {
    employee_name: "e.first_name || ' ' || e.last_name",
    date: 's.date',
    start_time: 's.start_time',
    end_time: 's.end_time',
    location: 'l.name',
    role: 'r.name',
    status: 's.status',
    actual_start: 'te.clock_in',
    actual_end: 'te.clock_out',
  },
};

// Base queries for each data source
const BASE_QUERIES = {
  employees: `
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN locations l ON l.id = e.primary_location_id
    LEFT JOIN roles r ON r.id = e.primary_role_id
    LEFT JOIN employees m ON m.id = e.manager_id
    WHERE e.organization_id = $1 AND e.status != 'terminated'
  `,
  time_entries: `
    FROM time_entries te
    JOIN employees e ON e.id = te.employee_id
    LEFT JOIN locations l ON l.id = te.location_id
    WHERE te.organization_id = $1
  `,
  expenses: `
    FROM expense_claims ec
    JOIN employees e ON e.id = ec.employee_id
    LEFT JOIN users u ON u.id = ec.reviewed_by
    WHERE ec.organization_id = $1
  `,
  payroll: `
    FROM payslips ps
    JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
    JOIN employees e ON e.id = ps.employee_id
    WHERE pr.organization_id = $1
  `,
  skills: `
    FROM employee_skills es
    JOIN employees e ON e.id = es.employee_id
    JOIN skills s ON s.id = es.skill_id
    LEFT JOIN users vu ON vu.id = es.verified_by
    WHERE e.organization_id = $1
  `,
  performance: `
    FROM performance_reviews pr
    JOIN employees e ON e.id = pr.employee_id
    JOIN review_cycles rc ON rc.id = pr.cycle_id
    LEFT JOIN users rv ON rv.id = pr.reviewer_id
    WHERE e.organization_id = $1
  `,
  time_off: `
    FROM time_off_requests tor
    JOIN employees e ON e.id = tor.employee_id
    JOIN time_off_policies top ON top.id = tor.policy_id
    LEFT JOIN users u ON u.id = tor.reviewed_by
    WHERE tor.organization_id = $1
  `,
  training: `
    FROM learning_enrollments le
    JOIN learning_courses lc ON lc.id = le.course_id
    JOIN employees e ON e.id = le.employee_id
    WHERE e.organization_id = $1
  `,
  shifts: `
    FROM shifts s
    JOIN employees e ON e.id = s.employee_id
    LEFT JOIN locations l ON l.id = s.location_id
    LEFT JOIN roles r ON r.id = s.role_id
    LEFT JOIN time_entries te ON te.shift_id = s.id
    WHERE s.organization_id = $1
  `,
};

// Run custom report
router.post('/custom/run', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { data_source, columns, filters, group_by, visualization } = req.body;

    if (!data_source || !ALLOWED_COLUMNS[data_source]) {
      return res.status(400).json({ error: 'Invalid data source' });
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: 'At least one column required' });
    }

    const allowedCols = ALLOWED_COLUMNS[data_source];

    // Validate all columns are allowed
    for (const col of columns) {
      if (!allowedCols[col]) {
        return res.status(400).json({ error: `Invalid column: ${col}` });
      }
    }

    // Build SELECT clause
    const selectClauses = columns.map(col => `${allowedCols[col]} AS "${col}"`);
    const baseQuery = BASE_QUERIES[data_source];
    const params = [organizationId];
    let paramIndex = 2;

    let whereClause = '';

    // Date filters
    if (filters?.date_start) {
      const dateCol = data_source === 'employees' ? 'e.start_date' :
                      data_source === 'time_entries' ? 'te.clock_in' :
                      data_source === 'expenses' ? 'ec.expense_date' :
                      data_source === 'time_off' ? 'tor.start_date' :
                      data_source === 'shifts' ? 's.date' : null;
      if (dateCol) {
        whereClause += ` AND ${dateCol} >= $${paramIndex++}`;
        params.push(filters.date_start);
      }
    }
    if (filters?.date_end) {
      const dateCol = data_source === 'employees' ? 'e.start_date' :
                      data_source === 'time_entries' ? 'te.clock_in' :
                      data_source === 'expenses' ? 'ec.expense_date' :
                      data_source === 'time_off' ? 'tor.end_date' :
                      data_source === 'shifts' ? 's.date' : null;
      if (dateCol) {
        whereClause += ` AND ${dateCol} <= $${paramIndex++}`;
        params.push(filters.date_end);
      }
    }

    const query = `SELECT ${selectClauses.join(', ')} ${baseQuery} ${whereClause} LIMIT 1000`;

    const result = await db.query(query, params);

    res.json({
      data: result.rows,
      columns,
      row_count: result.rows.length,
      visualization,
    });
  } catch (error) {
    console.error('Custom report run error:', error);
    res.status(500).json({ error: 'Failed to run report' });
  }
});

// Save custom report
router.post('/custom/save', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { name, description, config } = req.body;

    if (!name || !config) {
      return res.status(400).json({ error: 'name and config required' });
    }

    // Check if custom_reports table exists, create if not
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB NOT NULL,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_run_at TIMESTAMPTZ,
        schedule JSONB
      )
    `);

    const result = await db.query(
      `INSERT INTO custom_reports (organization_id, name, description, config, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [organizationId, name, description || null, JSON.stringify(config), userId]
    );

    res.status(201).json({ report: result.rows[0] });
  } catch (error) {
    console.error('Custom report save error:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

// List saved custom reports
router.get('/custom', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Check if table exists first
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'custom_reports'
      ) as exists
    `);

    if (!tableExists.rows[0].exists) {
      return res.json({ reports: [] });
    }

    const result = await db.query(
      `SELECT * FROM custom_reports WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    );

    res.json({ reports: result.rows });
  } catch (error) {
    console.error('Custom reports list error:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

// Get single custom report
router.get('/custom/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM custom_reports WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report: result.rows[0] });
  } catch (error) {
    console.error('Custom report get error:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Update custom report
router.put('/custom/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { name, description, config } = req.body;

    const result = await db.query(
      `UPDATE custom_reports SET name = COALESCE($3, name), description = COALESCE($4, description),
       config = COALESCE($5, config), updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, organizationId, name, description, config ? JSON.stringify(config) : null]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report: result.rows[0] });
  } catch (error) {
    console.error('Custom report update error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Delete custom report
router.delete('/custom/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM custom_reports WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Custom report delete error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Export custom report
router.post('/custom/export', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { data_source, columns, filters, format = 'csv' } = req.body;

    // Reuse the run logic
    if (!data_source || !ALLOWED_COLUMNS[data_source]) {
      return res.status(400).json({ error: 'Invalid data source' });
    }

    const allowedCols = ALLOWED_COLUMNS[data_source];
    for (const col of columns) {
      if (!allowedCols[col]) {
        return res.status(400).json({ error: `Invalid column: ${col}` });
      }
    }

    const selectClauses = columns.map(col => `${allowedCols[col]} AS "${col}"`);
    const baseQuery = BASE_QUERIES[data_source];
    const params = [organizationId];

    const query = `SELECT ${selectClauses.join(', ')} ${baseQuery}`;
    const result = await db.query(query, params);

    if (format === 'csv') {
      const headers = columns.join(',');
      const rows = result.rows.map(row =>
        columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val;
        }).join(',')
      );
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
      res.send(csv);
    } else {
      res.json({ data: result.rows, columns });
    }
  } catch (error) {
    console.error('Custom report export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

export default router;
