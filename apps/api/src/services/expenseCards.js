// ============================================================
// EXPENSE CARDS SERVICE
// Corporate card transactions, expense claims, and payroll export
// Supports the full workflow: swipe → import → claim → approve → payroll
// ============================================================

import { db } from '../lib/database.js';

/**
 * List card transactions with filters
 */
async function listTransactions(organizationId, filters = {}) {
  const {
    employeeId,
    status,
    startDate,
    endDate,
    categoryId,
    cardId,
    limit = 50,
    offset = 0,
  } = filters;

  let query = `
    SELECT
      ct.*,
      ec.name as category_name,
      ec.gl_code,
      e.first_name || ' ' || e.last_name as employee_name,
      e.employee_number,
      cc.card_last_four,
      cc.card_network,
      cc.cardholder_name
    FROM card_transactions ct
    JOIN employees e ON e.id = ct.employee_id
    JOIN corporate_cards cc ON cc.id = ct.corporate_card_id
    LEFT JOIN expense_categories ec ON ec.id = ct.expense_category_id
    WHERE ct.organization_id = $1
  `;
  const params = [organizationId];

  if (employeeId) {
    params.push(employeeId);
    query += ` AND ct.employee_id = $${params.length}`;
  }

  if (status) {
    params.push(status);
    query += ` AND ct.status = $${params.length}`;
  }

  if (startDate) {
    params.push(startDate);
    query += ` AND ct.transaction_date >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    query += ` AND ct.transaction_date <= $${params.length}`;
  }

  if (categoryId) {
    params.push(categoryId);
    query += ` AND ct.expense_category_id = $${params.length}`;
  }

  if (cardId) {
    params.push(cardId);
    query += ` AND ct.corporate_card_id = $${params.length}`;
  }

  // Build count query before adding ORDER BY
  const baseQuery = query;
  const countQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
  const countResult = await db.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  query += ` ORDER BY ct.transaction_date DESC`;

  // Add pagination
  params.push(limit, offset);
  query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await db.query(query, params);

  return {
    transactions: result.rows,
    total,
    limit,
    offset,
  };
}

/**
 * Get a single transaction
 */
async function getTransaction(organizationId, transactionId) {
  const result = await db.query(`
    SELECT
      ct.*,
      ec.name as category_name,
      ec.gl_code,
      ec.requires_receipt as category_requires_receipt,
      e.first_name || ' ' || e.last_name as employee_name,
      e.employee_number,
      cc.card_last_four,
      cc.card_network,
      cc.cardholder_name,
      ecl.id as claim_id,
      ecl.claim_number,
      ecl.status as claim_status
    FROM card_transactions ct
    JOIN employees e ON e.id = ct.employee_id
    JOIN corporate_cards cc ON cc.id = ct.corporate_card_id
    LEFT JOIN expense_categories ec ON ec.id = ct.expense_category_id
    LEFT JOIN expense_claims ecl ON ecl.id = ct.expense_claim_id
    WHERE ct.id = $1 AND ct.organization_id = $2
  `, [transactionId, organizationId]);

  return result.rows[0] || null;
}

/**
 * Update a card transaction (notes, category, receipt)
 */
async function updateTransaction(organizationId, transactionId, data) {
  const { categoryId, notes, employeeNotes, receiptUrl } = data;

  // Build update query dynamically
  const updates = [];
  const params = [transactionId, organizationId];

  if (categoryId !== undefined) {
    params.push(categoryId);
    updates.push(`expense_category_id = $${params.length}`);
    updates.push(`auto_categorized = false`); // Manual category override
  }

  if (notes !== undefined) {
    params.push(notes);
    updates.push(`notes = $${params.length}`);
  }

  if (employeeNotes !== undefined) {
    params.push(employeeNotes);
    updates.push(`employee_notes = $${params.length}`);
  }

  if (receiptUrl !== undefined) {
    params.push(receiptUrl);
    updates.push(`receipt_url = $${params.length}`);
    updates.push(`receipt_uploaded_at = NOW()`);
  }

  if (updates.length === 0) {
    return getTransaction(organizationId, transactionId);
  }

  const result = await db.query(`
    UPDATE card_transactions
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND organization_id = $2
    RETURNING *
  `, params);

  return result.rows[0];
}

/**
 * Submit an expense claim with selected transactions
 */
async function submitClaim(organizationId, employeeId, data) {
  const { title, description, transactionIds } = data;

  if (!transactionIds || transactionIds.length === 0) {
    throw new Error('At least one transaction is required');
  }

  // Verify all transactions belong to this employee and are pending
  const txns = await db.query(`
    SELECT id, amount, currency, status, transaction_date
    FROM card_transactions
    WHERE id = ANY($1) AND organization_id = $2 AND employee_id = $3
  `, [transactionIds, organizationId, employeeId]);

  if (txns.rows.length !== transactionIds.length) {
    throw new Error('Some transactions not found or not owned by employee');
  }

  // Check all are pending
  const nonPending = txns.rows.filter(t => t.status !== 'pending');
  if (nonPending.length > 0) {
    throw new Error('Some transactions have already been submitted');
  }

  // Calculate total and find earliest transaction date
  const totalAmount = txns.rows.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const currency = txns.rows[0].currency;
  const expenseDate = txns.rows.reduce((min, t) => {
    const d = new Date(t.transaction_date);
    return !min || d < min ? d : min;
  }, null);

  // Determine payroll period (current month)
  const now = new Date();
  const payrollPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return db.transaction(async (client) => {
    // Create expense claim (claim_number is auto-generated by trigger)
    const claim = await client.query(`
      INSERT INTO expense_claims (
        organization_id, employee_id, title, description,
        amount, currency, expense_date, status, submitted_at, payroll_period
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), $8)
      RETURNING *
    `, [organizationId, employeeId, title, description, Math.round(totalAmount * 100), currency, expenseDate, payrollPeriod]);

    const claimId = claim.rows[0].id;

    // Link transactions to claim and update status
    await client.query(`
      UPDATE card_transactions
      SET expense_claim_id = $1, status = 'submitted', updated_at = NOW()
      WHERE id = ANY($2)
    `, [claimId, transactionIds]);

    // Fetch full claim with transactions
    const fullClaim = await client.query(`
      SELECT ecl.*,
             e.first_name || ' ' || e.last_name as employee_name,
             e.employee_number
      FROM expense_claims ecl
      JOIN employees e ON e.id = ecl.employee_id
      WHERE ecl.id = $1
    `, [claimId]);

    const transactions = await client.query(`
      SELECT * FROM card_transactions WHERE expense_claim_id = $1
    `, [claimId]);

    return {
      claim: fullClaim.rows[0],
      transactions: transactions.rows,
    };
  });
}

/**
 * List expense claims
 */
async function listClaims(organizationId, filters = {}) {
  const {
    employeeId,
    status,
    payrollPeriod,
    payrollExported,
    limit = 50,
    offset = 0,
  } = filters;

  // Build WHERE conditions
  let whereClause = 'WHERE ecl.organization_id = $1';
  const params = [organizationId];

  if (employeeId) {
    params.push(employeeId);
    whereClause += ` AND ecl.employee_id = $${params.length}`;
  }

  if (status) {
    params.push(status);
    whereClause += ` AND ecl.status = $${params.length}`;
  }

  if (payrollPeriod) {
    params.push(payrollPeriod);
    whereClause += ` AND ecl.payroll_period = $${params.length}`;
  }

  if (payrollExported !== undefined) {
    params.push(payrollExported);
    whereClause += ` AND ecl.payroll_exported = $${params.length}`;
  }

  // Count query (simple, no subqueries)
  const countQuery = `
    SELECT COUNT(*) FROM expense_claims ecl ${whereClause}
  `;
  const countResult = await db.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Main query with all the joins and subqueries
  let query = `
    SELECT
      ecl.*,
      e.first_name || ' ' || e.last_name as employee_name,
      e.employee_number,
      e.avatar_url as employee_avatar,
      d.name as department_name,
      ru.first_name || ' ' || ru.last_name as reviewed_by_name,
      (SELECT COUNT(*) FROM card_transactions WHERE expense_claim_id = ecl.id) as transaction_count
    FROM expense_claims ecl
    JOIN employees e ON e.id = ecl.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN users ru ON ru.id = ecl.reviewed_by
    ${whereClause}
    ORDER BY ecl.created_at DESC
  `;

  // Add pagination
  params.push(limit, offset);
  query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await db.query(query, params);

  return {
    claims: result.rows,
    total,
    limit,
    offset,
  };
}

/**
 * Get a single claim with its transactions
 */
async function getClaim(organizationId, claimId) {
  const claim = await db.query(`
    SELECT
      ecl.*,
      e.first_name || ' ' || e.last_name as employee_name,
      e.employee_number,
      e.email as employee_email,
      d.name as department_name,
      ru.first_name || ' ' || ru.last_name as reviewed_by_name
    FROM expense_claims ecl
    JOIN employees e ON e.id = ecl.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN users ru ON ru.id = ecl.reviewed_by
    WHERE ecl.id = $1 AND ecl.organization_id = $2
  `, [claimId, organizationId]);

  if (!claim.rows[0]) {
    return null;
  }

  const transactions = await db.query(`
    SELECT
      ct.*,
      ec.name as category_name,
      ec.gl_code,
      cc.card_last_four
    FROM card_transactions ct
    LEFT JOIN expense_categories ec ON ec.id = ct.expense_category_id
    JOIN corporate_cards cc ON cc.id = ct.corporate_card_id
    WHERE ct.expense_claim_id = $1
    ORDER BY ct.transaction_date DESC
  `, [claimId]);

  return {
    ...claim.rows[0],
    transactions: transactions.rows,
  };
}

/**
 * Review (approve/reject) an expense claim
 */
async function reviewClaim(organizationId, claimId, reviewerId, decision, notes) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Decision must be "approved" or "rejected"');
  }

  return db.transaction(async (client) => {
    // Update claim
    const result = await client.query(`
      UPDATE expense_claims
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
          notes = COALESCE($3, notes), updated_at = NOW()
      WHERE id = $4 AND organization_id = $5 AND status = 'pending'
      RETURNING *
    `, [decision, reviewerId, notes, claimId, organizationId]);

    if (!result.rows[0]) {
      throw new Error('Claim not found or already processed');
    }

    // Update linked transactions
    await client.query(`
      UPDATE card_transactions
      SET status = $1, updated_at = NOW()
      WHERE expense_claim_id = $2
    `, [decision, claimId]);

    // If rejected, unlink transactions so they can be resubmitted
    if (decision === 'rejected') {
      await client.query(`
        UPDATE card_transactions
        SET expense_claim_id = NULL, status = 'pending'
        WHERE expense_claim_id = $1
      `, [claimId]);
    }

    return getClaim(organizationId, claimId);
  });
}

/**
 * Get approved expenses ready for payroll export
 */
async function getClaimsForPayroll(organizationId, payrollPeriod) {
  const claims = await db.query(`
    SELECT
      ecl.*,
      e.id as employee_id,
      e.first_name || ' ' || e.last_name as employee_name,
      e.employee_number,
      e.email as employee_email
    FROM expense_claims ecl
    JOIN employees e ON e.id = ecl.employee_id
    WHERE ecl.organization_id = $1
      AND ecl.status = 'approved'
      AND ecl.payroll_exported = false
      AND ($2::text IS NULL OR ecl.payroll_period = $2)
    ORDER BY e.last_name, e.first_name, ecl.created_at
  `, [organizationId, payrollPeriod || null]);

  // Group by employee
  const byEmployee = {};
  for (const claim of claims.rows) {
    if (!byEmployee[claim.employee_id]) {
      byEmployee[claim.employee_id] = {
        employee_id: claim.employee_id,
        employee_name: claim.employee_name,
        employee_number: claim.employee_number,
        employee_email: claim.employee_email,
        total_amount: 0,
        claims: [],
      };
    }
    byEmployee[claim.employee_id].total_amount += parseFloat(claim.amount) / 100; // Convert from pence
    byEmployee[claim.employee_id].claims.push(claim);
  }

  const employees = Object.values(byEmployee);
  const totalAmount = employees.reduce((sum, e) => sum + e.total_amount, 0);
  const totalClaims = claims.rows.length;

  return {
    payrollPeriod: payrollPeriod || 'all',
    totalAmount,
    totalClaims,
    totalEmployees: employees.length,
    employees,
  };
}

/**
 * Export expenses to payroll (generate CSV and mark as exported)
 */
async function exportToPayroll(organizationId, payrollPeriod, exportedBy, exportFormat = 'csv') {
  const expenseData = await getClaimsForPayroll(organizationId, payrollPeriod);

  if (expenseData.totalClaims === 0) {
    throw new Error('No approved expenses to export');
  }

  return db.transaction(async (client) => {
    // Generate CSV content
    const csvLines = ['Employee ID,Employee Number,Employee Name,Claim Number,Description,Amount,Currency,GL Codes,Expense Date'];

    for (const emp of expenseData.employees) {
      for (const claim of emp.claims) {
        // Get transactions for GL codes
        const txns = await client.query(`
          SELECT ct.amount, ec.gl_code, ct.transaction_date
          FROM card_transactions ct
          LEFT JOIN expense_categories ec ON ec.id = ct.expense_category_id
          WHERE ct.expense_claim_id = $1
        `, [claim.id]);

        const glCodes = [...new Set(txns.rows.map(t => t.gl_code).filter(Boolean))].join(';');
        const expenseDate = txns.rows[0]?.transaction_date
          ? new Date(txns.rows[0].transaction_date).toISOString().split('T')[0]
          : '';

        csvLines.push([
          claim.employee_id,
          emp.employee_number || '',
          `"${emp.employee_name}"`,
          claim.claim_number,
          `"${(claim.title || claim.description || '').replace(/"/g, '""')}"`,
          (parseFloat(claim.amount) / 100).toFixed(2),
          claim.currency || 'GBP',
          glCodes,
          expenseDate,
        ].join(','));
      }
    }

    const csvContent = csvLines.join('\n');
    const fileName = `expense_export_${payrollPeriod || 'all'}_${Date.now()}.csv`;

    // Create export record
    const exportRecord = await client.query(`
      INSERT INTO payroll_exports (
        organization_id, payroll_period, export_format,
        total_amount, total_claims, total_employees,
        breakdown, exported_by, file_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      organizationId,
      payrollPeriod || 'mixed',
      exportFormat,
      Math.round(expenseData.totalAmount * 100),
      expenseData.totalClaims,
      expenseData.totalEmployees,
      JSON.stringify(expenseData.employees.map(e => ({
        employee_id: e.employee_id,
        employee_name: e.employee_name,
        amount: e.total_amount,
        claims_count: e.claims.length,
      }))),
      exportedBy,
      fileName,
    ]);

    const exportId = exportRecord.rows[0].id;

    // Mark all included claims as exported
    const claimIds = expenseData.employees.flatMap(e => e.claims.map(c => c.id));
    await client.query(`
      UPDATE expense_claims
      SET payroll_exported = true, payroll_export_date = NOW(), payroll_export_id = $1
      WHERE id = ANY($2)
    `, [exportId, claimIds]);

    // Update transaction status to paid
    await client.query(`
      UPDATE card_transactions
      SET status = 'paid', updated_at = NOW()
      WHERE expense_claim_id = ANY($1)
    `, [claimIds]);

    // Update claim status to paid
    await client.query(`
      UPDATE expense_claims
      SET status = 'paid', paid_at = NOW()
      WHERE id = ANY($1)
    `, [claimIds]);

    return {
      export: exportRecord.rows[0],
      csvContent,
      fileName,
      summary: {
        totalAmount: expenseData.totalAmount,
        totalClaims: expenseData.totalClaims,
        totalEmployees: expenseData.totalEmployees,
      },
    };
  });
}

/**
 * List previous payroll exports
 */
async function listPayrollExports(organizationId, limit = 20) {
  const result = await db.query(`
    SELECT
      pe.*,
      u.first_name || ' ' || u.last_name as exported_by_name
    FROM payroll_exports pe
    LEFT JOIN users u ON u.id = pe.exported_by
    WHERE pe.organization_id = $1
    ORDER BY pe.exported_at DESC
    LIMIT $2
  `, [organizationId, limit]);

  return result.rows;
}

/**
 * Get a specific payroll export (for re-download)
 */
async function getPayrollExport(organizationId, exportId) {
  const exp = await db.query(`
    SELECT * FROM payroll_exports
    WHERE id = $1 AND organization_id = $2
  `, [exportId, organizationId]);

  if (!exp.rows[0]) {
    return null;
  }

  // Regenerate CSV from claims (in case file URL is not available)
  const claims = await db.query(`
    SELECT
      ecl.*,
      e.first_name || ' ' || e.last_name as employee_name,
      e.employee_number
    FROM expense_claims ecl
    JOIN employees e ON e.id = ecl.employee_id
    WHERE ecl.payroll_export_id = $1
  `, [exportId]);

  return {
    export: exp.rows[0],
    claims: claims.rows,
  };
}

/**
 * Upload receipt for a transaction
 */
async function uploadReceipt(organizationId, transactionId, receiptUrl) {
  const result = await db.query(`
    UPDATE card_transactions
    SET receipt_url = $1, receipt_uploaded_at = NOW(), updated_at = NOW()
    WHERE id = $2 AND organization_id = $3
    RETURNING *
  `, [receiptUrl, transactionId, organizationId]);

  if (!result.rows[0]) {
    throw new Error('Transaction not found');
  }

  return result.rows[0];
}

// Export service
const expenseCardsService = {
  listTransactions,
  getTransaction,
  updateTransaction,
  submitClaim,
  listClaims,
  getClaim,
  reviewClaim,
  getClaimsForPayroll,
  exportToPayroll,
  listPayrollExports,
  getPayrollExport,
  uploadReceipt,
};

export default expenseCardsService;
export {
  listTransactions,
  getTransaction,
  updateTransaction,
  submitClaim,
  listClaims,
  getClaim,
  reviewClaim,
  getClaimsForPayroll,
  exportToPayroll,
  listPayrollExports,
  getPayrollExport,
  uploadReceipt,
};
