import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import {
  StarIcon,
  TargetIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  MessageCircleIcon,
  UserIcon,
  ThumbsUpIcon,
} from '../components/Icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

// --- Active Review Data ---
interface ReviewStep {
  label: string;
  status: 'completed' | 'pending' | 'waiting';
}

interface ActiveReview {
  id: string;
  title: string;
  steps: ReviewStep[];
}

// --- Goal Data ---
interface Goal {
  id: string;
  title: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'completed';
}

// --- Meeting Data ---
interface Meeting {
  id: string;
  withPerson: string;
  date: string;
  note: string;
}

// --- Feedback Data ---
interface FeedbackItem {
  id: string;
  type: 'praise' | 'constructive';
  fromPerson: string;
  excerpt: string;
}

const activeReview: ActiveReview = {
  id: 'rev-1',
  title: 'Annual Performance Review 2025',
  steps: [
    { label: 'Self-assessment', status: 'pending' },
    { label: 'Manager review', status: 'waiting' },
  ],
};

const goals: Goal[] = [
  { id: 'g1', title: 'Complete Safety Certification', progress: 75, status: 'on_track' },
  { id: 'g2', title: 'Reduce Scrap Rate by 10%', progress: 45, status: 'at_risk' },
  { id: 'g3', title: 'Mentor 2 Junior Members', progress: 100, status: 'completed' },
];

const meetings: Meeting[] = [
  { id: 'm1', withPerson: 'Sarah Chen', date: 'Tomorrow 2pm', note: 'Prepare notes' },
  { id: 'm2', withPerson: 'Ana Rodriguez', date: 'Jan 28', note: 'Quarterly check-in' },
];

const feedbackItems: FeedbackItem[] = [
  {
    id: 'f1',
    type: 'praise',
    fromPerson: 'Marcus Johnson',
    excerpt: 'Great work on the Q4 audit...',
  },
  {
    id: 'f2',
    type: 'constructive',
    fromPerson: 'Thomas Brown',
    excerpt: 'Consider improving documentation...',
  },
];

// --- Helpers ---
const getStatusBadgeColor = (status: Goal['status']): string => {
  switch (status) {
    case 'on_track':
      return colors.success;
    case 'at_risk':
      return colors.warning;
    case 'completed':
      return colors.momentum;
    default:
      return colors.slate500;
  }
};

const getStatusBadgeBg = (status: Goal['status']): string => {
  return getStatusBadgeColor(status) + '15';
};

const getStepIcon = (status: ReviewStep['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon size={16} color={colors.success} />;
    case 'pending':
      return <ClockIcon size={16} color={colors.warning} />;
    case 'waiting':
      return <ClockIcon size={16} color={colors.slate400} />;
  }
};

