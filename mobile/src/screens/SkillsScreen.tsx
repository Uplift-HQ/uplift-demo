import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AwardIcon, StarIcon, CheckCircleIcon, PlusIcon, AlertCircleIcon } from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useMySkills } from '../hooks/useData';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';

interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  verifiedBy?: string;
  verifiedDate?: string;
}

const levelMap: Record<number, 'beginner' | 'intermediate' | 'advanced' | 'expert'> = {
  1: 'beginner',
  2: 'intermediate', 
  3: 'advanced',
  4: 'expert',
};

export const SkillsScreen = () => {
  const { t } = useTranslation();
  const { data: skillsData, loading, refetch } = useMySkills();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [selectedSkillToVerify, setSelectedSkillToVerify] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Transform API skills to display format
  const skills: Skill[] = (skillsData?.skills || []).map(s => ({
    id: s.id,
    name: s.name,
    level: levelMap[s.level || 1] || 'beginner',
    verified: s.verified || false,
    verifiedBy: s.verifiedBy,
    verifiedDate: s.verifiedAt ? new Date(s.verifiedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined,
  }));

  const handleRequestVerification = async () => {
    if (!evidence.trim()) {
      showAlert(t('skills.evidenceRequired'), t('skills.evidenceRequiredMessage'));
      return;
    }

    if (!selectedSkillToVerify) {
      showAlert(t('common.error'), t('skills.evidenceRequiredMessage'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.requestSkillVerification(selectedSkillToVerify, evidence);

      showAlert(
        t('skills.verificationRequested'),
        t('skills.verificationRequestedMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              setShowRequestForm(false);
              setEvidence('');
              setSelectedSkillToVerify(null);
              refetch();
            }
          }
        ]
      );
    } catch (error: any) {
      showAlert(t('common.error'), error.message || t('errors.unknownError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return colors.momentum;
      case 'advanced': return colors.success;
      case 'intermediate': return colors.info;
      default: return colors.slate500;
    }
  };

  const verifiedSkills = skills.filter(s => s.verified);
  const unverifiedSkills = skills.filter(s => !s.verified);

  if (showRequestForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowRequestForm(false)}>
            <Text style={styles.backButton}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('skills.requestVerification')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{t('skills.skill')}</Text>
            <View style={styles.skillSelectCard}>
              <Text style={styles.skillSelectText}>{selectedSkillToVerify}</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{t('skills.evidenceOfProficiency')}</Text>
            <Text style={styles.formHint}>
              {t('skills.evidenceHint')}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder={t('skills.evidencePlaceholder')}
              placeholderTextColor={colors.slate400}
              multiline
              numberOfLines={6}
              value={evidence}
              onChangeText={setEvidence}
            />
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>{t('skills.tipsTitle')}</Text>
            <Text style={styles.tipsText}>• {t('skills.tip1')}</Text>
            <Text style={styles.tipsText}>• {t('skills.tip2')}</Text>
            <Text style={styles.tipsText}>• {t('skills.tip3')}</Text>
            <Text style={styles.tipsText}>• {t('skills.tip4')}</Text>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleRequestVerification}>
            <CheckCircleIcon size={20} color={colors.background} />
            <Text style={styles.submitButtonText}>{t('timeOff.submitRequest')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('skills.mySkills')}</Text>
          <Text style={styles.subtitle}>{t('skills.verifiedCount', { count: verifiedSkills.length })}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowRequestForm(true)}
        >
          <PlusIcon size={20} color={colors.background} />
          <Text style={styles.addButtonText}>{t('skills.request')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Verified Skills */}
        {verifiedSkills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('skills.verifiedSkills')}</Text>
            {verifiedSkills.map((skill) => (
              <View key={skill.id} style={styles.skillCard}>
                <View style={styles.skillHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.skillNameRow}>
                      <CheckCircleIcon size={20} color={colors.success} />
                      <Text style={styles.skillName}>{skill.name}</Text>
                    </View>
                    {skill.verifiedBy && (
                      <Text style={styles.verifiedBy}>
                        {t('skills.verifiedBy', { name: skill.verifiedBy, date: skill.verifiedDate })}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: getLevelColor(skill.level) + '20' }]}>
                    <Text style={[styles.levelText, { color: getLevelColor(skill.level) }]}>
                      {t(`skills.${skill.level}`)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Unverified Skills */}
        {unverifiedSkills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('skills.needsVerification')}</Text>
            {unverifiedSkills.map((skill) => (
              <TouchableOpacity
                key={skill.id}
                style={[styles.skillCard, styles.skillCardUnverified]}
                onPress={() => {
                  setSelectedSkillToVerify(skill.name);
                  setShowRequestForm(true);
                }}
              >
                <View style={styles.skillHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.skillNameRow}>
                      <AlertCircleIcon size={20} color={colors.warning} />
                      <Text style={styles.skillName}>{skill.name}</Text>
                    </View>
                    <Text style={styles.unverifiedText}>
                      {t('skills.tapToVerify')}
                    </Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: getLevelColor(skill.level) + '20' }]}>
                    <Text style={[styles.levelText, { color: getLevelColor(skill.level) }]}>
                      {t(`skills.${skill.level}`)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <StarIcon size={24} color={colors.momentum} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{t('skills.whyVerify')}</Text>
            <Text style={styles.infoText}>
              {t('skills.whyVerifyText')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, ...shadows.sm },
  backButton: { ...typography.bodyBold, color: colors.momentum },
  title: { ...typography.h2, color: colors.slate900 },
  subtitle: { ...typography.body, color: colors.slate600, marginTop: spacing.xs },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.momentum, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  addButtonText: { ...typography.bodyBold, color: colors.background },
  content: { flex: 1 },
  section: { padding: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.md },
  skillCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  skillCardUnverified: { borderWidth: 2, borderColor: colors.warning, borderStyle: 'dashed' },
  skillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  skillNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  skillName: { ...typography.h3, color: colors.slate900, fontSize: 16 },
  verifiedBy: { ...typography.caption, color: colors.slate600, marginStart: 28 },
  unverifiedText: { ...typography.caption, color: colors.warning, marginStart: 28, fontWeight: '600' },
  levelBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  levelText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
  infoCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.momentum + '15', margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg },
  infoTitle: { ...typography.h3, color: colors.momentum, marginBottom: spacing.xs },
  infoText: { ...typography.body, color: colors.slate700, lineHeight: 20 },
  formSection: { marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
  formLabel: { ...typography.h3, color: colors.slate900, marginBottom: spacing.sm },
  formHint: { ...typography.caption, color: colors.slate600, marginBottom: spacing.md, lineHeight: 18 },
  skillSelectCard: { backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.slate200 },
  skillSelectText: { ...typography.h3, color: colors.slate900 },
  textArea: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.slate200, ...typography.body, color: colors.slate900, minHeight: 150, textAlignVertical: 'top' },
  tipsCard: { backgroundColor: colors.info + '15', marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.xl },
  tipsTitle: { ...typography.h3, color: colors.info, marginBottom: spacing.md },
  tipsText: { ...typography.body, color: colors.slate700, marginBottom: spacing.xs, lineHeight: 20 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, marginHorizontal: spacing.lg, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, ...shadows.lg },
  submitButtonText: { ...typography.h3, color: colors.background },
});
