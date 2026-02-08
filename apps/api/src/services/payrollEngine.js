// ============================================================
// PAYROLL ENGINE
// Orchestrates payroll calculation from time entries to payslips
// ============================================================

import db from '../lib/database.js';
import { getPayrollProvider, runBatchPayroll } from './payrollProviders/index.js';
import { notifyPayslipAvailable } from './notifications.js';

/**
 * Main Payroll Engine
 */
class PayrollEngine {
  constructor() {
    this.defaultOvertimeThreshold = 40; // Hours per week before overtime
    this.defaultOvertimeMultiplier = 1.5;
  }

  // ============================================================
  // PAYROLL RUN PROCESSING
  // ============================================================

  /**
   * Run payroll for all eligible employees in an organization
   */
  async runPayroll(options) {
    const {
      organizationId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      payFrequency = 'monthly',
      employeeIds = null, // Optional: specific employees only
      isDraft = true
    } = options;

    // Create payroll run record
    const runResult = await db.query(`
      INSERT INTO payroll_runs (
        organization_id, pay_period_start, pay_period_end, pay_date,
        pay_frequency, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [organizationId, payPeriodStart, payPeriodEnd, payDate, payFrequency, 'processing', options.userId]);

    const payrollRun = runResult.rows[0];

    try {
      // Get eligible employees
      const employees = await this.getEligibleEmployees(organizationId, employeeIds);

      const results = {
        success: [],
        errors: [],
        summary: {
          totalGross: 0,
          totalNet: 0,
          totalTax: 0,
          totalEmployeeNi: 0,
          totalEmployerNi: 0,
          totalPension: 0,
          totalEmployerPension: 0,
          totalStudentLoans: 0,
          totalEmployerCost: 0
        }
      };

      // Process each employee
      for (const employee of employees) {
        try {
          const payslip = await this.calculateEmployeePayroll({
            employee,
            organizationId,
            payPeriodStart,
            payPeriodEnd,
            payDate,
            payFrequency,
            payrollRunId: payrollRun.id,
            isDraft
          });

          results.success.push(payslip);

          // Update summary
          results.summary.totalGross += payslip.grossPay || 0;
          results.summary.totalNet += payslip.netPay || 0;
          results.summary.totalTax += payslip.tax || 0;
          results.summary.totalEmployeeNi += payslip.employeeNi || 0;
          results.summary.totalEmployerNi += payslip.employerNi || 0;
          results.summary.totalPension += payslip.pension || 0;
          results.summary.totalEmployerPension += payslip.employerPension || 0;
          results.summary.totalStudentLoans += payslip.studentLoan || 0;

        } catch (error) {
          results.errors.push({
            employeeId: employee.id,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            error: error.message
          });
        }
      }

      // Calculate total employer cost
      results.summary.totalEmployerCost = results.summary.totalGross +
        results.summary.totalEmployerNi +
        results.summary.totalEmployerPension;

      // Update payroll run with results
      await db.query(`
        UPDATE payroll_runs SET
          status = $1,
          total_employees = $2,
          total_gross = $3,
          total_net = $4,
          total_tax = $5,
          total_employee_ni = $6,
          total_employer_ni = $7,
          total_pension = $8,
          total_employer_pension = $9,
          total_student_loans = $10,
          total_employer_cost = $11,
          errors = $12,
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = $13
      `, [
        isDraft ? 'draft' : 'pending_approval',
        results.success.length,
        results.summary.totalGross,
        results.summary.totalNet,
        results.summary.totalTax,
        results.summary.totalEmployeeNi,
        results.summary.totalEmployerNi,
        results.summary.totalPension,
        results.summary.totalEmployerPension,
        results.summary.totalStudentLoans,
        results.summary.totalEmployerCost,
        JSON.stringify(results.errors),
        payrollRun.id
      ]);

      return {
        payrollRunId: payrollRun.id,
        status: isDraft ? 'draft' : 'pending_approval',
        employeesProcessed: results.success.length,
        employeesFailed: results.errors.length,
        ...results.summary,
        errors: results.errors
      };

    } catch (error) {
      // Mark run as failed
      await db.query(`
        UPDATE payroll_runs SET
          status = 'failed',
          errors = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify([{ error: error.message }]), payrollRun.id]);

