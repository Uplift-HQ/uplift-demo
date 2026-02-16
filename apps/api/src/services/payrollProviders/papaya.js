// ============================================================
// PAPAYA GLOBAL PAYROLL PROVIDER
// Integration with Papaya Global API for workforce payments
// https://developer.papayaglobal.com/
// ============================================================

import crypto from 'crypto';

/**
 * Papaya Global API Client
 * End-to-end global payroll and payments platform
 */
class PapayaClient {
  constructor() {
    this.apiKey = process.env.PAPAYA_API_KEY;
    this.clientId = process.env.PAPAYA_CLIENT_ID;
    this.clientSecret = process.env.PAPAYA_CLIENT_SECRET;
    this.webhookSecret = process.env.PAPAYA_WEBHOOK_SECRET;
    this.baseUrl = process.env.PAPAYA_API_URL || 'https://api.papayaglobal.com/v1';
    this.sandboxMode = process.env.PAPAYA_SANDBOX === 'true';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('PAPAYA_CLIENT_ID and PAPAYA_CLIENT_SECRET required');
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to get Papaya access token');
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return this.accessToken;
  }

  /**
   * Make authenticated request to Papaya API
   */
  async request(method, endpoint, body = null) {
    const token = await this.getAccessToken();

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
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
      throw new Error(data.message || `Papaya API error: ${response.status}`);
    }

