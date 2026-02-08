// ============================================================
// DASHBOARD & REPORTING API ROUTES
// Analytics, metrics, and exports
// ============================================================

import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();
router.use(authMiddleware);

// ============================================================
// DASHBOARD METRICS
// ============================================================

// Get dashboard overview
router.get('/dashboard', async (req, res) => {
  const { organizationId, role, employeeId } = req.user;
  const { locationId } = req.query;

  // Base metrics everyone sees
  const today = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];
  const weekEnd = getWeekEnd(new Date()).toISOString().split('T')[0];

  // Worker dashboard
  if (role === 'worker') {
    const [myShifts, upcomingShifts, pendingSwaps, timeOffBalance] = await Promise.all([
      // This week's shifts
      db.query(
        `SELECT s.*, l.name as location_name, r.name as role_name
         FROM shifts s
         LEFT JOIN locations l ON l.id = s.location_id
         LEFT JOIN roles r ON r.id = s.role_id
         WHERE s.employee_id = $1 AND s.date >= $2 AND s.date <= $3
         ORDER BY s.date, s.start_time`,
        [employeeId, weekStart, weekEnd]
      ),
      // Next 7 days
      db.query(
        `SELECT COUNT(*) as count, SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as hours
         FROM shifts
         WHERE employee_id = $1 AND date >= $2 AND date < $2::date + 7`,
        [employeeId, today]
      ),
      // Pending swap requests
      db.query(
        `SELECT COUNT(*) FROM shift_swaps WHERE from_employee_id = $1 AND status = 'pending'`,
        [employeeId]
      ),
      // Time off balance
      db.query(
        `SELECT tob.*, top.name as policy_name
         FROM time_off_balances tob
         JOIN time_off_policies top ON top.id = tob.policy_id
         WHERE tob.employee_id = $1 AND tob.year = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [employeeId]
      ),
    ]);

    return res.json({
      myShifts: myShifts.rows,
      upcomingShifts: {
        count: parseInt(upcomingShifts.rows[0]?.count || 0),
        hours: parseFloat(upcomingShifts.rows[0]?.hours || 0).toFixed(1),
      },
      pendingSwaps: parseInt(pendingSwaps.rows[0]?.count || 0),
      timeOffBalances: timeOffBalance.rows,
    });
  }

  // Manager/Admin dashboard
  let locationFilter = '';
  const params = [organizationId, today, weekStart, weekEnd];
  let paramIndex = 5;

  if (locationId) {
    locationFilter = ` AND location_id = $${paramIndex}`;
    params.push(locationId);
  }

  const [
    todayStats,
    weekStats,
    pendingApprovals,
    openShifts,
    employeeCount,
    clockedIn,
    recentActivity,
  ] = await Promise.all([
    // Today's metrics
    db.query(
      `SELECT 
         COUNT(*) FILTER (WHERE employee_id IS NOT NULL) as filled,
         COUNT(*) FILTER (WHERE is_open) as open,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
         SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as total_hours
       FROM shifts
       WHERE organization_id = $1 AND date = $2 ${locationFilter}`,
      params.slice(0, locationId ? 5 : 2)
    ),
    // This week's metrics
    db.query(
      `SELECT 
         COUNT(*) as total_shifts,
         COUNT(*) FILTER (WHERE employee_id IS NOT NULL) as filled,
         SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as hours,
         SUM(estimated_cost) as estimated_cost
       FROM shifts
       WHERE organization_id = $1 AND date >= $3 AND date <= $4 ${locationFilter}`,
      [organizationId, weekStart, weekEnd, ...(locationId ? [locationId] : [])]
    ),
    // Pending approvals
    db.query(
      `SELECT 
         (SELECT COUNT(*) FROM time_entries WHERE organization_id = $1 AND status = 'pending') as time_entries,
         (SELECT COUNT(*) FROM time_off_requests WHERE organization_id = $1 AND status = 'pending') as time_off,
         (SELECT COUNT(*) FROM shift_swaps WHERE organization_id = $1 AND status = 'pending') as swaps`,
      [organizationId]
    ),
    // Open shifts
    db.query(
      `SELECT COUNT(*) FROM shifts 
       WHERE organization_id = $1 AND is_open = TRUE AND date >= $2 AND employee_id IS NULL ${locationFilter}`,
      [organizationId, today, ...(locationId ? [locationId] : [])]
    ),
    // Employee count
    db.query(
      `SELECT COUNT(*) FROM employees WHERE organization_id = $1 AND status = 'active'`,
      [organizationId]
    ),
    // Currently clocked in
    db.query(
      `SELECT COUNT(DISTINCT employee_id) FROM time_entries 
       WHERE organization_id = $1 AND clock_out IS NULL`,
      [organizationId]
    ),
    // Recent activity (last 10 events)
    db.query(
      `SELECT * FROM audit_log 
       WHERE organization_id = $1 
       ORDER BY created_at DESC LIMIT 10`,
      [organizationId]
    ),
  ]);

  res.json({
    today: {
      filled: parseInt(todayStats.rows[0]?.filled || 0),
      open: parseInt(todayStats.rows[0]?.open || 0),
      completed: parseInt(todayStats.rows[0]?.completed || 0),
      noShow: parseInt(todayStats.rows[0]?.no_show || 0),
      totalHours: parseFloat(todayStats.rows[0]?.total_hours || 0).toFixed(1),
    },
    thisWeek: {
      totalShifts: parseInt(weekStats.rows[0]?.total_shifts || 0),
      filledShifts: parseInt(weekStats.rows[0]?.filled || 0),
      hours: parseFloat(weekStats.rows[0]?.hours || 0).toFixed(1),
      estimatedCost: parseFloat(weekStats.rows[0]?.estimated_cost || 0).toFixed(2),
    },
    pendingApprovals: {
      timeEntries: parseInt(pendingApprovals.rows[0]?.time_entries || 0),
      timeOff: parseInt(pendingApprovals.rows[0]?.time_off || 0),
      swaps: parseInt(pendingApprovals.rows[0]?.swaps || 0),
      total: parseInt(pendingApprovals.rows[0]?.time_entries || 0) +
             parseInt(pendingApprovals.rows[0]?.time_off || 0) +
             parseInt(pendingApprovals.rows[0]?.swaps || 0),
    },
    openShifts: parseInt(openShifts.rows[0]?.count || 0),
    activeEmployees: parseInt(employeeCount.rows[0]?.count || 0),
    currentlyClockedIn: parseInt(clockedIn.rows[0]?.count || 0),
    recentActivity: recentActivity.rows,
  });
});

// ============================================================
// REPORTS
// ============================================================

// Hours worked report
router.get('/reports/hours', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { startDate, endDate, locationId, departmentId, groupBy = 'employee' } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  let query;
  const params = [organizationId, startDate, endDate];
  let paramIndex = 4;

  if (groupBy === 'employee') {
    query = `
      SELECT 
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.employee_number,
        d.name as department,
        COUNT(te.id) as entry_count,
        SUM(te.total_hours) as total_hours,
        SUM(te.regular_hours) as regular_hours,
        SUM(te.overtime_hours) as overtime_hours,
        SUM(te.total_hours * COALESCE(e.hourly_rate, 0)) as labor_cost
      FROM employees e
      LEFT JOIN time_entries te ON te.employee_id = e.id 
        AND te.clock_in >= $2 AND te.clock_in < $3::date + 1
        AND te.status = 'approved'
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.organization_id = $1 AND e.status = 'active'
    `;

    if (locationId) {
      query += ` AND te.location_id = $${paramIndex++}`;
      params.push(locationId);
    }
    if (departmentId) {
      query += ` AND e.department_id = $${paramIndex++}`;
      params.push(departmentId);
    }

    query += ` GROUP BY e.id, e.first_name, e.last_name, e.employee_number, d.name
               ORDER BY total_hours DESC NULLS LAST`;
  } else if (groupBy === 'location') {
    query = `
      SELECT 
        l.id as location_id,
        l.name as location_name,
        COUNT(DISTINCT te.employee_id) as employee_count,
        COUNT(te.id) as entry_count,
        SUM(te.total_hours) as total_hours,
        SUM(te.regular_hours) as regular_hours,
        SUM(te.overtime_hours) as overtime_hours
      FROM locations l
      LEFT JOIN time_entries te ON te.location_id = l.id 
        AND te.clock_in >= $2 AND te.clock_in < $3::date + 1
        AND te.status = 'approved'
      WHERE l.organization_id = $1
      GROUP BY l.id, l.name
      ORDER BY total_hours DESC NULLS LAST
    `;
  } else if (groupBy === 'day') {
    query = `
      SELECT 
        DATE(te.clock_in) as date,
        COUNT(DISTINCT te.employee_id) as employee_count,
        COUNT(te.id) as entry_count,
        SUM(te.total_hours) as total_hours,
        SUM(te.regular_hours) as regular_hours,
        SUM(te.overtime_hours) as overtime_hours
      FROM time_entries te
      WHERE te.organization_id = $1 
        AND te.clock_in >= $2 AND te.clock_in < $3::date + 1
        AND te.status = 'approved'
    `;
    
    if (locationId) {
      query += ` AND te.location_id = $${paramIndex++}`;
      params.push(locationId);
    }

    query += ` GROUP BY DATE(te.clock_in) ORDER BY date`;
  }

  const result = await db.query(query, params);

  // Get totals
  const totals = await db.query(
    `SELECT 
       SUM(total_hours) as total_hours,
       SUM(regular_hours) as regular_hours,
       SUM(overtime_hours) as overtime_hours,
       COUNT(DISTINCT employee_id) as employee_count
     FROM time_entries
     WHERE organization_id = $1 AND clock_in >= $2 AND clock_in < $3::date + 1 AND status = 'approved'`,
    [organizationId, startDate, endDate]
  );

  res.json({
    data: result.rows,
    totals: totals.rows[0],
    groupBy,
    period: { startDate, endDate },
  });
});

// Attendance report
router.get('/reports/attendance', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { startDate, endDate, locationId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  const params = [organizationId, startDate, endDate];
  let locationFilter = '';
  
  if (locationId) {
    locationFilter = ' AND s.location_id = $4';
    params.push(locationId);
  }

  const result = await db.query(
    `SELECT 
       e.id as employee_id,
       e.first_name,
       e.last_name,
       COUNT(s.id) as scheduled_shifts,
       COUNT(te.id) as worked_shifts,
       COUNT(s.id) - COUNT(te.id) as missed_shifts,
       SUM(CASE WHEN te.clock_in > s.start_time + INTERVAL '5 minutes' THEN 1 ELSE 0 END) as late_arrivals,
       SUM(CASE WHEN te.clock_out < s.end_time - INTERVAL '5 minutes' THEN 1 ELSE 0 END) as early_departures,
       AVG(EXTRACT(EPOCH FROM (te.clock_in - s.start_time))/60)::numeric(10,1) as avg_arrival_diff_mins
     FROM employees e
     JOIN shifts s ON s.employee_id = e.id AND s.date >= $2 AND s.date <= $3 ${locationFilter}
     LEFT JOIN time_entries te ON te.shift_id = s.id
     WHERE e.organization_id = $1 AND e.status = 'active'
     GROUP BY e.id, e.first_name, e.last_name
     ORDER BY missed_shifts DESC, late_arrivals DESC`,
    params
  );

  res.json({
    data: result.rows,
    period: { startDate, endDate },
  });
});

// Labor cost report
router.get('/reports/labor-cost', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { startDate, endDate, locationId, groupBy = 'week' } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  let dateGroup;
  switch (groupBy) {
    case 'day':
      dateGroup = "DATE(te.clock_in)";
      break;
    case 'week':
      dateGroup = "DATE_TRUNC('week', te.clock_in)::date";
      break;
    case 'month':
      dateGroup = "DATE_TRUNC('month', te.clock_in)::date";
      break;
    default:
      dateGroup = "DATE_TRUNC('week', te.clock_in)::date";
  }

  const params = [organizationId, startDate, endDate];
  let locationFilter = '';
  
  if (locationId) {
    locationFilter = ' AND te.location_id = $4';
    params.push(locationId);
  }

  const result = await db.query(
    `SELECT 
       ${dateGroup} as period,
       COUNT(DISTINCT te.employee_id) as employee_count,
       SUM(te.total_hours) as total_hours,
       SUM(te.regular_hours) as regular_hours,
       SUM(te.overtime_hours) as overtime_hours,
       SUM(te.regular_hours * COALESCE(e.hourly_rate, 0)) as regular_cost,
       SUM(te.overtime_hours * COALESCE(e.hourly_rate, 0) * 1.5) as overtime_cost,
       SUM(te.total_hours * COALESCE(e.hourly_rate, 0)) + 
         SUM(te.overtime_hours * COALESCE(e.hourly_rate, 0) * 0.5) as total_cost
     FROM time_entries te
     JOIN employees e ON e.id = te.employee_id
     WHERE te.organization_id = $1 
       AND te.clock_in >= $2 AND te.clock_in < $3::date + 1
       AND te.status = 'approved'
       ${locationFilter}
     GROUP BY ${dateGroup}
     ORDER BY period`,
    params
  );

  res.json({
    data: result.rows,
    groupBy,
    period: { startDate, endDate },
  });
});

// Schedule coverage report
router.get('/reports/coverage', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { startDate, endDate, locationId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  const params = [organizationId, startDate, endDate];
  let locationFilter = '';
  
  if (locationId) {
    locationFilter = ' AND s.location_id = $4';
    params.push(locationId);
  }

  const result = await db.query(
    `SELECT 
       s.date,
       l.name as location_name,
       COUNT(s.id) as total_shifts,
       COUNT(s.id) FILTER (WHERE s.employee_id IS NOT NULL) as filled_shifts,
       COUNT(s.id) FILTER (WHERE s.is_open AND s.employee_id IS NULL) as open_shifts,
       COUNT(s.id) FILTER (WHERE s.status = 'cancelled') as cancelled_shifts,
       ROUND(COUNT(s.id) FILTER (WHERE s.employee_id IS NOT NULL)::numeric / 
             NULLIF(COUNT(s.id) FILTER (WHERE s.status != 'cancelled'), 0) * 100, 1) as fill_rate
     FROM shifts s
     JOIN locations l ON l.id = s.location_id
     WHERE s.organization_id = $1 AND s.date >= $2 AND s.date <= $3 ${locationFilter}
     GROUP BY s.date, l.name
     ORDER BY s.date, l.name`,
    params
  );

  // Calculate overall stats
  const totals = await db.query(
    `SELECT 
       COUNT(s.id) as total_shifts,
       COUNT(s.id) FILTER (WHERE s.employee_id IS NOT NULL) as filled_shifts,
       COUNT(s.id) FILTER (WHERE s.is_open AND s.employee_id IS NULL) as open_shifts,
       ROUND(COUNT(s.id) FILTER (WHERE s.employee_id IS NOT NULL)::numeric / 
             NULLIF(COUNT(s.id), 0) * 100, 1) as overall_fill_rate
     FROM shifts s
     WHERE s.organization_id = $1 AND s.date >= $2 AND s.date <= $3 ${locationFilter}`,
    params
  );

  res.json({
    data: result.rows,
    totals: totals.rows[0],
    period: { startDate, endDate },
  });
});

// ============================================================
// EXPORTS
// ============================================================

// Export timesheet data as CSV
router.get('/exports/timesheets', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { startDate, endDate, format = 'csv' } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  const result = await db.query(
    `SELECT 
       e.employee_number,
       e.first_name,
       e.last_name,
       e.email,
       d.name as department,
       l.name as location,
       DATE(te.clock_in) as date,
       te.clock_in,
       te.clock_out,
       te.total_break_minutes as break_minutes,
       te.total_hours,
       te.regular_hours,
       te.overtime_hours,
       e.hourly_rate,
       te.total_hours * COALESCE(e.hourly_rate, 0) as gross_pay,
       te.status,
       te.notes
     FROM time_entries te
     JOIN employees e ON e.id = te.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN locations l ON l.id = te.location_id
     WHERE te.organization_id = $1 
       AND te.clock_in >= $2 AND te.clock_in < $3::date + 1
     ORDER BY e.last_name, e.first_name, te.clock_in`,
    [organizationId, startDate, endDate]
  );

  if (format === 'json') {
    return res.json({ data: result.rows });
  }

  // CSV format
  const headers = [
    'Employee Number', 'First Name', 'Last Name', 'Email', 'Department', 'Location',
    'Date', 'Clock In', 'Clock Out', 'Break Minutes', 'Total Hours', 'Regular Hours',
    'Overtime Hours', 'Hourly Rate', 'Gross Pay', 'Status', 'Notes'
  ];

  const csv = [
    headers.join(','),
    ...result.rows.map(row => [
      row.employee_number || '',
      row.first_name,
      row.last_name,
      row.email || '',
      row.department || '',
      row.location || '',
      row.date,
      row.clock_in,
      row.clock_out || '',
      row.break_minutes || 0,
      row.total_hours || 0,
      row.regular_hours || 0,
      row.overtime_hours || 0,
      row.hourly_rate || 0,
      row.gross_pay || 0,
      row.status,
      `"${(row.notes || '').replace(/"/g, '""')}"`,
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=timesheets-${startDate}-to-${endDate}.csv`);
  res.send(csv);
});

// Export employee list
router.get('/exports/employees', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { status = 'active', format = 'csv' } = req.query;

  const result = await db.query(
    `SELECT 
       e.employee_number,
       e.first_name,
       e.last_name,
       e.email,
       e.phone,
       d.name as department,
       r.name as role,
       l.name as location,
       e.employment_type,
       e.start_date,
       e.hourly_rate,
       e.contracted_hours_per_week,
       e.status,
       m.first_name || ' ' || m.last_name as manager_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN roles r ON r.id = e.primary_role_id
     LEFT JOIN locations l ON l.id = e.primary_location_id
     LEFT JOIN employees m ON m.id = e.manager_id
     WHERE e.organization_id = $1 AND ($2 = 'all' OR e.status = $2)
     ORDER BY e.last_name, e.first_name`,
    [organizationId, status]
  );

  if (format === 'json') {
    return res.json({ data: result.rows });
  }

  const headers = [
    'Employee Number', 'First Name', 'Last Name', 'Email', 'Phone',
    'Department', 'Role', 'Location', 'Employment Type', 'Start Date',
    'Hourly Rate', 'Contracted Hours', 'Status', 'Manager'
  ];

  const csv = [
    headers.join(','),
    ...result.rows.map(row => [
      row.employee_number || '',
      row.first_name,
      row.last_name,
      row.email || '',
      row.phone || '',
      row.department || '',
      row.role || '',
      row.location || '',
      row.employment_type || '',
      row.start_date || '',
      row.hourly_rate || '',
      row.contracted_hours_per_week || '',
      row.status,
      row.manager_name || '',
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=employees.csv`);
  res.send(csv);
});

