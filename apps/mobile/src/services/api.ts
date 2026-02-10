// ============================================================
// UPLIFT MOBILE API SERVICE
// Production-ready API client with real backend integration
// ============================================================

import Constants from 'expo-constants';
import { secureStorage } from './secureStorage';

// Production API URL - this is the canonical production backend
const PRODUCTION_API_URL = 'https://api.uplifthq.co.uk/api';

// Configuration - uses environment variable or falls back to production URL
const getApiUrl = () => {
  // Check for Expo config extra first (set in app.json/app.config.js)
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configUrl) return configUrl;

  // Environment variable override (for EAS builds)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // For development, connect to local server
  if (__DEV__) {
    return 'http://localhost:3000/api';
  }

  // Production builds use the production API
  return PRODUCTION_API_URL;
};

const CONFIG = {
  API_URL: getApiUrl(),
  
  // Toggle for development - set to false for real API calls
  USE_MOCK: false,
  
  // Request timeout in ms
  TIMEOUT: 30000,
};
const TOKEN_KEY = '@uplift_access_token';
const REFRESH_TOKEN_KEY = '@uplift_refresh_token';
const CSRF_TOKEN_KEY = '@uplift_csrf_token';

// -------------------- Types --------------------

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'worker' | 'manager' | 'admin';
  avatarUrl?: string;
  phone?: string;
  organizationId: string;
  employeeId?: string;
  mfaEnabled?: boolean;
  momentumScore?: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'onboarding';
  departmentId?: string;
  departmentName?: string;
  primaryRoleId?: string;
  roleName?: string;
  primaryLocationId?: string;
  locationName?: string;
  hourlyRate?: number;
  hireDate?: string;
  managerId?: string;
  managerName?: string;
}

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  employeeId?: string;
  employeeName?: string;
  locationId: string;
  locationName: string;
  roleId?: string;
  roleName?: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  isOpen: boolean;
  notes?: string;
  requiredSkills?: string[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level?: number;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  expiresAt?: string;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  departmentId?: string;
  departmentName?: string;
  locationId?: string;
  locationName?: string;
  employmentType: 'full_time' | 'part_time' | 'contract';
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  requiredSkills: string[];
  status: 'draft' | 'open' | 'closed' | 'filled';
  matchScore?: number;
  applicationDeadline?: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  shiftId?: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  policyId: string;
  policyName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approvedBy?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

export interface DashboardData {
  upcomingShifts: number;
  hoursThisWeek: number;
  pendingTasks: number;
  openOpportunities: number;
  nextShift?: Shift;
  recentActivity: any[];
  stats: {
    totalHoursMonth: number;
    averageShiftLength: number;
    onTimePercentage: number;
  };
}

// -------------------- API Client --------------------

class ApiService {
  private accessToken: string | null = null;
  private csrfToken: string | null = null;

  constructor() {
    this.loadTokens();
  }

  // -------------------- Public helpers for offline support --------------------
  
  getBaseUrl(): string {
    return CONFIG.API_URL;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    await this.loadTokens();
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }
    return headers;
  }

  // Public request method for offline module
  async publicRequest<T>(
    path: string, 
    options: { method?: string; body?: any } = {}
  ): Promise<T> {
    const method = (options.method || 'GET') as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    return this.request<T>(method, path, options.body);
  }

  // -------------------- Private helpers --------------------

  private async loadTokens() {
    try {
      this.accessToken = await secureStorage.getToken('access');
      this.csrfToken = await secureStorage.getToken('csrf');
    } catch (error) {
      if (__DEV__) {
        if (__DEV__) console.warn('[API] Failed to load tokens from secure storage:', error);
      }
    }
  }

  private async saveTokens(accessToken: string, refreshToken?: string) {
    try {
      this.accessToken = accessToken;
      await secureStorage.setToken('access', accessToken);
      if (refreshToken) {
        await secureStorage.setToken('refresh', refreshToken);
      }
    } catch (error) {
      if (__DEV__) {
        if (__DEV__) console.warn('[API] Failed to save tokens to secure storage:', error);
      }
    }
  }

  private async clearTokens() {
    try {
      this.accessToken = null;
      this.csrfToken = null;
      await secureStorage.deleteToken('access');
      await secureStorage.deleteToken('refresh');
      await secureStorage.deleteToken('csrf');
    } catch (error) {
      if (__DEV__) {
        if (__DEV__) console.warn('[API] Failed to clear tokens from secure storage:', error);
      }
    }
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
    options: { skipAuth?: boolean } = {}
  ): Promise<T> {
    const url = `${CONFIG.API_URL}${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!options.skipAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (method !== 'GET' && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle token refresh
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
          });
          return this.handleResponse<T>(retryResponse);
        }
        throw new Error('Session expired');
      }

      return this.handleResponse<T>(response);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || 'Request failed');
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }
    
    return data;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await secureStorage.getToken('refresh');
      if (!refreshToken) return false;

      const response = await fetch(`${CONFIG.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        await this.saveTokens(data.accessToken, data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async fetchCsrfToken(): Promise<void> {
    try {
      const response = await fetch(`${CONFIG.API_URL}/csrf-token`);
      const data = await response.json();
      this.csrfToken = data.csrfToken;
      await secureStorage.setToken('csrf', data.csrfToken);
    } catch (error) {
      if (__DEV__) {
        if (__DEV__) console.warn('[API] Failed to fetch CSRF token:', error);
      }
    }
  }

  // ==================== AUTH ====================

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    await this.fetchCsrfToken();
    
    const response = await this.request<any>('POST', '/auth/login', { email, password }, { skipAuth: true });
    
    await this.saveTokens(response.accessToken, response.refreshToken);
    
    return {
      user: response.user,
      token: response.accessToken,
    };
  }

  async register(data: {
    organizationName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ user: User; token: string }> {
    await this.fetchCsrfToken();
    
    const response = await this.request<any>('POST', '/auth/register', data, { skipAuth: true });
    
    await this.saveTokens(response.accessToken, response.refreshToken);
    
    return {
      user: response.user,
      token: response.accessToken,
    };
  }

  async logout(): Promise<void> {
    try {
      await this.request('POST', '/auth/logout');
    } finally {
      await this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('GET', '/auth/me');
  }

  async getMyEmployee(): Promise<{ employee: Employee | null }> {
    return this.request('GET', '/employees/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('POST', '/auth/password/change', { currentPassword, newPassword });
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.request('POST', '/auth/password/reset-request', { email }, { skipAuth: true });
  }

  // ==================== DASHBOARD ====================

  async getDashboard(params?: { locationId?: string }): Promise<DashboardData> {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request('GET', `/dashboard${query}`);
  }

  // ==================== SHIFTS & SCHEDULING ====================

  async getShifts(params: {
    startDate?: string;
    endDate?: string;
    locationId?: string;
    employeeId?: string;
    status?: string;
  }): Promise<{ shifts: Shift[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request('GET', `/shifts?${query}`);
  }

  async getMyShifts(params?: { startDate?: string; endDate?: string }): Promise<{ shifts: Shift[] }> {
    const employee = await this.getMyEmployee();
    if (!employee.employee) return { shifts: [] };
    
    return this.getShifts({
      employeeId: employee.employee.id,
      ...params,
    });
  }

  async getShiftDetail(id: string): Promise<{ shift: Shift }> {
    return this.request('GET', `/shifts/${id}`);
  }

  async getOpenShifts(params?: { locationId?: string; startDate?: string; endDate?: string }): Promise<{ shifts: Shift[] }> {
    const query = new URLSearchParams({ isOpen: 'true', ...params } as any).toString();
    return this.request('GET', `/shifts?${query}`);
  }

  async claimOpenShift(shiftId: string): Promise<{ shift: Shift }> {
    return this.request('POST', `/shifts/${shiftId}/claim`);
  }

  async requestShiftSwap(data: {
    shiftId: string;
    targetEmployeeId?: string;
    reason?: string;
  }): Promise<{ swap: any }> {
    return this.request('POST', '/shifts/swaps', data);
  }

  async getShiftSwaps(params?: { status?: string }): Promise<{ swaps: any[] }> {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request('GET', `/shifts/swaps${query}`);
  }

  async respondToSwap(swapId: string, action: 'accept' | 'reject', notes?: string): Promise<void> {
    await this.request('POST', `/shifts/swaps/${swapId}/${action}`, { notes });
  }

  // ==================== TIME TRACKING ====================

  async clockIn(data: {
    shiftId?: string;
    locationId?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Promise<{ entry: TimeEntry }> {
    return this.request('POST', '/time/clock-in', data);
  }

  async clockOut(data: {
    entryId: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Promise<{ entry: TimeEntry }> {
    return this.request('POST', '/time/clock-out', data);
  }

  async getTimeEntries(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<{ entries: TimeEntry[] }> {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request('GET', `/time/entries${query}`);
  }

  async getCurrentClockStatus(): Promise<{ isClocked: boolean; entry?: TimeEntry }> {
    return this.request('GET', '/time/current');
  }

  // ==================== TIME OFF ====================

  async getTimeOffPolicies(): Promise<{ policies: any[] }> {
    return this.request('GET', '/time-off/policies');
  }

  async getTimeOffBalances(): Promise<{ balances: any[] }> {
    const employee = await this.getMyEmployee();
    if (!employee.employee) return { balances: [] };
    return this.request('GET', `/time-off/balances?employeeId=${employee.employee.id}`);
  }

  async requestTimeOff(data: {
    policyId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }): Promise<{ request: TimeOffRequest }> {
    return this.request('POST', '/time-off/requests', data);
  }

  async getMyTimeOffRequests(): Promise<{ requests: TimeOffRequest[] }> {
    return this.request('GET', '/time-off/requests?mine=true');
  }

  // ==================== SKILLS ====================

  async getSkills(): Promise<{ skills: Skill[] }> {
    return this.request('GET', '/skills');
  }

  async getMySkills(): Promise<{ skills: Skill[] }> {
    const employee = await this.getMyEmployee();
    if (!employee.employee) return { skills: [] };
    return this.request('GET', `/employees/${employee.employee.id}/skills`);
  }

  async requestSkillVerification(skillId: string, evidence: string): Promise<void> {
    const employee = await this.getMyEmployee();
    if (!employee.employee) throw new Error('Employee not found');
    
    await this.request('POST', `/employees/${employee.employee.id}/skills/${skillId}/verify-request`, { evidence });
  }

  async addSkill(skillId: string, level?: number): Promise<void> {
    const employee = await this.getMyEmployee();
    if (!employee.employee) throw new Error('Employee not found');
    
    await this.request('POST', `/employees/${employee.employee.id}/skills`, { skillId, level });
  }

  async getSkillVerificationRequests(): Promise<{ requests: any[] }> {
    return this.request('GET', '/skills/verification/pending');
  }

  async verifySkill(requestId: string, approved: boolean, notes?: string): Promise<void> {
    await this.request('POST', `/skills/verification/${requestId}`, { approved, notes });
  }

  // ==================== JOBS & CAREER ====================

  async getJobPostings(params?: { status?: string }): Promise<{ jobs: JobPosting[] }> {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request('GET', `/jobs${query}`);
  }

  async getJobDetail(id: string): Promise<{ job: JobPosting }> {
    return this.request('GET', `/jobs/${id}`);
  }

  async createJobPosting(data: {
    title: string;
    description?: string;
    departmentName?: string;
    locationName?: string;
    employmentType?: string;
    hourlyRateMin?: number;
    hourlyRateMax?: number;
    requiredSkills?: string[];
  }): Promise<{ job: JobPosting }> {
    return this.request('POST', '/jobs', data);
  }

  async updateJobPosting(id: string, data: Partial<{
    title: string;
    description: string;
    departmentName: string;
    locationName: string;
    employmentType: string;
    hourlyRateMin: number;
    hourlyRateMax: number;
    requiredSkills: string[];
    status: string;
  }>): Promise<{ job: JobPosting }> {
    return this.request('PUT', `/jobs/${id}`, data);
  }

  async applyForJob(jobId: string, data: { coverLetter?: string }): Promise<{ application: any }> {
    return this.request('POST', `/jobs/${jobId}/apply`, data);
  }

  async getMyApplications(): Promise<{ applications: any[] }> {
    return this.request('GET', '/jobs/applications/mine');
  }

  async getCareerOpportunities(): Promise<{ opportunities: JobPosting[] }> {
    // Gets jobs matched to current employee's skills
    return this.request('GET', '/jobs/opportunities');
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(params?: { unreadOnly?: boolean }): Promise<{ notifications: Notification[] }> {
    const query = params?.unreadOnly ? '?unreadOnly=true' : '';
    return this.request('GET', `/notifications${query}`);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.request('POST', `/notifications/${id}/read`);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.request('POST', '/notifications/read-all');
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.request('GET', '/notifications/unread-count');
  }

  // ==================== EMPLOYEES (for managers) ====================

  async getEmployees(params?: {
    status?: string;
    locationId?: string;
    departmentId?: string;
    search?: string;
  }): Promise<{ employees: Employee[] }> {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request('GET', `/employees${query}`);
  }

  async getEmployeeDetail(id: string): Promise<{ employee: Employee }> {
    return this.request('GET', `/employees/${id}`);
  }

  async getEmployeeSkills(employeeId: string): Promise<{ skills: Skill[] }> {
    return this.request('GET', `/employees/${employeeId}/skills`);
  }

  async verifyEmployeeSkill(employeeId: string, skillId: string): Promise<void> {
    await this.request('POST', `/employees/${employeeId}/skills/${skillId}/verify`);
  }

  // ==================== MANAGER APPROVALS ====================

  async getPendingApprovals(): Promise<{
    timeOff: TimeOffRequest[];
    swaps: any[];
    timeEntries: TimeEntry[];
  }> {
    return this.request('GET', '/dashboard/pending-approvals');
  }

  async approveTimeOff(id: string, notes?: string): Promise<void> {
    await this.request('POST', `/time-off/requests/${id}/approve`, { notes });
  }

  async rejectTimeOff(id: string, notes?: string): Promise<void> {
    await this.request('POST', `/time-off/requests/${id}/reject`, { notes });
  }

  async approveSwap(id: string, notes?: string): Promise<void> {
    await this.request('POST', `/shifts/swaps/${id}/approve`, { notes });
  }

  async rejectSwap(id: string, notes?: string): Promise<void> {
    await this.request('POST', `/shifts/swaps/${id}/reject`, { notes });
  }

  async approveTimeEntry(id: string): Promise<void> {
    await this.request('POST', `/time/entries/${id}/approve`);
  }

  async rejectTimeEntry(id: string, reason: string): Promise<void> {
    await this.request('POST', `/time/entries/${id}/reject`, { reason });
  }

  // ==================== LOCATIONS ====================

  async getLocations(): Promise<{ locations: any[] }> {
    return this.request('GET', '/locations');
  }

  // ==================== PROFILE ====================

  async updateProfile(data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    avatarUrl: string;
  }>): Promise<{ user: User }> {
    return this.request('PATCH', '/auth/me', data);
  }

  async updateNotificationPreferences(preferences: Record<string, boolean>): Promise<void> {
    await this.request('PATCH', '/auth/me/notifications', { preferences });
  }

  // ==================== GAMIFICATION ====================

  async getGamificationStats(): Promise<{
    level: number;
    currentXP: number;
    nextLevelXP: number;
    streak: number;
    badges: any[];
    rank: number;
    totalPoints: number;
  }> {
    return this.request('GET', '/gamification/stats');
  }

  async getLeaderboard(period?: 'week' | 'month' | 'all'): Promise<{ leaderboard: any[] }> {
    const query = period ? `?period=${period}` : '';
    return this.request('GET', `/gamification/leaderboard${query}`);
  }

  async getBadges(): Promise<{ badges: any[]; earned: any[] }> {
    return this.request('GET', '/gamification/badges');
  }

  // ==================== REWARDS & AFFILIATE OFFERS ====================

  async getRewards(): Promise<{ rewards: any[]; userPoints: number }> {
    return this.request('GET', '/gamification/rewards');
  }

  async getRewardCatalog(): Promise<{ rewards: any[] }> {
    return this.request('GET', '/gamification/rewards');
  }

  async redeemReward(rewardId: string): Promise<{ redemption: any }> {
    return this.request('POST', `/gamification/rewards/${rewardId}/redeem`);
  }

  async getMyRedemptions(): Promise<{ redemptions: any[] }> {
    return this.request('GET', '/gamification/redemptions');
  }

  async getAffiliateOffers(): Promise<{ offers: any[] }> {
    return this.request('GET', '/gamification/offers');
  }

  async getPointsHistory(limit?: number, offset?: number): Promise<{ history: any[]; total: number }> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    const query = params.toString();
    return this.request('GET', `/gamification/points-history${query ? `?${query}` : ''}`);
  }

  // Manager reward catalog management
  async createReward(data: {
    name: string;
    description?: string;
    category: string;
    pointsCost: number;
    quantityAvailable?: number;
  }): Promise<{ reward: any }> {
    return this.request('POST', '/gamification/rewards', data);
  }

  async updateReward(rewardId: string, data: Partial<{
    name: string;
    description: string;
    category: string;
    pointsCost: number;
    quantityAvailable: number;
    isActive: boolean;
  }>): Promise<{ reward: any }> {
    return this.request('PUT', `/gamification/rewards/${rewardId}`, data);
  }

  async deleteReward(rewardId: string): Promise<void> {
    await this.request('DELETE', `/gamification/rewards/${rewardId}`);
  }

  async getPendingRedemptions(): Promise<{ redemptions: any[] }> {
    return this.request('GET', '/gamification/redemptions/pending');
  }

  async approveRedemption(redemptionId: string): Promise<void> {
    await this.request('POST', `/gamification/redemptions/${redemptionId}/approve`);
  }

  async rejectRedemption(redemptionId: string, notes?: string): Promise<void> {
    await this.request('POST', `/gamification/redemptions/${redemptionId}/reject`, { notes });
  }

  // ==================== TASKS ====================

  async getTasks(params?: { date?: string; status?: string }): Promise<{ tasks: any[] }> {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request('GET', `/tasks${query}`);
  }

  async completeTask(taskId: string, data?: { notes?: string }): Promise<void> {
    await this.request('POST', `/tasks/${taskId}/complete`, data);
  }

  // ==================== EXPENSES ====================

  async getExpenses(params?: { status?: string }): Promise<{ expenses: any[] }> {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request('GET', `/expenses${query}`);
  }

  async submitExpense(data: {
    category: string;
    amount: number;
    description: string;
    date: string;
    receiptUrl?: string;
  }): Promise<{ expense: any }> {
    return this.request('POST', '/expenses', data);
  }
  // ==================== COMPLIANCE ====================

  async getCompliance(): Promise<{ certifications: any[] }> {
    return this.request('GET', '/compliance/my');
  }

  // ==================== INTEGRATIONS ====================

  async getIntegrations(): Promise<{ integrations: any[] }> {
    return this.request('GET', '/integrations');
  }

  async connectIntegration(id: string): Promise<{ integration: any }> {
    return this.request('POST', `/integrations/${id}/connect`);
  }

  async disconnectIntegration(id: string): Promise<{ integration: any }> {
    return this.request('POST', `/integrations/${id}/disconnect`);
  }

  // ==================== BRANDING (PUBLIC) ====================

  async getBranding(orgSlug: string): Promise<{ branding: any }> {
    const baseUrl = this.getBaseUrl();
    const res = await fetch(`${baseUrl}/branding?org=${encodeURIComponent(orgSlug)}`);
    if (!res.ok) throw new Error('Branding not found');
    return res.json();
  }

  // ==================== FEED ====================

  async getFeed(): Promise<{ posts: any[] }> {
    return this.request('GET', '/feed');
  }

  async likeFeedPost(postId: string): Promise<{ post: any }> {
    return this.request('POST', `/feed/${postId}/like`);
  }

  async unlikeFeedPost(postId: string): Promise<void> {
    await this.request('DELETE', `/feed/${postId}/like`);
  }

  async commentOnPost(postId: string, content: string): Promise<{ comment: any }> {
    return this.request('POST', `/feed/${postId}/comments`, { content });
  }

  async createFeedPost(data: {
    content: string;
    type?: string;
    mentioned?: string[];
  }): Promise<{ post: any }> {
    return this.request('POST', '/feed', data);
  }

  // ==================== MANAGER DASHBOARD ====================

  async getManagerDashboard(): Promise<any> {
    return this.request('GET', '/manager/dashboard');
  }

  // ==================== REPORTS & EXPORTS ====================

  async getReports(): Promise<any> {
    return this.request('GET', '/reports');
  }

  async getReportData(reportType: string, params?: Record<string, string>): Promise<any> {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request('GET', `/dashboard/reports/${reportType}${query}`);
  }

  getExportUrl(reportType: string, format: 'csv' | 'pdf', params?: Record<string, string>): string {
    const baseUrl = this.getBaseUrl();
    const base = format === 'pdf'
      ? `${baseUrl}/exports/${reportType}/pdf`
      : `${baseUrl}/exports/${reportType}`;
    const query = params ? `?${new URLSearchParams({ ...params, format })}` : `?format=${format}`;
    return `${base}${query}`;
  }
}

export const api = new ApiService();
export const apiClient = api; // Alias for offline module
