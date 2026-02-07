/**
 * US Payroll Calculator
 * Handles Federal Income Tax, FICA (Social Security, Medicare), and NC State Tax
 * Tax Year: 2025
 */

export class USPayrollCalculator {
  constructor(config) {
    this.config = config;
    this.validateConfig();
  }

  validateConfig() {
    if (!this.config || this.config.country !== 'US') {
      throw new Error('Invalid US payroll configuration');
    }
  }

  /**
   * Calculate full payslip for an employee
   * @param {Object} employee - Employee profile with US-specific settings
   * @param {Object} payPeriod - Pay period details
   * @param {Object} ytdFigures - Year-to-date figures
   * @returns {Object} Standardized payslip object
   */
  calculate(employee, payPeriod, ytdFigures = {}) {
    const { grossPay, bonusPay = 0, supplementalPay = 0 } = payPeriod;
    const totalGross = grossPay + bonusPay + supplementalPay;

    // Calculate pre-tax deductions
    const preTaxDeductions = this.calculatePreTaxDeductions(employee, totalGross);

    // Calculate FICA (Social Security + Medicare)
    const fica = this.calculateFICA(employee, totalGross, ytdFigures);

    // Calculate federal withholding
    const federalTax = this.calculateFederalWithholding(
      employee,
      totalGross,
      preTaxDeductions,
      payPeriod
    );

    // Calculate supplemental tax on bonuses
    const supplementalTax = this.calculateSupplementalTax(bonusPay + supplementalPay);

    // Calculate state tax (NC)
    const stateTax = this.calculateStateTax(
      employee,
      totalGross,
      preTaxDeductions,
      payPeriod
    );

    // Calculate employer taxes
    const employerFICA = this.calculateEmployerFICA(totalGross, ytdFigures);
    const futa = this.calculateFUTA(totalGross, ytdFigures);
    const suta = this.calculateSUTA(employee, totalGross, ytdFigures);

    // Build payslip
    return this.buildPayslip({
      employee,
      payPeriod,
      grossPay,
      bonusPay,
      supplementalPay,
      preTaxDeductions,
      fica,
      federalTax,
      supplementalTax,
      stateTax,
      employerFICA,
      futa,
      suta,
      ytdFigures
    });
  }

  /**
   * Calculate pre-tax deductions (401k, health insurance, etc.)
   */
  calculatePreTaxDeductions(employee, grossPay) {
    const deductions = {
      retirement401k: 0,
      healthInsurance: 0,
      hsa: 0,
      fsa: 0,
      commuter: 0,
      total: 0
    };

    // 401(k) contributions
    if (employee.retirement401k) {
      const { contributionPercent, contributionAmount } = employee.retirement401k;

      if (contributionPercent) {
        deductions.retirement401k = Math.round(grossPay * contributionPercent * 100) / 100;
      } else if (contributionAmount) {
        deductions.retirement401k = contributionAmount;
      }

      // Check annual limits
      const annualLimit = this.config.preTaxDeductions['401k'].employeeLimit;
      const catchUpLimit = employee.age >= 50
        ? this.config.preTaxDeductions['401k'].catchUpLimit
        : 0;
      const superCatchUpLimit = (employee.age >= 60 && employee.age <= 63)
        ? this.config.preTaxDeductions['401k'].superCatchUpLimit
        : 0;

      const totalLimit = annualLimit + catchUpLimit + superCatchUpLimit;
      // YTD check would apply here in production
    }

    // Health insurance premium
    if (employee.healthInsurancePremium) {
      deductions.healthInsurance = employee.healthInsurancePremium;
    }

    // HSA contributions
    if (employee.hsaContribution) {
      deductions.hsa = employee.hsaContribution;
    }

    // FSA contributions
    if (employee.fsaContribution) {
      deductions.fsa = Math.min(
        employee.fsaContribution,
        this.config.preTaxDeductions.healthInsurance.fsaLimit / 12
      );
    }

    // Commuter benefits
    if (employee.commuterBenefit) {
      deductions.commuter = Math.min(
        employee.commuterBenefit,
        this.config.preTaxDeductions.commuter.transitParking
      );
    }

    deductions.total = Object.values(deductions)
      .filter(v => typeof v === 'number')
      .reduce((sum, val) => sum + val, 0) - deductions.total;

    return deductions;
  }

