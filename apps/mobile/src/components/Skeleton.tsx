import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius: customBorderRadius = borderRadius.md,
  style 
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.slate200,
          borderRadius: customBorderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// 1. List Item Skeleton (for jobs, shifts, etc.)
export const ListItemSkeleton: React.FC = () => (
  <View style={styles.listItem}>
    <Skeleton width={48} height={48} borderRadius={borderRadius.lg} />
    <View style={styles.listItemContent}>
      <Skeleton width="70%" height={18} style={{ marginBottom: spacing.xs }} />
      <Skeleton width="90%" height={14} style={{ marginBottom: spacing.xs }} />
      <Skeleton width="50%" height={12} />
    </View>
  </View>
);

// 2. Card Skeleton (for stats, dashboard cards)
export const CardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Skeleton width={40} height={40} borderRadius={borderRadius.md} />
      <View style={{ flex: 1, marginStart: spacing.md }}>
        <Skeleton width="60%" height={16} style={{ marginBottom: spacing.xs }} />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
    <Skeleton width="100%" height={80} style={{ marginTop: spacing.md }} />
    <View style={styles.cardFooter}>
      <Skeleton width="30%" height={14} />
      <Skeleton width="30%" height={14} />
    </View>
  </View>
);

// 3. Profile Skeleton
export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profile}>
    <Skeleton width={80} height={80} borderRadius={borderRadius.full} style={{ marginBottom: spacing.md }} />
    <Skeleton width="60%" height={24} style={{ marginBottom: spacing.xs }} />
    <Skeleton width="40%" height={16} style={{ marginBottom: spacing.lg }} />
    <Skeleton width="100%" height={48} borderRadius={borderRadius.lg} style={{ marginBottom: spacing.sm }} />
    <Skeleton width="100%" height={48} borderRadius={borderRadius.lg} style={{ marginBottom: spacing.sm }} />
    <Skeleton width="100%" height={48} borderRadius={borderRadius.lg} />
  </View>
);

// 4. Schedule Grid Skeleton (for calendar view)
export const ScheduleGridSkeleton: React.FC = () => (
  <View style={styles.scheduleGrid}>
    <View style={styles.scheduleHeader}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} width={40} height={40} borderRadius={borderRadius.md} />
      ))}
    </View>
    {Array.from({ length: 5 }).map((_, row) => (
      <View key={row} style={styles.scheduleRow}>
        {Array.from({ length: 7 }).map((_, col) => (
          <Skeleton key={col} width={40} height={40} borderRadius={borderRadius.sm} />
        ))}
      </View>
    ))}
  </View>
);

// 5. Dashboard Skeleton (for manager dashboard)
export const DashboardSkeleton: React.FC = () => (
  <View style={styles.dashboard}>
    {/* Header stats */}
    <View style={styles.dashboardStats}>
      <View style={styles.stat}>
        <Skeleton width={60} height={60} borderRadius={borderRadius.lg} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="80%" height={14} style={{ marginBottom: spacing.xs }} />
        <Skeleton width="60%" height={12} />
      </View>
      <View style={styles.stat}>
        <Skeleton width={60} height={60} borderRadius={borderRadius.lg} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="80%" height={14} style={{ marginBottom: spacing.xs }} />
        <Skeleton width="60%" height={12} />
      </View>
      <View style={styles.stat}>
        <Skeleton width={60} height={60} borderRadius={borderRadius.lg} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="80%" height={14} style={{ marginBottom: spacing.xs }} />
        <Skeleton width="60%" height={12} />
      </View>
    </View>
    
    {/* Chart */}
    <Skeleton width="100%" height={200} style={{ marginVertical: spacing.lg }} />
    
    {/* List items */}
    <ListItemSkeleton />
    <ListItemSkeleton />
    <ListItemSkeleton />
  </View>
);

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  listItemContent: {
    flex: 1,
    marginStart: spacing.md,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  profile: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  scheduleGrid: {
    padding: spacing.md,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dashboard: {
    padding: spacing.lg,
  },
  dashboardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
});

export default Skeleton;
