// ============================================================
// FALLBACK PAYROLL CALCULATOR
// Basic multi-country calculations using tax tables
// NOT certified - for estimates only
// ============================================================

import db from '../../lib/database.js';

/**
 * Pre-built tax tables for countries JSP operates in
 * Tax Year 2025/26
 */
const TAX_TABLES = {
  // Germany (DE)
  DE: {
    currency: 'EUR',
    taxYearStart: 'January',

    // Income tax is calculated using a formula, not fixed brackets
    // This is a simplified approximation
    incomeTax: {
      taxFreeAmount: 11784, // Grundfreibetrag 2025
      brackets: [
        { upTo: 17005, rate: 0.14, formula: 'progressive' },
        { upTo: 66760, rate: 0.24, formula: 'progressive' },
        { upTo: 277825, rate: 0.42 },
        { upTo: Infinity, rate: 0.45 }
      ]
    },

    // Solidarity surcharge (5.5% of income tax if tax > threshold)
    solidaritySurcharge: {
      threshold: 18130, // Tax threshold for full surcharge
      rate: 0.055
    },

    // Church tax (optional, 8-9% of income tax)
    churchTax: {
      rate: 0.08 // Bavaria/Baden-Württemberg: 8%, others: 9%
    },

    // Social insurance contributions (split employer/employee)
    socialInsurance: {
      healthInsurance: { rate: 0.146, employeeShare: 0.5, ceiling: 66150 },
      nursingCare: { rate: 0.034, employeeShare: 0.5, ceiling: 66150 }, // +0.6% if childless
      pension: { rate: 0.186, employeeShare: 0.5, ceiling: 90600 },
      unemployment: { rate: 0.026, employeeShare: 0.5, ceiling: 90600 }
    }
  },

  // Poland (PL)
  PL: {
    currency: 'PLN',
    taxYearStart: 'January',

    incomeTax: {
      taxFreeAmount: 30000, // 30,000 PLN
      brackets: [
        { upTo: 120000, rate: 0.12 },
        { upTo: Infinity, rate: 0.32 }
      ]
    },

    // ZUS contributions
    socialInsurance: {
      pension: { rate: 0.1952, employeeShare: 0.5 },
      disability: { rate: 0.08, employeeShare: 0.5 },
      sickness: { rate: 0.0245, employeeShare: 1.0 },
      healthInsurance: { rate: 0.09, employeeShare: 1.0 } // 9% employee pays
    }
  },

  // United States (US)
  US: {
    currency: 'USD',
    taxYearStart: 'January',

    // Federal income tax brackets (Single, 2025)
    incomeTax: {
      standardDeduction: 14600,
      brackets: [
        { upTo: 11925, rate: 0.10 },
        { upTo: 48475, rate: 0.12 },
        { upTo: 103350, rate: 0.22 },
        { upTo: 197300, rate: 0.24 },
        { upTo: 250525, rate: 0.32 },
        { upTo: 626350, rate: 0.35 },
        { upTo: Infinity, rate: 0.37 }
      ]
    },

    // FICA taxes
    socialSecurity: {
      rate: 0.062,
      employerRate: 0.062,
      wageBase: 176100 // 2025 limit
    },

    medicare: {
      rate: 0.0145,
      employerRate: 0.0145,
      additionalRate: 0.009, // Above $200k
      additionalThreshold: 200000
    }
  },

  // China (CN)
  CN: {
    currency: 'CNY',
    taxYearStart: 'January',

    // Individual Income Tax (IIT)
    incomeTax: {
      standardDeduction: 60000, // Annual
      brackets: [
        { upTo: 36000, rate: 0.03 },
        { upTo: 144000, rate: 0.10 },
        { upTo: 300000, rate: 0.20 },
        { upTo: 420000, rate: 0.25 },
        { upTo: 660000, rate: 0.30 },
        { upTo: 960000, rate: 0.35 },
        { upTo: Infinity, rate: 0.45 }
      ]
    },

    // Social insurance (varies by city, using Beijing as example)
    socialInsurance: {
      pension: { rate: 0.08, employerRate: 0.16 },
      medical: { rate: 0.02, employerRate: 0.10 },
      unemployment: { rate: 0.005, employerRate: 0.005 },
      housing: { rate: 0.12, employerRate: 0.12 } // Housing fund
    }
  },

  // UAE (AE)
  AE: {
    currency: 'AED',
    taxYearStart: 'January',

    // No income tax
    incomeTax: {
      brackets: [] // No personal income tax
    },

    // Social security for UAE nationals only
    socialInsurance: {
      // UAE nationals only
      pension: { rate: 0.05, employerRate: 0.125 }, // Employee 5%, Employer 12.5%
      // Expats: only end-of-service gratuity applies
    },

    // End of service gratuity
    gratuity: {
      // 21 days basic salary per year for first 5 years
      // 30 days basic salary per year thereafter
      first5YearsRate: 21 / 365,
      afterRate: 30 / 365
    }
  }
};

