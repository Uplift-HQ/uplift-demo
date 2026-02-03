import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, ClockIcon, UsersIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { usePendingApprovals } from '../../hooks/useData';
import { api } from '../../services/api';

interface PendingAction {
  id: string;
  type: 'shift_swap' | 'time_off' | 'call_in_sick';
  worker: { name: string; role: string };
  details: string;
  date: string;
  impact: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const TeamScheduleScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const { data: approvalsData, loading, refetch } = usePendingApprovals();
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'approved' | 'rejected'>>({});

  // Transform API data into PendingAction format
  const pendingActions: PendingAction[] = React.useMemo(() => {
    if (!approvalsData) return [];
    const actions: PendingAction[] = [];

    (approvalsData.timeOff || []).forEach((req: any) => {
      actions.push({
        id: `timeoff-${req.id}`,
        type: 'time_off',
        worker: {
          name: req.employeeName || `Employee ${req.employeeId}`,
          role: req.roleName || '',
        },
        details: `Requesting ${req.totalDays || 1} day(s) off (${req.startDate} - ${req.endDate})`,
        date: `${req.startDate} - ${req.endDate}`,
        impact: `${req.totalDays || 1} shift(s) need coverage`,
        status: localStatuses[`timeoff-${req.id}`] || req.status || 'pending',
      });
    });

    (approvalsData.swaps || []).forEach((swap: any) => {
      actions.push({
        id: `swap-${swap.id}`,
        type: 'shift_swap',
        worker: {
          name: swap.employeeName || `Employee ${swap.employeeId || swap.requesterId}`,
          role: swap.roleName || '',
        },
        details: swap.reason || 'Shift swap request',
        date: swap.date || swap.shiftDate || '',
        impact: swap.impact || 'No coverage gap',
        status: localStatuses[`swap-${swap.id}`] || swap.status || 'pending',
      });
    });

    (approvalsData.timeEntries || []).forEach((entry: any) => {
      actions.push({
        id: `entry-${entry.id}`,
        type: 'call_in_sick',
        worker: {
          name: entry.employeeName || `Employee ${entry.employeeId}`,
          role: entry.roleName || '',
        },
        details: entry.notes || 'Time entry pending approval',
        date: entry.clockIn || '',
        impact: '1 shift needs review',
        status: localStatuses[`entry-${entry.id}`] || entry.status || 'pending',
      });
    });

    return actions;
  }, [approvalsData, localStatuses]);

