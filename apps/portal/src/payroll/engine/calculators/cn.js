/**
 * China Payroll Calculator
 * Handles cumulative IIT withholding, Social Insurance, and Housing Fund
 * Tax Year: 2025
 */

export class CNPayrollCalculator {
  constructor(config) {
    this.config = config;
    this.validateConfig();
  }

  validateConfig() {
    if (!this.config || this.config.country !== 'CN') {
      throw new Error('Invalid China payroll configuration');
    }
  }

  /**
   * Calculate full payslip for an employee
   * @param {Object} employee - Employee profile with China-specific settings
   * @param {Object} payPeriod - Pay period details
   * @param {Object} ytdFigures - Year-to-date figures (critical for cumulative method)
   * @returns {Object} Standardized payslip object
   */
  calculate(employee, payPeriod, ytdFigures = {}) {
    const { grossPay, bonusPay = 0 } = payPeriod;
    const totalGross = grossPay + bonusPay;

    // Get city configuration
    const city = employee.city || 'shanghai';
    const cityConfig = this.config.socialInsurance[city] || this.config.socialInsurance.shanghai;

    // Calculate social insurance
    const socialInsurance = this.calculateSocialInsurance(employee, grossPay, cityConfig);

    // Calculate housing fund
    const housingFund = this.calculateHousingFund(employee, grossPay, city);

    // Calculate additional deductions (special deductions)
    const additionalDeductions = this.calculateAdditionalDeductions(employee);

    // Calculate cumulative IIT
    const iit = this.calculateCumulativeIIT(
      employee,
      totalGross,
      socialInsurance,
      housingFund,
      additionalDeductions,
      ytdFigures
    );

    // Calculate annual bonus tax (if applicable)
    const bonusTax = bonusPay > 0 && employee.separateBonusTax
      ? this.calculateAnnualBonusTax(bonusPay)
      : null;

    // Build payslip
    return this.buildPayslip({
      employee,
      payPeriod,
      grossPay,
      bonusPay,
      socialInsurance,
      housingFund,
      additionalDeductions,
      iit,
      bonusTax,
      city,
      ytdFigures
    });
  }

  /**
   * Calculate social insurance contributions
   */
  calculateSocialInsurance(employee, grossPay, cityConfig) {
    const results = {
      employee: { total: 0, breakdown: {} },
      employer: { total: 0, breakdown: {} }
    };

    // Get contribution basis (capped between floor and ceiling)
    const getBasis = (config) => {
      return Math.max(
        config.floor.monthly,
        Math.min(grossPay, config.ceiling.monthly)
      );
    };

    // Pension Insurance
    const pensionBasis = getBasis(cityConfig.pensionInsurance);
    results.employee.breakdown.pension = Math.round(
      pensionBasis * cityConfig.pensionInsurance.employeeRate * 100
    ) / 100;
    results.employer.breakdown.pension = Math.round(
      pensionBasis * cityConfig.pensionInsurance.employerRate * 100
    ) / 100;

    // Medical Insurance
    const medicalBasis = getBasis(cityConfig.medicalInsurance);
    results.employee.breakdown.medical = Math.round(
      medicalBasis * cityConfig.medicalInsurance.employeeRate * 100
    ) / 100;
    results.employer.breakdown.medical = Math.round(
      medicalBasis * (cityConfig.medicalInsurance.employerRate +
                      (cityConfig.medicalInsurance.additionalEmployer || 0)) * 100
    ) / 100;

    // Unemployment Insurance
    const unemploymentBasis = getBasis(cityConfig.unemploymentInsurance);
    results.employee.breakdown.unemployment = Math.round(
      unemploymentBasis * cityConfig.unemploymentInsurance.employeeRate * 100
    ) / 100;
    results.employer.breakdown.unemployment = Math.round(
      unemploymentBasis * cityConfig.unemploymentInsurance.employerRate * 100
    ) / 100;

    // Work Injury Insurance (employer only)
    const workInjuryBasis = getBasis(cityConfig.workInjuryInsurance);
    const workInjuryRate = employee.workInjuryRate ||
                           cityConfig.workInjuryInsurance.employerRate.min;
    results.employer.breakdown.workInjury = Math.round(
      workInjuryBasis * workInjuryRate * 100
    ) / 100;

    // Maternity Insurance (employer only)
    const maternityBasis = getBasis(cityConfig.maternityInsurance);
    results.employer.breakdown.maternity = Math.round(
      maternityBasis * cityConfig.maternityInsurance.employerRate * 100
    ) / 100;

    // Calculate totals
    results.employee.total = Math.round(
      Object.values(results.employee.breakdown).reduce((sum, val) => sum + val, 0) * 100
    ) / 100;
    results.employer.total = Math.round(
      Object.values(results.employer.breakdown).reduce((sum, val) => sum + val, 0) * 100
    ) / 100;

    return results;
  }

