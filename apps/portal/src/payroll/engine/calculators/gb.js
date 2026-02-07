/**
 * UK Payroll Calculator
 * Handles PAYE income tax, National Insurance, Auto-enrolment pension, and Student Loans
 * Tax Year: 2025-26
 */

export class GBPayrollCalculator {
  constructor(config) {
    this.config = config;
    this.validateConfig();
  }

  validateConfig() {
    if (!this.config || this.config.country !== 'GB') {
      throw new Error('Invalid UK payroll configuration');
    }
  }

  /**
   * Calculate full payslip for an employee
   * @param {Object} employee - Employee profile with UK-specific settings
   * @param {Object} payPeriod - Pay period details
   * @param {Object} ytdFigures - Year-to-date figures
   * @returns {Object} Standardized payslip object
   */
  calculate(employee, payPeriod, ytdFigures = {}) {
    const { grossPay, bonusPay = 0, benefitsInKind = 0 } = payPeriod;
    const totalGross = grossPay + bonusPay;

    // Calculate pension first (affects NI if salary sacrifice)
    const pension = this.calculatePension(employee, totalGross, payPeriod);

    // Calculate NI-able earnings (reduced if salary sacrifice)
    const niAbleEarnings = employee.pensionMethod === 'salaryExchange'
      ? totalGross - pension.employeeContribution
      : totalGross;

    // Calculate National Insurance
    const nationalInsurance = this.calculateNationalInsurance(
      employee,
      niAbleEarnings,
      payPeriod
    );

    // Calculate taxable income
    const taxableIncome = this.calculateTaxableIncome(
      employee,
      totalGross,
      pension,
      benefitsInKind,
      payPeriod
    );

    // Calculate PAYE income tax
    const incomeTax = this.calculateIncomeTax(
      employee,
      taxableIncome,
      payPeriod,
      ytdFigures
    );

    // Calculate student loan repayments
    const studentLoan = this.calculateStudentLoan(
      employee,
      totalGross,
      payPeriod
    );

    // Calculate employer NI
    const employerNI = this.calculateEmployerNI(employee, niAbleEarnings, payPeriod);

    // Calculate employer pension contribution
    const employerPension = this.calculateEmployerPension(employee, totalGross, payPeriod);

    // Build payslip
    return this.buildPayslip({
      employee,
      payPeriod,
      grossPay,
      bonusPay,
      benefitsInKind,
      incomeTax,
      nationalInsurance,
      pension,
      studentLoan,
      employerNI,
      employerPension,
      ytdFigures
    });
  }

  /**
   * Calculate personal allowance (with taper for high earners)
   */
  calculatePersonalAllowance(annualIncome) {
    const { personalAllowance } = this.config.paye;

    if (annualIncome <= personalAllowance.incomeLimit) {
      return personalAllowance.standard;
    }

    const excess = annualIncome - personalAllowance.incomeLimit;
    const reduction = Math.floor(excess * personalAllowance.taperRate);

    return Math.max(0, personalAllowance.standard - reduction);
  }

  /**
   * Calculate taxable income after allowances and deductions
   */
  calculateTaxableIncome(employee, grossPay, pension, benefitsInKind, payPeriod) {
    const periods = this.config.payPeriods[payPeriod.frequency].periods;
    const annualGross = grossPay * periods;

    // Get personal allowance
    const personalAllowance = employee.taxCode
      ? this.parsePersonalAllowanceFromTaxCode(employee.taxCode)
      : this.calculatePersonalAllowance(annualGross);

    const periodAllowance = personalAllowance / periods;

    // Pension relief for tax purposes depends on the method:
    // - Net Pay Arrangement: Pension deducted before tax, reduces taxable income
    // - Relief at Source: Pension paid from net pay, provider claims basic rate relief
    //   (employee does NOT get PAYE reduction - relief is via provider)
    // - Salary Sacrifice/Exchange: Gross already reduced, no additional relief needed
    let pensionRelief = 0;
    if (employee.pensionMethod === 'netPay') {
      // Net Pay Arrangement: full tax relief at source
      pensionRelief = pension.employeeContribution;
    }
    // For reliefAtSource: NO reduction - relief claimed by provider, not in PAYE
    // For salaryExchange: NO reduction - gross already reduced by sacrifice amount

    const taxableIncome = Math.max(0, grossPay + benefitsInKind - periodAllowance - pensionRelief);

    return {
      gross: grossPay,
      allowance: periodAllowance,
      pensionRelief,
      benefitsInKind,
      taxable: taxableIncome,
      annualEquivalent: taxableIncome * periods
    };
  }

