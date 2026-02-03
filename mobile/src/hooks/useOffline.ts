// ============================================================
// useOffline Hook
// React hook for offline mode integration
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  offlineManager,
  cacheManager,
  offlineApi,
  subscribeToConnectivity,
  subscribeToQueue,
  subscribeToSync,
  SyncResult,
  QueuedAction,
} from '../services/offline';

export interface UseOfflineState {
  isOnline: boolean;
  queueLength: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
  lastSyncResult: SyncResult | null;
}

export interface UseOfflineActions {
  sync: () => Promise<SyncResult>;
  clearQueue: () => Promise<void>;
  getQueue: () => QueuedAction[];
}

export function useOffline(): UseOfflineState & UseOfflineActions {
  const [isOnline, setIsOnline] = useState(offlineManager.getIsOnline());
  const [queueLength, setQueueLength] = useState(offlineManager.getQueueLength());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    // Load last sync time
    offlineManager.getLastSyncTime().then(setLastSyncTime);

    // Subscribe to connectivity changes
    const unsubConnectivity = subscribeToConnectivity(setIsOnline);
    
    // Subscribe to queue changes
    const unsubQueue = subscribeToQueue(setQueueLength);
    
    // Subscribe to sync events
    const unsubSync = subscribeToSync({
      onStart: () => setIsSyncing(true),
      onComplete: (result) => {
        setIsSyncing(false);
        setLastSyncResult(result);
        setLastSyncTime(Date.now());
      },
    });

    return () => {
      unsubConnectivity();
      unsubQueue();
      unsubSync();
    };
  }, []);

  const sync = useCallback(async () => {
    return offlineManager.sync();
  }, []);

  const clearQueue = useCallback(async () => {
    return offlineManager.clearQueue();
  }, []);

  const getQueue = useCallback(() => {
    return offlineManager.getQueue();
  }, []);

  return {
    isOnline,
    queueLength,
    isSyncing,
    lastSyncTime,
    lastSyncResult,
    sync,
    clearQueue,
    getQueue,
  };
}

// ============================================================
// useOfflineData Hook
// Hook for fetching data with offline fallback
// ============================================================

export interface UseOfflineDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  refresh: () => Promise<void>;
}

export function useOfflineSchedule(startDate: string, endDate: string): UseOfflineDataState<any[]> {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await offlineApi.getSchedule(startDate, endDate);
      setData(result.data);
      setFromCache(result.fromCache);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, fromCache, refresh: fetchData };
}

export function useOfflineProfile(): UseOfflineDataState<any> {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await offlineApi.getProfile();
      setData(result.data);
      setFromCache(result.fromCache);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, fromCache, refresh: fetchData };
}

export function useOfflineNotifications(): UseOfflineDataState<any[]> {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await offlineApi.getNotifications();
      setData(result.data);
      setFromCache(result.fromCache);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, fromCache, refresh: fetchData };
}

// ============================================================
// useOfflineAction Hook
// Hook for executing actions with offline queue support
// ============================================================

export interface UseOfflineActionState {
  loading: boolean;
  error: Error | null;
  queued: boolean;
  queueId: string | null;
}

export function useClockIn() {
  const [state, setState] = useState<UseOfflineActionState>({
    loading: false,
    error: null,
    queued: false,
    queueId: null,
  });

  const execute = useCallback(async (data: { shiftId?: string; locationLat?: number; locationLng?: number }) => {
    setState({ loading: true, error: null, queued: false, queueId: null });
    
    try {
      const result = await offlineApi.clockIn(data);
      setState({
        loading: false,
        error: null,
        queued: result.queued,
        queueId: result.id || null,
      });
      return result;
    } catch (err) {
      setState({
        loading: false,
        error: err as Error,
        queued: false,
        queueId: null,
      });
      throw err;
    }
  }, []);

  return { ...state, execute };
}

export function useClockOut() {
  const [state, setState] = useState<UseOfflineActionState>({
    loading: false,
    error: null,
    queued: false,
    queueId: null,
  });

  const execute = useCallback(async (data: { timeEntryId?: string; locationLat?: number; locationLng?: number }) => {
    setState({ loading: true, error: null, queued: false, queueId: null });
    
    try {
      const result = await offlineApi.clockOut(data);
      setState({
        loading: false,
        error: null,
        queued: result.queued,
        queueId: result.id || null,
      });
      return result;
    } catch (err) {
      setState({
        loading: false,
        error: err as Error,
        queued: false,
        queueId: null,
      });
      throw err;
    }
  }, []);

  return { ...state, execute };
}

export function useBreak() {
  const [state, setState] = useState<UseOfflineActionState>({
    loading: false,
    error: null,
    queued: false,
    queueId: null,
  });

  const startBreak = useCallback(async (timeEntryId: string) => {
    setState({ loading: true, error: null, queued: false, queueId: null });
    
    try {
      const result = await offlineApi.startBreak(timeEntryId);
      setState({
        loading: false,
        error: null,
        queued: result.queued,
        queueId: result.id || null,
      });
      return result;
    } catch (err) {
      setState({
        loading: false,
        error: err as Error,
        queued: false,
        queueId: null,
      });
      throw err;
    }
  }, []);

  const endBreak = useCallback(async (timeEntryId: string) => {
    setState({ loading: true, error: null, queued: false, queueId: null });
    
    try {
      const result = await offlineApi.endBreak(timeEntryId);
      setState({
        loading: false,
        error: null,
        queued: result.queued,
        queueId: result.id || null,
      });
      return result;
    } catch (err) {
      setState({
        loading: false,
        error: err as Error,
        queued: false,
        queueId: null,
      });
      throw err;
    }
  }, []);

  return { ...state, startBreak, endBreak };
}