  /**
   * Calculate housing fund contributions
   */
  calculateHousingFund(employee, grossPay, city) {
    const cityConfig = this.config.housingFund[city] || this.config.housingFund.shanghai;

    // Determine contribution rate
    const rate = employee.housingFundRate || cityConfig.defaultRate;
    const effectiveRate = Math.max(cityConfig.minRate, Math.min(rate, cityConfig.maxRate));

    // Calculate basis (capped)
    const basis = Math.max(
      cityConfig.floor.monthly,
      Math.min(grossPay, cityConfig.ceiling.monthly)
    );

    const contribution = Math.round(basis * effectiveRate * 100) / 100;

    return {
      employee: contribution,
      employer: contribution, // Equal contribution
      rate: effectiveRate,
      basis,
      total: contribution * 2
    };
  }

  /**
   * Calculate additional deductions (IIT special deductions)
   */
  calculateAdditionalDeductions(employee) {
    const config = this.config.additionalDeductions;
    let totalMonthly = 0;
    const breakdown = {};

    // Children's Education
    if (employee.childrenInEducation) {
      const amount = employee.childrenInEducation * config.childrenEducation.perChildMonthly;
      const split = employee.educationDeductionSplit || 1; // 1 = 100%, 0.5 = 50%
      breakdown.childrenEducation = amount * split;
      totalMonthly += breakdown.childrenEducation;
    }

    // Continuing Education
    if (employee.continuingEducation) {
      breakdown.continuingEducation = config.continuingEducation.degreeMonthly;
      totalMonthly += breakdown.continuingEducation;
    }

    // Housing Loan Interest
    if (employee.housingLoanInterest) {
      breakdown.housingLoanInterest = config.housingLoanInterest.monthly;
      totalMonthly += breakdown.housingLoanInterest;
    }

    // Housing Rent
    if (employee.renting && !employee.housingLoanInterest) {
      const cityTier = employee.cityTier || 'tier1Cities';
      breakdown.housingRent = config.housingRent[cityTier];
      totalMonthly += breakdown.housingRent;
    }

    // Elderly Support
    if (employee.supportingElderlyParents) {
      if (employee.isOnlyChild) {
        breakdown.elderlySupport = config.elderlySupport.onlyChildMonthly;
      } else {
        breakdown.elderlySupport = Math.min(
          employee.elderlySupportShare || config.elderlySupport.maxPerPersonIfShared,
          config.elderlySupport.maxPerPersonIfShared
        );
      }
      totalMonthly += breakdown.elderlySupport;
    }

    // Childcare (under 3)
    if (employee.childrenUnder3) {
      breakdown.childcare = employee.childrenUnder3 * config.childcare.perChildMonthly;
      totalMonthly += breakdown.childcare;
    }

    return {
      total: totalMonthly,
      breakdown
    };
  }