  /**
   * Parse personal allowance from tax code
   */
  parsePersonalAllowanceFromTaxCode(taxCode) {
    // Extract numeric part and multiply by 10
    const match = taxCode.match(/^([0-9]+)/);
    if (match) {
      return parseInt(match[1], 10) * 10;
    }

    // Special codes
    if (taxCode === 'BR' || taxCode === 'D0' || taxCode === 'D1') {
      return 0;
    }

    return this.config.paye.personalAllowance.standard;
  }

  /**
   * Calculate PAYE income tax
   */
  calculateIncomeTax(employee, taxableIncome, payPeriod, ytdFigures) {
    const periods = this.config.payPeriods[payPeriod.frequency].periods;
    const isScottish = employee.taxCode?.startsWith('S');

    const bands = isScottish
      ? this.config.paye.scottishBands
      : this.config.paye.taxBands;

    // Convert annual bands to period amounts
    const periodBands = bands.map(band => ({
      ...band,
      min: band.min / periods,
      max: band.max ? band.max / periods : null
    }));

    let tax = 0;
    let remainingIncome = taxableIncome.taxable;
    const breakdown = [];

    for (const band of periodBands) {
      if (remainingIncome <= 0) break;

      const bandWidth = band.max ? band.max - band.min : Infinity;
      const incomeInBand = Math.min(remainingIncome, bandWidth);
      const taxInBand = incomeInBand * band.rate;

      if (incomeInBand > 0) {
        breakdown.push({
          band: band.name,
          income: Math.round(incomeInBand * 100) / 100,
          rate: band.rate,
          tax: Math.round(taxInBand * 100) / 100
        });
      }

      tax += taxInBand;
      remainingIncome -= incomeInBand;
    }

    return {
      amount: Math.round(tax * 100) / 100,
      breakdown,
      taxCode: employee.taxCode || this.config.paye.taxCodes.default,
      isScottish
    };
  }

  /**
   * Calculate employee National Insurance contributions
   */
  calculateNationalInsurance(employee, earnings, payPeriod) {
    const niCategory = employee.niCategory || 'A';
    const categoryConfig = this.config.nationalInsurance.categories[niCategory];

    if (!categoryConfig) {
      throw new Error(`Invalid NI category: ${niCategory}`);
    }

    const period = payPeriod.frequency;
    const thresholds = {
      primary: categoryConfig.employee.primaryThreshold[period] ||
               categoryConfig.employee.primaryThreshold.monthly,
      upper: categoryConfig.employee.upperEarningsLimit[period] ||
             categoryConfig.employee.upperEarningsLimit.monthly
    };

    const rates = categoryConfig.employee.rates;

    let niContribution = 0;
    const breakdown = [];

    // Below primary threshold - no NI
    if (earnings <= thresholds.primary) {
      return {
        amount: 0,
        breakdown: [{ range: 'Below threshold', amount: 0 }],
        category: niCategory
      };
    }

    // Between primary threshold and upper earnings limit
    const earningsInMainBand = Math.min(earnings, thresholds.upper) - thresholds.primary;
    if (earningsInMainBand > 0) {
      const mainNI = earningsInMainBand * rates.betweenThresholds;
      niContribution += mainNI;
      breakdown.push({
        range: `${thresholds.primary.toFixed(2)} - ${thresholds.upper.toFixed(2)}`,
        rate: rates.betweenThresholds,
        earnings: earningsInMainBand,
        amount: Math.round(mainNI * 100) / 100
      });
    }

    // Above upper earnings limit
    if (earnings > thresholds.upper) {
      const excessEarnings = earnings - thresholds.upper;
      const additionalNI = excessEarnings * rates.aboveUpperLimit;
      niContribution += additionalNI;
      breakdown.push({
        range: `Above ${thresholds.upper.toFixed(2)}`,
        rate: rates.aboveUpperLimit,
        earnings: excessEarnings,
        amount: Math.round(additionalNI * 100) / 100
      });
    }

    return {
      amount: Math.round(niContribution * 100) / 100,
      breakdown,
      category: niCategory
    };
  }

