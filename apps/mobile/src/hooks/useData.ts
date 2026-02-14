// ============================================================
// UPLIFT DATA HOOKS
// React hooks for fetching and managing API data
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { api, Shift, Skill, JobPosting, TimeEntry, Notification, DashboardData } from '../services/api';

// Generic hook for data fetching with loading/error states
function useApiCall<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [...dependencies]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ==================== DASHBOARD ====================

export function useDashboard(locationId?: string) {
  return useApiCall<DashboardData>(
    () => api.getDashboard({ locationId }),
    [locationId]
  );
}

// ==================== SHIFTS ====================

export function useMyShifts(startDate?: string, endDate?: string) {
  return useApiCall<{ shifts: Shift[] }>(
    () => api.getMyShifts({ startDate, endDate }),
    [startDate, endDate]
  );
}

export function useOpenShifts(locationId?: string) {
  return useApiCall<{ shifts: Shift[] }>(
    () => api.getOpenShifts({ locationId }),
    [locationId]
  );
}

export function useShiftDetail(shiftId: string) {
  return useApiCall<{ shift: Shift }>(
    () => api.getShiftDetail(shiftId),
    [shiftId]
  );
}

export function useShiftSwaps(status?: string) {
  return useApiCall<{ swaps: any[] }>(
    () => api.getShiftSwaps({ status }),
    [status]
  );
}

// ==================== TIME TRACKING ====================

export function useClockStatus() {
  return useApiCall<{ isClocked: boolean; entry?: TimeEntry }>(
    () => api.getCurrentClockStatus(),
    []
  );
}

export function useTimeEntries(startDate?: string, endDate?: string, status?: string) {
  return useApiCall<{ entries: TimeEntry[] }>(
    () => api.getTimeEntries({ startDate, endDate, status }),
    [startDate, endDate, status]
  );
}

// ==================== TIME OFF ====================

export function useTimeOffPolicies() {
  return useApiCall<{ policies: any[] }>(
    () => api.getTimeOffPolicies(),
    []
  );
}

export function useTimeOffBalances() {
  return useApiCall<{ balances: any[] }>(
    () => api.getTimeOffBalances(),
    []
  );
}

export function useMyTimeOffRequests() {
  return useApiCall<{ requests: any[] }>(
    () => api.getMyTimeOffRequests(),
    []
  );
}

// ==================== SKILLS ====================

export function useSkills() {
  return useApiCall<{ skills: Skill[] }>(
    () => api.getSkills(),
    []
  );
}

export function useMySkills() {
  return useApiCall<{ skills: Skill[] }>(
    () => api.getMySkills(),
    []
  );
}

// ==================== SKILL VERIFICATION (MANAGER) ====================

export function useSkillVerificationRequests() {
  return useApiCall<{ requests: any[] }>(
    () => api.getSkillVerificationRequests(),
    []
  );
}

// ==================== JOBS & CAREER ====================

export function useJobPostings(status?: string) {
  return useApiCall<{ jobs: JobPosting[] }>(
    () => api.getJobPostings({ status: status || 'open' }),
    [status]
  );
}

export function useJobDetail(jobId: string) {
  return useApiCall<{ job: JobPosting }>(
    () => api.getJobDetail(jobId),
    [jobId]
  );
}

export function useCareerOpportunities() {
  return useApiCall<{ opportunities: JobPosting[] }>(
    () => api.getCareerOpportunities(),
    []
  );
}

export function useMyApplications() {
  return useApiCall<{ applications: any[] }>(
    () => api.getMyApplications(),
    []
  );
}

// ==================== NOTIFICATIONS ====================

export function useNotifications(unreadOnly?: boolean) {
  return useApiCall<{ notifications: Notification[] }>(
    () => api.getNotifications({ unreadOnly }),
    [unreadOnly]
  );
}

export function useUnreadCount() {
  return useApiCall<{ count: number }>(
    () => api.getUnreadCount(),
    []
  );
}

// ==================== GAMIFICATION ====================

