// ============================================================
// UTILITY ROUTES
// Global search, bulk import, webhooks, advanced reporting
// ============================================================

import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import * as billingService from '../services/billing.js';

const router = Router();
router.use(authMiddleware);

// ============================================================
// GLOBAL SEARCH
// ============================================================

/**
 * GET /api/search - Search across all entities
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q}%`;
    const results = {
      employees: [],
      locations: [],
      shifts: [],
      jobs: [],
    };

    // Search employees
    if (!type || type === 'employees') {
      const empResult = await db.query(
        `SELECT id, first_name, last_name, email, avatar_url, 'employee' as type
         FROM employees
         WHERE organization_id = $1 
           AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2)
           AND status = 'active'
         LIMIT $3`,
        [req.user.organizationId, searchTerm, limit]
      );
      results.employees = empResult.rows;
    }

    // Search locations
    if (!type || type === 'locations') {
      const locResult = await db.query(
        `SELECT id, name, address, 'location' as type
         FROM locations
         WHERE organization_id = $1 
           AND (name ILIKE $2 OR address ILIKE $2)
           AND is_active = true
         LIMIT $3`,
        [req.user.organizationId, searchTerm, limit]
      );
      results.locations = locResult.rows;
    }

    // Search upcoming shifts
    if (!type || type === 'shifts') {
      const shiftResult = await db.query(
        `SELECT s.id, s.date, s.start_time, s.end_time,
                l.name as location_name,
                e.first_name || ' ' || e.last_name as employee_name,
                'shift' as type
         FROM shifts s
         JOIN locations l ON l.id = s.location_id
         LEFT JOIN employees e ON e.id = s.employee_id
         WHERE s.organization_id = $1 
           AND s.date >= CURRENT_DATE
           AND (l.name ILIKE $2 OR e.first_name ILIKE $2 OR e.last_name ILIKE $2)
         ORDER BY s.date
         LIMIT $3`,
        [req.user.organizationId, searchTerm, limit]
      );
      results.shifts = shiftResult.rows;
    }

    // Search job postings
    if (!type || type === 'jobs') {
      const jobResult = await db.query(
        `SELECT id, title, status, 'job' as type
         FROM job_postings
         WHERE organization_id = $1 
           AND title ILIKE $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [req.user.organizationId, searchTerm, limit]
      );
      results.jobs = jobResult.rows;
    }

    // Flatten for unified results
    const all = [
      ...results.employees,
      ...results.locations,
      ...results.shifts,
      ...results.jobs,
    ].slice(0, limit);

    res.json({ 
      results,
      all,
      query: q,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================================
// BULK IMPORT
// ============================================================

/**
 * POST /api/import/employees - Bulk import employees from CSV/JSON
 */
