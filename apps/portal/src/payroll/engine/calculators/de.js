/**
 * German Payroll Calculator
 * Handles Lohnsteuer, Solidarity Surcharge, Church Tax, and Social Insurance
 * Tax Year: 2025
 */

export class DEPayrollCalculator {
  constructor(config) {
    this.config = config;
    this.validateConfig();
  }

  validateConfig() {
    if (!this.config || this.config.country !== 'DE') {
      throw new Error('Invalid German payroll configuration');
    }
  }

  /**
   * Calculate full payslip for an employee
   * @param {Object} employee - Employee profile with German-specific settings
   * @param {Object} payPeriod - Pay period details
   * @param {Object} ytdFigures - Year-to-date figures
   * @returns {Object} Standardized payslip object
   */
  calculate(employee, payPeriod, ytdFigures = {}) {
    const { grossPay, bonusPay = 0 } = payPeriod;
    const totalGross = grossPay + bonusPay;

    // Check for Minijob
    if (totalGross <= this.config.minijob.threshold) {
      return this.calculateMinijob(employee, payPeriod, ytdFigures);
    }

    // Check for Midijob
    if (totalGross <= this.config.midijob.upperThreshold) {
      return this.calculateMidijob(employee, payPeriod, ytdFigures);
    }

    // Regular employment calculation
    // Calculate social insurance first
    const socialInsurance = this.calculateSocialInsurance(employee, totalGross);

    // Calculate taxable income
    const taxableIncome = this.calculateTaxableIncome(
      employee,
      totalGross,
      socialInsurance
    );

    // Calculate Lohnsteuer (income tax)
    const lohnsteuer = this.calculateLohnsteuer(employee, taxableIncome);

    // Calculate Solidarity Surcharge
    const solidaritaet = this.calculateSolidaritaetszuschlag(lohnsteuer.annual);

    // Calculate Church Tax
    const kirchensteuer = this.calculateKirchensteuer(employee, lohnsteuer.annual);

    // Build payslip
    return this.buildPayslip({
      employee,
      payPeriod,
      grossPay,
      bonusPay,
      socialInsurance,
      lohnsteuer,
      solidaritaet,
      kirchensteuer,
      ytdFigures
    });
  }

  /**
   * Calculate taxable income after deductions
   */
  calculateTaxableIncome(employee, grossPay, socialInsurance) {
    const taxClass = employee.taxClass || 'I';
    const classConfig = this.config.lohnsteuer.taxClasses[taxClass];

    // Monthly deductions
    const werbungskosten = this.config.lohnsteuer.werbungskostenpauschale.amount / 12;
    const sonderausgaben = this.config.lohnsteuer.sonderausgabenpauschale.amount / 12;

    // Child allowances (for tax classes with children)
    const childAllowance = (employee.children || 0) *
      (this.config.lohnsteuer.childAllowances.perChild +
       this.config.lohnsteuer.childAllowances.childcareAllowance) / 12;

    // Basic allowance from tax class
    const basicAllowance = classConfig.basicAllowance / 12;

    // Single parent relief for tax class II
    let singleParentRelief = 0;
    if (taxClass === 'II') {
      singleParentRelief = (classConfig.singleParentRelief +
        (Math.max(0, (employee.children || 1) - 1) * classConfig.additionalChildRelief)) / 12;
    }

    // Vorsorgepauschale based on social insurance
    const vorsorgepauschale = socialInsurance.employee.total;

    const taxableIncome = Math.max(0,
      grossPay -
      basicAllowance -
      singleParentRelief -
      werbungskosten -
      sonderausgaben -
      vorsorgepauschale
    );

    return {
      gross: grossPay,
      basicAllowance,
      singleParentRelief,
      werbungskosten,
      sonderausgaben,
      vorsorgepauschale,
      childAllowance,
      taxable: taxableIncome,
      annualTaxable: taxableIncome * 12
    };
  }