// Export report as PDF
router.get('/exports/:reportType/pdf', requireRole(['admin', 'manager']), async (req, res) => {
  const { organizationId } = req.user;
  const { reportType } = req.params;
  const { startDate, endDate } = req.query;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('Uplift Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text(reportType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), { align: 'center' });
  if (startDate && endDate) {
    doc.fontSize(10).text(`${startDate} to ${endDate}`, { align: 'center' });
  }
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toISOString().split('T')[0]}`, { align: 'right' });
  doc.moveDown();

  try {
    if (reportType === 'timesheets') {
      if (!startDate || !endDate) {
        doc.text('Error: startDate and endDate required');
        doc.end();
        return;
      }
      const result = await db.query(
        `SELECT e.first_name, e.last_name, d.name as department,
                COUNT(*) as shifts, SUM(te.total_hours) as total_hours,
                SUM(te.overtime_hours) as overtime_hours,
                SUM(te.total_hours * COALESCE(e.hourly_rate, 0)) as gross_pay
         FROM time_entries te
         JOIN employees e ON e.id = te.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE te.organization_id = $1 AND te.clock_in >= $2 AND te.clock_in < $3::date + 1
         GROUP BY e.id, e.first_name, e.last_name, d.name
         ORDER BY e.last_name`,
        [organizationId, startDate, endDate]
      );
      renderTable(doc, ['Name', 'Department', 'Shifts', 'Hours', 'Overtime', 'Gross Pay'], result.rows.map(r => [
        `${r.first_name} ${r.last_name}`, r.department || '-', r.shifts,
        Number(r.total_hours || 0).toFixed(1), Number(r.overtime_hours || 0).toFixed(1),
        `£${Number(r.gross_pay || 0).toFixed(2)}`
      ]));
    } else if (reportType === 'employees') {
      const result = await db.query(
        `SELECT e.first_name, e.last_name, e.email, d.name as department, e.employment_type, e.status
         FROM employees e LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.organization_id = $1 ORDER BY e.last_name`,
        [organizationId]
      );
      renderTable(doc, ['Name', 'Email', 'Department', 'Type', 'Status'], result.rows.map(r => [
        `${r.first_name} ${r.last_name}`, r.email || '-', r.department || '-', r.employment_type || '-', r.status
      ]));
    } else if (reportType === 'schedule-efficiency') {
      const result = await db.query(
        `SELECT
           COUNT(*) as total_shifts,
           COUNT(*) FILTER (WHERE employee_id IS NOT NULL) as filled,
           COUNT(*) FILTER (WHERE employee_id IS NULL) as unfilled,
           COUNT(*) FILTER (WHERE status = 'swap_requested') as swap_requests
         FROM shifts
         WHERE organization_id = $1 AND date >= CURRENT_DATE - 30`,
        [organizationId]
      );
      const s = result.rows[0] || {};
      doc.fontSize(12);
      doc.text(`Total Shifts (last 30 days): ${s.total_shifts || 0}`);
      doc.text(`Filled: ${s.filled || 0}`);
      doc.text(`Unfilled: ${s.unfilled || 0}`);
      doc.text(`Fill Rate: ${s.total_shifts > 0 ? ((s.filled / s.total_shifts) * 100).toFixed(1) : 0}%`);
      doc.text(`Swap Requests: ${s.swap_requests || 0}`);
    } else {
      doc.text(`Report type "${reportType}" not found.`);
    }
  } catch (err) {
    doc.text(`Error generating report: ${err.message}`);
  }

  doc.end();
});

// ============================================================
// HELPERS
// ============================================================

function renderTable(doc, headers, rows) {
  const colWidth = (doc.page.width - 100) / headers.length;
  const startX = 50;
  let y = doc.y;

  // Header row
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => {
    doc.text(h, startX + i * colWidth, y, { width: colWidth, align: 'left' });
  });
  y += 18;
  doc.moveTo(startX, y).lineTo(startX + headers.length * colWidth, y).stroke();
  y += 5;

  // Data rows
  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 50;
    }
    row.forEach((cell, i) => {
      doc.text(String(cell), startX + i * colWidth, y, { width: colWidth, align: 'left' });
    });
    y += 15;
  }
  doc.y = y;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff));
}

function getWeekEnd(date) {
  const start = getWeekStart(date);
  return new Date(start.setDate(start.getDate() + 6));
}

export default router;
