import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon, StarIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { useSkillVerificationRequests } from '../../hooks/useData';
import { api } from '../../services/api';

interface SkillRequest {
  id: string;
  worker: { name: string; role: string };
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  evidence: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const SkillsVerificationScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const { data, loading, refetch } = useSkillVerificationRequests();
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'approved' | 'rejected'>>({});

  // Transform API data into SkillRequest format
  const requests: SkillRequest[] = React.useMemo(() => {
    if (!data?.requests) return [];
    return data.requests.map((r: any) => ({
      id: r.id,
      worker: {
        name: r.employeeName || r.worker?.name || `Employee ${r.employeeId}`,
        role: r.roleName || r.worker?.role || '',
      },
      skill: r.skillName || r.skill || '',
      level: r.level || 'intermediate',
      evidence: r.evidence || '',
      submittedDate: r.submittedDate || r.createdAt || '',
      status: localStatuses[r.id] || r.status || 'pending',
    }));
  }, [data, localStatuses]);

  const handleApprove = useCallback((requestId: string) => {
    showAlert(
      'Approve Skill',
      'Verify this skill for the worker?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.verifySkill(requestId, true);
              setLocalStatuses(prev => ({ ...prev, [requestId]: 'approved' }));
              showAlert(t('common.approved'), 'Skill has been verified and added to worker profile');
            } catch (e: any) {
              showAlert('Error', e.message || 'Failed to approve skill');
            }
          }
        }
      ]
    );
  }, [t]);

  const handleReject = useCallback((requestId: string) => {
    showAlert(
      'Reject Skill',
      'Reject this skill verification request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.verifySkill(requestId, false, 'Rejected by manager');
              setLocalStatuses(prev => ({ ...prev, [requestId]: 'rejected' }));
              showAlert(t('common.rejected'), 'Worker has been notified');
            } catch (e: any) {
              showAlert('Error', e.message || 'Failed to reject skill');
            }
          }
        }
      ]
    );
  }, [t]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return colors.momentum;
      case 'advanced': return colors.success;
      case 'intermediate': return colors.info;
      default: return colors.slate500;
    }
  };

  const filteredRequests = filter === 'pending'
    ? requests.filter(r => r.status === 'pending')
    : requests;

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('manager.skillsVerification')}</Text>
          <Text style={styles.subtitle}>{pendingCount} pending approval</Text>
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
            All ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.momentum} />
            <Text style={[styles.emptyText, { marginTop: spacing.md }]}>{t('screens.skillsVerification.loading_verification_requests')}</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('screens.skillsVerification.all_caught_up')}</Text>
            <Text style={styles.emptyText}>{t('screens.skillsVerification.no_pending_skill_verifications')}</Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              {/* Worker Info */}
              <View style={styles.workerInfo}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerInitials}>
                    {request.worker.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{request.worker.name}</Text>
                  <Text style={styles.workerRole}>{request.worker.role}</Text>
                </View>
                {request.status === 'pending' && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{t('common.pending')}</Text>
                  </View>
                )}
                {request.status === 'approved' && (
                  <View style={styles.approvedBadge}>
                    <CheckCircleIcon size={20} color={colors.success} />
                    <Text style={styles.approvedText}>{t('common.approved')}</Text>
                  </View>
                )}
                {request.status === 'rejected' && (
                  <View style={styles.rejectedBadge}>
                    <XCircleIcon size={20} color={colors.error} />
                    <Text style={styles.rejectedText}>{t('common.rejected')}</Text>
                  </View>
                )}
              </View>

              {/* Skill Details */}
              <View style={styles.skillSection}>
                <View style={styles.skillHeader}>
                  <StarIcon size={20} color={getLevelColor(request.level)} />
                  <Text style={styles.skillName}>{request.skill}</Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(request.level) + '20' }]}>
                  <Text style={[styles.levelText, { color: getLevelColor(request.level) }]}>
                    {request.level}
                  </Text>
                </View>
              </View>

              {/* Evidence */}
              <View style={styles.evidenceSection}>
                <Text style={styles.evidenceLabel}>{t('screens.skillsVerification.evidence')}</Text>
                <Text style={styles.evidenceText}>{request.evidence}</Text>
              </View>

              <Text style={styles.submittedDate}>Submitted {request.submittedDate}</Text>

              {/* Actions */}
              {request.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(request.id)}
                  >
                    <XCircleIcon size={20} color={colors.error} />
                    <Text style={styles.rejectButtonText}>{t('common.reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(request.id)}
                  >
                    <CheckCircleIcon size={20} color={colors.background} />
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
  content: { flex: 1, padding: spacing.md },
  emptyState: { alignItems: 'center', padding: spacing.xxl, marginTop: spacing.xxl },
  emptyTitle: { ...typography.h2, color: colors.slate900, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.slate600 },
  requestCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  workerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  workerAvatar: { width: 48, height: 48, backgroundColor: colors.momentum, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  workerInitials: { ...typography.h3, color: colors.background },
  workerName: { ...typography.h3, color: colors.slate900, fontSize: 16 },
  workerRole: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs / 2 },
  pendingBadge: { backgroundColor: colors.warning + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  pendingText: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  approvedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.success + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  approvedText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  rejectedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.error + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  rejectedText: { ...typography.caption, color: colors.error, fontWeight: '700' },
  skillSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  skillHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  skillName: { ...typography.h3, color: colors.slate900 },
  levelBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  levelText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
  evidenceSection: { marginBottom: spacing.md },
  evidenceLabel: { ...typography.caption, color: colors.slate600, marginBottom: spacing.xs },
  evidenceText: { ...typography.body, color: colors.slate800, lineHeight: 22 },
  submittedDate: { ...typography.caption, color: colors.slate500, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.error, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  rejectButtonText: { ...typography.bodyBold, color: colors.error },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  approveButtonText: { ...typography.bodyBold, color: colors.background },
});
