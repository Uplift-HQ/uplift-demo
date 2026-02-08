// ============================================================
// SHIFT OPERATIONS ROUTES
// Shift swaps, open shifts, payroll export, templates
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import { notificationService } from '../services/notifications.js';

const router = Router();
router.use(authMiddleware);

// ============================================================
// SHIFT SWAPS
// ============================================================

/**
 * GET /api/shift-swaps - List swap requests
 */
router.get('/shift-swaps', async (req, res) => {
  try {
    const { status, myRequests } = req.query;
    
    let query = `
      SELECT ss.*,
        fs.date as from_shift_date, fs.start_time as from_shift_start, fs.end_time as from_shift_end,
        ts.date as to_shift_date, ts.start_time as to_shift_start, ts.end_time as to_shift_end,
        fe.first_name as from_employee_name, fe.last_name as from_employee_last,
        te.first_name as to_employee_name, te.last_name as to_employee_last,
        fl.name as from_location, tl.name as to_location,
        u.first_name as reviewed_by_name, u.last_name as reviewed_by_last
      FROM shift_swaps ss
      JOIN shifts fs ON fs.id = ss.from_shift_id
      LEFT JOIN shifts ts ON ts.id = ss.to_shift_id
      JOIN employees fe ON fe.id = ss.from_employee_id
      LEFT JOIN employees te ON te.id = ss.to_employee_id
      LEFT JOIN locations fl ON fl.id = fs.location_id
      LEFT JOIN locations tl ON tl.id = ts.location_id
      LEFT JOIN users u ON u.id = ss.reviewed_by
      WHERE ss.organization_id = $1
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;

    if (status) {
      query += ` AND ss.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get employee ID for current user
    const empResult = await db.query(
      `SELECT id FROM employees WHERE user_id = $1`,
      [req.user.userId]
    );
    const employeeId = empResult.rows[0]?.id;

    // Filter to user's requests if not admin/manager
    if (!['admin', 'manager'].includes(req.user.role) || myRequests === 'true') {
      if (employeeId) {
        query += ` AND (ss.from_employee_id = $${paramIndex} OR ss.to_employee_id = $${paramIndex})`;
        params.push(employeeId);
        paramIndex++;
      }
    }

    query += ` ORDER BY ss.created_at DESC`;

    const result = await db.query(query, params);

    res.json({ swaps: result.rows });
  } catch (error) {
    console.error('List swaps error:', error);
    res.status(500).json({ error: 'Failed to list swaps' });
  }
});

/**
 * POST /api/shift-swaps - Request a shift swap
 */
router.post('/shift-swaps', async (req, res) => {
  try {
    const { fromShiftId, toShiftId, toEmployeeId, type, reason } = req.body;

    // Get employee ID for current user
    const empResult = await db.query(
      `SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2`,
      [req.user.userId, req.user.organizationId]
    );

    if (!empResult.rows[0]) {
      return res.status(400).json({ error: 'Employee record not found' });
    }

    const fromEmployeeId = empResult.rows[0].id;

    // Verify from shift belongs to user
    const shiftCheck = await db.query(
      `SELECT id FROM shifts WHERE id = $1 AND employee_id = $2 AND organization_id = $3`,
      [fromShiftId, fromEmployeeId, req.user.organizationId]
    );

    if (!shiftCheck.rows[0]) {
      return res.status(400).json({ error: 'Shift not found or not assigned to you' });
    }

    const result = await db.query(
      `INSERT INTO shift_swaps (
        organization_id, from_shift_id, from_employee_id, 
        to_shift_id, to_employee_id, type, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.user.organizationId, fromShiftId, fromEmployeeId,
        toShiftId || null, toEmployeeId || null, type || 'swap', reason
      ]
    );

    // Notify managers
    const managers = await db.query(
      `SELECT user_id FROM employees WHERE organization_id = $1 AND role_id IN (
        SELECT id FROM roles WHERE name IN ('Manager', 'Admin')
      )`,
      [req.user.organizationId]
    );

    for (const mgr of managers.rows) {
      await notificationService.create({
        userId: mgr.user_id,
        type: 'swap_request',
        title: 'New Shift Swap Request',
        message: `A shift swap request needs your approval`,
        data: { swapId: result.rows[0].id },
      });
    }

    res.status(201).json({ swap: result.rows[0] });
  } catch (error) {
    console.error('Create swap error:', error);
    res.status(500).json({ error: 'Failed to create swap request' });
  }
});

/**
 * PUT /api/shift-swaps/:id/approve - Approve swap request
 */
router.put('/shift-swaps/:id/approve', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    // Get swap details
    const swapResult = await db.query(
      `SELECT * FROM shift_swaps WHERE id = $1 AND organization_id = $2 AND status = 'pending'`,
      [req.params.id, req.user.organizationId]
    );

    if (!swapResult.rows[0]) {
      return res.status(404).json({ error: 'Swap request not found or already processed' });
    }

    const swap = swapResult.rows[0];

    // Perform the swap in transaction
    await db.query('BEGIN');

    try {
      if (swap.type === 'swap' && swap.to_shift_id && swap.to_employee_id) {
        // Swap employees on both shifts
        await db.query(
          `UPDATE shifts SET employee_id = $1 WHERE id = $2`,
          [swap.to_employee_id, swap.from_shift_id]
        );
        await db.query(
          `UPDATE shifts SET employee_id = $1 WHERE id = $2`,
          [swap.from_employee_id, swap.to_shift_id]
        );
      } else if (swap.type === 'giveaway' && swap.to_employee_id) {
        // Transfer to other employee
        await db.query(
          `UPDATE shifts SET employee_id = $1 WHERE id = $2`,
          [swap.to_employee_id, swap.from_shift_id]
        );
      } else if (swap.type === 'drop') {
        // Mark as open shift
        await db.query(
          `UPDATE shifts SET employee_id = NULL, is_open = true WHERE id = $1`,
          [swap.from_shift_id]
        );
      }

      // Update swap status
      await db.query(
        `UPDATE shift_swaps 
         SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [req.params.id, req.user.userId]
      );

      await db.query('COMMIT');

      // Notify employees
      const fromEmpResult = await db.query(
        `SELECT user_id FROM employees WHERE id = $1`,
        [swap.from_employee_id]
      );
      if (fromEmpResult.rows[0]?.user_id) {
        await notificationService.create({
          userId: fromEmpResult.rows[0].user_id,
          type: 'swap_approved',
          title: 'Swap Request Approved',
          message: 'Your shift swap request has been approved',
          data: { swapId: req.params.id },
        });
      }

      res.json({ success: true });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Approve swap error:', error);
    res.status(500).json({ error: 'Failed to approve swap' });
  }
});

