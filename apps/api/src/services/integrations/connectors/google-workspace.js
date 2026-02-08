// ============================================================
// GOOGLE WORKSPACE CONNECTOR
// SSO and directory sync from Google Workspace
// ============================================================

const GOOGLE_API_BASE = 'https://admin.googleapis.com/admin/directory/v1';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export default {
  // Metadata
  id: 'google-workspace',
  name: 'Google Workspace',
  category: 'identity',
  description: 'SSO and directory sync from Google Workspace',
  logo: '/logos/google-workspace.svg',

  // Auth configuration
  authType: 'oauth2',
  authFields: [
    { key: 'client_id', label: 'Client ID', type: 'text', required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    { key: 'domain', label: 'Domain', type: 'text', required: true, placeholder: 'yourcompany.com' }
  ],

  oauth: {
    authUrl: GOOGLE_AUTH_URL,
    tokenUrl: GOOGLE_TOKEN_URL,
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.directory.group.readonly',
      'https://www.googleapis.com/auth/admin.directory.orgunit.readonly'
    ]
  },

  // Token cache
  tokenCache: {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  },

  // Refresh access token
  async refreshAccessToken(credentials) {
    if (!credentials.refresh_token) {
      throw new Error('No refresh token available. Please re-authenticate with Google.');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google access token');
    }

    const data = await response.json();

    this.tokenCache.accessToken = data.access_token;
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
    const url = `${GOOGLE_API_BASE}${endpoint}`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || response.statusText;
          throw new Error(`Google API error: ${response.status} - ${errorMsg}`);
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

      if (!credentials.domain) {
        return { success: false, error: 'Domain is required' };
      }

      // Try to list a single user to verify access
      await this.request(credentials, `/users?domain=${credentials.domain}&maxResults=1`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sync employees (users) from Google Workspace
  async syncEmployees(credentials, options = {}) {
    try {
      const allUsers = [];
      let pageToken = null;

      do {
        let endpoint = `/users?domain=${credentials.domain}&maxResults=200`;
        if (pageToken) endpoint += `&pageToken=${pageToken}`;
        if (options.query) endpoint += `&query=${encodeURIComponent(options.query)}`;

        const response = await this.request(credentials, endpoint);
        const users = response.users || [];
        allUsers.push(...users);
        pageToken = response.nextPageToken;

        if (allUsers.length > 10000) break;
      } while (pageToken);

      const transformedEmployees = [];
      const errors = [];

      for (const user of allUsers) {
        try {
          transformedEmployees.push(this.transformEmployee(user));
        } catch (error) {
          errors.push({ id: user.id, error: error.message });
        }
      }

      return {
        success: true,
        employees: transformedEmployees,
        errors,
        metadata: {
          total: allUsers.length,
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

  // Transform Google Workspace user to Uplift format
  transformEmployee(user) {
    const primaryEmail = user.primaryEmail;
    const name = user.name || {};
    const phones = user.phones || [];
    const organizations = user.organizations || [];
    const locations = user.locations || [];

    // Get primary phone
    const primaryPhone = phones.find(p => p.primary)?.value || phones[0]?.value || null;

    // Get primary organization info
    const primaryOrg = organizations.find(o => o.primary) || organizations[0] || {};

    // Get primary location
    const primaryLocation = locations.find(l => l.primary) || locations[0] || {};

    return {
      external_id: user.id,
      email: primaryEmail,
      first_name: name.givenName || '',
      last_name: name.familyName || '',
      phone: primaryPhone,
      job_title: primaryOrg.title || null,
      department: primaryOrg.department || null,
      location: primaryLocation.buildingId || primaryLocation.area || null,
      start_date: user.creationTime ? user.creationTime.split('T')[0] : null,
      employment_type: 'full_time',
      hourly_rate: null,
      is_active: !user.suspended && !user.archived,
      metadata: {
        google_id: user.id,
        org_unit_path: user.orgUnitPath,
        is_admin: user.isAdmin,
        is_delegated_admin: user.isDelegatedAdmin,
        last_login: user.lastLoginTime,
        creation_time: user.creationTime,
        thumbnail_photo_url: user.thumbnailPhotoUrl,
        custom_schemas: user.customSchemas,
        manager_email: primaryOrg.managerEmail
      }
    };
  },

  // Sync groups (can be used for departments)
  async syncDepartments(credentials) {
    try {
      const allGroups = [];
      let pageToken = null;

      do {
        let endpoint = `/groups?domain=${credentials.domain}&maxResults=200`;
        if (pageToken) endpoint += `&pageToken=${pageToken}`;

        const response = await this.request(credentials, endpoint);
        const groups = response.groups || [];
        allGroups.push(...groups);
        pageToken = response.nextPageToken;

        if (allGroups.length > 1000) break;
      } while (pageToken);

      const departments = allGroups.map(group => ({
        external_id: group.id,
        name: group.name,
        email: group.email,
        description: group.description,
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

  // Sync organizational units (can be used for locations/departments)
  async syncLocations(credentials) {
    try {
      const response = await this.request(
        credentials,
        `/customer/my_customer/orgunits?type=all`
      );

      const orgUnits = response.organizationUnits || [];

      const locations = orgUnits.map(ou => ({
        external_id: ou.orgUnitId,
        name: ou.name,
        path: ou.orgUnitPath,
        parent_path: ou.parentOrgUnitPath,
        description: ou.description,
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

  // Get group members
  async getGroupMembers(credentials, groupId) {
    try {
      const allMembers = [];
      let pageToken = null;

      do {
        let endpoint = `/groups/${groupId}/members?maxResults=200`;
        if (pageToken) endpoint += `&pageToken=${pageToken}`;

        const response = await this.request(credentials, endpoint);
        const members = response.members || [];
        allMembers.push(...members);
        pageToken = response.nextPageToken;
      } while (pageToken);

      return {
        success: true,
        members: allMembers.map(m => ({
          id: m.id,
          email: m.email,
          role: m.role,
          type: m.type,
          status: m.status
        }))
      };
    } catch (error) {
      return { success: false, error: error.message, members: [] };
    }
  },

  // Google Workspace doesn't have time off
  async syncTimeOff(credentials, options = {}) {
    return {
      success: true,
      timeOff: [],
      metadata: {
        total: 0,
        note: 'Google Workspace does not provide time off data. Use Calendar API for out-of-office events.'
      }
    };
  }
};