  /**
   * Calculate Lohnsteuer using progressive formula
   */
  calculateLohnsteuer(employee, taxableIncome) {
    const annualIncome = taxableIncome.annualTaxable;
    const brackets = this.config.lohnsteuer.taxBrackets;

    let annualTax = 0;

    // Zone 0: Tax-free
    if (annualIncome <= brackets[0].max) {
      annualTax = 0;
    }
    // Zone 1: First progressive zone
    else if (annualIncome <= brackets[1].max) {
      const y = (annualIncome - brackets[0].max) / 10000;
      annualTax = (1020.13 * y + 1400) * y;
    }
    // Zone 2: Second progressive zone
    else if (annualIncome <= brackets[2].max) {
      const z = (annualIncome - brackets[1].max) / 10000;
      annualTax = (206.43 * z + 2397) * z + 991.21;
    }
    // Zone 3: 42% rate
    else if (annualIncome <= brackets[3].max) {
      annualTax = brackets[3].fixedBase +
        (annualIncome - brackets[2].max) * brackets[3].rate;
    }
    // Zone 4: 45% rate (Reichensteuer)
    else {
      annualTax = brackets[4].fixedBase +
        (annualIncome - brackets[3].max) * brackets[4].rate;
    }

    // For married couples in tax class III, tax is calculated on half income then doubled
    if (employee.taxClass === 'III') {
      // Splitting method would apply - simplified here
      annualTax = annualTax * 0.85; // Approximation for splitting benefit
    }

    const monthlyTax = Math.round(annualTax / 12 * 100) / 100;

    return {
      annual: Math.round(annualTax * 100) / 100,
      monthly: monthlyTax,
      taxClass: employee.taxClass || 'I'
    };
  }

  /**
   * Calculate Solidarity Surcharge (Solidaritaetszuschlag)
   */
  calculateSolidaritaetszuschlag(annualTax) {
    const config = this.config.solidaritaetszuschlag;

    if (annualTax <= config.exemptionThreshold) {
      return { annual: 0, monthly: 0 };
    }

    // Gleitzone (phase-in zone)
    const excessOverThreshold = annualTax - config.exemptionThreshold;
    const fullSoli = annualTax * config.rate;
    const cappedSoli = excessOverThreshold * config.phaseInZone.rateInZone;

    const annualSoli = Math.min(fullSoli, cappedSoli);
    const monthlySoli = Math.round(annualSoli / 12 * 100) / 100;

    return {
      annual: Math.round(annualSoli * 100) / 100,
      monthly: monthlySoli,
      rate: config.rate
    };
  }

  /**
   * Calculate Church Tax (Kirchensteuer)
   */
  calculateKirchensteuer(employee, annualTax) {
    if (!employee.churchMember) {
      return { annual: 0, monthly: 0, rate: 0 };
    }

    const config = this.config.kirchensteuer;
    const rate = employee.state === 'BY' || employee.state === 'BW'
      ? config.rates.bavariaBadenWuerttemberg
      : config.rates.otherStates;

    const annualChurchTax = annualTax * rate;
    const monthlyChurchTax = Math.round(annualChurchTax / 12 * 100) / 100;

    return {
      annual: Math.round(annualChurchTax * 100) / 100,
      monthly: monthlyChurchTax,
      rate
    };
  }