/**
 * Fallback Payroll Calculator
 * Uses pre-built tax tables when no certified provider is available
 */
class FallbackCalculator {
  constructor() {
    this.tables = TAX_TABLES;
  }

  /**
   * Calculate payroll using fallback tax tables
   */
  async calculate(input, countryCode) {
    const tables = this.tables[countryCode];

    if (!tables) {
      throw new Error(`No tax tables available for country: ${countryCode}. ` +
        'Configure ONESOURCE for certified multi-country payroll.');
    }

    // Try to get org-specific overrides from database
    const dbTables = await this.getTablesFromDatabase(countryCode, input.organizationId);

    const effectiveTables = dbTables || tables;

    switch (countryCode) {
      case 'DE':
        return this.calculateGermany(input, effectiveTables);
      case 'PL':
        return this.calculatePoland(input, effectiveTables);
      case 'US':
        return this.calculateUS(input, effectiveTables);
      case 'CN':
        return this.calculateChina(input, effectiveTables);
      case 'AE':
        return this.calculateUAE(input, effectiveTables);
      default:
        return this.calculateGeneric(input, effectiveTables);
    }
  }

  /**
   * Germany calculation
   */
  calculateGermany(input, tables) {
    const { grossPay, annualSalary, payFrequency = 'monthly' } = input;
    const periodsPerYear = this.getPeriodsPerYear(payFrequency);
    const periodGross = grossPay || (annualSalary / periodsPerYear);
    const annualGross = periodGross * periodsPerYear;

    // Income tax (simplified)
    let annualTax = 0;
    const taxableIncome = Math.max(0, annualGross - tables.incomeTax.taxFreeAmount);

    let remaining = taxableIncome;
    let previousThreshold = 0;

    for (const bracket of tables.incomeTax.brackets) {
      if (remaining <= 0) break;
      const bracketIncome = Math.min(remaining, bracket.upTo - previousThreshold);
      annualTax += bracketIncome * bracket.rate;
      remaining -= bracketIncome;
      previousThreshold = bracket.upTo;
    }

    const periodTax = annualTax / periodsPerYear;

    // Solidarity surcharge
    const solidarityAnnual = annualTax > tables.solidaritySurcharge.threshold
      ? annualTax * tables.solidaritySurcharge.rate
      : 0;
    const periodSolidarity = solidarityAnnual / periodsPerYear;

    // Social insurance
    const social = tables.socialInsurance;
    const healthEmployee = Math.min(periodGross, social.healthInsurance.ceiling / periodsPerYear) *
      social.healthInsurance.rate * social.healthInsurance.employeeShare;
    const nursingEmployee = Math.min(periodGross, social.nursingCare.ceiling / periodsPerYear) *
      social.nursingCare.rate * social.nursingCare.employeeShare;
    const pensionEmployee = Math.min(periodGross, social.pension.ceiling / periodsPerYear) *
      social.pension.rate * social.pension.employeeShare;
    const unemploymentEmployee = Math.min(periodGross, social.unemployment.ceiling / periodsPerYear) *
      social.unemployment.rate * social.unemployment.employeeShare;

    const totalEmployeeSocial = healthEmployee + nursingEmployee + pensionEmployee + unemploymentEmployee;
    const totalDeductions = periodTax + periodSolidarity + totalEmployeeSocial;
    const netPay = periodGross - totalDeductions;

    // Employer costs
    const healthEmployer = healthEmployee;
    const nursingEmployer = nursingEmployee;
    const pensionEmployer = pensionEmployee;
    const unemploymentEmployer = unemploymentEmployee;
    const totalEmployerSocial = healthEmployer + nursingEmployer + pensionEmployer + unemploymentEmployer;

    return {
      success: true,
      provider: 'fallback',
      certified: false,
      warning: 'ESTIMATED calculation using simplified German tax tables. For certified calculations, configure ONESOURCE.',
      countryCode: 'DE',
      currency: 'EUR',

      grossPay: this.round(periodGross),
      netPay: this.round(netPay),

      tax: this.round(periodTax),
      solidaritySurcharge: this.round(periodSolidarity),

      socialSecurity: this.round(totalEmployeeSocial),
      employerSocialSecurity: this.round(totalEmployerSocial),

      deductions: [
        { type: 'tax', description: 'Einkommensteuer', amount: this.round(periodTax) },
        { type: 'solidarity', description: 'Solidaritätszuschlag', amount: this.round(periodSolidarity) },
        { type: 'health', description: 'Krankenversicherung', amount: this.round(healthEmployee) },
        { type: 'nursing', description: 'Pflegeversicherung', amount: this.round(nursingEmployee) },
        { type: 'pension', description: 'Rentenversicherung', amount: this.round(pensionEmployee) },
        { type: 'unemployment', description: 'Arbeitslosenversicherung', amount: this.round(unemploymentEmployee) }
      ],

      totalDeductions: this.round(totalDeductions),
      totalEmployerCost: this.round(periodGross + totalEmployerSocial)
    };
  }

