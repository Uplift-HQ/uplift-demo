import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, ClockIcon, MapPinIcon, ChevronRightIcon, CheckCircleIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useMyShifts } from '../../hooks/useData';

export const ShiftSwapScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const { data: shiftsData, loading } = useMyShifts();

  const myShifts = (shiftsData?.shifts ?? []).map((s: any) => ({
    id: s.id,
    role: s.roleName || 'Shift',
    date: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    day: new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short' }),
    time: `${s.startTime} - ${s.endTime}`,
    location: s.locationName || 'TBC',
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('schedule.swapShift')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading && (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.momentum} />
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>{t('onboarding.step', { current: 1, total: 3 })}</Text>
          <Text style={styles.instructionText}>{t('schedule.selectShiftToSwap')}</Text>
        </View>

        {/* My Shifts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('schedule.upcoming')}</Text>
          {myShifts.map((shift) => (
            <TouchableOpacity
              key={shift.id}
              style={[
                styles.shiftCard,
                selectedShift === shift.id && styles.shiftCardSelected
              ]}
              onPress={() => setSelectedShift(shift.id)}
            >
              <View style={styles.shiftHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftRole}>{shift.role}</Text>
                  <View style={styles.shiftMeta}>
                    <MapPinIcon size={14} color={colors.slate500} />
                    <Text style={styles.shiftMetaText}>{shift.location}</Text>
                  </View>
                </View>
                {selectedShift === shift.id && (
                  <View style={styles.selectedBadge}>
                    <CheckCircleIcon size={24} color={colors.success} />
                  </View>
                )}
              </View>

              <View style={styles.shiftDetails}>
                <View style={styles.detailItem}>
                  <CalendarIcon size={16} color={colors.slate600} />
                  <Text style={styles.detailText}>{shift.date} ({shift.day})</Text>
                </View>
                <View style={styles.detailItem}>
                  <ClockIcon size={16} color={colors.slate600} />
                  <Text style={styles.detailText}>{shift.time}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Continue Button */}
      {selectedShift && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('ShiftSwapSelectPerson', { shiftId: selectedShift })}
          >
            <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
            <ChevronRightIcon size={20} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}
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
  section: { padding: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.md },
  shiftCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md, borderWidth: 2, borderColor: 'transparent' },
  shiftCardSelected: { borderColor: colors.success, backgroundColor: colors.success + '10' },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  shiftRole: { ...typography.h3, color: colors.slate900, marginBottom: spacing.xs },
  shiftMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shiftMetaText: { ...typography.caption, color: colors.slate600 },
  selectedBadge: { width: 40, height: 40, backgroundColor: colors.success + '20', borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  shiftDetails: { flexDirection: 'row', gap: spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  detailText: { ...typography.caption, color: colors.slate700, fontWeight: '600' },
  footer: { padding: spacing.lg, backgroundColor: colors.background, ...shadows.sm },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg },
  continueButtonText: { ...typography.h3, color: colors.background },
});
