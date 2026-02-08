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

export default router;
