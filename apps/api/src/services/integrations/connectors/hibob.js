// ============================================================
// HIBOB CONNECTOR
// Sync employees from HiBob HRIS
// ============================================================

const HIBOB_BASE_URL = 'https://api.hibob.com/v1';

export default {
  // Metadata
  id: 'hibob',
  name: 'HiBob',
  category: 'hris',
  description: 'Sync employees from HiBob',
  logo: '/logos/hibob.svg',

  // Auth configuration
  authType: 'api_key',
  authFields: [
    { key: 'api_key', label: 'Service User Token', type: 'password', required: true }
  ],

  // Get auth headers
  getAuthHeaders(credentials) {
    return {
      'Authorization': credentials.api_key,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  },

  // Make authenticated request with rate limiting
  async request(credentials, endpoint, options = {}) {
    const url = `${HIBOB_BASE_URL}${endpoint}`;
    const headers = this.getAuthHeaders(credentials);

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          await this.sleep(retryAfter * 1000);
          retries++;
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HiBob API error: ${response.status} - ${errorText}`);
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
      if (!credentials.api_key) {
        return { success: false, error: 'Service User Token is required' };
      }

      await this.request(credentials, '/people?showInactive=false');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync employees from HiBob
  async syncEmployees(credentials, options = {}) {
    try {
      const showInactive = options.includeInactive ? 'true' : 'false';
      const response = await this.request(credentials, `/people?showInactive=${showInactive}`);
      const employees = response.employees || [];

      const transformedEmployees = [];
      const errors = [];

      for (const emp of employees) {
        try {
          transformedEmployees.push(this.transformEmployee(emp));
        } catch (error) {
          errors.push({ id: emp.id, error: error.message });
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

  // Transform HiBob employee to Uplift format
  transformEmployee(emp) {
    const work = emp.work || {};
    const personal = emp.personal || {};
    const internal = emp.internal || {};

    return {
      external_id: String(emp.id),
      email: emp.email || null,
      first_name: emp.firstName || '',
      last_name: emp.surname || emp.lastName || '',
      phone: personal.mobile || personal.phone || null,
      job_title: work.title || null,
      department: work.department || null,
      location: work.site || work.siteId || null,
      start_date: work.startDate || null,
      employment_type: this.mapEmploymentType(work.employmentType),
      hourly_rate: null,
      is_active: internal.status === 'Active' || emp.status === 'Active',
      metadata: {
        hibob_id: emp.id,
        display_name: emp.displayName,
        avatar_url: emp.avatarUrl,
        manager_id: work.reportsTo?.id,
        manager_email: work.reportsTo?.email,
        team: work.team,
        tenure_years: work.tenureYears
      }
    };
  },

  mapEmploymentType(type) {
    const typeMap = {
      'Full-time': 'full_time',
      'Part-time': 'part_time',
      'Contractor': 'contractor',
      'Temporary': 'temporary',
      'Intern': 'intern',
      'Freelance': 'contractor'
    };
    return typeMap[type] || 'full_time';
  },

  // Sync departments
  async syncDepartments(credentials) {
    try {
      const response = await this.request(credentials, '/metadata/company/departments');
      const departments = (response.values || []).map(dept => ({
        external_id: String(dept.id || dept.name),
        name: dept.name,
        is_active: true
      }));

      return {
        success: true,
        departments,
        metadata: { total: departments.length }
      };
    } catch (error) {
      return { success: false, error: error.message, departments: [] };
    }
  },

  // Sync locations (sites)
  async syncLocations(credentials) {
    try {
      const response = await this.request(credentials, '/metadata/company/sites');
      const locations = (response.values || []).map(site => ({
        external_id: String(site.id || site.name),
        name: site.name,
        address: site.address,
        country: site.country,
        is_active: true
      }));

      return {
        success: true,
        locations,
        metadata: { total: locations.length }
      };
    } catch (error) {
      return { success: false, error: error.message, locations: [] };
    }
  },

  // Sync time off
  async syncTimeOff(credentials, options = {}) {
    try {
      const startDate = options.startDate || new Date().toISOString().split('T')[0];
      const endDate = options.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await this.request(
        credentials,
        `/timeoff/whosout?from=${startDate}&to=${endDate}`
      );

      const requests = (response.outs || []).map(req => ({
        external_id: String(req.id || `${req.employeeId}-${req.startDate}`),
        employee_external_id: String(req.employeeId),
        type: req.policyTypeDisplayName || 'Time Off',
        start_date: req.startDate,
        end_date: req.endDate,
        status: 'approved',
        notes: null
      }));

      return {
        success: true,
        timeOff: requests,
        metadata: { total: requests.length }
      };
    } catch (error) {
      return { success: false, error: error.message, timeOff: [] };
    }
  }
};
