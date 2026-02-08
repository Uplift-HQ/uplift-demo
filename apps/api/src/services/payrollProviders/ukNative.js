// ============================================================
// UK NATIVE PAYROLL CALCULATOR
// Fallback calculator when PayRun.io is unavailable
// Uses 2025/26 HMRC rates
// ============================================================

/**
 * UK Tax Year 2025/26 Rates
 * Effective from 6 April 2025
 */
const UK_TAX_RATES_2025_26 = {
  // Personal Allowance
  personalAllowance: 12570,
  personalAllowanceTaperThreshold: 100000,
  personalAllowanceTaperRate: 0.5, // Reduces by £1 for every £2 over threshold

  // Income Tax Bands (England, Wales, NI)
  incomeTaxBands: [
    { name: 'Basic Rate', threshold: 37700, rate: 0.20 },
    { name: 'Higher Rate', threshold: 125140, rate: 0.40 },
    { name: 'Additional Rate', threshold: Infinity, rate: 0.45 }
  ],

  // Scottish Income Tax Bands
  scottishTaxBands: [
    { name: 'Starter Rate', threshold: 2306, rate: 0.19 },
    { name: 'Basic Rate', threshold: 13991, rate: 0.20 },
    { name: 'Intermediate Rate', threshold: 31092, rate: 0.21 },
    { name: 'Higher Rate', threshold: 62430, rate: 0.42 },
    { name: 'Advanced Rate', threshold: 125140, rate: 0.45 },
    { name: 'Top Rate', threshold: Infinity, rate: 0.48 }
  ],

  // National Insurance Thresholds (Employee)
  niEmployee: {
    primaryThreshold: 12570, // Annual (£242/week)
    upperEarningsLimit: 50270, // Annual (£967/week)
    primaryRate: 0.08, // 8% between PT and UEL
    reducedRate: 0.02  // 2% above UEL
  },

  // National Insurance Thresholds (Employer) - 2025/26 changes
  niEmployer: {
    secondaryThreshold: 5000, // Reduced from £9,100 (£96/week)
    rate: 0.15, // Increased from 13.8%
    employmentAllowance: 10500 // If eligible
  },

  // NI Categories
  niCategories: {
    A: { employeeRate: 0.08, employerRate: 0.15 }, // Standard
    B: { employeeRate: 0.0585, employerRate: 0.15 }, // Married women/widows
    C: { employeeRate: 0, employerRate: 0.15 }, // Over state pension age
    H: { employeeRate: 0.08, employerRate: 0 }, // Apprentice under 25
    J: { employeeRate: 0.02, employerRate: 0.15 }, // Deferred NI
    M: { employeeRate: 0.08, employerRate: 0 }, // Under 21
    Z: { employeeRate: 0.02, employerRate: 0 }  // Under 21, deferred
  },

  // Student Loan Thresholds (Annual)
  studentLoans: {
    plan1: { threshold: 24990, rate: 0.09 },
    plan2: { threshold: 27295, rate: 0.09 },
    plan4: { threshold: 31395, rate: 0.09 }, // Scotland
    plan5: { threshold: 25000, rate: 0.09 },
    postgrad: { threshold: 21000, rate: 0.06 }
  },

  // Pension Auto-Enrolment Thresholds
  pension: {
    lowerQualifyingEarnings: 6240,
    upperQualifyingEarnings: 50270,
    triggerThreshold: 10000,
    minimumEmployeeContribution: 0.05, // 5%
    minimumEmployerContribution: 0.03  // 3%
  }
};

/**
 * UK Native Payroll Calculator
 */
class UKNativeCalculator {
  constructor() {
    this.rates = UK_TAX_RATES_2025_26;
  }

