// ============================================================
// BACKGROUND SYNC SERVICE
// STUB - Background sync disabled for demo app
// ============================================================

// Task name for background sync
export const BACKGROUND_SYNC_TASK = 'UPLIFT_BACKGROUND_SYNC';

// ============================================================
// BACKGROUND SYNC MANAGER (STUB)
// ============================================================

class BackgroundSyncService {
  // Register the background sync task
  async register(): Promise<boolean> {
    return false;
  }

  // Unregister the background sync task
  async unregister(): Promise<void> {
    // No-op for demo
  }

  // Check if background sync is registered
  async isTaskRegistered(): Promise<boolean> {
    return false;
  }

  // Get the current status of background fetch
  async getStatus(): Promise<{
    available: boolean;
    status: number;
    registered: boolean;
  }> {
    return {
      available: false,
      status: 0,
      registered: false,
    };
  }

  // Manually trigger a sync (useful for testing)
  async triggerSync(): Promise<void> {
    // No-op for demo
  }

  // Pre-fetch data that should be available offline
  async prefetchOfflineData(): Promise<void> {
    // No-op for demo
  }
}

// ============================================================
// EXPORTS
// ============================================================

export const backgroundSync = new BackgroundSyncService();

// Helper to initialize background sync when app starts
export async function initializeBackgroundSync(): Promise<void> {
  // No-op for demo
}

// Export for use in settings to toggle background sync
export async function toggleBackgroundSync(_enabled: boolean): Promise<boolean> {
  return false;
}
