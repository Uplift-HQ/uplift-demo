// ============================================================
// API CLIENT
// Centralized HTTP client with Bearer token auth
// Production-ready: No demo data fallbacks
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('uplift_token');
    this.refreshToken = localStorage.getItem('uplift_refresh_token');
    this._refreshPromise = null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('uplift_token', token);
    } else {
      localStorage.removeItem('uplift_token');
    }
  }

  setRefreshToken(token) {
    this.refreshToken = token;
    if (token) {
      localStorage.setItem('uplift_refresh_token', token);
    } else {
      localStorage.removeItem('uplift_refresh_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('uplift_token');
  }

  getCsrfToken() {
    const match = document.cookie.match(/csrfToken=([^;]+)/);
    return match ? match[1] : null;
  }

  async request(method, path, data, options = {}) {
    const url = `${API_URL}${path}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
      credentials: 'include',
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    try {
      let response = await fetch(url, config);

      // Token refresh on 401
      if (response.status === 401 && this.refreshToken && !options._isRetry) {
        const refreshed = await this._tryRefresh();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          config.headers = headers;
          response = await fetch(url, { ...config });
        }
      }

      if (response.status === 401) {
        this.setToken(null);
        this.setRefreshToken(null);
        localStorage.removeItem('uplift_user');
        const error = new Error('Session expired');
        error.status = 401;
        throw error;
      }

      return this.handleResponse(response);
    } catch (error) {
      if (error.status !== 401) {
        console.error('API Error:', error);
      }
      throw error;
    }
  }

  async _tryRefresh() {
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
          credentials: 'include',
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.accessToken) {
          this.setToken(data.accessToken);
          if (data.refreshToken) this.setRefreshToken(data.refreshToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this._refreshPromise = null;
      }
    })();
    return this._refreshPromise;
  }

  async handleResponse(response) {
    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      const error = new Error(data.error || data.message || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Convenience methods
  get(path, options) {
    return this.request('GET', path, null, options);
  }

  post(path, data, options) {
    return this.request('POST', path, data, options);
  }

  patch(path, data, options) {
    return this.request('PATCH', path, data, options);
  }

  put(path, data, options) {
    return this.request('PUT', path, data, options);
  }

  delete(path, options) {
    return this.request('DELETE', path, null, options);
  }

  async upload(path, formData) {
    const url = `${API_URL}${path}`;
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      if (response.status === 401) {
        this.setToken(null);
        this.setRefreshToken(null);
        localStorage.removeItem('uplift_user');
        const error = new Error('Session expired');
        error.status = 401;
        throw error;
      }
      return this.handleResponse(response);
    } catch (error) {
      if (error.name !== 'TypeError') {
        console.error('API Error:', error);
      }
      throw error;
    }
  }
}

export const api = new ApiClient();

// ============================================================
// API ENDPOINTS
// ============================================================

export const authApi = {
  login: async (email, password) => {
    const result = await api.post('/auth/login', { email, password });
    if (result.accessToken) {
      api.setToken(result.accessToken);
      if (result.refreshToken) {
        api.setRefreshToken(result.refreshToken);
      }
      localStorage.setItem('uplift_user', JSON.stringify(result.user));
      return { token: result.accessToken, user: result.user };
    }
    if (result.token) {
      api.setToken(result.token);
      localStorage.setItem('uplift_user', JSON.stringify(result.user));
    }
    return result;
  },
  logout: () => {
    api.setToken(null);
    api.setRefreshToken(null);
    localStorage.removeItem('uplift_user');
    return Promise.resolve({ success: true });
  },
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
  requestPasswordReset: (email) => api.post('/auth/password/reset-request', { email }),
  resetPassword: (token, password) => api.post('/auth/password/reset', { token, password }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/password/change', { currentPassword, newPassword }),
  inviteUser: (data) => api.post('/auth/users/invite', data),
  getUsers: () => api.get('/auth/users'),
  updateProfile: (data) => api.patch('/users/me', data),
};

export const employeesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/employees${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.patch(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  addSkill: (employeeId, data) => api.post(`/employees/${employeeId}/skills`, data),
  verifySkill: (employeeId, skillId) => api.post(`/employees/${employeeId}/skills/${skillId}/verify`),
};

export const locationsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/locations${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.patch(`/locations/${id}`, data),
};

export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
};

export const rolesApi = {
  list: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
  get: (id) => api.get(`/roles/${id}`),
  getUsers: (id) => api.get(`/roles/${id}/users`),
  assignUser: (id, userId) => api.post(`/roles/${id}/assign`, { userId }),
  unassignUser: (id, userId) => api.post(`/roles/${id}/unassign`, { userId }),
};

export const skillsApi = {
  list: () => api.get('/skills'),
  create: (data) => api.post('/skills', data),
  getEmployeesForSkill: (skillId) => api.get(`/skills/${skillId}/employees`),
};

export const shiftsApi = {
  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/shifts${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/shifts/${id}`),
  create: (data) => api.post('/shifts', data),
  createBulk: (shifts) => api.post('/shifts/bulk', { shifts }),
  update: (id, data) => api.patch(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  assignOpen: (id, employeeId) => api.post(`/shifts/${id}/assign`, { employeeId }),
  getSwaps: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/shifts/swaps${query ? `?${query}` : ''}`);
  },
  approveSwap: (id, notes) => api.post(`/shifts/swaps/${id}/approve`, { notes }),
  rejectSwap: (id, notes) => api.post(`/shifts/swaps/${id}/reject`, { notes }),
  getTemplates: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/shift-templates${query ? `?${query}` : ''}`);
  },
  createTemplate: (data) => api.post('/shift-templates', data),
  updateTemplate: (id, data) => api.put(`/shift-templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/shift-templates/${id}`),
  generateFromTemplate: (templateId, data) =>
    api.post(`/shift-templates/${templateId}/generate`, data),
  getPeriods: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/schedule/periods${query ? `?${query}` : ''}`);
  },
  createPeriod: (data) => api.post('/schedule/periods', data),
  publishPeriod: (id) => api.post(`/schedule/periods/${id}/publish`),
};

export const timeApi = {
  getEntries: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/time/entries${query ? `?${query}` : ''}`);
  },
  getPending: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/time/pending${query ? `?${query}` : ''}`);
  },
  approve: (id) => api.post(`/time/entries/${id}/approve`),
  reject: (id, reason) => api.post(`/time/entries/${id}/reject`, { reason }),
  bulkApprove: (entryIds) => api.post('/time/entries/bulk-approve', { entryIds }),
  adjust: (id, data) => api.patch(`/time/entries/${id}`, data),
  clockIn: (data) => api.post('/time/clock-in', data),
  clockOut: (entryId) => api.post(`/time/entries/${entryId}/clock-out`),
  startBreak: (entryId) => api.post(`/time/entries/${entryId}/break/start`),
  endBreak: (entryId) => api.post(`/time/entries/${entryId}/break/end`),
};

export const timeOffApi = {
  getPolicies: () => api.get('/time-off/policies'),
  createPolicy: (data) => api.post('/time-off/policies', data),
  getRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/time-off/requests${query ? `?${query}` : ''}`);
  },
  approve: (id, notes) => api.post(`/time-off/requests/${id}/approve`, { notes }),
  reject: (id, notes) => api.post(`/time-off/requests/${id}/reject`, { notes }),
  getBalances: (employeeId) => api.get(`/time-off/balances?employeeId=${employeeId}`),
};

