// ============================================================
// DEEL PAYROLL PROVIDER
// Integration with Deel API for global payroll and EOR
// https://developer.deel.com/
// ============================================================

import crypto from 'crypto';

/**
 * Deel API Client
 * Handles global payroll, EOR, and contractor payments
 */
class DeelClient {
  constructor() {
    this.apiKey = process.env.DEEL_API_KEY;
    this.webhookSecret = process.env.DEEL_WEBHOOK_SECRET;
    this.baseUrl = process.env.DEEL_API_URL || 'https://api.letsdeel.com/rest/v2';
    this.sandboxMode = process.env.DEEL_SANDBOX === 'true';
  }

  /**
   * Make authenticated request to Deel API
   */
  async request(method, endpoint, body = null) {
    if (!this.apiKey) {
      throw new Error('DEEL_API_KEY not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
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
      throw new Error(data.message || `Deel API error: ${response.status}`);
    }

    return data;
  }

  // ============================================================
  // WORKER MANAGEMENT
  // ============================================================

  /**
   * Create a new EOR employee or contractor in Deel
   */
  async createWorker(workerData) {
    const payload = {
      type: workerData.type || 'employee', // 'employee' or 'contractor'
      country: workerData.countryCode,
      email: workerData.email,
      first_name: workerData.firstName,
      last_name: workerData.lastName,
      job_title: workerData.jobTitle,
      start_date: workerData.startDate,
      team_id: workerData.teamId,
      hiring_manager_id: workerData.hiringManagerId,

      // Compensation
      compensation: {
        amount: workerData.salary,
        currency: workerData.currency,
        frequency: workerData.payFrequency || 'monthly',
      },

      // Address
      address: workerData.address ? {
        line1: workerData.address.line1,
        line2: workerData.address.line2,
        city: workerData.address.city,
        postal_code: workerData.address.postalCode,
        country: workerData.countryCode,
      } : undefined,

      // Custom fields
      external_id: workerData.employeeId, // Link to Uplift employee ID
      metadata: workerData.metadata,
    };

    return this.request('POST', '/contracts', payload);
  }

  /**
   * Get worker details
   */
  async getWorker(contractId) {
    return this.request('GET', `/contracts/${contractId}`);
  }

  /**
   * List all workers with filters
   */
  async listWorkers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.country) params.append('country', filters.country);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/contracts${query}`);
  }

  /**
   * Update worker details
   */
  async updateWorker(contractId, updates) {
    return this.request('PATCH', `/contracts/${contractId}`, updates);
  }

  /**
   * Terminate/offboard worker
   */
  async terminateWorker(contractId, terminationData) {
    return this.request('POST', `/contracts/${contractId}/terminate`, {
      termination_date: terminationData.lastDay,
      termination_reason: terminationData.reason,
      notice_period: terminationData.noticePeriod,
    });
  }

  // ============================================================
  // PAYROLL CALCULATION
  // ============================================================

  /**
   * Calculate payroll for an employee
   * Note: Deel handles the actual tax calculations
   */
  async calculate(input) {
    const {
      grossPay,
      countryCode,
      currency = 'USD',
      payFrequency = 'monthly',
    } = input;

    // Deel doesn't expose a standalone calculation API
    // They handle payroll internally - we return estimated values
    // based on country-specific rules

    const estimatedDeductions = await this.estimateDeductions(grossPay, countryCode);

    return {
      provider: 'deel',
      certified: false, // Deel handles compliance internally
      grossPay: this.round(grossPay),
      netPay: this.round(grossPay - estimatedDeductions.total),
      tax: this.round(estimatedDeductions.incomeTax),
      employeeNi: this.round(estimatedDeductions.socialSecurity),
      employerNi: this.round(estimatedDeductions.employerSocialSecurity),
      pension: 0, // Handled by Deel
      employerPension: 0,
      studentLoan: 0,
      deductions: [
        { type: 'tax', description: 'Income Tax (estimated)', amount: estimatedDeductions.incomeTax },
        { type: 'social_security', description: 'Social Security (estimated)', amount: estimatedDeductions.socialSecurity },
      ],
      earnings: [
        { type: 'basic', description: 'Basic Pay', amount: grossPay },
      ],
      warning: 'Calculations are estimates - actual amounts determined by Deel',
      note: 'Deel manages all statutory deductions and compliance for EOR employees',
    };
  }

  /**
   * Estimate deductions based on country
   * These are rough estimates - Deel handles actual calculations
   */
  async estimateDeductions(grossPay, countryCode) {
    // Simplified country-specific estimates
    const rates = {
      DE: { incomeTax: 0.30, socialSecurity: 0.10, employerSS: 0.10 },
      FR: { incomeTax: 0.25, socialSecurity: 0.12, employerSS: 0.25 },
      NL: { incomeTax: 0.35, socialSecurity: 0.08, employerSS: 0.05 },
      ES: { incomeTax: 0.25, socialSecurity: 0.065, employerSS: 0.30 },
      IT: { incomeTax: 0.28, socialSecurity: 0.10, employerSS: 0.30 },
      PL: { incomeTax: 0.17, socialSecurity: 0.14, employerSS: 0.20 },
      US: { incomeTax: 0.22, socialSecurity: 0.0765, employerSS: 0.0765 },
      CA: { incomeTax: 0.25, socialSecurity: 0.055, employerSS: 0.055 },
      AU: { incomeTax: 0.325, socialSecurity: 0, employerSS: 0.105 }, // Super
      JP: { incomeTax: 0.20, socialSecurity: 0.15, employerSS: 0.15 },
      SG: { incomeTax: 0.15, socialSecurity: 0.20, employerSS: 0.17 }, // CPF
      IN: { incomeTax: 0.20, socialSecurity: 0.12, employerSS: 0.12 },
      BR: { incomeTax: 0.275, socialSecurity: 0.11, employerSS: 0.26 },
      MX: { incomeTax: 0.30, socialSecurity: 0.03, employerSS: 0.05 },
    };

    const countryRates = rates[countryCode] || { incomeTax: 0.25, socialSecurity: 0.10, employerSS: 0.10 };

    return {
      incomeTax: this.round(grossPay * countryRates.incomeTax),
      socialSecurity: this.round(grossPay * countryRates.socialSecurity),
      employerSocialSecurity: this.round(grossPay * countryRates.employerSS),
      total: this.round(grossPay * (countryRates.incomeTax + countryRates.socialSecurity)),
    };
  }

  // ============================================================
  // PAYMENTS
  // ============================================================

  /**
   * Get upcoming payments
   */
  async getUpcomingPayments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.contractId) params.append('contract_id', filters.contractId);
    if (filters.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/payments/upcoming${query}`);
  }

  /**
   * Approve a payment
   */
  async approvePayment(paymentId) {
    return this.request('POST', `/payments/${paymentId}/approve`);
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(contractId, options = {}) {
    const params = new URLSearchParams();
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);
    params.append('limit', options.limit || 50);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/contracts/${contractId}/payments${query}`);
  }

  // ============================================================
  // TIME OFF & EXPENSES
  // ============================================================

  /**
   * Create time off request
   */
  async createTimeOffRequest(contractId, timeOff) {
    return this.request('POST', `/contracts/${contractId}/time-off`, {
      type: timeOff.type, // 'vacation', 'sick', 'other'
      start_date: timeOff.startDate,
      end_date: timeOff.endDate,
      note: timeOff.notes,
    });
  }

  /**
   * Submit expense
   */
  async submitExpense(contractId, expense) {
    return this.request('POST', `/contracts/${contractId}/expenses`, {
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      description: expense.description,
      receipt_url: expense.receiptUrl,
    });
  }

  // ============================================================
  // WEBHOOKS
  // ============================================================

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('DEEL_WEBHOOK_SECRET not configured');
      return true; // Skip verification if not configured
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(event) {
    switch (event.type) {
      case 'contract.created':
        return { action: 'sync_employee', data: event.data };
      case 'contract.terminated':
        return { action: 'offboard_employee', data: event.data };
      case 'payment.processed':
        return { action: 'mark_paid', data: event.data };
      case 'time_off.approved':
        return { action: 'sync_time_off', data: event.data };
      default:
        return { action: 'ignore', type: event.type };
    }
  }

  // ============================================================
  // CONNECTION CHECK
  // ============================================================

  /**
   * Check if Deel API is available
   */
  async checkConnection() {
    if (!this.apiKey) {
      return { available: false, reason: 'DEEL_API_KEY not configured' };
    }

    try {
      await this.request('GET', '/organization');
      return { available: true };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Get supported countries for Deel EOR
   */
  getSupportedCountries() {
    // Deel supports 150+ countries for EOR
    return [
      'DE', 'FR', 'NL', 'ES', 'IT', 'PL', 'PT', 'BE', 'AT', 'CH', // Europe
      'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', // Americas
      'AU', 'NZ', 'SG', 'JP', 'KR', 'IN', 'PH', 'ID', 'TH', 'VN', // APAC
      'ZA', 'NG', 'KE', 'EG', // Africa
      'AE', 'SA', 'IL', // Middle East
    ];
  }

  round(value) {
    return Math.round(value * 100) / 100;
  }
}

export const deelClient = new DeelClient();
export default deelClient;