  /**
   * Poland calculation
   */
  calculatePoland(input, tables) {
    const { grossPay, annualSalary, payFrequency = 'monthly' } = input;
    const periodsPerYear = this.getPeriodsPerYear(payFrequency);
    const periodGross = grossPay || (annualSalary / periodsPerYear);
    const annualGross = periodGross * periodsPerYear;

    // ZUS contributions (before tax)
    const social = tables.socialInsurance;
    const pensionEmployee = periodGross * social.pension.rate * social.pension.employeeShare;
    const disabilityEmployee = periodGross * social.disability.rate * social.disability.employeeShare;
    const sicknessEmployee = periodGross * social.sickness.rate * social.sickness.employeeShare;

    // Health insurance (from gross - social)
    const healthBasis = periodGross - pensionEmployee - disabilityEmployee - sicknessEmployee;
    const healthEmployee = healthBasis * social.healthInsurance.rate;
    const healthDeductible = healthBasis * 0.0775; // 7.75% is deductible from tax

    // Taxable income
    const annualTaxable = Math.max(0, annualGross - tables.incomeTax.taxFreeAmount);
    const periodTaxable = annualTaxable / periodsPerYear;

    // Income tax
    let periodTax = 0;
    if (periodTaxable > 0) {
      const annualFirstBracket = Math.min(annualTaxable, 120000);
      const annualSecondBracket = Math.max(0, annualTaxable - 120000);
      const annualTax = (annualFirstBracket * 0.12) + (annualSecondBracket * 0.32);
      periodTax = Math.max(0, (annualTax / periodsPerYear) - healthDeductible);
    }

    const totalSocial = pensionEmployee + disabilityEmployee + sicknessEmployee;
    const totalDeductions = totalSocial + healthEmployee + periodTax;
    const netPay = periodGross - totalDeductions;

    // Employer costs
    const pensionEmployer = periodGross * social.pension.rate * (1 - social.pension.employeeShare);
    const disabilityEmployer = periodGross * social.disability.rate * (1 - social.disability.employeeShare);

    return {
      success: true,
      provider: 'fallback',
      certified: false,
      warning: 'ESTIMATED calculation using simplified Polish tax tables. For certified calculations, configure ONESOURCE.',
      countryCode: 'PL',
      currency: 'PLN',

      grossPay: this.round(periodGross),
      netPay: this.round(netPay),
      tax: this.round(periodTax),

      socialSecurity: this.round(totalSocial),
      healthInsurance: this.round(healthEmployee),

      deductions: [
        { type: 'pension', description: 'Emerytalna', amount: this.round(pensionEmployee) },
        { type: 'disability', description: 'Rentowa', amount: this.round(disabilityEmployee) },
        { type: 'sickness', description: 'Chorobowa', amount: this.round(sicknessEmployee) },
        { type: 'health', description: 'Zdrowotna', amount: this.round(healthEmployee) },
        { type: 'tax', description: 'PIT', amount: this.round(periodTax) }
      ],

      totalDeductions: this.round(totalDeductions),
      totalEmployerCost: this.round(periodGross + pensionEmployer + disabilityEmployer)
    };
  }

