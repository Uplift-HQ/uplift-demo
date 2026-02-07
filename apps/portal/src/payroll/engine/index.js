/**
 * Payroll Calculation Engine
 * Main orchestrator that loads country configs and delegates to country-specific calculators
 */

import { GBPayrollCalculator } from './calculators/gb.js';
import { DEPayrollCalculator } from './calculators/de.js';
import { PLPayrollCalculator } from './calculators/pl.js';
import { USPayrollCalculator } from './calculators/us.js';
import { CNPayrollCalculator } from './calculators/cn.js';
import { AEPayrollCalculator } from './calculators/ae.js';

// Import configurations
import gbConfig from '../configs/gb_2025_26.json';
import deConfig from '../configs/de_2025.json';
import plConfig from '../configs/pl_2025.json';
import usConfig from '../configs/us_2025.json';
import cnConfig from '../configs/cn_2025.json';
import aeConfig from '../configs/ae_2025.json';

/**
 * Country calculator registry
 */
const CALCULATORS = {
  GB: GBPayrollCalculator,
  DE: DEPayrollCalculator,
  PL: PLPayrollCalculator,
  US: USPayrollCalculator,
  CN: CNPayrollCalculator,
  AE: AEPayrollCalculator
};

/**
 * Configuration registry
 */
const CONFIGS = {
  GB: gbConfig,
  DE: deConfig,
  PL: plConfig,
  US: usConfig,
  CN: cnConfig,
  AE: aeConfig
};

/**
 * Supported countries
 */
export const SUPPORTED_COUNTRIES = Object.keys(CALCULATORS);

/**
 * PayrollEngine - Main orchestrator class
 */
export class PayrollEngine {
  constructor() {
    this.calculatorInstances = {};
  }

  /**
   * Get calculator instance for a country
   * @param {string} countryCode - ISO country code (GB, DE, PL, US, CN, AE)
   * @returns {Object} Calculator instance
   */
  getCalculator(countryCode) {
    const code = countryCode.toUpperCase();

    if (!SUPPORTED_COUNTRIES.includes(code)) {
      throw new Error(`Unsupported country: ${code}. Supported: ${SUPPORTED_COUNTRIES.join(', ')}`);
    }

    // Cache calculator instances
    if (!this.calculatorInstances[code]) {
      const CalculatorClass = CALCULATORS[code];
      const config = CONFIGS[code];
      this.calculatorInstances[code] = new CalculatorClass(config);
    }

    return this.calculatorInstances[code];
  }

  /**
   * Get configuration for a country
   * @param {string} countryCode - ISO country code
   * @returns {Object} Country configuration
   */
  getConfig(countryCode) {
    const code = countryCode.toUpperCase();

    if (!CONFIGS[code]) {
      throw new Error(`No configuration found for country: ${code}`);
    }

    return CONFIGS[code];
  }

  /**
   * Calculate payslip for an employee
   * @param {string} countryCode - ISO country code
   * @param {Object} employee - Employee profile
   * @param {Object} payPeriod - Pay period details
   * @param {Object} ytdFigures - Year-to-date figures
   * @returns {Object} Calculated payslip
   */
  calculatePayslip(countryCode, employee, payPeriod, ytdFigures = {}) {
    const calculator = this.getCalculator(countryCode);
    return calculator.calculate(employee, payPeriod, ytdFigures);
  }

  /**
   * Calculate payroll for multiple employees
   * @param {Array} employees - Array of employee objects with country code
   * @param {Object} payPeriod - Pay period details (same for all)
   * @param {Object} ytdFiguresMap - Map of employee ID to YTD figures
   * @returns {Array} Array of payslip results
   */
  calculateBatchPayroll(employees, payPeriod, ytdFiguresMap = {}) {
    return employees.map(employee => {
      try {
        const ytdFigures = ytdFiguresMap[employee.id] || {};
        const payslip = this.calculatePayslip(
          employee.country,
          employee,
          { ...payPeriod, ...employee.payPeriodOverrides },
          ytdFigures
        );

        return {
          success: true,
          employeeId: employee.id,
          payslip
        };
      } catch (error) {
        return {
          success: false,
          employeeId: employee.id,
          error: error.message
        };
      }
    });
  }

