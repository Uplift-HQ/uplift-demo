import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ZapIcon, AlertCircleIcon, TrendingUpIcon, TargetIcon, ChevronLeftIcon,
  CheckCircleIcon, UsersIcon, ClockIcon, CalendarIcon
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

interface AIInsight {
  id: string;
  type: 'risk' | 'optimization' | 'opportunity';
  title: string;
  description: string;
  impact: string;
  actionLabel: string;
  details: string[];
  affectedEmployees?: { name: string; role: string }[];
}

export const AIInsightsScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const [appliedInsights, setAppliedInsights] = useState<string[]>([]);

  const insights: AIInsight[] = [
    {
      id: 'retention-risk',
      type: 'risk',
      title: 'Retention Risk Alert',
      description: '3 team members showing decreased engagement patterns over the past 2 weeks.',
      impact: 'High risk of turnover if not addressed',
      actionLabel: 'Schedule Check-ins',
      details: [
        'Engagement score dropped by 15% average',
        'Shift swap requests increased 40%',
        'Break time extending beyond scheduled',
        'Reduced participation in team activities'
      ],
      affectedEmployees: [
        { name: 'David Kim', role: 'Front Desk' },
        { name: 'Lisa Wong', role: 'Housekeeping' },
        { name: 'Tom Harris', role: 'Night Audit' }
      ]
    },
    {
      id: 'schedule-optimization',
      type: 'optimization',
      title: 'Schedule Optimization',
      description: 'AI analysis suggests shifting 2 workers to evening shifts for improved coverage.',
      impact: '+12% productivity gain projected',
      actionLabel: 'Apply to Schedule',
      details: [
        'Evening shift currently understaffed by 2',
        'Morning shift has 2 excess workers',
        'Customer wait times 23% higher in evenings',
        'Worker preferences align with suggested changes'
      ],
      affectedEmployees: [
        { name: 'Sarah Johnson', role: 'Front Desk' },
        { name: 'Mike Chen', role: 'Concierge' }
      ]
    },
    {
      id: 'skill-gap',
      type: 'opportunity',
      title: 'Skill Gap Opportunity',
      description: '7 workers are just 1 skill away from Team Lead eligibility.',
      impact: 'Potential internal promotions available',
      actionLabel: 'View Training Plan',
      details: [
        '4 need Food Safety Level 2',
        '2 need Leadership Fundamentals',
        '1 needs First Aid Certification',
        'Average training time: 2 weeks'
      ],
      affectedEmployees: [
        { name: 'Emma Brown', role: 'Senior Server' },
        { name: 'James Wilson', role: 'Bartender' },
        { name: 'Anna Lee', role: 'Host' },
        { name: 'Chris Taylor', role: 'Server' }
      ]
    },
    {
      id: 'overtime-alert',
      type: 'risk',
      title: 'Overtime Threshold Alert',
      description: '5 team members approaching weekly overtime limits.',
      impact: 'Budget impact if not managed',
      actionLabel: 'Adjust Schedules',
      details: [
        '3 workers at 38+ hours (limit: 40)',
        '2 workers requested extra shifts',
        'Projected overtime cost: £450',
        'Alternative coverage available'
      ]
    },
    {
      id: 'peak-staffing',
      type: 'optimization',
      title: 'Weekend Peak Staffing',
      description: 'Historical data shows 25% higher demand this weekend.',
      impact: 'Ensure adequate coverage',
      actionLabel: 'Review Weekend Shifts',
      details: [
        'Local event driving increased bookings',
        'Current coverage: 85% of recommended',
        '3 additional shifts recommended',
        '6 workers available for extra shifts'
      ]
    }
  ];

  const getTypeConfig = (type: AIInsight['type']) => {
    switch (type) {
      case 'risk':
        return { icon: AlertCircleIcon, color: colors.error, bg: colors.error + '15' };
      case 'optimization':
        return { icon: TrendingUpIcon, color: colors.success, bg: colors.success + '15' };
      case 'opportunity':
        return { icon: TargetIcon, color: colors.info, bg: colors.info + '15' };
    }
  };

  const handleApplyInsight = (insight: AIInsight) => {
    setAppliedInsights([...appliedInsights, insight.id]);

    // Navigate to appropriate screen based on insight type
    switch (insight.id) {
      case 'retention-risk':
        navigation.navigate('Team');
        break;
      case 'schedule-optimization':
      case 'overtime-alert':
      case 'peak-staffing':
        navigation.navigate('Schedule', { screen: 'ScheduleBuilder', params: { applySuggestion: insight.id } });
        break;
      case 'skill-gap':
        navigation.navigate('Approvals', { screen: 'SkillsVerification' });
        break;
    }
  };

  const isApplied = (id: string) => appliedInsights.includes(id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeftIcon size={24} color={colors.slate900} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <ZapIcon size={24} color={colors.momentum} />
            <Text style={styles.title}>{t('screens.aiInsights.ai_insights')}</Text>
          </View>
          <Text style={styles.subtitle}>{insights.length} actionable insights</Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.error + '15' }]}>
          <AlertCircleIcon size={20} color={colors.error} />
          <Text style={styles.statValue}>{insights.filter(i => i.type === 'risk').length}</Text>
          <Text style={styles.statLabel}>Risks</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.success + '15' }]}>
          <TrendingUpIcon size={20} color={colors.success} />
          <Text style={styles.statValue}>{insights.filter(i => i.type === 'optimization').length}</Text>
          <Text style={styles.statLabel}>Optimizations</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.info + '15' }]}>
          <TargetIcon size={20} color={colors.info} />
          <Text style={styles.statValue}>{insights.filter(i => i.type === 'opportunity').length}</Text>
          <Text style={styles.statLabel}>Opportunities</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {insights.map((insight) => {
          const config = getTypeConfig(insight.type);
          const applied = isApplied(insight.id);

          return (
            <View
              key={insight.id}
              style={[
                styles.insightCard,
                { backgroundColor: config.bg, borderStartColor: config.color },
                applied && styles.insightCardApplied
              ]}
            >
              <View style={styles.insightHeader}>
                <config.icon size={22} color={config.color} />
                <Text style={styles.insightTitle}>{insight.title}</Text>
                {applied && (
                  <View style={styles.appliedBadge}>
                    <CheckCircleIcon size={14} color={colors.success} />
                    <Text style={styles.appliedText}>Applied</Text>
                  </View>
                )}
              </View>

              <Text style={styles.insightDescription}>{insight.description}</Text>

              <View style={styles.impactRow}>
                <ZapIcon size={14} color={config.color} />
                <Text style={[styles.impactText, { color: config.color }]}>{insight.impact}</Text>
              </View>

              {/* Details */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>{t('screens.aiInsights.analysis_details')}</Text>
                {insight.details.map((detail, i) => (
                  <View key={i} style={styles.detailRow}>
                    <View style={[styles.detailDot, { backgroundColor: config.color }]} />
                    <Text style={styles.detailText}>{detail}</Text>
                  </View>
                ))}
              </View>

              {/* Affected Employees */}
              {insight.affectedEmployees && (
                <View style={styles.employeesSection}>
                  <View style={styles.employeesHeader}>
                    <UsersIcon size={16} color={colors.slate600} />
                    <Text style={styles.employeesTitle}>{t('screens.aiInsights.affected_team_members')}</Text>
                  </View>
                  <View style={styles.employeesList}>
                    {insight.affectedEmployees.slice(0, 4).map((emp, i) => (
                      <View key={i} style={styles.employeeChip}>
                        <View style={styles.employeeAvatar}>
                          <Text style={styles.employeeInitial}>{emp.name[0]}</Text>
                        </View>
                        <Text style={styles.employeeName}>{emp.name}</Text>
                      </View>
                    ))}
                    {insight.affectedEmployees.length > 4 && (
                      <View style={styles.employeeChip}>
                        <Text style={styles.moreText}>+{insight.affectedEmployees.length - 4}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: config.color },
                  applied && styles.actionButtonApplied
                ]}
                onPress={() => handleApplyInsight(insight)}
                disabled={applied}
              >
                {applied ? (
                  <>
                    <CheckCircleIcon size={18} color={colors.background} />
                    <Text style={styles.actionButtonText}>{t('screens.aiInsights.action_taken')}</Text>
                  </>
                ) : (
                  <Text style={styles.actionButtonText}>{insight.actionLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

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
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md
  },
  headerContent: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h1, color: colors.slate900, fontSize: 24 },
  subtitle: { ...typography.body, color: colors.slate500, marginTop: spacing.xs },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.md
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs
  },
  statValue: { ...typography.h2, color: colors.slate900, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.slate600 },

  // Content
  content: { flex: 1, paddingHorizontal: spacing.lg },

  // Insight Card
  insightCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderStartWidth: 4,
    ...shadows.sm
  },
  insightCardApplied: { opacity: 0.7 },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  insightTitle: { ...typography.h3, color: colors.slate900, flex: 1 },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm
  },
  appliedText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  insightDescription: {
    ...typography.body,
    color: colors.slate700,
    lineHeight: 22,
    marginBottom: spacing.sm
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg
  },
  impactText: { ...typography.bodyBold, fontSize: 14 },

  // Details
  detailsSection: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  detailsTitle: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  detailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6
  },
  detailText: { ...typography.body, color: colors.slate700, flex: 1, fontSize: 14 },

  // Employees
  employeesSection: {
    marginBottom: spacing.md
  },
  employeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  employeesTitle: { ...typography.caption, color: colors.slate600, fontWeight: '600' },
  employeesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  employeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full
  },
  employeeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center'
  },
  employeeInitial: { ...typography.caption, color: colors.slate700, fontWeight: '700' },
  employeeName: { ...typography.caption, color: colors.slate700 },
  moreText: { ...typography.caption, color: colors.slate500, fontWeight: '600' },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg
  },
  actionButtonApplied: { backgroundColor: colors.slate400 },
  actionButtonText: { ...typography.bodyBold, color: colors.background }
});
