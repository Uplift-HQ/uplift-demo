import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, ChevronRightIcon, StarIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

interface Skill {
  id: string;
  name: string;
  category: string;
}

export const OnboardingSkillsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const skillCategories = [
    {
      name: 'Customer Service',
      skills: [
        { id: 'cs1', name: 'Customer Service', category: 'Customer Service' },
        { id: 'cs2', name: 'Communication', category: 'Customer Service' },
        { id: 'cs3', name: 'Conflict Resolution', category: 'Customer Service' },
        { id: 'cs4', name: 'Product Knowledge', category: 'Customer Service' },
      ]
    },
    {
      name: 'Operations',
      skills: [
        { id: 'op1', name: 'Cash Handling', category: 'Operations' },
        { id: 'op2', name: 'Inventory Management', category: 'Operations' },
        { id: 'op3', name: 'POS Systems', category: 'Operations' },
        { id: 'op4', name: 'Stock Replenishment', category: 'Operations' },
      ]
    },
    {
      name: 'Leadership',
      skills: [
        { id: 'ld1', name: 'Team Leadership', category: 'Leadership' },
        { id: 'ld2', name: 'Training & Coaching', category: 'Leadership' },
        { id: 'ld3', name: 'Scheduling', category: 'Leadership' },
        { id: 'ld4', name: 'Performance Management', category: 'Leadership' },
      ]
    },
    {
      name: 'Safety & Compliance',
      skills: [
        { id: 'sf1', name: 'Health & Safety', category: 'Safety & Compliance' },
        { id: 'sf2', name: 'Food Safety', category: 'Safety & Compliance' },
        { id: 'sf3', name: 'First Aid', category: 'Safety & Compliance' },
        { id: 'sf4', name: 'Manual Handling', category: 'Safety & Compliance' },
      ]
    },
  ];

  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillId));
    } else {
      setSelectedSkills([...selectedSkills, skillId]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.stepText}>{t('onboarding.step', { current: 1, total: 2 })}</Text>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{t('onboarding.yourSkills')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.addSkillsDesc')}
        </Text>
      </View>

      {/* Skills Selection */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {skillCategories.map((category) => (
          <View key={category.name} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            <View style={styles.skillsGrid}>
              {category.skills.map((skill) => {
                const isSelected = selectedSkills.includes(skill.id);
                return (
                  <TouchableOpacity
                    key={skill.id}
                    style={[
                      styles.skillChip,
                      isSelected && styles.skillChipSelected
                    ]}
                    onPress={() => toggleSkill(skill.id)}
                  >
                    {isSelected && <CheckCircleIcon size={16} color={colors.success} />}
                    <Text style={[
                      styles.skillChipText,
                      isSelected && styles.skillChipTextSelected
                    ]}>
                      {skill.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Selection Count */}
      <View style={styles.selectionInfo}>
        <StarIcon size={16} color={colors.momentum} />
        <Text style={styles.selectionText}>
          {t('skills.skillsCount', { count: selectedSkills.length })}
        </Text>
      </View>

      {/* Action */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            selectedSkills.length === 0 && styles.primaryButtonDisabled
          ]}
          onPress={() => navigation.navigate('OnboardingPreferences', { skills: selectedSkills })}
          disabled={selectedSkills.length === 0}
        >
          <Text style={styles.primaryButtonText}>{t('onboarding.continue')}</Text>
          <ChevronRightIcon size={24} color={colors.background} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('OnboardingPreferences', { skills: [] })}
        >
          <Text style={styles.skipButtonText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, marginBottom: spacing.lg },
  progressBar: { height: 6, backgroundColor: colors.slate200, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.momentum, borderRadius: 3 },
  stepText: { ...typography.caption, color: colors.slate600, textAlign: 'center' },
  
  titleSection: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.slate900, fontSize: 28, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.slate600, lineHeight: 22 },
  
  content: { flex: 1, paddingHorizontal: spacing.xl },
  
  categorySection: { marginBottom: spacing.xl },
  categoryTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.md },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 2, borderColor: 'transparent' },
  skillChipSelected: { backgroundColor: colors.success + '15', borderColor: colors.success },
  skillChipText: { ...typography.body, color: colors.slate700 },
  skillChipTextSelected: { color: colors.success, fontWeight: '600' },
  
  selectionInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate200 },
  selectionText: { ...typography.bodyBold, color: colors.momentum },
  
  actionSection: { padding: spacing.xl },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.lg },
  primaryButtonDisabled: { backgroundColor: colors.slate300 },
  primaryButtonText: { ...typography.h3, color: colors.background },
  skipButton: { alignItems: 'center', paddingVertical: spacing.md },
  skipButtonText: { ...typography.body, color: colors.slate600 },
});
