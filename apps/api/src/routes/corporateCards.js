// ============================================================
// CORPORATE CARDS API ROUTES
// HSBC corporate card integration via TrueLayer
// Full workflow: connect bank → sync transactions → claim → approve → payroll
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import truelayerService from '../services/truelayer.js';
import expenseCardsService from '../services/expenseCards.js';
import storageService from '../services/storage.js';
import multer from 'multer';
import path from 'path';

const router = Router();

// File upload config for receipts
const upload = multer({
  storage: multer.diskStorage({
    destination: process.env.UPLOAD_DIR || '/tmp/uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// All routes require authentication
router.use(authMiddleware);

// ==================== TRUELAYER CONNECTION ====================

/**
 * GET /api/integrations/truelayer/connect
 * Start bank connection flow - returns TrueLayer auth URL
 */
router.get('/integrations/truelayer/connect', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { url, state } = truelayerService.getAuthUrl(organizationId);

    res.json({
      authUrl: url,
      state,
      message: 'Redirect user to authUrl to connect their bank',
    });
  } catch (error) {
    console.error('TrueLayer connect error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * GET /api/integrations/truelayer/callback
 * OAuth callback - exchange code for tokens
 */
router.get('/integrations/truelayer/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('TrueLayer auth error:', error, error_description);
      // Redirect to portal with error
      return res.redirect(`${process.env.PORTAL_URL || 'https://app.uplifthq.co.uk'}/settings/integrations?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.PORTAL_URL || 'https://app.uplifthq.co.uk'}/settings/integrations?error=missing_params`);
    }

    // Get user ID from state if authenticated, otherwise null
    const connectedBy = req.user?.userId || null;

    const connection = await truelayerService.handleCallback(code, state, connectedBy);

    // Redirect to portal success page
    res.redirect(`${process.env.PORTAL_URL || 'https://app.uplifthq.co.uk'}/settings/integrations?connected=true&provider=${connection.provider_id}`);
  } catch (error) {
    console.error('TrueLayer callback error:', error);
    res.redirect(`${process.env.PORTAL_URL || 'https://app.uplifthq.co.uk'}/settings/integrations?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/integrations/truelayer/connections
 * List all TrueLayer connections for organization
 */
router.get('/integrations/truelayer/connections', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const connections = await truelayerService.getConnections(organizationId);
    res.json({ connections });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

/**
 * POST /api/integrations/truelayer/sync
 * Trigger manual transaction sync for a connection
 */
router.post('/integrations/truelayer/sync', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { connectionId } = req.body;

    if (!connectionId) {
      return res.status(400).json({ error: 'connectionId is required' });
    }

    const result = await truelayerService.syncTransactions(organizationId, connectionId);

    res.json({
      success: true,
      ...result,
      message: `Imported ${result.imported} transactions, skipped ${result.skipped} duplicates`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

/**
 * DELETE /api/integrations/truelayer/connections/:id
 * Disconnect a TrueLayer connection
 */
router.delete('/integrations/truelayer/connections/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    await truelayerService.disconnect(organizationId, req.params.id);
    res.json({ success: true, message: 'Connection disconnected' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: error.message || 'Failed to disconnect' });
  }
});

// ==================== CORPORATE CARDS ====================

/**
 * GET /api/corporate-cards
 * List all corporate cards for organization
 */
router.get('/corporate-cards', async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { employeeId, isActive } = req.query;

    let query = `
      SELECT
        cc.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        tc.connection_name,
        tc.provider_id,
        tc.status as connection_status
      FROM corporate_cards cc
      JOIN employees e ON e.id = cc.employee_id
      LEFT JOIN truelayer_connections tc ON tc.id = cc.truelayer_connection_id
      WHERE cc.organization_id = $1
    `;
    const params = [organizationId];

    if (employeeId) {
      params.push(employeeId);
      query += ` AND cc.employee_id = $${params.length}`;
    }

    if (isActive !== undefined) {
      params.push(isActive === 'true');
      query += ` AND cc.is_active = $${params.length}`;
    }

    query += ` ORDER BY cc.created_at DESC`;

    const result = await db.query(query, params);
    res.json({ cards: result.rows });
  } catch (error) {
    console.error('List cards error:', error);
    res.status(500).json({ error: 'Failed to list cards' });
  }
});

/**
 * POST /api/corporate-cards
 * Register a new corporate card
 */
router.post('/corporate-cards', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      employeeId,
      cardLastFour,
      cardNetwork,
      cardType,
      cardholderName,
      cardProvider,
      truelayerConnectionId,
      spendingLimit,
    } = req.body;

    if (!employeeId || !cardLastFour) {
      return res.status(400).json({ error: 'employeeId and cardLastFour are required' });
    }

    // Verify employee exists
    const emp = await db.query(`
      SELECT id FROM employees WHERE id = $1 AND organization_id = $2
    `, [employeeId, organizationId]);

    if (!emp.rows[0]) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const result = await db.query(`
      INSERT INTO corporate_cards (
        organization_id, employee_id, card_last_four, card_network,
        card_type, cardholder_name, card_provider, truelayer_connection_id, spending_limit
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      organizationId,
      employeeId,
      cardLastFour,
      cardNetwork || null,
      cardType || 'CREDIT',
      cardholderName || null,
      cardProvider || 'hsbc',
      truelayerConnectionId || null,
      spendingLimit || null,
    ]);

    res.status(201).json({ card: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Card already registered for this employee' });
    }
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

/**
 * PUT /api/corporate-cards/:id
 * Update a corporate card
 */
router.put('/corporate-cards/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      employeeId,
      cardNetwork,
      cardType,
      cardholderName,
      isActive,
      truelayerConnectionId,
      spendingLimit,
    } = req.body;

    const result = await db.query(`
      UPDATE corporate_cards
      SET employee_id = COALESCE($1, employee_id),
          card_network = COALESCE($2, card_network),
          card_type = COALESCE($3, card_type),
          cardholder_name = COALESCE($4, cardholder_name),
          is_active = COALESCE($5, is_active),
          truelayer_connection_id = COALESCE($6, truelayer_connection_id),
          spending_limit = COALESCE($7, spending_limit),
          updated_at = NOW()
      WHERE id = $8 AND organization_id = $9
      RETURNING *
    `, [employeeId, cardNetwork, cardType, cardholderName, isActive, truelayerConnectionId, spendingLimit, req.params.id, organizationId]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ card: result.rows[0] });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

/**
 * DELETE /api/corporate-cards/:id
 * Remove a corporate card
 */
router.delete('/corporate-cards/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Soft delete by setting inactive
    const result = await db.query(`
      UPDATE corporate_cards
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `, [req.params.id, organizationId]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ success: true, message: 'Card deactivated' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// ==================== CARD TRANSACTIONS ====================

/**
 * GET /api/card-transactions
 * List card transactions with filters
 */
router.get('/card-transactions', async (req, res) => {
  try {
    const { organizationId, employeeId: userEmployeeId, role } = req.user;
    const { employeeId, status, startDate, endDate, categoryId, cardId, limit, offset } = req.query;

    // Workers can only see their own transactions
    const filterEmployeeId = role === 'worker' ? userEmployeeId : employeeId;

    const result = await expenseCardsService.listTransactions(organizationId, {
      employeeId: filterEmployeeId,
      status,
      startDate,
      endDate,
      categoryId,
      cardId,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });

    res.json(result);
  } catch (error) {
    console.error('List transactions error:', error);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

/**
 * GET /api/card-transactions/:id
 * Get a single transaction
 */
router.get('/card-transactions/:id', async (req, res) => {
  try {
    const { organizationId, employeeId: userEmployeeId, role } = req.user;

    const transaction = await expenseCardsService.getTransaction(organizationId, req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Workers can only see their own transactions
    if (role === 'worker' && transaction.employee_id !== userEmployeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

/**
 * PUT /api/card-transactions/:id
 * Update a transaction (category, notes, etc.)
 */
router.put('/card-transactions/:id', async (req, res) => {
  try {
    const { organizationId, employeeId: userEmployeeId, role } = req.user;
    const { categoryId, notes, employeeNotes } = req.body;

    // Get transaction to check ownership
    const existing = await expenseCardsService.getTransaction(organizationId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Workers can only update their own transactions and only certain fields
    if (role === 'worker') {
      if (existing.employee_id !== userEmployeeId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Workers can only update employeeNotes
      const transaction = await expenseCardsService.updateTransaction(organizationId, req.params.id, {
        employeeNotes,
      });
      return res.json({ transaction });
    }

    const transaction = await expenseCardsService.updateTransaction(organizationId, req.params.id, {
      categoryId,
      notes,
      employeeNotes,
    });

    res.json({ transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

/**
 * POST /api/card-transactions/:id/receipt
 * Upload receipt for a transaction
 */
router.post('/card-transactions/:id/receipt', upload.single('receipt'), storageService.processUploads, async (req, res) => {
  try {
    const { organizationId, employeeId: userEmployeeId, role } = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get transaction to check ownership
    const existing = await expenseCardsService.getTransaction(organizationId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Workers can only upload receipts for their own transactions
    if (role === 'worker' && existing.employee_id !== userEmployeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const receiptUrl = req.file.storageUrl;
    const transaction = await expenseCardsService.uploadReceipt(organizationId, req.params.id, receiptUrl);

    res.json({ transaction, receiptUrl });
  } catch (error) {
    console.error('Upload receipt error:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

// ==================== EXPENSE CLAIMS ====================

/**
 * GET /api/expense-claims
 * List expense claims
 */
router.get('/expense-claims', async (req, res) => {
  try {
    const { organizationId, employeeId: userEmployeeId, role } = req.user;
    const { employeeId, status, payrollPeriod, payrollExported, limit, offset } = req.query;

    // Workers can only see their own claims
    const filterEmployeeId = role === 'worker' ? userEmployeeId : employeeId;

    const result = await expenseCardsService.listClaims(organizationId, {
      employeeId: filterEmployeeId,
      status,
      payrollPeriod,
      payrollExported: payrollExported !== undefined ? payrollExported === 'true' : undefined,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });

    res.json(result);
  } catch (error) {
    console.error('List claims error:', error);
    res.status(500).json({ error: 'Failed to list claims' });
  }
});

/**
 * POST /api/expense-claims
 * Submit a new expense claim
 */
router.post('/expense-claims', async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const { title, description, transactionIds } = req.body;

    if (!employeeId) {
      return res.status(404).json({ error: 'Employee not found for current user' });
    }

    const result = await expenseCardsService.submitClaim(organizationId, employeeId, {
      title,
      description,
      transactionIds,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Submit claim error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit claim' });
  }
});

/**
 * GET /api/expense-claims/:id
 * Get a single claim with transactions
 */
router.get('/expense-claims/:id', async (req, res) => {
  try {
    const { organizationId, employeeId: userEmployeeId, role } = req.user;

    const claim = await expenseCardsService.getClaim(organizationId, req.params.id);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Workers can only see their own claims
    if (role === 'worker' && claim.employee_id !== userEmployeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ claim });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ error: 'Failed to get claim' });
  }
});

/**
 * PUT /api/expense-claims/:id/review
 * Approve or reject a claim (manager/admin only)
 */
router.put('/expense-claims/:id/review', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { decision, notes } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
    }

    const result = await expenseCardsService.reviewClaim(
      organizationId,
      req.params.id,
      userId,
      decision,
      notes
    );

    res.json({ claim: result });
  } catch (error) {
    console.error('Review claim error:', error);
    res.status(500).json({ error: error.message || 'Failed to review claim' });
  }
});

// ==================== PAYROLL EXPORT ====================

/**
 * GET /api/payroll/expenses
 * Get approved expenses ready for payroll
 */
router.get('/payroll/expenses', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { period } = req.query;

    const result = await expenseCardsService.getClaimsForPayroll(organizationId, period);
    res.json(result);
  } catch (error) {
    console.error('Get payroll expenses error:', error);
    res.status(500).json({ error: 'Failed to get payroll expenses' });
  }
});

/**
 * POST /api/payroll/expenses/export
 * Export expenses to payroll (generate CSV)
 */
router.post('/payroll/expenses/export', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { period, format } = req.body;

    const result = await expenseCardsService.exportToPayroll(
      organizationId,
      period,
      userId,
      format || 'csv'
    );

    // Return CSV as downloadable file or JSON with content
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      return res.send(result.csvContent);
    }

    res.json({
      export: result.export,
      summary: result.summary,
      csvPreview: result.csvContent.split('\n').slice(0, 10).join('\n') + '\n...',
    });
  } catch (error) {
    console.error('Export payroll error:', error);
    res.status(500).json({ error: error.message || 'Failed to export' });
  }
});

/**
 * GET /api/payroll/expenses/exports
 * List previous payroll exports
 */
router.get('/payroll/expenses/exports', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const exports = await expenseCardsService.listPayrollExports(organizationId);
    res.json({ exports });
  } catch (error) {
    console.error('List exports error:', error);
    res.status(500).json({ error: 'Failed to list exports' });
  }
});

/**
 * GET /api/payroll/expenses/exports/:id
 * Download a previous export
 */
router.get('/payroll/expenses/exports/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const result = await expenseCardsService.getPayrollExport(organizationId, req.params.id);

    if (!result) {
      return res.status(404).json({ error: 'Export not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Get export error:', error);
    res.status(500).json({ error: 'Failed to get export' });
  }
});

// ==================== EXPENSE CATEGORIES ====================

/**
 * GET /api/expense-categories
 * List expense categories
 */
router.get('/expense-categories', async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await db.query(`
      SELECT * FROM expense_categories
      WHERE organization_id = $1 AND is_active = true
      ORDER BY name
    `, [organizationId]);

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

/**
 * POST /api/expense-categories
 * Create expense category
 */
router.post('/expense-categories', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { name, description, glCode, requiresReceipt, maxAmount } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await db.query(`
      INSERT INTO expense_categories (organization_id, name, description, gl_code, requires_receipt, max_amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [organizationId, name, description, glCode, requiresReceipt || false, maxAmount]);

    res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /api/expense-categories/:id
 * Update expense category
 */
router.put('/expense-categories/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { name, description, glCode, requiresReceipt, maxAmount, isActive } = req.body;

    const result = await db.query(`
      UPDATE expense_categories
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          gl_code = COALESCE($3, gl_code),
          requires_receipt = COALESCE($4, requires_receipt),
          max_amount = COALESCE($5, max_amount),
          is_active = COALESCE($6, is_active)
      WHERE id = $7 AND organization_id = $8
      RETURNING *
    `, [name, description, glCode, requiresReceipt, maxAmount, isActive, req.params.id, organizationId]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/expense-categories/:id
 * Soft delete expense category
 */
router.delete('/expense-categories/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await db.query(`
      UPDATE expense_categories SET is_active = false
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `, [req.params.id, organizationId]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * GET /api/expense-categories/mappings
 * List category auto-mapping rules
 */
router.get('/expense-categories/mappings', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await db.query(`
      SELECT ecm.*, ec.name as category_name
      FROM expense_category_mappings ecm
      JOIN expense_categories ec ON ec.id = ecm.expense_category_id
      WHERE ecm.organization_id = $1
      ORDER BY ecm.priority ASC, ec.name
    `, [organizationId]);

    res.json({ mappings: result.rows });
  } catch (error) {
    console.error('List mappings error:', error);
    res.status(500).json({ error: 'Failed to list mappings' });
  }
});

/**
 * POST /api/expense-categories/mappings
 * Create category mapping rule
 */
router.post('/expense-categories/mappings', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      expenseCategoryId,
      truelayerCategory,
      truelayerClassification,
      merchantPattern,
      mccCode,
      priority,
    } = req.body;

    if (!expenseCategoryId) {
      return res.status(400).json({ error: 'expenseCategoryId is required' });
    }

    const result = await db.query(`
      INSERT INTO expense_category_mappings (
        organization_id, expense_category_id, truelayer_category,
        truelayer_classification, merchant_pattern, mcc_code, priority
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      organizationId,
      expenseCategoryId,
      truelayerCategory || null,
      truelayerClassification || null,
      merchantPattern || null,
      mccCode || null,
      priority || 100,
    ]);

    res.status(201).json({ mapping: result.rows[0] });
  } catch (error) {
    console.error('Create mapping error:', error);
    res.status(500).json({ error: 'Failed to create mapping' });
  }
});

export default router;
