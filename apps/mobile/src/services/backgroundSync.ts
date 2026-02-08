// ============================================================
// BACKGROUND SYNC SERVICE
// Uses expo-background-fetch + expo-task-manager for sync
// when app is in background
// ============================================================

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { offlineManager, cacheManager } from './offline';

// Task name for background sync
export const BACKGROUND_SYNC_TASK = 'UPLIFT_BACKGROUND_SYNC';

// Background sync interval in seconds (minimum 15 minutes on iOS)
const SYNC_INTERVAL_SECONDS = 15 * 60; // 15 minutes

// ============================================================
// TASK DEFINITION
// This runs when the app is in the background
// ============================================================

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const now = Date.now();

    // Check if we have pending actions to sync
    const queueLength = offlineManager.getQueueLength();

    if (queueLength > 0) {
      // Attempt to sync pending actions
      const result = await offlineManager.sync();

      if (result.synced > 0) {
        // Successfully synced some actions
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }

      if (result.failed > 0) {
        // Some actions failed, will retry next time
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    }

    // No data to sync
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ============================================================
// BACKGROUND SYNC MANAGER
// ============================================================

class BackgroundSyncService {
  private isRegistered: boolean = false;

  // Register the background sync task
  async register(): Promise<boolean> {
    try {
      // Check if background fetch is available
      const status = await BackgroundFetch.getStatusAsync();

      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        return false;
      }

      if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        return false;
      }

      // Register the background fetch task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: SYNC_INTERVAL_SECONDS,
        stopOnTerminate: false, // Continue running after app is terminated (Android)
        startOnBoot: true, // Start on device boot (Android)
      });

      this.isRegistered = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  // Unregister the background sync task
  async unregister(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      this.isRegistered = false;
    } catch (error) {
      // Task may not be registered
    }
  }

  // Check if background sync is registered
  async isTaskRegistered(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      this.isRegistered = isRegistered;
      return isRegistered;
    } catch (error) {
      return false;
    }
  }

  // Get the current status of background fetch
  async getStatus(): Promise<{
    available: boolean;
    status: BackgroundFetch.BackgroundFetchStatus;
    registered: boolean;
  }> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      const registered = await this.isTaskRegistered();

      return {
        available: status === BackgroundFetch.BackgroundFetchStatus.Available,
        status,
        registered,
      };
    } catch (error) {
      return {
        available: false,
        status: BackgroundFetch.BackgroundFetchStatus.Restricted,
        registered: false,
      };
    }
  }

  // Manually trigger a sync (useful for testing)
  async triggerSync(): Promise<void> {
    try {
      await offlineManager.sync();
    } catch (error) {
      // Sync failed
    }
  }

  // Pre-fetch data that should be available offline
  async prefetchOfflineData(): Promise<void> {
    try {
      const { apiClient } = await import('./api');

      // Fetch and cache critical data in parallel
      const promises = [
        // Profile data
        apiClient.publicRequest('/users/me').then((data) => {
          cacheManager.cacheProfile(data);
        }),

        // Upcoming shifts (next 7 days)
        apiClient
          .publicRequest('/scheduling/shifts?upcoming=true')
          .then((data: any) => {
            cacheManager.cacheShifts(data.shifts || data);
          }),

        // Skills
        apiClient.publicRequest('/skills').then((data: any) => {
          cacheManager.cacheSkills(data.skills || data);
        }),
      ];

      await Promise.allSettled(promises);
    } catch (error) {
      // Prefetch failed, will use cached data
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

export const backgroundSync = new BackgroundSyncService();

// Helper to initialize background sync when app starts
export async function initializeBackgroundSync(): Promise<void> {
  try {
    const status = await backgroundSync.getStatus();

    if (status.available && !status.registered) {
      await backgroundSync.register();
    }

    // Also prefetch data when online
    if (offlineManager.getIsOnline()) {
      backgroundSync.prefetchOfflineData();
    }
  } catch (error) {
    // Background sync initialization failed
  }
}

// Export for use in settings to toggle background sync
export async function toggleBackgroundSync(enabled: boolean): Promise<boolean> {
  if (enabled) {
    return backgroundSync.register();
  } else {
    await backgroundSync.unregister();
    return true;
  }
}
