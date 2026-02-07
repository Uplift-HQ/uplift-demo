/**
 * Polish Payroll Calculator
 * Handles PIT income tax, ZUS social insurance, Health Insurance, and PPK
 * Tax Year: 2025
 */

export class PLPayrollCalculator {
  constructor(config) {
    this.config = config;
    this.validateConfig();
  }

  validateConfig() {
    if (!this.config || this.config.country !== 'PL') {
      throw new Error('Invalid Polish payroll configuration');
    }
  }

  /**
   * Calculate full payslip for an employee
   * @param {Object} employee - Employee profile with Polish-specific settings
   * @param {Object} payPeriod - Pay period details
   * @param {Object} ytdFigures - Year-to-date figures
   * @returns {Object} Standardized payslip object
   */
  calculate(employee, payPeriod, ytdFigures = {}) {
    const { grossPay, bonusPay = 0 } = payPeriod;
    const totalGross = grossPay + bonusPay;

    // Calculate ZUS social insurance
    const zus = this.calculateZUS(employee, totalGross, ytdFigures);

    // Calculate health insurance (basis is gross minus ZUS)
    const healthInsurance = this.calculateHealthInsurance(totalGross, zus.employee.total);

    // Calculate PPK pension contributions
    const ppk = this.calculatePPK(employee, totalGross);

    // Check for tax exemptions
    const exemption = this.checkTaxExemptions(employee, ytdFigures, totalGross);

    // Calculate taxable income
    const taxableIncome = this.calculateTaxableIncome(
      employee,
      totalGross,
      zus.employee.total,
      exemption
    );

    // Calculate PIT income tax
    const pit = this.calculatePIT(employee, taxableIncome, ytdFigures, exemption);

    // Build payslip
    return this.buildPayslip({
      employee,
      payPeriod,
      grossPay,
      bonusPay,
      zus,
      healthInsurance,
      ppk,
      pit,
      exemption,
      ytdFigures
    });
  }

  /**
   * Check for tax exemptions (young, returning, 4+ children, seniors)
   */
  checkTaxExemptions(employee, ytdFigures, currentGross) {
    const exemptions = [];
    let totalExemptIncome = 0;
    const maxExemptIncome = this.config.pit.reliefForYoung.maxIncome;

    // Relief for young (under 26)
    if (employee.age < 26 && this.config.pit.reliefForYoung.enabled) {
      exemptions.push('young');
      totalExemptIncome = maxExemptIncome;
    }

    // Relief for returning emigrants
    if (employee.returningEmigrant && this.config.pit.reliefForReturn.enabled) {
      exemptions.push('return');
      totalExemptIncome = maxExemptIncome;
    }

    // Relief for parents of 4+ children
    if (employee.children >= 4 && this.config.pit.reliefForParents4Plus.enabled) {
      exemptions.push('parent4plus');
      totalExemptIncome = maxExemptIncome;
    }

    // Relief for working seniors
    if (employee.workingSenior && this.config.pit.reliefForSeniors.enabled) {
      exemptions.push('senior');
      totalExemptIncome = maxExemptIncome;
    }

    if (exemptions.length === 0) {
      return { exempt: false, exemptions: [], exemptIncome: 0 };
    }

    // Calculate how much of current income is exempt
    const ytdGross = ytdFigures.grossPay || 0;
    const remainingExemption = Math.max(0, totalExemptIncome - ytdGross);
    const exemptAmount = Math.min(currentGross, remainingExemption);

    return {
      exempt: exemptAmount > 0,
      exemptions,
      exemptIncome: exemptAmount,
      taxableIncome: currentGross - exemptAmount,
      limitReached: ytdGross + currentGross > totalExemptIncome
    };
  }