  /**
   * Calculate Social Insurance contributions
   */
  calculateSocialInsurance(employee, grossPay) {
    const config = this.config.socialInsurance;
    const region = employee.region || 'west';

    const results = {
      employee: { total: 0, breakdown: {} },
      employer: { total: 0, breakdown: {} }
    };

    // Pension Insurance (Rentenversicherung)
    const pensionCeiling = config.contributionCeilings.pension[region].monthly;
    const pensionBasis = Math.min(grossPay, pensionCeiling);

    results.employee.breakdown.pension = Math.round(
      pensionBasis * config.rentenversicherung.employeeShare * 100
    ) / 100;
    results.employer.breakdown.pension = Math.round(
      pensionBasis * config.rentenversicherung.employerShare * 100
    ) / 100;

    // Unemployment Insurance (Arbeitslosenversicherung)
    const unemploymentCeiling = config.contributionCeilings.unemployment[region].monthly;
    const unemploymentBasis = Math.min(grossPay, unemploymentCeiling);

    results.employee.breakdown.unemployment = Math.round(
      unemploymentBasis * config.arbeitslosenversicherung.employeeShare * 100
    ) / 100;
    results.employer.breakdown.unemployment = Math.round(
      unemploymentBasis * config.arbeitslosenversicherung.employerShare * 100
    ) / 100;

    // Health Insurance (Krankenversicherung)
    if (!employee.privateHealthInsurance) {
      const healthCeiling = config.contributionCeilings.health.monthly;
      const healthBasis = Math.min(grossPay, healthCeiling);

      const additionalRate = employee.healthInsuranceAdditionalRate ||
                             config.krankenversicherung.averageAdditionalRate;

      results.employee.breakdown.health = Math.round(
        healthBasis * (config.krankenversicherung.employeeBaseShare + additionalRate / 2) * 100
      ) / 100;
      results.employer.breakdown.health = Math.round(
        healthBasis * (config.krankenversicherung.employerBaseShare + additionalRate / 2) * 100
      ) / 100;
    } else {
      // Private health insurance - employer pays grant
      results.employer.breakdown.healthGrant = Math.round(
        Math.min(grossPay, config.contributionCeilings.health.monthly) *
        config.krankenversicherung.employerBaseShare * 100
      ) / 100;
    }

    // Long-term Care Insurance (Pflegeversicherung)
    const careCeiling = config.contributionCeilings.longTermCare.monthly;
    const careBasis = Math.min(grossPay, careCeiling);

    let employeeCareRate = config.pflegeversicherung.standardSplit.employeeShare;

    // Childless supplement
    if (!employee.hasChildren && employee.age >= config.pflegeversicherung.childlessSupplementAge) {
      employeeCareRate += config.pflegeversicherung.childlessSupplement;
    }

    // Child reduction
    if (employee.children && employee.children > 1) {
      const reduction = Math.min(
        (employee.children - 1) * config.pflegeversicherung.childReduction.perChild,
        config.pflegeversicherung.childReduction.maxReduction
      );
      employeeCareRate = Math.max(0, employeeCareRate - reduction);
    }

    // Saxony exception
    const employerCareRate = employee.state === 'SN'
      ? config.pflegeversicherung.saxonyException.employerShare
      : config.pflegeversicherung.standardSplit.employerShare;

    results.employee.breakdown.longTermCare = Math.round(
      careBasis * employeeCareRate * 100
    ) / 100;
    results.employer.breakdown.longTermCare = Math.round(
      careBasis * employerCareRate * 100
    ) / 100;

    // Calculate totals
    results.employee.total = Object.values(results.employee.breakdown)
      .reduce((sum, val) => sum + val, 0);
    results.employer.total = Object.values(results.employer.breakdown)
      .reduce((sum, val) => sum + val, 0);

    return results;
  }

  /**
   * Calculate Minijob (marginal employment)
   */
  calculateMinijob(employee, payPeriod, ytdFigures) {
    const { grossPay } = payPeriod;
    const config = this.config.minijob;

    const employerContributions = {
      pension: Math.round(grossPay * config.pensionContribution.employer * 100) / 100,
      health: Math.round(grossPay * config.healthContribution.employer * 100) / 100,
      tax: Math.round(grossPay * config.taxRate * 100) / 100
    };

    const employeePension = employee.minijobPensionOptOut
      ? 0
      : Math.round(grossPay * config.pensionContribution.employee * 100) / 100;

    return this.buildPayslip({
      employee,
      payPeriod,
      grossPay,
      bonusPay: 0,
      socialInsurance: {
        employee: { total: employeePension, breakdown: { pension: employeePension } },
        employer: { total: employerContributions.pension + employerContributions.health,
                    breakdown: employerContributions }
      },
      lohnsteuer: { monthly: 0, annual: 0, taxClass: 'Minijob' },
      solidaritaet: { monthly: 0, annual: 0 },
      kirchensteuer: { monthly: 0, annual: 0 },
      ytdFigures,
      isMinijob: true
    });
  }

