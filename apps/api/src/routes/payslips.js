// ============================================================
// PAYSLIPS API ROUTES
// Employee payslips and earnings management
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== EMPLOYEE VIEW ====================

// Get my payslips
router.get('/my-payslips', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { year, limit = 12 } = req.query;

    // Get employee ID
    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employee.rows[0].id;

    let query = `
      SELECT p.*,
             (SELECT json_agg(json_build_object(
               'id', pi.id,
               'item_type', pi.item_type,
               'category', pi.category,
               'description', pi.description,
               'amount', pi.amount,
               'quantity', pi.quantity,
               'rate', pi.rate
             ) ORDER BY pi.sort_order, pi.item_type)
             FROM payslip_items pi WHERE pi.payslip_id = p.id) as items
      FROM payslips p
      WHERE p.employee_id = $1
        AND p.organization_id = $2
        AND p.status IN ('sent', 'viewed')
    `;
    const params = [employeeId, organizationId];

    if (year) {
      query += ` AND EXTRACT(YEAR FROM p.pay_date) = $${params.length + 1}`;
      params.push(parseInt(year));
    }

    query += ` ORDER BY p.pay_date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const payslips = await db.query(query, params);

    res.json({ payslips: payslips.rows });
  } catch (error) {
    console.error('Failed to get payslips:', error);
    res.status(500).json({ error: 'Failed to get payslips' });
  }
});

// Get single payslip with full details
router.get('/my-payslips/:id', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const payslip = await db.query(`
      SELECT p.*,
             e.first_name, e.last_name, e.employee_number,
             (SELECT json_agg(json_build_object(
               'id', pi.id,
               'item_type', pi.item_type,
               'category', pi.category,
               'description', pi.description,
               'amount', pi.amount,
               'quantity', pi.quantity,
               'rate', pi.rate,
               'is_taxable', pi.is_taxable,
               'is_pensionable', pi.is_pensionable
             ) ORDER BY pi.sort_order, pi.item_type)
             FROM payslip_items pi WHERE pi.payslip_id = p.id) as items
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.id = $1 AND p.employee_id = $2 AND p.status IN ('sent', 'viewed')
    `, [req.params.id, employee.rows[0].id]);

    if (payslip.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    // Mark as viewed if not already
    if (payslip.rows[0].status === 'sent') {
      await db.query(`
        UPDATE payslips SET status = 'viewed', updated_at = NOW() WHERE id = $1
      `, [req.params.id]);
    }

    res.json({ payslip: payslip.rows[0] });
  } catch (error) {
    console.error('Failed to get payslip:', error);
    res.status(500).json({ error: 'Failed to get payslip' });
  }
});

// Get my year-to-date summary
router.get('/my-ytd', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { taxYear } = req.query;

    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Determine tax year (UK tax year runs April to April)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const defaultTaxYear = currentMonth >= 4
      ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
      : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;

    const year = taxYear || defaultTaxYear;

    const ytd = await db.query(`
      SELECT * FROM payslip_ytd
      WHERE employee_id = $1 AND organization_id = $2 AND tax_year = $3
    `, [employee.rows[0].id, organizationId, year]);

    if (ytd.rows.length === 0) {
      // Return empty YTD if no records
      return res.json({
        ytd: {
          tax_year: year,
          gross_pay_ytd: 0,
          taxable_pay_ytd: 0,
          tax_paid_ytd: 0,
          ni_paid_ytd: 0,
          pension_ytd: 0,
          student_loan_ytd: 0,
          net_pay_ytd: 0,
          regular_hours_ytd: 0,
          overtime_hours_ytd: 0,
          holiday_hours_ytd: 0
        }
      });
    }

    res.json({ ytd: ytd.rows[0] });
  } catch (error) {
    console.error('Failed to get YTD:', error);
    res.status(500).json({ error: 'Failed to get YTD summary' });
  }
});

// Get available years for filtering
router.get('/my-years', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const years = await db.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM pay_date)::INTEGER as year
      FROM payslips
      WHERE employee_id = $1 AND status IN ('sent', 'viewed')
      ORDER BY year DESC
    `, [employee.rows[0].id]);

    res.json({ years: years.rows.map(r => r.year) });
  } catch (error) {
    console.error('Failed to get years:', error);
    res.status(500).json({ error: 'Failed to get years' });
  }
});

// ==================== ADMIN VIEW ====================