router.post('/import/employees', requireRole(['admin']), async (req, res) => {
  try {
    const { employees, sendInvitations = true, defaultRoleId, defaultDepartmentId, defaultLocationId } = req.body;

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'Employees array is required' });
    }

    // Check seat availability for bulk import
    const seatUsage = await billingService.getSeatUsage(req.user.organizationId);
    const totalPurchased = (seatUsage.core_purchased || 0) + (seatUsage.flex_purchased || 0);
    const totalUsed = (parseInt(seatUsage.core_used) || 0) + (parseInt(seatUsage.flex_used) || 0);
    const availableSeats = totalPurchased - totalUsed;

    if (availableSeats <= 0) {
      return res.status(403).json({
        error: 'No seats available for import. Please increase your seat allocation.',
        code: 'SEAT_LIMIT_EXCEEDED',
        availableSeats: 0,
        requested: employees.length,
      });
    }

    if (employees.length > availableSeats) {
      return res.status(403).json({
        error: `Only ${availableSeats} seat(s) available, but ${employees.length} employees requested for import.`,
        code: 'SEAT_LIMIT_EXCEEDED',
        availableSeats,
        requested: employees.length,
      });
    }

    const results = {
      created: [],
      failed: [],
      skipped: [],
    };

    let seatsUsedInBatch = 0;
    const maxSeatsForBatch = availableSeats;

    for (const emp of employees) {
      try {
        // Check if we've exceeded seat limit during import
        if (seatsUsedInBatch >= maxSeatsForBatch) {
          results.failed.push({
            email: emp.email,
            error: 'Seat limit reached during import',
          });
          continue;
        }

        // Validate required fields
        if (!emp.email || !emp.firstName || !emp.lastName) {
          results.failed.push({
            email: emp.email,
            error: 'Missing required fields (email, firstName, lastName)',
          });
          continue;
        }

        // Check if exists
        const existing = await db.query(
          `SELECT id FROM employees WHERE email = $1 AND organization_id = $2`,
          [emp.email.toLowerCase(), req.user.organizationId]
        );

        if (existing.rows[0]) {
          results.skipped.push({
            email: emp.email,
            reason: 'Employee already exists',
          });
          continue;
        }

        // Determine seat type (core first, then flex)
        const seatType = (seatsUsedInBatch < (seatUsage.core_purchased - parseInt(seatUsage.core_used))) ? 'core' : 'flex';
        seatsUsedInBatch++;

        // Create employee with seat type
        const empResult = await db.query(
          `INSERT INTO employees (
            organization_id, email, first_name, last_name, phone,
            department_id, role_id, location_id, hourly_rate,
            hire_date, employee_id, status, seat_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12)
          RETURNING *`,
          [
            req.user.organizationId,
            emp.email.toLowerCase(),
            emp.firstName,
            emp.lastName,
            emp.phone || null,
            emp.departmentId || defaultDepartmentId || null,
            emp.roleId || defaultRoleId || null,
            emp.locationId || defaultLocationId || null,
            emp.hourlyRate || null,
            emp.hireDate || new Date(),
            emp.employeeId || null,
            seatType,
          ]
        );

        // Create user account if sendInvitations
        if (sendInvitations) {
          const invitationToken = crypto.randomBytes(32).toString('hex');
          const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          await db.query(
            `INSERT INTO users (
              organization_id, email, first_name, last_name, employee_id,
              role, status, invitation_token, invitation_expires, invited_by, invited_at
            ) VALUES ($1, $2, $3, $4, $5, 'worker', 'invited', $6, $7, $8, NOW())`,
            [
              req.user.organizationId,
              emp.email.toLowerCase(),
              emp.firstName,
              emp.lastName,
              empResult.rows[0].id,
              invitationToken,
              invitationExpires,
              req.user.userId,
            ]
          );

          // Queue invitation email
          const { emailService } = await import('../services/email.js');
          await emailService.sendInvitation({
            email: emp.email,
            first_name: emp.firstName,
            last_name: emp.lastName,
            invitationToken,
            invitedBy: req.user,
          });
        }

        results.created.push(empResult.rows[0]);
      } catch (err) {
        results.failed.push({
          email: emp.email,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      summary: {
        total: employees.length,
        created: results.created.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      },
      results,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

/**
 * GET /api/import/template - Get import template
 */
router.get('/import/template', requireRole(['admin']), async (req, res) => {
  const template = {
    employees: [
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+44 7700 900000',
        hourlyRate: 15.50,
        hireDate: '2024-01-15',
        employeeId: 'EMP001',
        departmentId: null,
        roleId: null,
        locationId: null,
      }
    ],
    notes: {
      required: ['email', 'firstName', 'lastName'],
      optional: ['phone', 'hourlyRate', 'hireDate', 'employeeId', 'departmentId', 'roleId', 'locationId'],
      dateFormat: 'YYYY-MM-DD',
    },
  };

  res.json(template);
});

// ============================================================
// WEBHOOKS
// ============================================================

/**
 * GET /api/webhooks - List webhooks
 */
router.get('/webhooks', requireRole(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM webhooks WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.user.organizationId]
    );
    res.json({ webhooks: result.rows });
  } catch (error) {
    // Table might not exist yet
    res.json({ webhooks: [] });
  }
});

/**
 * POST /api/webhooks - Create webhook
 */
