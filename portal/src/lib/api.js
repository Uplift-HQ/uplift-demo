// ============================================================
// API CLIENT
// Centralized HTTP client with Bearer token auth
// Falls back to demo data when API is unavailable
// ============================================================

import {
  locations,
  employees,
  skills,
  rewards,
  timeOff,
  activity,
  submissions,
  integrations,
  reports,
  settings,
  dashboard,
  demoUser,
  departments,
  roles,
  generateShifts,
  generateTimeEntries,
  timeEntries,
  getWeekStart,
  shiftTemplates,
} from '../data/mockData';

// Map mockData to expected names for compatibility
const DEMO_LOCATIONS = locations;
const DEMO_EMPLOYEES = employees;
const DEMO_SKILLS = skills;
const DEMO_INTEGRATIONS = integrations;
const DEMO_DEPARTMENTS = departments;
const DEMO_ROLES = roles;
const DEMO_DASHBOARD = dashboard;
const DEMO_USER = demoUser;
const DEMO_ACTIVITIES = activity;
const DEMO_TIME_ENTRIES = timeEntries;
const DEMO_TIME_OFF_REQUESTS = timeOff.requests;
const DEMO_TIME_OFF_BALANCES = [
  { id: 'bal-1', policy_name: 'Annual Leave', entitlement: 25, used: timeOff.balances.annual.used, pending: 0, remaining: timeOff.balances.annual.total - timeOff.balances.annual.used },
  { id: 'bal-2', policy_name: 'Sick Leave', entitlement: 10, used: timeOff.balances.sick.used, pending: 0, remaining: timeOff.balances.sick.total - timeOff.balances.sick.used },
  { id: 'bal-3', policy_name: 'Personal', entitlement: 5, used: timeOff.balances.personal.used, pending: 0, remaining: timeOff.balances.personal.total - timeOff.balances.personal.used },
];
const DEMO_TIME_OFF_POLICIES = [
  { id: 'pol-1', name: 'Annual Leave', days_per_year: 25, carry_over_limit: 5 },
  { id: 'pol-2', name: 'Sick Leave', days_per_year: 10, carry_over_limit: 0 },
  { id: 'pol-3', name: 'Personal', days_per_year: 5, carry_over_limit: 0 },
];
const DEMO_USERS = settings.users;
const DEMO_SESSIONS = [
  { id: 'sess-1', device: 'Chrome on MacOS', ip: '192.168.1.100', location: 'London, UK', lastActive: new Date().toISOString(), current: true },
];
const DEMO_WEBHOOKS = [
  { id: 'wh-1', name: 'Slack Notifications', url: 'https://hooks.slack.com/services/xxx', events: ['shift.created', 'employee.added'], status: 'active', lastTriggered: new Date(Date.now() - 1800000).toISOString(), successRate: 99 },
];
const DEMO_ORGANIZATION = settings.organization;
const DEMO_BRANDING = { primaryColor: '#6366f1', companyName: settings.organization.name, logo: null, favicon: null };
const DEMO_NAVIGATION = { employees: true, schedule: true, templates: true, timeTracking: true, timeOff: true, locations: true, skills: true, jobs: true, career: true, bulkImport: true, reports: true, integrations: true, activity: true };
const DEMO_EMPLOYEE_VISIBILITY = { email: { managers: true, employees: false }, phone: { managers: true, employees: false }, address: { managers: true, employees: false }, salary: { managers: false, employees: false }, emergencyContact: { managers: true, employees: false }, performanceScore: { managers: true, employees: true }, skills: { managers: true, employees: true } };
const DEMO_OPPORTUNITIES = [
  { id: 'opp-001', title: 'Front of House Supervisor', location: 'Manchester Central', location_id: 'l1', department: 'Front of House', salary_min: 28000, salary_max: 32000, salary_display: '£28,000 - £32,000', type: 'Promotion', employment_type: 'Full-time', deadline: '2026-02-15', posted: '2026-01-10', status: 'open', description: 'Lead our main restaurant team.', requirements: ['2+ years FOH experience', 'Food Safety Level 3'], applications: 3 },
  { id: 'opp-002', title: 'Bar Team Lead', location: 'London Victoria', location_id: 'l2', department: 'Bar', salary_min: 25000, salary_max: 28000, salary_display: '£25,000 - £28,000', type: 'Promotion', employment_type: 'Full-time', deadline: '2026-02-20', posted: '2026-01-12', status: 'open', description: 'Lead the bar team.', requirements: ['Personal License Holder', 'Cocktail expertise'], applications: 4 },
];
const DEMO_CAREER = { paths: [], insights: employees.slice(0, 5).map(e => ({ employeeId: e.id, employeeName: e.name, currentRole: e.role, nextRole: 'Supervisor', readiness: 75, gapCount: 2 })) };
const DEMO_IMPORT_TEMPLATES = [
  { id: 'tpl-1', name: 'Employees', description: 'Import employee records', fields: ['first_name', 'last_name', 'email', 'phone', 'role', 'department', 'start_date'] },
  { id: 'tpl-2', name: 'Shifts', description: 'Import shift schedules', fields: ['date', 'start_time', 'end_time', 'location', 'employee_email', 'role'] },
];
const DEMO_HOURS_REPORT = { summary: { totalScheduled: 1248, totalWorked: 1192, variance: -4.5, overtime: 48 }, byEmployee: employees.map(e => ({ id: e.id, name: e.name, scheduled: 140, worked: 132, overtime: 0 })) };
const DEMO_ATTENDANCE_REPORT = { summary: { totalShifts: 156, onTime: 142, late: 10, noShow: 4, punctualityRate: 91 }, byEmployee: employees.map(e => ({ id: e.id, name: e.name, shifts: 20, onTime: 18, late: 2, noShow: 0, punctualityRate: 90 })) };
const DEMO_LABOR_COST_REPORT = { summary: { totalCost: reports.laborCost.current, scheduledCost: reports.laborCost.budget, variance: reports.laborCost.variance, averageRate: 12.25 }, byLocation: locations.map(l => ({ id: l.id, name: l.name, cost: Math.round(Math.random() * 3000 + 2000), hours: Math.round(Math.random() * 200 + 100) })), trend: reports.laborCost.data.map((v, i) => ({ week: `Week ${i + 1}`, cost: v })) };
const DEMO_SHIFT_TEMPLATES = shiftTemplates;
const DEMO_API_KEYS = [
  { id: 'key-1', name: 'Production API Key', prefix: 'uplift_live_7x9k...mP2q', created_at: '2025-10-15', last_used: new Date(Date.now() - 300000).toISOString(), scope: 'Full access' },
];
const DEMO_CUSTOM_INTEGRATIONS = [];
const DEMO_NOTIFICATIONS = [
  { id: 'notif-1', type: 'shift_swap', title: 'Shift swap request', message: 'Thomas Cane requested to swap shifts', read: false, created_at: new Date().toISOString() },
  { id: 'notif-2', type: 'time_off', title: 'Time off request', message: 'Marc Hunt submitted a time off request', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
];
const DEMO_SHIFT_SWAPS = [
  { id: 'swap-1', from_employee: 'Thomas Cane', to_employee: 'Marc Hunt', shift_date: '2026-02-05', status: 'pending', reason: 'Personal appointment' },
];
const DEMO_SCHEDULE_PERIODS = [
  { id: 'period-1', name: 'Week 5 2026', start_date: '2026-01-27', end_date: '2026-02-02', status: 'published' },
  { id: 'period-2', name: 'Week 6 2026', start_date: '2026-02-03', end_date: '2026-02-09', status: 'draft' },
];
const generateDemoShifts = generateShifts;

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Demo mode - env-driven, falls back to demo data when enabled
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

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

  async request(method, path, data, options = {}) {
    // DEMO MODE: Intercept all requests and return demo data
    if (DEMO_MODE) {
      return this.getDemoData(path, method, data);
    }

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
          // Retry the original request with new token
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
    // Deduplicate concurrent refresh requests
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

  // Demo data router - returns appropriate data based on path
  getDemoData(path, method, data) {
    // Dashboard
    if (path.startsWith('/dashboard')) {
      return DEMO_DASHBOARD;
    }

    // Employees
    if (path === '/employees' || path.startsWith('/employees?')) {
      return { employees: DEMO_EMPLOYEES };
    }
    if (path.match(/^\/employees\/[^/]+$/)) {
      const id = path.split('/')[2];
      const emp = DEMO_EMPLOYEES.find(e => e.id === id);
      return emp ? { employee: emp } : { employee: DEMO_EMPLOYEES[0] };
    }

    // Locations
    if (path === '/locations' || path.startsWith('/locations?')) {
      return { locations: DEMO_LOCATIONS };
    }
    if (path.match(/^\/locations\/[^/]+$/)) {
      const id = path.split('/')[2];
      const loc = DEMO_LOCATIONS.find(l => l.id === id);
      return loc ? { location: loc } : { location: DEMO_LOCATIONS[0] };
    }

    // Departments
    if (path === '/departments') {
      return { departments: DEMO_DEPARTMENTS };
    }

    // Roles
    if (path === '/roles') {
      return { roles: DEMO_ROLES };
    }

    // Skills
    if (path === '/skills') {
      return { skills: DEMO_SKILLS };
    }

    // Shifts
    if (path === '/shifts' || path.startsWith('/shifts?')) {
      const shifts = generateDemoShifts(getWeekStart());
      return { shifts };
    }
    if (path.startsWith('/shifts/swaps')) {
      return { swaps: DEMO_SHIFT_SWAPS };
    }

    // Shift Templates
    if (path === '/shift-templates' || path.startsWith('/shift-templates?')) {
      return { templates: DEMO_SHIFT_TEMPLATES };
    }

    // Schedule Periods
    if (path.startsWith('/schedule/periods')) {
      return { periods: DEMO_SCHEDULE_PERIODS };
    }

    // Time Entries
    if (path.startsWith('/time/entries') || path.startsWith('/time/pending')) {
      if (path.includes('pending')) {
        const pending = DEMO_TIME_ENTRIES.filter(e => !e.approved).slice(0, 8);
        return { entries: pending };
      }
      return { entries: DEMO_TIME_ENTRIES };
    }

    // Time Off
    if (path === '/time-off/policies') {
      return { policies: DEMO_TIME_OFF_POLICIES };
    }
    if (path.startsWith('/time-off/requests')) {
      return { requests: DEMO_TIME_OFF_REQUESTS };
    }
    if (path.startsWith('/time-off/balances')) {
      return { balances: DEMO_TIME_OFF_BALANCES };
    }

    // Jobs/Opportunities
    if (path === '/jobs' || path.startsWith('/jobs?')) {
      return { jobs: DEMO_OPPORTUNITIES };
    }
    if (path.match(/^\/jobs\/[^/]+$/)) {
      const id = path.split('/')[2];
      const job = DEMO_OPPORTUNITIES.find(j => j.id === id);
      return job ? { job } : { job: DEMO_OPPORTUNITIES[0] };
    }

    // Integrations
    if (path === '/integrations') {
      return { integrations: DEMO_INTEGRATIONS };
    }
    if (path === '/integrations/api-keys') {
      return { apiKeys: DEMO_API_KEYS };
    }
    if (path === '/integrations/custom') {
      return { customIntegrations: DEMO_CUSTOM_INTEGRATIONS };
    }

    // Organization
    if (path === '/organization') {
      return { organization: DEMO_ORGANIZATION };
    }
    if (path === '/organization/branding') {
      return { branding: DEMO_BRANDING };
    }

    // Settings
    if (path === '/settings/navigation') {
      return { navigation: DEMO_NAVIGATION };
    }
    if (path === '/settings/employee-visibility') {
      return { visibility: DEMO_EMPLOYEE_VISIBILITY };
    }

    // Users
    if (path === '/users' || path.startsWith('/users?') || path === '/auth/users') {
      return { users: DEMO_USERS };
    }
    if (path.match(/\/users\/.*\/sessions/)) {
      return { sessions: DEMO_SESSIONS };
    }

    // Webhooks
    if (path === '/webhooks') {
      return { webhooks: DEMO_WEBHOOKS };
    }

    // Activity
    if (path.startsWith('/activity')) {
      return { activities: DEMO_ACTIVITIES, submissions: submissions };
    }

    // Career
    if (path.startsWith('/career')) {
      return DEMO_CAREER;
    }

    // Bulk Import
    if (path.startsWith('/import')) {
      return { templates: DEMO_IMPORT_TEMPLATES };
    }

    // Reports
    if (path.startsWith('/reports/hours')) {
      return DEMO_HOURS_REPORT;
    }
    if (path.startsWith('/reports/attendance')) {
      return DEMO_ATTENDANCE_REPORT;
    }
    if (path.startsWith('/reports/labor-cost')) {
      return DEMO_LABOR_COST_REPORT;
    }
    if (path.startsWith('/reports/coverage')) {
      return {
        summary: { coverageRate: 94, understaffedShifts: 4, overstaffedShifts: 2 },
        byLocation: DEMO_LOCATIONS.map(l => ({
          id: l.id, name: l.name, coverage: Math.round(Math.random() * 10 + 90),
        })),
      };
    }

    // Notifications
    if (path.startsWith('/notifications')) {
      return { notifications: DEMO_NOTIFICATIONS };
    }

    // Auth - read from localStorage to respect logged-in persona
    if (path === '/auth/me') {
      const stored = localStorage.getItem('uplift_user');
      return { user: stored ? JSON.parse(stored) : DEMO_USER };
    }

    // Default empty response
    return {};
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
    if (DEMO_MODE) {
      return { success: true, message: 'Demo mode - upload simulated' };
    }
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

const DEMO_PERSONAS = {
  'admin@demo.com': { ...DEMO_USER, id: 'demo-admin', email: 'admin@demo.com', firstName: 'Sarah', lastName: 'Chen', role: 'admin' },
  'manager@demo.com': { ...DEMO_USER, id: 'demo-manager', email: 'manager@demo.com', firstName: 'James', lastName: 'Williams', role: 'manager' },
  'worker@demo.com': { ...DEMO_USER, id: 'demo-worker', email: 'worker@demo.com', firstName: 'Maria', lastName: 'Santos', role: 'worker' },
};

export const authApi = {
  login: async (email, password) => {
    if (DEMO_MODE) {
      const persona = DEMO_PERSONAS[email] || DEMO_USER;
      const token = 'demo_token_' + Date.now();
      api.setToken(token);
      localStorage.setItem('uplift_user', JSON.stringify(persona));
      return { token, user: persona };
    }
    const result = await api.post('/auth/login', { email, password });
    // Backend returns { accessToken, refreshToken, user }
    if (result.accessToken) {
      api.setToken(result.accessToken);
      if (result.refreshToken) {
        api.setRefreshToken(result.refreshToken);
      }
      return { token: result.accessToken, user: result.user };
    }
    // Fallback for { token, user } format
    if (result.token) {
      api.setToken(result.token);
    }
    return result;
  },
  logout: () => {
    api.setToken(null);
    api.setRefreshToken(null);
    localStorage.removeItem('uplift_user');
    return Promise.resolve({ success: true });
  },
  me: async () => {
    if (DEMO_MODE) {
      const stored = localStorage.getItem('uplift_user');
      return { user: stored ? JSON.parse(stored) : DEMO_USER };
    }
    return api.get('/auth/me');
  },
  register: (data) => api.post('/auth/register', data),
  requestPasswordReset: (email) => api.post('/auth/password/reset-request', { email }),
  resetPassword: (token, password) => api.post('/auth/password/reset', { token, password }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/password/change', { currentPassword, newPassword }),
  inviteUser: (data) => api.post('/auth/users/invite', data),
  getUsers: async () => {
    if (DEMO_MODE) {
      return { users: DEMO_USERS };
    }
    return api.get('/auth/users');
  },
  updateProfile: (data) => api.patch('/users/me', data),
};

export const employeesApi = {
  list: async (params = {}) => {
    if (DEMO_MODE) {
      return { employees: DEMO_EMPLOYEES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/employees${query ? `?${query}` : ''}`);
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const emp = DEMO_EMPLOYEES.find(e => e.id === id);
      return emp ? { employee: emp } : { employee: DEMO_EMPLOYEES[0] };
    }
    return api.get(`/employees/${id}`);
  },
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.patch(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  addSkill: (employeeId, data) => api.post(`/employees/${employeeId}/skills`, data),
  verifySkill: (employeeId, skillId) => api.post(`/employees/${employeeId}/skills/${skillId}/verify`),
};

export const locationsApi = {
  list: async (params = {}) => {
    if (DEMO_MODE) {
      return { locations: DEMO_LOCATIONS };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/locations${query ? `?${query}` : ''}`);
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const loc = DEMO_LOCATIONS.find(l => l.id === id);
      return loc ? { location: loc } : { location: DEMO_LOCATIONS[0] };
    }
    return api.get(`/locations/${id}`);
  },
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.patch(`/locations/${id}`, data),
};

export const departmentsApi = {
  list: async () => {
    if (DEMO_MODE) {
      return { departments: DEMO_DEPARTMENTS };
    }
    return api.get('/departments');
  },
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
};

export const rolesApi = {
  list: async () => {
    if (DEMO_MODE) {
      return { roles: DEMO_ROLES };
    }
    return api.get('/roles');
  },
  create: (data) => api.post('/roles', data),
};

export const skillsApi = {
  list: async () => {
    if (DEMO_MODE) {
      return { skills: DEMO_SKILLS };
    }
    return api.get('/skills');
  },
  create: (data) => api.post('/skills', data),
};

export const shiftsApi = {
  list: async (params) => {
    if (DEMO_MODE) {
      const shifts = generateDemoShifts(getWeekStart());
      return { shifts };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/shifts${query ? `?${query}` : ''}`);
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const shifts = generateDemoShifts(getWeekStart());
      const shift = shifts.find(s => s.id === id);
      return shift ? { shift } : { shift: shifts[0] };
    }
    return api.get(`/shifts/${id}`);
  },
  create: (data) => api.post('/shifts', data),
  createBulk: (shifts) => api.post('/shifts/bulk', { shifts }),
  update: (id, data) => api.patch(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  assignOpen: (id, employeeId) => api.post(`/shifts/${id}/assign`, { employeeId }),
  getSwaps: async (params = {}) => {
    if (DEMO_MODE) {
      return { swaps: DEMO_SHIFT_SWAPS };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/shifts/swaps${query ? `?${query}` : ''}`);
  },
  approveSwap: (id, notes) => api.post(`/shifts/swaps/${id}/approve`, { notes }),
  rejectSwap: (id, notes) => api.post(`/shifts/swaps/${id}/reject`, { notes }),
  getTemplates: async (params = {}) => {
    if (DEMO_MODE) {
      return { templates: DEMO_SHIFT_TEMPLATES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/shift-templates${query ? `?${query}` : ''}`);
  },
  createTemplate: (data) => api.post('/shift-templates', data),
  updateTemplate: (id, data) => api.put(`/shift-templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/shift-templates/${id}`),
  generateFromTemplate: (templateId, data) =>
    api.post(`/shift-templates/${templateId}/generate`, data),
  getPeriods: async (params = {}) => {
    if (DEMO_MODE) {
      return { periods: DEMO_SCHEDULE_PERIODS };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/schedule/periods${query ? `?${query}` : ''}`);
  },
  createPeriod: (data) => api.post('/schedule/periods', data),
  publishPeriod: (id) => api.post(`/schedule/periods/${id}/publish`),
};

export const timeApi = {
  getEntries: async (params = {}) => {
    if (DEMO_MODE) {
      return { entries: DEMO_TIME_ENTRIES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/time/entries${query ? `?${query}` : ''}`);
  },
  getPending: async (params = {}) => {
    if (DEMO_MODE) {
      const pending = DEMO_TIME_ENTRIES.filter(e => !e.approved).slice(0, 8);
      return { entries: pending };
    }
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
  getPolicies: async () => {
    if (DEMO_MODE) {
      return { policies: DEMO_TIME_OFF_POLICIES };
    }
    return api.get('/time-off/policies');
  },
  createPolicy: (data) => api.post('/time-off/policies', data),
  getRequests: async (params = {}) => {
    if (DEMO_MODE) {
      return { requests: DEMO_TIME_OFF_REQUESTS };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/time-off/requests${query ? `?${query}` : ''}`);
  },
  approve: (id, notes) => api.post(`/time-off/requests/${id}/approve`, { notes }),
  reject: (id, notes) => api.post(`/time-off/requests/${id}/reject`, { notes }),
  getBalances: async (employeeId) => {
    if (DEMO_MODE) {
      return { balances: DEMO_TIME_OFF_BALANCES };
    }
    return api.get(`/time-off/balances?employeeId=${employeeId}`);
  },
};

export const dashboardApi = {
  get: async (params = {}) => {
    if (DEMO_MODE) {
      return DEMO_DASHBOARD;
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/dashboard${query ? `?${query}` : ''}`);
  },
};

export const reportsApi = {
  hours: async (params) => {
    if (DEMO_MODE) {
      // Format data as array of rows for the table
      const data = DEMO_EMPLOYEES.map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        location_name: e.location,
        total_hours: 140 + Math.floor(Math.random() * 20),
        regular_hours: 140,
        overtime_hours: Math.floor(Math.random() * 8),
        labor_cost: (140 * 12.5) + (Math.floor(Math.random() * 8) * 18.75),
      }));
      return { data, totals: DEMO_HOURS_REPORT.summary };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/hours?${query}`);
  },
  attendance: async (params) => {
    if (DEMO_MODE) {
      const data = DEMO_EMPLOYEES.map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        location_name: e.location,
        total_shifts: 20,
        on_time: 18,
        late: 2,
        no_show: 0,
        punctuality_rate: 90,
      }));
      return { data, totals: DEMO_ATTENDANCE_REPORT.summary };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/attendance?${query}`);
  },
  laborCost: async (params) => {
    if (DEMO_MODE) {
      const data = DEMO_LOCATIONS.map(l => ({
        id: l.id,
        location_name: l.name,
        hours: 200 + Math.floor(Math.random() * 100),
        cost: 2500 + Math.floor(Math.random() * 1500),
        budget: 4000,
        variance: -500 + Math.floor(Math.random() * 1000),
      }));
      return { data, totals: DEMO_LABOR_COST_REPORT.summary };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/labor-cost?${query}`);
  },
  coverage: async (params) => {
    if (DEMO_MODE) {
      const data = DEMO_LOCATIONS.map(l => ({
        id: l.id,
        location_name: l.name,
        total_shifts: 20 + Math.floor(Math.random() * 10),
        filled_shifts: 18 + Math.floor(Math.random() * 8),
        open_shifts: 2 + Math.floor(Math.random() * 3),
        coverage_rate: 85 + Math.floor(Math.random() * 15),
      }));
      return { data, totals: { coverageRate: 94, understaffedShifts: 4, overstaffedShifts: 2 } };
    }
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
  get: async () => {
    if (DEMO_MODE) {
      return { organization: DEMO_ORGANIZATION };
    }
    return api.get('/organization');
  },
  update: (data) => api.patch('/organization', data),
};

export const brandingApi = {
  get: async () => {
    if (DEMO_MODE) {
      return { branding: DEMO_BRANDING };
    }
    return api.get('/organization/branding');
  },
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
  list: async (unreadOnly = false) => {
    if (DEMO_MODE) {
      return { notifications: DEMO_NOTIFICATIONS };
    }
    return api.get(`/notifications?unreadOnly=${unreadOnly}`);
  },
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const jobsApi = {
  list: async (params = {}) => {
    if (DEMO_MODE) {
      return { jobs: DEMO_OPPORTUNITIES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/jobs${query ? `?${query}` : ''}`);
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const job = DEMO_OPPORTUNITIES.find(j => j.id === id);
      return job ? { job } : { job: DEMO_OPPORTUNITIES[0] };
    }
    return api.get(`/jobs/${id}`);
  },
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  apply: (id, data) => api.post(`/jobs/${id}/apply`, data),
};

export const integrationsApi = {
  list: async () => {
    if (DEMO_MODE) {
      return { integrations: DEMO_INTEGRATIONS };
    }
    return api.get('/integrations');
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const integration = DEMO_INTEGRATIONS.find(i => i.id === id);
      return integration ? { integration } : { integration: DEMO_INTEGRATIONS[0] };
    }
    return api.get(`/integrations/${id}`);
  },
  create: (data) => api.post('/integrations', data),
  update: (id, data) => api.patch(`/integrations/${id}`, data),
  delete: (id) => api.delete(`/integrations/${id}`),
  test: (id) => api.post(`/integrations/${id}/test`),
  sync: (id) => api.post(`/integrations/${id}/sync`),
  getApiKeys: async () => {
    if (DEMO_MODE) {
      return { apiKeys: DEMO_API_KEYS };
    }
    return api.get('/integrations/api-keys');
  },
  getCustomIntegrations: async () => {
    if (DEMO_MODE) {
      return { customIntegrations: DEMO_CUSTOM_INTEGRATIONS };
    }
    return api.get('/integrations/custom');
  },
  createApiKey: (data) => api.post('/integrations/api-keys', data),
  revokeApiKey: (id) => api.delete(`/integrations/api-keys/${id}`),
};

// Settings API (for Settings page)
export const settingsApi = {
  getNavigation: async () => {
    if (DEMO_MODE) {
      return { navigation: DEMO_NAVIGATION };
    }
    return api.get('/settings/navigation');
  },
  updateNavigation: (data) => api.put('/settings/navigation', data),
  getEmployeeVisibility: async () => {
    if (DEMO_MODE) {
      return { visibility: DEMO_EMPLOYEE_VISIBILITY };
    }
    return api.get('/settings/employee-visibility');
  },
  updateEmployeeVisibility: (data) => api.put('/settings/employee-visibility', data),
  getUsers: async () => {
    if (DEMO_MODE) {
      return { users: DEMO_USERS };
    }
    return api.get('/users');
  },
  getSessions: async () => {
    if (DEMO_MODE) {
      return { sessions: DEMO_SESSIONS };
    }
    return api.get('/users/me/sessions');
  },
  getWebhooks: async () => {
    if (DEMO_MODE) {
      return { webhooks: DEMO_WEBHOOKS };
    }
    return api.get('/webhooks');
  },
  createWebhook: (data) => api.post('/webhooks', data),
  deleteWebhook: (id) => api.delete(`/webhooks/${id}`),
};

// Activity API
export const activityApi = {
  list: async (params = {}) => {
    if (DEMO_MODE) {
      return { activities: DEMO_ACTIVITIES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/activity${query ? `?${query}` : ''}`);
  },
};

// Career API
export const careerApi = {
  getPaths: async () => {
    if (DEMO_MODE) {
      return DEMO_CAREER;
    }
    return api.get('/career/paths');
  },
  getInsights: async () => {
    if (DEMO_MODE) {
      return { insights: DEMO_CAREER.insights };
    }
    return api.get('/career/insights');
  },
};

// Bulk Import API
export const bulkImportApi = {
  getTemplates: async () => {
    if (DEMO_MODE) {
      return { templates: DEMO_IMPORT_TEMPLATES };
    }
    return api.get('/import/templates');
  },
  upload: (formData) => api.upload('/import/upload', formData),
};

export default api;