/**
 * PUT /api/shift-swaps/:id/reject - Reject swap request
 */
router.put('/shift-swaps/:id/reject', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { reason } = req.body;

    const result = await db.query(
      `UPDATE shift_swaps 
       SET status = 'rejected', 
           reviewed_by = $2, 
           reviewed_at = NOW(),
           reason = COALESCE($3, reason),
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $4 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.userId, reason, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    // Notify requester
    const empResult = await db.query(
      `SELECT user_id FROM employees WHERE id = $1`,
      [result.rows[0].from_employee_id]
    );
    if (empResult.rows[0]?.user_id) {
      await notificationService.create({
        userId: empResult.rows[0].user_id,
        type: 'swap_rejected',
        title: 'Swap Request Rejected',
        message: reason || 'Your shift swap request has been rejected',
        data: { swapId: req.params.id },
      });
    }

    res.json({ swap: result.rows[0] });
  } catch (error) {
    console.error('Reject swap error:', error);
    res.status(500).json({ error: 'Failed to reject swap' });
  }
});

// ============================================================
// OPEN SHIFTS
// ============================================================

/**
 * GET /api/open-shifts - List open shifts available for claiming
 */
router.get('/open-shifts', async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.query;

    let query = `
      SELECT s.*, 
        l.name as location_name, l.address as location_address,
        r.name as role_name,
        array_length(s.applicants, 1) as applicant_count
      FROM shifts s
      JOIN locations l ON l.id = s.location_id
      LEFT JOIN roles r ON r.id = s.role_id
      WHERE s.organization_id = $1 
        AND s.is_open = true 
        AND s.employee_id IS NULL
        AND s.date >= CURRENT_DATE
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;

    if (locationId) {
      query += ` AND s.location_id = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND s.date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND s.date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY s.date, s.start_time`;

    const result = await db.query(query, params);

    // Check if current user has applied
    const empResult = await db.query(
      `SELECT id FROM employees WHERE user_id = $1`,
      [req.user.userId]
    );
    const employeeId = empResult.rows[0]?.id;

    const shifts = result.rows.map(shift => ({
      ...shift,
      hasApplied: employeeId && (shift.applicants || []).includes(employeeId),
    }));

    res.json({ shifts });
  } catch (error) {
    console.error('List open shifts error:', error);
    res.status(500).json({ error: 'Failed to list open shifts' });
  }
});

/**
 * POST /api/open-shifts/:id/apply - Apply for open shift
 */
