import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon, ClockIcon, FileTextIcon, CameraIcon, AlertCircleIcon, ChevronRightIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';

interface ExpenseRequest {
  id: string;
  worker: {
    name: string;
    role: string;
    avatar?: string;
  };
  category: string;
  amount: number;
  date: string;
  description: string;
  receiptUrl?: string;
  submittedAt: string;
  policyCompliant: boolean;
  policyNotes?: string[];
}

export const ExpenseApprovalsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Expenses loaded from API - starts empty
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load pending expenses from API
  React.useEffect(() => {
    const loadExpenses = async () => {
      try {
        // API call would go here: const response = await api.getPendingExpenses();
        // setExpenses(response.expenses);
        setExpenses([]); // Start empty - expenses come from API
      } finally {
        setIsLoading(false);
      }
    };
    loadExpenses();
  }, []);

  const totalPending = expenses.reduce((acc, e) => acc + e.amount, 0);
  const compliantCount = expenses.filter(e => e.policyCompliant).length;

  const handleApprove = (expense: ExpenseRequest) => {
    showAlert(
      'Approve Expense',
      `Approve £${expense.amount.toFixed(2)} ${expense.category} expense from ${expense.worker.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            setExpenses(prev => prev.filter(e => e.id !== expense.id));
            setShowDetailModal(false);
            showAlert(t('common.approved'), `${expense.worker.name} has been notified`);
          }
        }
      ]
    );
  };

  const handleReject = () => {
    if (!selectedExpense) return;
    
    if (!rejectionReason.trim()) {
      showAlert('Reason Required', 'Please provide a reason for rejection');
      return;
    }

    setExpenses(prev => prev.filter(e => e.id !== selectedExpense.id));
    setShowRejectModal(false);
    setShowDetailModal(false);
    setRejectionReason('');
    showAlert(t('common.rejected'), `${selectedExpense.worker.name} has been notified with your feedback`);
  };

  const openDetail = (expense: ExpenseRequest) => {
    setSelectedExpense(expense);
    setShowDetailModal(true);
  };

  const openRejectModal = () => {
    setShowDetailModal(false);
    setShowRejectModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('manager.expenseApprovals')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{expenses.length}</Text>
          <Text style={styles.summaryLabel}>{t('common.pending')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>£{totalPending.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>{t('screens.expenseApprovals.total_amount')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: compliantCount === expenses.length ? colors.success : colors.warning }]}>
            {compliantCount}/{expenses.length}
          </Text>
          <Text style={styles.summaryLabel}>{t('screens.expenseApprovals.policy_ok')}</Text>
        </View>
      </View>

      {/* Bulk Actions */}
      <View style={styles.bulkActions}>
        <TouchableOpacity 
          style={[styles.bulkButton, { backgroundColor: colors.success + '15' }]}
          onPress={() => showAlert('Approve All', `Approve all ${compliantCount} policy-compliant expenses?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Approve All', onPress: () => {
              setExpenses(prev => prev.filter(e => !e.policyCompliant));
              showAlert(t('common.approved'), `${compliantCount} expenses approved`);
            }}
          ])}
        >
          <CheckCircleIcon size={16} color={colors.success} />
          <Text style={[styles.bulkButtonText, { color: colors.success }]}>Approve Compliant ({compliantCount})</Text>
        </TouchableOpacity>
      </View>

      {/* Expense List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {expenses.map((expense) => (
          <TouchableOpacity
            key={expense.id}
            style={styles.expenseCard}
            onPress={() => openDetail(expense)}
          >
            <View style={styles.expenseHeader}>
              <View style={styles.workerInfo}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerInitials}>
                    {expense.worker.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View>
                  <Text style={styles.workerName}>{expense.worker.name}</Text>
                  <Text style={styles.workerRole}>{expense.worker.role}</Text>
                </View>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amount}>£{expense.amount.toFixed(2)}</Text>
                <Text style={styles.submittedAt}>{expense.submittedAt}</Text>
              </View>
            </View>

            <View style={styles.expenseBody}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{expense.category}</Text>
              </View>
              <Text style={styles.description} numberOfLines={2}>{expense.description}</Text>
            </View>

            {!expense.policyCompliant && (
              <View style={styles.policyWarning}>
                <AlertCircleIcon size={16} color={colors.error} />
                <Text style={styles.policyWarningText}>{t('screens.expenseApprovals.policy_review_required')}</Text>
              </View>
            )}

            <View style={styles.expenseActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => {
                  setSelectedExpense(expense);
                  openRejectModal();
                }}
              >
                <XCircleIcon size={16} color={colors.error} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>{t('common.reject')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApprove(expense)}
              >
                <CheckCircleIcon size={16} color={colors.success} />
                <Text style={[styles.actionButtonText, { color: colors.success }]}>{t('common.approve')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {expenses.length === 0 && (
          <View style={styles.emptyState}>
            <CheckCircleIcon size={48} color={colors.success} />
            <Text style={styles.emptyStateTitle}>{t('screens.expenseApprovals.all_caught_up')}</Text>
            <Text style={styles.emptyStateText}>{t('screens.expenseApprovals.no_pending_expense_approvals')}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedExpense && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('screens.expenseApprovals.expense_details')}</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <XCircleIcon size={24} color={colors.slate400} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Worker Info */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailWorker}>
                      <View style={styles.workerAvatarLarge}>
                        <Text style={styles.workerInitialsLarge}>
                          {selectedExpense.worker.name.split(' ').map(n => n[0]).join('')}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.detailWorkerName}>{selectedExpense.worker.name}</Text>
                        <Text style={styles.detailWorkerRole}>{selectedExpense.worker.role}</Text>
                      </View>
                    </View>
                  </View>

                {/* Amount & Category */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('expenses.amount')}</Text>
                    <Text style={styles.detailValueLarge}>£{selectedExpense.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('expenses.category')}</Text>
                    <View style={styles.categoryBadgeLarge}>
                      <Text style={styles.categoryTextLarge}>{selectedExpense.category}</Text>
                    </View>
                  </View>
                </View>

                {/* Date & Description */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('screens.expenseApprovals.date_of_expense')}</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedExpense.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('expenses.description')}</Text>
                  <Text style={styles.detailValue}>{selectedExpense.description}</Text>
                </View>

                {/* Receipt */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('expenses.receipt')}</Text>
                  <TouchableOpacity 
                    style={styles.receiptPreview}
                    onPress={() => showAlert('Receipt Image', 'Receipt uploaded on ' + selectedExpense.date + '\n\nIn production, this would open the full receipt image.')}
                  >
                    <CameraIcon size={32} color={colors.slate400} />
                    <Text style={styles.receiptPreviewText}>{t('screens.expenseApprovals.tap_to_view_receipt')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Policy Compliance */}
                <View style={[styles.policyCheck, { backgroundColor: selectedExpense.policyCompliant ? colors.success + '15' : colors.error + '15' }]}>
                  {selectedExpense.policyCompliant ? (
                    <>
                      <CheckCircleIcon size={20} color={colors.success} />
                      <Text style={[styles.policyCheckText, { color: colors.success }]}>{t('screens.expenseApprovals.policy_compliant')}</Text>
                    </>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <AlertCircleIcon size={20} color={colors.error} />
                        <Text style={[styles.policyCheckText, { color: colors.error }]}>{t('screens.expenseApprovals.policy_issues_found')}</Text>
                      </View>
                      {selectedExpense.policyNotes?.map((note, i) => (
                        <Text key={i} style={styles.policyNote}>• {note}</Text>
                      ))}
                    </View>
                  )}
                </View>
                </ScrollView>

                {/* Fixed Footer Actions */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.error + '15' }]}
                    onPress={openRejectModal}
                  >
                    <XCircleIcon size={20} color={colors.error} />
                    <Text style={[styles.modalButtonText, { color: colors.error }]}>{t('common.reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.success }]}
                    onPress={() => handleApprove(selectedExpense)}
                  >
                    <CheckCircleIcon size={20} color={colors.background} />
                    <Text style={[styles.modalButtonText, { color: colors.background }]}>{t('common.approve')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('screens.expenseApprovals.reject_expense')}</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting this expense. {selectedExpense?.worker.name} will be notified.
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="Reason for rejection..."
              placeholderTextColor={colors.slate400}
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.quickReasons}>
              {[
                'Receipt missing or unclear',
                'Exceeds category limit',
                'Not work-related expense',
                'Duplicate submission',
              ].map((reason, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickReasonButton}
                  onPress={() => setRejectionReason(reason)}
                >
                  <Text style={styles.quickReasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.slate100 }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.slate700 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={handleReject}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>{t('screens.expenseApprovals.reject_expense')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background },
  backButton: { ...typography.bodyBold, color: colors.momentum },
  headerTitle: { ...typography.h2, color: colors.slate900 },
  
  summary: { flexDirection: 'row', backgroundColor: colors.background, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { ...typography.h2, color: colors.slate900, fontWeight: '800' },
  summaryLabel: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs / 2 },
  summaryDivider: { width: 1, backgroundColor: colors.slate200 },
  
  bulkActions: { padding: spacing.lg, backgroundColor: colors.background },
  bulkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
  bulkButtonText: { ...typography.bodyBold },
  
  list: { flex: 1, padding: spacing.lg },
  expenseCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  workerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workerAvatar: { width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.slate200, alignItems: 'center', justifyContent: 'center' },
  workerInitials: { ...typography.bodyBold, color: colors.slate700 },
  workerName: { ...typography.bodyBold, color: colors.slate900 },
  workerRole: { ...typography.caption, color: colors.slate600 },
  amountContainer: { alignItems: 'flex-end' },
  amount: { ...typography.h3, color: colors.slate900, fontWeight: '800' },
  submittedAt: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs / 2 },
  
  expenseBody: { marginTop: spacing.md },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  categoryText: { ...typography.caption, color: colors.slate700, fontWeight: '700' },
  description: { ...typography.body, color: colors.slate700 },
  
  policyWarning: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.error + '10', borderRadius: borderRadius.md },
  policyWarningText: { ...typography.caption, color: colors.error, fontWeight: '600' },
  
  expenseActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate100 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  rejectButton: { backgroundColor: colors.error + '10' },
  approveButton: { backgroundColor: colors.success + '10' },
  actionButtonText: { ...typography.bodyBold },
  
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyStateTitle: { ...typography.h3, color: colors.slate900, marginTop: spacing.lg },
  emptyStateText: { ...typography.body, color: colors.slate600, marginTop: spacing.xs },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, paddingBottom: spacing.md },
  modalScroll: { paddingHorizontal: spacing.xl },
  modalFooter: { flexDirection: 'row', gap: spacing.md, padding: spacing.xl, paddingBottom: 50, borderTopWidth: 1, borderTopColor: colors.slate100 },
  modalTitle: { ...typography.h2, color: colors.slate900 },
  modalSubtitle: { ...typography.body, color: colors.slate600, marginBottom: spacing.lg },
  
  detailSection: { marginBottom: spacing.lg },
  detailWorker: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workerAvatarLarge: { width: 56, height: 56, borderRadius: borderRadius.full, backgroundColor: colors.slate200, alignItems: 'center', justifyContent: 'center' },
  workerInitialsLarge: { ...typography.h3, color: colors.slate700 },
  detailWorkerName: { ...typography.h3, color: colors.slate900 },
  detailWorkerRole: { ...typography.body, color: colors.slate600 },
  detailRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  detailItem: { flex: 1 },
  detailLabel: { ...typography.caption, color: colors.slate500, marginBottom: spacing.xs },
  detailValue: { ...typography.body, color: colors.slate900 },
  detailValueLarge: { ...typography.h2, color: colors.slate900, fontWeight: '800' },
  categoryBadgeLarge: { alignSelf: 'flex-start', backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  categoryTextLarge: { ...typography.bodyBold, color: colors.slate700 },
  
  receiptPreview: { backgroundColor: colors.slate100, borderRadius: borderRadius.lg, height: 120, alignItems: 'center', justifyContent: 'center' },
  receiptPreviewText: { ...typography.caption, color: colors.slate500, marginTop: spacing.sm },
  
  policyCheck: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  policyCheckText: { ...typography.bodyBold },
  policyNote: { ...typography.caption, color: colors.error, marginTop: spacing.xs, marginStart: 28 },
  
  modalActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: borderRadius.lg },
  modalButtonText: { ...typography.bodyBold },
  
  rejectionInput: { backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.slate200, ...typography.body, color: colors.slate900, minHeight: 100, textAlignVertical: 'top', marginBottom: spacing.md },
  quickReasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  quickReasonButton: { backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  quickReasonText: { ...typography.caption, color: colors.slate700 },
});