  /**
   * Calculate payroll for a UK employee
   */
  async calculate(input) {
    const {
      annualSalary,
      hourlyRate,
      hoursWorked,
      overtimeHours = 0,
      overtimeMultiplier = 1.5,
      bonuses = [],
      taxCode = '1257L',
      niCategory = 'A',
      region = 'England', // England, Scotland, Wales, NI
      studentLoanPlans = [],
      pensionContributionPercent = 0,
      employerPensionPercent = 0,
      payFrequency = 'monthly', // weekly, fortnightly, monthly
      periodNumber = 1, // Which period in the tax year (1-12 for monthly)
      customDeductions = []
    } = input;

    // Calculate periods per year
    const periodsPerYear = this.getPeriodsPerYear(payFrequency);

    // Calculate gross pay for the period
    let grossPay = this.calculateGrossPay({
      annualSalary,
      hourlyRate,
      hoursWorked,
      overtimeHours,
      overtimeMultiplier,
      bonuses,
      periodsPerYear
    });

    // Parse tax code
    const taxCodeInfo = this.parseTaxCode(taxCode);

    // Calculate period allowance
    const periodAllowance = this.calculatePeriodAllowance(
      taxCodeInfo,
      grossPay * periodsPerYear,
      periodsPerYear
    );

    // Calculate income tax
    const taxResult = this.calculateIncomeTax(
      grossPay,
      periodAllowance,
      region === 'Scotland',
      periodsPerYear
    );

    // Calculate employee NI
    const employeeNI = this.calculateEmployeeNI(grossPay, niCategory, periodsPerYear);

    // Calculate employer NI
    const employerNI = this.calculateEmployerNI(grossPay, niCategory, periodsPerYear);

    // Calculate student loan repayments
    const studentLoanDeductions = this.calculateStudentLoans(
      grossPay,
      studentLoanPlans,
      periodsPerYear
    );

    // Calculate pension contributions
    const pensionResult = this.calculatePension(
      grossPay,
      pensionContributionPercent,
      employerPensionPercent,
      periodsPerYear
    );

    // Process custom deductions
    const totalCustomDeductions = customDeductions.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Calculate net pay
    const totalDeductions = taxResult.tax +
      employeeNI.contribution +
      studentLoanDeductions.total +
      pensionResult.employeeContribution +
      totalCustomDeductions;

    const netPay = grossPay - totalDeductions;

    // Build detailed breakdown
    const earnings = this.buildEarningsBreakdown(input, periodsPerYear);
    const deductions = this.buildDeductionsBreakdown(
      taxResult,
      employeeNI,
      studentLoanDeductions,
      pensionResult,
      customDeductions
    );

    return {
      success: true,
      provider: 'native',
      certified: false, // Native calculation not HMRC-certified
      warning: 'Calculated using native engine. For certified calculations, configure PayRun.io.',

      grossPay: this.round(grossPay),
      netPay: this.round(netPay),
      taxableIncome: this.round(grossPay - periodAllowance),

      // Tax breakdown
      tax: this.round(taxResult.tax),
      taxCode,
      taxBands: taxResult.bands,

      // NI breakdown
      employeeNi: this.round(employeeNI.contribution),
      employerNi: this.round(employerNI.contribution),
      niCategory,

      // Student loans
      studentLoan: this.round(studentLoanDeductions.total),
      studentLoanBreakdown: studentLoanDeductions.breakdown,

      // Pension
      pension: this.round(pensionResult.employeeContribution),
      employerPension: this.round(pensionResult.employerContribution),
      pensionBasis: pensionResult.qualifyingEarnings,

      // Totals
      totalDeductions: this.round(totalDeductions),
      totalEmployerCost: this.round(grossPay + employerNI.contribution + pensionResult.employerContribution),

      // Detailed breakdown
      earnings,
      deductions,

      // Period info
      payFrequency,
      periodNumber,
      periodsPerYear
    };
  }

  /**
   * Calculate gross pay for the period
   */
  calculateGrossPay({
    annualSalary,
    hourlyRate,
    hoursWorked,
    overtimeHours,
    overtimeMultiplier,
    bonuses,
    periodsPerYear
  }) {
    let gross = 0;

    if (annualSalary) {
      gross = annualSalary / periodsPerYear;
    } else if (hourlyRate && hoursWorked) {
      gross = hourlyRate * hoursWorked;
      gross += hourlyRate * overtimeHours * overtimeMultiplier;
    }

    // Add bonuses
    for (const bonus of bonuses) {
      gross += bonus.amount || 0;
    }

    return gross;
  }

  /**
   * Parse tax code to extract allowance
   */
  parseTaxCode(taxCode) {
    const code = taxCode.toUpperCase().trim();

    // Handle special codes
    if (code === 'BR') return { type: 'BR', allowance: 0 }; // Basic rate all
    if (code === 'D0') return { type: 'D0', allowance: 0 }; // Higher rate all
    if (code === 'D1') return { type: 'D1', allowance: 0 }; // Additional rate all
    if (code === 'NT') return { type: 'NT', allowance: 0 }; // No tax
    if (code === '0T') return { type: '0T', allowance: 0 }; // No allowance

    // Extract numeric part (e.g., "1257L" -> 1257)
    const match = code.match(/^(\d+)/);
    if (match) {
      const allowance = parseInt(match[1]) * 10;
      const suffix = code.substring(match[1].length);

      return {
        type: 'standard',
        allowance,
        suffix,
        isScottish: suffix.startsWith('S'),
        isWelsh: suffix.startsWith('C'),
        isCumulative: !suffix.includes('W1') && !suffix.includes('M1') && !suffix.includes('X')
      };
    }

    // Default to standard allowance
    return { type: 'standard', allowance: this.rates.personalAllowance };
  }

