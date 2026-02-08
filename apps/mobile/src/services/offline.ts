// ============================================================
// OFFLINE SERVICE
// Connectivity detection, offline queue, and sync engine
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Storage keys
const OFFLINE_QUEUE_KEY = '@uplift_offline_queue';
const CACHE_PREFIX = '@uplift_cache_';
const CACHE_META_KEY = '@uplift_cache_meta';
const LAST_SYNC_KEY = '@uplift_last_sync';

// Simple event emitter for React Native
type EventCallback = (...args: any[]) => void;

class SimpleEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (e) {
      }
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Types
export interface QueuedAction {
  id: string;
  type:
    | 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
    | 'shift_request' | 'time_off' | 'skill_update'
    | 'time_off_request' | 'expense_claim' | 'recognition'
    | 'lesson_complete' | 'survey_response' | 'feedback';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  idempotencyKey: string;
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  version: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictItem[];
}

export interface ConflictItem {
  action: QueuedAction;
  serverData: any;
  resolution: 'client_wins' | 'server_wins' | 'manual';
}

// Offline Manager singleton
class OfflineManager extends SimpleEventEmitter {
  private isOnline: boolean = true;
  private queue: QueuedAction[] = [];
  private isSyncing: boolean = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.initialize();
  }

  // -------------------- Initialization --------------------

  async initialize() {
    // Load persisted queue
    await this.loadQueue();
    
    // Set up connectivity listener
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleConnectivityChange);
    
    // Check initial state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;
    
    // Start periodic sync when online
    this.startSyncInterval();
    
  }

  destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  // -------------------- Connectivity --------------------

  private handleConnectivityChange = (state: NetInfoState) => {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected ?? false;
    
    
    this.emit('connectivityChange', this.isOnline);
    
    // If we just came back online, trigger sync
    if (!wasOnline && this.isOnline) {
      this.emit('backOnline');
      this.sync();
    }
    
    if (wasOnline && !this.isOnline) {
      this.emit('goneOffline');
    }
  };

  getIsOnline(): boolean {
    return this.isOnline;
  }

  async checkConnectivity(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  // -------------------- Queue Management --------------------

  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      this.queue = [];
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
    }
  }

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount' | 'idempotencyKey'>): Promise<string> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      idempotencyKey: `${action.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    this.queue.push(queuedAction);
    await this.saveQueue();
    
    this.emit('queueChanged', this.queue.length);
    
    // If online, try to sync immediately
    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }
    
    return queuedAction.id;
  }

  async removeFromQueue(id: string) {
    this.queue = this.queue.filter(a => a.id !== id);
    await this.saveQueue();
    this.emit('queueChanged', this.queue.length);
  }

  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    this.emit('queueChanged', 0);
  }

  // -------------------- Sync Engine --------------------

  private startSyncInterval() {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.queue.length > 0 && !this.isSyncing) {
        this.sync();
      }
    }, 30000);
  }

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: true, synced: 0, failed: 0, conflicts: [] };
    }
    
    if (!this.isOnline) {
      return { success: false, synced: 0, failed: 0, conflicts: [] };
    }
    
    if (this.queue.length === 0) {
      return { success: true, synced: 0, failed: 0, conflicts: [] };
    }
    
    this.isSyncing = true;
    this.emit('syncStart');
    
    
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: []
    };
    
    // Process queue in order (FIFO)
    const toProcess = [...this.queue];
    
    for (const action of toProcess) {
      try {
        const response = await this.executeAction(action);
        
        if (response.success) {
          await this.removeFromQueue(action.id);
          result.synced++;
        } else if (response.conflict) {
          result.conflicts.push({
            action,
            serverData: response.serverData,
            resolution: 'server_wins' // Default resolution
          });
          await this.removeFromQueue(action.id);
        } else {
          // Retry logic
          action.retryCount++;
          if (action.retryCount >= action.maxRetries) {
            await this.removeFromQueue(action.id);
            result.failed++;
          } else {
          }
        }
      } catch (error) {
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          await this.removeFromQueue(action.id);
          result.failed++;
        }
      }
    }
    
    await this.saveQueue();
    
    // Update last sync time
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    
    this.isSyncing = false;
    this.emit('syncComplete', result);

    // Emit sync failure notification if any actions failed
    if (result.failed > 0) {
      this.emit('syncFailed', {
        failedCount: result.failed,
        message: `${result.failed} action${result.failed > 1 ? 's' : ''} couldn't be synced. Tap to retry.`,
      });
    }

    // Emit conflict notification if any conflicts detected
    if (result.conflicts.length > 0) {
      this.emit('syncConflicts', result.conflicts);
    }

    return result;
  }

  private async executeAction(action: QueuedAction): Promise<{ success: boolean; conflict?: boolean; serverData?: any }> {
    const { apiClient } = await import('./api');
    
    try {
      const response = await fetch(apiClient.getBaseUrl() + action.endpoint, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': action.idempotencyKey,
          ...(await apiClient.getAuthHeaders()),
        },
        body: action.method !== 'DELETE' ? JSON.stringify(action.data) : undefined,
      });
      
      if (response.ok) {
        return { success: true };
      }
      
      // Handle specific error codes
      if (response.status === 409) {
        // Conflict - data changed on server
        const serverData = await response.json();
        return { success: false, conflict: true, serverData };
      }
      
      if (response.status === 422) {
        // Validation error - likely stale data, remove from queue
        return { success: false, conflict: true };
      }
      
      // Other errors - will retry
      return { success: false };
      
    } catch (error) {
      // Network error - will retry
      return { success: false };
    }
  }

  async getLastSyncTime(): Promise<number | null> {
    const stored = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored) : null;
  }
}

