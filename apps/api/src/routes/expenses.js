// ============================================================
// EXPENSES API ROUTES
// Employee expense claims and reimbursements
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== CATEGORIES ====================

// Get expense categories
router.get('/categories', async (req, res) => {
  try {
    const { organizationId } = req.user;

    const categories = await db.query(`
      SELECT * FROM expense_categories
      WHERE organization_id = $1 AND is_active = true
      ORDER BY name
    `, [organizationId]);

    res.json({ categories: categories.rows });
  } catch (error) {
    console.error('Failed to get categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Create category (admin only)
router.post('/categories', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { name, description, maxAmount, requiresReceipt, requiresApproval, glCode } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await db.query(`
      INSERT INTO expense_categories (organization_id, name, description, max_amount, requires_receipt, requires_approval, gl_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [organizationId, name, description, maxAmount, requiresReceipt !== false, requiresApproval !== false, glCode]);

    res.status(201).json({ category: category.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }
    console.error('Failed to create category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.patch('/categories/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { name, description, maxAmount, requiresReceipt, requiresApproval, glCode, isActive } = req.body;

    const result = await db.query(`
      UPDATE expense_categories
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          max_amount = COALESCE($3, max_amount),
          requires_receipt = COALESCE($4, requires_receipt),
          requires_approval = COALESCE($5, requires_approval),
          gl_code = COALESCE($6, gl_code),
          is_active = COALESCE($7, is_active)
      WHERE id = $8 AND organization_id = $9
      RETURNING *
    `, [name, description, maxAmount, requiresReceipt, requiresApproval, glCode, isActive, req.params.id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Failed to update category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ==================== EMPLOYEE CLAIMS ====================

// Get my expenses
router.get('/my-expenses', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    // Get employee ID
    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employee.rows[0].id;

    let query = `
      SELECT ec.*,
             cat.name as category_name,
             cat.requires_receipt,
             ru.first_name || ' ' || ru.last_name as reviewed_by_name
      FROM expense_claims ec
      LEFT JOIN expense_categories cat ON cat.id = ec.category_id
      LEFT JOIN users ru ON ru.id = ec.reviewed_by
      WHERE ec.employee_id = $1
    `;
    const params = [employeeId];

    if (status) {
      query += ` AND ec.status = $${params.length + 1}`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND ec.expense_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND ec.expense_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY ec.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const expenses = await db.query(query, params);

    // Calculate totals
    const totals = await db.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_total,
        COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as approved_total,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count
      FROM expense_claims
      WHERE employee_id = $1
    `, [employeeId]);

    res.json({
      expenses: expenses.rows,
      totals: totals.rows[0] || {},
    });
  } catch (error) {
    console.error('Failed to get expenses:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// Get single expense claim
router.get('/my-expenses/:id', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const expense = await db.query(`
      SELECT ec.*,
             cat.name as category_name,
             cat.requires_receipt,
             ru.first_name || ' ' || ru.last_name as reviewed_by_name
      FROM expense_claims ec
      LEFT JOIN expense_categories cat ON cat.id = ec.category_id
      LEFT JOIN users ru ON ru.id = ec.reviewed_by
      WHERE ec.id = $1 AND ec.employee_id = $2
    `, [req.params.id, employee.rows[0].id]);

    if (expense.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ expense: expense.rows[0] });
  } catch (error) {
    console.error('Failed to get expense:', error);
    res.status(500).json({ error: 'Failed to get expense' });
  }
});

// Create expense claim
router.post('/claims', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { description, categoryId, amount, expenseDate, receiptUrl, notes, tags, status } = req.body;

    if (!description || !amount || !expenseDate) {
      return res.status(400).json({ error: 'Description, amount, and expense date are required' });
    }

    // Get employee ID
    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check category limit if category is specified
    if (categoryId) {
      const category = await db.query(`
        SELECT max_amount, requires_receipt FROM expense_categories WHERE id = $1 AND organization_id = $2
      `, [categoryId, organizationId]);

      if (category.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      if (category.rows[0].max_amount && amount > category.rows[0].max_amount) {
        return res.status(400).json({
          error: `Amount exceeds category limit of ${(category.rows[0].max_amount / 100).toFixed(2)}`
        });
      }

      if (category.rows[0].requires_receipt && !receiptUrl) {
        return res.status(400).json({ error: 'Receipt is required for this category' });
      }
    }

    const claim = await db.query(`
      INSERT INTO expense_claims (
        organization_id, employee_id, description, category_id,
        amount, expense_date, receipt_url, notes, tags, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      organizationId,
      employee.rows[0].id,
      description,
      categoryId,
      amount,
      expenseDate,
      receiptUrl,
      notes,
      tags,
      status || 'pending'
    ]);

    res.status(201).json({ claim: claim.rows[0] });
  } catch (error) {
    console.error('Failed to create claim:', error);
    res.status(500).json({ error: 'Failed to create claim' });
  }
});

// Update expense claim (only if draft or pending)
router.patch('/claims/:id', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { description, categoryId, amount, expenseDate, receiptUrl, notes, tags, status } = req.body;

    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if claim exists and can be edited
    const existing = await db.query(`
      SELECT status FROM expense_claims WHERE id = $1 AND employee_id = $2
    `, [req.params.id, employee.rows[0].id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (!['draft', 'pending'].includes(existing.rows[0].status)) {
      return res.status(400).json({ error: 'Cannot edit expense in current status' });
    }

    const result = await db.query(`
      UPDATE expense_claims
      SET description = COALESCE($1, description),
          category_id = COALESCE($2, category_id),
          amount = COALESCE($3, amount),
          expense_date = COALESCE($4, expense_date),
          receipt_url = COALESCE($5, receipt_url),
          notes = COALESCE($6, notes),
          tags = COALESCE($7, tags),
          status = COALESCE($8, status),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [description, categoryId, amount, expenseDate, receiptUrl, notes, tags, status, req.params.id]);

    res.json({ expense: result.rows[0] });
  } catch (error) {
    console.error('Failed to update expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Cancel expense claim
router.post('/claims/:id/cancel', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const result = await db.query(`
      UPDATE expense_claims
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND employee_id = $2 AND status IN ('draft', 'pending')
      RETURNING *
    `, [req.params.id, employee.rows[0].id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or cannot be cancelled' });
    }

    res.json({ expense: result.rows[0] });
  } catch (error) {
    console.error('Failed to cancel expense:', error);
    res.status(500).json({ error: 'Failed to cancel expense' });
  }
});

// ==================== MANAGER APPROVAL ====================

// Get pending approvals
router.get('/pending', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { departmentId, locationId } = req.query;

    let query = `
      SELECT ec.*,
             cat.name as category_name,
             e.first_name, e.last_name, e.avatar_url,
             d.name as department_name
      FROM expense_claims ec
      LEFT JOIN expense_categories cat ON cat.id = ec.category_id
      JOIN employees e ON e.id = ec.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE ec.organization_id = $1
        AND ec.status = 'pending'
    `;
    const params = [organizationId];

    if (departmentId) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(departmentId);
    }

    if (locationId) {
      query += ` AND e.primary_location_id = $${params.length + 1}`;
      params.push(locationId);
    }

    query += ` ORDER BY ec.created_at ASC`;

    const expenses = await db.query(query, params);

    // Get summary
    const summary = await db.query(`
      SELECT
        COUNT(*) as total_pending,
        COALESCE(SUM(amount), 0) as total_amount
      FROM expense_claims
      WHERE organization_id = $1 AND status = 'pending'
    `, [organizationId]);

    res.json({
      expenses: expenses.rows,
      summary: summary.rows[0],
    });
  } catch (error) {
    console.error('Failed to get pending expenses:', error);
    res.status(500).json({ error: 'Failed to get pending expenses' });
  }
});

// Approve expense
router.post('/claims/:id/approve', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { notes } = req.body;

    const result = await db.query(`
      UPDATE expense_claims
      SET status = 'approved',
          reviewed_by = $1,
          reviewed_at = NOW(),
          notes = COALESCE($2, notes),
          updated_at = NOW()
      WHERE id = $3 AND organization_id = $4 AND status = 'pending'
      RETURNING *
    `, [userId, notes, req.params.id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or already processed' });
    }

    res.json({ expense: result.rows[0] });
  } catch (error) {
    console.error('Failed to approve expense:', error);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

// Reject expense
router.post('/claims/:id/reject', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const result = await db.query(`
      UPDATE expense_claims
      SET status = 'rejected',
          reviewed_by = $1,
          reviewed_at = NOW(),
          rejection_reason = $2,
          updated_at = NOW()
      WHERE id = $3 AND organization_id = $4 AND status = 'pending'
      RETURNING *
    `, [userId, reason, req.params.id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or already processed' });
    }

    res.json({ expense: result.rows[0] });
  } catch (error) {
    console.error('Failed to reject expense:', error);
    res.status(500).json({ error: 'Failed to reject expense' });
  }
});

// Mark as paid
router.post('/claims/:id/paid', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { paymentReference, paymentMethod } = req.body;

    const result = await db.query(`
      UPDATE expense_claims
      SET status = 'paid',
          paid_at = NOW(),
          payment_reference = $1,
          payment_method = $2,
          updated_at = NOW()
      WHERE id = $3 AND organization_id = $4 AND status = 'approved'
      RETURNING *
    `, [paymentReference, paymentMethod, req.params.id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or not approved' });
    }

    res.json({ expense: result.rows[0] });
  } catch (error) {
    console.error('Failed to mark as paid:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

// Bulk mark as paid
router.post('/bulk-pay', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { claimIds, paymentReference, paymentMethod } = req.body;

    if (!claimIds || claimIds.length === 0) {
      return res.status(400).json({ error: 'No claims specified' });
    }

    const result = await db.query(`
      UPDATE expense_claims
      SET status = 'paid',
          paid_at = NOW(),
          payment_reference = $1,
          payment_method = $2,
          updated_at = NOW()
      WHERE id = ANY($3) AND organization_id = $4 AND status = 'approved'
      RETURNING id
    `, [paymentReference, paymentMethod, claimIds, organizationId]);

    res.json({
      paid: result.rows.length,
      total: claimIds.length,
    });
  } catch (error) {
    console.error('Failed to bulk pay:', error);
    res.status(500).json({ error: 'Failed to process bulk payment' });
  }
});

// Get expense report
router.get('/report', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate, groupBy = 'category' } = req.query;

    let query;
    const params = [organizationId];

    if (groupBy === 'category') {
      query = `
        SELECT cat.name as group_name,
               COUNT(*) as claim_count,
               COALESCE(SUM(ec.amount), 0) as total_amount,
               COALESCE(SUM(ec.amount) FILTER (WHERE ec.status = 'paid'), 0) as paid_amount,
               COALESCE(SUM(ec.amount) FILTER (WHERE ec.status = 'pending'), 0) as pending_amount
        FROM expense_categories cat
        LEFT JOIN expense_claims ec ON ec.category_id = cat.id
        WHERE cat.organization_id = $1
      `;
    } else if (groupBy === 'employee') {
      query = `
        SELECT e.first_name || ' ' || e.last_name as group_name,
               COUNT(*) as claim_count,
               COALESCE(SUM(ec.amount), 0) as total_amount,
               COALESCE(SUM(ec.amount) FILTER (WHERE ec.status = 'paid'), 0) as paid_amount,
               COALESCE(SUM(ec.amount) FILTER (WHERE ec.status = 'pending'), 0) as pending_amount
        FROM employees e
        LEFT JOIN expense_claims ec ON ec.employee_id = e.id
        WHERE e.organization_id = $1
      `;
    } else {
      query = `
        SELECT DATE_TRUNC('month', ec.expense_date)::date as group_name,
               COUNT(*) as claim_count,
               COALESCE(SUM(ec.amount), 0) as total_amount,
               COALESCE(SUM(ec.amount) FILTER (WHERE ec.status = 'paid'), 0) as paid_amount,
               COALESCE(SUM(ec.amount) FILTER (WHERE ec.status = 'pending'), 0) as pending_amount
        FROM expense_claims ec
        WHERE ec.organization_id = $1
      `;
    }

    if (startDate) {
      query += ` AND ec.expense_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND ec.expense_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` GROUP BY 1 ORDER BY 1`;

    const report = await db.query(query, params);

    res.json({ report: report.rows });
  } catch (error) {
    console.error('Failed to get expense report:', error);
    res.status(500).json({ error: 'Failed to get expense report' });
  }
});

export default router;
