import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, CheckCircleIcon, ClockIcon, AlertCircleIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { useMyTimeOffRequests, useTimeOffBalances } from '../../hooks/useData';
import { api } from '../../services/api';

export const TimeOffRequestScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('Jan 15, 2026');
  const [endDate, setEndDate] = useState('Jan 17, 2026');
  const [reason, setReason] = useState('vacation');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: timeOffData, loading: loadingRequests } = useMyTimeOffRequests();
  const { data: balancesData, loading: loadingBalances } = useTimeOffBalances();

  const pendingRequests = (timeOffData?.requests ?? []).map((r: any) => ({
    id: r.id,
    dates: r.startDate && r.endDate
      ? `${new Date(r.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}${r.startDate !== r.endDate ? ' - ' + new Date(r.endDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : ''}`
      : r.dates || '',
    status: r.status || 'pending',
    reason: r.reason || r.policyName || 'Personal',
  }));

  const totalAvailable = balancesData?.balances?.[0]?.balance ?? 0;
  const pendingHours = balancesData?.balances?.[0]?.used ?? 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.requestTimeOff({
        policyId: reason,
        startDate,
        endDate,
        reason: notes || undefined,
      });
      showAlert(
        t('timeOff.requestSubmitted'),
        t('timeOff.requestSubmittedMessage'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      showAlert(
        t('common.error'),
        e.message || t('common.somethingWentWrong'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = loadingRequests || loadingBalances;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('timeOff.timeOffRequest')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading && (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.momentum} />
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('timeOff.selectDates')}</Text>

          <TouchableOpacity
            style={styles.dateField}
            onPress={() => showAlert(t('timeOff.selectStartDate'), t('timeOff.chooseStartDate'), [
              { text: 'Jan 15, 2026', onPress: () => setStartDate('Jan 15, 2026') },
              { text: 'Jan 20, 2026', onPress: () => setStartDate('Jan 20, 2026') },
              { text: 'Jan 27, 2026', onPress: () => setStartDate('Jan 27, 2026') },
              { text: t('common.cancel'), style: 'cancel' },
            ])}
          >
            <CalendarIcon size={20} color={colors.momentum} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>{t('timeOff.startDate')}</Text>
              <Text style={styles.dateValue}>{startDate}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateField}
            onPress={() => showAlert(t('timeOff.selectEndDate'), t('timeOff.chooseEndDate'), [
              { text: 'Jan 17, 2026', onPress: () => setEndDate('Jan 17, 2026') },
              { text: 'Jan 22, 2026', onPress: () => setEndDate('Jan 22, 2026') },
              { text: 'Jan 31, 2026', onPress: () => setEndDate('Jan 31, 2026') },
              { text: t('common.cancel'), style: 'cancel' },
            ])}
          >
            <CalendarIcon size={20} color={colors.momentum} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>{t('timeOff.endDate')}</Text>
              <Text style={styles.dateValue}>{endDate}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.durationCard}>
            <ClockIcon size={16} color={colors.info} />
            <Text style={styles.durationText}>{t('timeOff.duration', { days: 3, hours: 24 })}</Text>
          </View>
        </View>

        {/* Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('timeOff.reason')}</Text>
          {[
            { value: 'vacation', label: t('timeOff.vacation'), color: colors.info },
            { value: 'sick', label: t('timeOff.sick'), color: colors.warning },
            { value: 'personal', label: t('timeOff.personal'), color: colors.slate500 },
            { value: 'other', label: t('timeOff.other'), color: colors.slate500 },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.reasonOption,
                reason === option.value && styles.reasonOptionSelected
              ]}
              onPress={() => setReason(option.value)}
            >
              <Text style={styles.reasonLabel}>{option.label}</Text>
              {reason === option.value && (
                <CheckCircleIcon size={20} color={colors.success} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('timeOff.addNotes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('timeOff.addNotesPlaceholder')}
            placeholderTextColor={colors.slate400}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Available PTO */}
        <View style={styles.ptoCard}>
          <View style={styles.ptoHeader}>
            <Text style={styles.ptoTitle}>{t('timeOff.ptoBalance')}</Text>
          </View>
          <View style={styles.ptoStats}>
            <View style={styles.ptoStat}>
              <Text style={styles.ptoValue}>{totalAvailable}h</Text>
              <Text style={styles.ptoLabel}>{t('timeOff.totalAvailable')}</Text>
            </View>
            <View style={styles.ptoDivider} />
            <View style={styles.ptoStat}>
              <Text style={styles.ptoValue}>{pendingHours}h</Text>
              <Text style={styles.ptoLabel}>{t('timeOff.pendingApproval')}</Text>
            </View>
          </View>
          <Text style={styles.ptoNote}>{t('timeOff.afterRequest', { hours: 56 })}</Text>
        </View>

        {/* Coverage Impact */}
        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <AlertCircleIcon size={20} color={colors.warning} />
            <Text style={styles.impactTitle}>{t('timeOff.coverageImpact')}</Text>
          </View>
          <Text style={styles.impactText}>{t('timeOff.coverageImpactText', { count: 2 })}</Text>
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('timeOff.yourPendingRequests')}</Text>
          {pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestDates}>{request.dates}</Text>
                <Text style={styles.requestReason}>{request.reason}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: request.status === 'approved' ? colors.success + '20' : colors.warning + '20' }
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: request.status === 'approved' ? colors.success : colors.warning }
                  ]}
                >
                  {request.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <CheckCircleIcon size={20} color={colors.background} />
          <Text style={styles.submitButtonText}>{t('timeOff.submitRequest')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, ...shadows.sm },
  backButton: { ...typography.bodyBold, color: colors.momentum },
  title: { ...typography.h2, color: colors.slate900 },
  content: { flex: 1 },
  section: { padding: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.md },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.sm },
  dateLabel: { ...typography.caption, color: colors.slate600, marginBottom: spacing.xs / 2 },
  dateValue: { ...typography.h3, color: colors.slate900, fontSize: 16 },
  durationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.info + '15', padding: spacing.md, borderRadius: borderRadius.md },
  durationText: { ...typography.bodyBold, color: colors.info },
  reasonOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  reasonOptionSelected: { borderColor: colors.success, backgroundColor: colors.success + '10' },
  reasonLabel: { ...typography.bodyBold, color: colors.slate900, fontSize: 16 },
  notesInput: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.slate200, ...typography.body, color: colors.slate900, minHeight: 100, textAlignVertical: 'top' },
  ptoCard: { backgroundColor: colors.background, margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.lg },
  ptoHeader: { marginBottom: spacing.md },
  ptoTitle: { ...typography.h3, color: colors.slate900 },
  ptoStats: { flexDirection: 'row', marginBottom: spacing.md },
  ptoStat: { flex: 1, alignItems: 'center' },
  ptoValue: { ...typography.h1, color: colors.momentum, fontWeight: '800', fontSize: 32 },
  ptoLabel: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs },
  ptoDivider: { width: 1, backgroundColor: colors.slate200, marginHorizontal: spacing.lg },
  ptoNote: { ...typography.caption, color: colors.slate600, textAlign: 'center', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate200 },
  impactCard: { backgroundColor: colors.warning + '15', margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, borderStartWidth: 4, borderStartColor: colors.warning },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  impactTitle: { ...typography.h3, color: colors.warning },
  impactText: { ...typography.body, color: colors.slate700, lineHeight: 22 },
  requestCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, ...shadows.sm },
  requestDates: { ...typography.bodyBold, color: colors.slate900, marginBottom: spacing.xs / 2 },
  requestReason: { ...typography.caption, color: colors.slate600 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  statusText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
  footer: { padding: spacing.lg, backgroundColor: colors.background, ...shadows.sm },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, ...shadows.lg },
  submitButtonText: { ...typography.h3, color: colors.background },
});