  /**
   * Calculate FICA taxes (Social Security + Medicare)
   */
  calculateFICA(employee, grossPay, ytdFigures) {
    const config = this.config.fica;
    const result = {
      socialSecurity: { amount: 0, rate: config.socialSecurity.employeeShare },
      medicare: { amount: 0, rate: config.medicare.employeeShare },
      additionalMedicare: { amount: 0, rate: 0 },
      total: 0
    };

    // Social Security (capped)
    const ytdSSWages = ytdFigures.socialSecurityWages || 0;
    const remainingSSWages = Math.max(0, config.socialSecurity.wageBase - ytdSSWages);
    const ssWages = Math.min(grossPay, remainingSSWages);

    result.socialSecurity.amount = Math.round(
      ssWages * config.socialSecurity.employeeShare * 100
    ) / 100;
    result.socialSecurity.wages = ssWages;
    result.socialSecurity.capped = ssWages < grossPay;

    // Medicare (no cap)
    result.medicare.amount = Math.round(
      grossPay * config.medicare.employeeShare * 100
    ) / 100;

    // Additional Medicare (over threshold)
    const filingStatus = employee.filingStatus || 'single';
    const threshold = config.additionalMedicare.threshold[filingStatus];
    const ytdMedicareWages = ytdFigures.medicareWages || 0;

    if (ytdMedicareWages + grossPay > threshold) {
      const wagesOverThreshold = Math.max(0,
        ytdMedicareWages + grossPay - Math.max(ytdMedicareWages, threshold)
      );
      result.additionalMedicare.amount = Math.round(
        wagesOverThreshold * config.additionalMedicare.rate * 100
      ) / 100;
      result.additionalMedicare.rate = config.additionalMedicare.rate;
    }

    result.total = result.socialSecurity.amount +
                   result.medicare.amount +
                   result.additionalMedicare.amount;

    return result;
  }

  /**
   * Calculate employer FICA
   */
  calculateEmployerFICA(grossPay, ytdFigures) {
    const config = this.config.fica;

    // Social Security (capped)
    const ytdSSWages = ytdFigures.socialSecurityWages || 0;
    const remainingSSWages = Math.max(0, config.socialSecurity.wageBase - ytdSSWages);
    const ssWages = Math.min(grossPay, remainingSSWages);

    const socialSecurity = Math.round(
      ssWages * config.socialSecurity.employerShare * 100
    ) / 100;

    // Medicare (no cap, no additional for employer)
    const medicare = Math.round(
      grossPay * config.medicare.employerShare * 100
    ) / 100;

    return {
      socialSecurity,
      medicare,
      total: socialSecurity + medicare
    };
  }

  /**
   * Calculate Federal Income Tax withholding
   */
  calculateFederalWithholding(employee, grossPay, preTaxDeductions, payPeriod) {
    const filingStatus = employee.filingStatus || 'single';
    const statusConfig = this.config.federalIncomeTax.filingStatuses[filingStatus];

    const periods = this.config.payPeriods[payPeriod.frequency].periods;

    // Calculate taxable wages
    const taxableWages = grossPay - preTaxDeductions.total;

    // Annualize for bracket calculation
    const annualWages = taxableWages * periods;

    // Standard deduction (annualized)
    const standardDeduction = statusConfig.standardDeduction;

    // W-4 adjustments
    const w4Adjustments = employee.w4 || {};
    const dependentCredit = (w4Adjustments.childDependents || 0) *
      this.config.w4.dependentsCredit.child +
      (w4Adjustments.otherDependents || 0) *
      this.config.w4.dependentsCredit.other;

    const otherIncome = w4Adjustments.otherIncome || 0;
    const deductions = w4Adjustments.deductions || 0;
    const extraWithholding = w4Adjustments.extraWithholding || 0;

    // Adjusted annual wages
    const adjustedAnnualWages = annualWages + otherIncome - deductions - standardDeduction;

    if (adjustedAnnualWages <= 0) {
      return {
        amount: extraWithholding,
        taxableWages,
        filingStatus,
        breakdown: []
      };
    }

    // Calculate tax using brackets
    let annualTax = 0;
    let remainingIncome = adjustedAnnualWages;
    const breakdown = [];

    for (const bracket of statusConfig.brackets) {
      if (remainingIncome <= 0) break;

      const bracketWidth = bracket.max ? bracket.max - bracket.min : Infinity;
      const incomeInBracket = Math.min(remainingIncome, bracketWidth);
      const taxInBracket = incomeInBracket * bracket.rate;

      if (incomeInBracket > 0) {
        breakdown.push({
          range: `${bracket.min} - ${bracket.max || 'and over'}`,
          rate: bracket.rate,
          income: incomeInBracket,
          tax: taxInBracket
        });
      }

      annualTax += taxInBracket;
      remainingIncome -= incomeInBracket;
    }

    // Convert to period amount
    let periodTax = annualTax / periods;

    // Apply dependent credit
    periodTax = Math.max(0, periodTax - (dependentCredit / periods));

    // Add extra withholding
    periodTax += extraWithholding;

    // Multiple jobs checkbox adjustment
    if (w4Adjustments.multipleJobs) {
      // Simplified: increase withholding by a factor
      periodTax *= 1.1;
    }

    return {
      amount: Math.round(periodTax * 100) / 100,
      taxableWages,
      filingStatus,
      breakdown
    };
  }

