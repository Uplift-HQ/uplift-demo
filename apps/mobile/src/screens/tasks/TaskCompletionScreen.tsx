import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, StarIcon, TrendingUpIcon, TargetIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export const TaskCompletionScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { task, timeSpent, photos, files } = route?.params || {};
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const handleViewNextTask = () => {
    navigation.navigate('Tasks');
  };

  const handleShareSuccess = () => {
    // Would integrate with social feed
    navigation.navigate('Feed');
  };

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <View style={styles.successIcon}>
        <View style={styles.successCircle}>
          <CheckCircleIcon size={64} color={colors.success} />
        </View>
      </View>

      {/* Celebration Message */}
      <Text style={styles.title}>{t('tasks.taskCompleted')}</Text>
      <Text style={styles.subtitle}>{t('gamification.congratulations')}</Text>

      {/* Points Earned */}
      <View style={styles.pointsCard}>
        <View style={styles.pointsCircle}>
          <StarIcon size={48} color={colors.momentum} />
        </View>
        <Text style={styles.pointsValue}>+{task?.points || 50}</Text>
        <Text style={styles.pointsLabel}>{t('rewards.points')}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <ClockIcon size={24} color={colors.info} />
          <Text style={styles.statValue}>{formatTime(timeSpent || 0)}</Text>
          <Text style={styles.statLabel}>{t('timeTracking.totalTime')}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <TargetIcon size={24} color={colors.success} />
          <Text style={styles.statValue}>{photos + files}</Text>
          <Text style={styles.statLabel}>{t('common.details')}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <TrendingUpIcon size={24} color={colors.momentum} />
          <Text style={styles.statValue}>+5</Text>
          <Text style={styles.statLabel}>{t('gamification.xpUnit')}</Text>
        </View>
      </View>

      {/* New Badge (if applicable) */}
      <View style={styles.badgeCard}>
        <View style={styles.badgeIcon}>
          <StarIcon size={32} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.badgeTitle}>{t('gamification.badgeUnlocked')}</Text>
          <Text style={styles.badgeSubtitle}>{t('gamification.howToEarn')}</Text>
        </View>
      </View>

      {/* Review Notice */}
      <View style={styles.reviewNotice}>
        <Text style={styles.reviewText}>
          {t('timeTracking.pendingApproval')}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareSuccess}
        >
          <Text style={styles.shareButtonText}>{t('feed.share')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleViewNextTask}
        >
          <Text style={styles.nextButtonText}>{t('tasks.nextStep')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.doneButtonText}>{t('common.done')}</Text>
      </TouchableOpacity>
    </View>
  );
};

// Import ClockIcon
import { ClockIcon } from '../../components/Icons';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: spacing.xl, justifyContent: 'center' },
  successIcon: { alignItems: 'center', marginBottom: spacing.xl },
  successCircle: { width: 120, height: 120, backgroundColor: colors.success + '20', borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  
  title: { ...typography.h1, color: colors.slate900, textAlign: 'center', fontSize: 32, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.slate600, textAlign: 'center', marginBottom: spacing.xl },
  
  pointsCard: { backgroundColor: colors.momentum + '15', borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl, borderWidth: 3, borderColor: colors.momentum },
  pointsCircle: { width: 80, height: 80, backgroundColor: colors.background, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  pointsValue: { ...typography.h1, color: colors.momentum, fontSize: 48, fontWeight: '900', marginBottom: spacing.xs },
  pointsLabel: { ...typography.body, color: colors.momentum, fontWeight: '700' },
  
  statsContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.slate900, marginTop: spacing.sm, marginBottom: spacing.xs, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.slate600 },
  statDivider: { width: 1, backgroundColor: colors.slate200, marginHorizontal: spacing.md },
  
  badgeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.warning + '15', borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderStartWidth: 4, borderStartColor: colors.warning },
  badgeIcon: { width: 56, height: 56, backgroundColor: colors.background, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  badgeTitle: { ...typography.h3, color: colors.warning, marginBottom: spacing.xs / 2 },
  badgeSubtitle: { ...typography.caption, color: colors.slate700 },
  
  reviewNotice: { backgroundColor: colors.info + '15', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.xl },
  reviewText: { ...typography.body, color: colors.info, textAlign: 'center', lineHeight: 20 },
  
  actions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  shareButton: { flex: 1, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.momentum, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' },
  shareButtonText: { ...typography.bodyBold, color: colors.momentum },
  nextButton: { flex: 1, backgroundColor: colors.momentum, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' },
  nextButtonText: { ...typography.bodyBold, color: colors.background },
  
  doneButton: { backgroundColor: colors.slate100, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  doneButtonText: { ...typography.bodyBold, color: colors.slate700 },
});
