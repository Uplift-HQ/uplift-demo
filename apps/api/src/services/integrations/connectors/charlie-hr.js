// ============================================================
// CHARLIE HR CONNECTOR
// Sync employees from CharlieHR
// ============================================================

const CHARLIE_HR_BASE_URL = 'https://api.charliehr.com/v1';

export default {
  // Metadata
  id: 'charlie-hr',
  name: 'CharlieHR',
  category: 'hris',
  description: 'Sync employees from CharlieHR',
  logo: '/logos/charlie-hr.svg',

  // Auth configuration
  authType: 'api_key',
  authFields: [
    { key: 'api_key', label: 'API Key', type: 'password', required: true }
  ],

  // Get auth headers
  getAuthHeaders(credentials) {
    return {
      'Authorization': `Bearer ${credentials.api_key}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  },

  // Make authenticated request
  async request(credentials, endpoint, options = {}) {
    const url = `${CHARLIE_HR_BASE_URL}${endpoint}`;
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
          throw new Error(`CharlieHR API error: ${response.status} - ${errorText}`);
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

      await this.request(credentials, '/team_members');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync employees (team members) from CharlieHR
  async syncEmployees(credentials, options = {}) {
    try {
      const allEmployees = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.request(credentials, `/team_members?page=${page}`);
        const members = response.team_members || response.data || [];

        if (members.length === 0) {
          hasMore = false;
        } else {
          allEmployees.push(...members);
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

  // Transform CharlieHR team member to Uplift format
  transformEmployee(emp) {
    return {
      external_id: String(emp.id),
      email: emp.email || emp.work_email || null,
      first_name: emp.first_name || emp.preferred_name || '',
      last_name: emp.last_name || '',
      phone: emp.phone_number || emp.mobile || null,
      job_title: emp.job_title || emp.role || null,
      department: emp.team?.name || emp.department || null,
      location: emp.office?.name || emp.location || null,
      start_date: emp.start_date || emp.employment_start_date || null,
      employment_type: this.mapEmploymentType(emp.employment_type),
      hourly_rate: emp.salary?.hourly_rate || null,
      is_active: emp.status === 'active' || emp.employment_status === 'employed',
      metadata: {
        charlie_hr_id: emp.id,
        preferred_name: emp.preferred_name,
        pronouns: emp.pronouns,
        manager_id: emp.manager?.id,
        profile_picture_url: emp.profile_picture_url
      }
    };
  },

  mapEmploymentType(type) {
    const typeMap = {
      'full_time': 'full_time',
      'full-time': 'full_time',
      'part_time': 'part_time',
      'part-time': 'part_time',
      'contractor': 'contractor',
      'contract': 'contractor',
      'temporary': 'temporary',
      'intern': 'intern',
      'internship': 'intern'
    };
    return typeMap[type?.toLowerCase()] || 'full_time';
  },

  // Sync teams/departments
  async syncDepartments(credentials) {
    try {
      const response = await this.request(credentials, '/teams');
      const teams = response.teams || response.data || [];

      const departments = teams.map(team => ({
        external_id: String(team.id),
        name: team.name,
        description: team.description,
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

  // Sync locations/offices
  async syncLocations(credentials) {
    try {
      const response = await this.request(credentials, '/offices');
      const offices = response.offices || response.data || [];

      const locations = offices.map(office => ({
        external_id: String(office.id),
        name: office.name,
        address: office.address,
        city: office.city,
        country: office.country,
        timezone: office.timezone,
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
        `/time_off?start_date=${startDate}&end_date=${endDate}`
      );

      const requests = (response.time_off || response.data || []).map(req => ({
        external_id: String(req.id),
        employee_external_id: String(req.team_member_id || req.employee_id),
        type: req.time_off_type?.name || req.policy_name || 'Time Off',
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
