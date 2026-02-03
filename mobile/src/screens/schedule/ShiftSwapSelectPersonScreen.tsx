import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StarIcon, CheckCircleIcon, ChevronRightIcon, CalendarIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useEmployees } from '../../hooks/useData';

export const ShiftSwapSelectPersonScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const { data: employeesData, loading } = useEmployees();

  const availablePeople = (employeesData?.employees ?? []).map((e: any) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    role: e.roleName || e.role || 'Team Member',
    matchScore: e.matchScore ?? 0,
    availability: e.availability || 'Unknown',
    canCover: e.canCover !== false,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('schedule.selectPerson')}</Text>
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
          <Text style={styles.instructionTitle}>{t('onboarding.step', { current: 2, total: 3 })}</Text>
          <Text style={styles.instructionText}>{t('schedule.swapWith')}</Text>
        </View>

        {/* Your Shift Summary */}
        <View style={styles.shiftSummary}>
          <Text style={styles.summaryLabel}>{t('schedule.yourShift')}:</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('schedule.shift')}</Text>
            <View style={styles.summaryDetail}>
              <CalendarIcon size={14} color={colors.slate600} />
              <Text style={styles.summaryText}>Wed, 8 Jan • 09:00 - 17:00</Text>
            </View>
          </View>
        </View>

        {/* Available Team Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('schedule.availableShifts')}</Text>
          {availablePeople.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={[
                styles.personCard,
                !person.canCover && styles.personCardDisabled,
                selectedPerson === person.id && styles.personCardSelected
              ]}
              onPress={() => person.canCover && setSelectedPerson(person.id)}
              disabled={!person.canCover}
            >
              <View style={styles.personHeader}>
                <View style={styles.personAvatar}>
                  <Text style={styles.personInitials}>
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personName, !person.canCover && styles.personNameDisabled]}>
                    {person.name}
                  </Text>
                  <Text style={styles.personRole}>{person.role}</Text>
                  <Text style={[styles.availability, !person.canCover && styles.availabilityDisabled]}>
                    {person.availability}
                  </Text>
                </View>

                {person.canCover && (
                  <View style={styles.matchBadge}>
                    <StarIcon size={14} color={colors.success} />
                    <Text style={styles.matchScore}>{person.matchScore}%</Text>
                  </View>
                )}
                
                {selectedPerson === person.id && (
                  <CheckCircleIcon size={24} color={colors.success} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Continue Button */}
      {selectedPerson && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('ShiftSwapConfirm', { personId: selectedPerson })}
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
  shiftSummary: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  summaryLabel: { ...typography.caption, color: colors.slate600, marginBottom: spacing.sm },
  summaryCard: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md },
  summaryTitle: { ...typography.bodyBold, color: colors.slate900, marginBottom: spacing.xs },
  summaryDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  summaryText: { ...typography.caption, color: colors.slate600 },
  section: { padding: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.md },
  personCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md, borderWidth: 2, borderColor: 'transparent' },
  personCardDisabled: { opacity: 0.5 },
  personCardSelected: { borderColor: colors.success, backgroundColor: colors.success + '10' },
  personHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personAvatar: { width: 48, height: 48, backgroundColor: colors.momentum, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  personInitials: { ...typography.bodyBold, color: colors.background, fontSize: 16 },
  personName: { ...typography.h3, color: colors.slate900, fontSize: 16 },
  personNameDisabled: { color: colors.slate500 },
  personRole: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs / 2 },
  availability: { ...typography.caption, color: colors.success, marginTop: spacing.xs, fontWeight: '600' },
  availabilityDisabled: { color: colors.error },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.success + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  matchScore: { ...typography.bodyBold, color: colors.success, fontSize: 14 },
  footer: { padding: spacing.lg, backgroundColor: colors.background, ...shadows.sm },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg },
  continueButtonText: { ...typography.h3, color: colors.background },
});
