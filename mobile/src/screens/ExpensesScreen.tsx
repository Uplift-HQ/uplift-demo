import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { CameraIcon, FileTextIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ChevronRightIcon, UploadIcon, MapPinIcon, UsersIcon, BriefcaseIcon, StarIcon, AwardIcon } from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { showAlert } from '../utils/alert';
import { useExpenses } from '../hooks/useData';
import { api } from '../services/api';

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  receiptUrl?: string;
  rejectionReason?: string;
}

type ExpenseCategory = 'travel' | 'meals' | 'supplies' | 'uniform' | 'training' | 'other';

export const ExpensesScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptAttached, setReceiptAttached] = useState(false);

  const { data: expensesData, loading: expensesLoading, refetch: refetchExpenses } = useExpenses();
  const expenses: Expense[] = (expensesData?.expenses as Expense[]) ?? [];
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCategoryIcon = (key: ExpenseCategory) => {
    switch (key) {
      case 'travel': return <MapPinIcon size={24} color={category === key ? colors.momentum : colors.slate600} />;
      case 'meals': return <StarIcon size={24} color={category === key ? colors.momentum : colors.slate600} />;
      case 'supplies': return <BriefcaseIcon size={24} color={category === key ? colors.momentum : colors.slate600} />;
      case 'uniform': return <UsersIcon size={24} color={category === key ? colors.momentum : colors.slate600} />;
      case 'training': return <AwardIcon size={24} color={category === key ? colors.momentum : colors.slate600} />;
      case 'other': return <FileTextIcon size={24} color={category === key ? colors.momentum : colors.slate600} />;
      default: return <FileTextIcon size={24} color={colors.slate600} />;
    }
  };

  const categories: { key: ExpenseCategory; labelKey: string; limitKey: string }[] = [
    { key: 'travel', labelKey: 'expenses.categories.travel', limitKey: 'expenses.limits.travel' },
    { key: 'meals', labelKey: 'expenses.categories.meals', limitKey: 'expenses.limits.meals' },
    { key: 'supplies', labelKey: 'expenses.categories.supplies', limitKey: 'expenses.limits.supplies' },
    { key: 'uniform', labelKey: 'expenses.categories.uniform', limitKey: 'expenses.limits.uniform' },
    { key: 'training', labelKey: 'expenses.categories.training', limitKey: 'expenses.limits.training' },
    { key: 'other', labelKey: 'expenses.categories.other', limitKey: 'expenses.limits.other' },
  ];

  const handleAttachReceipt = () => {
    showAlert(
      t('expenses.attachReceipt'),
      t('expenses.chooseOption'),
      [
        { text: t('expenses.takePhoto'), onPress: () => setReceiptAttached(true) },
        { text: t('expenses.chooseFromLibrary'), onPress: () => setReceiptAttached(true) },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  const handleSubmit = () => {
    if (!category || !amount || !description) {
      showAlert(t('expenses.missingInfo'), t('expenses.fillAllFields'));
      return;
    }

    if (!receiptAttached) {
      showAlert(t('expenses.receiptRequired'), t('expenses.attachReceiptPhoto'));
      return;
    }

    const categoryLabel = t(categories.find(c => c.key === category)?.labelKey || '');
    showAlert(
      t('expenses.submitExpenseTitle'),
      t('expenses.submitConfirm', { amount: parseFloat(amount).toFixed(2), category: categoryLabel }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.submit'),
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await api.submitExpense({
                category: category!,
                amount: parseFloat(amount),
                description,
                date,
              });
              showAlert(t('expenses.submitted'), t('expenses.submittedMessage'));
              refetchExpenses();
            } catch (e: any) {
              showAlert(t('common.error'), e.message || t('expenses.submitFailed'));
            } finally {
              setIsSubmitting(false);
              setCategory(null);
              setAmount('');
              setDescription('');
              setReceiptAttached(false);
              setActiveTab('history');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.slate500;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircleIcon size={16} color={colors.success} />;
      case 'pending': return <ClockIcon size={16} color={colors.warning} />;
      case 'rejected': return <XCircleIcon size={16} color={colors.error} />;
      default: return null;
    }
  };

  const pendingTotal = expenses.filter(e => e.status === 'pending').reduce((acc, e) => acc + e.amount, 0);
  const approvedTotal = expenses.filter(e => e.status === 'approved').reduce((acc, e) => acc + e.amount, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('expenses.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submit' && styles.tabActive]}
          onPress={() => setActiveTab('submit')}
        >
          <Text style={[styles.tabText, activeTab === 'submit' && styles.tabTextActive]}>{t('expenses.submitNew')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>{t('expenses.history')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'submit' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Selection */}
          <Text style={styles.sectionTitle}>{t('expenses.category')}</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryCard, category === cat.key && styles.categoryCardActive]}
                onPress={() => setCategory(cat.key)}
              >
                <View style={styles.categoryIconContainer}>{getCategoryIcon(cat.key)}</View>
                <Text style={[styles.categoryLabel, category === cat.key && styles.categoryLabelActive]}>
                  {t(cat.labelKey)}
                </Text>
                <Text style={styles.categoryLimit}>{t(cat.limitKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <Text style={styles.sectionTitle}>{t('expenses.amount')}</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'GBP' }).format(0).replace(/[\d.,]/g, '').trim()}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={colors.slate400}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Date */}
          <Text style={styles.sectionTitle}>{t('screens.expenses.date_of_expense')}</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => showAlert('Select Date', 'Choose expense date', [
              { text: 'Today', onPress: () => setDate(new Date().toISOString().split('T')[0]) },
              { text: 'Yesterday', onPress: () => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setDate(yesterday.toISOString().split('T')[0]);
              }},
              { text: 'Last Week', onPress: () => {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                setDate(lastWeek.toISOString().split('T')[0]);
              }},
              { text: 'Cancel', style: 'cancel' },
            ])}
          >
            <Text style={styles.dateText}>{new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <ChevronRightIcon size={20} color={colors.slate400} />
          </TouchableOpacity>

          {/* Description */}
          <Text style={styles.sectionTitle}>{t('expenses.description')}</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder={t('expenses.descriptionPlaceholder')}
            placeholderTextColor={colors.slate400}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          {/* Receipt */}
          <Text style={styles.sectionTitle}>{t('expenses.receipt')}</Text>
          <TouchableOpacity 
            style={[styles.receiptButton, receiptAttached && styles.receiptButtonAttached]}
            onPress={handleAttachReceipt}
          >
            {receiptAttached ? (
              <>
                <CheckCircleIcon size={24} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptAttachedText}>{t('screens.expenses.receipt_attached')}</Text>
                  <Text style={styles.receiptSubtext}>{t('screens.expenses.tap_to_change')}</Text>
                </View>
              </>
            ) : (
              <>
                <CameraIcon size={24} color={colors.momentum} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptText}>{t('screens.expenses.attach_receipt_photo')}</Text>
                  <Text style={styles.receiptSubtext}>{t('screens.expenses.take_photo_or_choose_from_library')}</Text>
                </View>
                <UploadIcon size={20} color={colors.slate400} />
              </>
            )}
          </TouchableOpacity>

          {/* Policy Note */}
          <View style={styles.policyNote}>
            <FileTextIcon size={16} color={colors.info} />
            <Text style={styles.policyText}>
              {t('expenses.policyNote')}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, (!category || !amount || !receiptAttached) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!category || !amount || !receiptAttached}
          >
            <Text style={styles.submitButtonText}>{t('expenses.submitExpense')}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {expensesLoading && (
            <ActivityIndicator size="small" color={colors.momentum} style={{ marginBottom: spacing.md }} />
          )}
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.warning + '15' }]}>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>£{pendingTotal.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>{t('common.pending')}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.success + '15' }]}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>£{approvedTotal.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>{t('screens.expenses.approved_jan')}</Text>
            </View>
          </View>

          {/* Expense List */}
          <Text style={styles.sectionTitle}>{t('screens.expenses.recent_expenses')}</Text>
          {expenses.map((expense) => (
            <TouchableOpacity 
              key={expense.id} 
              style={styles.expenseCard}
              onPress={() => showAlert(
                t(`expenses.categories.${expense.category}`),
                t('expenses.detailMessage', {
                  description: expense.description,
                  amount: expense.amount.toFixed(2),
                  date: new Date(expense.date).toLocaleDateString(i18n.language),
                  status: t(`expenses.status.${expense.status}`),
                  reason: expense.rejectionReason ? `\n${t('expenses.reason')}: ${expense.rejectionReason}` : ''
                }),
                expense.status === 'rejected'
                  ? [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('expenses.resubmit'), onPress: () => showAlert(t('expenses.resubmit'), t('expenses.resubmitConfirm')) }
                    ]
                  : expense.status === 'pending'
                    ? [
                        { text: t('common.ok') },
                        { text: t('expenses.cancelExpense'), style: 'destructive', onPress: () => showAlert(t('expenses.cancelled'), t('expenses.cancelledMessage')) }
                      ]
                    : [{ text: t('common.ok') }]
              )}
            >
              <View style={styles.expenseHeader}>
                <View style={styles.expenseCategory}>
                  <Text style={styles.expenseCategoryText}>{t(`expenses.categories.${expense.category}`)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(expense.status) + '20' }]}>
                  {getStatusIcon(expense.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(expense.status) }]}>
                    {t(`expenses.status.${expense.status}`)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.expenseDescription}>{expense.description}</Text>
              
              <View style={styles.expenseFooter}>
                <Text style={styles.expenseDate}>
                  {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Text>
                <Text style={styles.expenseAmount}>£{expense.amount.toFixed(2)}</Text>
              </View>

              {expense.status === 'rejected' && expense.rejectionReason && (
                <View style={styles.rejectionNote}>
                  <XCircleIcon size={14} color={colors.error} />
                  <Text style={styles.rejectionText}>{expense.rejectionReason}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background },
  backButton: { ...typography.bodyBold, color: colors.momentum },
  headerTitle: { ...typography.h2, color: colors.slate900 },
  
  tabs: { flexDirection: 'row', backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: borderRadius.lg, backgroundColor: colors.slate100 },
  tabActive: { backgroundColor: colors.momentum },
  tabText: { ...typography.bodyBold, color: colors.slate600 },
  tabTextActive: { color: colors.background },
  
  content: { flex: 1, padding: spacing.lg },
  sectionTitle: { ...typography.bodyBold, color: colors.slate700, marginBottom: spacing.md, marginTop: spacing.lg },
  
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  categoryCard: { width: '31%', backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 2, borderColor: colors.slate200 },
  categoryCardActive: { borderColor: colors.momentum, backgroundColor: colors.momentum + '10' },
  categoryIconContainer: { marginBottom: spacing.xs },
  categoryLabel: { ...typography.bodyBold, color: colors.slate900, fontSize: 12, textAlign: 'center' },
  categoryLabelActive: { color: colors.momentum },
  categoryLimit: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs / 2, textAlign: 'center', fontSize: 10 },
  
  amountContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.slate200 },
  currencySymbol: { ...typography.h1, color: colors.slate400 },
  amountInput: { flex: 1, ...typography.h1, color: colors.slate900, paddingVertical: spacing.lg },
  
  dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.slate200 },
  dateText: { ...typography.body, color: colors.slate900 },
  
  descriptionInput: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.slate200, ...typography.body, color: colors.slate900, minHeight: 100, textAlignVertical: 'top' },
  
  receiptButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 2, borderColor: colors.slate200, borderStyle: 'dashed' },
  receiptButtonAttached: { borderColor: colors.success, borderStyle: 'solid', backgroundColor: colors.success + '10' },
  receiptText: { ...typography.bodyBold, color: colors.slate900 },
  receiptAttachedText: { ...typography.bodyBold, color: colors.success },
  receiptSubtext: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs / 2 },
  
  policyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.info + '10', borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.lg },
  policyText: { flex: 1, ...typography.caption, color: colors.info, lineHeight: 18 },
  
  submitButton: { backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.xl },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { ...typography.bodyBold, color: colors.background, fontSize: 16 },
  
  summaryRow: { flexDirection: 'row', gap: spacing.md },
  summaryCard: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center' },
  summaryValue: { ...typography.h2, fontWeight: '800' },
  summaryLabel: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs / 2 },
  
  expenseCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  expenseCategory: { backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  expenseCategoryText: { ...typography.caption, color: colors.slate700, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  statusText: { ...typography.caption, fontWeight: '700' },
  expenseDescription: { ...typography.body, color: colors.slate900 },
  expenseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate100 },
  expenseDate: { ...typography.caption, color: colors.slate500 },
  expenseAmount: { ...typography.h3, color: colors.slate900, fontWeight: '800' },
  rejectionNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.error + '10', borderRadius: borderRadius.md },
  rejectionText: { flex: 1, ...typography.caption, color: colors.error },
});