// ============================================================
// CACHE MANAGER
// Local data storage with expiration
// ============================================================

class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      return memEntry.data as T;
    }
    
    // Check persistent storage
    try {
      const stored = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (stored) {
        const entry: CacheEntry = JSON.parse(stored);
        if (entry.expiresAt > Date.now()) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          return entry.data as T;
        } else {
          // Expired, remove
          await this.remove(key);
        }
      }
    } catch (error) {
    }
    
    return null;
  }

  async set<T>(key: string, data: T, ttlMs?: number): Promise<void> {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMs || this.defaultTTL),
      version: 1,
    };
    
    // Store in memory
    this.memoryCache.set(key, entry);
    
    // Persist to storage
    try {
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
    }
  }

  async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
    }
  }

  // Bulk operations for offline data
  async cacheSchedule(schedule: any[]): Promise<void> {
    await this.set('schedule', schedule, 24 * 60 * 60 * 1000); // 24 hours
  }

  async cacheProfile(profile: any): Promise<void> {
    await this.set('profile', profile, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  async cacheShifts(shifts: any[]): Promise<void> {
    await this.set('shifts', shifts, 4 * 60 * 60 * 1000); // 4 hours
  }

  async cacheSkills(skills: any[]): Promise<void> {
    await this.set('skills', skills, 24 * 60 * 60 * 1000); // 24 hours
  }

  async cacheNotifications(notifications: any[]): Promise<void> {
    await this.set('notifications', notifications, 30 * 60 * 1000); // 30 minutes
  }

  async getSchedule(): Promise<any[] | null> {
    return this.get('schedule');
  }

  async getProfile(): Promise<any | null> {
    return this.get('profile');
  }

  async getShifts(): Promise<any[] | null> {
    return this.get('shifts');
  }

  async getSkills(): Promise<any[] | null> {
    return this.get('skills');
  }

  async getNotifications(): Promise<any[] | null> {
    return this.get('notifications');
  }
}

// ============================================================
// OFFLINE-CAPABLE API WRAPPER
// Wraps API calls with offline support
// ============================================================

export class OfflineApi {
  private offline: OfflineManager;
  private cache: CacheManager;

  constructor(offlineManager: OfflineManager, cacheManager: CacheManager) {
    this.offline = offlineManager;
    this.cache = cacheManager;
  }

  // Clock in with offline support
  async clockIn(data: { shiftId?: string; locationLat?: number; locationLng?: number }): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'clock_in',
        endpoint: '/time/clock-in',
        method: 'POST',
        data: { ...data, offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }
    
    // Online - execute directly
    const { apiClient } = await import('./api');
    await apiClient.publicRequest('/time/clock-in', { method: 'POST', body: data });
    return { queued: false };
  }

  // Clock out with offline support
  async clockOut(data: { timeEntryId?: string; locationLat?: number; locationLng?: number }): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'clock_out',
        endpoint: '/time/clock-out',
        method: 'POST',
        data: { ...data, offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }
    
    const { apiClient } = await import('./api');
    await apiClient.publicRequest('/time/clock-out', { method: 'POST', body: data });
    return { queued: false };
  }

  // Start break with offline support
  async startBreak(timeEntryId: string): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'break_start',
        endpoint: `/time/entries/${timeEntryId}/break/start`,
        method: 'POST',
        data: { offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }
    
    const { apiClient } = await import('./api');
    await apiClient.publicRequest(`/time/entries/${timeEntryId}/break/start`, { method: 'POST' });
    return { queued: false };
  }

  // End break with offline support
  async endBreak(timeEntryId: string): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'break_end',
        endpoint: `/time/entries/${timeEntryId}/break/end`,
        method: 'POST',
        data: { offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }
    
    const { apiClient } = await import('./api');
    await apiClient.publicRequest(`/time/entries/${timeEntryId}/break/end`, { method: 'POST' });
    return { queued: false };
  }

  // Get schedule with cache fallback
  async getSchedule(startDate: string, endDate: string): Promise<{ data: any[]; fromCache: boolean }> {
    // Try to get fresh data if online
    if (this.offline.getIsOnline()) {
      try {
        const { apiClient } = await import('./api');
        const data = await apiClient.publicRequest<{ shifts?: any[] }>(`/scheduling/shifts?startDate=${startDate}&endDate=${endDate}`);
        const shifts = data.shifts || (data as any[]);
        await this.cache.cacheShifts(shifts);
        return { data: shifts, fromCache: false };
      } catch (error) {
      }
    }
    
    // Fall back to cache
    const cached = await this.cache.getShifts();
    if (cached) {
      return { data: cached, fromCache: true };
    }
    
    return { data: [], fromCache: true };
  }

  // Get profile with cache fallback
  async getProfile(): Promise<{ data: any | null; fromCache: boolean }> {
    if (this.offline.getIsOnline()) {
      try {
        const { apiClient } = await import('./api');
        const data = await apiClient.publicRequest('/users/me');
        await this.cache.cacheProfile(data);
        return { data, fromCache: false };
      } catch (error) {
      }
    }
    
    const cached = await this.cache.getProfile();
    return { data: cached, fromCache: !!cached };
  }

  // Get notifications with cache fallback
  async getNotifications(): Promise<{ data: any[]; fromCache: boolean }> {
    if (this.offline.getIsOnline()) {
      try {
        const { apiClient } = await import('./api');
        const data = await apiClient.publicRequest<{ notifications?: any[] }>('/notifications');
        const notifications = data.notifications || (data as any[]);
        await this.cache.cacheNotifications(notifications);
        return { data: notifications, fromCache: false };
      } catch (error) {
      }
    }

    const cached = await this.cache.getNotifications();
    return { data: cached || [], fromCache: true };
  }

  // -------------------- NEW OFFLINE ACTION TYPES --------------------

  // Time Off Request with offline support
  async submitTimeOffRequest(data: {
    startDate: string;
    endDate: string;
    type: string;
    notes?: string;
  }): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'time_off_request',
        endpoint: '/time-off/requests',
        method: 'POST',
        data: { ...data, offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }

    const { apiClient } = await import('./api');
    await apiClient.publicRequest('/time-off/requests', { method: 'POST', body: data });
    return { queued: false };
  }

  // Expense Claim with offline support
  async submitExpenseClaim(data: {
    amount: number;
    category: string;
    description: string;
    receiptBase64?: string;
    date: string;
  }): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'expense_claim',
        endpoint: '/expenses/claims',
        method: 'POST',
        data: { ...data, offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }

    const { apiClient } = await import('./api');
    await apiClient.publicRequest('/expenses/claims', { method: 'POST', body: data });
    return { queued: false };
  }

  // Recognition with offline support
  async giveRecognition(data: {
    toUserId: string;
    value: string;
    message: string;
  }): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'recognition',
        endpoint: '/recognition',
        method: 'POST',
        data: { ...data, offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }

    const { apiClient } = await import('./api');
    await apiClient.publicRequest('/recognition', { method: 'POST', body: data });
    return { queued: false };
  }

  // Lesson Completion with offline support
  async completelesson(data: {
    courseId: string;
    lessonId: string;
    score?: number;
  }): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'lesson_complete',
        endpoint: `/learning/courses/${data.courseId}/lessons/${data.lessonId}/complete`,
        method: 'POST',
        data: { score: data.score, offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }

    const { apiClient } = await import('./api');
    await apiClient.publicRequest(`/learning/courses/${data.courseId}/lessons/${data.lessonId}/complete`, {
      method: 'POST',
      body: { score: data.score },
    });
    return { queued: false };
  }

  // Survey Response with offline support
  async submitSurveyResponse(data: {
    surveyId: string;
    answers: Record<string, any>;
  }): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'survey_response',
        endpoint: `/surveys/${data.surveyId}/respond`,
        method: 'POST',
        data: { answers: data.answers, offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }

    const { apiClient } = await import('./api');
    await apiClient.publicRequest(`/surveys/${data.surveyId}/respond`, {
      method: 'POST',
      body: { answers: data.answers },
    });
    return { queued: false };
  }

  // Feedback with offline support
  async giveFeedback(data: {
    toUserId: string;
    text: string;
    type: 'praise' | 'constructive';
    anonymous?: boolean;
  }): Promise<{ queued: boolean; id?: string }> {
    if (!this.offline.getIsOnline()) {
      const id = await this.offline.enqueue({
        type: 'feedback',
        endpoint: '/performance/feedback',
        method: 'POST',
        data: { ...data, offlineTimestamp: Date.now() },
        maxRetries: 5,
      });
      return { queued: true, id };
    }

    const { apiClient } = await import('./api');
    await apiClient.publicRequest('/performance/feedback', { method: 'POST', body: data });
    return { queued: false };
  }

  // Get payslips with cache fallback
  async getPayslips(): Promise<{ data: any[]; fromCache: boolean }> {
    if (this.offline.getIsOnline()) {
      try {
        const { apiClient } = await import('./api');
        const data = await apiClient.publicRequest<{ payslips?: any[] }>('/payroll/payslips');
        const payslips = data.payslips || (data as any[]);
        await this.cache.set('payslips', payslips, 24 * 60 * 60 * 1000); // 24h TTL
        return { data: payslips, fromCache: false };
      } catch (error) {
      }
    }

    const cached = await this.cache.get('payslips');
    return { data: cached || [], fromCache: true };
  }

  // Get learning courses with cache fallback
  async getLearningCourses(): Promise<{ data: any[]; fromCache: boolean }> {
    if (this.offline.getIsOnline()) {
      try {
        const { apiClient } = await import('./api');
        const data = await apiClient.publicRequest<{ courses?: any[] }>('/learning/courses');
        const courses = data.courses || (data as any[]);
        await this.cache.set('learningCourses', courses, 12 * 60 * 60 * 1000); // 12h TTL
        return { data: courses, fromCache: false };
      } catch (error) {
      }
    }

    const cached = await this.cache.get('learningCourses');
    return { data: cached || [], fromCache: true };
  }
}