  /**
   * US calculation
   */
  calculateUS(input, tables) {
    const { grossPay, annualSalary, payFrequency = 'monthly', state = null } = input;
    const periodsPerYear = this.getPeriodsPerYear(payFrequency);
    const periodGross = grossPay || (annualSalary / periodsPerYear);
    const annualGross = periodGross * periodsPerYear;

    // Federal income tax
    const taxableIncome = Math.max(0, annualGross - tables.incomeTax.standardDeduction);
    let annualTax = 0;
    let remaining = taxableIncome;
    let previousThreshold = 0;

    for (const bracket of tables.incomeTax.brackets) {
      if (remaining <= 0) break;
      const bracketIncome = Math.min(remaining, bracket.upTo - previousThreshold);
      annualTax += bracketIncome * bracket.rate;
      remaining -= bracketIncome;
      previousThreshold = bracket.upTo;
    }

    const periodTax = annualTax / periodsPerYear;

    // Social Security
    const ssWageBase = tables.socialSecurity.wageBase / periodsPerYear;
    const ssTaxable = Math.min(periodGross, ssWageBase);
    const ssEmployee = ssTaxable * tables.socialSecurity.rate;
    const ssEmployer = ssTaxable * tables.socialSecurity.employerRate;

    // Medicare
    let medicareEmployee = periodGross * tables.medicare.rate;
    if (annualGross > tables.medicare.additionalThreshold) {
      const additionalBase = (annualGross - tables.medicare.additionalThreshold) / periodsPerYear;
      medicareEmployee += additionalBase * tables.medicare.additionalRate;
    }
    const medicareEmployer = periodGross * tables.medicare.employerRate;

    const totalFICA = ssEmployee + medicareEmployee;
    const totalDeductions = periodTax + totalFICA;
    const netPay = periodGross - totalDeductions;

    return {
      success: true,
      provider: 'fallback',
      certified: false,
      warning: 'ESTIMATED Federal tax only. State taxes not included. For complete US payroll, configure ONESOURCE.',
      countryCode: 'US',
      currency: 'USD',

      grossPay: this.round(periodGross),
      netPay: this.round(netPay),
      tax: this.round(periodTax),

      socialSecurity: this.round(ssEmployee),
      medicare: this.round(medicareEmployee),
      employerSocialSecurity: this.round(ssEmployer),
      employerMedicare: this.round(medicareEmployer),

      deductions: [
        { type: 'tax', description: 'Federal Income Tax', amount: this.round(periodTax) },
        { type: 'socialSecurity', description: 'Social Security', amount: this.round(ssEmployee) },
        { type: 'medicare', description: 'Medicare', amount: this.round(medicareEmployee) }
      ],

      totalDeductions: this.round(totalDeductions),
      totalEmployerCost: this.round(periodGross + ssEmployer + medicareEmployer)
    };
  }

