// ============================================================
// WHATSAPP BUSINESS CONNECTOR
// Send notifications to frontline workers via WhatsApp
// ============================================================

const WHATSAPP_API_VERSION = 'v18.0';

export default {
  // Metadata
  id: 'whatsapp-business',
  name: 'WhatsApp Business',
  category: 'comms',
  description: 'Send notifications to frontline workers via WhatsApp',
  logo: '/logos/whatsapp.svg',

  // Auth configuration
  authType: 'api_key',
  authFields: [
    { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true },
    { key: 'business_account_id', label: 'Business Account ID', type: 'text', required: true }
  ],

  // Build base URL
  getBaseUrl(credentials) {
    return `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${credentials.phone_number_id}`;
  },

  // Make authenticated request
  async request(credentials, endpoint, options = {}) {
    const url = `${this.getBaseUrl(credentials)}${endpoint}`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          method: options.method || 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.access_token}`,
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

        const data = await response.json();

        if (data.error) {
          throw new Error(`WhatsApp API error: ${data.error.message}`);
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
      if (!credentials.access_token || !credentials.phone_number_id) {
        return { success: false, error: 'Access token and Phone Number ID are required' };
      }

      // Try to get phone number info
      const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${credentials.phone_number_id}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      const data = await response.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return {
        success: true,
        phoneNumber: data.display_phone_number,
        verifiedName: data.verified_name
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send a template message
  async sendMessage(credentials, { to, template, language = 'en', parameters = [] }) {
    try {
      // Format phone number (remove spaces, dashes, ensure country code)
      const formattedPhone = this.formatPhoneNumber(to);

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: template,
          language: {
            code: language
          }
        }
      };

      // Add parameters if provided
      if (parameters.length > 0) {
        body.template.components = [
          {
            type: 'body',
            parameters: parameters.map(p => ({
              type: 'text',
              text: String(p)
            }))
          }
        ];
      }

      const response = await this.request(credentials, '/messages', {
        method: 'POST',
        body
      });

      return {
        success: true,
        messageId: response.messages?.[0]?.id,
        status: response.messages?.[0]?.message_status
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send a shift reminder
  async sendShiftReminder(credentials, { phoneNumber, shift, template = 'shift_reminder' }) {
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

      const parameters = [
        shift.employee?.first_name || 'Team member',
        shiftDate,
        startTime,
        endTime,
        shift.location?.name || 'your location'
      ];

      return this.sendMessage(credentials, {
        to: phoneNumber,
        template,
        parameters
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send a schedule update notification
  async sendScheduleUpdate(credentials, { phoneNumber, message, template = 'schedule_update' }) {
    try {
      return this.sendMessage(credentials, {
        to: phoneNumber,
        template,
        parameters: [message]
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send a text message (requires 24-hour window from last user message)
  async sendTextMessage(credentials, { to, text }) {
    try {
      const formattedPhone = this.formatPhoneNumber(to);

      const response = await this.request(credentials, '/messages', {
        method: 'POST',
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
        }
      });

      return {
        success: true,
        messageId: response.messages?.[0]?.id
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Send an interactive button message
  async sendInteractiveMessage(credentials, { to, body, buttons }) {
    try {
      const formattedPhone = this.formatPhoneNumber(to);

      const response = await this.request(credentials, '/messages', {
        method: 'POST',
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: body
            },
            action: {
              buttons: buttons.slice(0, 3).map((btn, i) => ({
                type: 'reply',
                reply: {
                  id: btn.id || `btn_${i}`,
                  title: btn.title.substring(0, 20) // Max 20 chars
                }
              }))
            }
          }
        }
      });

      return {
        success: true,
        messageId: response.messages?.[0]?.id
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Format phone number to E.164 format
  formatPhoneNumber(phone) {
    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 0, assume UK and replace with +44
    if (cleaned.startsWith('0')) {
      cleaned = '+44' + cleaned.substring(1);
    }

    // If doesn't start with +, assume it needs one
    if (!cleaned.startsWith('+')) {
      // If it's a UK number (starts with 44)
      if (cleaned.startsWith('44')) {
        cleaned = '+' + cleaned;
      } else {
        // Assume UK if 10-11 digits
        cleaned = '+44' + cleaned;
      }
    }

    return cleaned;
  },

  // Get message templates
  async getTemplates(credentials) {
    try {
      const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${credentials.business_account_id}/message_templates`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        success: true,
        templates: (data.data || []).map(t => ({
          name: t.name,
          status: t.status,
          category: t.category,
          language: t.language,
          components: t.components
        }))
      };
    } catch (error) {
      return { success: false, error: error.message, templates: [] };
    }
  },

  // WhatsApp doesn't sync employees - this is a comms connector only
  async syncEmployees(credentials, options = {}) {
    return {
      success: true,
      employees: [],
      errors: [],
      metadata: {
        total: 0,
        synced: 0,
        failed: 0,
        note: 'WhatsApp Business is a communications connector and does not sync employee data'
      }
    };
  }
};
