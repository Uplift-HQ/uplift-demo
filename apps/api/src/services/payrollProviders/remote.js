// ============================================================
// REMOTE.COM PAYROLL PROVIDER
// Integration with Remote API for global employment
// https://remote.com/developers
// ============================================================

import crypto from 'crypto';

/**
 * Remote.com API Client
 * Global HR platform for distributed teams
 */
class RemoteClient {
  constructor() {
    this.apiKey = process.env.REMOTE_API_KEY;
    this.webhookSecret = process.env.REMOTE_WEBHOOK_SECRET;
    this.baseUrl = process.env.REMOTE_API_URL || 'https://gateway.remote.com/v1';
    this.sandboxMode = process.env.REMOTE_SANDBOX === 'true';
  }

  /**
   * Make authenticated request to Remote API
   */
  async request(method, endpoint, body = null) {
    if (!this.apiKey) {
      throw new Error('REMOTE_API_KEY not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Token token=${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const options = {
      method,
      headers,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || `Remote API error: ${response.status}`);
    }

    return data;
  }

  // ============================================================
  // EMPLOYMENT MANAGEMENT
  // ============================================================

  /**
   * Create an employment (EOR employee)
   */
  async createEmployment(employmentData) {
    const payload = {
      country_code: employmentData.countryCode,
      type: employmentData.type || 'employee', // 'employee', 'contractor'
      basic_information: {
        email: employmentData.email,
        name: `${employmentData.firstName} ${employmentData.lastName}`,
        job_title: employmentData.jobTitle,
        provisional_start_date: employmentData.startDate,
      },
      contract_details: {
        annual_gross_salary: {
          amount: employmentData.annualSalary,
          currency: employmentData.currency || 'USD',
        },
        work_schedule: {
          hours_per_week: employmentData.hoursPerWeek || 40,
        },
      },
      personal_details: {
        first_name: employmentData.firstName,
        last_name: employmentData.lastName,
        date_of_birth: employmentData.dateOfBirth,
        nationality: employmentData.nationality,
      },
      address: employmentData.address ? {
        street: employmentData.address.line1,
        city: employmentData.address.city,
        postal_code: employmentData.address.postalCode,
        country_code: employmentData.countryCode,
      } : undefined,
      metadata: {
        external_id: employmentData.employeeId,
        ...employmentData.metadata,
      },
    };

    return this.request('POST', '/employments', { employment: payload });
  }

  /**
   * Get employment details
   */
  async getEmployment(employmentId) {
    return this.request('GET', `/employments/${employmentId}`);
  }

