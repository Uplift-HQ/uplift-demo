// ============================================================
// BAMBOOHR CONNECTOR
// Sync employees from BambooHR HRIS
// ============================================================

const BAMBOO_API_VERSION = 'v1';

export default {
  // Metadata
  id: 'bamboohr',
  name: 'BambooHR',
  category: 'hris',
  description: 'Sync employees from BambooHR',
  logo: '/logos/bamboohr.svg',

  // Auth configuration
  authType: 'api_key',
  authFields: [
    { key: 'api_key', label: 'API Key', type: 'password', required: true },
    { key: 'subdomain', label: 'Subdomain', type: 'text', required: true, placeholder: 'yourcompany' }
  ],

  // Build base URL
  getBaseUrl(credentials) {
    return `https://api.bamboohr.com/api/gateway.php/${credentials.subdomain}/${BAMBOO_API_VERSION}`;
  },

  // Get auth headers (Basic auth with API key as username, 'x' as password)
  getAuthHeaders(credentials) {
    const auth = Buffer.from(`${credentials.api_key}:x`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  },

  // Make authenticated request with rate limiting and retry
  async request(credentials, endpoint, options = {}) {
    const url = `${this.getBaseUrl(credentials)}${endpoint}`;
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

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          await this.sleep(retryAfter * 1000);
          retries++;
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`BambooHR API error: ${response.status} - ${errorText}`);
        }

        return response.json();
      } catch (error) {
        if (retries >= maxRetries - 1) throw error;
        retries++;
        await this.sleep(Math.pow(2, retries) * 1000); // Exponential backoff
      }
    }
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Test the connection
  async testConnection(credentials) {
    try {
      if (!credentials.api_key || !credentials.subdomain) {
        return { success: false, error: 'API key and subdomain are required' };
      }

      // Try to fetch company info to verify credentials
      await this.request(credentials, '/employees/directory');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync employees from BambooHR
  async syncEmployees(credentials, options = {}) {
    try {
      // Fetch employee directory
      const directory = await this.request(credentials, '/employees/directory');
      const employees = directory.employees || [];

      // Transform all employees
      const transformedEmployees = [];
      const errors = [];

      for (const emp of employees) {
        try {
          // Optionally fetch detailed info for each employee
          let detailedEmp = emp;
          if (options.fetchDetails) {
            try {
              detailedEmp = await this.request(
                credentials,
                `/employees/${emp.id}?fields=firstName,lastName,workEmail,mobilePhone,jobTitle,department,location,hireDate,employmentHistoryStatus,workPhone,homeEmail`
              );
            } catch (e) {
              // Use directory data if detail fetch fails
              console.warn(`Could not fetch details for employee ${emp.id}: ${e.message}`);
            }
          }

          transformedEmployees.push(this.transformEmployee(detailedEmp));
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

  // Transform BambooHR employee to Uplift format
  transformEmployee(emp) {
    return {
      external_id: String(emp.id),
      email: emp.workEmail || emp.email || null,
      first_name: emp.firstName || '',
      last_name: emp.lastName || '',
      phone: emp.mobilePhone || emp.workPhone || null,
      job_title: emp.jobTitle || null,
      department: emp.department || null,
      location: emp.location || null,
      start_date: emp.hireDate || null,
      employment_type: this.mapEmploymentType(emp.employmentHistoryStatus),
      hourly_rate: null, // BambooHR doesn't expose this in basic API
      is_active: emp.employmentHistoryStatus === 'Active' || emp.status === 'Active',
      metadata: {
        bamboohr_id: emp.id,
        display_name: emp.displayName,
        photo_url: emp.photoUrl,
        work_phone: emp.workPhone,
        home_email: emp.homeEmail
      }
    };
  },

  mapEmploymentType(status) {
    const typeMap = {
      'Full-Time': 'full_time',
      'Part-Time': 'part_time',
      'Contractor': 'contractor',
      'Temporary': 'temporary',
      'Intern': 'intern'
    };
    return typeMap[status] || 'full_time';
  },

  // Sync departments
  async syncDepartments(credentials) {
    try {
      const meta = await this.request(credentials, '/meta/lists');
      const deptList = meta.find(list => list.fieldId === 'department');

      if (!deptList) {
        return { success: true, departments: [], metadata: { total: 0 } };
      }

      const departments = (deptList.options || []).map(opt => ({
        external_id: String(opt.id),
        name: opt.name,
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
      const meta = await this.request(credentials, '/meta/lists');
      const locationList = meta.find(list => list.fieldId === 'location');

      if (!locationList) {
        return { success: true, locations: [], metadata: { total: 0 } };
      }

      const locations = (locationList.options || []).map(opt => ({
        external_id: String(opt.id),
        name: opt.name,
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

  // Sync time off requests
  async syncTimeOff(credentials, options = {}) {
    try {
      const startDate = options.startDate || new Date().toISOString().split('T')[0];
      const endDate = options.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const timeOff = await this.request(
        credentials,
        `/time_off/requests?start=${startDate}&end=${endDate}&status=approved`
      );

      const requests = (timeOff || []).map(req => ({
        external_id: String(req.id),
        employee_external_id: String(req.employeeId),
        type: req.type?.name || 'Time Off',
        start_date: req.start,
        end_date: req.end,
        status: req.status?.status || 'approved',
        notes: req.notes || null
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
