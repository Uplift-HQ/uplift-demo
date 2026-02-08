// ============================================================
// SAGE HR CONNECTOR
// Sync employees from Sage HR
// ============================================================

const SAGE_HR_BASE_URL = 'https://api.sage.hr/api/v1';

export default {
  // Metadata
  id: 'sage-hr',
  name: 'Sage HR',
  category: 'hris',
  description: 'Sync employees from Sage HR',
  logo: '/logos/sage-hr.svg',

  // Auth configuration
  authType: 'api_key',
  authFields: [
    { key: 'api_key', label: 'API Key', type: 'password', required: true }
  ],

  // Get auth headers
  getAuthHeaders(credentials) {
    return {
      'X-Auth-Token': credentials.api_key,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  },

  // Make authenticated request
  async request(credentials, endpoint, options = {}) {
    const url = `${SAGE_HR_BASE_URL}${endpoint}`;
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
          throw new Error(`Sage HR API error: ${response.status} - ${errorText}`);
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
        return { success: false, error: 'API Key is required' };
      }

      await this.request(credentials, '/employees');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync employees from Sage HR
  async syncEmployees(credentials, options = {}) {
    try {
      const allEmployees = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.request(credentials, `/employees?page=${page}`);
        const employees = response.data || response.employees || [];

        if (employees.length === 0) {
          hasMore = false;
        } else {
          allEmployees.push(...employees);
          page++;
        }

        // Safety limit
        if (allEmployees.length > 10000) break;
      }

      const transformedEmployees = [];
      const errors = [];

      for (const emp of allEmployees) {
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
          total: allEmployees.length,
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

  // Transform Sage HR employee to Uplift format
  transformEmployee(emp) {
    return {
      external_id: String(emp.id),
      email: emp.email || emp.work_email || null,
      first_name: emp.first_name || emp.firstName || '',
      last_name: emp.last_name || emp.lastName || '',
      phone: emp.mobile || emp.phone || null,
      job_title: emp.position || emp.job_title || null,
      department: emp.team?.name || emp.department || null,
      location: emp.location?.name || emp.office || null,
      start_date: emp.start_date || emp.employment_start_date || null,
      employment_type: this.mapEmploymentType(emp.employment_type),
      hourly_rate: emp.hourly_rate || null,
      is_active: emp.status === 'active' || emp.is_active === true,
      metadata: {
        sage_hr_id: emp.id,
        employee_number: emp.employee_number,
        reports_to: emp.reports_to?.id,
        gender: emp.gender,
        date_of_birth: emp.date_of_birth
      }
    };
  },

  mapEmploymentType(type) {
    const typeMap = {
      'full_time': 'full_time',
      'part_time': 'part_time',
      'contractor': 'contractor',
      'temporary': 'temporary',
      'intern': 'intern'
    };
    return typeMap[type] || 'full_time';
  },

  // Sync teams/departments
  async syncDepartments(credentials) {
    try {
      const response = await this.request(credentials, '/teams');
      const teams = response.data || response.teams || [];

      const departments = teams.map(team => ({
        external_id: String(team.id),
        name: team.name,
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

  // Sync locations
  async syncLocations(credentials) {
    try {
      const response = await this.request(credentials, '/locations');
      const locs = response.data || response.locations || [];

      const locations = locs.map(loc => ({
        external_id: String(loc.id),
        name: loc.name,
        address: loc.address,
        city: loc.city,
        country: loc.country,
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
        `/leave-requests?start_date=${startDate}&end_date=${endDate}&status=approved`
      );

      const requests = (response.data || []).map(req => ({
        external_id: String(req.id),
        employee_external_id: String(req.employee_id),
        type: req.leave_type?.name || 'Time Off',
        start_date: req.start_date,
        end_date: req.end_date,
        status: req.status || 'approved',
        notes: req.notes
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
