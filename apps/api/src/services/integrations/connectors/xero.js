// ============================================================
// XERO CONNECTOR
// Sync employees from Xero Payroll (UK)
// ============================================================

const XERO_API_BASE = 'https://api.xero.com';
const XERO_PAYROLL_URL = `${XERO_API_BASE}/payroll.xro/2.0`;
const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';

export default {
  // Metadata
  id: 'xero',
  name: 'Xero',
  category: 'payroll',
  description: 'Sync employees from Xero Payroll',
  logo: '/logos/xero.svg',

  // Auth configuration
  authType: 'oauth2',
  authFields: [
    { key: 'client_id', label: 'Client ID', type: 'text', required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    { key: 'tenant_id', label: 'Tenant ID', type: 'text', required: true, placeholder: 'Your Xero organization ID' }
  ],

  oauth: {
    authUrl: XERO_AUTH_URL,
    tokenUrl: XERO_TOKEN_URL,
    scopes: ['openid', 'profile', 'email', 'payroll.employees', 'payroll.settings', 'payroll.payruns.read']
  },

  // Token storage (in production, store in database)
  tokenCache: {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  },

  // Refresh access token
  async refreshAccessToken(credentials) {
    if (!credentials.refresh_token) {
      throw new Error('No refresh token available. Please re-authenticate with Xero.');
    }

    const response = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Xero access token');
    }

    const data = await response.json();

    this.tokenCache.accessToken = data.access_token;
    this.tokenCache.refreshToken = data.refresh_token;
    this.tokenCache.expiresAt = Date.now() + (data.expires_in * 1000);

    return data.access_token;
  },

  // Get valid access token
  async getAccessToken(credentials) {
    if (credentials.access_token) {
      return credentials.access_token;
    }

    if (this.tokenCache.accessToken && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.accessToken;
    }

    return this.refreshAccessToken(credentials);
  },

  // Make authenticated request
  async request(credentials, endpoint, options = {}) {
    const accessToken = await this.getAccessToken(credentials);
    const url = `${XERO_PAYROLL_URL}${endpoint}`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Xero-tenant-id': credentials.tenant_id,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          await this.sleep(retryAfter * 1000);
          retries++;
          continue;
        }

        if (response.status === 401) {
          // Try to refresh token
          await this.refreshAccessToken(credentials);
          retries++;
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Xero API error: ${response.status} - ${errorText}`);
        }

        return response.json();
      } catch (error) {
        if (retries >= maxRetries - 1) throw error;
        retries++;
        await this.sleep(Math.pow(2, retries) * 1000);
      }
    }
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Test the connection
  async testConnection(credentials) {
    try {
      if (!credentials.access_token && !credentials.refresh_token) {
        return { success: false, error: 'OAuth authentication required' };
      }

      if (!credentials.tenant_id) {
        return { success: false, error: 'Tenant ID is required' };
      }

      await this.request(credentials, '/Employees');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync employees from Xero Payroll
  async syncEmployees(credentials, options = {}) {
    try {
      const response = await this.request(credentials, '/Employees');
      const employees = response.Employees || [];

      const transformedEmployees = [];
      const errors = [];

      for (const emp of employees) {
        try {
          transformedEmployees.push(this.transformEmployee(emp));
        } catch (error) {
          errors.push({ id: emp.EmployeeID, error: error.message });
        }
      }

      return {
        success: true,
        employees: transformedEmployees,
        errors,
        metadata: {
          total: employees.length,
          synced: transformedEmployees.length,
          failed: errors.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        employees: [],
        metadata: { total: 0, synced: 0, failed: 0 }
      };
    }
  },

  // Transform Xero employee to Uplift format
  transformEmployee(emp) {
    const homeAddress = emp.HomeAddress || {};

    return {
      external_id: String(emp.EmployeeID),
      email: emp.Email || null,
      first_name: emp.FirstName || '',
      last_name: emp.LastName || '',
      phone: emp.Phone || emp.Mobile || null,
      job_title: emp.JobTitle || emp.Classification || null,
      department: null, // Xero doesn't have departments
      location: homeAddress.City || null,
      start_date: emp.StartDate || null,
      employment_type: this.mapEmploymentType(emp.EmploymentType),
      hourly_rate: emp.OrdinaryEarningsRateID ? null : null, // Would need separate call
      is_active: emp.Status === 'ACTIVE',
      metadata: {
        xero_employee_id: emp.EmployeeID,
        payroll_calendar_id: emp.PayrollCalendarID,
        gender: emp.Gender,
        date_of_birth: emp.DateOfBirth,
        ni_number: emp.NationalInsuranceNumber,
        tax_code: emp.TaxCode,
        bank_account: emp.BankAccounts?.[0]?.AccountName
      }
    };
  },

  mapEmploymentType(type) {
    const typeMap = {
      'FULLTIME': 'full_time',
      'PARTTIME': 'part_time',
      'CASUAL': 'temporary',
      'CONTRACTOR': 'contractor',
      'LABOURHIRE': 'contractor'
    };
    return typeMap[type] || 'full_time';
  },

  // Sync pay runs (for costing data)
  async syncPayRuns(credentials, options = {}) {
    try {
      const response = await this.request(credentials, '/PayRuns');
      const payRuns = response.PayRuns || [];

      return {
        success: true,
        payRuns: payRuns.map(run => ({
          external_id: run.PayRunID,
          status: run.PayRunStatus,
          period_start: run.PayRunPeriodStartDate,
          period_end: run.PayRunPeriodEndDate,
          payment_date: run.PaymentDate,
          wages: run.Wages,
          deductions: run.Deductions,
          net_pay: run.NetPay
        })),
        metadata: { total: payRuns.length }
      };
    } catch (error) {
      return { success: false, error: error.message, payRuns: [] };
    }
  },

  // Get pay calendars
  async syncDepartments(credentials) {
    // Xero doesn't have departments, return empty
    return {
      success: true,
      departments: [],
      metadata: { total: 0, note: 'Xero does not support departments' }
    };
  },

  async syncLocations(credentials) {
    // Xero doesn't have locations, return empty
    return {
      success: true,
      locations: [],
      metadata: { total: 0, note: 'Xero does not support locations' }
    };
  },

  // Sync leave (time off)
  async syncTimeOff(credentials, options = {}) {
    try {
      const response = await this.request(credentials, '/LeaveApplications');
      const leaves = response.LeaveApplications || [];

      const requests = leaves.map(req => ({
        external_id: String(req.LeaveApplicationID),
        employee_external_id: String(req.EmployeeID),
        type: req.LeaveType?.Name || req.Title || 'Leave',
        start_date: req.StartDate,
        end_date: req.EndDate,
        status: this.mapLeaveStatus(req.Status),
        notes: req.Description
      }));

      return {
        success: true,
        timeOff: requests,
        metadata: { total: requests.length }
      };
    } catch (error) {
      return { success: false, error: error.message, timeOff: [] };
    }
  },

  mapLeaveStatus(status) {
    const statusMap = {
      'PENDING': 'pending',
      'APPROVED': 'approved',
      'REJECTED': 'rejected',
      'CANCELLED': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }
};
