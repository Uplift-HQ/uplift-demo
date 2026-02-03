// ============================================================
// UPLIFT DATA HOOKS
// React hooks for fetching and managing API data
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';
import { api, Shift, Skill, JobPosting, TimeEntry, Notification, DashboardData } from '../services/api';
import {
  DEMO_DASHBOARD,
  DEMO_SHIFTS,
  DEMO_OPEN_SHIFTS,
  DEMO_TASKS,
  DEMO_SKILLS,
  DEMO_JOBS,
  DEMO_LEADERBOARD,
  DEMO_BADGES,
  DEMO_NOTIFICATIONS,
  DEMO_REWARDS,
  DEMO_FEED,
  DEMO_MANAGER_DASHBOARD,
  DEMO_TEAM,
  DEMO_APPROVALS,
  DEMO_REPORTS,
  DEMO_AFFILIATE_OFFERS,
  DEMO_REWARD_CATALOG,
  DEMO_SHIFT_SWAPS,
  DEMO_TIME_ENTRIES,
  DEMO_TIME_OFF_POLICIES,
  DEMO_TIME_OFF_REQUESTS,
  DEMO_SKILL_VERIFICATION_REQUESTS,
  DEMO_APPLICATIONS,
  DEMO_REDEMPTIONS,
  DEMO_POINTS_HISTORY,
  DEMO_PENDING_REDEMPTIONS,
  DEMO_EXPENSES,
  DEMO_COMPLIANCE,
  DEMO_INTEGRATIONS,
  DEMO_LOCATIONS,
} from '../services/demoData';

// Check for demo mode via environment variable (set at build time)
const DEMO_MODE =
  Constants.expoConfig?.extra?.demoMode === true ||
  process.env.EXPO_PUBLIC_DEMO_MODE === 'true' ||
  // For web builds, check if we're on a demo domain
  (typeof window !== 'undefined' && window.location?.hostname?.includes('demo'));