  /**
   * Calculate cumulative IIT using cumulative withholding method
   */
  calculateCumulativeIIT(employee, grossPay, socialInsurance, housingFund, additionalDeductions, ytdFigures) {
    const config = this.config.iit;

    // Basic deduction
    const basicDeduction = config.basicDeduction.monthly;

    // Current month taxable income
    const currentTaxable = Math.max(0,
      grossPay -
      socialInsurance.employee.total -
      housingFund.employee -
      basicDeduction -
      additionalDeductions.total
    );

    // YTD figures
    const ytdTaxableIncome = ytdFigures.taxableIncome || 0;
    const ytdTaxWithheld = ytdFigures.taxWithheld || 0;

    // Cumulative taxable income
    const cumulativeTaxable = ytdTaxableIncome + currentTaxable;

    // Find applicable bracket and calculate cumulative tax
    let cumulativeTax = 0;
    let appliedBracket = null;

    for (const bracket of config.taxBrackets) {
      if (cumulativeTaxable <= bracket.annualMax || bracket.annualMax === null) {
        cumulativeTax = (cumulativeTaxable * bracket.rate) - bracket.quickDeduction;
        appliedBracket = bracket;
        break;
      }
    }

    // Current month tax = cumulative tax - already withheld
    const currentTax = Math.max(0, cumulativeTax - ytdTaxWithheld);

    return {
      currentMonthTaxable: currentTaxable,
      cumulativeTaxable,
      cumulativeTax: Math.round(cumulativeTax * 100) / 100,
      ytdTaxWithheld,
      currentMonthTax: Math.round(currentTax * 100) / 100,
      bracket: {
        level: appliedBracket?.level,
        rate: appliedBracket?.rate,
        quickDeduction: appliedBracket?.quickDeduction
      },
      deductions: {
        basic: basicDeduction,
        socialInsurance: socialInsurance.employee.total,
        housingFund: housingFund.employee,
        additional: additionalDeductions.total
      }
    };
  }

  /**
   * Calculate annual bonus tax using separate taxation method
   */
  calculateAnnualBonusTax(bonusAmount) {
    const config = this.config.annualBonus;

    // Divide by 12 to find applicable bracket
    const monthlyEquivalent = bonusAmount / 12;

    let appliedBracket = null;
    for (const bracket of config.bonusTaxTable) {
      if (monthlyEquivalent <= bracket.monthlyEquivalentMax || bracket.monthlyEquivalentMax === null) {
        appliedBracket = bracket;
        break;
      }
    }

    // Calculate tax on full bonus using bracket rate
    const tax = (bonusAmount * appliedBracket.rate) - appliedBracket.quickDeduction;

    return {
      bonusAmount,
      monthlyEquivalent,
      rate: appliedBracket.rate,
      quickDeduction: appliedBracket.quickDeduction,
      tax: Math.round(Math.max(0, tax) * 100) / 100
    };
  }

  /**
   * Handle foreigner-specific rules
   */
  calculateForeignerTax(employee, grossPay, ytdFigures) {
    const config = this.config.foreignerRules;

    // Check residence status
    const daysInChina = employee.daysInChina || 0;
    const isResident = daysInChina >= config.residentStatus.daysThreshold;

    if (!isResident) {
      // Non-resident: monthly calculation (not cumulative)
      return this.calculateNonResidentTax(employee, grossPay);
    }

    // Resident foreigner: can choose between standard deductions or allowances
    if (employee.useAllowanceSystem) {
      return this.calculateForeignerWithAllowances(employee, grossPay, ytdFigures);
    }

    // Standard calculation (same as local)
    return null; // Use standard calculation
  }