  /**
   * Calculate employer National Insurance
   */
  calculateEmployerNI(employee, earnings, payPeriod) {
    const niCategory = employee.niCategory || 'A';
    const categoryConfig = this.config.nationalInsurance.categories[niCategory];

    const period = payPeriod.frequency;
    const secondaryThreshold = categoryConfig.employer?.secondaryThreshold?.[period] ||
                               categoryConfig.employer?.secondaryThreshold?.monthly ||
                               this.config.nationalInsurance.categories.A.employer.secondaryThreshold.monthly;

    const rate = categoryConfig.employer?.rates?.standard ||
                 this.config.nationalInsurance.categories.A.employer.rates.standard;

    if (earnings <= secondaryThreshold) {
      return { amount: 0, rate, threshold: secondaryThreshold };
    }

    const niableEarnings = earnings - secondaryThreshold;
    const amount = Math.round(niableEarnings * rate * 100) / 100;

    return {
      amount,
      rate,
      threshold: secondaryThreshold,
      niableEarnings
    };
  }

  /**
   * Calculate employee pension contribution
   */
  calculatePension(employee, grossPay, payPeriod) {
    if (!employee.pensionEnrolled) {
      return { employeeContribution: 0, basis: 0, rate: 0 };
    }

    const pensionConfig = this.config.pension.autoEnrolment;
    const periods = this.config.payPeriods[payPeriod.frequency].periods;

    // Get qualifying earnings limits for the period
    const lowerLimit = pensionConfig.qualifyingEarnings.lowerLimit.monthly;
    const upperLimit = pensionConfig.qualifyingEarnings.upperLimit.monthly;

    // Adjust for pay frequency
    const periodLowerLimit = lowerLimit * 12 / periods;
    const periodUpperLimit = upperLimit * 12 / periods;

    // Calculate qualifying earnings
    const qualifyingEarnings = Math.max(0,
      Math.min(grossPay, periodUpperLimit) - periodLowerLimit
    );

    // Employee contribution rate (default or custom)
    const rate = employee.pensionRate || pensionConfig.minimumContributions.employee;
    const contribution = Math.round(qualifyingEarnings * rate * 100) / 100;

    return {
      employeeContribution: contribution,
      basis: qualifyingEarnings,
      rate,
      method: employee.pensionMethod || 'reliefAtSource'
    };
  }

  /**
   * Calculate employer pension contribution
   */
  calculateEmployerPension(employee, grossPay, payPeriod) {
    if (!employee.pensionEnrolled) {
      return { amount: 0, rate: 0 };
    }

    const pensionConfig = this.config.pension.autoEnrolment;
    const periods = this.config.payPeriods[payPeriod.frequency].periods;

    const lowerLimit = pensionConfig.qualifyingEarnings.lowerLimit.monthly * 12 / periods;
    const upperLimit = pensionConfig.qualifyingEarnings.upperLimit.monthly * 12 / periods;

    const qualifyingEarnings = Math.max(0,
      Math.min(grossPay, upperLimit) - lowerLimit
    );

    const rate = employee.employerPensionRate || pensionConfig.minimumContributions.employer;
    const amount = Math.round(qualifyingEarnings * rate * 100) / 100;

    return { amount, rate, basis: qualifyingEarnings };
  }