  /**
   * Calculate supplemental tax on bonuses
   */
  calculateSupplementalTax(supplementalWages) {
    if (supplementalWages <= 0) {
      return { amount: 0, rate: 0 };
    }

    const config = this.config.supplementalWages;
    const rate = supplementalWages > 1000000
      ? config.over1Million
      : config.flatRate;

    return {
      amount: Math.round(supplementalWages * rate * 100) / 100,
      rate,
      wages: supplementalWages
    };
  }

  /**
   * Calculate state income tax (NC)
   */
  calculateStateTax(employee, grossPay, preTaxDeductions, payPeriod) {
    const state = employee.state || 'NC';
    const stateConfig = this.config.stateIncomeTax[state];

    if (!stateConfig) {
      return { amount: 0, state, message: 'No state tax configuration' };
    }

    const filingStatus = employee.filingStatus || 'single';
    const periods = this.config.payPeriods[payPeriod.frequency].periods;

    // NC is a flat tax state
    const taxableWages = grossPay - preTaxDeductions.total;
    const annualWages = taxableWages * periods;

    // State standard deduction
    const standardDeduction = stateConfig.standardDeduction[filingStatus] ||
                              stateConfig.standardDeduction.single;

    // Child deduction (if applicable)
    let childDeduction = 0;
    if (employee.children && stateConfig.childDeduction) {
      const incomeLimit = stateConfig.childDeduction.incomePhaseout[filingStatus];
      if (annualWages < incomeLimit) {
        childDeduction = (employee.children * stateConfig.childDeduction.amount);
      }
    }

    const adjustedAnnualWages = Math.max(0,
      annualWages - standardDeduction - childDeduction
    );

    const annualTax = adjustedAnnualWages * stateConfig.rate;
    const periodTax = annualTax / periods;

    return {
      amount: Math.round(periodTax * 100) / 100,
      state,
      rate: stateConfig.rate,
      standardDeduction: standardDeduction / periods,
      taxableWages
    };
  }

  /**
   * Calculate FUTA (Federal Unemployment Tax)
   */
  calculateFUTA(grossPay, ytdFigures) {
    const config = this.config.futa;
    const ytdFutaWages = ytdFigures.futaWages || 0;

    const remainingWages = Math.max(0, config.wageBase - ytdFutaWages);
    const futaWages = Math.min(grossPay, remainingWages);

    const amount = Math.round(futaWages * config.effectiveRate * 100) / 100;

    return {
      amount,
      wages: futaWages,
      rate: config.effectiveRate,
      capped: futaWages < grossPay
    };
  }

  /**
   * Calculate SUTA (State Unemployment Tax)
   */
  calculateSUTA(employee, grossPay, ytdFigures) {
    const state = employee.state || 'NC';
    const stateConfig = this.config.suta[state];

    if (!stateConfig) {
      return { amount: 0, state };
    }

    const ytdSutaWages = ytdFigures.sutaWages || 0;
    const remainingWages = Math.max(0, stateConfig.wageBase - ytdSutaWages);
    const sutaWages = Math.min(grossPay, remainingWages);

    const rate = employee.sutaRate || stateConfig.newEmployerRate;
    const amount = Math.round(sutaWages * rate * 100) / 100;

    return {
      amount,
      wages: sutaWages,
      rate,
      state,
      capped: sutaWages < grossPay
    };
  }

