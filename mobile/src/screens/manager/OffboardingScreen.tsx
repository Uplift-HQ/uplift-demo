import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import {
  UsersIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon,
  ChevronLeftIcon, ChevronRightIcon, CalendarIcon, BarChartIcon,
  UserIcon, LogOutIcon
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export const OffboardingScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const activeOffboardings = [
    {
      id: '1',
      name: 'Marcus Thompson',
      initials: 'MT',
      reason: t('manager.offboarding.resignation', 'Resignation'),
      lastDay: t('manager.offboarding.lastDayFeb14', 'Feb 14, 2025'),
      tasksComplete: 4,
      tasksTotal: 8,
      progress: 0.5,
    },
    {
      id: '2',
      name: 'Linda Okafor',
      initials: 'LO',
      reason: t('manager.offboarding.redundancy', 'Redundancy'),
      lastDay: t('manager.offboarding.lastDayFeb28', 'Feb 28, 2025'),
      tasksComplete: 1,
      tasksTotal: 8,
      progress: 0.125,
    },
  ];

  const pendingTasks = [
    {
      id: '1',
      text: t('manager.offboarding.revokeAccess', "Revoke Marcus's system access"),
      urgency: 'overdue' as const,
      badge: t('manager.offboarding.overdue', 'Overdue'),
      badgeColor: colors.error,
    },
    {
      id: '2',
      text: t('manager.offboarding.scheduleExitLinda', 'Schedule exit interview - Linda'),
      urgency: 'urgent' as const,
      badge: t('manager.offboarding.dueTomorrow', 'Due tomorrow'),
      badgeColor: colors.warning,
    },
    {
      id: '3',
      text: t('manager.offboarding.collectLaptop', 'Collect laptop - Marcus'),
      urgency: 'upcoming' as const,
      badge: t('manager.offboarding.dueIn3Days', 'Due in 3 days'),
      badgeColor: colors.info,
    },
  ];

  const exitInterviews = [
    {
      id: '1',
      name: 'Marcus Thompson',
      initials: 'MT',
      date: t('manager.offboarding.marcusInterviewDate', 'Feb 10, 2pm'),
      status: t('manager.offboarding.scheduled', 'Scheduled'),
      statusColor: colors.success,
    },
    {
      id: '2',
      name: 'Linda Okafor',
      initials: 'LO',
      date: t('manager.offboarding.lindaInterviewDate', 'Feb 24, 10am'),
      status: t('manager.offboarding.pending', 'Pending'),
      statusColor: colors.warning,
    },
  ];

  const quickStats = [
    {
      label: t('manager.offboarding.leaversThisQuarter', 'Leavers this quarter'),
      value: '3',
      icon: UsersIcon,
      color: colors.momentum,
    },
    {
      label: t('manager.offboarding.avgCompletion', 'Avg offboarding completion'),
      value: '85%',
      icon: BarChartIcon,
      color: colors.success,
    },
    {
      label: t('manager.offboarding.pendingExitInterviews', 'Pending exit interviews'),
      value: '2',
      icon: CalendarIcon,
      color: colors.warning,
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
          <Text style={styles.title}>{t('manager.offboarding.title', 'Offboarding')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>
          {t('manager.offboarding.subtitle', 'Manage employee departures')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Offboardings */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <LogOutIcon size={20} color={colors.momentum} />
            <Text style={styles.sectionTitle}>
              {t('manager.offboarding.activeOffboardings', 'Active Offboardings')}
            </Text>
          </View>

          {activeOffboardings.map((emp) => (
            <View key={emp.id} style={styles.offboardingCard}>
              <View style={styles.employeeHeader}>
                <View style={styles.employeeAvatar}>
                  <Text style={styles.employeeInitials}>{emp.initials}</Text>
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{emp.name}</Text>
                  <View style={styles.employeeMetaRow}>
                    <View style={styles.reasonBadge}>
                      <Text style={styles.reasonBadgeText}>{emp.reason}</Text>
                    </View>
                    <Text style={styles.lastDayText}>
                      {t('manager.offboarding.lastDay', 'Last day:')} {emp.lastDay}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.taskProgressRow}>
                <Text style={styles.taskProgressLabel}>
                  {t('manager.offboarding.tasksProgress', '{{done}}/{{total}} tasks done', {
                    done: emp.tasksComplete,
                    total: emp.tasksTotal,
                  })}
                </Text>
                <Text style={styles.taskProgressPercent}>
                  {Math.round(emp.progress * 100)}%
                </Text>
              </View>

              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${emp.progress * 100}%` },
                    emp.progress < 0.3 && { backgroundColor: colors.error },
                    emp.progress >= 0.3 && emp.progress < 0.7 && { backgroundColor: colors.warning },
                    emp.progress >= 0.7 && { backgroundColor: colors.success },
                  ]}
                />
              </View>

              <TouchableOpacity style={styles.viewTasksButton}>
                <Text style={styles.viewTasksButtonText}>
                  {t('manager.offboarding.viewTasks', 'View Tasks')}
                </Text>
                <ChevronRightIcon size={18} color={colors.background} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Pending Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AlertCircleIcon size={20} color={colors.error} />
            <Text style={styles.sectionTitle}>
              {t('manager.offboarding.pendingTasks', 'Pending Tasks')}
            </Text>
          </View>

          {pendingTasks.map((task) => (
            <TouchableOpacity key={task.id} style={styles.taskItem}>
              <View style={[styles.urgencyBar, { backgroundColor: task.badgeColor }]} />
              <View style={styles.taskContent}>
                <Text style={styles.taskText}>{task.text}</Text>
                <View style={[styles.taskBadge, { backgroundColor: task.badgeColor + '20' }]}>
                  <Text style={[styles.taskBadgeText, { color: task.badgeColor }]}>
                    {task.badge}
                  </Text>
                </View>
              </View>
              <ChevronRightIcon size={18} color={colors.slate400} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Exit Interview Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <CalendarIcon size={20} color={colors.info} />
            <Text style={styles.sectionTitle}>
              {t('manager.offboarding.exitInterviewSchedule', 'Exit Interview Schedule')}
            </Text>
          </View>

          <View style={styles.interviewsCard}>
            {exitInterviews.map((interview, i) => (
              <View
                key={interview.id}
                style={[
                  styles.interviewItem,
                  i < exitInterviews.length - 1 && styles.interviewItemBorder,
                ]}
              >
                <View style={styles.interviewAvatar}>
                  <Text style={styles.interviewInitials}>{interview.initials}</Text>
                </View>
                <View style={styles.interviewInfo}>
                  <Text style={styles.interviewName}>{interview.name}</Text>
                  <Text style={styles.interviewDate}>{interview.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: interview.statusColor + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: interview.statusColor }]}>
                    {interview.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <BarChartIcon size={20} color={colors.momentum} />
            <Text style={styles.sectionTitle}>
              {t('manager.offboarding.quickStats', 'Quick Stats')}
            </Text>
          </View>

          <View style={styles.quickStatsCard}>
            {quickStats.map((stat, i) => (
              <View
                key={i}
                style={[
                  styles.quickStatItem,
                  i < quickStats.length - 1 && styles.quickStatItemBorder,
                ]}
              >
                <View style={[styles.quickStatIcon, { backgroundColor: stat.color + '15' }]}>
                  <stat.icon size={20} color={stat.color} />
                </View>
                <View style={styles.quickStatInfo}>
                  <Text style={styles.quickStatLabel}>{stat.label}</Text>
                </View>
                <Text style={[styles.quickStatValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
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

  // Section
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3, color: colors.slate900 },

  // Offboarding Card
  offboardingCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInitials: { ...typography.bodyBold, color: colors.slate700 },
  employeeInfo: { flex: 1 },
  employeeName: { ...typography.bodyBold, color: colors.slate900, fontSize: 16 },
  employeeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  reasonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.slate100,
  },
  reasonBadgeText: { ...typography.small, color: colors.slate600, fontWeight: '600' },
  lastDayText: { ...typography.caption, color: colors.slate500 },

  // Task Progress
  taskProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  taskProgressLabel: { ...typography.caption, color: colors.slate500 },
  taskProgressPercent: { ...typography.bodyBold, color: colors.slate700, fontSize: 14 },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
  },
  viewTasksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  viewTasksButtonText: { ...typography.bodyBold, color: colors.background },

  // Pending Tasks
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  urgencyBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  taskContent: { flex: 1 },
  taskText: { ...typography.bodyBold, color: colors.slate900, fontSize: 14 },
  taskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  taskBadgeText: { ...typography.small, fontWeight: '700' },

  // Exit Interviews
  interviewsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  interviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  interviewItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  interviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.info + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interviewInitials: { ...typography.bodyBold, color: colors.info, fontSize: 14 },
  interviewInfo: { flex: 1 },
  interviewName: { ...typography.bodyBold, color: colors.slate900 },
  interviewDate: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: { ...typography.small, fontWeight: '700' },

  // Quick Stats
  quickStatsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  quickStatItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatInfo: { flex: 1 },
  quickStatLabel: { ...typography.body, color: colors.slate700, fontSize: 14 },
  quickStatValue: {
    ...typography.h3,
    fontWeight: '800',
  },
});