router.post('/webhooks', requireRole(['admin']), async (req, res) => {
  try {
    const { url, events, secret } = req.body;

    if (!url || !events || events.length === 0) {
      return res.status(400).json({ error: 'URL and events are required' });
    }

    // Create webhooks table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        events TEXT[] NOT NULL,
        secret VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        last_triggered_at TIMESTAMPTZ,
        last_status INTEGER,
        failure_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    const result = await db.query(
      `INSERT INTO webhooks (organization_id, url, events, secret)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.organizationId, url, events, webhookSecret]
    );

    res.status(201).json({ webhook: result.rows[0] });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * DELETE /api/webhooks/:id - Delete webhook
 */
router.delete('/webhooks/:id', requireRole(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM webhooks WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

/**
 * POST /api/webhooks/:id/test - Test webhook
 */
router.post('/webhooks/:id/test', requireRole(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM webhooks WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const webhook = result.rows[0];
    const payload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook from Uplift' },
    };

    // Sign payload
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Uplift-Signature': signature,
          'X-Uplift-Event': 'test',
        },
        body: JSON.stringify(payload),
      });

      await db.query(
        `UPDATE webhooks SET last_triggered_at = NOW(), last_status = $2 WHERE id = $1`,
        [webhook.id, response.status]
      );

      res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (fetchError) {
      res.json({
        success: false,
        error: fetchError.message,
      });
    }
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// ============================================================
// ADVANCED REPORTING
// ============================================================

/**
 * GET /api/reports/hours - Hours worked report
 */
router.get('/reports/hours', requireRole(['admin', 'manager']), async (req, res) => {
  try {
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
          COALESCE(SUM(te.total_hours), 0) as total_hours,
          COALESCE(SUM(te.regular_hours), 0) as regular_hours,
          COALESCE(SUM(te.overtime_hours), 0) as overtime_hours,
          COALESCE(SUM(te.total_hours * COALESCE(e.hourly_rate, 0)), 0) as labor_cost
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
          COALESCE(SUM(te.total_hours), 0) as total_hours,
          COALESCE(SUM(te.regular_hours), 0) as regular_hours,
          COALESCE(SUM(te.overtime_hours), 0) as overtime_hours
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
          COALESCE(SUM(te.total_hours), 0) as total_hours,
          COALESCE(SUM(te.regular_hours), 0) as regular_hours,
          COALESCE(SUM(te.overtime_hours), 0) as overtime_hours
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
    } else {
      return res.status(400).json({ error: 'Invalid groupBy value' });
    }

    const result = await db.query(query, params);

    // Get totals
    const totals = await db.query(
      `SELECT
         COALESCE(SUM(total_hours), 0) as total_hours,
         COALESCE(SUM(regular_hours), 0) as regular_hours,
         COALESCE(SUM(overtime_hours), 0) as overtime_hours,
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
  } catch (error) {
    console.error('Hours report error:', error);
    res.status(500).json({ error: 'Failed to generate hours report' });
  }
});

/**
 * GET /api/reports/labor-cost - Labor cost analysis
 */
router.get('/reports/labor-cost', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'week' } = req.query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    let dateGroup;
    switch (groupBy) {
      case 'day': dateGroup = "DATE(te.clock_in)"; break;
      case 'week': dateGroup = "DATE_TRUNC('week', te.clock_in)"; break;
      case 'month': dateGroup = "DATE_TRUNC('month', te.clock_in)"; break;
      default: dateGroup = "DATE_TRUNC('week', te.clock_in)";
    }

    const result = await db.query(`
      SELECT 
        ${dateGroup} as period,
        COUNT(DISTINCT te.employee_id) as employees,
        SUM(te.total_hours) as total_hours,
        SUM(te.regular_hours) as regular_hours,
        SUM(te.overtime_hours) as overtime_hours,
        SUM(te.regular_hours * e.hourly_rate) as regular_cost,
        SUM(te.overtime_hours * e.hourly_rate * 1.5) as overtime_cost,
        SUM(te.regular_hours * e.hourly_rate + te.overtime_hours * e.hourly_rate * 1.5) as total_cost
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      WHERE te.organization_id = $1
        AND te.clock_in >= $2
        AND te.clock_in < $3::date + interval '1 day'
        AND te.status = 'approved'
      GROUP BY ${dateGroup}
      ORDER BY period
    `, [req.user.organizationId, start, end]);

    // By department
    const byDeptResult = await db.query(`
      SELECT 
        d.name as department,
        SUM(te.total_hours) as total_hours,
        SUM(te.regular_hours * e.hourly_rate + te.overtime_hours * e.hourly_rate * 1.5) as total_cost,
        COUNT(DISTINCT te.employee_id) as employees
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE te.organization_id = $1
        AND te.clock_in >= $2
        AND te.clock_in < $3::date + interval '1 day'
        AND te.status = 'approved'
      GROUP BY d.name
      ORDER BY total_cost DESC
    `, [req.user.organizationId, start, end]);

    // By location
    const byLocResult = await db.query(`
      SELECT 
        l.name as location,
        SUM(te.total_hours) as total_hours,
        SUM(te.regular_hours * e.hourly_rate + te.overtime_hours * e.hourly_rate * 1.5) as total_cost,
        COUNT(DISTINCT te.employee_id) as employees
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      JOIN locations l ON l.id = te.location_id
      WHERE te.organization_id = $1
        AND te.clock_in >= $2
        AND te.clock_in < $3::date + interval '1 day'
        AND te.status = 'approved'
      GROUP BY l.name
      ORDER BY total_cost DESC
    `, [req.user.organizationId, start, end]);

    res.json({
      period: { startDate: start, endDate: end, groupBy },
      trend: result.rows,
      byDepartment: byDeptResult.rows,
      byLocation: byLocResult.rows,
      totals: {
        totalHours: result.rows.reduce((a, b) => a + parseFloat(b.total_hours || 0), 0),
        totalCost: result.rows.reduce((a, b) => a + parseFloat(b.total_cost || 0), 0),
        overtimeHours: result.rows.reduce((a, b) => a + parseFloat(b.overtime_hours || 0), 0),
      },
    });
  } catch (error) {
    console.error('Labor cost report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/attendance - Attendance analysis
 */
router.get('/reports/attendance', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Tardiness report
    const tardinessResult = await db.query(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        COUNT(*) FILTER (WHERE te.clock_in > s.start_time + interval '5 minutes') as late_count,
        COUNT(*) FILTER (WHERE te.clock_out < s.end_time - interval '5 minutes') as early_leave_count,
        COUNT(*) as total_shifts,
        AVG(EXTRACT(EPOCH FROM (te.clock_in - s.start_time)) / 60) FILTER (WHERE te.clock_in > s.start_time) as avg_late_minutes
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      JOIN shifts s ON s.id = te.shift_id
      WHERE te.organization_id = $1
        AND te.clock_in >= $2
        AND te.clock_in < $3::date + interval '1 day'
      GROUP BY e.id
      HAVING COUNT(*) > 0
      ORDER BY late_count DESC
    `, [req.user.organizationId, start, end]);

    // Absenteeism
    const absentResult = await db.query(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        COUNT(s.id) as scheduled_shifts,
        COUNT(te.id) as worked_shifts,
        COUNT(s.id) - COUNT(te.id) as missed_shifts
      FROM employees e
      LEFT JOIN shifts s ON s.employee_id = e.id 
        AND s.date >= $2 AND s.date <= $3
      LEFT JOIN time_entries te ON te.shift_id = s.id
      WHERE e.organization_id = $1 AND e.status = 'active'
      GROUP BY e.id
      HAVING COUNT(s.id) > COUNT(te.id)
      ORDER BY missed_shifts DESC
    `, [req.user.organizationId, start, end]);

    // Summary stats
    const summaryResult = await db.query(`
      SELECT 
        COUNT(DISTINCT te.id) as time_entries,
        COUNT(DISTINCT s.id) as scheduled_shifts,
        COUNT(DISTINCT te.id) FILTER (WHERE te.clock_in > s.start_time + interval '5 minutes') as late_entries,
        AVG(te.total_hours) as avg_hours_per_shift
      FROM shifts s
      LEFT JOIN time_entries te ON te.shift_id = s.id
      WHERE s.organization_id = $1
        AND s.date >= $2 AND s.date <= $3
    `, [req.user.organizationId, start, end]);

    res.json({
      period: { startDate: start, endDate: end },
      tardiness: tardinessResult.rows,
      absenteeism: absentResult.rows,
      summary: summaryResult.rows[0],
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/coverage - Shift coverage analysis
 */
router.get('/reports/coverage', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;

    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = `
      SELECT 
        s.date,
        l.name as location,
        COUNT(*) as total_shifts,
        COUNT(*) FILTER (WHERE s.employee_id IS NOT NULL) as filled_shifts,
        COUNT(*) FILTER (WHERE s.is_open = true) as open_shifts,
        ROUND(COUNT(*) FILTER (WHERE s.employee_id IS NOT NULL)::numeric / 
              NULLIF(COUNT(*), 0) * 100, 1) as coverage_rate
      FROM shifts s
      JOIN locations l ON l.id = s.location_id
      WHERE s.organization_id = $1
        AND s.date >= $2 AND s.date <= $3
    `;
    const params = [req.user.organizationId, start, end];

    if (locationId) {
      query += ` AND s.location_id = $4`;
      params.push(locationId);
    }

    query += ` GROUP BY s.date, l.name ORDER BY s.date, l.name`;

    const result = await db.query(query, params);

    // Aggregate by location
    const byLocation = {};
    for (const row of result.rows) {
      if (!byLocation[row.location]) {
        byLocation[row.location] = {
          totalShifts: 0,
          filledShifts: 0,
          openShifts: 0,
        };
      }
      byLocation[row.location].totalShifts += parseInt(row.total_shifts);
      byLocation[row.location].filledShifts += parseInt(row.filled_shifts);
      byLocation[row.location].openShifts += parseInt(row.open_shifts);
    }

    for (const loc in byLocation) {
      byLocation[loc].coverageRate = Math.round(
        (byLocation[loc].filledShifts / byLocation[loc].totalShifts) * 100
      );
    }

    res.json({
      period: { startDate: start, endDate: end },
      daily: result.rows,
      byLocation,
      summary: {
        totalShifts: result.rows.reduce((a, b) => a + parseInt(b.total_shifts), 0),
        filledShifts: result.rows.reduce((a, b) => a + parseInt(b.filled_shifts), 0),
        openShifts: result.rows.reduce((a, b) => a + parseInt(b.open_shifts), 0),
      },
    });
  } catch (error) {
    console.error('Coverage report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/skills-matrix - Skills coverage matrix
 */
router.get('/reports/skills-matrix', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { locationId, departmentId } = req.query;

    // Get all skills
    const skillsResult = await db.query(
      `SELECT * FROM skills WHERE organization_id = $1 ORDER BY category, name`,
      [req.user.organizationId]
    );

    // Get employee skill coverage
    let empQuery = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        d.name as department,
        l.name as location,
        array_agg(es.skill_id) as skill_ids,
        COUNT(es.id) as skill_count
      FROM employees e
      LEFT JOIN employee_skills es ON es.employee_id = e.id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN locations l ON l.id = e.primary_location_id
      WHERE e.organization_id = $1 AND e.status = 'active'
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;

    if (locationId) {
      empQuery += ` AND e.primary_location_id = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    if (departmentId) {
      empQuery += ` AND e.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    empQuery += ` GROUP BY e.id, d.name, l.name ORDER BY e.last_name`;

    const empResult = await db.query(empQuery, params);

    // Calculate skill coverage
    const skillCoverage = {};
    for (const skill of skillsResult.rows) {
      const employeesWithSkill = empResult.rows.filter(
        e => (e.skill_ids || []).includes(skill.id)
      );
      skillCoverage[skill.id] = {
        skill: skill.name,
        category: skill.category,
        employeeCount: employeesWithSkill.length,
        employees: employeesWithSkill.map(e => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
        })),
      };
    }

    res.json({
      skills: skillsResult.rows,
      employees: empResult.rows,
      coverage: Object.values(skillCoverage),
      summary: {
        totalSkills: skillsResult.rows.length,
        avgSkillsPerEmployee: empResult.rows.length > 0
          ? Math.round(empResult.rows.reduce((a, b) => a + parseInt(b.skill_count || 0), 0) / empResult.rows.length * 10) / 10
          : 0,
        skillGaps: Object.values(skillCoverage).filter(s => s.employeeCount < 2).length,
      },
    });
  } catch (error) {
    console.error('Skills matrix error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