  /**
   * Validate employee data for a country
   * @param {string} countryCode - ISO country code
   * @param {Object} employee - Employee data to validate
   * @returns {Object} Validation result
   */
  validateEmployee(countryCode, employee) {
    const errors = [];
    const warnings = [];

    // Common validation
    if (!employee.id) errors.push('Employee ID is required');
    if (!employee.name) errors.push('Employee name is required');

    // Country-specific validation
    switch (countryCode.toUpperCase()) {
      case 'GB':
        if (!employee.niNumber && !employee.temporaryNI) {
          warnings.push('National Insurance number not provided');
        }
        if (!employee.taxCode) {
          warnings.push('Tax code not provided, using default 1257L');
        }
        break;

      case 'DE':
        if (!employee.taxClass) {
          warnings.push('Tax class not provided, defaulting to I');
        }
        if (typeof employee.churchMember === 'undefined') {
          warnings.push('Church membership status not specified');
        }
        break;

      case 'PL':
        if (!employee.pesel) {
          warnings.push('PESEL not provided');
        }
        break;

      case 'US':
        if (!employee.ssn) {
          errors.push('Social Security Number is required');
        }
        if (!employee.filingStatus) {
          warnings.push('W-4 filing status not provided, defaulting to Single');
        }
        if (!employee.state) {
          warnings.push('State not specified, defaulting to NC');
        }
        break;

      case 'CN':
        if (!employee.idNumber) {
          warnings.push('ID number not provided');
        }
        if (!employee.city) {
          warnings.push('City not specified, defaulting to Shanghai');
        }
        break;

      case 'AE':
        if (!employee.emiratesId) {
          warnings.push('Emirates ID not provided');
        }
        if (typeof employee.isUAENational === 'undefined') {
          warnings.push('Nationality status not specified');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get tax summary for a country
   * @param {string} countryCode - ISO country code
   * @returns {Object} Summary of tax rules
   */
  getTaxSummary(countryCode) {
    const config = this.getConfig(countryCode);

    const summaries = {
      GB: () => ({
        country: 'United Kingdom',
        taxYear: config.taxYear,
        currency: config.currency,
        incomeTax: {
          personalAllowance: config.paye.personalAllowance.standard,
          basicRate: '20%',
          higherRate: '40%',
          additionalRate: '45%'
        },
        nationalInsurance: {
          employeeRates: '8% / 2%',
          employerRate: '13.8%'
        },
        pension: {
          employeeMin: '5%',
          employerMin: '3%'
        }
      }),

      DE: () => ({
        country: 'Germany',
        taxYear: config.taxYear,
        currency: config.currency,
        incomeTax: {
          basicAllowance: config.lohnsteuer.taxClasses.I.basicAllowance,
          topRate: '45%',
          solidaritySurcharge: '5.5%'
        },
        socialInsurance: {
          pensionRate: config.socialInsurance.rentenversicherung.rate,
          healthRate: config.socialInsurance.krankenversicherung.baseRate,
          unemploymentRate: config.socialInsurance.arbeitslosenversicherung.rate,
          longTermCareRate: config.socialInsurance.pflegeversicherung.baseRate
        }
      }),

      PL: () => ({
        country: 'Poland',
        taxYear: config.taxYear,
        currency: config.currency,
        incomeTax: {
          taxFreeAmount: config.pit.taxFreeAmount,
          firstBracketRate: '12%',
          secondBracketRate: '32%',
          threshold: config.pit.taxBands[0].max
        },
        socialInsurance: {
          pensionRate: config.zus.emerytalne.rate,
          disabilityRate: config.zus.rentowe.rate,
          sicknessRate: config.zus.chorobowe.rate
        },
        healthInsurance: {
          rate: config.healthInsurance.rate
        }
      }),

      US: () => ({
        country: 'United States',
        taxYear: config.taxYear,
        currency: config.currency,
        federalTax: {
          topRate: '37%',
          standardDeduction: config.federalIncomeTax.filingStatuses.single.standardDeduction
        },
        fica: {
          socialSecurityRate: config.fica.socialSecurity.rate * 2,
          socialSecurityCap: config.fica.socialSecurity.wageBase,
          medicareRate: config.fica.medicare.rate * 2
        },
        stateTax: {
          nc: config.stateIncomeTax.NC.rate
        }
      }),

      CN: () => ({
        country: 'China',
        taxYear: config.taxYear,
        currency: config.currency,
        incomeTax: {
          basicDeduction: config.iit.basicDeduction.monthly,
          topRate: '45%',
          method: 'Cumulative Withholding'
        },
        socialInsurance: {
          pensionEmployeeRate: config.socialInsurance.shanghai.pensionInsurance.employeeRate,
          medicalEmployeeRate: config.socialInsurance.shanghai.medicalInsurance.employeeRate
        },
        housingFund: {
          defaultRate: config.housingFund.shanghai.defaultRate
        }
      }),

      AE: () => ({
        country: 'United Arab Emirates',
        taxYear: config.taxYear,
        currency: config.currency,
        incomeTax: {
          rate: 0,
          description: 'No personal income tax'
        },
        socialInsurance: {
          expats: 'Not applicable',
          uaeNationals: {
            employeeRate: config.socialInsurance.uaeNationals.gpssa.employee.rate,
            employerRate: config.socialInsurance.uaeNationals.gpssa.employer.rate
          }
        },
        endOfService: {
          first5Years: '21 days per year',
          after5Years: '30 days per year'
        }
      })
    };

    const code = countryCode.toUpperCase();
    if (!summaries[code]) {
      throw new Error(`No tax summary available for: ${code}`);
    }

    return summaries[code]();
  }

  /**
   * Compare net pay across countries for same gross salary
   * Useful for international hiring decisions
   * @param {number} grossSalary - Annual gross salary in local currency
   * @param {Object} employeeProfile - Basic employee profile
   * @returns {Object} Comparison results
   */
  compareNetPayByCountry(grossSalary, employeeProfile = {}) {
    const results = {};

    for (const country of SUPPORTED_COUNTRIES) {
      try {
        const monthlyGross = grossSalary / 12;
        const employee = {
          id: 'comparison',
          name: 'Comparison Employee',
          ...employeeProfile,
          country
        };

        const payPeriod = {
          grossPay: monthlyGross,
          basicPay: monthlyGross, // For UAE
          frequency: 'monthly',
          periodNumber: 1
        };

        const payslip = this.calculatePayslip(country, employee, payPeriod);

        results[country] = {
          country: payslip.country,
          currency: payslip.currency,
          grossMonthly: payslip.totals.grossPay,
          deductions: payslip.totals.totalDeductions,
          netMonthly: payslip.totals.netPay,
          netAnnual: payslip.totals.netPay * 12,
          effectiveTaxRate: ((payslip.totals.totalDeductions / payslip.totals.grossPay) * 100).toFixed(2) + '%',
          employerCost: payslip.totals.grossPay + (payslip.employerContributions?.total || 0)
        };
      } catch (error) {
        results[country] = {
          error: error.message
        };
      }
    }

    return results;
  }
}

// Export singleton instance
export const payrollEngine = new PayrollEngine();

// Export individual components for direct usage
export {
  GBPayrollCalculator,
  DEPayrollCalculator,
  PLPayrollCalculator,
  USPayrollCalculator,
  CNPayrollCalculator,
  AEPayrollCalculator,
  gbConfig,
  deConfig,
  plConfig,
  usConfig,
  cnConfig,
  aeConfig
};

// Default export
export default payrollEngine;
