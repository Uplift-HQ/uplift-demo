import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BriefcaseIcon, StarIcon, MapPinIcon, DollarSignIcon, ChevronRightIcon, CheckCircleIcon } from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useCareerOpportunities } from '../hooks/useData';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  payRange: string;
  matchScore: number;
  type: 'full-time' | 'part-time';
  requiredSkills: string[];
  hasSkills: string[];
  needsSkills: string[];
}

export const JobsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { data: jobsData, loading, refetch } = useCareerOpportunities();
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [whyInterested, setWhyInterested] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transform API jobs to display format
  const jobs: Job[] = (jobsData?.opportunities || []).map(j => ({
    id: j.id,
    title: j.title,
    department: j.departmentName || 'General',
    location: j.locationName || 'Multiple Locations',
    payRange: j.hourlyRateMin && j.hourlyRateMax 
      ? `£${j.hourlyRateMin}-${j.hourlyRateMax}/hr`
      : j.hourlyRateMax 
        ? `Up to £${j.hourlyRateMax}/hr` 
        : 'Competitive',
    matchScore: j.matchScore || 0,
    type: j.employmentType === 'full_time' ? 'full-time' : 'part-time',
    requiredSkills: j.requiredSkills || [],
    hasSkills: [], // Would come from skill matching endpoint
    needsSkills: [], // Would come from skill gap analysis
  }));

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
  };

  const handleSubmitApplication = async () => {
    if (!whyInterested.trim()) {
      showAlert('Required Field', 'Please tell us why you are interested in this position');
      return;
    }

    if (!selectedJob) return;

    setIsSubmitting(true);
    try {
      await api.applyForJob(selectedJob.id, { coverLetter: whyInterested });
      
      showAlert(
        'Application Submitted',
        `Your application for ${selectedJob.title} has been submitted. Your manager will review it and get back to you.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowApplicationForm(false);
              setWhyInterested('');
              setSelectedJob(null);
              refetch();
            }
          }
        ]
      );
    } catch (error: any) {
      showAlert(t('common.error'), error.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.momentum} />
      </View>
    );
  }

  if (showApplicationForm && selectedJob) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowApplicationForm(false)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('screens.jobs.apply_for_job')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Job Summary */}
          <View style={styles.jobSummary}>
            <Text style={styles.jobTitle}>{selectedJob.title}</Text>
            <Text style={styles.jobDepartment}>{selectedJob.department}</Text>
            <View style={styles.matchBadge}>
              <StarIcon size={16} color={colors.success} />
              <Text style={styles.matchScore}>{selectedJob.matchScore}% Match</Text>
            </View>
          </View>

          {/* Application Form */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Why are you interested in this position? *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Tell us what excites you about this opportunity..."
              placeholderTextColor={colors.slate400}
              multiline
              numberOfLines={6}
              value={whyInterested}
              onChangeText={setWhyInterested}
            />
          </View>

          {/* Skills Match */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{t('screens.jobs.your_skills_match')}</Text>
            <View style={styles.skillsGrid}>
              {selectedJob.hasSkills.map((skill, i) => (
                <View key={i} style={styles.skillChip}>
                  <CheckCircleIcon size={14} color={colors.success} />
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
              {selectedJob.needsSkills.map((skill, i) => (
                <View key={i} style={[styles.skillChip, styles.skillChipNeeded]}>
                  <Text style={styles.skillTextNeeded}>{skill}</Text>
                  <Text style={styles.skillBadge}>Need</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitApplication}>
            <CheckCircleIcon size={20} color={colors.background} />
            <Text style={styles.submitButtonText}>{t('screens.jobs.submit_application')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.jobs.open_positions')}</Text>
        <Text style={styles.subtitle}>{jobs.length} opportunities</Text>
      </View>

      <ScrollView style={styles.content}>
        {jobs.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={styles.jobCard}
            onPress={() => handleApply(job)}
          >
            <View style={styles.jobHeader}>
              <BriefcaseIcon size={32} color={colors.momentum} />
              <View style={[styles.matchBadge, { backgroundColor: colors.success + '20' }]}>
                <StarIcon size={14} color={colors.success} />
                <Text style={styles.matchScore}>{job.matchScore}% Match</Text>
              </View>
            </View>

            <Text style={styles.jobCardTitle}>{job.title}</Text>
            <Text style={styles.jobDepartment}>{job.department} • {job.type}</Text>

            <View style={styles.jobDetails}>
              <View style={styles.detailRow}>
                <MapPinIcon size={16} color={colors.slate600} />
                <Text style={styles.detailText}>{job.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <DollarSignIcon size={16} color={colors.momentum} />
                <Text style={styles.detailText}>{job.payRange}</Text>
              </View>
            </View>

            {job.needsSkills.length > 0 && (
              <View style={styles.skillsNeeded}>
                <Text style={styles.skillsNeededText}>
                  You need: {job.needsSkills.join(', ')}
                </Text>
              </View>
            )}

            <View style={styles.applyButton}>
              <Text style={styles.applyButtonText}>{t('career.applyNow')}</Text>
              <ChevronRightIcon size={20} color={colors.background} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, ...shadows.sm },
  backButton: { ...typography.bodyBold, color: colors.momentum },
  title: { ...typography.h2, color: colors.slate900 },
  subtitle: { ...typography.body, color: colors.slate600, marginTop: spacing.xs },
  content: { flex: 1, padding: spacing.md },
  jobCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  matchScore: { ...typography.bodyBold, color: colors.success, fontSize: 14 },
  jobCardTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.xs },
  jobDepartment: { ...typography.body, color: colors.slate600, marginBottom: spacing.md },
  jobDetails: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { ...typography.body, color: colors.slate700 },
  skillsNeeded: { backgroundColor: colors.warning + '15', padding: spacing.sm, borderRadius: borderRadius.sm, marginBottom: spacing.md },
  skillsNeededText: { ...typography.caption, color: colors.warning, fontWeight: '600' },
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.momentum, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  applyButtonText: { ...typography.bodyBold, color: colors.background },
  jobSummary: { backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg, ...shadows.md },
  jobTitle: { ...typography.h2, color: colors.slate900, marginBottom: spacing.xs },
  formSection: { marginBottom: spacing.xl },
  formLabel: { ...typography.h3, color: colors.slate900, marginBottom: spacing.md },
  textArea: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.slate200, ...typography.body, color: colors.slate900, minHeight: 150, textAlignVertical: 'top' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.success + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  skillText: { ...typography.caption, color: colors.success, fontWeight: '600' },
  skillChipNeeded: { backgroundColor: colors.warning + '15' },
  skillTextNeeded: { ...typography.caption, color: colors.warning, fontWeight: '600' },
  skillBadge: { ...typography.caption, color: colors.warning, fontSize: 10, fontWeight: '700' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, marginTop: spacing.xl, ...shadows.lg },
  submitButtonText: { ...typography.h3, color: colors.background },
});
