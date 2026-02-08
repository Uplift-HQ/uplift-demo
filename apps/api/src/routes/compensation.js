// ============================================================
// COMPENSATION API ROUTES
// Salary management, history, and review cycles
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== SALARY RECORDS ====================

// Get all employees with compensation data (admin/manager)
router.get('/records', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { departmentId, search } = req.query;

    let query = `
      SELECT e.id, e.first_name, e.last_name, e.email, e.employee_number,
             e.annual_salary, e.pay_frequency, e.currency,
             e.last_salary_review, e.next_salary_review,
             d.name as department_name,
             r.name as role_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN roles r ON r.id = e.primary_role_id
      WHERE e.organization_id = $1 AND e.status = 'active'
    `;
    const params = [organizationId];

    if (departmentId) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(departmentId);
    }

    if (search) {
      query += ` AND (e.first_name ILIKE $${params.length + 1} OR e.last_name ILIKE $${params.length + 1} OR e.email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY e.last_name, e.first_name`;

    const result = await db.query(query, params);

    // Format for frontend
    const records = result.rows.map(emp => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      role: emp.role_name || 'Not assigned',
      department: emp.department_name || 'Not assigned',
      salary: emp.annual_salary || 0,
      frequency: emp.pay_frequency || 'Annual',
      currency: emp.currency || 'GBP',
      lastReview: emp.last_salary_review,
      nextReview: emp.next_salary_review,
    }));

    res.json({ records });
  } catch (error) {
    console.error('Failed to get compensation records:', error);
    res.status(500).json({ error: 'Failed to get compensation records' });
  }
});

// Get salary history for an employee
router.get('/records/:employeeId/history', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { employeeId } = req.params;

    const result = await db.query(`
      SELECT sh.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM salary_history sh
      LEFT JOIN users u ON u.id = sh.created_by
      WHERE sh.employee_id = $1 AND sh.organization_id = $2
      ORDER BY sh.effective_date DESC
    `, [employeeId, organizationId]);

    const history = result.rows.map(h => ({
      date: h.effective_date,
      salary: h.new_salary,
      previousSalary: h.previous_salary,
      change: h.change_percentage ? `${h.change_percentage > 0 ? '+' : ''}${h.change_percentage}%` : null,
      reason: h.reason,
      notes: h.notes,
      createdBy: h.created_by_name,
    }));

    res.json({ history });
  } catch (error) {
    console.error('Failed to get salary history:', error);
    res.status(500).json({ error: 'Failed to get salary history' });
  }
});

