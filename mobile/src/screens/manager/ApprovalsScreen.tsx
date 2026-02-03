import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon, XCircleIcon, ClockIcon, CalendarIcon, DollarSignIcon,
  UserIcon, AwardIcon, ChevronRightIcon, AlertCircleIcon, ChevronLeftIcon
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { usePendingApprovals } from '../../hooks/useData';
import { api } from '../../services/api';

interface ApprovalItem {
  id: string;
  type: 'time_off' | 'shift_swap' | 'expense' | 'skill';
  employee: string;
  employeeId: string;
  title: string;
  subtitle: string;
  date: string;
  urgency: 'low' | 'medium' | 'high';
  details?: any;
}

export const ApprovalsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'time_off' | 'shift_swap' | 'expense' | 'skill'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wire to API hook with demo fallback
  const { data: approvalsData, loading: approvalsLoading, refetch } = usePendingApprovals();

  // Transform API data to ApprovalItem format
  const pendingApprovals: ApprovalItem[] = (() => {
    if (!approvalsData) return [];
    const items: ApprovalItem[] = [];
    (approvalsData.timeOff ?? []).forEach((r: any) => {
      items.push({
        id: r.id, type: 'time_off', employee: r.employeeName ?? 'Employee',
        employeeId: r.employeeId ?? '', title: r.policyName ?? 'Time Off',
        subtitle: `${r.startDate} - ${r.endDate}`, date: '', urgency: 'medium', details: r,
      });
    });
    (approvalsData.swaps ?? []).forEach((r: any) => {
      items.push({
        id: r.id, type: 'shift_swap', employee: r.employeeName ?? 'Employee',
        employeeId: r.employeeId ?? '', title: 'Shift Swap Request',
        subtitle: r.reason ?? 'Swap request', date: '', urgency: 'medium', details: r,
      });
    });
    (approvalsData.timeEntries ?? []).forEach((r: any) => {
      items.push({
        id: r.id, type: 'expense', employee: r.employeeName ?? 'Employee',
        employeeId: r.employeeId ?? '', title: 'Expense',
        subtitle: `£${r.amount ?? ''}`, date: '', urgency: 'low', details: r,
      });
    });
    return items;
  })();

  const filteredApprovals = filter === 'all'
    ? pendingApprovals
    : pendingApprovals.filter(a => a.type === filter);

  const getTypeIcon = (type: ApprovalItem['type']) => {
    switch (type) {
      case 'time_off': return <CalendarIcon size={20} color={colors.info} />;
      case 'shift_swap': return <ClockIcon size={20} color={colors.warning} />;
      case 'expense': return <DollarSignIcon size={20} color={colors.success} />;
      case 'skill': return <AwardIcon size={20} color={colors.momentum} />;
    }
  };

  const getTypeLabel = (type: ApprovalItem['type']) => {
    switch (type) {
      case 'time_off': return 'Time Off';
      case 'shift_swap': return 'Shift Swap';
      case 'expense': return 'Expense';
      case 'skill': return 'Skill';
    }
  };

  const getUrgencyColor = (urgency: ApprovalItem['urgency']) => {
    switch (urgency) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.slate400;
    }
  };

  const handleApprove = (item: ApprovalItem) => {
    showAlert(
      'Approve Request',
      `Approve ${item.employee}'s ${getTypeLabel(item.type).toLowerCase()} request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              if (item.type === 'time_off') await api.approveTimeOff(item.id);
              else if (item.type === 'shift_swap') await api.approveSwap(item.id);
              else if (item.type === 'expense') await api.approveTimeEntry(item.id);
              showAlert('Approved', `${item.employee}'s request has been approved.`);
              refetch();
            } catch (e: any) {
              showAlert('Error', e.message || 'Failed to approve request. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleDeny = (item: ApprovalItem) => {
    showAlert(
      'Deny Request',
      `Deny ${item.employee}'s ${getTypeLabel(item.type).toLowerCase()} request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              if (item.type === 'time_off') await api.rejectTimeOff(item.id);
              else if (item.type === 'shift_swap') await api.rejectSwap(item.id);
              else if (item.type === 'expense') await api.rejectTimeEntry(item.id, 'Denied by manager');
              showAlert('Denied', `${item.employee}'s request has been denied.`);
              refetch();
            } catch (e: any) {
              showAlert('Error', e.message || 'Failed to deny request. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const counts = {
    all: pendingApprovals.length,
    time_off: pendingApprovals.filter(a => a.type === 'time_off').length,
    shift_swap: pendingApprovals.filter(a => a.type === 'shift_swap').length,
    expense: pendingApprovals.filter(a => a.type === 'expense').length,
    skill: pendingApprovals.filter(a => a.type === 'skill').length,
  };

  const filterOptions = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'time_off', label: 'Time Off', count: counts.time_off },
    { key: 'shift_swap', label: 'Swaps', count: counts.shift_swap },
    { key: 'expense', label: 'Expenses', count: counts.expense },
    { key: 'skill', label: 'Skills', count: counts.skill },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeftIcon size={24} color={colors.momentum} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('manager.approvals', 'Approvals')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>{counts.all} pending requests</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {filterOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterTab, filter === opt.key && styles.filterTabActive]}
              onPress={() => setFilter(opt.key as any)}
            >
              <Text style={[styles.filterText, filter === opt.key && styles.filterTextActive]}>
                {opt.label}
              </Text>
              {opt.count > 0 && (
                <View style={[styles.filterBadge, filter === opt.key && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, filter === opt.key && styles.filterBadgeTextActive]}>
                    {opt.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Approvals List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {(approvalsLoading || isSubmitting) && (
          <ActivityIndicator size="small" color={colors.momentum} style={{ marginBottom: spacing.md }} />
        )}
        {filteredApprovals.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircleIcon size={48} color={colors.success} />
            <Text style={styles.emptyTitle}>{t('screens.approvals.all_caught_up')}</Text>
            <Text style={styles.emptyText}>No pending {filter === 'all' ? 'approvals' : getTypeLabel(filter as any).toLowerCase() + ' requests'}</Text>
          </View>
        ) : (
          filteredApprovals.map((item) => (
            <View key={item.id} style={styles.approvalCard}>
              {/* Urgency Indicator */}
              {item.urgency === 'high' && (
                <View style={styles.urgentBadge}>
                  <AlertCircleIcon size={12} color={colors.background} />
                  <Text style={styles.urgentText}>Urgent</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: colors.slate100 }]}>
                  {getTypeIcon(item.type)}
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={[styles.urgencyDot, { backgroundColor: getUrgencyColor(item.urgency) }]} />
                  </View>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  <View style={styles.employeeRow}>
                    <UserIcon size={14} color={colors.slate400} />
                    <Text style={styles.employeeName}>{item.employee}</Text>
                    <Text style={styles.dateText}>• {item.date}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.denyButton}
                  onPress={() => handleDeny(item)}
                >
                  <XCircleIcon size={18} color={colors.error} />
                  <Text style={styles.denyButtonText}>Deny</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(item)}
                >
                  <CheckCircleIcon size={18} color={colors.background} />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: spacing.xxl }} />
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

  // Filters
  filterWrapper: { backgroundColor: colors.background, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  filterContainer: { paddingHorizontal: spacing.md, gap: spacing.sm },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate100,
  },
  filterTabActive: { backgroundColor: colors.momentum },
  filterText: { ...typography.bodyBold, color: colors.slate700, fontSize: 13 },
  filterTextActive: { color: colors.background },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { ...typography.small, color: colors.slate700, fontWeight: '700' },
  filterBadgeTextActive: { color: colors.background },

  // Content
  content: { flex: 1, padding: spacing.lg },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: { ...typography.h2, color: colors.slate900, marginTop: spacing.lg },
  emptyText: { ...typography.body, color: colors.slate500, marginTop: spacing.sm },

  // Approval Card
  approvalCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  urgentBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  urgentText: { ...typography.small, color: colors.background, fontWeight: '700', fontSize: 10 },
  cardHeader: { flexDirection: 'row', gap: spacing.md },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.bodyBold, color: colors.slate900, flex: 1 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },
  cardSubtitle: { ...typography.body, color: colors.slate700, marginTop: 2 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  employeeName: { ...typography.caption, color: colors.slate500, fontWeight: '600' },
  dateText: { ...typography.caption, color: colors.slate400 },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  denyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.error + '15',
  },
  denyButtonText: { ...typography.bodyBold, color: colors.error },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.success,
  },
  approveButtonText: { ...typography.bodyBold, color: colors.background },
});
