import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useBranding } from '../../contexts/BrandingContext';
import { useViewMode } from '../../contexts/ViewContext';
import { useManagerDashboard, useEmployees, usePendingApprovals } from '../../hooks/useData';
import { ViewToggle } from '../../components/ViewToggle';
import { HomeScreen } from '../HomeScreen';
import {
  BarChartIcon, UsersIcon, TrendingUpIcon, AlertCircleIcon, TargetIcon,
  StarIcon, ZapIcon, ClockIcon, CheckCircleIcon, XCircleIcon, CalendarIcon,
  MessageCircleIcon, BellIcon
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export const ManagerDashboardScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { branding } = useBranding();
  const { isPersonalView } = useViewMode();

  // Wire to real API hooks with hardcoded fallbacks
  const { data: dashboardData, loading: dashboardLoading } = useManagerDashboard();
  const { data: employeesData, loading: employeesLoading } = useEmployees();
  const { data: approvalsData, loading: approvalsLoading } = usePendingApprovals();

  const teamSize = employeesData?.employees?.length ?? 0;
  const avgMomentum = dashboardData?.avgMomentum ?? '--';
  const shiftsFilled = dashboardData?.shiftsFilled ?? '--';
  const retention = dashboardData?.retention ?? '--';
  const hoursThisWeek = dashboardData?.hoursThisWeek ?? '--';
  const taskCompletion = dashboardData?.taskCompletion ?? '--';

  const totalPendingApprovals = approvalsData
    ? (approvalsData.timeOff?.length ?? 0) + (approvalsData.swaps?.length ?? 0) + (approvalsData.timeEntries?.length ?? 0)
    : 0;

  const unreadMessages = (user as any)?.unreadMessages ?? 0;
  const pendingApprovals = totalPendingApprovals;

  const isLoading = dashboardLoading || employeesLoading || approvalsLoading;

  const handleViewReport = (reportType: string) => {
    // Navigate directly to Reports with the specific report type
    navigation.navigate('Reports', { reportType });
  };

  const handleViewAllInsights = () => {
    navigation.navigate('AIInsights');
  };

  // Personal view: show worker HomeScreen content
  if (isPersonalView) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.viewToggleContainerCompact}>
          <ViewToggle />
        </View>
        <HomeScreen navigation={navigation} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {isLoading && (
        <ActivityIndicator size="small" color={colors.momentum} style={{ position: 'absolute', top: 70, right: 20, zIndex: 10 }} />
      )}
      {/* View Toggle */}
      <View style={styles.viewToggleContainer}>
        <ViewToggle />
      </View>
      {/* Header with Company Branding */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.companyBranding}>
            <View style={styles.companyLogoContainer}>
              {(user as any)?.companyLogo ? (
                <Image source={{ uri: (user as any).companyLogo }} style={styles.companyLogo} />
              ) : (
                <View style={styles.companyLogoPlaceholder}>
                  <Text style={styles.companyLogoText}>
                    {((user as any)?.companyName || 'G')?.[0]}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>{t('screens.managerDashboard.team_dashboard')}</Text>
              <Text style={styles.userName}>{(user as any)?.companyName || branding.brandName || 'Your Company'}</Text>
              <Text style={styles.locationText}>{(user as any)?.locationName || 'Edinburgh City Centre'}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <MessageCircleIcon size={22} color={colors.slate700} />
              {unreadMessages > 0 && (
                <View style={styles.messageBadge}>
                  <Text style={styles.messageBadgeText}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('MyFeed', { screen: 'Notifications' })}
            >
              <BellIcon size={22} color={colors.slate700} />
              {pendingApprovals > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Clock In for Managers */}
        <TouchableOpacity
          style={styles.quickClockIn}
          onPress={() => navigation.navigate('Schedule', { screen: 'ClockInOut' })}
        >
          <ClockIcon size={20} color={colors.momentum} />
          <Text style={styles.quickClockInText}>{t('screens.managerDashboard.clock_in_to_your_shift')}</Text>
        </TouchableOpacity>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <UsersIcon size={24} color={colors.momentum} />
            <Text style={styles.metricValue}>{teamSize}</Text>
            <Text style={styles.metricLabel}>{t('screens.managerDashboard.team_size')}</Text>
          </View>
          <View style={styles.metricCard}>
            <TrendingUpIcon size={24} color={colors.success} />
            <Text style={styles.metricValue}>{avgMomentum}</Text>
            <Text style={styles.metricLabel}>{t('screens.managerDashboard.avg_momentum')}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <TargetIcon size={24} color={colors.info} />
            <Text style={styles.metricValue}>{shiftsFilled}</Text>
            <Text style={styles.metricLabel}>{t('screens.managerDashboard.shifts_filled')}</Text>
          </View>
          <View style={styles.metricCard}>
            <BarChartIcon size={24} color={colors.warning} />
            <Text style={styles.metricValue}>{retention}</Text>
            <Text style={styles.metricLabel}>{t('screens.managerDashboard.retention')}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <ClockIcon size={24} color={colors.momentum} />
            <Text style={styles.metricValue}>{hoursThisWeek}</Text>
            <Text style={styles.metricLabel}>{t('screens.managerDashboard.hours_this_week')}</Text>
          </View>
          <View style={styles.metricCard}>
            <CheckCircleIcon size={24} color={colors.success} />
            <Text style={styles.metricValue}>{taskCompletion}</Text>
            <Text style={styles.metricLabel}>{t('screens.managerDashboard.task_completion')}</Text>
          </View>
        </View>
      </View>

      {/* AI Demand Forecast */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ZapIcon size={20} color={colors.momentum} />
          <Text style={styles.sectionTitle}>{t('screens.managerDashboard.demand_forecast')}</Text>
        </View>

        <View style={styles.forecastCard}>
          <Text style={styles.forecastSubtitle}>{t('screens.managerDashboard.next_7_days_staffing_needs')}</Text>

          <View style={styles.forecastChart}>
            {[
              { day: 'Mon', value: 12, peak: false },
              { day: 'Tue', value: 14, peak: false },
              { day: 'Wed', value: 11, peak: false },
              { day: 'Thu', value: 13, peak: false },
              { day: 'Fri', value: 16, peak: true },
              { day: 'Sat', value: 18, peak: true },
              { day: 'Sun', value: 15, peak: false },
            ].map((item, i) => (
              <View key={i} style={styles.forecastBar}>
                <Text style={styles.forecastValue}>{item.value}</Text>
                <View style={[
                  styles.forecastBarFill,
                  { height: `${(item.value / 18) * 100}%` },
                  item.peak && styles.forecastBarPeak
                ]} />
                <Text style={styles.forecastDay}>{item.day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.forecastSummary}>
            <View style={styles.forecastStat}>
              <Text style={styles.forecastStatValue}>99</Text>
              <Text style={styles.forecastStatLabel}>{t('screens.managerDashboard.total_shifts')}</Text>
            </View>
            <View style={styles.forecastStatDivider} />
            <View style={styles.forecastStat}>
              <Text style={styles.forecastStatValue}>14</Text>
              <Text style={styles.forecastStatLabel}>{t('screens.managerDashboard.avgday')}</Text>
            </View>
            <View style={styles.forecastStatDivider} />
            <View style={styles.forecastStat}>
              <Text style={[styles.forecastStatValue, { color: colors.warning }]}>Sat</Text>
              <Text style={styles.forecastStatLabel}>{t('screens.managerDashboard.peak_day')}</Text>
            </View>
          </View>

          <View style={styles.forecastAlert}>
            <AlertCircleIcon size={16} color={colors.warning} />
            <Text style={styles.forecastAlertText}>{t('screens.managerDashboard.weekendStaffingAlert')}</Text>
          </View>

          <TouchableOpacity
            style={styles.forecastButton}
            onPress={() => navigation.navigate('Schedule')}
          >
            <Text style={styles.forecastButtonText}>{t('screens.managerDashboard.open_schedule_builder')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pending Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('screens.managerDashboard.pending_actions')}</Text>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Approvals', { screen: 'SkillsVerification' })}
        >
          <View style={styles.actionHeader}>
            <View style={styles.actionIconCircle}>
              <StarIcon size={20} color={colors.momentum} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>{t('manager.skillsVerification')}</Text>
              <Text style={styles.actionSubtitle}>{t('screens.managerDashboard.requestsAwaiting', { count: 5 })}</Text>
            </View>
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>5</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Approvals', { screen: 'TeamRequests' })}
        >
          <View style={styles.actionHeader}>
            <View style={styles.actionIconCircle}>
              <CalendarIcon size={20} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>{t('screens.managerDashboard.schedule_requests')}</Text>
              <Text style={styles.actionSubtitle}>{t('screens.managerDashboard.swapAndTimeOff')}</Text>
            </View>
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>5</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Team')}
        >
          <View style={styles.actionHeader}>
            <View style={styles.actionIconCircle}>
              <UsersIcon size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>{t('screens.managerDashboard.job_applications')}</Text>
              <Text style={styles.actionSubtitle}>{t('screens.managerDashboard.newApplications', { count: 8 })}</Text>
            </View>
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>8</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* AI Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderRow}>
            <ZapIcon size={20} color={colors.momentum} />
            <Text style={styles.sectionTitle}>{t('screens.managerDashboard.ai_insights')}</Text>
          </View>
          <TouchableOpacity onPress={handleViewAllInsights}>
            <Text style={styles.seeAllText}>{t('screens.managerDashboard.view_all')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.insightCard, { backgroundColor: colors.error + '15', borderStartColor: colors.error }]}
          onPress={handleViewAllInsights}
        >
          <View style={styles.insightHeader}>
            <AlertCircleIcon size={20} color={colors.error} />
            <Text style={styles.insightTitle}>{t('screens.managerDashboard.retention_risk_alert')}</Text>
          </View>
          <Text style={styles.insightText}>
            {t('screens.managerDashboard.retentionRiskText')}
          </Text>
          <View style={[styles.insightButton, { backgroundColor: colors.error }]}>
            <Text style={styles.insightButtonText}>{t('screens.managerDashboard.view_details')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.insightCard, { backgroundColor: colors.success + '15', borderStartColor: colors.success }]}
          onPress={handleViewAllInsights}
        >
          <View style={styles.insightHeader}>
            <TrendingUpIcon size={20} color={colors.success} />
            <Text style={styles.insightTitle}>{t('screens.managerDashboard.schedule_optimization')}</Text>
          </View>
          <Text style={styles.insightText}>
            {t('screens.managerDashboard.scheduleOptimizationText')}
          </Text>
          <View style={[styles.insightButton, { backgroundColor: colors.success }]}>
            <Text style={styles.insightButtonText}>{t('screens.managerDashboard.view_details')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.insightCard, { backgroundColor: colors.info + '15', borderStartColor: colors.info }]}
          onPress={handleViewAllInsights}
        >
          <View style={styles.insightHeader}>
            <TargetIcon size={20} color={colors.info} />
            <Text style={styles.insightTitle}>{t('screens.managerDashboard.skill_gap_identified')}</Text>
          </View>
          <Text style={styles.insightText}>
            {t('screens.managerDashboard.skillGapText')}
          </Text>
          <View style={[styles.insightButton, { backgroundColor: colors.info }]}>
            <Text style={styles.insightButtonText}>{t('screens.managerDashboard.view_details')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Top Performers */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <StarIcon size={20} color={colors.warning} />
          <Text style={styles.sectionTitle}>{t('screens.managerDashboard.top_performers_this_week')}</Text>
        </View>
        {[
          { id: 'emp-001', name: 'Sarah Johnson', score: 92, role: 'Front Desk Agent', trend: '+5' },
          { id: 'emp-002', name: 'Mike Chen', score: 88, role: 'Concierge', trend: '+3' },
          { id: 'emp-003', name: 'Jessica Martinez', score: 85, role: 'Night Audit', trend: '+7' },
        ].map((person, i) => (
          <TouchableOpacity
            key={i}
            style={styles.performerCard}
            onPress={() => navigation.navigate('Profile', { employeeId: person.id })}
          >
            <View style={styles.performerRank}>
              <Text style={styles.performerRankText}>{i + 1}</Text>
            </View>
            <View style={styles.performerAvatar}>
              <Text style={styles.performerInitials}>
                {person.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.performerName}>{person.name}</Text>
              <Text style={styles.performerRole}>{person.role}</Text>
            </View>
            <View style={styles.performerScore}>
              <Text style={styles.performerScoreValue}>{person.score}</Text>
              <View style={styles.performerTrend}>
                <TrendingUpIcon size={12} color={colors.success} />
                <Text style={styles.performerTrendText}>{person.trend}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('screens.managerDashboard.recent_activity')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Approvals')}>
            <Text style={styles.seeAllText}>{t('screens.managerDashboard.see_all')}</Text>
          </TouchableOpacity>
        </View>
        {[
          { action: 'Skill verified', user: 'Sarah Johnson', time: '5 min ago', icon: CheckCircleIcon, color: colors.success, screen: 'Approvals', params: { screen: 'SkillsVerification' } },
          { action: 'Shift swap approved', user: 'Mike Chen', time: '12 min ago', icon: CalendarIcon, color: colors.info, screen: 'Schedule', params: { screen: 'TeamSchedule' } },
          { action: 'Time off rejected', user: 'David Kim', time: '1 hour ago', icon: XCircleIcon, color: colors.error, screen: 'Approvals', params: { screen: 'TeamRequests' } },
          { action: 'Job application', user: 'Emma Thompson', time: '2 hours ago', icon: UsersIcon, color: colors.momentum, screen: 'Team', params: undefined },
        ].map((activity, i) => (
          <TouchableOpacity
            key={i}
            style={styles.activityItem}
            onPress={() => navigation.navigate(activity.screen, activity.params)}
          >
            <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
              <activity.icon size={16} color={activity.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>{activity.action}</Text>
              <Text style={styles.activityUser}>{activity.user}</Text>
            </View>
            <Text style={styles.activityTime}>{activity.time}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // View Toggle
  viewToggleContainer: { paddingTop: 60, paddingBottom: spacing.md, alignItems: 'center', backgroundColor: colors.background },
  viewToggleContainerCompact: { paddingTop: 60, paddingBottom: 0, alignItems: 'center', backgroundColor: colors.background },

  // Header with Company Branding
  header: { backgroundColor: colors.background, paddingTop: 60, paddingBottom: spacing.lg, ...shadows.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  companyBranding: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  companyLogoContainer: { width: 52, height: 52, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.slate100 },
  companyLogo: { width: '100%', height: '100%', resizeMode: 'cover' },
  companyLogoPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.slate900, alignItems: 'center', justifyContent: 'center' },
  companyLogoText: { ...typography.h2, color: colors.background, fontWeight: '800' },
  greetingContainer: { flex: 1 },
  greetingText: { ...typography.caption, color: colors.slate500 },
  userName: { ...typography.h2, color: colors.slate900, fontSize: 20, marginTop: 2 },
  locationText: { ...typography.caption, color: colors.momentum, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerButton: { width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  messageBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.momentum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.background },
  messageBadgeText: { ...typography.caption, color: colors.background, fontWeight: '800', fontSize: 10 },
  notificationDot: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.slate100 },

  // Quick Clock In
  quickClockIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.momentum + '10', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.momentum + '30' },
  quickClockInText: { ...typography.bodyBold, color: colors.momentum, fontSize: 14 },

  // Metrics
  metricsContainer: { padding: spacing.md },
  metricsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  metricCard: { flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.xl, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, alignItems: 'center', ...shadows.sm },
  metricValue: { ...typography.h2, color: colors.slate900, marginTop: spacing.sm, marginBottom: spacing.xs, fontWeight: '800' },
  metricLabel: { ...typography.caption, color: colors.slate500, textAlign: 'center' },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.slate900 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  seeAllText: { ...typography.bodyBold, color: colors.momentum, fontSize: 14 },

  // Actions
  actionCard: { backgroundColor: colors.background, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionIconCircle: { width: 44, height: 44, backgroundColor: colors.slate100, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { ...typography.bodyBold, color: colors.slate900, fontSize: 16 },
  actionSubtitle: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  actionBadge: { backgroundColor: colors.momentum, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionBadgeText: { ...typography.bodyBold, color: colors.background, fontSize: 14 },

  // Insights
  insightCard: { backgroundColor: colors.slate100, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, borderStartWidth: 4 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  insightTitle: { ...typography.bodyBold, color: colors.slate900, fontSize: 16 },
  insightText: { ...typography.body, color: colors.slate700, lineHeight: 22, marginBottom: spacing.md },
  insightButton: { backgroundColor: colors.momentum, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' },
  insightButtonText: { ...typography.bodyBold, color: colors.background },

  // Performers
  performerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.xl, marginBottom: spacing.md, ...shadows.sm },
  performerRank: { width: 28, height: 28, backgroundColor: colors.momentum, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  performerRankText: { ...typography.bodyBold, color: colors.background, fontSize: 14 },
  performerAvatar: { width: 44, height: 44, backgroundColor: colors.slate200, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  performerInitials: { ...typography.bodyBold, color: colors.slate700 },
  performerName: { ...typography.bodyBold, color: colors.slate900 },
  performerRole: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  performerScore: { alignItems: 'flex-end' },
  performerScoreValue: { ...typography.h3, color: colors.momentum, fontWeight: '800' },
  performerTrend: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  performerTrendText: { ...typography.caption, color: colors.success, fontWeight: '700' },

  // Activity
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activityText: { ...typography.bodyBold, color: colors.slate900, fontSize: 14 },
  activityUser: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  activityTime: { ...typography.caption, color: colors.slate400 },

  // Forecast
  forecastCard: { backgroundColor: colors.background, borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.md },
  forecastSubtitle: { ...typography.caption, color: colors.slate500, marginBottom: spacing.lg },
  forecastChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, marginBottom: spacing.lg },
  forecastBar: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  forecastValue: { ...typography.caption, color: colors.slate600, marginBottom: spacing.xs, fontWeight: '700' },
  forecastBarFill: { width: '60%', backgroundColor: colors.momentum, borderRadius: borderRadius.sm, minHeight: 4 },
  forecastBarPeak: { backgroundColor: colors.warning },
  forecastDay: { ...typography.caption, color: colors.slate500, marginTop: spacing.sm, fontWeight: '600' },
  forecastSummary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate100, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  forecastStat: { alignItems: 'center' },
  forecastStatValue: { ...typography.h3, color: colors.slate900, fontWeight: '800' },
  forecastStatLabel: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  forecastStatDivider: { width: 1, height: 32, backgroundColor: colors.slate200 },
  forecastAlert: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warning + '15', padding: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.md },
  forecastAlertText: { ...typography.body, color: colors.warning, flex: 1, fontSize: 14 },
  forecastButton: { backgroundColor: colors.momentum, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.md },
  forecastButtonText: { ...typography.bodyBold, color: colors.background },
});
