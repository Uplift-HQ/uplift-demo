// ============================================================
// MICROSOFT TEAMS CONNECTOR
// Send notifications and messages via Microsoft Teams
// ============================================================

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

export default {
  // Metadata
  id: 'microsoft-teams',
  name: 'Microsoft Teams',
  category: 'comms',
  description: 'Send notifications and messages via Microsoft Teams',
  logo: '/logos/microsoft-teams.svg',

  // Auth configuration
  authType: 'oauth2',
  authFields: [
    { key: 'client_id', label: 'Application (Client) ID', type: 'text', required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    { key: 'tenant_id', label: 'Tenant ID', type: 'text', required: false, placeholder: 'common (for multi-tenant)' }
  ],

  oauth: {
    authUrl: MS_AUTH_URL,
    tokenUrl: MS_TOKEN_URL,
    scopes: [
      'User.Read.All',
      'ChannelMessage.Send',
      'Chat.ReadWrite',
      'Team.ReadBasic.All',
      'Channel.ReadBasic.All'
    ]
  },

  // Token cache
  tokenCache: {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  },

  // Build auth URL with tenant
  getTokenUrl(credentials) {
    const tenant = credentials.tenant_id || 'common';
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  },

  // Refresh access token
  async refreshAccessToken(credentials) {
    if (!credentials.refresh_token) {
      throw new Error('No refresh token available. Please re-authenticate with Microsoft.');
    }

    const response = await fetch(this.getTokenUrl(credentials), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        scope: this.oauth.scopes.join(' ')
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Microsoft access token');
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
    const url = `${GRAPH_API_BASE}${endpoint}`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
          throw new Error(`Microsoft Graph API error: ${response.status} - ${errorMsg}`);
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return { success: true };
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

      const response = await this.request(credentials, '/me');
      return {
        success: true,
        user: response.displayName,
        email: response.mail
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send a message to a channel
  async sendMessage(credentials, { teamId, channelId, content }) {
    try {
      const response = await this.request(
        credentials,
        `/teams/${teamId}/channels/${channelId}/messages`,
        {
          method: 'POST',
          body: {
            body: {
              contentType: 'html',
              content
            }
          }
        }
      );

      return {
        success: true,
        messageId: response.id
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send an Adaptive Card to a channel
  async sendAdaptiveCard(credentials, { teamId, channelId, card }) {
    try {
      const response = await this.request(
        credentials,
        `/teams/${teamId}/channels/${channelId}/messages`,
        {
          method: 'POST',
          body: {
            body: {
              contentType: 'html',
              content: '<attachment id="adaptiveCard"></attachment>'
            },
            attachments: [
              {
                id: 'adaptiveCard',
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: JSON.stringify(card)
              }
            ]
          }
        }
      );

      return {
        success: true,
        messageId: response.id
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send a shift reminder
  async sendShiftReminder(credentials, { teamId, channelId, userId, shift }) {
    try {
      const shiftDate = new Date(shift.start_time).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const startTime = new Date(shift.start_time).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const endTime = new Date(shift.end_time).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const card = {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            size: 'Large',
            weight: 'Bolder',
            text: '📅 Shift Reminder'
          },
          {
            type: 'FactSet',
            facts: [
              { title: 'Date', value: shiftDate },
              { title: 'Time', value: `${startTime} - ${endTime}` },
              { title: 'Location', value: shift.location?.name || 'Not specified' },
              { title: 'Role', value: shift.role || 'Standard' }
            ]
          }
        ]
      };

      return this.sendAdaptiveCard(credentials, { teamId, channelId, card });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send schedule update
  async sendScheduleUpdate(credentials, { teamId, channelId, schedule, message }) {
    try {
      let changesHtml = '';
      if (schedule.changes && schedule.changes.length > 0) {
        changesHtml = '<ul>' +
          schedule.changes.slice(0, 10).map(c => `<li><b>${c.employee}</b>: ${c.description}</li>`).join('') +
          '</ul>';
      }

      const content = `
        <h2>📋 Schedule Update</h2>
        <p>${message || 'The schedule has been updated.'}</p>
        ${changesHtml}
      `;

      return this.sendMessage(credentials, { teamId, channelId, content });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Post employee recognition
  async postRecognition(credentials, { teamId, channelId, employee, message, fromEmployee, points }) {
    try {
      const card = {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            size: 'Large',
            weight: 'Bolder',
            text: '🌟 Team Recognition'
          },
          {
            type: 'TextBlock',
            text: `**${employee.first_name} ${employee.last_name}** just received recognition!`,
            wrap: true
          },
          {
            type: 'Container',
            style: 'emphasis',
            items: [
              {
                type: 'TextBlock',
                text: message,
                wrap: true
              }
            ]
          },
          {
            type: 'TextBlock',
            text: `From: ${fromEmployee?.first_name} ${fromEmployee?.last_name}${points ? ` • +${points} points` : ''}`,
            size: 'Small',
            isSubtle: true
          }
        ]
      };

      return this.sendAdaptiveCard(credentials, { teamId, channelId, card });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // List teams
  async listTeams(credentials) {
    try {
      const response = await this.request(credentials, '/me/joinedTeams');

      return {
        success: true,
        teams: (response.value || []).map(team => ({
          id: team.id,
          name: team.displayName,
          description: team.description
        }))
      };
    } catch (error) {
      return { success: false, error: error.message, teams: [] };
    }
  },

  // List channels in a team
  async listChannels(credentials, teamId) {
    try {
      const response = await this.request(credentials, `/teams/${teamId}/channels`);

      return {
        success: true,
        channels: (response.value || []).map(ch => ({
          id: ch.id,
          name: ch.displayName,
          description: ch.description
        }))
      };
    } catch (error) {
      return { success: false, error: error.message, channels: [] };
    }
  },

  // Sync users from directory
  async syncEmployees(credentials, options = {}) {
    try {
      const allUsers = [];
      let nextLink = '/users?$top=100&$select=id,displayName,givenName,surname,mail,mobilePhone,jobTitle,department,officeLocation';

      while (nextLink) {
        const response = await this.request(credentials, nextLink);
        const users = response.value || [];
        allUsers.push(...users);
        nextLink = response['@odata.nextLink']?.replace(GRAPH_API_BASE, '') || null;

        if (allUsers.length > 10000) break;
      }

      const employees = allUsers
        .filter(u => u.mail) // Only users with email
        .map(user => ({
          external_id: user.id,
          email: user.mail,
          first_name: user.givenName || user.displayName?.split(' ')[0] || '',
          last_name: user.surname || user.displayName?.split(' ').slice(1).join(' ') || '',
          phone: user.mobilePhone || null,
          job_title: user.jobTitle || null,
          department: user.department || null,
          location: user.officeLocation || null,
          start_date: null,
          employment_type: 'full_time',
          hourly_rate: null,
          is_active: true,
          metadata: {
            ms_user_id: user.id,
            display_name: user.displayName
          }
        }));

      return {
        success: true,
        employees,
        errors: [],
        metadata: {
          total: employees.length,
          synced: employees.length,
          failed: 0
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
  }
};