  /**
   * Calculate Midijob (Uebergangsbereich)
   */
  calculateMidijob(employee, payPeriod, ytdFigures) {
    const { grossPay, bonusPay = 0 } = payPeriod;
    const totalGross = grossPay + bonusPay;
    const config = this.config.midijob;

    // Midijob has graduated social insurance contributions
    // Employee pays reduced rate, employer pays full rate on adjusted basis
    const F = 0.7009; // 2025 factor
    const lowerLimit = this.config.minijob.threshold;
    const upperLimit = config.upperThreshold;

    // Calculate reduced contribution basis for employee
    const reducedBasis = F * lowerLimit +
      ((upperLimit - lowerLimit) / (upperLimit - lowerLimit)) *
      (totalGross - lowerLimit);

    // Calculate with reduced basis for employee, full for employer
    const socialInsurance = this.calculateSocialInsurance(employee, totalGross);

    // Adjust employee contributions for Midijob
    const reductionFactor = reducedBasis / totalGross;
    Object.keys(socialInsurance.employee.breakdown).forEach(key => {
      socialInsurance.employee.breakdown[key] = Math.round(
        socialInsurance.employee.breakdown[key] * reductionFactor * 100
      ) / 100;
    });
    socialInsurance.employee.total = Object.values(socialInsurance.employee.breakdown)
      .reduce((sum, val) => sum + val, 0);

    // Rest of calculation same as regular
    const taxableIncome = this.calculateTaxableIncome(employee, totalGross, socialInsurance);
    const lohnsteuer = this.calculateLohnsteuer(employee, taxableIncome);
    const solidaritaet = this.calculateSolidaritaetszuschlag(lohnsteuer.annual);
    const kirchensteuer = this.calculateKirchensteuer(employee, lohnsteuer.annual);

    return this.buildPayslip({
      employee,
      payPeriod,
      grossPay,
      bonusPay,
      socialInsurance,
      lohnsteuer,
      solidaritaet,
      kirchensteuer,
      ytdFigures,
      isMidijob: true
    });
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
      lohnsteuer,
      solidaritaet,
      kirchensteuer,
      ytdFigures,
      isMinijob = false,
      isMidijob = false
    } = data;

    const totalEmployeeDeductions =
      lohnsteuer.monthly +
      solidaritaet.monthly +
      kirchensteuer.monthly +
      socialInsurance.employee.total;

    const netPay = grossPay + bonusPay - totalEmployeeDeductions;

    // Calculate YTD
    const ytd = {
      grossPay: (ytdFigures.grossPay || 0) + grossPay + bonusPay,
      lohnsteuer: (ytdFigures.lohnsteuer || 0) + lohnsteuer.monthly,
      solidaritaet: (ytdFigures.solidaritaet || 0) + solidaritaet.monthly,
      kirchensteuer: (ytdFigures.kirchensteuer || 0) + kirchensteuer.monthly,
      socialInsurance: (ytdFigures.socialInsurance || 0) + socialInsurance.employee.total,
      netPay: (ytdFigures.netPay || 0) + netPay
    };

    return {
      country: 'DE',
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
        taxClass: lohnsteuer.taxClass,
        socialInsuranceNumber: employee.socialInsuranceNumber
      },
      employmentType: isMinijob ? 'Minijob' : (isMidijob ? 'Midijob' : 'Regular'),
      earnings: {
        basicPay: grossPay,
        bonus: bonusPay,
        totalGross: grossPay + bonusPay
      },
      employeeDeductions: {
        lohnsteuer: {
          amount: lohnsteuer.monthly,
          taxClass: lohnsteuer.taxClass
        },
        solidaritaetszuschlag: {
          amount: solidaritaet.monthly,
          rate: solidaritaet.rate
        },
        kirchensteuer: {
          amount: kirchensteuer.monthly,
          rate: kirchensteuer.rate
        },
        socialInsurance: {
          total: socialInsurance.employee.total,
          breakdown: socialInsurance.employee.breakdown
        },
        total: Math.round(totalEmployeeDeductions * 100) / 100
      },
      employerContributions: {
        socialInsurance: {
          total: socialInsurance.employer.total,
          breakdown: socialInsurance.employer.breakdown
        },
        total: socialInsurance.employer.total
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

export default DEPayrollCalculator;