// Get all payslips (admin)
router.get('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { status, employeeId, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT p.*,
             e.first_name, e.last_name, e.employee_number,
             d.name as department_name
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE p.organization_id = $1
    `;
    const params = [organizationId];

    if (status) {
      query += ` AND p.status = $${params.length + 1}`;
      params.push(status);
    }

    if (employeeId) {
      query += ` AND p.employee_id = $${params.length + 1}`;
      params.push(employeeId);
    }

    if (startDate) {
      query += ` AND p.pay_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND p.pay_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY p.pay_date DESC, e.last_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const payslips = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM payslips p WHERE p.organization_id = $1`;
    const countParams = [organizationId];

    if (status) {
      countQuery += ` AND p.status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    const total = await db.query(countQuery, countParams);

    res.json({
      payslips: payslips.rows,
      total: parseInt(total.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Failed to get payslips:', error);
    res.status(500).json({ error: 'Failed to get payslips' });
  }
});

// Create payslip (admin)
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      grossPay,
      netPay,
      regularHours,
      overtimeHours,
      holidayHours,
      items,
      notes,
      includeApprovedBonuses = true
    } = req.body;

    if (!employeeId || !payPeriodStart || !payPeriodEnd || !payDate || grossPay === undefined || netPay === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Start transaction
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Check for approved bonus payouts for this employee and period
      let bonusPayouts = [];
      if (includeApprovedBonuses) {
        const bonusResult = await client.query(`
          SELECT bp.*, ps.period as score_period
          FROM bonus_payouts bp
          LEFT JOIN performance_scores ps ON ps.id = bp.performance_score_id
          WHERE bp.employee_id = $1
            AND bp.organization_id = $2
            AND bp.status = 'approved'
            AND bp.payroll_run_id IS NULL
        `, [employeeId, organizationId]);
        bonusPayouts = bonusResult.rows;
      }

      // Calculate total bonus amount to add to gross
      const totalBonusAmount = bonusPayouts.reduce((sum, bp) => sum + parseFloat(bp.payout_amount), 0);
      const adjustedGrossPay = parseFloat(grossPay) + totalBonusAmount;

      // Create payslip
      const payslip = await client.query(`
        INSERT INTO payslips (
          organization_id, employee_id, pay_period_start, pay_period_end, pay_date,
          gross_pay, net_pay, regular_hours, overtime_hours, holiday_hours, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        organizationId, employeeId, payPeriodStart, payPeriodEnd, payDate,
        adjustedGrossPay, netPay, regularHours || 0, overtimeHours || 0, holidayHours || 0, notes
      ]);

      let sortOrder = 0;

      // Add line items
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await client.query(`
            INSERT INTO payslip_items (
              payslip_id, item_type, category, description, amount, quantity, rate, is_taxable, is_pensionable, sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            payslip.rows[0].id,
            item.itemType,
            item.category,
            item.description,
            item.amount,
            item.quantity,
            item.rate,
            item.isTaxable !== false,
            item.isPensionable !== false,
            sortOrder++
          ]);
        }
      }

      // Add performance bonus line items
      for (const bonus of bonusPayouts) {
        await client.query(`
          INSERT INTO payslip_items (
            payslip_id, item_type, category, description, amount, is_taxable, is_pensionable, sort_order
          )
          VALUES ($1, 'earning', 'performance_bonus', $2, $3, true, false, $4)
        `, [
          payslip.rows[0].id,
          `Performance Bonus (${bonus.period}) - ${bonus.score_percentage}% score`,
          bonus.payout_amount,
          sortOrder++
        ]);

        // Mark bonus payout as paid and link to payroll
        await client.query(`
          UPDATE bonus_payouts
          SET status = 'paid', paid_at = NOW(), payroll_run_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [payslip.rows[0].id, bonus.id]);
      }

      await client.query('COMMIT');

      res.status(201).json({ payslip: payslip.rows[0], bonusesIncluded: bonusPayouts.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to create payslip:', error);
    res.status(500).json({ error: 'Failed to create payslip' });
  }
});

// Update payslip status (admin)
router.patch('/:id/status', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { status } = req.body;

    const validStatuses = ['draft', 'pending', 'approved', 'sent', 'viewed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(`
      UPDATE payslips
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND organization_id = $3
      RETURNING *
    `, [status, req.params.id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    res.json({ payslip: result.rows[0] });
  } catch (error) {
    console.error('Failed to update payslip status:', error);
    res.status(500).json({ error: 'Failed to update payslip status' });
  }
});

// Send payslips to employees (bulk)
router.post('/send', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { payslipIds } = req.body;

    if (!payslipIds || payslipIds.length === 0) {
      return res.status(400).json({ error: 'No payslip IDs provided' });
    }

    const result = await db.query(`
      UPDATE payslips
      SET status = 'sent', updated_at = NOW()
      WHERE id = ANY($1) AND organization_id = $2 AND status IN ('draft', 'pending', 'approved')
      RETURNING id
    `, [payslipIds, organizationId]);

    res.json({
      sent: result.rows.length,
      message: `${result.rows.length} payslip(s) sent successfully`
    });
  } catch (error) {
    console.error('Failed to send payslips:', error);
    res.status(500).json({ error: 'Failed to send payslips' });
  }
});

// Payroll summary report
router.get('/report', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate, departmentId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    let query = `
      SELECT
        COUNT(DISTINCT p.id) as payslip_count,
        COUNT(DISTINCT p.employee_id) as employee_count,
        SUM(p.gross_pay) as total_gross,
        SUM(p.net_pay) as total_net,
        SUM(p.regular_hours) as total_regular_hours,
        SUM(p.overtime_hours) as total_overtime_hours,
        AVG(p.gross_pay) as avg_gross,
        AVG(p.net_pay) as avg_net
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.organization_id = $1
        AND p.pay_date BETWEEN $2 AND $3
        AND p.status IN ('approved', 'sent', 'viewed')
    `;
    const params = [organizationId, startDate, endDate];

    if (departmentId) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(departmentId);
    }

    const summary = await db.query(query, params);

    // Get deductions breakdown
    const deductions = await db.query(`
      SELECT pi.category, SUM(pi.amount) as total
      FROM payslip_items pi
      JOIN payslips p ON p.id = pi.payslip_id
      WHERE p.organization_id = $1
        AND p.pay_date BETWEEN $2 AND $3
        AND p.status IN ('approved', 'sent', 'viewed')
        AND pi.item_type = 'deduction'
      GROUP BY pi.category
      ORDER BY total DESC
    `, [organizationId, startDate, endDate]);

    res.json({
      summary: summary.rows[0],
      deductions: deductions.rows
    });
  } catch (error) {
    console.error('Failed to get payroll report:', error);
    res.status(500).json({ error: 'Failed to get payroll report' });
  }
});

// Update YTD (typically called after payslip is finalized)
router.post('/update-ytd/:payslipId', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Get payslip details
    const payslip = await db.query(`
      SELECT p.*, e.id as employee_id
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.id = $1 AND p.organization_id = $2
    `, [req.params.payslipId, organizationId]);

    if (payslip.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    const ps = payslip.rows[0];

    // Determine tax year
    const payDate = new Date(ps.pay_date);
    const month = payDate.getMonth() + 1;
    const year = payDate.getFullYear();
    const taxYear = month >= 4
      ? `${year}-${(year + 1).toString().slice(-2)}`
      : `${year - 1}-${year.toString().slice(-2)}`;

    // Get deduction totals from line items
    const items = await db.query(`
      SELECT category, SUM(amount) as total
      FROM payslip_items
      WHERE payslip_id = $1 AND item_type = 'deduction'
      GROUP BY category
    `, [ps.id]);

    const deductions = {};
    items.rows.forEach(item => {
      deductions[item.category] = parseInt(item.total);
    });

    // Upsert YTD record
    await db.query(`
      INSERT INTO payslip_ytd (
        organization_id, employee_id, tax_year,
        gross_pay_ytd, taxable_pay_ytd, tax_paid_ytd, ni_paid_ytd, pension_ytd, net_pay_ytd,
        regular_hours_ytd, overtime_hours_ytd, holiday_hours_ytd
      )
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (organization_id, employee_id, tax_year)
      DO UPDATE SET
        gross_pay_ytd = payslip_ytd.gross_pay_ytd + $4,
        taxable_pay_ytd = payslip_ytd.taxable_pay_ytd + $4,
        tax_paid_ytd = payslip_ytd.tax_paid_ytd + $5,
        ni_paid_ytd = payslip_ytd.ni_paid_ytd + $6,
        pension_ytd = payslip_ytd.pension_ytd + $7,
        net_pay_ytd = payslip_ytd.net_pay_ytd + $8,
        regular_hours_ytd = payslip_ytd.regular_hours_ytd + $9,
        overtime_hours_ytd = payslip_ytd.overtime_hours_ytd + $10,
        holiday_hours_ytd = payslip_ytd.holiday_hours_ytd + $11,
        updated_at = NOW()
    `, [
      organizationId,
      ps.employee_id,
      taxYear,
      ps.gross_pay,
      deductions['tax'] || 0,
      deductions['ni'] || deductions['national_insurance'] || 0,
      deductions['pension'] || 0,
      ps.net_pay,
      ps.regular_hours || 0,
      ps.overtime_hours || 0,
      ps.holiday_hours || 0
    ]);

    res.json({ success: true, taxYear });
  } catch (error) {
    console.error('Failed to update YTD:', error);
    res.status(500).json({ error: 'Failed to update YTD' });
  }
});

export default router;