    return data;
  }

  // ============================================================
  // WORKER MANAGEMENT
  // ============================================================

  /**
   * Create worker in Papaya
   */
  async createWorker(workerData) {
    const payload = {
      worker_type: workerData.type || 'employee', // 'employee', 'contractor', 'eor'
      country_code: workerData.countryCode,
      personal_info: {
        first_name: workerData.firstName,
        last_name: workerData.lastName,
        email: workerData.email,
        date_of_birth: workerData.dateOfBirth,
        gender: workerData.gender,
        nationality: workerData.nationality,
      },
      employment_info: {
        job_title: workerData.jobTitle,
        department: workerData.department,
        start_date: workerData.startDate,
        employment_type: workerData.employmentType || 'full_time',
        work_location: workerData.workLocation || 'remote',
      },
      compensation: {
        base_salary: workerData.salary,
        currency: workerData.currency || 'USD',
        pay_frequency: workerData.payFrequency || 'monthly',
      },
      address: workerData.address,
      bank_details: workerData.bankDetails,
      external_id: workerData.employeeId,
    };

    return this.request('POST', '/workers', payload);
  }

  /**
   * Get worker details
   */
  async getWorker(workerId) {
    return this.request('GET', `/workers/${workerId}`);
  }

  /**
   * List workers
   */
  async listWorkers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.countryCode) params.append('country_code', filters.countryCode);
    if (filters.status) params.append('status', filters.status);
    if (filters.workerType) params.append('worker_type', filters.workerType);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/workers${query}`);
  }

  /**
   * Update worker
   */
  async updateWorker(workerId, updates) {
    return this.request('PATCH', `/workers/${workerId}`, updates);
  }

  /**
   * Terminate worker
   */
  async terminateWorker(workerId, terminationData) {
    return this.request('POST', `/workers/${workerId}/terminate`, {
      termination_date: terminationData.lastDay,
      reason: terminationData.reason,
      type: terminationData.type || 'voluntary', // 'voluntary', 'involuntary', 'mutual'
      notes: terminationData.notes,
    });
  }

  // ============================================================
  // PAYROLL CALCULATION
  // ============================================================

  /**
   * Calculate payroll using Papaya's engine
   */
  async calculate(input) {
    const {
      grossPay,
      countryCode,
      currency = 'USD',
      workerId,
      payPeriodStart,
      payPeriodEnd,
    } = input;

    // Try to use Papaya's payroll simulation
    if (workerId) {
      try {
        const simulation = await this.simulatePayroll({
          workerId,
          grossPay,
          payPeriodStart,
          payPeriodEnd,
        });

        return {
          provider: 'papaya',
          certified: true, // Papaya handles tax compliance
          grossPay: this.round(simulation.gross_pay),
          netPay: this.round(simulation.net_pay),
          tax: this.round(simulation.income_tax),
          employeeNi: this.round(simulation.employee_social_security),
          employerNi: this.round(simulation.employer_social_security),
          pension: this.round(simulation.employee_pension || 0),
          employerPension: this.round(simulation.employer_pension || 0),
          studentLoan: 0,
          deductions: simulation.deductions || [],
          earnings: simulation.earnings || [{ type: 'basic', description: 'Basic Pay', amount: grossPay }],
          totalEmployerCost: this.round(simulation.total_employer_cost),
        };
      } catch (error) {
        console.error('Papaya simulation failed:', error.message);
      }
    }

    // Fall back to estimates
    return this.estimateCalculation(input);
  }

  /**
   * Simulate payroll calculation
   */
  async simulatePayroll(params) {
    return this.request('POST', '/payroll/simulate', {
      worker_id: params.workerId,
      gross_pay: params.grossPay,
      period_start: params.payPeriodStart,
      period_end: params.payPeriodEnd,
    });
  }

  /**
   * Estimate calculation when simulation unavailable
   */
  estimateCalculation(input) {
    const { grossPay, countryCode } = input;

    const rates = this.getCountryRates(countryCode);
    const incomeTax = this.round(grossPay * rates.incomeTax);
    const employeeSocial = this.round(grossPay * rates.employeeSocial);
    const employerSocial = this.round(grossPay * rates.employerSocial);

    return {
      provider: 'papaya',
      certified: false,
      grossPay: this.round(grossPay),
      netPay: this.round(grossPay - incomeTax - employeeSocial),
      tax: incomeTax,
      employeeNi: employeeSocial,
      employerNi: employerSocial,
      pension: 0,
      employerPension: 0,
      studentLoan: 0,
      deductions: [
        { type: 'tax', description: 'Income Tax (estimated)', amount: incomeTax },
        { type: 'social_security', description: 'Social Security (estimated)', amount: employeeSocial },
      ],
      earnings: [
        { type: 'basic', description: 'Basic Pay', amount: grossPay },
      ],
      totalEmployerCost: this.round(grossPay + employerSocial),
      warning: 'Estimates only - actual amounts calculated by Papaya',
    };
  }

  /**
   * Get country-specific rates
   */
  getCountryRates(countryCode) {
    const rates = {
      // Europe
      DE: { incomeTax: 0.30, employeeSocial: 0.10, employerSocial: 0.20 },
      FR: { incomeTax: 0.25, employeeSocial: 0.10, employerSocial: 0.30 },
      NL: { incomeTax: 0.35, employeeSocial: 0.08, employerSocial: 0.15 },
      ES: { incomeTax: 0.25, employeeSocial: 0.065, employerSocial: 0.30 },
      IT: { incomeTax: 0.28, employeeSocial: 0.10, employerSocial: 0.30 },
      PL: { incomeTax: 0.17, employeeSocial: 0.14, employerSocial: 0.20 },
      SE: { incomeTax: 0.35, employeeSocial: 0.07, employerSocial: 0.31 },
      DK: { incomeTax: 0.40, employeeSocial: 0.08, employerSocial: 0.05 },
      NO: { incomeTax: 0.32, employeeSocial: 0.08, employerSocial: 0.14 },
      FI: { incomeTax: 0.35, employeeSocial: 0.10, employerSocial: 0.20 },
      CH: { incomeTax: 0.25, employeeSocial: 0.065, employerSocial: 0.065 },
      AT: { incomeTax: 0.30, employeeSocial: 0.18, employerSocial: 0.21 },
      BE: { incomeTax: 0.40, employeeSocial: 0.13, employerSocial: 0.25 },
      IE: { incomeTax: 0.30, employeeSocial: 0.04, employerSocial: 0.11 },

      // Americas
      US: { incomeTax: 0.22, employeeSocial: 0.0765, employerSocial: 0.0765 },
      CA: { incomeTax: 0.25, employeeSocial: 0.06, employerSocial: 0.06 },
      MX: { incomeTax: 0.30, employeeSocial: 0.03, employerSocial: 0.17 },
      BR: { incomeTax: 0.275, employeeSocial: 0.11, employerSocial: 0.26 },
      AR: { incomeTax: 0.27, employeeSocial: 0.17, employerSocial: 0.24 },
      CL: { incomeTax: 0.25, employeeSocial: 0.17, employerSocial: 0.05 },
      CO: { incomeTax: 0.28, employeeSocial: 0.08, employerSocial: 0.21 },

      // APAC
      AU: { incomeTax: 0.325, employeeSocial: 0, employerSocial: 0.115 },
      NZ: { incomeTax: 0.30, employeeSocial: 0, employerSocial: 0.03 },
      SG: { incomeTax: 0.12, employeeSocial: 0.20, employerSocial: 0.17 },
      JP: { incomeTax: 0.20, employeeSocial: 0.15, employerSocial: 0.15 },
      KR: { incomeTax: 0.22, employeeSocial: 0.09, employerSocial: 0.10 },
      CN: { incomeTax: 0.25, employeeSocial: 0.11, employerSocial: 0.32 },
      IN: { incomeTax: 0.20, employeeSocial: 0.12, employerSocial: 0.13 },
      PH: { incomeTax: 0.22, employeeSocial: 0.05, employerSocial: 0.10 },
      ID: { incomeTax: 0.25, employeeSocial: 0.03, employerSocial: 0.05 },
      TH: { incomeTax: 0.25, employeeSocial: 0.05, employerSocial: 0.05 },
      VN: { incomeTax: 0.20, employeeSocial: 0.105, employerSocial: 0.215 },

      // Middle East
      AE: { incomeTax: 0, employeeSocial: 0, employerSocial: 0.125 }, // UAE
      SA: { incomeTax: 0, employeeSocial: 0.10, employerSocial: 0.12 },
      IL: { incomeTax: 0.30, employeeSocial: 0.07, employerSocial: 0.08 },

      // Africa
      ZA: { incomeTax: 0.30, employeeSocial: 0.01, employerSocial: 0.01 },
      NG: { incomeTax: 0.20, employeeSocial: 0.08, employerSocial: 0.10 },
      KE: { incomeTax: 0.25, employeeSocial: 0.06, employerSocial: 0.06 },
      EG: { incomeTax: 0.22, employeeSocial: 0.11, employerSocial: 0.19 },
    };

    return rates[countryCode] || { incomeTax: 0.25, employeeSocial: 0.10, employerSocial: 0.15 };
  }

  // ============================================================
  // PAYROLL RUNS
  // ============================================================

  /**
   * Create payroll run
   */
  async createPayrollRun(payrollData) {
    return this.request('POST', '/payroll-runs', {
      name: payrollData.name,
      pay_period_start: payrollData.periodStart,
      pay_period_end: payrollData.periodEnd,
      pay_date: payrollData.payDate,
      country_code: payrollData.countryCode,
      worker_ids: payrollData.workerIds,
    });
  }

  /**
   * Get payroll run status
   */
  async getPayrollRun(runId) {
    return this.request('GET', `/payroll-runs/${runId}`);
  }

  /**
   * Approve payroll run
   */
  async approvePayrollRun(runId) {
    return this.request('POST', `/payroll-runs/${runId}/approve`);
  }

  /**
   * Get payroll run payslips
   */
  async getPayrollRunPayslips(runId) {
    return this.request('GET', `/payroll-runs/${runId}/payslips`);
  }

  // ============================================================
  // PAYMENTS
  // ============================================================

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    return this.request('GET', `/payments/${paymentId}`);
  }

  /**
   * List payments
   */
  async listPayments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.workerId) params.append('worker_id', filters.workerId);
    if (filters.status) params.append('status', filters.status);
    if (filters.fromDate) params.append('from_date', filters.fromDate);
    if (filters.toDate) params.append('to_date', filters.toDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/payments${query}`);
  }

  // ============================================================
  // REPORTING
  // ============================================================

  /**
   * Get cost report
   */
  async getCostReport(params) {
    return this.request('POST', '/reports/costs', {
      country_codes: params.countryCodes,
      from_date: params.fromDate,
      to_date: params.toDate,
      group_by: params.groupBy || 'country', // 'country', 'department', 'worker'
    });
  }

  /**
   * Get headcount report
   */
  async getHeadcountReport(params) {
    return this.request('POST', '/reports/headcount', {
      country_codes: params.countryCodes,
      as_of_date: params.asOfDate,
      include_terminated: params.includeTerminated || false,
    });
  }

  // ============================================================
  // WEBHOOKS
  // ============================================================

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload, signature, timestamp) {
    if (!this.webhookSecret) {
      return true;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(signedPayload);
    const expectedSignature = hmac.digest('hex');

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
    if (!this.clientId || !this.clientSecret) {
      return { available: false, reason: 'PAPAYA_CLIENT_ID/SECRET not configured' };
    }

    try {
      await this.getAccessToken();
      return { available: true };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Get supported countries
   */
  getSupportedCountries() {
    // Papaya supports 160+ countries
    return Object.keys(this.getCountryRates('') || {});
  }

  round(value) {
    return Math.round(value * 100) / 100;
  }
}

export const papayaClient = new PapayaClient();
export default papayaClient;