  /**
   * Calculate period allowance with tapering
   */
  calculatePeriodAllowance(taxCodeInfo, annualGross, periodsPerYear) {
    if (taxCodeInfo.type !== 'standard') {
      return taxCodeInfo.allowance / periodsPerYear;
    }

    let annualAllowance = taxCodeInfo.allowance;

    // Apply tapering if over £100k
    if (annualGross > this.rates.personalAllowanceTaperThreshold) {
      const excess = annualGross - this.rates.personalAllowanceTaperThreshold;
      const reduction = Math.floor(excess * this.rates.personalAllowanceTaperRate);
      annualAllowance = Math.max(0, annualAllowance - reduction);
    }

    return annualAllowance / periodsPerYear;
  }

  /**
   * Calculate income tax for the period
   */
  calculateIncomeTax(grossPay, periodAllowance, isScottish, periodsPerYear) {
    const taxableIncome = Math.max(0, grossPay - periodAllowance);

    if (taxableIncome <= 0) {
      return { tax: 0, bands: [] };
    }

    const bands = isScottish ? this.rates.scottishTaxBands : this.rates.incomeTaxBands;
    const periodBands = bands.map(b => ({
      ...b,
      threshold: b.threshold === Infinity ? Infinity : b.threshold / periodsPerYear
    }));

    let remainingIncome = taxableIncome;
    let totalTax = 0;
    const taxBands = [];
    let previousThreshold = 0;

    for (const band of periodBands) {
      if (remainingIncome <= 0) break;

      const bandWidth = band.threshold === Infinity
        ? remainingIncome
        : Math.min(remainingIncome, band.threshold - previousThreshold);

      if (bandWidth > 0) {
        const taxInBand = bandWidth * band.rate;
        totalTax += taxInBand;
        taxBands.push({
          name: band.name,
          rate: band.rate * 100,
          income: this.round(bandWidth),
          tax: this.round(taxInBand)
        });
        remainingIncome -= bandWidth;
      }

      previousThreshold = band.threshold;
    }

    return { tax: totalTax, bands: taxBands };
  }

  /**
   * Calculate employee National Insurance
   */
  calculateEmployeeNI(grossPay, category, periodsPerYear) {
    const catRates = this.rates.niCategories[category] || this.rates.niCategories.A;
    const primaryThreshold = this.rates.niEmployee.primaryThreshold / periodsPerYear;
    const upperLimit = this.rates.niEmployee.upperEarningsLimit / periodsPerYear;

    let contribution = 0;

    if (grossPay > primaryThreshold) {
      // Main rate between PT and UEL
      const mainBand = Math.min(grossPay, upperLimit) - primaryThreshold;
      contribution += mainBand * catRates.employeeRate;

      // Reduced rate above UEL
      if (grossPay > upperLimit) {
        contribution += (grossPay - upperLimit) * this.rates.niEmployee.reducedRate;
      }
    }

    return {
      contribution: Math.max(0, contribution),
      category,
      primaryThreshold: this.round(primaryThreshold),
      upperLimit: this.round(upperLimit)
    };
  }

  /**
   * Calculate employer National Insurance
   */
  calculateEmployerNI(grossPay, category, periodsPerYear) {
    const catRates = this.rates.niCategories[category] || this.rates.niCategories.A;
    const secondaryThreshold = this.rates.niEmployer.secondaryThreshold / periodsPerYear;

    let contribution = 0;

    if (grossPay > secondaryThreshold) {
      contribution = (grossPay - secondaryThreshold) * catRates.employerRate;
    }

    return {
      contribution: Math.max(0, contribution),
      secondaryThreshold: this.round(secondaryThreshold)
    };
  }

  /**
   * Calculate student loan repayments
   */
  calculateStudentLoans(grossPay, plans, periodsPerYear) {
    const breakdown = [];
    let total = 0;

    for (const plan of plans) {
      const planKey = plan.toLowerCase().replace(' ', '');
      const planRates = this.rates.studentLoans[planKey];

      if (planRates) {
        const periodThreshold = planRates.threshold / periodsPerYear;

        if (grossPay > periodThreshold) {
          const repayment = (grossPay - periodThreshold) * planRates.rate;
          total += repayment;
          breakdown.push({
            plan,
            threshold: this.round(periodThreshold),
            repayment: this.round(repayment)
          });
        }
      }
    }

    return { total, breakdown };
  }