export const PerformanceScreen = ({ navigation }: any) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('performance.myPerformance', 'My Performance')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <StarIcon size={20} color={colors.momentum} />
            <Text style={styles.statValue}>4.2/5</Text>
            <Text style={styles.statLabel}>
              {t('performance.currentRating', 'Current Rating')}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <TargetIcon size={20} color={colors.success} />
            <Text style={styles.statValue}>3/5</Text>
            <Text style={styles.statLabel}>
              {t('performance.goalsOnTrack', 'On Track')}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <CalendarIcon size={20} color={colors.info} />
            <Text style={styles.statValue}>Mar 15</Text>
            <Text style={styles.statLabel}>
              {t('performance.nextReview', 'Next Review')}
            </Text>
          </View>
        </View>

        {/* Active Reviews Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('performance.activeReviews', 'Active Reviews')}
          </Text>
          <View style={styles.card}>
            <View style={styles.reviewHeader}>
              <TrendingUpIcon size={20} color={colors.momentum} />
              <Text style={styles.reviewTitle}>{activeReview.title}</Text>
            </View>

            <View style={styles.stepsContainer}>
              {activeReview.steps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  {getStepIcon(step.status)}
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <View
                    style={[
                      styles.stepBadge,
                      {
                        backgroundColor:
                          step.status === 'completed'
                            ? colors.success + '15'
                            : step.status === 'pending'
                            ? colors.warning + '15'
                            : colors.slate100,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepBadgeText,
                        {
                          color:
                            step.status === 'completed'
                              ? colors.success
                              : step.status === 'pending'
                              ? colors.warning
                              : colors.slate500,
                        },
                      ]}
                    >
                      {step.status === 'completed'
                        ? t('performance.done', 'Done')
                        : step.status === 'pending'
                        ? t('performance.pending', 'Pending')
                        : t('performance.waiting', 'Waiting')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {t('performance.startSelfAssessment', 'Start Self-Assessment')}
              </Text>
              <ChevronRightIcon size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* My Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('performance.myGoals', 'My Goals')}
          </Text>
          {goals.map((goal) => (
            <View key={goal.id} style={styles.card}>
              <View style={styles.goalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                </View>
                <View style={[styles.goalBadge, { backgroundColor: getStatusBadgeBg(goal.status) }]}>
                  <Text style={[styles.goalBadgeText, { color: getStatusBadgeColor(goal.status) }]}>
                    {goal.status === 'on_track'
                      ? t('performance.onTrack', 'On Track')
                      : goal.status === 'at_risk'
                      ? t('performance.atRisk', 'At Risk')
                      : t('performance.completed', 'Completed')}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${goal.progress}%`,
                        backgroundColor: getStatusBadgeColor(goal.status),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{goal.progress}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Upcoming 1-on-1s */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('performance.upcoming1on1s', 'Upcoming 1-on-1s')}
          </Text>
          {meetings.map((meeting) => (
            <View key={meeting.id} style={styles.card}>
              <View style={styles.meetingRow}>
                <View style={styles.meetingIconContainer}>
                  <UserIcon size={18} color={colors.momentum} />
                </View>
                <View style={styles.meetingContent}>
                  <Text style={styles.meetingPerson}>
                    {t('performance.with', 'With')} {meeting.withPerson}
                  </Text>
                  <Text style={styles.meetingDate}>{meeting.date}</Text>
                </View>
                <TouchableOpacity>
                  <Text style={styles.meetingAction}>{meeting.note}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('performance.recentFeedback', 'Recent Feedback')}
          </Text>
          {feedbackItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.feedbackRow}>
                <View
                  style={[
                    styles.feedbackIconContainer,
                    {
                      backgroundColor:
                        item.type === 'praise'
                          ? colors.success + '15'
                          : colors.info + '15',
                    },
                  ]}
                >
                  {item.type === 'praise' ? (
                    <ThumbsUpIcon size={16} color={colors.success} />
                  ) : (
                    <MessageCircleIcon size={16} color={colors.info} />
                  )}
                </View>
                <View style={styles.feedbackContent}>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.feedbackPerson}>{item.fromPerson}</Text>
                    <View
                      style={[
                        styles.feedbackTypeBadge,
                        {
                          backgroundColor:
                            item.type === 'praise'
                              ? colors.success + '15'
                              : colors.info + '15',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.feedbackTypeText,
                          {
                            color:
                              item.type === 'praise'
                                ? colors.success
                                : colors.info,
                          },
                        ]}
                      >
                        {item.type === 'praise'
                          ? t('performance.praise', 'Praise')
                          : t('performance.constructive', 'Constructive')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackExcerpt}>
                    &ldquo;{item.excerpt}&rdquo;
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
  },

  // --- Stats Bar ---
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.small,
    color: colors.slate500,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.slate200,
    marginVertical: spacing.xs,
  },

  // --- Sections ---
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },

  // --- Card ---
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },

  // --- Active Review ---
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
    flex: 1,
  },
  stepsContainer: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepLabel: {
    ...typography.body,
    color: colors.slate700,
    flex: 1,
  },
  stepBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  stepBadgeText: {
    ...typography.small,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },

  // --- Goals ---
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  goalTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  goalBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginStart: spacing.sm,
  },
  goalBadgeText: {
    ...typography.small,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.slate200,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginEnd: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...typography.caption,
    color: colors.slate700,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },

  // --- Meetings ---
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meetingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.momentumLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  meetingContent: {
    flex: 1,
  },
  meetingPerson: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  meetingDate: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  meetingAction: {
    ...typography.caption,
    color: colors.momentum,
    fontWeight: '600',
  },

  // --- Feedback ---
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  feedbackIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  feedbackPerson: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  feedbackTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  feedbackTypeText: {
    ...typography.small,
    fontWeight: '600',
  },
  feedbackExcerpt: {
    ...typography.caption,
    color: colors.slate600,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // --- Bottom ---
  bottomPadding: {
    height: spacing.xxl,
  },
});