// Generic hook for data fetching with loading/error states
// Falls back to demoData when API is unavailable OR returns empty data
// In DEMO_MODE, returns demoData directly without making API calls
function useApiCall<T>(
  fetcher: () => Promise<T>,
  demoData: T | null,
  dependencies: any[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  // In demo mode, return demo data immediately
  const [data, setData] = useState<T | null>(DEMO_MODE ? demoData : null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);

  // Helper to check if data is empty (null, undefined, empty object, or object with only empty arrays)
  const isEmptyData = (result: any): boolean => {
    if (result === null || result === undefined) return true;
    if (typeof result !== 'object') return false;
    // Check if all values are empty arrays
    const values = Object.values(result);
    if (values.length === 0) return true;
    return values.every(v => Array.isArray(v) && v.length === 0);
  };

  const fetch = useCallback(async () => {
    // In demo mode, just use demo data without making API calls
    if (DEMO_MODE) {
      setData(demoData);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      // Use demo data if API returns empty/null
      if (isEmptyData(result) && demoData) {
        setData(demoData);
      } else {
        setData(result);
      }
    } catch (e: any) {
      // Graceful fallback: use demo data so screens never crash
      if (demoData) {
        setData(demoData);
        setError(null);
      } else {
        setError(e.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ==================== DASHBOARD ====================

export function useDashboard(locationId?: string) {
  return useApiCall<DashboardData>(
    () => api.getDashboard({ locationId }),
    DEMO_DASHBOARD as any,
    [locationId]
  );
}

// ==================== SHIFTS ====================

export function useMyShifts(startDate?: string, endDate?: string) {
  return useApiCall<{ shifts: Shift[] }>(
    () => api.getMyShifts({ startDate, endDate }),
    DEMO_SHIFTS as any,
    [startDate, endDate]
  );
}

export function useOpenShifts(locationId?: string) {
  return useApiCall<{ shifts: Shift[] }>(
    () => api.getOpenShifts({ locationId }),
    DEMO_OPEN_SHIFTS as any,
    [locationId]
  );
}

export function useShiftDetail(shiftId: string) {
  const demoShift = DEMO_SHIFTS.shifts.find(s => s.id === shiftId) || DEMO_SHIFTS.shifts[0];
  return useApiCall<{ shift: Shift }>(
    () => api.getShiftDetail(shiftId),
    { shift: demoShift } as any,
    [shiftId]
  );
}

export function useShiftSwaps(status?: string) {
  return useApiCall<{ swaps: any[] }>(
    () => api.getShiftSwaps({ status }),
    DEMO_SHIFT_SWAPS,
    [status]
  );
}

// ==================== TIME TRACKING ====================

export function useClockStatus() {
  return useApiCall<{ isClocked: boolean; entry?: TimeEntry }>(
    () => api.getCurrentClockStatus(),
    { isClocked: false },
    []
  );
}

export function useTimeEntries(startDate?: string, endDate?: string, status?: string) {
  return useApiCall<{ entries: TimeEntry[] }>(
    () => api.getTimeEntries({ startDate, endDate, status }),
    DEMO_TIME_ENTRIES as any,
    [startDate, endDate, status]
  );
}

// ==================== TIME OFF ====================

export function useTimeOffPolicies() {
  return useApiCall<{ policies: any[] }>(
    () => api.getTimeOffPolicies(),
    DEMO_TIME_OFF_POLICIES,
    []
  );
}

export function useTimeOffBalances() {
  return useApiCall<{ balances: any[] }>(
    () => api.getTimeOffBalances(),
    { balances: [{ type: 'Annual Leave', balance: 18, used: 5 }, { type: 'Sick Leave', balance: 10, used: 2 }] },
    []
  );
}

export function useMyTimeOffRequests() {
  return useApiCall<{ requests: any[] }>(
    () => api.getMyTimeOffRequests(),
    DEMO_TIME_OFF_REQUESTS,
    []
  );
}

// ==================== SKILLS ====================

export function useSkills() {
  return useApiCall<{ skills: Skill[] }>(
    () => api.getSkills(),
    DEMO_SKILLS as any,
    []
  );
}

export function useMySkills() {
  return useApiCall<{ skills: Skill[] }>(
    () => api.getMySkills(),
    DEMO_SKILLS as any,
    []
  );
}

// ==================== SKILL VERIFICATION (MANAGER) ====================

export function useSkillVerificationRequests() {
  return useApiCall<{ requests: any[] }>(
    () => api.getSkillVerificationRequests(),
    DEMO_SKILL_VERIFICATION_REQUESTS,
    []
  );
}

// ==================== JOBS & CAREER ====================

export function useJobPostings(status?: string) {
  return useApiCall<{ jobs: JobPosting[] }>(
    () => api.getJobPostings({ status: status || 'open' }),
    DEMO_JOBS as any,
    [status]
  );
}

export function useJobDetail(jobId: string) {
  const demoJob = DEMO_JOBS.jobs.find(j => j.id === jobId) || DEMO_JOBS.jobs[0];
  return useApiCall<{ job: JobPosting }>(
    () => api.getJobDetail(jobId),
    { job: demoJob } as any,
    [jobId]
  );
}

export function useCareerOpportunities() {
  return useApiCall<{ opportunities: JobPosting[] }>(
    () => api.getCareerOpportunities(),
    { opportunities: DEMO_JOBS.jobs } as any,
    []
  );
}

export function useMyApplications() {
  return useApiCall<{ applications: any[] }>(
    () => api.getMyApplications(),
    DEMO_APPLICATIONS,
    []
  );
}

// ==================== NOTIFICATIONS ====================

export function useNotifications(unreadOnly?: boolean) {
  return useApiCall<{ notifications: Notification[] }>(
    () => api.getNotifications({ unreadOnly }),
    DEMO_NOTIFICATIONS as any,
    [unreadOnly]
  );
}

export function useUnreadCount() {
  return useApiCall<{ count: number }>(
    () => api.getUnreadCount(),
    { count: DEMO_NOTIFICATIONS.unreadCount },
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
    {
      level: DEMO_DASHBOARD.stats.level,
      currentXP: DEMO_DASHBOARD.stats.xp,
      nextLevelXP: DEMO_DASHBOARD.stats.nextLevelXp,
      streak: DEMO_DASHBOARD.stats.streak,
      badges: DEMO_BADGES.badges,
      rank: DEMO_DASHBOARD.stats.rank,
      totalPoints: DEMO_DASHBOARD.stats.xp,
    },
    []
  );
}

export function useLeaderboard(period?: 'week' | 'month' | 'all') {
  return useApiCall<{ leaderboard: any[] }>(
    () => api.getLeaderboard(period),
    { leaderboard: DEMO_LEADERBOARD.entries },
    [period]
  );
}

export function useBadges() {
  return useApiCall<{ badges: any[]; earned: any[] }>(
    () => api.getBadges(),
    { badges: DEMO_BADGES.badges, earned: DEMO_BADGES.badges.filter(b => b.earned) },
    []
  );
}

// ==================== TASKS ====================

export function useTasks(date?: string, status?: string) {
  return useApiCall<{ tasks: any[] }>(
    () => api.getTasks({ date, status }),
    DEMO_TASKS,
    [date, status]
  );
}

// ==================== REWARDS ====================

export function useRewards() {
  return useApiCall<{ rewards: any[]; userPoints: number }>(
    () => api.getRewards(),
    DEMO_REWARDS,
    []
  );
}

export function useRewardCatalog() {
  return useApiCall<{ rewards: any[] }>(
    () => api.getRewardCatalog(),
    DEMO_REWARD_CATALOG,
    []
  );
}

export function useAffiliateOffers() {
  return useApiCall<{ offers: any[] }>(
    () => api.getAffiliateOffers(),
    DEMO_AFFILIATE_OFFERS,
    []
  );
}

export function useMyRedemptions() {
  return useApiCall<{ redemptions: any[] }>(
    () => api.getMyRedemptions(),
    DEMO_REDEMPTIONS,
    []
  );
}

export function usePointsHistory(limit?: number, offset?: number) {
  return useApiCall<{ history: any[]; total: number }>(
    () => api.getPointsHistory(limit, offset),
    DEMO_POINTS_HISTORY,
    [limit, offset]
  );
}

export function usePendingRedemptions() {
  return useApiCall<{ redemptions: any[] }>(
    () => api.getPendingRedemptions(),
    DEMO_PENDING_REDEMPTIONS,
    []
  );
}

// ==================== FEED ====================

export function useFeed() {
  return useApiCall<{ posts: any[] }>(
    () => api.getFeed(),
    DEMO_FEED,
    []
  );
}

// ==================== EXPENSES ====================

export function useExpenses(status?: string) {
  return useApiCall<{ expenses: any[] }>(
    () => api.getExpenses({ status }),
    DEMO_EXPENSES,
    [status]
  );
}

// ==================== MANAGER: DASHBOARD ====================

export function useManagerDashboard() {
  return useApiCall<any>(
    () => api.getManagerDashboard(),
    DEMO_MANAGER_DASHBOARD,
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
    { employees: DEMO_TEAM.members },
    [params?.status, params?.locationId, params?.departmentId, params?.search]
  );
}

export function useEmployeeDetail(employeeId: string) {
  const demoEmployee = DEMO_TEAM.members.find(m => m.id === employeeId) || DEMO_TEAM.members[0];
  return useApiCall<{ employee: any }>(
    () => api.getEmployeeDetail(employeeId),
    { employee: demoEmployee },
    [employeeId]
  );
}

export function useEmployeeSkills(employeeId: string) {
  return useApiCall<{ skills: Skill[] }>(
    () => api.getEmployeeSkills(employeeId),
    DEMO_SKILLS as any,
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
    {
      timeOff: DEMO_APPROVALS.items.filter(a => a.type === 'Time Off'),
      swaps: DEMO_APPROVALS.items.filter(a => a.type === 'Shift Swap'),
      timeEntries: DEMO_APPROVALS.items.filter(a => a.type === 'Expense'),
    },
    []
  );
}

// ==================== MANAGER: REPORTS ====================

export function useReports() {
  return useApiCall<any>(
    () => api.getReports(),
    DEMO_REPORTS,
    []
  );
}

// ==================== COMPLIANCE ====================

export function useCompliance() {
  return useApiCall<{ certifications: any[] }>(
    () => api.getCompliance(),
    DEMO_COMPLIANCE,
    []
  );
}

// ==================== INTEGRATIONS ====================

export function useIntegrations() {
  return useApiCall<{ integrations: any[] }>(
    () => api.getIntegrations(),
    DEMO_INTEGRATIONS,
    []
  );
}

// ==================== LOCATIONS ====================

export function useLocations() {
  return useApiCall<{ locations: any[] }>(
    () => api.getLocations(),
    { locations: DEMO_LOCATIONS },
    []
  );
}
