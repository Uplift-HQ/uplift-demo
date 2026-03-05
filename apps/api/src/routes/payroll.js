// ============================================================
// PAYROLL API ROUTES
// Payroll runs, calculations, exports, and RTI
// ============================================================

import { Router } from 'express';
import PDFDocument from 'pdfkit';
import db from '../lib/database.js';
import { payrollEngine } from '../services/payrollEngine.js';
import { getPayrollProvider, getSupportedCountries, checkProviderStatus } from '../services/payrollProviders/index.js';

const router = Router();

// Auth middleware
const authMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// ============================================================
// PAYROLL RUNS
// ============================================================

/**
 * Run payroll for all eligible employees
 * POST /api/payroll/run
 */
router.post('/run', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      payPeriodStart,
      payPeriodEnd,
      payDate,
      payFrequency = 'monthly',
      employeeIds = null,
      isDraft = true
    } = req.body;

    if (!payPeriodStart || !payPeriodEnd || !payDate) {
      return res.status(400).json({ error: 'Missing required fields: payPeriodStart, payPeriodEnd, payDate' });
    }

    const result = await payrollEngine.runPayroll({
      organizationId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      payFrequency,
      employeeIds,
      isDraft,
      userId: req.user.userId
    });

    res.json(result);
  } catch (error) {
    console.error('Payroll run error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Preview payroll for a single employee
 * POST /api/payroll/preview/:employeeId
 */
router.post('/preview/:employeeId', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { employeeId } = req.params;
    const { payPeriodStart, payPeriodEnd, payFrequency = 'monthly' } = req.body;

    const preview = await payrollEngine.previewPayroll({
      employeeId,
      organizationId,
      payPeriodStart,
      payPeriodEnd,
      payFrequency
    });

    res.json(preview);
  } catch (error) {
    console.error('Payroll preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all payroll runs
 * GET /api/payroll/runs
 */
router.get('/runs', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT pr.*,
        u1.email as created_by_email,
        u2.email as approved_by_email
      FROM payroll_runs pr
      LEFT JOIN users u1 ON u1.id = pr.created_by
      LEFT JOIN users u2 ON u2.id = pr.approved_by
      WHERE pr.organization_id = $1
    `;

    const params = [organizationId];

    if (status) {
      query += ` AND pr.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY pr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({
      runs: result.rows,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get payroll run details
 * GET /api/payroll/runs/:id
 */
router.get('/runs/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const runResult = await db.query(`
      SELECT pr.*,
        u1.email as created_by_email,
        u2.email as approved_by_email
      FROM payroll_runs pr
      LEFT JOIN users u1 ON u1.id = pr.created_by
      LEFT JOIN users u2 ON u2.id = pr.approved_by
      WHERE pr.id = $1 AND pr.organization_id = $2
    `, [id, organizationId]);

    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }

    // Get payslips for this run
    const payslipsResult = await db.query(`
      SELECT p.*,
        e.first_name, e.last_name, e.employee_number, e.email
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.payroll_run_id = $1
      ORDER BY e.last_name, e.first_name
    `, [id]);

    res.json({
      run: runResult.rows[0],
      payslips: payslipsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Approve payroll run
 * POST /api/payroll/runs/:id/approve
 */
router.post('/runs/:id/approve', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payrollEngine.approvePayrollRun(id, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reject payroll run
 * POST /api/payroll/runs/:id/reject
 */
router.post('/runs/:id/reject', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    const result = await payrollEngine.rejectPayrollRun(id, req.user.userId, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PAYROLL DASHBOARD
// ============================================================

/**
 * Get global payroll dashboard
 * GET /api/payroll/dashboard
 */
router.get('/dashboard', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Get recent payroll runs
    const runsResult = await db.query(`
      SELECT * FROM payroll_runs
      WHERE organization_id = $1
      ORDER BY pay_date DESC
      LIMIT 12
    `, [organizationId]);

    // Get totals by month
    const monthlyResult = await db.query(`
      SELECT
        DATE_TRUNC('month', pay_date) as month,
        SUM(total_gross) as gross,
        SUM(total_net) as net,
        SUM(total_employer_cost) as employer_cost,
        SUM(total_employees) as headcount
      FROM payroll_runs
      WHERE organization_id = $1
        AND status = 'approved'
        AND pay_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', pay_date)
      ORDER BY month DESC
    `, [organizationId]);

    // Get headcount by country
    const countryResult = await db.query(`
      SELECT
        COALESCE(country_code, 'GB') as country,
        COUNT(*) as headcount,
        SUM(annual_salary) / 12 as monthly_cost_estimate
      FROM employees
      WHERE organization_id = $1 AND status = 'active'
      GROUP BY COALESCE(country_code, 'GB')
    `, [organizationId]);

    // Get upcoming payroll dates
    const upcomingResult = await db.query(`
      SELECT DISTINCT pay_frequency,
        CASE pay_frequency
          WHEN 'monthly' THEN DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day'
          WHEN 'weekly' THEN DATE_TRUNC('week', NOW()) + INTERVAL '1 week' - INTERVAL '1 day'
          ELSE DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day'
        END as next_pay_date
      FROM payroll_runs
      WHERE organization_id = $1
      GROUP BY pay_frequency
    `, [organizationId]);

    // Get provider status
    const providerStatus = await checkProviderStatus('payrunio');

    res.json({
      recentRuns: runsResult.rows,
      monthlyTrend: monthlyResult.rows,
      headcountByCountry: countryResult.rows,
      upcomingPayroll: upcomingResult.rows,
      providerStatus,
      currency: 'GBP'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PAYSLIP PDF GENERATION
// ============================================================

/**
 * Generate PDF payslip
 * GET /api/payslips/:id/pdf
 */
router.get('/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const { organizationId, role, employeeId: userEmployeeId } = req.user;
    const { id } = req.params;

    // Get payslip with employee and org details
    const result = await db.query(`
      SELECT p.*,
        e.first_name, e.last_name, e.employee_number, e.email,
        e.department, e.job_title,
        eps.tax_code, eps.ni_category, eps.ni_number,
        o.name as org_name, o.address as org_address
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      JOIN organizations o ON o.id = p.organization_id
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      WHERE p.id = $1 AND p.organization_id = $2
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    const payslip = result.rows[0];

    // Check authorization
    if (role !== 'admin' && payslip.employee_id !== userEmployeeId) {
      return res.status(403).json({ error: 'Not authorized to view this payslip' });
    }

    // Get line items
    const itemsResult = await db.query(`
      SELECT * FROM payslip_items
      WHERE payslip_id = $1
      ORDER BY item_type, sort_order
    `, [id]);

    // Get YTD
    const date = new Date(payslip.pay_date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const taxYear = month >= 4 ? `${year}/${year + 1 - 2000}` : `${year - 1}/${year - 2000}`;

    const ytdResult = await db.query(`
      SELECT * FROM payslip_ytd
      WHERE employee_id = $1 AND organization_id = $2 AND tax_year = $3
    `, [payslip.employee_id, organizationId, taxYear]);

    const ytd = ytdResult.rows[0] || {};

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslip.pay_period_start}-${payslip.last_name}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text(payslip.org_name || 'Company Name', { align: 'center' });
    doc.fontSize(10).text(payslip.org_address || '', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).text('PAYSLIP', { align: 'center' });
    doc.moveDown();

    // Employee info
    doc.fontSize(10);
    const leftCol = 50;
    const rightCol = 300;
    let yPos = doc.y;

    doc.text('Employee:', leftCol, yPos);
    doc.text(`${payslip.first_name} ${payslip.last_name}`, leftCol + 100, yPos);
    doc.text('Pay Date:', rightCol, yPos);
    doc.text(new Date(payslip.pay_date).toLocaleDateString('en-GB'), rightCol + 80, yPos);

    yPos += 15;
    doc.text('Employee No:', leftCol, yPos);
    doc.text(payslip.employee_number || '-', leftCol + 100, yPos);
    doc.text('Period:', rightCol, yPos);
    doc.text(`${new Date(payslip.pay_period_start).toLocaleDateString('en-GB')} - ${new Date(payslip.pay_period_end).toLocaleDateString('en-GB')}`, rightCol + 80, yPos);

    yPos += 15;
    doc.text('Department:', leftCol, yPos);
    doc.text(payslip.department || '-', leftCol + 100, yPos);
    doc.text('Tax Code:', rightCol, yPos);
    doc.text(payslip.tax_code || '1257L', rightCol + 80, yPos);

    yPos += 15;
    doc.text('Job Title:', leftCol, yPos);
    doc.text(payslip.job_title || '-', leftCol + 100, yPos);
    doc.text('NI Category:', rightCol, yPos);
    doc.text(payslip.ni_category || 'A', rightCol + 80, yPos);

    if (payslip.ni_number) {
      yPos += 15;
      doc.text('NI Number:', leftCol, yPos);
      doc.text(payslip.ni_number, leftCol + 100, yPos);
    }

    doc.moveDown(2);

    // Separator
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Earnings
    doc.fontSize(12).text('EARNINGS', leftCol);
    doc.fontSize(10);
    doc.moveDown(0.5);

    const earnings = itemsResult.rows.filter(i => i.item_type === 'earning');
    let totalEarnings = 0;

    for (const item of earnings) {
      yPos = doc.y;
      doc.text(item.description, leftCol, yPos);
      if (item.quantity && item.rate) {
        doc.text(`${item.quantity} hrs @ £${item.rate}`, 250, yPos, { align: 'right', width: 100 });
      }
      doc.text(`£${parseFloat(item.amount).toFixed(2)}`, 450, yPos, { align: 'right', width: 100 });
      totalEarnings += parseFloat(item.amount);
      doc.moveDown(0.5);
    }

    doc.moveDown(0.5);
    yPos = doc.y;
    doc.font('Helvetica-Bold').text('TOTAL EARNINGS', leftCol, yPos);
    doc.text(`£${payslip.gross_pay.toFixed(2)}`, 450, yPos, { align: 'right', width: 100 });
    doc.font('Helvetica');

    doc.moveDown();

    // Deductions
    doc.fontSize(12).text('DEDUCTIONS', leftCol);
    doc.fontSize(10);
    doc.moveDown(0.5);

    const deductions = itemsResult.rows.filter(i => i.item_type === 'deduction');
    let totalDeductions = 0;

    for (const item of deductions) {
      yPos = doc.y;
      doc.text(item.description, leftCol, yPos);
      doc.text(`£${parseFloat(item.amount).toFixed(2)}`, 450, yPos, { align: 'right', width: 100 });
      totalDeductions += parseFloat(item.amount);
      doc.moveDown(0.5);
    }

    doc.moveDown(0.5);
    yPos = doc.y;
    doc.font('Helvetica-Bold').text('TOTAL DEDUCTIONS', leftCol, yPos);
    doc.text(`£${totalDeductions.toFixed(2)}`, 450, yPos, { align: 'right', width: 100 });
    doc.font('Helvetica');

    doc.moveDown();

    // Employer contributions (informational)
    const employer = itemsResult.rows.filter(i => i.item_type === 'employer');
    if (employer.length > 0) {
      doc.fontSize(12).text('EMPLOYER CONTRIBUTIONS', leftCol);
      doc.fontSize(10);
      doc.moveDown(0.5);

      for (const item of employer) {
        yPos = doc.y;
        doc.text(item.description, leftCol, yPos);
        doc.text(`£${parseFloat(item.amount).toFixed(2)}`, 450, yPos, { align: 'right', width: 100 });
        doc.moveDown(0.5);
      }

      doc.moveDown();
    }

    // Net Pay box
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold');
    yPos = doc.y;
    doc.text('NET PAY', leftCol, yPos);
    doc.text(`£${payslip.net_pay.toFixed(2)}`, 450, yPos, { align: 'right', width: 100 });
    doc.font('Helvetica');

    doc.moveDown(2);

    // YTD section
    if (Object.keys(ytd).length > 0) {
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      doc.fontSize(12).text('YEAR TO DATE', leftCol);
      doc.fontSize(10);
      doc.moveDown(0.5);

      const ytdItems = [
        ['Gross Pay', ytd.gross_pay_ytd],
        ['Tax Paid', ytd.tax_paid_ytd],
        ['NI Paid', ytd.ni_paid_ytd],
        ['Pension', ytd.pension_ytd],
        ['Net Pay', ytd.net_pay_ytd]
      ];

      for (const [label, value] of ytdItems) {
        if (value !== undefined && value !== null) {
          yPos = doc.y;
          doc.text(label, leftCol, yPos);
          doc.text(`£${parseFloat(value).toFixed(2)}`, 450, yPos, { align: 'right', width: 100 });
          doc.moveDown(0.5);
        }
      }
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text(`Tax Year: ${taxYear}`, leftCol);
    doc.text('This payslip is for information purposes only. Please keep for your records.', leftCol);

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PAYROLL EXPORTS
// ============================================================

/**
 * Export payroll run in various formats
 * POST /api/payroll/export/:runId
 */
router.post('/export/:runId', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { runId } = req.params;
    const { format = 'csv' } = req.query;

    // Get payroll run with payslips
    const runResult = await db.query(`
      SELECT * FROM payroll_runs
      WHERE id = $1 AND organization_id = $2
    `, [runId, organizationId]);

    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }

    const run = runResult.rows[0];

    // Get detailed payslip data
    const payslipsResult = await db.query(`
      SELECT p.*,
        e.first_name, e.last_name, e.employee_number, e.email,
        e.department, e.job_title,
        eps.tax_code, eps.ni_category, eps.ni_number,
        eps.sort_code, eps.account_number, eps.account_name
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      WHERE p.payroll_run_id = $1
      ORDER BY e.last_name, e.first_name
    `, [runId]);

    const payslips = payslipsResult.rows;

    // Get line items for each payslip
    for (const payslip of payslips) {
      const items = await db.query(
        'SELECT * FROM payslip_items WHERE payslip_id = $1 ORDER BY item_type, sort_order',
        [payslip.id]
      );
      payslip.items = items.rows;

      // Calculate individual amounts
      const deductions = items.rows.filter(i => i.item_type === 'deduction');
      payslip.tax = deductions.find(d => d.category === 'tax')?.amount || 0;
      payslip.ni = deductions.find(d => d.category === 'ni')?.amount || 0;
      payslip.pension = deductions.find(d => d.category === 'pension')?.amount || 0;
      payslip.studentLoan = deductions.find(d => d.category === 'studentLoan')?.amount || 0;

      const employer = items.rows.filter(i => i.item_type === 'employer');
      payslip.employerNi = employer.find(d => d.category === 'ni')?.amount || 0;
      payslip.employerPension = employer.find(d => d.category === 'pension')?.amount || 0;
    }

    switch (format.toLowerCase()) {
      case 'sage':
        return exportSageFormat(res, run, payslips);
      case 'xero':
        return exportXeroFormat(res, run, payslips);
      case 'adp':
        return exportADPFormat(res, run, payslips);
      case 'json':
        return res.json({ run, payslips });
      case 'csv':
      default:
        return exportCSVFormat(res, run, payslips);
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export BACS payment file
 * POST /api/payroll/export/:runId/bacs
 */
router.post('/export/:runId/bacs', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { runId } = req.params;
    const { processingDate, serviceUserNumber } = req.body;

    // Get payroll run and payslips with bank details
    const runResult = await db.query(`
      SELECT pr.*, o.name as org_name
      FROM payroll_runs pr
      JOIN organizations o ON o.id = pr.organization_id
      WHERE pr.id = $1 AND pr.organization_id = $2
    `, [runId, organizationId]);

    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }

    const run = runResult.rows[0];

    const payslipsResult = await db.query(`
      SELECT p.*, e.first_name, e.last_name, e.employee_number,
        eps.sort_code, eps.account_number, eps.account_name
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      WHERE p.payroll_run_id = $1
        AND p.net_pay > 0
      ORDER BY e.last_name
    `, [runId]);

    // Generate BACS Standard 18 format
    const lines = [];
    const procDate = new Date(processingDate || run.pay_date);
    const formattedDate = procDate.toISOString().slice(2, 10).replace(/-/g, '');

    // VOL1 - Volume Header
    lines.push(`VOL1BACS${serviceUserNumber || '123456'}                                            1`);

    // HDR1 - File Header
    lines.push(`HDR1A${serviceUserNumber || '123456'}S  0001      ${formattedDate}${formattedDate}000000`);

    // UHL1 - User Header
    lines.push(`UHL1 ${formattedDate}999999    000000001         DAILY  001`);

    let totalAmount = 0;
    let recordCount = 0;

    // Detail records
    for (const payslip of payslipsResult.rows) {
      if (!payslip.sort_code || !payslip.account_number) continue;

      const sortCode = payslip.sort_code.replace(/-/g, '');
      const accountNumber = payslip.account_number.padStart(8, '0');
      const amount = Math.round(payslip.net_pay * 100); // Pence
      const name = `${payslip.first_name} ${payslip.last_name}`.substring(0, 18).padEnd(18);
      const reference = `SALARY${payslip.employee_number || ''}`.substring(0, 18).padEnd(18);

      // Standard 18 format record
      lines.push(`${sortCode}${accountNumber}0 99${amount.toString().padStart(11, '0')}${name}${reference}`);

      totalAmount += amount;
      recordCount++;
    }

    // EOF1 - End of File
    lines.push(`EOF1A${serviceUserNumber || '123456'}S  0001      ${formattedDate}${formattedDate}${recordCount.toString().padStart(6, '0')}`);

    // UTL1 - User Trailer
    const hashTotal = totalAmount % 10000000000; // Last 10 digits
    lines.push(`UTL1${hashTotal.toString().padStart(10, '0')}${totalAmount.toString().padStart(13, '0')}${recordCount.toString().padStart(7, '0')}     `);

    const bacsContent = lines.join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=bacs-${run.pay_period_start}.txt`);
    res.send(bacsContent);

  } catch (error) {
    console.error('BACS export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// EXPORT HELPERS
// ============================================================

function exportCSVFormat(res, run, payslips) {
  const headers = [
    'Employee Number', 'First Name', 'Last Name', 'Email', 'Department',
    'Tax Code', 'NI Category', 'NI Number',
    'Gross Pay', 'Net Pay', 'Tax', 'NI', 'Pension', 'Student Loan',
    'Employer NI', 'Employer Pension',
    'Regular Hours', 'Overtime Hours',
    'Sort Code', 'Account Number', 'Account Name'
  ];

  const rows = payslips.map(p => [
    p.employee_number || '',
    p.first_name,
    p.last_name,
    p.email || '',
    p.department || '',
    p.tax_code || '1257L',
    p.ni_category || 'A',
    p.ni_number || '',
    p.gross_pay,
    p.net_pay,
    p.tax || 0,
    p.ni || 0,
    p.pension || 0,
    p.studentLoan || 0,
    p.employerNi || 0,
    p.employerPension || 0,
    p.regular_hours || 0,
    p.overtime_hours || 0,
    p.sort_code || '',
    p.account_number || '',
    p.account_name || ''
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=payroll-${run.pay_period_start}.csv`);
  res.send(csv);
}

function exportSageFormat(res, run, payslips) {
  // Sage 50 Payroll import format
  const headers = [
    'Ref', 'Name', 'Department', 'NI Number', 'Tax Code', 'NI Category',
    'Gross', 'Tax', 'NI (EE)', 'NI (ER)', 'Pension (EE)', 'Pension (ER)',
    'Net', 'Bank Sort', 'Bank Acc', 'Pay Method'
  ];

  const rows = payslips.map(p => [
    p.employee_number || '',
    `${p.first_name} ${p.last_name}`,
    p.department || '',
    p.ni_number || '',
    p.tax_code || '1257L',
    p.ni_category || 'A',
    p.gross_pay,
    p.tax || 0,
    p.ni || 0,
    p.employerNi || 0,
    p.pension || 0,
    p.employerPension || 0,
    p.net_pay,
    p.sort_code || '',
    p.account_number || '',
    'BACS'
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=sage-payroll-${run.pay_period_start}.csv`);
  res.send(csv);
}

function exportXeroFormat(res, run, payslips) {
  // Xero Payroll import format
  const headers = [
    '*EmployeeNumber', 'PayPeriodStartDate', 'PayPeriodEndDate',
    'EarningsTypeCode', 'EarningsAmount', 'DeductionTypeCode', 'DeductionAmount'
  ];

  const rows = [];

  for (const p of payslips) {
    // Earnings
    rows.push([
      p.employee_number,
      run.pay_period_start,
      run.pay_period_end,
      'ORDINARYEARNINGS',
      p.gross_pay,
      '',
      ''
    ]);

    // Tax
    if (p.tax > 0) {
      rows.push([
        p.employee_number,
        run.pay_period_start,
        run.pay_period_end,
        '',
        '',
        'PAYE',
        p.tax
      ]);
    }

    // NI
    if (p.ni > 0) {
      rows.push([
        p.employee_number,
        run.pay_period_start,
        run.pay_period_end,
        '',
        '',
        'NIEE',
        p.ni
      ]);
    }
  }

  const csv = [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=xero-payroll-${run.pay_period_start}.csv`);
  res.send(csv);
}

function exportADPFormat(res, run, payslips) {
  // ADP import format
  const headers = [
    'CompanyCode', 'EmployeeID', 'PayDate', 'PayPeriodBegin', 'PayPeriodEnd',
    'EarningsCode', 'EarningsAmount', 'DeductionCode', 'DeductionAmount',
    'TaxCode', 'TaxAmount'
  ];

  const rows = payslips.map(p => [
    'UPLIFT',
    p.employee_number || p.id.substring(0, 8),
    run.pay_date,
    run.pay_period_start,
    run.pay_period_end,
    'REG',
    p.gross_pay,
    'PENSION',
    p.pension || 0,
    'PAYE',
    p.tax || 0
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=adp-payroll-${run.pay_period_start}.csv`);
  res.send(csv);
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ============================================================
// COUNTRY CONFIG & PROVIDERS
// ============================================================

/**
 * Get supported countries
 * GET /api/payroll/countries
 */
router.get('/countries', authMiddleware, async (req, res) => {
  try {
    const countries = await getSupportedCountries();
    res.json({ countries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get provider status
 * GET /api/payroll/providers/status
 */
router.get('/providers/status', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const providers = ['payrunio', 'onesource', 'native', 'fallback'];
    const statuses = {};

    for (const provider of providers) {
      statuses[provider] = await checkProviderStatus(provider);
    }

    res.json({ providers: statuses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// RTI (Real Time Information) SUBMISSIONS
// =============================================================================

// FPS - Full Payment Submission
// Submits employee payment details to HMRC after each pay run
router.post('/rti/fps', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { payroll_run_id, employees } = req.body;

    if (!payroll_run_id) {
      return res.status(400).json({ error: 'payroll_run_id is required' });
    }

    // Get organization details for RTI
    const orgResult = await db.query(
      `SELECT name, paye_reference, accounts_office_reference
       FROM organizations WHERE id = $1`,
      [organizationId]
    );
    const org = orgResult.rows[0];

    if (!org.paye_reference) {
      return res.status(400).json({
        error: 'PAYE reference not configured. Please set up your employer details in Settings.'
      });
    }

    // Get payroll run with employee payslips
    const runResult = await db.query(`
      SELECT pr.*, p.employee_id, p.gross_pay, p.net_pay, p.tax_deducted, p.ni_employee,
             e.first_name, e.last_name, e.ni_number, e.date_of_birth,
             eps.tax_code, eps.ni_category, eps.student_loan_plan
      FROM payroll_runs pr
      JOIN payslips p ON p.payroll_run_id = pr.id
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      WHERE pr.id = $1 AND pr.organization_id = $2
    `, [payroll_run_id, organizationId]);

    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }

    // Build FPS XML structure (simplified - real implementation would use HMRC schema)
    const fpsData = {
      submission_type: 'FPS',
      employer: {
        paye_reference: org.paye_reference,
        accounts_office_reference: org.accounts_office_reference,
        name: org.name,
      },
      employees: runResult.rows.map(row => ({
        ni_number: row.ni_number,
        name: `${row.first_name} ${row.last_name}`,
        date_of_birth: row.date_of_birth,
        tax_code: row.tax_code,
        ni_category: row.ni_category || 'A',
        gross_pay: row.gross_pay,
        tax_deducted: row.tax_deducted,
        ni_employee: row.ni_employee,
        net_pay: row.net_pay,
        student_loan: row.student_loan_plan,
      })),
      pay_period: {
        start: runResult.rows[0]?.period_start,
        end: runResult.rows[0]?.period_end,
      },
    };

    // Log FPS submission (in production, this would call HMRC API)
    console.log('[RTI] FPS Submission:', JSON.stringify(fpsData, null, 2));

    // Record the submission
    const submissionResult = await db.query(`
      INSERT INTO rti_submissions (organization_id, payroll_run_id, submission_type, payload, status)
      VALUES ($1, $2, 'FPS', $3, 'pending')
      RETURNING *
    `, [organizationId, payroll_run_id, JSON.stringify(fpsData)]);

    res.json({
      success: true,
      message: 'FPS submission queued successfully',
      submission: submissionResult.rows[0],
      data: fpsData,
    });
  } catch (error) {
    console.error('FPS submission error:', error);
    res.status(500).json({ error: 'Failed to submit FPS' });
  }
});

// EPS - Employer Payment Summary
// Monthly submission of employer-level data (recovery of SMP, NICs, etc.)
router.post('/rti/eps', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { tax_month, tax_year, smp_recovered, spp_recovered, sap_recovered, nic_holiday } = req.body;

    if (!tax_month || !tax_year) {
      return res.status(400).json({ error: 'tax_month and tax_year are required' });
    }

    // Get organization details
    const orgResult = await db.query(
      `SELECT name, paye_reference, accounts_office_reference
       FROM organizations WHERE id = $1`,
      [organizationId]
    );
    const org = orgResult.rows[0];

    if (!org.paye_reference) {
      return res.status(400).json({
        error: 'PAYE reference not configured.'
      });
    }

    // Build EPS data
    const epsData = {
      submission_type: 'EPS',
      employer: {
        paye_reference: org.paye_reference,
        accounts_office_reference: org.accounts_office_reference,
        name: org.name,
      },
      tax_year,
      tax_month,
      recovery: {
        smp_recovered: smp_recovered || 0,
        spp_recovered: spp_recovered || 0,
        sap_recovered: sap_recovered || 0,
        nic_holiday: nic_holiday || 0,
      },
      no_payment_dates: [],
    };

    console.log('[RTI] EPS Submission:', JSON.stringify(epsData, null, 2));

    // Record the submission
    const submissionResult = await db.query(`
      INSERT INTO rti_submissions (organization_id, submission_type, payload, status, tax_year, tax_month)
      VALUES ($1, 'EPS', $2, 'pending', $3, $4)
      RETURNING *
    `, [organizationId, JSON.stringify(epsData), tax_year, tax_month]);

    res.json({
      success: true,
      message: 'EPS submission queued successfully',
      submission: submissionResult.rows[0],
      data: epsData,
    });
  } catch (error) {
    console.error('EPS submission error:', error);
    res.status(500).json({ error: 'Failed to submit EPS' });
  }
});

// Get RTI submission history
router.get('/rti/submissions', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { type, status, limit = 50 } = req.query;

    let query = `
      SELECT rs.*, pr.pay_period_start, pr.pay_period_end
      FROM rti_submissions rs
      LEFT JOIN payroll_runs pr ON pr.id = rs.payroll_run_id
      WHERE rs.organization_id = $1
    `;
    const params = [organizationId];

    if (type) {
      params.push(type);
      query += ` AND rs.submission_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND rs.status = $${params.length}`;
    }

    query += ` ORDER BY rs.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching RTI submissions:', error);
    res.status(500).json({ error: 'Failed to fetch RTI submissions' });
  }
});

// =============================================================================
// P45 / P60 GENERATION
// =============================================================================

// Generate P45 for a leaving employee
router.get('/p45/:employeeId', authMiddleware, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { employeeId } = req.params;

    // Get employee and their payroll data
    const result = await db.query(`
      SELECT
        e.id, e.first_name, e.last_name, e.ni_number, e.date_of_birth,
        e.address_line1, e.address_line2, e.city, e.postcode,
        e.employment_start_date, e.termination_date,
        eps.tax_code, eps.ni_category,
        o.name as employer_name, o.paye_reference,
        (SELECT COALESCE(SUM(gross_pay), 0) FROM payslips p
         JOIN payroll_runs pr ON pr.id = p.payroll_run_id
         WHERE p.employee_id = e.id
         AND pr.period_start >= date_trunc('year', COALESCE(e.termination_date, CURRENT_DATE) - interval '3 months')) as gross_pay_ytd,
        (SELECT COALESCE(SUM(tax_deducted), 0) FROM payslips p
         JOIN payroll_runs pr ON pr.id = p.payroll_run_id
         WHERE p.employee_id = e.id
         AND pr.period_start >= date_trunc('year', COALESCE(e.termination_date, CURRENT_DATE) - interval '3 months')) as tax_ytd
      FROM employees e
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      JOIN organizations o ON o.id = e.organization_id
      WHERE e.id = $1 AND e.organization_id = $2
    `, [employeeId, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = result.rows[0];
    const taxYear = getTaxYear(emp.termination_date || new Date());

    const p45Data = {
      document_type: 'P45',
      tax_year: taxYear,
      employer: {
        name: emp.employer_name,
        paye_reference: emp.paye_reference,
      },
      employee: {
        ni_number: emp.ni_number,
        name: `${emp.first_name} ${emp.last_name}`,
        date_of_birth: emp.date_of_birth,
        address: [emp.address_line1, emp.address_line2, emp.city, emp.postcode].filter(Boolean).join(', '),
      },
      employment: {
        start_date: emp.employment_start_date,
        leaving_date: emp.termination_date,
        tax_code: emp.tax_code || '1257L',
        week1_month1: false,
      },
      pay_and_tax: {
        total_pay_ytd: parseFloat(emp.gross_pay_ytd) || 0,
        total_tax_ytd: parseFloat(emp.tax_ytd) || 0,
      },
      generated_at: new Date().toISOString(),
    };

    res.json(p45Data);
  } catch (error) {
    console.error('P45 generation error:', error);
    res.status(500).json({ error: 'Failed to generate P45' });
  }
});

// Generate P60 for an employee for a given tax year
router.get('/p60/:employeeId/:taxYear', authMiddleware, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { employeeId, taxYear } = req.params;

    // Parse tax year (format: 2025-26)
    const [startYear] = taxYear.split('-').map(Number);
    const taxYearStart = new Date(startYear, 3, 6); // April 6
    const taxYearEnd = new Date(startYear + 1, 3, 5); // April 5

    // Get employee and their payroll data for the tax year
    const result = await db.query(`
      SELECT
        e.id, e.first_name, e.last_name, e.ni_number, e.date_of_birth,
        e.address_line1, e.address_line2, e.city, e.postcode,
        e.employment_start_date,
        eps.tax_code, eps.ni_category, eps.student_loan_plan,
        o.name as employer_name, o.paye_reference,
        (SELECT COALESCE(SUM(gross_pay), 0) FROM payslips p
         JOIN payroll_runs pr ON pr.id = p.payroll_run_id
         WHERE p.employee_id = e.id
         AND pr.period_end >= $3 AND pr.period_end <= $4) as gross_pay_total,
        (SELECT COALESCE(SUM(tax_deducted), 0) FROM payslips p
         JOIN payroll_runs pr ON pr.id = p.payroll_run_id
         WHERE p.employee_id = e.id
         AND pr.period_end >= $3 AND pr.period_end <= $4) as tax_total,
        (SELECT COALESCE(SUM(ni_employee), 0) FROM payslips p
         JOIN payroll_runs pr ON pr.id = p.payroll_run_id
         WHERE p.employee_id = e.id
         AND pr.period_end >= $3 AND pr.period_end <= $4) as ni_total,
        (SELECT COALESCE(SUM(student_loan), 0) FROM payslips p
         JOIN payroll_runs pr ON pr.id = p.payroll_run_id
         WHERE p.employee_id = e.id
         AND pr.period_end >= $3 AND pr.period_end <= $4) as student_loan_total
      FROM employees e
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      JOIN organizations o ON o.id = e.organization_id
      WHERE e.id = $1 AND e.organization_id = $2
    `, [employeeId, organizationId, taxYearStart, taxYearEnd]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = result.rows[0];

    const p60Data = {
      document_type: 'P60',
      tax_year: taxYear,
      employer: {
        name: emp.employer_name,
        paye_reference: emp.paye_reference,
      },
      employee: {
        ni_number: emp.ni_number,
        name: `${emp.first_name} ${emp.last_name}`,
        date_of_birth: emp.date_of_birth,
        address: [emp.address_line1, emp.address_line2, emp.city, emp.postcode].filter(Boolean).join(', '),
      },
      employment: {
        start_date: emp.employment_start_date,
        tax_code: emp.tax_code || '1257L',
        ni_category: emp.ni_category || 'A',
      },
      earnings_and_deductions: {
        pay_in_this_employment: parseFloat(emp.gross_pay_total) || 0,
        tax_deducted: parseFloat(emp.tax_total) || 0,
        employee_ni_contributions: parseFloat(emp.ni_total) || 0,
        student_loan_deductions: parseFloat(emp.student_loan_total) || 0,
      },
      generated_at: new Date().toISOString(),
    };

    res.json(p60Data);
  } catch (error) {
    console.error('P60 generation error:', error);
    res.status(500).json({ error: 'Failed to generate P60' });
  }
});

// Helper function to get tax year string
function getTaxYear(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  // Tax year runs April 6 to April 5
  if (month < 3 || (month === 3 && d.getDate() < 6)) {
    return `${year - 1}-${String(year).slice(2)}`;
  }
  return `${year}-${String(year + 1).slice(2)}`;
}

// =============================================================================
// CONFIGURABLE EXPORT FIELD MAPPINGS
// =============================================================================

// Available fields for export mapping
const EXPORT_FIELDS = {
  employee_id: { label: 'Employee ID', path: 'employee_id' },
  employee_number: { label: 'Employee Number', path: 'employee_number' },
  first_name: { label: 'First Name', path: 'first_name' },
  last_name: { label: 'Last Name', path: 'last_name' },
  full_name: { label: 'Full Name', path: 'full_name' },
  email: { label: 'Email', path: 'email' },
  department: { label: 'Department', path: 'department' },
  job_title: { label: 'Job Title', path: 'job_title' },
  ni_number: { label: 'NI Number', path: 'ni_number' },
  tax_code: { label: 'Tax Code', path: 'tax_code' },
  gross_pay: { label: 'Gross Pay', path: 'gross_pay' },
  net_pay: { label: 'Net Pay', path: 'net_pay' },
  tax_deducted: { label: 'Tax Deducted', path: 'tax_deducted' },
  ni_employee: { label: 'NI (Employee)', path: 'ni_employee' },
  ni_employer: { label: 'NI (Employer)', path: 'ni_employer' },
  pension_employee: { label: 'Pension (Employee)', path: 'pension_employee' },
  pension_employer: { label: 'Pension (Employer)', path: 'pension_employer' },
  student_loan: { label: 'Student Loan', path: 'student_loan' },
  regular_hours: { label: 'Regular Hours', path: 'regular_hours' },
  overtime_hours: { label: 'Overtime Hours', path: 'overtime_hours' },
  sort_code: { label: 'Sort Code', path: 'sort_code' },
  account_number: { label: 'Account Number', path: 'account_number' },
  account_name: { label: 'Account Name', path: 'account_name' },
  pay_period_start: { label: 'Period Start', path: 'period_start' },
  pay_period_end: { label: 'Period End', path: 'period_end' },
};

// Get available export fields
router.get('/export-fields', authMiddleware, async (req, res) => {
  res.json(EXPORT_FIELDS);
});

// List export mappings for organization
router.get('/export-mappings', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { provider } = req.query;

    let query = `
      SELECT id, name, provider, description, field_mappings, output_format,
             delimiter, include_header, date_format, is_default, created_at, updated_at
      FROM payroll_export_mappings
      WHERE organization_id = $1
    `;
    const params = [organizationId];

    if (provider) {
      query += ' AND provider = $2';
      params.push(provider);
    }

    query += ' ORDER BY is_default DESC, name ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing export mappings:', error);
    res.status(500).json({ error: 'Failed to list export mappings' });
  }
});

// Get single export mapping
router.get('/export-mappings/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await db.query(
      `SELECT * FROM payroll_export_mappings WHERE id = $1 AND organization_id = $2`,
      [req.params.id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export mapping not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching export mapping:', error);
    res.status(500).json({ error: 'Failed to fetch export mapping' });
  }
});

// Create export mapping
router.post('/export-mappings', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      name, provider, description, field_mappings,
      output_format, delimiter, include_header, date_format, is_default
    } = req.body;

    if (!name || !provider || !field_mappings) {
      return res.status(400).json({ error: 'name, provider, and field_mappings are required' });
    }

    // If setting as default, unset other defaults for this provider
    if (is_default) {
      await db.query(
        `UPDATE payroll_export_mappings SET is_default = false
         WHERE organization_id = $1 AND provider = $2`,
        [organizationId, provider]
      );
    }

    const result = await db.query(`
      INSERT INTO payroll_export_mappings
        (organization_id, name, provider, description, field_mappings,
         output_format, delimiter, include_header, date_format, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      organizationId, name, provider, description || null,
      JSON.stringify(field_mappings), output_format || 'csv',
      delimiter || ',', include_header !== false, date_format || 'YYYY-MM-DD',
      is_default || false
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating export mapping:', error);
    res.status(500).json({ error: 'Failed to create export mapping' });
  }
});

// Update export mapping
router.put('/export-mappings/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      name, provider, description, field_mappings,
      output_format, delimiter, include_header, date_format, is_default
    } = req.body;

    // If setting as default, unset other defaults for this provider
    if (is_default && provider) {
      await db.query(
        `UPDATE payroll_export_mappings SET is_default = false
         WHERE organization_id = $1 AND provider = $2 AND id != $3`,
        [organizationId, provider, req.params.id]
      );
    }

    const result = await db.query(`
      UPDATE payroll_export_mappings
      SET name = COALESCE($3, name),
          provider = COALESCE($4, provider),
          description = COALESCE($5, description),
          field_mappings = COALESCE($6, field_mappings),
          output_format = COALESCE($7, output_format),
          delimiter = COALESCE($8, delimiter),
          include_header = COALESCE($9, include_header),
          date_format = COALESCE($10, date_format),
          is_default = COALESCE($11, is_default),
          updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [
      req.params.id, organizationId, name, provider, description,
      field_mappings ? JSON.stringify(field_mappings) : null,
      output_format, delimiter, include_header, date_format, is_default
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export mapping not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating export mapping:', error);
    res.status(500).json({ error: 'Failed to update export mapping' });
  }
});

// Delete export mapping
router.delete('/export-mappings/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await db.query(
      `DELETE FROM payroll_export_mappings WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, organizationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Export mapping not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting export mapping:', error);
    res.status(500).json({ error: 'Failed to delete export mapping' });
  }
});

// Export payroll run with custom mapping
router.post('/export/:runId/custom', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { runId } = req.params;
    const { mapping_id } = req.body;

    if (!mapping_id) {
      return res.status(400).json({ error: 'mapping_id is required' });
    }

    // Get the mapping
    const mappingResult = await db.query(
      `SELECT * FROM payroll_export_mappings WHERE id = $1 AND organization_id = $2`,
      [mapping_id, organizationId]
    );

    if (mappingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Export mapping not found' });
    }

    const mapping = mappingResult.rows[0];
    const fieldMappings = mapping.field_mappings;

    // Get payroll data
    const payrollResult = await db.query(`
      SELECT
        p.id as payslip_id, p.employee_id, p.gross_pay, p.net_pay,
        p.tax_deducted, p.ni_employee, p.ni_employer,
        p.pension_employee, p.pension_employer, p.student_loan,
        p.regular_hours, p.overtime_hours,
        e.employee_number, e.first_name, e.last_name, e.email, e.ni_number,
        d.name as department, jt.name as job_title,
        eps.tax_code, eps.sort_code, eps.account_number, eps.account_name,
        pr.period_start, pr.period_end
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      JOIN payroll_runs pr ON pr.id = p.payroll_run_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN job_titles jt ON jt.id = e.job_title_id
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      WHERE p.payroll_run_id = $1 AND p.organization_id = $2
      ORDER BY e.last_name, e.first_name
    `, [runId, organizationId]);

    if (payrollResult.rows.length === 0) {
      return res.status(404).json({ error: 'No payroll data found for this run' });
    }

    // Build export data based on mapping
    const exportData = payrollResult.rows.map(row => {
      const exportRow = {};

      for (const [outputField, sourceField] of Object.entries(fieldMappings)) {
        let value = row[sourceField];

        // Handle special cases
        if (sourceField === 'full_name') {
          value = `${row.first_name} ${row.last_name}`;
        }

        // Format dates if needed
        if (value instanceof Date) {
          value = formatDate(value, mapping.date_format);
        }

        // Format numbers
        if (typeof value === 'number') {
          value = value.toFixed(2);
        }

        exportRow[outputField] = value ?? '';
      }

      return exportRow;
    });

    // Generate output based on format
    if (mapping.output_format === 'json') {
      res.json(exportData);
    } else {
      // CSV output
      const headers = Object.keys(fieldMappings);
      const delimiter = mapping.delimiter || ',';

      let csv = '';
      if (mapping.include_header) {
        csv = headers.join(delimiter) + '\n';
      }

      csv += exportData.map(row =>
        headers.map(h => {
          const val = String(row[h] || '');
          // Escape quotes and wrap in quotes if contains delimiter
          if (val.includes(delimiter) || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(delimiter)
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${mapping.name.replace(/[^a-z0-9]/gi, '_')}_export.csv"`);
      res.send(csv);
    }
  } catch (error) {
    console.error('Custom export error:', error);
    res.status(500).json({ error: 'Failed to export payroll data' });
  }
});