  /**
   * Calculate 401(k) employer match
   */
  calculate401kMatch(employee, grossPay, employeeContribution) {
    if (!employee.retirement401k?.employerMatch) {
      return 0;
    }

    const { matchPercent, upToPercent } = employee.retirement401k.employerMatch;
    const maxMatchableSalary = grossPay * upToPercent;
    const matchableContribution = Math.min(employeeContribution, maxMatchableSalary);

    return Math.round(matchableContribution * matchPercent * 100) / 100;
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
      supplementalPay,
      preTaxDeductions,
      fica,
      federalTax,
      supplementalTax,
      stateTax,
      employerFICA,
      futa,
      suta,
      ytdFigures
    } = data;

    // Calculate 401k match
    const match401k = this.calculate401kMatch(
      employee,
      grossPay,
      preTaxDeductions.retirement401k
    );

    const totalDeductions =
      preTaxDeductions.total +
      fica.total +
      federalTax.amount +
      stateTax.amount;

    const netPay = grossPay + bonusPay + supplementalPay - totalDeductions;

    // Calculate YTD
    const ytd = {
      grossPay: (ytdFigures.grossPay || 0) + grossPay + bonusPay + supplementalPay,
      federalTax: (ytdFigures.federalTax || 0) + federalTax.amount,
      stateTax: (ytdFigures.stateTax || 0) + stateTax.amount,
      socialSecurity: (ytdFigures.socialSecurity || 0) + fica.socialSecurity.amount,
      medicare: (ytdFigures.medicare || 0) + fica.medicare.amount + fica.additionalMedicare.amount,
      socialSecurityWages: (ytdFigures.socialSecurityWages || 0) + (fica.socialSecurity.wages || grossPay),
      medicareWages: (ytdFigures.medicareWages || 0) + grossPay + bonusPay + supplementalPay,
      retirement401k: (ytdFigures.retirement401k || 0) + preTaxDeductions.retirement401k,
      futaWages: (ytdFigures.futaWages || 0) + (futa.wages || 0),
      sutaWages: (ytdFigures.sutaWages || 0) + (suta.wages || 0),
      netPay: (ytdFigures.netPay || 0) + netPay
    };

    return {
      country: 'US',
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
        ssn: employee.ssn ? `XXX-XX-${employee.ssn.slice(-4)}` : null,
        filingStatus: federalTax.filingStatus,
        state: stateTax.state
      },
      earnings: {
        basicPay: grossPay,
        bonus: bonusPay,
        supplemental: supplementalPay,
        totalGross: grossPay + bonusPay + supplementalPay
      },
      preTaxDeductions: {
        retirement401k: preTaxDeductions.retirement401k,
        healthInsurance: preTaxDeductions.healthInsurance,
        hsa: preTaxDeductions.hsa,
        fsa: preTaxDeductions.fsa,
        commuter: preTaxDeductions.commuter,
        total: preTaxDeductions.total
      },
      employeeDeductions: {
        federalTax: {
          amount: federalTax.amount,
          filingStatus: federalTax.filingStatus
        },
        stateTax: {
          amount: stateTax.amount,
          state: stateTax.state,
          rate: stateTax.rate
        },
        fica: {
          socialSecurity: {
            amount: fica.socialSecurity.amount,
            capped: fica.socialSecurity.capped
          },
          medicare: {
            amount: fica.medicare.amount
          },
          additionalMedicare: {
            amount: fica.additionalMedicare.amount
          },
          total: fica.total
        },
        total: Math.round(totalDeductions * 100) / 100
      },
      employerContributions: {
        fica: {
          socialSecurity: employerFICA.socialSecurity,
          medicare: employerFICA.medicare,
          total: employerFICA.total
        },
        futa: {
          amount: futa.amount,
          capped: futa.capped
        },
        suta: {
          amount: suta.amount,
          state: suta.state,
          capped: suta.capped
        },
        retirement401kMatch: match401k,
        total: Math.round(
          (employerFICA.total + futa.amount + suta.amount + match401k) * 100
        ) / 100
      },
      totals: {
        grossPay: grossPay + bonusPay + supplementalPay,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100
      },
      ytd
    };
  }
}

export default USPayrollCalculator;