  const handleApprove = useCallback((actionId: string) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return;
    showAlert(
      'Approve Request',
      `Approve ${action.type.replace('_', ' ')} for ${action.worker.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const [prefix, id] = actionId.split('-');
              if (prefix === 'timeoff') await api.approveTimeOff(id);
              else if (prefix === 'swap') await api.approveSwap(id);
              else if (prefix === 'entry') await api.approveTimeEntry(id);

              setLocalStatuses(prev => ({ ...prev, [actionId]: 'approved' }));
              showAlert(t('common.approved'), 'Worker has been notified');
            } catch (e: any) {
              showAlert('Error', e.message || 'Failed to approve');
            }
          }
        }
      ]
    );
  }, [pendingActions, t]);

  const handleReject = useCallback((actionId: string) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return;
    showAlert(
      'Reject Request',
      `Reject ${action.type.replace('_', ' ')} for ${action.worker.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const [prefix, id] = actionId.split('-');
              if (prefix === 'timeoff') await api.rejectTimeOff(id);
              else if (prefix === 'swap') await api.rejectSwap(id);
              else if (prefix === 'entry') await api.rejectTimeEntry(id, 'Rejected by manager');

              setLocalStatuses(prev => ({ ...prev, [actionId]: 'rejected' }));
              showAlert(t('common.rejected'), 'Worker has been notified');
            } catch (e: any) {
              showAlert('Error', e.message || 'Failed to reject');
            }
          }
        }
      ]
    );
  }, [pendingActions, t]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'shift_swap': return 'Swap';
      case 'time_off': return 'Time Off';
      case 'call_in_sick': return 'Sick';
      default: return 'Task';
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'shift_swap': return colors.info;
      case 'time_off': return colors.success;
      case 'call_in_sick': return colors.warning;
      default: return colors.slate500;
    }
  };

  const filteredActions = filter === 'pending'
    ? pendingActions.filter(a => a.status === 'pending')
    : pendingActions;

  const pendingCount = pendingActions.filter(a => a.status === 'pending').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('schedule.teamSchedule')}</Text>
          <Text style={styles.subtitle}>{pendingCount} pending approvals</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({pendingActions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <UsersIcon size={24} color={colors.momentum} />
            <Text style={styles.statValue}>{pendingActions.length}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
          <View style={styles.statCard}>
            <CalendarIcon size={24} color={colors.success} />
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <ClockIcon size={24} color={colors.info} />
            <Text style={styles.statValue}>{pendingActions.filter(a => a.status === 'approved').length}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.momentum} />
            <Text style={[styles.emptyText, { marginTop: spacing.md }]}>{t('screens.teamSchedule.loading_approvals')}</Text>
          </View>
        ) : filteredActions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('screens.teamSchedule.all_caught_up')}</Text>
            <Text style={styles.emptyText}>{t('manager.noApprovals')}</Text>
          </View>
        ) : (
          filteredActions.map((action) => (
            <View
              key={action.id}
              style={[
                styles.actionCard,
                { borderStartColor: getActionColor(action.type) }
              ]}
            >
              <View style={styles.actionHeader}>
                <Text style={styles.actionIcon}>{getActionIcon(action.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionType}>{action.type.replace('_', ' ')}</Text>
                  <Text style={styles.workerName}>{action.worker.name}</Text>
                  <Text style={styles.workerRole}>{action.worker.role}</Text>
                </View>
                {action.status === 'pending' && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{t('common.pending')}</Text>
                  </View>
                )}
                {action.status === 'approved' && (
                  <View style={styles.approvedBadge}>
                    <CheckCircleIcon size={16} color={colors.success} />
                    <Text style={styles.approvedText}>{t('common.approved')}</Text>
                  </View>
                )}
                {action.status === 'rejected' && (
                  <View style={styles.rejectedBadge}>
                    <XCircleIcon size={16} color={colors.error} />
                    <Text style={styles.rejectedText}>{t('common.rejected')}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionDetails}>
                <View style={styles.detailRow}>
                  <CalendarIcon size={14} color={colors.slate600} />
                  <Text style={styles.detailText}>{action.date}</Text>
                </View>
                <Text style={styles.actionDescription}>{action.details}</Text>
              </View>

              <View style={styles.impactBadge}>
                <AlertCircleIcon size={14} color={colors.info} />
                <Text style={styles.impactText}>{action.impact}</Text>
              </View>

              {action.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(action.id)}
                  >
                    <XCircleIcon size={18} color={colors.error} />
                    <Text style={styles.rejectButtonText}>{t('common.reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(action.id)}
                  >
                    <CheckCircleIcon size={18} color={colors.background} />
                    <Text style={styles.approveButtonText}>{t('common.approve')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, gap: spacing.md, ...shadows.sm },
  backButton: {},
  backButtonText: { ...typography.bodyBold, color: colors.momentum },
  title: { ...typography.h2, color: colors.slate900 },
  subtitle: { ...typography.body, color: colors.slate600, marginTop: spacing.xs },
  filterContainer: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.slate200, gap: spacing.sm },
  filterTab: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.slate100, alignItems: 'center' },
  filterTabActive: { backgroundColor: colors.momentum },
  filterText: { ...typography.bodyBold, color: colors.slate700 },
  filterTextActive: { color: colors.background },
  content: { flex: 1 },
  statsRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', ...shadows.sm },
  statValue: { ...typography.h2, color: colors.slate900, marginTop: spacing.sm, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs, textAlign: 'center' },
  emptyState: { alignItems: 'center', padding: spacing.xxl, marginTop: spacing.xxl },
  emptyTitle: { ...typography.h2, color: colors.slate900, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.slate600 },
  actionCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, margin: spacing.md, borderStartWidth: 4, ...shadows.md },
  actionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  actionIcon: { ...typography.caption, color: colors.slate700, fontWeight: '700', textTransform: 'uppercase', backgroundColor: colors.slate100, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  actionType: { ...typography.caption, color: colors.slate600, textTransform: 'capitalize', marginBottom: spacing.xs / 2 },
  workerName: { ...typography.h3, color: colors.slate900, fontSize: 16 },
  workerRole: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs / 2 },
  pendingBadge: { backgroundColor: colors.warning + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  pendingText: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  approvedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.success + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  approvedText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  rejectedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.error + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  rejectedText: { ...typography.caption, color: colors.error, fontWeight: '700' },
  actionDetails: { marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  detailText: { ...typography.caption, color: colors.slate600 },
  actionDescription: { ...typography.body, color: colors.slate800 },
  impactBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.info + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, marginBottom: spacing.md },
  impactText: { ...typography.caption, color: colors.info, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.md },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.error, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  rejectButtonText: { ...typography.bodyBold, color: colors.error },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  approveButtonText: { ...typography.bodyBold, color: colors.background },
});
