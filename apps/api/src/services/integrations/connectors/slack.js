// ============================================================
// SLACK CONNECTOR
// Send notifications and messages via Slack
// ============================================================

const SLACK_API_BASE = 'https://slack.com/api';
const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

export default {
  // Metadata
  id: 'slack',
  name: 'Slack',
  category: 'comms',
  description: 'Send notifications and messages via Slack',
  logo: '/logos/slack.svg',

  // Auth configuration
  authType: 'oauth2',
  authFields: [
    { key: 'client_id', label: 'Client ID', type: 'text', required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true }
  ],

  oauth: {
    authUrl: SLACK_AUTH_URL,
    tokenUrl: SLACK_TOKEN_URL,
    scopes: ['chat:write', 'chat:write.public', 'channels:read', 'users:read', 'users:read.email']
  },

  // Make authenticated request
  async request(credentials, endpoint, options = {}) {
    const url = `${SLACK_API_BASE}${endpoint}`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const headers = {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json; charset=utf-8'
        };

        const response = await fetch(url, {
          method: options.method || 'POST',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          await this.sleep(retryAfter * 1000);
          retries++;
          continue;
        }

        const data = await response.json();

        if (!data.ok) {
          throw new Error(`Slack API error: ${data.error}`);
        }

        return data;
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
      if (!credentials.access_token) {
        return { success: false, error: 'OAuth authentication required' };
      }

      const response = await this.request(credentials, '/auth.test', { method: 'POST', body: {} });
      return {
        success: true,
        team: response.team,
        user: response.user
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send a message to a channel
  async sendMessage(credentials, { channel, text, blocks, attachments, thread_ts }) {
    try {
      const body = {
        channel,
        text
      };

      if (blocks) body.blocks = blocks;
      if (attachments) body.attachments = attachments;
      if (thread_ts) body.thread_ts = thread_ts;

      const response = await this.request(credentials, '/chat.postMessage', {
        method: 'POST',
        body
      });

      return {
        success: true,
        messageId: response.ts,
        channel: response.channel
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send a shift reminder to a user
  async sendShiftReminder(credentials, { userId, slackUserId, shift }) {
    try {
      // If we have a Slack user ID, send DM
      // Otherwise, we need to look up the user by email first
      let targetChannel = slackUserId;

      if (!targetChannel && shift.employee?.email) {
        const userLookup = await this.request(credentials, '/users.lookupByEmail', {
          method: 'POST',
          body: { email: shift.employee.email }
        });
        targetChannel = userLookup.user?.id;
      }

      if (!targetChannel) {
        throw new Error('Could not find Slack user for shift reminder');
      }

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

      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📅 Shift Reminder',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Date:*\n${shiftDate}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${startTime} - ${endTime}`
            },
            {
              type: 'mrkdwn',
              text: `*Location:*\n${shift.location?.name || 'Not specified'}`
            },
            {
              type: 'mrkdwn',
              text: `*Role:*\n${shift.role || 'Standard'}`
            }
          ]
        }
      ];

      return this.sendMessage(credentials, {
        channel: targetChannel,
        text: `Reminder: You have a shift on ${shiftDate} from ${startTime} to ${endTime}`,
        blocks
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send schedule update to a channel
  async sendScheduleUpdate(credentials, { channel, schedule, message }) {
    try {
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 Schedule Update',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message || 'The schedule has been updated.'
          }
        }
      ];

      if (schedule.changes && schedule.changes.length > 0) {
        const changesText = schedule.changes
          .slice(0, 10)
          .map(c => `• ${c.employee}: ${c.description}`)
          .join('\n');

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Changes:*\n${changesText}`
          }
        });
      }

      return this.sendMessage(credentials, {
        channel,
        text: message || 'Schedule has been updated',
        blocks
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Post employee recognition
  async postRecognition(credentials, { channel, employee, message, fromEmployee, points }) {
    try {
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🌟 Team Recognition',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${employee.first_name} ${employee.last_name}* just received recognition!`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `> ${message}`
          }
        }
      ];

      if (fromEmployee) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `From: ${fromEmployee.first_name} ${fromEmployee.last_name}${points ? ` • +${points} points` : ''}`
            }
          ]
        });
      }

      return this.sendMessage(credentials, {
        channel,
        text: `${employee.first_name} received recognition: ${message}`,
        blocks
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // List channels
  async listChannels(credentials) {
    try {
      const response = await this.request(credentials, '/conversations.list', {
        method: 'POST',
        body: {
          types: 'public_channel,private_channel',
          limit: 200
        }
      });

      return {
        success: true,
        channels: response.channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          is_private: ch.is_private,
          num_members: ch.num_members
        }))
      };
    } catch (error) {
      return { success: false, error: error.message, channels: [] };
    }
  },

  // List users
  async listUsers(credentials) {
    try {
      const response = await this.request(credentials, '/users.list', {
        method: 'POST',
        body: { limit: 200 }
      });

      return {
        success: true,
        users: response.members
          .filter(u => !u.is_bot && !u.deleted)
          .map(u => ({
            id: u.id,
            email: u.profile?.email,
            name: u.real_name || u.name,
            display_name: u.profile?.display_name
          }))
      };
    } catch (error) {
      return { success: false, error: error.message, users: [] };
    }
  },

  // Sync employees - maps Slack users to potential employees
  async syncEmployees(credentials, options = {}) {
    const usersResult = await this.listUsers(credentials);

    if (!usersResult.success) {
      return {
        success: false,
        error: usersResult.error,
        employees: [],
        metadata: { total: 0, synced: 0, failed: 0 }
      };
    }

    const employees = usersResult.users.map(user => ({
      external_id: user.id,
      email: user.email,
      first_name: user.name?.split(' ')[0] || '',
      last_name: user.name?.split(' ').slice(1).join(' ') || '',
      phone: null,
      job_title: null,
      department: null,
      location: null,
      start_date: null,
      employment_type: 'full_time',
      hourly_rate: null,
      is_active: true,
      metadata: {
        slack_user_id: user.id,
        display_name: user.display_name
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
  }
};
