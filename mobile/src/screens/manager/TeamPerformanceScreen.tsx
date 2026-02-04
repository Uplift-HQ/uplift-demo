import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import {
  UsersIcon, StarIcon, ClockIcon, TargetIcon, CheckCircleIcon,
  AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, BarChartIcon,
  MessageCircleIcon, TrendingUpIcon, ShieldIcon
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export const TeamPerformanceScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const stats = [
    { icon: UsersIcon, color: colors.momentum, value: '12', label: t('manager.performance.teamSize', 'Team Size') },
    { icon: StarIcon, color: colors.warning, value: '4.1', label: t('manager.performance.avgRating', 'Avg Rating') },
    { icon: ClockIcon, color: colors.info, value: '5', label: t('manager.performance.reviewsPending', 'Reviews Pending') },
    { icon: TargetIcon, color: colors.success, value: '78%', label: t('manager.performance.goalsOnTrack', 'Goals On Track') },
  ];

  const pendingActions = [
    {
      id: '1',
      text: t('manager.performance.completeReviewMarcus', 'Complete review for Marcus Johnson'),
      badge: t('manager.performance.overdue', 'Overdue'),
      badgeColor: colors.error,
    },
    {
      id: '2',
      text: t('manager.performance.completeReviewJames', 'Complete review for James Wilson'),
      badge: t('manager.performance.dueIn3Days', 'Due in 3 days'),
      badgeColor: colors.warning,
    },
    {
      id: '3',
      text: t('manager.performance.calibrateProduction', 'Calibrate ratings for Production team'),
      badge: null,
      badgeColor: null,
    },
  ];

  const teamGoals = [
    { label: t('manager.performance.oeeTarget', 'OEE Target 85%'), progress: 0.72, display: '72%', color: colors.warning },
    { label: t('manager.performance.safetyIncidents', 'Safety Incidents <5'), progress: 1.0, display: t('manager.performance.onTrack', 'On Track'), color: colors.success },
    { label: t('manager.performance.trainingCompletion', 'Training Completion'), progress: 0.89, display: '89%', color: colors.momentum },
  ];

  const recentFeedback = [
    {
      id: '1',
      employee: 'Sarah Chen',
      initials: 'SC',
      feedback: t('manager.performance.feedbackSarah', 'Great leadership during the Q4 audit. Keep up the proactive communication with the team.'),
      time: t('manager.performance.twoDaysAgo', '2 days ago'),
    },
    {
      id: '2',
      employee: 'David Okonkwo',
      initials: 'DO',
      feedback: t('manager.performance.feedbackDavid', 'Solid improvement on safety protocol adherence. Next step: mentor junior team members.'),
      time: t('manager.performance.fiveDaysAgo', '5 days ago'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeftIcon size={24} color={colors.momentum} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('manager.performance.title', 'Team Performance')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>
          {t('manager.performance.subtitle', 'Review cycle and goal tracking')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {stats.slice(0, 2).map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <stat.icon size={24} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.statsRow}>
            {stats.slice(2, 4).map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <stat.icon size={24} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active Review Cycle */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <BarChartIcon size={20} color={colors.momentum} />
            <Text style={styles.sectionTitle}>
              {t('manager.performance.activeReviewCycle', 'Active Review Cycle')}
            </Text>
          </View>

          <View style={styles.reviewCycleCard}>
            <Text style={styles.reviewCycleName}>
              {t('manager.performance.annualReview', 'Annual Performance Review 2025')}
            </Text>
            <Text style={styles.reviewCycleProgress}>
              {t('manager.performance.completedCount', '7/12 completed')}
            </Text>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: '58%' }]} />
              </View>
              <Text style={styles.progressPercentage}>58%</Text>
            </View>

            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllButtonText}>
                {t('manager.performance.viewAll', 'View All')}
              </Text>
              <ChevronRightIcon size={18} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AlertCircleIcon size={20} color={colors.warning} />
            <Text style={styles.sectionTitle}>
              {t('manager.performance.pendingActions', 'Pending Actions')}
            </Text>
          </View>

          {pendingActions.map((action) => (
            <TouchableOpacity key={action.id} style={styles.actionItem}>
              <View style={styles.actionDot} />
              <View style={styles.actionContent}>
                <Text style={styles.actionText}>{action.text}</Text>
                {action.badge && (
                  <View style={[styles.actionBadge, { backgroundColor: action.badgeColor + '20' }]}>
                    <Text style={[styles.actionBadgeText, { color: action.badgeColor }]}>
                      {action.badge}
                    </Text>
                  </View>
                )}
              </View>
              <ChevronRightIcon size={18} color={colors.slate400} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Team Goals Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <TargetIcon size={20} color={colors.info} />
            <Text style={styles.sectionTitle}>
              {t('manager.performance.teamGoalsSummary', 'Team Goals Summary')}
            </Text>
          </View>

          <View style={styles.goalsCard}>
            {teamGoals.map((goal, i) => (
              <View key={i} style={[styles.goalItem, i < teamGoals.length - 1 && styles.goalItemBorder]}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalLabel}>{goal.label}</Text>
                  <Text style={[styles.goalDisplay, { color: goal.color }]}>{goal.display}</Text>
                </View>
                <View style={styles.goalProgressBackground}>
                  <View
                    style={[
                      styles.goalProgressFill,
                      { width: `${goal.progress * 100}%`, backgroundColor: goal.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Feedback Given */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MessageCircleIcon size={20} color={colors.success} />
            <Text style={styles.sectionTitle}>
              {t('manager.performance.recentFeedback', 'Recent Feedback Given')}
            </Text>
          </View>

          {recentFeedback.map((item) => (
            <View key={item.id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackAvatar}>
                  <Text style={styles.feedbackInitials}>{item.initials}</Text>
                </View>
                <View style={styles.feedbackMeta}>
                  <Text style={styles.feedbackEmployee}>{item.employee}</Text>
                  <Text style={styles.feedbackTime}>{item.time}</Text>
                </View>
              </View>
              <Text style={styles.feedbackText}>{item.feedback}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: -spacing.sm,
  },
  title: { ...typography.h1, color: colors.slate900 },
  subtitle: { ...typography.body, color: colors.slate500, marginTop: spacing.xs },

  // Content
  content: { flex: 1 },

  // Stats
  statsContainer: { padding: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.slate900,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontWeight: '800',
  },
  statLabel: { ...typography.caption, color: colors.slate500, textAlign: 'center' },

  // Section
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3, color: colors.slate900 },

  // Review Cycle Card
  reviewCycleCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  reviewCycleName: {
    ...typography.bodyBold,
    color: colors.slate900,
    fontSize: 16,
  },
  reviewCycleProgress: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  progressBarBackground: {
    flex: 1,
    height: 10,
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
  },
  progressPercentage: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 14,
    minWidth: 36,
    textAlign: 'right',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  viewAllButtonText: { ...typography.bodyBold, color: colors.background },

  // Pending Actions
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  actionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.momentum,
  },
  actionContent: { flex: 1 },
  actionText: { ...typography.bodyBold, color: colors.slate900, fontSize: 14 },
  actionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  actionBadgeText: { ...typography.small, fontWeight: '700' },

  // Goals Card
  goalsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  goalItem: { paddingVertical: spacing.md },
  goalItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalLabel: { ...typography.bodyBold, color: colors.slate900, fontSize: 14 },
  goalDisplay: { ...typography.bodyBold, fontSize: 14 },
  goalProgressBackground: {
    height: 8,
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },

  // Feedback
  feedbackCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  feedbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.momentum + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackInitials: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 14,
  },
  feedbackMeta: { flex: 1 },
  feedbackEmployee: { ...typography.bodyBold, color: colors.slate900 },
  feedbackTime: { ...typography.caption, color: colors.slate400, marginTop: 2 },
  feedbackText: {
    ...typography.body,
    color: colors.slate700,
    lineHeight: 22,
  },
});