// ============================================================
// EXPORTS
// ============================================================

// Singleton instances
export const offlineManager = new OfflineManager();
export const cacheManager = new CacheManager();
export const offlineApi = new OfflineApi(offlineManager, cacheManager);

// Convenience exports
export const isOnline = () => offlineManager.getIsOnline();
export const getQueueLength = () => offlineManager.getQueueLength();
export const syncNow = () => offlineManager.sync();

// React hooks support
export const subscribeToConnectivity = (callback: (isOnline: boolean) => void) => {
  offlineManager.on('connectivityChange', callback);
  return () => offlineManager.off('connectivityChange', callback);
};

export const subscribeToQueue = (callback: (length: number) => void) => {
  offlineManager.on('queueChanged', callback);
  return () => offlineManager.off('queueChanged', callback);
};

export const subscribeToSync = (callbacks: {
  onStart?: () => void;
  onComplete?: (result: SyncResult) => void;
  onFailed?: (info: { failedCount: number; message: string }) => void;
  onConflicts?: (conflicts: ConflictItem[]) => void;
}) => {
  if (callbacks.onStart) offlineManager.on('syncStart', callbacks.onStart);
  if (callbacks.onComplete) offlineManager.on('syncComplete', callbacks.onComplete);
  if (callbacks.onFailed) offlineManager.on('syncFailed', callbacks.onFailed);
  if (callbacks.onConflicts) offlineManager.on('syncConflicts', callbacks.onConflicts);

  return () => {
    if (callbacks.onStart) offlineManager.off('syncStart', callbacks.onStart);
    if (callbacks.onComplete) offlineManager.off('syncComplete', callbacks.onComplete);
    if (callbacks.onFailed) offlineManager.off('syncFailed', callbacks.onFailed);
    if (callbacks.onConflicts) offlineManager.off('syncConflicts', callbacks.onConflicts);
  };
};
