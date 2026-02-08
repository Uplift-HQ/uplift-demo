// ============================================================
// BREATHE HR CONNECTOR
// Sync employees from Breathe HR
// ============================================================

const BREATHE_HR_BASE_URL = 'https://api.breathehr.com/v1';

export default {
  // Metadata
  id: 'breathe-hr',
  name: 'Breathe HR',
  category: 'hris',
  description: 'Sync employees from Breathe HR',
  logo: '/logos/breathe-hr.svg',

  // Auth configuration
  authType: 'api_key',
  authFields: [
    { key: 'api_key', label: 'API Key', type: 'password', required: true }
  ],

  // Get auth headers
  getAuthHeaders(credentials) {
    return {
      'X-API-KEY': credentials.api_key,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  },

  // Make authenticated request
  async request(credentials, endpoint, options = {}) {
    const url = `${BREATHE_HR_BASE_URL}${endpoint}`;
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
          throw new Error(`Breathe HR API error: ${response.status} - ${errorText}`);
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

  // Sync employees from Breathe HR
  async syncEmployees(credentials, options = {}) {
    try {
      const allEmployees = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.request(credentials, `/employees?page=${page}&per_page=100`);
        const employees = response.employees || response.data || [];

        if (employees.length === 0) {
          hasMore = false;
        } else {
          allEmployees.push(...employees);
          page++;
        }

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

  // Transform Breathe HR employee to Uplift format
  transformEmployee(emp) {
    return {
      external_id: String(emp.id),
      email: emp.email || emp.work_email || null,
      first_name: emp.first_name || emp.forename || '',
      last_name: emp.last_name || emp.surname || '',
      phone: emp.mobile || emp.telephone || null,
      job_title: emp.job_title || emp.position || null,
      department: emp.department?.name || emp.department || null,
      location: emp.location?.name || emp.office || null,
      start_date: emp.joining_date || emp.start_date || null,
      employment_type: this.mapEmploymentType(emp.employment_type),
      hourly_rate: emp.hourly_rate || null,
      is_active: emp.status === 'current' || emp.status === 'active',
      metadata: {
        breathe_hr_id: emp.id,
        employee_number: emp.employee_no || emp.employee_number,
        ni_number: emp.ni_number,
        reports_to_id: emp.reports_to?.id,
        dob: emp.dob || emp.date_of_birth
      }
    };
  },

  mapEmploymentType(type) {
    const typeMap = {
      'full-time': 'full_time',
      'full_time': 'full_time',
      'part-time': 'part_time',
      'part_time': 'part_time',
      'contractor': 'contractor',
      'contract': 'contractor',
      'temporary': 'temporary',
      'intern': 'intern'
    };
    return typeMap[type?.toLowerCase()] || 'full_time';
  },

  // Sync departments
  async syncDepartments(credentials) {
    try {
      const response = await this.request(credentials, '/departments');
      const depts = response.departments || response.data || [];

      const departments = depts.map(dept => ({
        external_id: String(dept.id),
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

  // Sync locations
  async syncLocations(credentials) {
    try {
      const response = await this.request(credentials, '/locations');
      const locs = response.locations || response.data || [];

      const locations = locs.map(loc => ({
        external_id: String(loc.id),
        name: loc.name,
        address: loc.address,
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

  // Sync time off / absences
  async syncTimeOff(credentials, options = {}) {
    try {
      const startDate = options.startDate || new Date().toISOString().split('T')[0];
      const endDate = options.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await this.request(
        credentials,
        `/absences?start_date=${startDate}&end_date=${endDate}`
      );

      const requests = (response.absences || response.data || []).map(req => ({
        external_id: String(req.id),
        employee_external_id: String(req.employee_id || req.employee?.id),
        type: req.absence_type?.name || req.type || 'Time Off',
        start_date: req.start_date,
        end_date: req.end_date,
        status: req.status || 'approved',
        notes: req.notes || req.reason
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