router.post('/open-shifts/:id/apply', async (req, res) => {
  try {
    // Get employee ID
    const empResult = await db.query(
      `SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2`,
      [req.user.userId, req.user.organizationId]
    );

    if (!empResult.rows[0]) {
      return res.status(400).json({ error: 'Employee record not found' });
    }

    const employeeId = empResult.rows[0].id;

    // Add to applicants array
    const result = await db.query(
      `UPDATE shifts 
       SET applicants = array_append(applicants, $2)
       WHERE id = $1 AND organization_id = $3 AND is_open = true AND employee_id IS NULL
         AND NOT ($2 = ANY(applicants))
       RETURNING *`,
      [req.params.id, employeeId, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Shift not found or already applied' });
    }

    res.json({ success: true, shift: result.rows[0] });
  } catch (error) {
    console.error('Apply for shift error:', error);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

/**
 * POST /api/open-shifts/:id/assign - Assign open shift to applicant
 */
router.post('/open-shifts/:id/assign', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const result = await db.query(
      `UPDATE shifts 
       SET employee_id = $2, is_open = false, applicants = '{}', confirmed_at = NOW()
       WHERE id = $1 AND organization_id = $3 AND is_open = true
       RETURNING *`,
      [req.params.id, employeeId, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Open shift not found' });
    }

    // Notify assigned employee
    const empResult = await db.query(
      `SELECT user_id FROM employees WHERE id = $1`,
      [employeeId]
    );
    if (empResult.rows[0]?.user_id) {
      await notificationService.create({
        userId: empResult.rows[0].user_id,
        type: 'shift_assigned',
        title: 'Shift Assigned',
        message: `You've been assigned a shift on ${result.rows[0].date}`,
        data: { shiftId: req.params.id },
      });
    }

    res.json({ shift: result.rows[0] });
  } catch (error) {
    console.error('Assign shift error:', error);
    res.status(500).json({ error: 'Failed to assign shift' });
  }
});

/**
 * GET /api/open-shifts/:id/applicants - Get applicants for open shift
 */
router.get('/open-shifts/:id/applicants', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const shiftResult = await db.query(
      `SELECT applicants FROM shifts WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );

    if (!shiftResult.rows[0]) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const applicants = shiftResult.rows[0].applicants || [];

    if (applicants.length === 0) {
      return res.json({ applicants: [] });
    }

    const result = await db.query(
      `SELECT e.id, e.first_name, e.last_name, e.email, e.avatar_url,
              d.name as department_name, r.name as role_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE e.id = ANY($1)`,
      [applicants]
    );

    res.json({ applicants: result.rows });
  } catch (error) {
    console.error('Get applicants error:', error);
    res.status(500).json({ error: 'Failed to get applicants' });
  }
});

// ============================================================
// SHIFT TEMPLATES
// ============================================================

/**
 * GET /api/shift-templates - List shift templates
 */
router.get('/shift-templates', async (req, res) => {
  try {
    const { locationId } = req.query;

    let query = `
      SELECT st.*, l.name as location_name, r.name as role_name
      FROM shift_templates st
      LEFT JOIN locations l ON l.id = st.location_id
      LEFT JOIN roles r ON r.id = st.role_id
      WHERE st.organization_id = $1
    `;
    const params = [req.user.organizationId];

    if (locationId) {
      query += ` AND (st.location_id = $2 OR st.location_id IS NULL)`;
      params.push(locationId);
    }

    query += ` ORDER BY st.start_time`;

    const result = await db.query(query, params);

    res.json({ templates: result.rows });
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/**
 * POST /api/shift-templates - Create shift template
 */
router.post('/shift-templates', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, locationId, roleId, startTime, endTime, breakMinutes, daysOfWeek, color } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: 'Name, start time, and end time are required' });
    }

    const result = await db.query(
      `INSERT INTO shift_templates (
        organization_id, name, location_id, role_id, start_time, end_time, 
        break_minutes, days_of_week, color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.user.organizationId, name, locationId, roleId, startTime, endTime,
        breakMinutes || 0, daysOfWeek || [1,2,3,4,5], color
      ]
    );

    res.status(201).json({ template: result.rows[0] });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * POST /api/shift-templates/:id/apply - Apply template to create shifts
 */
router.post('/shift-templates/:id/apply', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, employeeIds } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    // Get template
    const templateResult = await db.query(
      `SELECT * FROM shift_templates WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );

    if (!templateResult.rows[0]) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];
    const shifts = [];

    // Generate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay(); // Convert Sunday from 0 to 7
      
      if ((template.days_of_week || []).includes(dayOfWeek)) {
        const dateStr = d.toISOString().split('T')[0];
        
        // Create shift for each employee, or as open shift
        if (employeeIds && employeeIds.length > 0) {
          for (const empId of employeeIds) {
            shifts.push({
              date: dateStr,
              employeeId: empId,
            });
          }
        } else {
          shifts.push({
            date: dateStr,
            employeeId: null,
            isOpen: true,
          });
        }
      }
    }

    // Insert shifts
    const insertedShifts = [];
    for (const shift of shifts) {
      const result = await db.query(
        `INSERT INTO shifts (
          organization_id, date, start_time, end_time, break_minutes,
          location_id, role_id, employee_id, is_open
        ) VALUES (
          $1, $2, 
          ($2::date + $3::time), 
          ($2::date + $4::time),
          $5, $6, $7, $8, $9
        )
        RETURNING *`,
        [
          req.user.organizationId, shift.date,
          template.start_time, template.end_time, template.break_minutes,
          template.location_id, template.role_id, shift.employeeId, shift.isOpen || false
        ]
      );
      insertedShifts.push(result.rows[0]);
    }

    res.status(201).json({ 
      success: true, 
      shiftsCreated: insertedShifts.length,
      shifts: insertedShifts,
    });
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// ============================================================
// PAYROLL EXPORT
// ============================================================

/**
 * GET /api/payroll/export - Export payroll data
 */
router.get('/payroll/export', requireRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, format = 'json', locationId, departmentId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    let query = `
      SELECT 
        e.employee_id as employee_code,
        e.first_name,
        e.last_name,
        e.email,
        d.name as department,
        l.name as location,
        DATE(te.clock_in) as date,
        te.clock_in,
        te.clock_out,
        te.total_hours,
        te.regular_hours,
        te.overtime_hours,
        te.total_break_minutes as break_minutes,
        e.hourly_rate,
        ROUND(COALESCE(te.regular_hours, 0) * COALESCE(e.hourly_rate, 0), 2) as regular_pay,
        ROUND(COALESCE(te.overtime_hours, 0) * COALESCE(e.hourly_rate, 0) * 1.5, 2) as overtime_pay,
        te.status as entry_status
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN locations l ON l.id = te.location_id
      WHERE te.organization_id = $1
        AND te.clock_in >= $2
        AND te.clock_in < $3::date + interval '1 day'
        AND te.status = 'approved'
    `;
    const params = [req.user.organizationId, startDate, endDate];
    let paramIndex = 4;

    if (locationId) {
      query += ` AND te.location_id = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    if (departmentId) {
      query += ` AND e.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    query += ` ORDER BY e.last_name, e.first_name, te.clock_in`;

    const result = await db.query(query, params);

    // Calculate summary by employee
    const summary = {};
    for (const row of result.rows) {
      const key = row.employee_code || row.email;
      if (!summary[key]) {
        summary[key] = {
          employeeCode: row.employee_code,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          department: row.department,
          hourlyRate: row.hourly_rate,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          regularPay: 0,
          overtimePay: 0,
          totalPay: 0,
          entries: 0,
        };
      }
      summary[key].totalHours += parseFloat(row.total_hours || 0);
      summary[key].regularHours += parseFloat(row.regular_hours || 0);
      summary[key].overtimeHours += parseFloat(row.overtime_hours || 0);
      summary[key].regularPay += parseFloat(row.regular_pay || 0);
      summary[key].overtimePay += parseFloat(row.overtime_pay || 0);
      summary[key].totalPay += parseFloat(row.regular_pay || 0) + parseFloat(row.overtime_pay || 0);
      summary[key].entries++;
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Employee Code', 'First Name', 'Last Name', 'Email', 'Department', 'Location',
        'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Regular Hours', 'Overtime Hours',
        'Break Minutes', 'Hourly Rate', 'Regular Pay', 'Overtime Pay'
      ];
      
      let csv = headers.join(',') + '\n';
      for (const row of result.rows) {
        csv += [
          row.employee_code,
          row.first_name,
          row.last_name,
          row.email,
          row.department,
          row.location,
          row.date,
          row.clock_in,
          row.clock_out,
          row.total_hours,
          row.regular_hours,
          row.overtime_hours,
          row.break_minutes,
          row.hourly_rate,
          row.regular_pay,
          row.overtime_pay
        ].map(v => `"${v || ''}"`).join(',') + '\n';
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payroll-${startDate}-${endDate}.csv"`);
      return res.send(csv);
    }

    res.json({
      period: { startDate, endDate },
      entries: result.rows,
      summary: Object.values(summary),
      totals: {
        totalHours: Object.values(summary).reduce((a, b) => a + b.totalHours, 0),
        regularHours: Object.values(summary).reduce((a, b) => a + b.regularHours, 0),
        overtimeHours: Object.values(summary).reduce((a, b) => a + b.overtimeHours, 0),
        totalPay: Object.values(summary).reduce((a, b) => a + b.totalPay, 0),
        employees: Object.keys(summary).length,
      },
    });
  } catch (error) {
    console.error('Payroll export error:', error);
    res.status(500).json({ error: 'Failed to export payroll' });
  }
});

export default router;
