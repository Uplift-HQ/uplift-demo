// ============================================================
// API CLIENT
// Centralized HTTP client with Bearer token auth
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('uplift_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('uplift_token', token);
    } else {
      localStorage.removeItem('uplift_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('uplift_token');
  }

  async request(method, path, data, options = {}) {
    const url = `${API_URL}${path}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Bearer token if available
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 - clear token (let auth flow handle redirect)
      if (response.status === 401) {
        this.setToken(null);
        localStorage.removeItem('uplift_user');
        const error = new Error('Session expired');
        error.status = 401;
        throw error;
      }

      return this.handleResponse(response);
    } catch (error) {
      // Don't log network errors for demo mode (no backend)
      if (error.name !== 'TypeError') {
        console.error('API Error:', error);
      }
      throw error;
    }
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
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (response.status === 401) {
        this.setToken(null);
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
    if (result.token) {
      api.setToken(result.token);
    }
    return result;
  },
  logout: () => {
    api.setToken(null);
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
};

export const skillsApi = {
  list: () => api.get('/skills'),
  create: (data) => api.post('/skills', data),
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
  createApiKey: (data) => api.post('/integrations/api-keys', data),
  revokeApiKey: (id) => api.delete(`/integrations/api-keys/${id}`),
};

export default api;