  /**
   * China calculation
   */
  calculateChina(input, tables) {
    const { grossPay, annualSalary, payFrequency = 'monthly' } = input;
    const periodsPerYear = this.getPeriodsPerYear(payFrequency);
    const periodGross = grossPay || (annualSalary / periodsPerYear);
    const annualGross = periodGross * periodsPerYear;

    // Social insurance (Beijing rates as example)
    const social = tables.socialInsurance;
    const pensionEmployee = periodGross * social.pension.rate;
    const medicalEmployee = periodGross * social.medical.rate;
    const unemploymentEmployee = periodGross * social.unemployment.rate;
    const housingEmployee = periodGross * social.housing.rate;

    const totalSocial = pensionEmployee + medicalEmployee + unemploymentEmployee + housingEmployee;

    // IIT calculation
    const annualTaxable = Math.max(0, annualGross - tables.incomeTax.standardDeduction - (totalSocial * periodsPerYear));
    let annualTax = 0;
    let remaining = annualTaxable;
    let previousThreshold = 0;

    for (const bracket of tables.incomeTax.brackets) {
      if (remaining <= 0) break;
      const bracketIncome = Math.min(remaining, bracket.upTo - previousThreshold);
      annualTax += bracketIncome * bracket.rate;
      remaining -= bracketIncome;
      previousThreshold = bracket.upTo;
    }

    const periodTax = annualTax / periodsPerYear;
    const totalDeductions = totalSocial + periodTax;
    const netPay = periodGross - totalDeductions;

    // Employer costs
    const pensionEmployer = periodGross * social.pension.employerRate;
    const medicalEmployer = periodGross * social.medical.employerRate;
    const unemploymentEmployer = periodGross * social.unemployment.employerRate;
    const housingEmployer = periodGross * social.housing.employerRate;
    const totalEmployerSocial = pensionEmployer + medicalEmployer + unemploymentEmployer + housingEmployer;

    return {
      success: true,
      provider: 'fallback',
      certified: false,
      warning: 'ESTIMATED calculation using Beijing social insurance rates. Rates vary by city. Configure ONESOURCE for accurate calculations.',
      countryCode: 'CN',
      currency: 'CNY',

      grossPay: this.round(periodGross),
      netPay: this.round(netPay),
      tax: this.round(periodTax),

      socialSecurity: this.round(totalSocial),
      employerSocialSecurity: this.round(totalEmployerSocial),

      deductions: [
        { type: 'pension', description: '养老保险 (Pension)', amount: this.round(pensionEmployee) },
        { type: 'medical', description: '医疗保险 (Medical)', amount: this.round(medicalEmployee) },
        { type: 'unemployment', description: '失业保险 (Unemployment)', amount: this.round(unemploymentEmployee) },
        { type: 'housing', description: '住房公积金 (Housing Fund)', amount: this.round(housingEmployee) },
        { type: 'tax', description: '个人所得税 (IIT)', amount: this.round(periodTax) }
      ],

      totalDeductions: this.round(totalDeductions),
      totalEmployerCost: this.round(periodGross + totalEmployerSocial)
    };
  }