      throw error;
    }
  }

  /**
   * Calculate payroll for a single employee
   */
  async calculateEmployeePayroll(options) {
    const {
      employee,
      organizationId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      payFrequency,
      payrollRunId,
      isDraft
    } = options;

    // Get employee payroll settings
    const settings = await this.getEmployeePayrollSettings(employee.id);

    // Step 1: Gather time data
    const timeData = await this.gatherTimeData({
      employeeId: employee.id,
      organizationId,
      payPeriodStart,
      payPeriodEnd
    });

    // Step 2: Calculate gross pay
    const grossPayResult = await this.calculateGrossPay({
      employee,
      timeData,
      settings,
      payFrequency
    });

    // Step 3: Get approved bonuses for this period
    const bonuses = await this.getApprovedBonuses({
      employeeId: employee.id,
      organizationId,
      payPeriodEnd
    });

    // Add bonus to gross
    const totalBonuses = bonuses.reduce((sum, b) => sum + parseFloat(b.payout_amount), 0);
    grossPayResult.grossPay += totalBonuses;
    grossPayResult.bonuses = bonuses;

    // Step 4: Calculate deductions using provider
    const countryCode = employee.country_code || 'GB';
    const provider = await getPayrollProvider(countryCode, organizationId);

    const calculationInput = {
      employeeId: employee.id,
      annualSalary: employee.annual_salary,
      hourlyRate: employee.hourly_rate,
      hoursWorked: timeData.regularHours,
      overtimeHours: timeData.overtimeHours,
      overtimeMultiplier: this.defaultOvertimeMultiplier,
      bonuses: bonuses.map(b => ({ amount: parseFloat(b.payout_amount), description: b.description })),
      taxCode: settings.tax_code || '1257L',
      niCategory: settings.ni_category || 'A',
      region: employee.region || 'England',
      studentLoanPlans: this.getStudentLoanPlans(settings),
      pensionContributionPercent: settings.pension_employee_percent || 5,
      employerPensionPercent: settings.pension_employer_percent || 3,
      payFrequency,
      grossPay: grossPayResult.grossPay
    };

    const calculation = await provider.calculate(calculationInput);

    // Step 5: Create payslip
    const payslip = await this.createPayslip({
      organizationId,
      employeeId: employee.id,
      payrollRunId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      grossPayResult,
      calculation,
      bonuses,
      settings,
      isDraft
    });

    // Step 6: Update YTD
    await this.updateYTD({
      employeeId: employee.id,
      organizationId,
      payslip,
      payDate
    });

    // Step 7: Mark bonuses as paid
    for (const bonus of bonuses) {
      await db.query(`
        UPDATE bonus_payouts SET
          status = 'paid',
          paid_at = NOW(),
          payroll_run_id = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [payslip.id, bonus.id]);
    }

    return payslip;
  }

  /**
   * Preview payroll calculation for an employee (no database changes)
   */
  async previewPayroll(options) {
    const {
      employeeId,
      organizationId,
      payPeriodStart,
      payPeriodEnd,
      payFrequency = 'monthly'
    } = options;

    // Get employee
    const empResult = await db.query(
      'SELECT * FROM employees WHERE id = $1 AND organization_id = $2',
      [employeeId, organizationId]
    );

    if (empResult.rows.length === 0) {
      throw new Error('Employee not found');
    }

    const employee = empResult.rows[0];
    const settings = await this.getEmployeePayrollSettings(employeeId);

    // Gather time data
    const timeData = await this.gatherTimeData({
      employeeId,
      organizationId,
      payPeriodStart,
      payPeriodEnd
    });

    // Calculate gross
    const grossPayResult = await this.calculateGrossPay({
      employee,
      timeData,
      settings,
      payFrequency
    });

    // Get pending bonuses
    const bonuses = await this.getApprovedBonuses({
      employeeId,
      organizationId,
      payPeriodEnd
    });

    const totalBonuses = bonuses.reduce((sum, b) => sum + parseFloat(b.payout_amount), 0);

    // Calculate using provider
    const countryCode = employee.country_code || 'GB';
    const provider = await getPayrollProvider(countryCode, organizationId);

    const calculation = await provider.calculate({
      employeeId,
      annualSalary: employee.annual_salary,
      hourlyRate: employee.hourly_rate,
      hoursWorked: timeData.regularHours,
      overtimeHours: timeData.overtimeHours,
      bonuses: bonuses.map(b => ({ amount: parseFloat(b.payout_amount), description: b.description })),
      taxCode: settings.tax_code || '1257L',
      niCategory: settings.ni_category || 'A',
      region: employee.region || 'England',
      studentLoanPlans: this.getStudentLoanPlans(settings),
      pensionContributionPercent: settings.pension_employee_percent || 5,
      employerPensionPercent: settings.pension_employer_percent || 3,
      payFrequency,
      grossPay: grossPayResult.grossPay + totalBonuses
    });

    return {
      preview: true,
      employee: {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        employeeNumber: employee.employee_number
      },
      period: { payPeriodStart, payPeriodEnd },
      timeData,
      grossPayResult,
      bonuses,
      calculation,
      provider: calculation.provider,
      certified: calculation.certified,
      warning: calculation.warning
    };
  }

  // ============================================================
  // DATA GATHERING
  // ============================================================

  /**
   * Get eligible employees for payroll
   */
  async getEligibleEmployees(organizationId, employeeIds = null) {
    let query = `
      SELECT e.*, eps.*
      FROM employees e
      LEFT JOIN employee_payroll_settings eps ON eps.employee_id = e.id
      WHERE e.organization_id = $1
        AND e.status = 'active'
        AND e.employment_end_date IS NULL
    `;

    const params = [organizationId];

    if (employeeIds && employeeIds.length > 0) {
      query += ` AND e.id = ANY($2)`;
      params.push(employeeIds);
    }

    query += ` ORDER BY e.last_name, e.first_name`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get employee payroll settings
   */
  async getEmployeePayrollSettings(employeeId) {
    const result = await db.query(
      'SELECT * FROM employee_payroll_settings WHERE employee_id = $1',
      [employeeId]
    );

    return result.rows[0] || {
      tax_code: '1257L',
      ni_category: 'A',
      pension_opt_in: true,
      pension_employee_percent: 5,
      pension_employer_percent: 3
    };
  }

  /**
   * Gather time entry data for the period
   */
  async gatherTimeData(options) {
    const { employeeId, organizationId, payPeriodStart, payPeriodEnd } = options;

    // Get time entries
    const result = await db.query(`
      SELECT
        COALESCE(SUM(regular_hours), 0) as total_regular,
        COALESCE(SUM(overtime_hours), 0) as total_overtime,
        COALESCE(SUM(holiday_hours), 0) as total_holiday,
        COALESCE(SUM(sick_hours), 0) as total_sick,
        COUNT(*) as entry_count
      FROM time_entries
      WHERE employee_id = $1
        AND organization_id = $2
        AND work_date >= $3
        AND work_date <= $4
        AND status = 'approved'
    `, [employeeId, organizationId, payPeriodStart, payPeriodEnd]);

    const data = result.rows[0];

    // Get approved time off for the period
    const timeOffResult = await db.query(`
      SELECT
        COALESCE(SUM(
          CASE WHEN status = 'approved' THEN
            EXTRACT(days FROM (
              LEAST(end_date, $4::date) - GREATEST(start_date, $3::date) + 1
            )) * 8
          ELSE 0 END
        ), 0) as time_off_hours
      FROM time_off_requests
      WHERE employee_id = $1
        AND organization_id = $2
        AND start_date <= $4
        AND end_date >= $3
        AND status = 'approved'
    `, [employeeId, organizationId, payPeriodStart, payPeriodEnd]);

    return {
      regularHours: parseFloat(data.total_regular) || 0,
      overtimeHours: parseFloat(data.total_overtime) || 0,
      holidayHours: parseFloat(data.total_holiday) || 0,
      sickHours: parseFloat(data.total_sick) || 0,
      timeOffHours: parseFloat(timeOffResult.rows[0]?.time_off_hours) || 0,
      entryCount: parseInt(data.entry_count) || 0
    };
  }

  /**
   * Get approved bonuses awaiting payout
   */
  async getApprovedBonuses(options) {
    const { employeeId, organizationId, payPeriodEnd } = options;

    const result = await db.query(`
      SELECT bp.*, ps.period as score_period
      FROM bonus_payouts bp
      LEFT JOIN performance_scores ps ON ps.id = bp.performance_score_id
      WHERE bp.employee_id = $1
        AND bp.organization_id = $2
        AND bp.status = 'approved'
        AND bp.payroll_run_id IS NULL
        AND bp.created_at <= $3
      ORDER BY bp.created_at
    `, [employeeId, organizationId, payPeriodEnd]);

    return result.rows;
  }

  // ============================================================
  // CALCULATIONS
  // ============================================================

  /**
   * Calculate gross pay from time data
   */
  async calculateGrossPay(options) {
    const { employee, timeData, settings, payFrequency } = options;

    const periodsPerYear = this.getPeriodsPerYear(payFrequency);
    let grossPay = 0;
    const earnings = [];

    // If salaried
    if (employee.annual_salary) {
      const periodSalary = employee.annual_salary / periodsPerYear;
      grossPay += periodSalary;
      earnings.push({
        type: 'basic',
        description: 'Basic Salary',
        amount: this.round(periodSalary)
      });
    }

    // If hourly
    if (employee.hourly_rate) {
      const regularPay = timeData.regularHours * employee.hourly_rate;
      grossPay += regularPay;
      earnings.push({
        type: 'basic',
        description: 'Basic Pay',
        hours: timeData.regularHours,
        rate: employee.hourly_rate,
        amount: this.round(regularPay)
      });

      if (timeData.overtimeHours > 0) {
        const otRate = employee.hourly_rate * this.defaultOvertimeMultiplier;
        const overtimePay = timeData.overtimeHours * otRate;
        grossPay += overtimePay;
        earnings.push({
          type: 'overtime',
          description: 'Overtime',
          hours: timeData.overtimeHours,
          rate: this.round(otRate),
          amount: this.round(overtimePay)
        });
      }
    }

    return {
      grossPay: this.round(grossPay),
      earnings,
      timeData
    };
  }

  /**
   * Get student loan plans array
   */
  getStudentLoanPlans(settings) {
    const plans = [];
    if (settings.student_loan_plan_1) plans.push('plan1');
    if (settings.student_loan_plan_2) plans.push('plan2');
    if (settings.student_loan_plan_4) plans.push('plan4');
    if (settings.student_loan_plan_5) plans.push('plan5');
    if (settings.student_loan_postgrad) plans.push('postgrad');
    return plans;
  }

  // ============================================================
  // PAYSLIP CREATION
  // ============================================================

  /**
   * Create payslip record
   */
  async createPayslip(options) {
    const {
      organizationId,
      employeeId,
      payrollRunId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      grossPayResult,
      calculation,
      bonuses,
      settings,
      isDraft
    } = options;

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Create payslip
      const payslipResult = await client.query(`
        INSERT INTO payslips (
          organization_id, employee_id, payroll_run_id,
          pay_period_start, pay_period_end, pay_date,
          gross_pay, net_pay,
          regular_hours, overtime_hours, holiday_hours,
          status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        organizationId,
        employeeId,
        payrollRunId,
        payPeriodStart,
        payPeriodEnd,
        payDate,
        calculation.grossPay,
        calculation.netPay,
        grossPayResult.timeData.regularHours,
        grossPayResult.timeData.overtimeHours,
        grossPayResult.timeData.holidayHours,
        isDraft ? 'draft' : 'pending',
        calculation.warning || null
      ]);

      const payslip = payslipResult.rows[0];

      // Add earnings items
      let sortOrder = 0;
      for (const earning of (calculation.earnings || grossPayResult.earnings || [])) {
        await client.query(`
          INSERT INTO payslip_items (
            payslip_id, item_type, category, description,
            amount, quantity, rate, is_taxable, sort_order
          )
          VALUES ($1, 'earning', $2, $3, $4, $5, $6, true, $7)
        `, [
          payslip.id,
          earning.type,
          earning.description,
          earning.amount,
          earning.hours || null,
          earning.rate || null,
          sortOrder++
        ]);
      }

      // Add bonus items
      for (const bonus of bonuses) {
        await client.query(`
          INSERT INTO payslip_items (
            payslip_id, item_type, category, description,
            amount, is_taxable, sort_order
          )
          VALUES ($1, 'earning', 'bonus', $2, $3, true, $4)
        `, [payslip.id, bonus.description || 'Performance Bonus', bonus.payout_amount, sortOrder++]);
      }

      // Add deduction items
      for (const deduction of (calculation.deductions || [])) {
        await client.query(`
          INSERT INTO payslip_items (
            payslip_id, item_type, category, description,
            amount, sort_order
          )
          VALUES ($1, 'deduction', $2, $3, $4, $5)
        `, [payslip.id, deduction.type, deduction.description, deduction.amount, sortOrder++]);
      }

      // Add employer cost items (for transparency)
      if (calculation.employerNi > 0) {
        await client.query(`
          INSERT INTO payslip_items (
            payslip_id, item_type, category, description, amount, sort_order
          )
          VALUES ($1, 'employer', 'ni', 'Employer NI Contribution', $2, $3)
        `, [payslip.id, calculation.employerNi, sortOrder++]);
      }

      if (calculation.employerPension > 0) {
        await client.query(`
          INSERT INTO payslip_items (
            payslip_id, item_type, category, description, amount, sort_order
          )
          VALUES ($1, 'employer', 'pension', 'Employer Pension Contribution', $2, $3)
        `, [payslip.id, calculation.employerPension, sortOrder++]);
      }

      await client.query('COMMIT');

      return {
        id: payslip.id,
        employeeId,
        payPeriodStart,
        payPeriodEnd,
        payDate,
        grossPay: calculation.grossPay,
        netPay: calculation.netPay,
        tax: calculation.tax,
        employeeNi: calculation.employeeNi,
        employerNi: calculation.employerNi,
        pension: calculation.pension,
        employerPension: calculation.employerPension,
        studentLoan: calculation.studentLoan,
        bonusTotal: bonuses.reduce((sum, b) => sum + parseFloat(b.payout_amount), 0),
        provider: calculation.provider,
        certified: calculation.certified
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update YTD totals
   */
  async updateYTD(options) {
    const { employeeId, organizationId, payslip, payDate } = options;

    // Determine tax year
    const date = new Date(payDate);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const taxYear = month >= 4 ? `${year}/${year + 1 - 2000}` : `${year - 1}/${year - 2000}`;

    await db.query(`
      INSERT INTO payslip_ytd (
        employee_id, organization_id, tax_year,
        gross_pay_ytd, taxable_pay_ytd, tax_paid_ytd,
        ni_paid_ytd, pension_ytd, net_pay_ytd
      )
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id, organization_id, tax_year)
      DO UPDATE SET
        gross_pay_ytd = payslip_ytd.gross_pay_ytd + $4,
        taxable_pay_ytd = payslip_ytd.taxable_pay_ytd + $4,
        tax_paid_ytd = payslip_ytd.tax_paid_ytd + $5,
        ni_paid_ytd = payslip_ytd.ni_paid_ytd + $6,
        pension_ytd = payslip_ytd.pension_ytd + $7,
        net_pay_ytd = payslip_ytd.net_pay_ytd + $8,
        updated_at = NOW()
    `, [
      employeeId,
      organizationId,
      taxYear,
      payslip.grossPay,
      payslip.tax,
      payslip.employeeNi,
      payslip.pension,
      payslip.netPay
    ]);
  }

  // ============================================================
  // APPROVAL WORKFLOW
  // ============================================================

  /**
   * Approve a payroll run
   */
  async approvePayrollRun(runId, userId) {
    // Get run and payslips
    const runResult = await db.query(
      'SELECT * FROM payroll_runs WHERE id = $1',
      [runId]
    );

    if (runResult.rows.length === 0) {
      throw new Error('Payroll run not found');
    }

    const run = runResult.rows[0];

    if (run.status !== 'draft' && run.status !== 'pending_approval') {
      throw new Error(`Cannot approve run with status: ${run.status}`);
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Update run status
      await client.query(`
        UPDATE payroll_runs SET
          status = 'approved',
          approved_by = $1,
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
      `, [userId, runId]);

      // Update all payslips to approved
      await client.query(`
        UPDATE payslips SET
          status = 'approved',
          updated_at = NOW()
        WHERE payroll_run_id = $1
      `, [runId]);

      // Get employee IDs for notifications
      const employeeResult = await client.query(`
        SELECT DISTINCT employee_id, pay_period_start, pay_period_end
        FROM payslips
        WHERE payroll_run_id = $1
      `, [runId]);

      await client.query('COMMIT');

      // Send notifications (async, don't block)
      for (const row of employeeResult.rows) {
        try {
          await notifyPayslipAvailable(
            row.employee_id,
            run.organization_id,
            { payPeriodStart: row.pay_period_start, payPeriodEnd: row.pay_period_end }
          );
        } catch (e) {
          console.error('Failed to send payslip notification:', e);
        }
      }

      return { success: true, status: 'approved' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject a payroll run
   */
  async rejectPayrollRun(runId, userId, reason) {
    const result = await db.query(`
      UPDATE payroll_runs SET
        status = 'rejected',
        rejected_by = $1,
        rejected_at = NOW(),
        rejection_reason = $2,
        updated_at = NOW()
      WHERE id = $3
        AND status IN ('draft', 'pending_approval')
      RETURNING *
    `, [userId, reason, runId]);

    if (result.rows.length === 0) {
      throw new Error('Payroll run not found or cannot be rejected');
    }

    // Mark payslips as rejected
    await db.query(`
      UPDATE payslips SET
        status = 'rejected',
        notes = $1,
        updated_at = NOW()
      WHERE payroll_run_id = $2
    `, [reason, runId]);

    return { success: true, status: 'rejected' };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  getPeriodsPerYear(frequency) {
    switch (frequency.toLowerCase()) {
      case 'weekly': return 52;
      case 'fortnightly': return 26;
      case 'fourweekly': return 13;
      case 'monthly': return 12;
      default: return 12;
    }
  }

  round(value) {
    return Math.round(value * 100) / 100;
  }
}

// Export singleton
export const payrollEngine = new PayrollEngine();
export default payrollEngine;
