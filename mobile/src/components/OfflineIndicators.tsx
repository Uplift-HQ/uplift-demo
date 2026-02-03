// ============================================================
// OFFLINE UI COMPONENTS
// Visual indicators for offline mode and sync status
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WifiOffIcon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon, CloudIcon } from './Icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useOffline } from '../hooks/useOffline';
import { useTranslation } from 'react-i18next';

// ============================================================
// OFFLINE BANNER
// Shows when device is offline with pending actions count
// ============================================================

interface OfflineBannerProps {
  style?: any;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ style }) => {
  const { isOnline, queueLength, isSyncing } = useOffline();
  const [slideAnim] = useState(new Animated.Value(-100));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else if (isSyncing && queueLength > 0) {
      // Keep visible while syncing
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isOnline, isSyncing, queueLength]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }] },
        isSyncing ? styles.bannerSyncing : styles.bannerOffline,
        style,
      ]}
    >
      <View style={styles.bannerContent}>
        {isSyncing ? (
          <>
            <ActivityIndicator size="small" color={colors.background} />
            <Text style={styles.bannerText}>
              Syncing {queueLength} {queueLength === 1 ? 'action' : 'actions'}...
            </Text>
          </>
        ) : (
          <>
            <WifiOffIcon size={18} color={colors.background} />
            <Text style={styles.bannerText}>
              You're offline
              {queueLength > 0 && ` • ${queueLength} pending`}
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

// ============================================================
// SYNC STATUS BADGE
// Compact indicator showing sync status
// ============================================================

interface SyncStatusBadgeProps {
  onPress?: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ onPress }) => {
  const { isOnline, queueLength, isSyncing, sync } = useOffline();

  const handlePress = async () => {
    if (onPress) {
      onPress();
    } else if (isOnline && queueLength > 0 && !isSyncing) {
      await sync();
    }
  };

  // Don't show if online and no pending actions
  if (isOnline && queueLength === 0) return null;

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        !isOnline && styles.badgeOffline,
        isSyncing && styles.badgeSyncing,
        isOnline && queueLength > 0 && !isSyncing && styles.badgePending,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {isSyncing ? (
        <ActivityIndicator size={14} color={colors.background} />
      ) : !isOnline ? (
        <WifiOffIcon size={14} color={colors.background} />
      ) : (
        <CloudIcon size={14} color={colors.background} />
      )}
      {queueLength > 0 && !isSyncing && (
        <Text style={styles.badgeCount}>{queueLength}</Text>
      )}
    </TouchableOpacity>
  );
};

// ============================================================
// OFFLINE DATA INDICATOR
// Shows when data is from cache
// ============================================================

interface OfflineDataIndicatorProps {
  fromCache: boolean;
  lastUpdated?: number;
}

export const OfflineDataIndicator: React.FC<OfflineDataIndicatorProps> = ({
  fromCache,
  lastUpdated,
}) => {
  if (!fromCache) return null;

  const getTimeAgo = () => {
  const { t } = useTranslation();
    if (!lastUpdated) return 'cached';
    const mins = Math.floor((Date.now() - lastUpdated) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <View style={styles.cacheIndicator}>
      <CloudIcon size={12} color={colors.slate500} />
      <Text style={styles.cacheText}>Cached data • {getTimeAgo()}</Text>
    </View>
  );
};

// ============================================================
// QUEUED ACTION TOAST
// Shows when an action is queued for sync
// ============================================================

interface QueuedActionToastProps {
  visible: boolean;
  message?: string;
  onDismiss: () => void;
}

export const QueuedActionToast: React.FC<QueuedActionToastProps> = ({
  visible,
  message = 'Action saved for sync',
  onDismiss,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { opacity: fadeAnim }]}>
      <CheckCircleIcon size={18} color={colors.background} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// ============================================================
// SYNC CONFLICTS MODAL
// Shows when there are sync conflicts to resolve
// ============================================================

interface SyncConflict {
  action: { type: string; timestamp: number };
  serverData: any;
}

interface SyncConflictsModalProps {
  visible: boolean;
  conflicts: SyncConflict[];
  onResolve: (resolution: 'keep_local' | 'keep_server') => void;
  onClose: () => void;
}

export const SyncConflictsModal: React.FC<SyncConflictsModalProps> = ({
  visible,
  conflicts,
  onResolve,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!visible || conflicts.length === 0) return null;

  return (
    <View style={styles.conflictModal}>
      <View style={styles.conflictContent}>
        <View style={styles.conflictHeader}>
          <AlertCircleIcon size={24} color={colors.warning} />
          <Text style={styles.conflictTitle}>{t('screens.offline.sync_conflict')}</Text>
        </View>
        
        <Text style={styles.conflictText}>
          {conflicts.length} {conflicts.length === 1 ? 'action' : 'actions'} couldn't be synced because the data changed on the server.
        </Text>
        
        <View style={styles.conflictActions}>
          <TouchableOpacity
            style={[styles.conflictButton, styles.conflictButtonSecondary]}
            onPress={() => onResolve('keep_server')}
          >
            <Text style={styles.conflictButtonSecondaryText}>{t('screens.offline.keep_server_data')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.conflictButton, styles.conflictButtonPrimary]}
            onPress={() => onResolve('keep_local')}
          >
            <Text style={styles.conflictButtonPrimaryText}>{t('screens.offline.keep_my_changes')}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.conflictDismiss}>{t('screens.offline.decide_later')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  // Banner
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    zIndex: 1000,
  },
  bannerOffline: {
    backgroundColor: colors.slate700,
  },
  bannerSyncing: {
    backgroundColor: colors.momentum,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bannerText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 32,
    justifyContent: 'center',
  },
  badgeOffline: {
    backgroundColor: colors.slate600,
  },
  badgeSyncing: {
    backgroundColor: colors.momentum,
  },
  badgePending: {
    backgroundColor: colors.warning,
  },
  badgeCount: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
  },

  // Cache indicator
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  cacheText: {
    ...typography.caption,
    color: colors.slate500,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.slate800,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    ...typography.body,
    color: colors.background,
  },

  // Conflict modal
  conflictModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    zIndex: 2000,
  },
  conflictContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  conflictTitle: {
    ...typography.h3,
    color: colors.slate900,
  },
  conflictText: {
    ...typography.body,
    color: colors.slate600,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  conflictActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  conflictButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  conflictButtonPrimary: {
    backgroundColor: colors.momentum,
  },
  conflictButtonPrimaryText: {
    ...typography.bodyBold,
    color: colors.background,
  },
  conflictButtonSecondary: {
    backgroundColor: colors.slate100,
  },
  conflictButtonSecondaryText: {
    ...typography.bodyBold,
    color: colors.slate700,
  },
  conflictDismiss: {
    ...typography.body,
    color: colors.slate500,
    textAlign: 'center',
  },
});
