// ============================================================
// THOMSON REUTERS ONESOURCE INTEGRATION
// Enterprise multi-country payroll calculation
// https://tax.thomsonreuters.com/onesource/
// ============================================================

/**
 * Thomson Reuters ONESOURCE Payroll Client
 *
 * This is a stub implementation for future integration.
 * ONESOURCE provides certified payroll calculations for 190+ countries.
 *
 * When configured:
 * - Provides compliant gross-to-net calculations
 * - Handles local tax regulations
 * - Supports multi-currency
 * - Includes statutory reporting
 */
class OneSourceClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ONESOURCE_API_KEY;
    this.apiUrl = options.apiUrl || process.env.ONESOURCE_API_URL || 'https://api.onesource.thomsonreuters.com';
    this.configured = !!this.apiKey;
  }

  /**
   * Check if ONESOURCE is configured
   */
  isConfigured() {
    return this.configured;
  }

  /**
   * Check connection to ONESOURCE
   */
  async checkConnection() {
    if (!this.configured) {
      return {
        available: false,
        reason: 'ONESOURCE_API_KEY not configured. Contact Thomson Reuters for enterprise payroll integration.'
      };
    }

    try {
      // In production, this would ping the ONESOURCE API
      const response = await fetch(`${this.apiUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      if (response.ok) {
        return { available: true };
      } else {
        return { available: false, reason: `ONESOURCE API returned ${response.status}` };
      }
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Calculate payroll using ONESOURCE
   *
   * This is the main integration point. When ONESOURCE credentials are configured,
   * this method will make API calls to get certified payroll calculations.
   */
  async calculate(input, config) {
    if (!this.configured) {
      throw new OneSourceError(
        `ONESOURCE not configured for ${config?.countryCode || 'this country'}. ` +
        'For certified multi-country payroll calculations, contact Thomson Reuters ' +
        'to set up ONESOURCE integration. Using fallback calculations in the meantime.'
      );
    }

    const {
      countryCode,
      employeeId,
      grossPay,
      annualSalary,
      currency,
      taxCode,
      socialSecurityNumber,
      region,
      payPeriodStart,
      payPeriodEnd,
      payFrequency
    } = input;

    try {
      // Build ONESOURCE request payload
      const payload = {
        calculation_request: {
          country: countryCode,
          currency: currency || this.getCurrencyForCountry(countryCode),
          employee: {
            id: employeeId,
            tax_id: socialSecurityNumber,
            region: region
          },
          earnings: {
            gross_pay: grossPay || (annualSalary / 12),
            pay_frequency: payFrequency || 'monthly'
          },
          period: {
            start_date: payPeriodStart,
            end_date: payPeriodEnd
          },
          options: {
            include_employer_costs: true,
            include_statutory_deductions: true
          }
        }
      };

      // Make API call to ONESOURCE
      const response = await fetch(`${this.apiUrl}/v1/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new OneSourceError(`ONESOURCE API error: ${response.status} - ${errorBody}`);
      }

      const result = await response.json();

      // Map ONESOURCE response to our format
      return this.mapResponse(result, input);

    } catch (error) {
      if (error instanceof OneSourceError) throw error;
      throw new OneSourceError(`ONESOURCE calculation failed: ${error.message}`);
    }
  }

  /**
   * Map ONESOURCE response to our standard payslip format
   */
  mapResponse(response, input) {
    // This mapping would depend on ONESOURCE's actual response format
    // Below is a placeholder structure

    const calc = response.calculation_result || {};
    const earnings = calc.earnings || {};
    const deductions = calc.deductions || {};
    const employer = calc.employer_costs || {};

    return {
      success: true,
      provider: 'onesource',
      certified: true, // ONESOURCE provides certified calculations
      countryCode: input.countryCode,
      currency: input.currency || this.getCurrencyForCountry(input.countryCode),

      grossPay: earnings.gross_total || 0,
      netPay: calc.net_pay || 0,

      // Tax (varies by country)
      tax: deductions.income_tax || 0,
      taxBreakdown: deductions.tax_breakdown || [],

      // Social security (varies by country)
      socialSecurity: deductions.social_security_employee || 0,
      employerSocialSecurity: employer.social_security || 0,

      // Other deductions
      healthInsurance: deductions.health_insurance || 0,
      pensionContribution: deductions.pension || 0,
      employerPension: employer.pension || 0,

      // Totals
      totalDeductions: calc.total_deductions || 0,
      totalEmployerCost: calc.total_employer_cost || 0,

      // Detailed breakdowns
      earnings: this.mapEarnings(earnings),
      deductions: this.mapDeductions(deductions),
      employerCosts: this.mapEmployerCosts(employer),

      // Raw response for debugging
      _raw: response
    };
  }

  /**
   * Map earnings from ONESOURCE format
   */
  mapEarnings(earnings) {
    const items = [];

    if (earnings.basic_pay) {
      items.push({ type: 'basic', description: 'Basic Pay', amount: earnings.basic_pay });
    }
    if (earnings.overtime) {
      items.push({ type: 'overtime', description: 'Overtime', amount: earnings.overtime });
    }
    if (earnings.bonus) {
      items.push({ type: 'bonus', description: 'Bonus', amount: earnings.bonus });
    }
    if (earnings.allowances) {
      for (const allowance of earnings.allowances) {
        items.push({ type: 'allowance', description: allowance.name, amount: allowance.amount });
      }
    }

    return items;
  }

  /**
   * Map deductions from ONESOURCE format
   */
  mapDeductions(deductions) {
    const items = [];

    if (deductions.income_tax) {
      items.push({ type: 'tax', description: 'Income Tax', amount: deductions.income_tax });
    }
    if (deductions.social_security_employee) {
      items.push({ type: 'socialSecurity', description: 'Social Security', amount: deductions.social_security_employee });
    }
    if (deductions.health_insurance) {
      items.push({ type: 'health', description: 'Health Insurance', amount: deductions.health_insurance });
    }
    if (deductions.pension) {
      items.push({ type: 'pension', description: 'Pension', amount: deductions.pension });
    }

    return items;
  }

  /**
   * Map employer costs from ONESOURCE format
   */
  mapEmployerCosts(employer) {
    const items = [];

    if (employer.social_security) {
      items.push({ type: 'socialSecurity', description: 'Employer Social Security', amount: employer.social_security });
    }
    if (employer.pension) {
      items.push({ type: 'pension', description: 'Employer Pension', amount: employer.pension });
    }
    if (employer.health_insurance) {
      items.push({ type: 'health', description: 'Employer Health Insurance', amount: employer.health_insurance });
    }

    return items;
  }

  /**
   * Get default currency for a country
   */
  getCurrencyForCountry(countryCode) {
    const currencies = {
      GB: 'GBP',
      DE: 'EUR',
      PL: 'PLN',
      US: 'USD',
      CN: 'CNY',
      AE: 'AED',
      FR: 'EUR',
      ES: 'EUR',
      IT: 'EUR',
      NL: 'EUR',
      IE: 'EUR',
      IN: 'INR',
      JP: 'JPY',
      AU: 'AUD',
      CA: 'CAD',
      SG: 'SGD',
      HK: 'HKD'
    };

    return currencies[countryCode] || 'USD';
  }

  /**
   * Get supported countries
   * ONESOURCE supports 190+ countries
   */
  getSupportedCountries() {
    return [
      // Europe
      { code: 'DE', name: 'Germany', currency: 'EUR', certified: true },
      { code: 'FR', name: 'France', currency: 'EUR', certified: true },
      { code: 'PL', name: 'Poland', currency: 'PLN', certified: true },
      { code: 'ES', name: 'Spain', currency: 'EUR', certified: true },
      { code: 'IT', name: 'Italy', currency: 'EUR', certified: true },
      { code: 'NL', name: 'Netherlands', currency: 'EUR', certified: true },
      { code: 'IE', name: 'Ireland', currency: 'EUR', certified: true },

      // Americas
      { code: 'US', name: 'United States', currency: 'USD', certified: true },
      { code: 'CA', name: 'Canada', currency: 'CAD', certified: true },
      { code: 'MX', name: 'Mexico', currency: 'MXN', certified: true },
      { code: 'BR', name: 'Brazil', currency: 'BRL', certified: true },

      // Asia Pacific
      { code: 'CN', name: 'China', currency: 'CNY', certified: true },
      { code: 'JP', name: 'Japan', currency: 'JPY', certified: true },
      { code: 'IN', name: 'India', currency: 'INR', certified: true },
      { code: 'SG', name: 'Singapore', currency: 'SGD', certified: true },
      { code: 'AU', name: 'Australia', currency: 'AUD', certified: true },
      { code: 'HK', name: 'Hong Kong', currency: 'HKD', certified: true },

      // Middle East
      { code: 'AE', name: 'United Arab Emirates', currency: 'AED', certified: true },
      { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', certified: true }
    ];
  }
}

/**
 * Custom error class for ONESOURCE errors
 */
class OneSourceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OneSourceError';
  }
}

// Export singleton and class
export const onesourceClient = new OneSourceClient();
export { OneSourceClient, OneSourceError };
export default onesourceClient;