export const dashboardApi = {
  get: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/dashboard${query ? `?${query}` : ''}`);
  },
};

export const reportsApi = {
  hours: (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/hours?${query}`);
  },
  attendance: (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/attendance?${query}`);
  },
  laborCost: (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/labor-cost?${query}`);
  },
  coverage: (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/coverage?${query}`);
  },
  exportTimesheets: (params) => {
    const query = new URLSearchParams(params).toString();
    return `${API_URL}/exports/timesheets?${query}`;
  },
  exportEmployees: (params) => {
    const query = new URLSearchParams(params).toString();
    return `${API_URL}/exports/employees?${query}`;
  },
};

export const organizationApi = {
  get: () => api.get('/organization'),
  update: (data) => api.patch('/organization', data),
};

export const brandingApi = {
  get: () => api.get('/organization/branding'),
  update: (data) => api.put('/organization/branding', data),
  uploadLogo: (file, type) => {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('type', type);
    return api.upload('/organization/branding/logo', formData);
  },
  deleteLogo: (type) => api.delete(`/organization/branding/logo/${type}`),
};

export const notificationsApi = {
  list: (unreadOnly = false) => api.get(`/notifications?unreadOnly=${unreadOnly}`),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const jobsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/jobs${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  apply: (id, data) => api.post(`/jobs/${id}/apply`, data),
};

export const integrationsApi = {
  list: () => api.get('/integrations'),
  get: (id) => api.get(`/integrations/${id}`),
  create: (data) => api.post('/integrations', data),
  update: (id, data) => api.patch(`/integrations/${id}`, data),
  delete: (id) => api.delete(`/integrations/${id}`),
  test: (id) => api.post(`/integrations/${id}/test`),
  sync: (id) => api.post(`/integrations/${id}/sync`),
  getApiKeys: () => api.get('/integrations/api-keys'),
  getCustomIntegrations: () => api.get('/integrations/custom'),
  createApiKey: (data) => api.post('/integrations/api-keys', data),
  revokeApiKey: (id) => api.delete(`/integrations/api-keys/${id}`),
};

export const settingsApi = {
  getNavigation: () => api.get('/settings/navigation'),
  updateNavigation: (data) => api.put('/settings/navigation', data),
  getEmployeeVisibility: () => api.get('/settings/employee-visibility'),
  updateEmployeeVisibility: (data) => api.put('/settings/employee-visibility', data),
  getUsers: () => api.get('/users'),
  getSessions: () => api.get('/users/me/sessions'),
  getWebhooks: () => api.get('/webhooks'),
  createWebhook: (data) => api.post('/webhooks', data),
  deleteWebhook: (id) => api.delete(`/webhooks/${id}`),
};

export const activityApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/activity${query ? `?${query}` : ''}`);
  },
};

export const careerApi = {
  getPaths: () => api.get('/career/paths'),
  getInsights: () => api.get('/career/insights'),
};

export const bulkImportApi = {
  getTemplates: () => api.get('/import/templates'),
  upload: (formData) => api.upload('/import/upload', formData),
};

export const payrollApi = {
  getRuns: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/payroll/runs${query ? `?${query}` : ''}`);
  },
  getRun: (id) => api.get(`/payroll/runs/${id}`),
  createRun: (data) => api.post('/payroll/runs', data),
  approveRun: (id) => api.post(`/payroll/runs/${id}/approve`),
  getConfig: () => api.get('/payroll/config'),
  updateConfig: (data) => api.put('/payroll/config', data),
  getPayslips: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/payroll/payslips${query ? `?${query}` : ''}`);
  },
  getMyPayslips: () => api.get('/payroll/my-payslips'),
};

export const documentsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/documents${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.upload('/documents', formData),
  delete: (id) => api.delete(`/documents/${id}`),
  getCategories: () => api.get('/documents/categories'),
};

export default api;