  /**
   * Calculate student loan repayment
   */
  calculateStudentLoan(employee, grossPay, payPeriod) {
    if (!employee.studentLoanPlan) {
      return { amount: 0, plan: null };
    }

    const plans = employee.studentLoanPlan; // Can be array for multiple plans
    const planList = Array.isArray(plans) ? plans : [plans];

    const period = payPeriod.frequency;
    const repayments = [];
    let totalRepayment = 0;

    for (const planName of planList) {
      const planConfig = this.config.studentLoans[planName];
      if (!planConfig) continue;

      const threshold = planConfig.threshold[period] || planConfig.threshold.monthly;

      if (grossPay > threshold) {
        const repayableEarnings = grossPay - threshold;
        const repayment = Math.round(repayableEarnings * planConfig.rate * 100) / 100;

        repayments.push({
          plan: planName,
          threshold,
          rate: planConfig.rate,
          amount: repayment
        });

        totalRepayment += repayment;
      }
    }

    return {
      amount: Math.round(totalRepayment * 100) / 100,
      plans: repayments
    };
  }

  /**
   * Build standardized payslip object
   */
  buildPayslip(data) {
    const {
      employee,
      payPeriod,
      grossPay,
      bonusPay,
      benefitsInKind,
      incomeTax,
      nationalInsurance,
      pension,
      studentLoan,
      employerNI,
      employerPension,
      ytdFigures
    } = data;

    const totalDeductions = incomeTax.amount +
                            nationalInsurance.amount +
                            pension.employeeContribution +
                            studentLoan.amount;

    const netPay = grossPay + bonusPay - totalDeductions;

    // Calculate YTD
    const ytd = {
      grossPay: (ytdFigures.grossPay || 0) + grossPay + bonusPay,
      incomeTax: (ytdFigures.incomeTax || 0) + incomeTax.amount,
      nationalInsurance: (ytdFigures.nationalInsurance || 0) + nationalInsurance.amount,
      pension: (ytdFigures.pension || 0) + pension.employeeContribution,
      studentLoan: (ytdFigures.studentLoan || 0) + studentLoan.amount,
      netPay: (ytdFigures.netPay || 0) + netPay
    };

    return {
      country: 'GB',
      currency: this.config.currency,
      taxYear: this.config.taxYear,
      payPeriod: {
        frequency: payPeriod.frequency,
        periodNumber: payPeriod.periodNumber,
        startDate: payPeriod.startDate,
        endDate: payPeriod.endDate,
        payDate: payPeriod.payDate
      },
      employee: {
        id: employee.id,
        name: employee.name,
        niNumber: employee.niNumber,
        taxCode: incomeTax.taxCode
      },
      earnings: {
        basicPay: grossPay,
        bonus: bonusPay,
        benefitsInKind,
        totalGross: grossPay + bonusPay
      },
      employeeDeductions: {
        incomeTax: {
          amount: incomeTax.amount,
          breakdown: incomeTax.breakdown
        },
        nationalInsurance: {
          amount: nationalInsurance.amount,
          category: nationalInsurance.category,
          breakdown: nationalInsurance.breakdown
        },
        pension: {
          amount: pension.employeeContribution,
          rate: pension.rate,
          method: pension.method
        },
        studentLoan: {
          amount: studentLoan.amount,
          plans: studentLoan.plans
        },
        total: totalDeductions
      },
      employerContributions: {
        nationalInsurance: employerNI.amount,
        pension: employerPension.amount,
        total: employerNI.amount + employerPension.amount
      },
      totals: {
        grossPay: grossPay + bonusPay,
        totalDeductions,
        netPay: Math.round(netPay * 100) / 100
      },
      ytd
    };
  }
}

export default GBPayrollCalculator;