  /**
   * Calculate tax for non-resident foreigners
   */
  calculateNonResidentTax(employee, grossPay) {
    const basicDeduction = this.config.iit.basicDeduction.monthly;
    const taxable = Math.max(0, grossPay - basicDeduction);

    // Use standard brackets but calculate monthly (not cumulative)
    let tax = 0;
    let remainingIncome = taxable;

    // Convert annual brackets to monthly for non-residents
    for (const bracket of this.config.iit.taxBrackets) {
      const monthlyMax = bracket.annualMax ? bracket.annualMax / 12 : Infinity;
      const monthlyMin = bracket.annualMin / 12;

      if (remainingIncome <= 0) break;

      const incomeInBracket = Math.min(remainingIncome, monthlyMax - monthlyMin);
      if (incomeInBracket > 0) {
        tax += incomeInBracket * bracket.rate;
        remainingIncome -= incomeInBracket;
      }
    }

    return {
      method: 'nonResident',
      taxable,
      tax: Math.round(tax * 100) / 100
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
      socialInsurance,
      housingFund,
      additionalDeductions,
      iit,
      bonusTax,
      city,
      ytdFigures
    } = data;

    // Calculate total tax (regular + bonus if separate)
    const totalTax = bonusTax
      ? iit.currentMonthTax + bonusTax.tax
      : iit.currentMonthTax;

    const totalEmployeeDeductions =
      socialInsurance.employee.total +
      housingFund.employee +
      totalTax;

    const netPay = grossPay + bonusPay - totalEmployeeDeductions;

    // Calculate YTD
    const ytd = {
      grossPay: (ytdFigures.grossPay || 0) + grossPay + bonusPay,
      socialInsurance: (ytdFigures.socialInsurance || 0) + socialInsurance.employee.total,
      housingFund: (ytdFigures.housingFund || 0) + housingFund.employee,
      taxableIncome: iit.cumulativeTaxable,
      taxWithheld: (ytdFigures.taxWithheld || 0) + iit.currentMonthTax,
      bonusTax: (ytdFigures.bonusTax || 0) + (bonusTax?.tax || 0),
      netPay: (ytdFigures.netPay || 0) + netPay
    };

    return {
      country: 'CN',
      currency: this.config.currency,
      taxYear: this.config.taxYear,
      payPeriod: {
        frequency: 'monthly',
        periodNumber: payPeriod.periodNumber,
        startDate: payPeriod.startDate,
        endDate: payPeriod.endDate,
        payDate: payPeriod.payDate
      },
      employee: {
        id: employee.id,
        name: employee.name,
        idNumber: employee.idNumber ? `****${employee.idNumber.slice(-4)}` : null,
        city
      },
      earnings: {
        basicPay: grossPay,
        bonus: bonusPay,
        totalGross: grossPay + bonusPay
      },
      employeeDeductions: {
        socialInsurance: {
          total: socialInsurance.employee.total,
          breakdown: socialInsurance.employee.breakdown
        },
        housingFund: {
          amount: housingFund.employee,
          rate: housingFund.rate
        },
        iit: {
          amount: iit.currentMonthTax,
          cumulativeTaxable: iit.cumulativeTaxable,
          cumulativeTax: iit.cumulativeTax,
          bracket: iit.bracket,
          deductionsApplied: iit.deductions
        },
        bonusTax: bonusTax ? {
          amount: bonusTax.tax,
          method: 'separateTaxation',
          rate: bonusTax.rate
        } : null,
        additionalDeductions: {
          total: additionalDeductions.total,
          breakdown: additionalDeductions.breakdown
        },
        total: Math.round(totalEmployeeDeductions * 100) / 100
      },
      employerContributions: {
        socialInsurance: {
          total: socialInsurance.employer.total,
          breakdown: socialInsurance.employer.breakdown
        },
        housingFund: {
          amount: housingFund.employer,
          rate: housingFund.rate
        },
        total: Math.round(
          (socialInsurance.employer.total + housingFund.employer) * 100
        ) / 100
      },
      totals: {
        grossPay: grossPay + bonusPay,
        totalDeductions: Math.round(totalEmployeeDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100
      },
      ytd
    };
  }
}

export default CNPayrollCalculator;