  /**
   * Calculate pension contributions
   */
  calculatePension(grossPay, employeePercent, employerPercent, periodsPerYear) {
    const lowerThreshold = this.rates.pension.lowerQualifyingEarnings / periodsPerYear;
    const upperThreshold = this.rates.pension.upperQualifyingEarnings / periodsPerYear;

    // Qualifying earnings = earnings between thresholds
    const qualifyingEarnings = Math.max(0, Math.min(grossPay, upperThreshold) - lowerThreshold);

    const employeeContribution = qualifyingEarnings * (employeePercent / 100);
    const employerContribution = qualifyingEarnings * (employerPercent / 100);

    return {
      qualifyingEarnings: this.round(qualifyingEarnings),
      employeeContribution: this.round(employeeContribution),
      employerContribution: this.round(employerContribution),
      employeePercent,
      employerPercent
    };
  }

  /**
   * Build earnings breakdown for payslip
   */
  buildEarningsBreakdown(input, periodsPerYear) {
    const earnings = [];

    if (input.annualSalary) {
      earnings.push({
        type: 'basic',
        description: 'Basic Salary',
        amount: this.round(input.annualSalary / periodsPerYear)
      });
    } else if (input.hourlyRate && input.hoursWorked) {
      earnings.push({
        type: 'basic',
        description: 'Basic Pay',
        hours: input.hoursWorked,
        rate: input.hourlyRate,
        amount: this.round(input.hourlyRate * input.hoursWorked)
      });

      if (input.overtimeHours > 0) {
        const otRate = input.hourlyRate * (input.overtimeMultiplier || 1.5);
        earnings.push({
          type: 'overtime',
          description: 'Overtime',
          hours: input.overtimeHours,
          rate: this.round(otRate),
          amount: this.round(input.overtimeHours * otRate)
        });
      }
    }

    // Add bonuses
    for (const bonus of (input.bonuses || [])) {
      earnings.push({
        type: 'bonus',
        description: bonus.description || 'Bonus',
        amount: bonus.amount
      });
    }

    return earnings;
  }

  /**
   * Build deductions breakdown for payslip
   */
  buildDeductionsBreakdown(tax, ni, studentLoans, pension, customDeductions) {
    const deductions = [];

    if (tax.tax > 0) {
      deductions.push({
        type: 'tax',
        description: 'Income Tax (PAYE)',
        amount: this.round(tax.tax)
      });
    }

    if (ni.contribution > 0) {
      deductions.push({
        type: 'ni',
        description: 'National Insurance',
        amount: this.round(ni.contribution)
      });
    }

    if (pension.employeeContribution > 0) {
      deductions.push({
        type: 'pension',
        description: `Pension (${pension.employeePercent}%)`,
        amount: this.round(pension.employeeContribution)
      });
    }

    for (const sl of studentLoans.breakdown) {
      deductions.push({
        type: 'studentLoan',
        description: `Student Loan (${sl.plan})`,
        amount: sl.repayment
      });
    }

    for (const custom of customDeductions) {
      deductions.push({
        type: 'other',
        description: custom.description,
        amount: custom.amount
      });
    }

    return deductions;
  }

  /**
   * Get number of pay periods per year
   */
  getPeriodsPerYear(frequency) {
    switch (frequency.toLowerCase()) {
      case 'weekly': return 52;
      case 'fortnightly': return 26;
      case 'fourweekly': return 13;
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'annually': return 1;
      default: return 12;
    }
  }

  /**
   * Round to 2 decimal places
   */
  round(value) {
    return Math.round(value * 100) / 100;
  }

  /**
   * Calculate YTD values
   */
  calculateYTD(payslips) {
    return payslips.reduce((ytd, slip) => ({
      grossPayYTD: ytd.grossPayYTD + (slip.grossPay || 0),
      taxYTD: ytd.taxYTD + (slip.tax || 0),
      niYTD: ytd.niYTD + (slip.employeeNi || 0),
      pensionYTD: ytd.pensionYTD + (slip.pension || 0),
      netPayYTD: ytd.netPayYTD + (slip.netPay || 0)
    }), {
      grossPayYTD: 0,
      taxYTD: 0,
      niYTD: 0,
      pensionYTD: 0,
      netPayYTD: 0
    });
  }
}

// Export singleton and class
export const ukNativeCalculator = new UKNativeCalculator();
export { UKNativeCalculator, UK_TAX_RATES_2025_26 };
export default ukNativeCalculator;