// Preview export with mapping
router.post('/export/:runId/preview', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { runId } = req.params;
    const { field_mappings, limit = 5 } = req.body;

    if (!field_mappings) {
      return res.status(400).json({ error: 'field_mappings is required' });
    }

    // Get sample payroll data
    const payrollResult = await db.query(`
      SELECT
        p.id as payslip_id, p.employee_id, p.gross_pay, p.net_pay,
        p.tax_deducted, p.ni_employee, p.ni_employer,
        e.employee_number, e.first_name, e.last_name, e.email, e.ni_number,
        d.name as department, jt.name as job_title,
        eps.tax_code, eps.sort_code, eps.account_number,
        pr.period_start, pr.period_end
      FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      JOIN payroll_runs pr ON pr.id = p.payroll_run_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN job_titles jt ON jt.id = e.job_title_id
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      WHERE p.payroll_run_id = $1 AND p.organization_id = $2
      ORDER BY e.last_name, e.first_name
      LIMIT $3
    `, [runId, organizationId, limit]);

    // Build preview data
    const previewData = payrollResult.rows.map(row => {
      const exportRow = {};

      for (const [outputField, sourceField] of Object.entries(field_mappings)) {
        let value = row[sourceField];

        if (sourceField === 'full_name') {
          value = `${row.first_name} ${row.last_name}`;
        }

        if (typeof value === 'number') {
          value = value.toFixed(2);
        }

        exportRow[outputField] = value ?? '';
      }

      return exportRow;
    });

    res.json({
      headers: Object.keys(field_mappings),
      rows: previewData,
      total: payrollResult.rows.length,
    });
  } catch (error) {
    console.error('Export preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Helper function to format dates
function formatDate(date, format) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    default: // YYYY-MM-DD
      return `${year}-${month}-${day}`;
  }
}

export default router;
