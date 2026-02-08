// ============================================================
// SQUARE CONNECTOR
// Sync team members from Square
// ============================================================

const SQUARE_BASE_URL = 'https://connect.squareup.com/v2';
const SQUARE_AUTH_URL = 'https://connect.squareup.com/oauth2/authorize';
const SQUARE_TOKEN_URL = 'https://connect.squareup.com/oauth2/token';

export default {
  // Metadata
  id: 'square',
  name: 'Square',
  category: 'pos',
  description: 'Sync team members from Square POS',
  logo: '/logos/square.svg',

  // Auth configuration
  authType: 'oauth2',
  authFields: [
    { key: 'client_id', label: 'Application ID', type: 'text', required: true },
    { key: 'client_secret', label: 'Application Secret', type: 'password', required: true }
  ],

  oauth: {
    authUrl: SQUARE_AUTH_URL,
    tokenUrl: SQUARE_TOKEN_URL,
    scopes: ['EMPLOYEES_READ', 'EMPLOYEES_WRITE', 'MERCHANT_PROFILE_READ', 'TIMECARDS_READ']
  },

  // Token cache
  tokenCache: {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    merchantId: null
  },

  // Refresh access token
  async refreshAccessToken(credentials) {
    if (!credentials.refresh_token) {
      throw new Error('No refresh token available. Please re-authenticate with Square.');
    }

    const response = await fetch(SQUARE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Square access token');
    }

    const data = await response.json();

    this.tokenCache.accessToken = data.access_token;
    this.tokenCache.refreshToken = data.refresh_token;
    this.tokenCache.expiresAt = new Date(data.expires_at).getTime();
    this.tokenCache.merchantId = data.merchant_id;

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
    const url = `${SQUARE_BASE_URL}${endpoint}`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Square-Version': '2024-01-18',
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
          await this.refreshAccessToken(credentials);
          retries++;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = errorData.errors?.[0]?.detail || response.statusText;
          throw new Error(`Square API error: ${response.status} - ${errorMsg}`);
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

      await this.request(credentials, '/team-members/search', {
        method: 'POST',
        body: { limit: 1 }
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync team members from Square
  async syncEmployees(credentials, options = {}) {
    try {
      const allMembers = [];
      let cursor = null;

      do {
        const body = {
          limit: 200
        };
        if (cursor) body.cursor = cursor;

        const response = await this.request(credentials, '/team-members/search', {
          method: 'POST',
          body
        });

        const members = response.team_members || [];
        allMembers.push(...members);
        cursor = response.cursor;

        if (allMembers.length > 10000) break;
      } while (cursor);

      const transformedEmployees = [];
      const errors = [];

      for (const member of allMembers) {
        try {
          transformedEmployees.push(this.transformEmployee(member));
        } catch (error) {
          errors.push({ id: member.id, error: error.message });
        }
      }

      return {
        success: true,
        employees: transformedEmployees,
        errors,
        metadata: {
          total: allMembers.length,
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

  // Transform Square team member to Uplift format
  transformEmployee(member) {
    const assignedLocations = member.assigned_locations || {};

    return {
      external_id: String(member.id),
      email: member.email_address || null,
      first_name: member.given_name || '',
      last_name: member.family_name || '',
      phone: member.phone_number || null,
      job_title: null, // Square doesn't have job titles in basic team member data
      department: null,
      location: assignedLocations.location_ids?.[0] || null,
      start_date: member.created_at ? member.created_at.split('T')[0] : null,
      employment_type: this.mapEmploymentType(member.status),
      hourly_rate: member.wage_setting?.job_assignments?.[0]?.hourly_rate?.amount
        ? member.wage_setting.job_assignments[0].hourly_rate.amount / 100
        : null,
      is_active: member.status === 'ACTIVE',
      metadata: {
        square_id: member.id,
        reference_id: member.reference_id,
        is_owner: member.is_owner,
        location_ids: assignedLocations.location_ids,
        assignment_type: assignedLocations.assignment_type
      }
    };
  },

  mapEmploymentType(status) {
    // Square doesn't have employment types, just status
    return 'full_time';
  },

  // Sync locations
  async syncLocations(credentials) {
    try {
      const response = await this.request(credentials, '/locations');
      const locs = response.locations || [];

      const locations = locs.map(loc => ({
        external_id: String(loc.id),
        name: loc.name,
        address: loc.address?.address_line_1,
        city: loc.address?.locality,
        postcode: loc.address?.postal_code,
        country: loc.address?.country,
        timezone: loc.timezone,
        phone: loc.phone_number,
        is_active: loc.status === 'ACTIVE'
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

  // Square doesn't have departments
  async syncDepartments(credentials) {
    return {
      success: true,
      departments: [],
      metadata: { total: 0, note: 'Square does not support departments' }
    };
  },

  // Sync time off (not available in basic Square API)
  async syncTimeOff(credentials, options = {}) {
    return {
      success: true,
      timeOff: [],
      metadata: { total: 0, note: 'Square does not support time off in API' }
    };
  },

  // Sync timecards/labor data
  async syncTimecards(credentials, options = {}) {
    try {
      const startAt = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endAt = options.endDate || new Date().toISOString();

      const response = await this.request(credentials, '/labor/shifts/search', {
        method: 'POST',
        body: {
          query: {
            filter: {
              start: {
                start_at: startAt,
                end_at: endAt
              }
            }
          },
          limit: 200
        }
      });

      const shifts = (response.shifts || []).map(shift => ({
        external_id: shift.id,
        employee_external_id: shift.team_member_id,
        location_external_id: shift.location_id,
        start_at: shift.start_at,
        end_at: shift.end_at,
        status: shift.status,
        wage_amount: shift.wage?.hourly_rate?.amount ? shift.wage.hourly_rate.amount / 100 : null,
        breaks: shift.breaks?.map(b => ({
          start_at: b.start_at,
          end_at: b.end_at,
          is_paid: b.is_paid
        }))
      }));

      return {
        success: true,
        timecards: shifts,
        metadata: { total: shifts.length }
      };
    } catch (error) {
      return { success: false, error: error.message, timecards: [] };
    }
  }
};
