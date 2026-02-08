// ============================================================
// GENERIC REST API CONNECTOR
// Base connector for REST API integrations
// ============================================================

import { BaseConnector } from '../index.js';

export class GenericAPIConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.baseUrl = config.settings?.baseUrl;
    this.authType = config.settings?.authType || 'bearer'; // bearer, basic, api_key
    this.headers = config.settings?.headers || {};
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const headers = { ...this.headers };

    switch (this.authType) {
      case 'bearer':
        if (this.credentials.token) {
          headers['Authorization'] = `Bearer ${this.credentials.token}`;
        }
        break;
      case 'basic':
        if (this.credentials.username && this.credentials.password) {
          const auth = Buffer.from(
            `${this.credentials.username}:${this.credentials.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }
        break;
      case 'api_key':
        if (this.credentials.apiKey) {
          const keyHeader = this.config.settings?.apiKeyHeader || 'X-API-Key';
          headers[keyHeader] = this.credentials.apiKey;
        }
        break;
    }

    return headers;
  }

  /**
   * Make HTTP request to external API
   */
  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Test connection to the API
   */
  async testConnection() {
    try {
      const testEndpoint = this.config.settings?.testEndpoint || '/health';
      await this.request('GET', testEndpoint);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch data from the API
   */
  async fetchData(entityType, options = {}) {
    const endpoints = this.config.settings?.endpoints || {};
    const endpoint = endpoints[entityType];

    if (!endpoint) {
      throw new Error(`No endpoint configured for entity type: ${entityType}`);
    }

    let url = endpoint.path;
    const params = new URLSearchParams();

    if (options.since) {
      params.append(endpoint.sinceParam || 'updated_since', options.since.toISOString());
    }
    if (options.limit) {
      params.append(endpoint.limitParam || 'limit', options.limit);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await this.request('GET', url);

    // Extract data from response (handle different response structures)
    const dataPath = endpoint.dataPath || 'data';
    return this.extractData(response, dataPath);
  }

  /**
   * Push data to the API
   */
  async pushData(entityType, data, options = {}) {
    const endpoints = this.config.settings?.endpoints || {};
    const endpoint = endpoints[entityType];

    if (!endpoint || !endpoint.writePath) {
      throw new Error(`No write endpoint configured for entity type: ${entityType}`);
    }

    const method = options.method || endpoint.writeMethod || 'POST';
    return this.request(method, endpoint.writePath, data);
  }

  /**
   * Extract data from nested response object
   */
  extractData(response, path) {
    const parts = path.split('.');
    let data = response;

    for (const part of parts) {
      if (data && typeof data === 'object') {
        data = data[part];
      } else {
        return [];
      }
    }

    return Array.isArray(data) ? data : [data];
  }

  /**
   * Get available entity types
   */
  getEntityTypes() {
    return Object.keys(this.config.settings?.endpoints || {});
  }
}

export default GenericAPIConnector;