// Update employee compensation
router.put('/records/:employeeId', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { employeeId } = req.params;
    const { newSalary, reason, effectiveDate, notes } = req.body;

    if (!newSalary || !effectiveDate) {
      return res.status(400).json({ error: 'New salary and effective date are required' });
    }

    // Get current salary
    const current = await db.query(`
      SELECT annual_salary FROM employees WHERE id = $1 AND organization_id = $2
    `, [employeeId, organizationId]);

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const previousSalary = current.rows[0].annual_salary || 0;
    const changePercent = previousSalary > 0
      ? ((newSalary - previousSalary) / previousSalary * 100).toFixed(2)
      : null;

    // Use transaction
    await db.transaction(async (client) => {
      // Update employee salary
      await client.query(`
        UPDATE employees
        SET annual_salary = $1, last_salary_review = $2, updated_at = NOW()
        WHERE id = $3 AND organization_id = $4
      `, [newSalary, effectiveDate, employeeId, organizationId]);

      // Add to history
      await client.query(`
        INSERT INTO salary_history (
          organization_id, employee_id, previous_salary, new_salary,
          change_percentage, effective_date, reason, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        organizationId, employeeId, previousSalary, newSalary,
        changePercent, effectiveDate, reason, notes, userId
      ]);
    });

    res.json({ success: true, message: 'Compensation updated' });
  } catch (error) {
    console.error('Failed to update compensation:', error);
    res.status(500).json({ error: 'Failed to update compensation' });
  }
});

// ==================== COMPENSATION CYCLES ====================

// Get all cycles
router.get('/cycles', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { status } = req.query;

    let query = `
      SELECT cc.*,
             u.first_name || ' ' || u.last_name as created_by_name,
             (SELECT COUNT(*) FROM compensation_cycle_participants WHERE cycle_id = cc.id) as participant_count
      FROM compensation_cycles cc
      LEFT JOIN users u ON u.id = cc.created_by
      WHERE cc.organization_id = $1
    `;
    const params = [organizationId];

    if (status) {
      query += ` AND cc.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY cc.effective_date DESC`;

    const result = await db.query(query, params);

    const cycles = result.rows.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      budget: c.budget || 0,
      allocated: c.allocated || 0,
      effectiveDate: c.effective_date,
      participants: c.participant_count,
      createdBy: c.created_by_name,
    }));

    res.json({ cycles });
  } catch (error) {
    console.error('Failed to get compensation cycles:', error);
    res.status(500).json({ error: 'Failed to get compensation cycles' });
  }
});

// Get cycle details
router.get('/cycles/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const cycleResult = await db.query(`
      SELECT cc.*,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM compensation_cycles cc
      LEFT JOIN users u ON u.id = cc.created_by
      WHERE cc.id = $1 AND cc.organization_id = $2
    `, [id, organizationId]);

    if (cycleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    const participantsResult = await db.query(`
      SELECT ccp.*, e.first_name, e.last_name, e.annual_salary as current_db_salary,
             d.name as department_name
      FROM compensation_cycle_participants ccp
      JOIN employees e ON e.id = ccp.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE ccp.cycle_id = $1
      ORDER BY e.last_name, e.first_name
    `, [id]);

    const cycle = cycleResult.rows[0];

    res.json({
      cycle: {
        id: cycle.id,
        name: cycle.name,
        description: cycle.description,
        status: cycle.status,
        budget: cycle.budget,
        allocated: cycle.allocated,
        effectiveDate: cycle.effective_date,
        startDate: cycle.start_date,
        endDate: cycle.end_date,
        createdBy: cycle.created_by_name,
      },
      participants: participantsResult.rows.map(p => ({
        id: p.id,
        employeeId: p.employee_id,
        name: `${p.first_name} ${p.last_name}`,
        department: p.department_name,
        currentSalary: p.current_salary || p.current_db_salary || 0,
        proposedSalary: p.proposed_salary,
        proposedChange: p.proposed_change_percent,
        status: p.status,
        managerNotes: p.manager_notes,
      })),
    });
  } catch (error) {
    console.error('Failed to get cycle:', error);
    res.status(500).json({ error: 'Failed to get cycle' });
  }
});

// Create a new cycle
router.post('/cycles', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { name, description, budget, effectiveDate, employeeIds } = req.body;

    if (!name || !effectiveDate) {
      return res.status(400).json({ error: 'Name and effective date are required' });
    }

    const cycle = await db.transaction(async (client) => {
      // Create cycle
      const result = await client.query(`
        INSERT INTO compensation_cycles (
          organization_id, name, description, budget, effective_date, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, 'draft', $6)
        RETURNING *
      `, [organizationId, name, description, budget || 0, effectiveDate, userId]);

      const cycleId = result.rows[0].id;

      // Add participants if provided
      if (employeeIds && employeeIds.length > 0) {
        for (const empId of employeeIds) {
          const emp = await client.query(
            `SELECT annual_salary FROM employees WHERE id = $1 AND organization_id = $2`,
            [empId, organizationId]
          );

          if (emp.rows.length > 0) {
            await client.query(`
              INSERT INTO compensation_cycle_participants (cycle_id, employee_id, current_salary)
              VALUES ($1, $2, $3)
            `, [cycleId, empId, emp.rows[0].annual_salary || 0]);
          }
        }
      }

      return result.rows[0];
    });

    res.status(201).json({ cycle });
  } catch (error) {
    console.error('Failed to create cycle:', error);
    res.status(500).json({ error: 'Failed to create cycle' });
  }
});

// Update cycle status
router.patch('/cycles/:id/status', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = { status };
    if (status === 'completed') {
      updates.approved_by = userId;
      updates.approved_at = new Date().toISOString();
    }

    const result = await db.query(`
      UPDATE compensation_cycles
      SET status = $1, approved_by = $2, approved_at = $3, updated_at = NOW()
      WHERE id = $4 AND organization_id = $5
      RETURNING *
    `, [status, updates.approved_by || null, updates.approved_at || null, id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    res.json({ cycle: result.rows[0] });
  } catch (error) {
    console.error('Failed to update cycle status:', error);
    res.status(500).json({ error: 'Failed to update cycle status' });
  }
});

// ==================== PAYSLIP STATS ====================

// Get payroll dashboard/stats
router.get('/stats', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Get payslip totals
    const payslipStats = await db.query(`
      SELECT
        SUM(gross_pay) FILTER (WHERE status IN ('sent', 'viewed', 'approved')) as total_gross,
        SUM(net_pay) FILTER (WHERE status IN ('sent', 'viewed', 'approved')) as total_net,
        COUNT(*) FILTER (WHERE status = 'pending' OR status = 'draft') as pending_count,
        COUNT(DISTINCT employee_id) as employee_count
      FROM payslips
      WHERE organization_id = $1
        AND pay_date >= DATE_TRUNC('year', CURRENT_DATE)
    `, [organizationId]);

    // Get salary stats
    const salaryStats = await db.query(`
      SELECT
        AVG(annual_salary) as avg_salary,
        MIN(annual_salary) FILTER (WHERE annual_salary > 0) as min_salary,
        MAX(annual_salary) as max_salary,
        COUNT(*) FILTER (WHERE annual_salary IS NOT NULL AND annual_salary > 0) as with_salary
      FROM employees
      WHERE organization_id = $1 AND status = 'active'
    `, [organizationId]);

    res.json({
      payroll: {
        totalGross: payslipStats.rows[0].total_gross || 0,
        totalNet: payslipStats.rows[0].total_net || 0,
        pendingCount: parseInt(payslipStats.rows[0].pending_count) || 0,
        employeeCount: parseInt(payslipStats.rows[0].employee_count) || 0,
      },
      salary: {
        average: salaryStats.rows[0].avg_salary || 0,
        min: salaryStats.rows[0].min_salary || 0,
        max: salaryStats.rows[0].max_salary || 0,
        withSalary: parseInt(salaryStats.rows[0].with_salary) || 0,
      },
    });
  } catch (error) {
    console.error('Failed to get compensation stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