export function useGamificationStats() {
  return useApiCall<{
    level: number;
    currentXP: number;
    nextLevelXP: number;
    streak: number;
    badges: any[];
    rank: number;
    totalPoints: number;
  }>(
    () => api.getGamificationStats(),
    []
  );
}

export function useLeaderboard(period?: 'week' | 'month' | 'all') {
  return useApiCall<{ leaderboard: any[] }>(
    () => api.getLeaderboard(period),
    [period]
  );
}

export function useBadges() {
  return useApiCall<{ badges: any[]; earned: any[] }>(
    () => api.getBadges(),
    []
  );
}

// ==================== TASKS ====================

export function useTasks(date?: string, status?: string) {
  return useApiCall<{ tasks: any[] }>(
    () => api.getTasks({ date, status }),
    [date, status]
  );
}

// ==================== REWARDS ====================

export function useRewards() {
  return useApiCall<{ rewards: any[]; userPoints: number }>(
    () => api.getRewards(),
    []
  );
}

export function useRewardCatalog() {
  return useApiCall<{ rewards: any[] }>(
    () => api.getRewardCatalog(),
    []
  );
}

export function useAffiliateOffers() {
  return useApiCall<{ offers: any[] }>(
    () => api.getAffiliateOffers(),
    []
  );
}

export function useMyRedemptions() {
  return useApiCall<{ redemptions: any[] }>(
    () => api.getMyRedemptions(),
    []
  );
}

export function usePointsHistory(limit?: number, offset?: number) {
  return useApiCall<{ history: any[]; total: number }>(
    () => api.getPointsHistory(limit, offset),
    [limit, offset]
  );
}

export function usePendingRedemptions() {
  return useApiCall<{ redemptions: any[] }>(
    () => api.getPendingRedemptions(),
    []
  );
}

// ==================== FEED ====================

export function useFeed() {
  return useApiCall<{ posts: any[] }>(
    () => api.getFeed(),
    []
  );
}

// ==================== EXPENSES ====================

export function useExpenses(status?: string) {
  return useApiCall<{ expenses: any[] }>(
    () => api.getExpenses({ status }),
    [status]
  );
}

// ==================== MANAGER: DASHBOARD ====================

export function useManagerDashboard() {
  return useApiCall<any>(
    () => api.getManagerDashboard(),
    []
  );
}

// ==================== MANAGER: EMPLOYEES ====================

export function useEmployees(params?: {
  status?: string;
  locationId?: string;
  departmentId?: string;
  search?: string;
}) {
  return useApiCall<{ employees: any[] }>(
    () => api.getEmployees(params),
    [params?.status, params?.locationId, params?.departmentId, params?.search]
  );
}

export function useEmployeeDetail(employeeId: string) {
  return useApiCall<{ employee: any }>(
    () => api.getEmployeeDetail(employeeId),
    [employeeId]
  );
}

export function useEmployeeSkills(employeeId: string) {
  return useApiCall<{ skills: Skill[] }>(
    () => api.getEmployeeSkills(employeeId),
    [employeeId]
  );
}

// ==================== MANAGER: APPROVALS ====================

export function usePendingApprovals() {
  return useApiCall<{
    timeOff: any[];
    swaps: any[];
    timeEntries: any[];
  }>(
    () => api.getPendingApprovals(),
    []
  );
}

// ==================== MANAGER: REPORTS ====================

export function useReports() {
  return useApiCall<any>(
    () => api.getReports(),
    []
  );
}

// ==================== COMPLIANCE ====================

export function useCompliance() {
  return useApiCall<{ certifications: any[] }>(
    () => api.getCompliance(),
    []
  );
}

// ==================== INTEGRATIONS ====================

export function useIntegrations() {
  return useApiCall<{ integrations: any[] }>(
    () => api.getIntegrations(),
    []
  );
}

// ==================== LOCATIONS ====================

export function useLocations() {
  return useApiCall<{ locations: any[] }>(
    () => api.getLocations(),
    []
  );
}
