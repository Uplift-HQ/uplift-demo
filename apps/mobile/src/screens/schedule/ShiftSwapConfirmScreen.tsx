import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, CalendarIcon, ArrowRightIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { api } from '../../services/api';

export const ShiftSwapConfirmScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract route params
  const yourShift = route.params?.yourShift;
  const theirShift = route.params?.theirShift;
  const swapPerson = route.params?.person;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.requestShiftSwap({
        shiftId: route?.params?.shiftId || 'shift-1',
        targetEmployeeId: route?.params?.personId,
        reason: message || undefined,
      });
      showAlert(
        t('screens.shiftSwapConfirm.swapRequestSent'),
        t('screens.shiftSwapConfirm.swapRequestSentMsg'),
        [{ text: t('common.ok'), onPress: () => navigation.navigate('ScheduleOverview') }]
      );
    } catch (e: any) {
      showAlert(
        t('screens.shiftSwapConfirm.swapRequestFailed'),
        e.message || t('errors.somethingWentWrong'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('schedule.confirmSwap')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>{t('screens.shiftSwapConfirm.step3of3')}</Text>
          <Text style={styles.instructionText}>{t('screens.shiftSwapConfirm.reviewConfirm')}</Text>
        </View>

        {/* Swap Summary */}
        <View style={styles.swapSummary}>
          {/* Your Shift */}
          <View style={styles.shiftBox}>
            <Text style={styles.shiftLabel}>{t('screens.shiftSwapConfirm.youGive')}</Text>
            <View style={styles.shiftCard}>
              <Text style={styles.shiftRole}>{yourShift?.role || t('common.role')}</Text>
              <View style={styles.shiftDetail}>
                <CalendarIcon size={14} color={colors.slate600} />
                <Text style={styles.shiftText}>{yourShift?.date || t('common.date')}</Text>
              </View>
              <Text style={styles.shiftTime}>{yourShift?.time || t('common.time')}</Text>
              <Text style={styles.shiftLocation}>{yourShift?.locationName || t('common.location')}</Text>
            </View>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <ArrowRightIcon size={32} color={colors.momentum} />
          </View>

          {/* Their Shift */}
          <View style={styles.shiftBox}>
            <Text style={styles.shiftLabel}>{t('screens.shiftSwapConfirm.youGet')}</Text>
            <View style={styles.shiftCard}>
              <Text style={styles.shiftRole}>{theirShift?.role || t('common.role')}</Text>
              <View style={styles.shiftDetail}>
                <CalendarIcon size={14} color={colors.slate600} />
                <Text style={styles.shiftText}>{theirShift?.date || t('common.date')}</Text>
              </View>
              <Text style={styles.shiftTime}>{theirShift?.time || t('common.time')}</Text>
              <Text style={styles.shiftLocation}>{theirShift?.locationName || t('common.location')}</Text>
            </View>
          </View>
        </View>

        {/* Swap Partner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('screens.shiftSwapConfirm.swappingWith')}</Text>
          <View style={styles.personCard}>
            <View style={styles.personAvatar}>
              <Text style={styles.personInitials}>{swapPerson?.initials || swapPerson?.name?.split(' ').map((n: string) => n[0]).join('') || '??'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{swapPerson?.name || t('common.colleague')}</Text>
              <Text style={styles.personRole}>{swapPerson?.role || t('common.role')}</Text>
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{t('screens.shiftSwapConfirm.matchPercent', { percent: swapPerson?.matchPercent || 0 })}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Optional Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('screens.shiftSwapConfirm.addMessage')}</Text>
          <TextInput
            style={styles.messageInput}
            placeholder={t('screens.shiftSwapConfirm.messagePlaceholder')}
            placeholderTextColor={colors.slate400}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Important Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>{t('screens.shiftSwapConfirm.important')}</Text>
          <Text style={styles.notesText}>{t('screens.shiftSwapConfirm.note1')}</Text>
          <Text style={styles.notesText}>{t('screens.shiftSwapConfirm.note2')}</Text>
          <Text style={styles.notesText}>{t('screens.shiftSwapConfirm.note3')}</Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <CheckCircleIcon size={20} color={colors.background} />
          )}
          <Text style={styles.submitButtonText}>{isSubmitting ? t('screens.shiftSwapConfirm.sending') : t('screens.shiftSwapConfirm.sendSwapRequest')}</Text>
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
  instructionCard: { backgroundColor: colors.momentum + '15', margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, borderStartWidth: 4, borderStartColor: colors.momentum },
  instructionTitle: { ...typography.h3, color: colors.momentum, marginBottom: spacing.xs },
  instructionText: { ...typography.body, color: colors.slate700 },
  swapSummary: { flexDirection: 'row', padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  shiftBox: { flex: 1 },
  shiftLabel: { ...typography.caption, color: colors.slate600, marginBottom: spacing.sm, textAlign: 'center' },
  shiftCard: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, ...shadows.md },
  shiftRole: { ...typography.bodyBold, color: colors.slate900, marginBottom: spacing.sm },
  shiftDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  shiftText: { ...typography.caption, color: colors.slate600 },
  shiftTime: { ...typography.body, color: colors.slate900, marginBottom: spacing.xs },
  shiftLocation: { ...typography.caption, color: colors.slate600 },
  arrowContainer: { alignItems: 'center', paddingHorizontal: spacing.sm },
  section: { padding: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.md },
  personCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.sm },
  personAvatar: { width: 56, height: 56, backgroundColor: colors.momentum, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  personInitials: { ...typography.h3, color: colors.background },
  personName: { ...typography.h3, color: colors.slate900, marginBottom: spacing.xs / 2 },
  personRole: { ...typography.body, color: colors.slate600, marginBottom: spacing.sm },
  matchBadge: { backgroundColor: colors.success + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  matchText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  messageInput: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.slate200, ...typography.body, color: colors.slate900, minHeight: 100, textAlignVertical: 'top' },
  notesCard: { backgroundColor: colors.info + '15', margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, borderStartWidth: 4, borderStartColor: colors.info },
  notesTitle: { ...typography.h3, color: colors.info, marginBottom: spacing.md },
  notesText: { ...typography.body, color: colors.slate700, marginBottom: spacing.xs, lineHeight: 22 },
  footer: { padding: spacing.lg, backgroundColor: colors.background, ...shadows.sm },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, ...shadows.lg },
  submitButtonText: { ...typography.h3, color: colors.background },
});
