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
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  StarIcon,
  TrendingUpIcon,
  TargetIcon,
} from '../components/Icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

// --- Types ---
interface ActiveSurvey {
  id: string;
  title: string;
  questionCount: number;
  estimatedMinutes: number;
  dueDate: string;
  answeredCount: number;
  buttonLabel: string;
}

interface CompletedSurvey {
  id: string;
  title: string;
  completedDate: string;
}

interface ImpactItem {
  id: string;
  text: string;
}

// --- Demo Data ---
const activeSurveys: ActiveSurvey[] = [
  {
    id: 'as-1',
    title: 'Employee Engagement Survey 2025',
    questionCount: 15,
    estimatedMinutes: 8,
    dueDate: 'Feb 28',
    answeredCount: 0,
    buttonLabel: 'Start Survey',
  },
  {
    id: 'as-2',
    title: 'Monthly Pulse Check - January',
    questionCount: 5,
    estimatedMinutes: 2,
    dueDate: 'Jan 31',
    answeredCount: 3,
    buttonLabel: 'Continue',
  },
];

const completedSurveys: CompletedSurvey[] = [
  {
    id: 'cs-1',
    title: 'Q4 2024 Engagement Survey',
    completedDate: 'Dec 15',
  },
  {
    id: 'cs-2',
    title: 'Onboarding Feedback',
    completedDate: 'Oct 5',
  },
];

const impactItems: ImpactItem[] = [
  { id: 'i1', text: 'Break room facilities were upgraded based on survey results' },
  { id: 'i2', text: 'Shift scheduling flexibility was improved' },
  { id: 'i3', text: 'New mentorship program launched from feedback insights' },
];

export const SurveysScreen = ({ navigation }: any) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('surveys.title', 'Surveys')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Surveys Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('surveys.activeSurveys', 'Active Surveys')}
          </Text>
          {activeSurveys.map((survey) => {
            const hasProgress = survey.answeredCount > 0;
            const progressPercent = Math.round(
              (survey.answeredCount / survey.questionCount) * 100
            );

            return (
              <View key={survey.id} style={styles.card}>
                {/* Survey header row */}
                <View style={styles.surveyHeader}>
                  <View style={styles.surveyIconContainer}>
                    <FileTextIcon size={20} color={colors.momentum} />
                  </View>
                  <View style={styles.surveyHeaderContent}>
                    <Text style={styles.surveyTitle}>{survey.title}</Text>
                    <View style={styles.surveyMeta}>
                      <Text style={styles.surveyMetaText}>
                        {survey.questionCount} {t('surveys.questions', 'questions')}
                      </Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.surveyMetaText}>
                        ~{survey.estimatedMinutes} min
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Due date banner */}
                <View style={styles.dueDateRow}>
                  <ClockIcon size={14} color={colors.warning} />
                  <Text style={styles.dueDateText}>
{t('surveys.dueBy', 'Due by')} {survey.dueDate}
                  </Text>
                </View>

                {/* Progress bar (only if started) */}
                {hasProgress && (
                  <View style={styles.surveyProgressSection}>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBackground}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${progressPercent}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {survey.answeredCount}/{survey.questionCount}
                      </Text>
                    </View>
                    <Text style={styles.progressHint}>
                      {t('surveys.questionsAnswered', 'questions answered')}
                    </Text>
                  </View>
                )}

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.surveyButton,
                    hasProgress && styles.surveyButtonOutline,
                  ]}
                >
                  <Text
                    style={[
                      styles.surveyButtonText,
                      hasProgress && styles.surveyButtonTextOutline,
                    ]}
                  >
                    {hasProgress
                      ? t('surveys.continue', 'Continue')
                      : t('surveys.startSurvey', 'Start Survey')}
                  </Text>
                  <ChevronRightIcon
                    size={18}
                    color={hasProgress ? colors.momentum : colors.white}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Completed Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('surveys.completed', 'Completed')}
          </Text>
          {completedSurveys.map((survey) => (
            <View key={survey.id} style={styles.completedCard}>
              <View style={styles.completedRow}>
                <View style={styles.completedIconContainer}>
                  <CheckCircleIcon size={20} color={colors.success} />
                </View>
                <View style={styles.completedContent}>
                  <Text style={styles.completedTitle}>{survey.title}</Text>
                  <Text style={styles.completedDate}>
                    {t('surveys.completed', 'Completed')} {survey.completedDate}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Your Impact Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('surveys.yourImpact', 'Your Impact')}
          </Text>
          <View style={styles.impactCard}>
            <View style={styles.impactHeader}>
              <TrendingUpIcon size={22} color={colors.momentum} />
              <Text style={styles.impactHeadline}>
                {t(
                  'surveys.impactSummary',
                  'Your feedback helped improve 3 areas this quarter'
                )}
              </Text>
            </View>

            <View style={styles.impactDivider} />

            <View style={styles.impactList}>
              {impactItems.map((item) => (
                <View key={item.id} style={styles.impactItemRow}>
                  <View style={styles.impactBullet}>
                    <CheckCircleIcon size={14} color={colors.success} />
                  </View>
                  <Text style={styles.impactItemText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
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

  // --- Active Survey Card ---
  surveyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  surveyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.momentumLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  surveyHeaderContent: {
    flex: 1,
  },
  surveyTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginBottom: spacing.xs,
  },
  surveyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  surveyMetaText: {
    ...typography.small,
    color: colors.slate500,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    marginHorizontal: spacing.sm,
  },

  // --- Due Date ---
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  dueDateText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },

  // --- Progress ---
  surveyProgressSection: {
    marginBottom: spacing.md,
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
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...typography.caption,
    color: colors.slate700,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  progressHint: {
    ...typography.small,
    color: colors.slate400,
    marginTop: spacing.xs,
  },

  // --- Survey Button ---
  surveyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  surveyButtonOutline: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.momentum,
    ...shadows.sm,
  },
  surveyButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  surveyButtonTextOutline: {
    color: colors.momentum,
  },

  // --- Completed ---
  completedCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  completedContent: {
    flex: 1,
  },
  completedTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  completedDate: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },

  // --- Impact Card ---
  impactCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.momentum + '30',
    ...shadows.sm,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  impactHeadline: {
    ...typography.bodyBold,
    color: colors.slate900,
    flex: 1,
    lineHeight: 22,
  },
  impactDivider: {
    height: 1,
    backgroundColor: colors.slate200,
    marginVertical: spacing.md,
  },
  impactList: {
    gap: spacing.md,
  },
  impactItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  impactBullet: {
    marginTop: 2,
  },
  impactItemText: {
    ...typography.caption,
    color: colors.slate700,
    flex: 1,
    lineHeight: 20,
  },

  // --- Bottom ---
  bottomPadding: {
    height: spacing.xxl,
  },
});