  /**
   * UAE calculation
   */
  calculateUAE(input, tables) {
    const { grossPay, annualSalary, payFrequency = 'monthly', isUAENational = false, yearsOfService = 0 } = input;
    const periodsPerYear = this.getPeriodsPerYear(payFrequency);
    const periodGross = grossPay || (annualSalary / periodsPerYear);

    // No income tax in UAE
    let employeeSocial = 0;
    let employerSocial = 0;

    // Social security only for UAE nationals
    if (isUAENational) {
      employeeSocial = periodGross * tables.socialInsurance.pension.rate;
      employerSocial = periodGross * tables.socialInsurance.pension.employerRate;
    }

    // End of service gratuity provision (monthly accrual)
    let gratuityProvision = 0;
    if (yearsOfService >= 1) {
      const basicDaily = (periodGross * 12) / 365;
      if (yearsOfService <= 5) {
        gratuityProvision = basicDaily * tables.gratuity.first5YearsRate * 30; // Monthly provision
      } else {
        gratuityProvision = basicDaily * tables.gratuity.afterRate * 30;
      }
    }

    const totalDeductions = employeeSocial;
    const netPay = periodGross - totalDeductions;

    const deductions = [];
    if (isUAENational) {
      deductions.push({ type: 'pension', description: 'GPSSA Pension', amount: this.round(employeeSocial) });
    }

    return {
      success: true,
      provider: 'fallback',
      certified: false,
      warning: isUAENational
        ? 'UAE national with GPSSA pension contribution.'
        : 'Expat employee - no income tax or social security. End of service gratuity applies.',
      countryCode: 'AE',
      currency: 'AED',

      grossPay: this.round(periodGross),
      netPay: this.round(netPay),
      tax: 0,

      socialSecurity: this.round(employeeSocial),
      employerSocialSecurity: this.round(employerSocial),
      gratuityProvision: this.round(gratuityProvision),

      deductions,

      totalDeductions: this.round(totalDeductions),
      totalEmployerCost: this.round(periodGross + employerSocial + gratuityProvision)
    };
  }

  /**
   * Generic calculation for unsupported countries
   */
  calculateGeneric(input, tables) {
    const { grossPay, annualSalary, payFrequency = 'monthly' } = input;
    const periodsPerYear = this.getPeriodsPerYear(payFrequency);
    const periodGross = grossPay || (annualSalary / periodsPerYear);

    // Estimate 25% total deductions
    const estimatedDeductions = periodGross * 0.25;
    const netPay = periodGross - estimatedDeductions;

    return {
      success: true,
      provider: 'fallback',
      certified: false,
      warning: `No specific tax tables for this country. Using 25% estimated deduction rate. Configure ONESOURCE for accurate calculations.`,
      currency: tables?.currency || 'USD',

      grossPay: this.round(periodGross),
      netPay: this.round(netPay),
      estimatedDeductions: this.round(estimatedDeductions),

      totalDeductions: this.round(estimatedDeductions),
      totalEmployerCost: this.round(periodGross * 1.15) // Estimate 15% employer costs
    };
  }

  /**
   * Get tax tables from database if available
   */
  async getTablesFromDatabase(countryCode, organizationId) {
    try {
      const result = await db.query(`
        SELECT * FROM payroll_tax_tables
        WHERE country_code = $1
          AND (organization_id = $2 OR organization_id IS NULL)
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          AND effective_from <= CURRENT_DATE
        ORDER BY organization_id NULLS LAST, effective_from DESC
      `, [countryCode, organizationId]);

      if (result.rows.length === 0) return null;

      // Build tables from database rows
      // This would need to be implemented based on your schema
      return null;
    } catch (error) {
      // Table might not exist
      return null;
    }
  }

  /**
   * Get periods per year
   */
  getPeriodsPerYear(frequency) {
    switch (frequency.toLowerCase()) {
      case 'weekly': return 52;
      case 'fortnightly': return 26;
      case 'monthly': return 12;
      default: return 12;
    }
  }

  /**
   * Round to 2 decimal places
   */
  round(value) {
    return Math.round(value * 100) / 100;
  }
}

// Export singleton and class
export const fallbackCalculator = new FallbackCalculator();
export { FallbackCalculator, TAX_TABLES };
export default fallbackCalculator;