  /**
   * List employments
   */
  async listEmployments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.countryCode) params.append('country_code', filters.countryCode);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('page_size', filters.pageSize);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/employments${query}`);
  }

  /**
   * Update employment
   */
  async updateEmployment(employmentId, updates) {
    return this.request('PATCH', `/employments/${employmentId}`, {
      employment: updates,
    });
  }

  /**
   * Offboard (terminate) employment
   */
  async offboardEmployment(employmentId, offboardData) {
    return this.request('POST', `/employments/${employmentId}/offboard`, {
      offboarding: {
        reason: offboardData.reason,
        last_day_of_work: offboardData.lastDay,
        notes: offboardData.notes,
      },
    });
  }

  // ============================================================
  // PAYROLL CALCULATION
  // ============================================================

  /**
   * Calculate payroll using Remote's cost calculator
   */
  async calculate(input) {
    const {
      grossPay,
      countryCode,
      currency = 'USD',
      annualSalary,
    } = input;

    // Use Remote's cost calculator if available
    try {
      const costEstimate = await this.getEmploymentCost({
        countryCode,
        annualSalary: annualSalary || grossPay * 12,
        currency,
      });

      return {
        provider: 'remote',
        certified: false, // Remote handles compliance
        grossPay: this.round(grossPay),
        netPay: this.round(costEstimate.netPay || grossPay * 0.70),
        tax: this.round(costEstimate.tax || grossPay * 0.25),
        employeeNi: this.round(costEstimate.employeeSocialSecurity || grossPay * 0.08),
        employerNi: this.round(costEstimate.employerSocialSecurity || grossPay * 0.15),
        pension: this.round(costEstimate.pension || 0),
        employerPension: this.round(costEstimate.employerPension || 0),
        studentLoan: 0,
        deductions: [
          { type: 'tax', description: 'Income Tax', amount: costEstimate.tax || grossPay * 0.25 },
          { type: 'social_security', description: 'Social Security', amount: costEstimate.employeeSocialSecurity || grossPay * 0.08 },
        ],
        earnings: [
          { type: 'basic', description: 'Basic Pay', amount: grossPay },
        ],
        totalEmployerCost: this.round(costEstimate.totalCost || grossPay * 1.30),
        note: 'Remote manages all statutory compliance for EOR employees',
      };
    } catch (error) {
      // Fall back to estimates if API fails
      return this.estimateCalculation(input);
    }
  }

  /**
   * Get employment cost estimate
   */
  async getEmploymentCost(params) {
    try {
      const response = await this.request('POST', '/cost-calculator', {
        country_code: params.countryCode,
        annual_gross_salary: {
          amount: params.annualSalary,
          currency: params.currency,
        },
      });

      const monthly = response.data?.monthly || {};

      return {
        grossPay: monthly.gross_salary?.amount / 12 || params.annualSalary / 12,
        netPay: monthly.net_salary?.amount / 12 || (params.annualSalary * 0.70) / 12,
        tax: monthly.income_tax?.amount / 12 || (params.annualSalary * 0.25) / 12,
        employeeSocialSecurity: monthly.employee_social_contributions?.amount / 12 || 0,
        employerSocialSecurity: monthly.employer_social_contributions?.amount / 12 || 0,
        pension: monthly.employee_pension?.amount / 12 || 0,
        employerPension: monthly.employer_pension?.amount / 12 || 0,
        totalCost: monthly.total_employer_cost?.amount / 12 || params.annualSalary * 1.30 / 12,
      };
    } catch {
      return null;
    }
  }

  /**
   * Estimate calculation when API unavailable
   */
  estimateCalculation(input) {
    const { grossPay, countryCode } = input;

    const rates = this.getCountryRates(countryCode);

    return {
      provider: 'remote',
      certified: false,
      grossPay: this.round(grossPay),
      netPay: this.round(grossPay * (1 - rates.totalEmployeeDeductions)),
      tax: this.round(grossPay * rates.incomeTax),
      employeeNi: this.round(grossPay * rates.employeeSocial),
      employerNi: this.round(grossPay * rates.employerSocial),
      pension: 0,
      employerPension: 0,
      studentLoan: 0,
      deductions: [
        { type: 'tax', description: 'Income Tax (estimated)', amount: this.round(grossPay * rates.incomeTax) },
        { type: 'social_security', description: 'Social Security (estimated)', amount: this.round(grossPay * rates.employeeSocial) },
      ],
      earnings: [
        { type: 'basic', description: 'Basic Pay', amount: grossPay },
      ],
      warning: 'Estimates only - actual amounts determined by Remote',
    };
  }

  /**
   * Get country-specific tax rates (estimates)
   */
  getCountryRates(countryCode) {
    const rates = {
      DE: { incomeTax: 0.30, employeeSocial: 0.10, employerSocial: 0.20 },
      FR: { incomeTax: 0.25, employeeSocial: 0.10, employerSocial: 0.30 },
      NL: { incomeTax: 0.35, employeeSocial: 0.08, employerSocial: 0.15 },
      ES: { incomeTax: 0.25, employeeSocial: 0.065, employerSocial: 0.30 },
      IT: { incomeTax: 0.28, employeeSocial: 0.10, employerSocial: 0.30 },
      PT: { incomeTax: 0.25, employeeSocial: 0.11, employerSocial: 0.24 },
      US: { incomeTax: 0.22, employeeSocial: 0.0765, employerSocial: 0.0765 },
      CA: { incomeTax: 0.25, employeeSocial: 0.06, employerSocial: 0.06 },
      AU: { incomeTax: 0.325, employeeSocial: 0, employerSocial: 0.115 },
      SG: { incomeTax: 0.12, employeeSocial: 0.20, employerSocial: 0.17 },
      JP: { incomeTax: 0.20, employeeSocial: 0.15, employerSocial: 0.15 },
      KR: { incomeTax: 0.22, employeeSocial: 0.09, employerSocial: 0.10 },
      IN: { incomeTax: 0.20, employeeSocial: 0.12, employerSocial: 0.12 },
    };

    const countryRates = rates[countryCode] || { incomeTax: 0.25, employeeSocial: 0.10, employerSocial: 0.15 };

    return {
      ...countryRates,
      totalEmployeeDeductions: countryRates.incomeTax + countryRates.employeeSocial,
    };
  }

  // ============================================================
  // TIME OFF
  // ============================================================

  /**
   * Request time off
   */
  async createTimeOff(employmentId, timeOff) {
    return this.request('POST', `/employments/${employmentId}/time-off`, {
      time_off: {
        type: timeOff.type, // 'annual_leave', 'sick_leave', etc.
        start_date: timeOff.startDate,
        end_date: timeOff.endDate,
        notes: timeOff.notes,
      },
    });
  }

  /**
   * Get time off balance
   */
  async getTimeOffBalance(employmentId) {
    return this.request('GET', `/employments/${employmentId}/time-off/balance`);
  }

  // ============================================================
  // EXPENSES
  // ============================================================

  /**
   * Submit expense
   */
  async submitExpense(employmentId, expense) {
    return this.request('POST', `/employments/${employmentId}/expenses`, {
      expense: {
        title: expense.description,
        amount: {
          amount: expense.amount,
          currency: expense.currency,
        },
        receipt_url: expense.receiptUrl,
        expense_date: expense.date,
        category: expense.category,
      },
    });
  }

  // ============================================================
  // COUNTRIES
  // ============================================================

  /**
   * Get supported countries
   */
  async getSupportedCountries() {
    try {
      const response = await this.request('GET', '/countries');
      return response.data || [];
    } catch {
      // Return static list if API fails
      return this.getStaticCountryList();
    }
  }

  getStaticCountryList() {
    return [
      { code: 'DE', name: 'Germany', eor_available: true },
      { code: 'FR', name: 'France', eor_available: true },
      { code: 'NL', name: 'Netherlands', eor_available: true },
      { code: 'ES', name: 'Spain', eor_available: true },
      { code: 'IT', name: 'Italy', eor_available: true },
      { code: 'PT', name: 'Portugal', eor_available: true },
      { code: 'US', name: 'United States', eor_available: true },
      { code: 'CA', name: 'Canada', eor_available: true },
      { code: 'AU', name: 'Australia', eor_available: true },
      { code: 'SG', name: 'Singapore', eor_available: true },
      { code: 'JP', name: 'Japan', eor_available: true },
      { code: 'IN', name: 'India', eor_available: true },
      { code: 'BR', name: 'Brazil', eor_available: true },
    ];
  }

  // ============================================================
  // WEBHOOKS
  // ============================================================

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload, signature) {
    if (!this.webhookSecret) {
      return true;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ============================================================
  // CONNECTION CHECK
  // ============================================================

  /**
   * Check API connection
   */
  async checkConnection() {
    if (!this.apiKey) {
      return { available: false, reason: 'REMOTE_API_KEY not configured' };
    }

    try {
      await this.request('GET', '/company');
      return { available: true };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  round(value) {
    return Math.round(value * 100) / 100;
  }
}

export const remoteClient = new RemoteClient();
export default remoteClient;
