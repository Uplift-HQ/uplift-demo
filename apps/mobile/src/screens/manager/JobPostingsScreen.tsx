import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PlusIcon, BriefcaseIcon, MapPinIcon, DollarSignIcon, UsersIcon, CheckCircleIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { useJobPostings } from '../../hooks/useData';
import { api } from '../../services/api';

export const JobPostingsScreen = ({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) => {
  const { t } = useTranslation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, refetch } = useJobPostings();
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    payMin: '',
    payMax: '',
    description: '',
    requirements: '',
  });

  const jobs = data?.jobs || [];

  const handleCreateJob = useCallback(async () => {
    if (!formData.title || !formData.department || !formData.location) {
      showAlert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.createJobPosting({
        title: formData.title,
        departmentName: formData.department,
        locationName: formData.location,
        description: formData.description || undefined,
        hourlyRateMin: formData.payMin ? Number(formData.payMin) : undefined,
        hourlyRateMax: formData.payMax ? Number(formData.payMax) : undefined,
        employmentType: 'full_time',
        requiredSkills: formData.requirements ? formData.requirements.split(',').map(s => s.trim()) : [],
      });

      setShowCreateForm(false);
      setFormData({ title: '', department: '', location: '', payMin: '', payMax: '', description: '', requirements: '' });
      showAlert('Job Posted', 'Your job posting is now live and visible to all workers');
      refetch();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to create job posting');
    } finally {
      setSubmitting(false);
    }
  }, [formData, refetch]);

  const handleJobAction = useCallback((job: any, action: 'close' | 'reopen') => {
    const newStatus = action === 'close' ? 'closed' : 'open';
    api.updateJobPosting(job.id, { status: newStatus })
      .then(() => {
        showAlert('Updated', `Job posting ${action === 'close' ? 'closed' : 'reopened'}.`);
        refetch();
      })
      .catch((e: any) => {
        showAlert('Error', e.message || 'Failed to update job posting');
      });
  }, [refetch]);

  if (showCreateForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowCreateForm(false)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('manager.createPosting')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.formContainer}>
          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Job Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Team Lead, Floor Associate"
              placeholderTextColor={colors.slate400}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Department *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Retail Operations, Customer Service"
              placeholderTextColor={colors.slate400}
              value={formData.department}
              onChangeText={(text) => setFormData({ ...formData, department: text })}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Location *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Main Store, Store 5"
              placeholderTextColor={colors.slate400}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Pay Range (per hr) *</Text>
            <View style={styles.payRangeRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Min"
                placeholderTextColor={colors.slate400}
                keyboardType="numeric"
                value={formData.payMin}
                onChangeText={(text) => setFormData({ ...formData, payMin: text })}
              />
              <Text style={styles.payRangeSeparator}>to</Text>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Max"
                placeholderTextColor={colors.slate400}
                keyboardType="numeric"
                value={formData.payMax}
                onChangeText={(text) => setFormData({ ...formData, payMax: text })}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>{t('screens.jobPostings.job_description')}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe the role and responsibilities..."
              placeholderTextColor={colors.slate400}
              multiline
              numberOfLines={6}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>{t('career.requirements')}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="List required skills and qualifications..."
              placeholderTextColor={colors.slate400}
              multiline
              numberOfLines={4}
              value={formData.requirements}
              onChangeText={(text) => setFormData({ ...formData, requirements: text })}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
            onPress={handleCreateJob}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <CheckCircleIcon size={20} color={colors.background} />
            )}
            <Text style={styles.submitButtonText}>{submitting ? 'Posting...' : 'Post Job'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('manager.jobPostings')}</Text>
            <Text style={styles.subtitle}>{jobs.filter((j: any) => j.status === 'open' || j.status === 'active').length} active positions</Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateForm(true)}>
            <PlusIcon size={20} color={colors.background} />
            <Text style={styles.createButtonText}>{t('screens.jobPostings.new_job')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.momentum} />
            <Text style={[styles.emptyText, { marginTop: spacing.md }]}>{t('screens.jobPostings.loading_job_postings')}</Text>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('screens.jobPostings.no_job_postings_yet')}</Text>
            <Text style={styles.emptyText}>{t('screens.jobPostings.create_your_first_job_posting_to_start_h')}</Text>
          </View>
        ) : (
          jobs.map((job: any) => {
            const isActive = job.status === 'open' || job.status === 'active';
            const isClosed = job.status === 'closed' || job.status === 'filled';
            const payRange = (job.hourlyRateMin && job.hourlyRateMax)
              ? `${job.hourlyRateMin}-${job.hourlyRateMax}/hr`
              : job.payRange || '';
            const location = job.locationName || job.location || '';
            const department = job.departmentName || job.department || '';
            const applicants = job.applicants ?? job.applicationCount ?? 0;
            const postedDate = job.postedDate || job.createdAt || '';

            return (
              <TouchableOpacity
                key={job.id}
                style={[
                  styles.jobCard,
                  isClosed && styles.jobCardClosed
                ]}
                onPress={() => showAlert(
                  job.title,
                  `${department} - ${job.employmentType || job.type || ''}\n\nApplications: ${applicants}\nStatus: ${job.status}\n\nWhat would you like to do?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'View Applications', onPress: () => showAlert('Applications', `${applicants} candidates have applied for this position.`) },
                    { text: isActive ? 'Close Posting' : 'Reopen', onPress: () => handleJobAction(job, isActive ? 'close' : 'reopen') },
                  ]
                )}
              >
                <View style={styles.jobHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.jobTitle, isClosed && styles.jobTitleClosed]}>
                      {job.title}
                    </Text>
                    <Text style={styles.jobDepartment}>{department}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isActive ? colors.success + '20' : colors.slate200 }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: isActive ? colors.success : colors.slate600 }
                      ]}
                    >
                      {job.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.jobDetails}>
                  <View style={styles.detailRow}>
                    <MapPinIcon size={16} color={colors.slate600} />
                    <Text style={styles.detailText}>{location}</Text>
                  </View>
                  {payRange ? (
                    <View style={styles.detailRow}>
                      <DollarSignIcon size={16} color={colors.momentum} />
                      <Text style={styles.detailText}>{payRange}</Text>
                    </View>
                  ) : null}
                  <View style={styles.detailRow}>
                    <UsersIcon size={16} color={colors.info} />
                    <Text style={styles.detailText}>{applicants} applicants</Text>
                  </View>
                </View>

                {postedDate ? <Text style={styles.postedDate}>Posted {postedDate}</Text> : null}
              </TouchableOpacity>
            );
          })
        )}
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
  createButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.momentum, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  createButtonText: { ...typography.bodyBold, color: colors.background },
  content: { flex: 1, padding: spacing.md },
  emptyState: { alignItems: 'center', padding: spacing.xxl, marginTop: spacing.xxl },
  emptyTitle: { ...typography.h2, color: colors.slate900, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.slate600 },
  jobCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  jobCardClosed: { opacity: 0.6 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  jobTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.xs },
  jobTitleClosed: { color: colors.slate600 },
  jobDepartment: { ...typography.body, color: colors.slate600 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  statusText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
  jobDetails: { gap: spacing.sm, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailText: { ...typography.body, color: colors.slate700 },
  postedDate: { ...typography.caption, color: colors.slate500 },
  formContainer: { flex: 1, padding: spacing.lg },
  formSection: { marginBottom: spacing.lg },
  fieldLabel: { ...typography.bodyBold, color: colors.slate900, marginBottom: spacing.sm },
  textInput: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.slate200, ...typography.body, color: colors.slate900 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  payRangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  payRangeSeparator: { ...typography.body, color: colors.slate600 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, marginTop: spacing.lg, ...shadows.lg },
  submitButtonText: { ...typography.h3, color: colors.background },
});
