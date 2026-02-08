// ============================================================
// PERSONIO CONNECTOR
// Sync employees from Personio HRIS
// ============================================================

const PERSONIO_BASE_URL = 'https://api.personio.de/v1';
const PERSONIO_AUTH_URL = 'https://api.personio.de/v1/auth';

export default {
  // Metadata
  id: 'personio',
  name: 'Personio',
  category: 'hris',
  description: 'Sync employees from Personio',
  logo: '/logos/personio.svg',

  // Auth configuration
  authType: 'oauth2',
  authFields: [
    { key: 'client_id', label: 'Client ID', type: 'text', required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true }
  ],

  oauth: {
    tokenUrl: PERSONIO_AUTH_URL,
    grantType: 'client_credentials'
  },

  // Token cache
  tokenCache: {
    token: null,
    expiresAt: null
  },

  // Get access token
  async getAccessToken(credentials) {
    // Check if cached token is still valid
    if (this.tokenCache.token && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const response = await fetch(PERSONIO_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Personio auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Cache token (expires in 5 minutes typically, cache for 4)
    this.tokenCache.token = data.data.token;
    this.tokenCache.expiresAt = Date.now() + (4 * 60 * 1000);

    return data.data.token;
  },

  // Make authenticated request
  async request(credentials, endpoint, options = {}) {
    const token = await this.getAccessToken(credentials);
    const url = `${PERSONIO_BASE_URL}${endpoint}`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
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
          // Token expired, clear cache and retry
          this.tokenCache.token = null;
          this.tokenCache.expiresAt = null;
          retries++;
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Personio API error: ${response.status} - ${errorText}`);
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
      if (!credentials.client_id || !credentials.client_secret) {
        return { success: false, error: 'Client ID and Client Secret are required' };
      }

      await this.getAccessToken(credentials);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync employees from Personio
  async syncEmployees(credentials, options = {}) {
    try {
      const allEmployees = [];
      let offset = 0;
      const limit = 200;
      let hasMore = true;

      // Handle pagination
      while (hasMore) {
        const response = await this.request(
          credentials,
          `/company/employees?limit=${limit}&offset=${offset}`
        );

        const employees = response.data || [];
        allEmployees.push(...employees);

        hasMore = employees.length === limit;
        offset += limit;

        // Safety limit
        if (allEmployees.length > 10000) break;
      }

      const transformedEmployees = [];
      const errors = [];

      for (const emp of allEmployees) {
        try {
          transformedEmployees.push(this.transformEmployee(emp));
        } catch (error) {
          errors.push({ id: emp.attributes?.id?.value, error: error.message });
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

  // Transform Personio employee to Uplift format
  transformEmployee(emp) {
    const attr = emp.attributes || {};

    const getValue = (field) => {
      return attr[field]?.value || null;
    };

    return {
      external_id: String(getValue('id')),
      email: getValue('email'),
      first_name: getValue('first_name') || '',
      last_name: getValue('last_name') || '',
      phone: getValue('phone') || getValue('mobile_phone'),
      job_title: getValue('position'),
      department: attr.department?.value?.attributes?.name || null,
      location: attr.office?.value?.attributes?.name || null,
      start_date: getValue('hire_date'),
      employment_type: this.mapEmploymentType(getValue('employment_type')),
      hourly_rate: getValue('hourly_salary'),
      is_active: getValue('status') === 'active',
      metadata: {
        personio_id: getValue('id'),
        employee_number: getValue('employee_number'),
        gender: getValue('gender'),
        probation_end: getValue('probation_period_end'),
        team: attr.team?.value?.attributes?.name,
        supervisor_id: attr.supervisor?.value?.attributes?.id?.value
      }
    };
  },

  mapEmploymentType(type) {
    const typeMap = {
      'full-time': 'full_time',
      'part-time': 'part_time',
      'contractor': 'contractor',
      'intern': 'intern',
      'freelance': 'contractor'
    };
    return typeMap[type?.toLowerCase()] || 'full_time';
  },

  // Sync departments
  async syncDepartments(credentials) {
    try {
      const response = await this.request(credentials, '/company/departments');
      const departments = (response.data || []).map(dept => ({
        external_id: String(dept.attributes?.id || dept.id),
        name: dept.attributes?.name || dept.name,
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

  // Sync locations (offices)
  async syncLocations(credentials) {
    try {
      const response = await this.request(credentials, '/company/offices');
      const locations = (response.data || []).map(office => ({
        external_id: String(office.attributes?.id || office.id),
        name: office.attributes?.name || office.name,
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
        `/company/time-offs?start_date=${startDate}&end_date=${endDate}`
      );

      const requests = (response.data || []).map(req => ({
        external_id: String(req.attributes?.id),
        employee_external_id: String(req.attributes?.employee?.value?.attributes?.id?.value),
        type: req.attributes?.time_off_type?.value?.attributes?.name || 'Time Off',
        start_date: req.attributes?.start_date,
        end_date: req.attributes?.end_date,
        status: req.attributes?.status || 'approved',
        notes: req.attributes?.comment
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