  /**
   * Calculate ZUS social insurance contributions
   */
  calculateZUS(employee, grossPay, ytdFigures) {
    const config = this.config.zus;

    // Check if contribution ceiling reached
    const ytdContributionBasis = ytdFigures.zusBasis || 0;
    const remainingBasis = Math.max(0, config.contributionBasis.maxAnnual - ytdContributionBasis);
    const cappedBasis = Math.min(grossPay, remainingBasis);

    const results = {
      employee: { total: 0, breakdown: {} },
      employer: { total: 0, breakdown: {} },
      basis: grossPay,
      cappedBasis
    };

    // Pension (Emerytalne) - capped
    results.employee.breakdown.emerytalne = Math.round(
      cappedBasis * config.emerytalne.employeeShare * 100
    ) / 100;
    results.employer.breakdown.emerytalne = Math.round(
      cappedBasis * config.emerytalne.employerShare * 100
    ) / 100;

    // Disability (Rentowe) - capped
    results.employee.breakdown.rentowe = Math.round(
      cappedBasis * config.rentowe.employeeShare * 100
    ) / 100;
    results.employer.breakdown.rentowe = Math.round(
      cappedBasis * config.rentowe.employerShare * 100
    ) / 100;

    // Sickness (Chorobowe) - NOT capped
    results.employee.breakdown.chorobowe = Math.round(
      grossPay * config.chorobowe.employeeShare * 100
    ) / 100;

    // Accident (Wypadkowe) - employer only, NOT capped
    const accidentRate = employee.accidentRate || config.wypadkowe.standardRate;
    results.employer.breakdown.wypadkowe = Math.round(
      grossPay * accidentRate * 100
    ) / 100;

    // Labor Fund (FP) - employer only
    results.employer.breakdown.fp = Math.round(
      grossPay * config.fp.rate * 100
    ) / 100;

    // Employee Guarantee Fund (FGSP) - employer only
    results.employer.breakdown.fgsp = Math.round(
      grossPay * config.fgsp.rate * 100
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
   * Calculate health insurance
   */
  calculateHealthInsurance(grossPay, zusEmployeeTotal) {
    const basis = grossPay - zusEmployeeTotal;
    const amount = Math.round(basis * this.config.healthInsurance.rate * 100) / 100;

    return {
      basis,
      rate: this.config.healthInsurance.rate,
      amount,
      taxDeductible: this.config.healthInsurance.deductibleFromTax
    };
  }

  /**
   * Calculate PPK contributions
   */
  calculatePPK(employee, grossPay) {
    if (!employee.ppkEnrolled) {
      return {
        employee: { basic: 0, voluntary: 0, total: 0 },
        employer: { basic: 0, voluntary: 0, total: 0 }
      };
    }

    const config = this.config.ppk.contributions;

    // Check for low income reduced contribution
    let employeeBasicRate = config.employee.basic;
    if (employee.lowIncome && grossPay < this.config.minimumWage.monthly * 1.2) {
      employeeBasicRate = this.config.ppk.lowIncomeReduction.minContribution;
    }

    const employeeBasic = Math.round(grossPay * employeeBasicRate * 100) / 100;
    const employeeVoluntary = employee.ppkVoluntaryRate
      ? Math.round(grossPay * Math.min(employee.ppkVoluntaryRate, config.employee.voluntary.max) * 100) / 100
      : 0;

    const employerBasic = Math.round(grossPay * config.employer.basic * 100) / 100;
    const employerVoluntary = employee.employerPpkVoluntaryRate
      ? Math.round(grossPay * Math.min(employee.employerPpkVoluntaryRate, config.employer.voluntary.max) * 100) / 100
      : 0;

    return {
      employee: {
        basic: employeeBasic,
        voluntary: employeeVoluntary,
        total: employeeBasic + employeeVoluntary,
        rate: employeeBasicRate
      },
      employer: {
        basic: employerBasic,
        voluntary: employerVoluntary,
        total: employerBasic + employerVoluntary
      }
    };
  }

  /**
   * Calculate taxable income after deductions
   */
  calculateTaxableIncome(employee, grossPay, zusEmployee, exemption) {
    // If fully exempt, no taxable income
    if (exemption.exempt && exemption.taxableIncome === 0) {
      return {
        gross: grossPay,
        zusDeduction: zusEmployee,
        costOfIncome: 0,
        taxable: 0,
        exempt: true
      };
    }

    // Use taxable portion if partially exempt
    const taxablePortion = exemption.exempt ? exemption.taxableIncome : grossPay;

    // Cost of income deduction
    let costOfIncome = this.config.pit.costOfIncome.standard.monthly;

    if (employee.commuting) {
      costOfIncome = this.config.pit.costOfIncome.commuting.monthly;
    }

    if (employee.creativeWork && employee.creativeWorkPercent) {
      // 50% cost deduction for creative work portion
      const creativeIncome = taxablePortion * employee.creativeWorkPercent;
      const maxCreativeBasis = this.config.pit.costOfIncome.creativeWork.maxBasis / 12;
      const creativeCost = Math.min(creativeIncome, maxCreativeBasis) *
                           this.config.pit.costOfIncome.creativeWork.rate;
      const regularCost = (taxablePortion - creativeIncome) > 0
        ? costOfIncome
        : 0;
      costOfIncome = creativeCost + regularCost;
    }

    // ZUS deduction from taxable portion
    const zusDeduction = exemption.exempt
      ? zusEmployee * (exemption.taxableIncome / grossPay)
      : zusEmployee;

    const taxable = Math.max(0, taxablePortion - zusDeduction - costOfIncome);

    return {
      gross: grossPay,
      taxablePortion,
      zusDeduction,
      costOfIncome,
      taxable: Math.round(taxable * 100) / 100,
      exempt: exemption.exempt
    };
  }

  /**
   * Calculate PIT income tax
   */
  calculatePIT(employee, taxableIncome, ytdFigures, exemption) {
    if (exemption.exempt && taxableIncome.taxable === 0) {
      return {
        amount: 0,
        rate: 0,
        bracket: 'exempt',
        taxFreeAmount: 0
      };
    }

    const ytdTaxableIncome = ytdFigures.taxableIncome || 0;
    const cumulativeTaxable = ytdTaxableIncome + taxableIncome.taxable;

    const firstBracket = this.config.pit.taxBands[0];
    const secondBracket = this.config.pit.taxBands[1];

    // Monthly tax-free allowance
    const monthlyTaxFree = this.config.pit.taxFreeAmount / 12;

    let tax = 0;
    let bracket = 'first';
    let rate = firstBracket.rate;

    // Check if in second bracket
    if (cumulativeTaxable * 12 > firstBracket.max) {
      // Part or all in second bracket
      const annualizedCurrent = taxableIncome.taxable * 12;
      const ytdAnnualized = ytdTaxableIncome * 12;

      if (ytdAnnualized >= firstBracket.max) {
        // Fully in second bracket
        tax = taxableIncome.taxable * secondBracket.rate;
        bracket = 'second';
        rate = secondBracket.rate;
      } else {
        // Split between brackets
        const remainingFirstBracket = (firstBracket.max - ytdAnnualized) / 12;
        const inFirstBracket = Math.min(taxableIncome.taxable, remainingFirstBracket);
        const inSecondBracket = taxableIncome.taxable - inFirstBracket;

        tax = (inFirstBracket * firstBracket.rate) + (inSecondBracket * secondBracket.rate);
        bracket = 'split';
        rate = 'progressive';
      }
    } else {
      // Fully in first bracket
      tax = taxableIncome.taxable * firstBracket.rate;
    }

    // Apply monthly tax-free reduction (degressive)
    // Simplified: full reduction if income below threshold
    const taxReduction = Math.min(tax, monthlyTaxFree * firstBracket.rate);
    const finalTax = Math.max(0, tax - taxReduction);

    return {
      amount: Math.round(finalTax * 100) / 100,
      grossTax: Math.round(tax * 100) / 100,
      taxFreeReduction: Math.round(taxReduction * 100) / 100,
      rate,
      bracket
    };
  }

  /**
   * Calculate solidarity tax for high earners
   */
  calculateSolidarityTax(annualIncome) {
    const config = this.config.solidarityTax;

    if (annualIncome <= config.threshold) {
      return 0;
    }

    return (annualIncome - config.threshold) * config.rate;
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
      zus,
      healthInsurance,
      ppk,
      pit,
      exemption,
      ytdFigures
    } = data;

    const totalEmployeeDeductions =
      zus.employee.total +
      healthInsurance.amount +
      ppk.employee.total +
      pit.amount;

    const netPay = grossPay + bonusPay - totalEmployeeDeductions;

    // Calculate YTD
    const ytd = {
      grossPay: (ytdFigures.grossPay || 0) + grossPay + bonusPay,
      zus: (ytdFigures.zus || 0) + zus.employee.total,
      zusBasis: (ytdFigures.zusBasis || 0) + zus.cappedBasis,
      healthInsurance: (ytdFigures.healthInsurance || 0) + healthInsurance.amount,
      ppk: (ytdFigures.ppk || 0) + ppk.employee.total,
      pit: (ytdFigures.pit || 0) + pit.amount,
      taxableIncome: (ytdFigures.taxableIncome || 0) + (pit.grossTax > 0 ? data.taxableIncome?.taxable || 0 : 0),
      netPay: (ytdFigures.netPay || 0) + netPay
    };

    return {
      country: 'PL',
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
        pesel: employee.pesel,
        taxExemptions: exemption.exemptions
      },
      earnings: {
        basicPay: grossPay,
        bonus: bonusPay,
        totalGross: grossPay + bonusPay
      },
      employeeDeductions: {
        zus: {
          total: zus.employee.total,
          breakdown: zus.employee.breakdown,
          ceilingReached: zus.cappedBasis < zus.basis
        },
        healthInsurance: {
          amount: healthInsurance.amount,
          basis: healthInsurance.basis,
          rate: healthInsurance.rate
        },
        ppk: {
          total: ppk.employee.total,
          basic: ppk.employee.basic,
          voluntary: ppk.employee.voluntary
        },
        pit: {
          amount: pit.amount,
          grossTax: pit.grossTax,
          taxFreeReduction: pit.taxFreeReduction,
          bracket: pit.bracket,
          exempt: exemption.exempt
        },
        total: Math.round(totalEmployeeDeductions * 100) / 100
      },
      employerContributions: {
        zus: {
          total: zus.employer.total,
          breakdown: zus.employer.breakdown
        },
        ppk: {
          total: ppk.employer.total,
          basic: ppk.employer.basic,
          voluntary: ppk.employer.voluntary
        },
        total: Math.round((zus.employer.total + ppk.employer.total) * 100) / 100
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

export default PLPayrollCalculator;
