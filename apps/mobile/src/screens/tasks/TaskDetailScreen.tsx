import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CheckSquareIcon, ClockIcon, StarIcon, AlertCircleIcon, FileTextIcon,
  CameraIcon, CheckCircleIcon, UserIcon, MapPinIcon, CalendarIcon,
  PlayCircleIcon, BookOpenIcon, LinkIcon, AwardIcon, TrendingUpIcon
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export const TaskDetailScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>('steps');

  // Task data from route params - no hardcoded fallback
  const task = route?.params?.task;

  // If no task provided, show error state
  if (!task) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyStateContainer}>
          <AlertCircleIcon size={48} color={colors.slate400} />
          <Text style={styles.emptyStateTitle}>
            {t('tasks.noTaskSelected', 'No task selected')}
          </Text>
          <Text style={styles.emptyStateText}>
            {t('tasks.selectTaskFromList', 'Please select a task from the list')}
          </Text>
        </View>
      </View>
    );
  }

  const completedSubtasks = task.subtasks?.filter((st: any) => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'high': return { color: colors.error, label: t('tasks.highPriority'), icon: '!' };
      case 'medium': return { color: colors.warning, label: t('tasks.mediumPriority'), icon: '!!' };
      default: return { color: colors.slate500, label: t('tasks.lowPriority'), icon: '' };
    }
  };

  const priorityInfo = getPriorityInfo(task.priority);

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'training': return { color: colors.info, label: t('tasks.training'), icon: <BookOpenIcon size={16} color={colors.info} /> };
      case 'cleaning': return { color: colors.success, label: t('tasks.cleaning'), icon: <CheckSquareIcon size={16} color={colors.success} /> };
      case 'inventory': return { color: colors.warning, label: t('tasks.inventory'), icon: <FileTextIcon size={16} color={colors.warning} /> };
      default: return { color: colors.slate500, label: category, icon: <CheckSquareIcon size={16} color={colors.slate500} /> };
    }
  };

  const categoryInfo = getCategoryInfo(task.category);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backButton}>←</Text>
          <Text style={styles.backButtonText}>{t('tasks.title')}</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityInfo.color }]}>
            <Text style={styles.priorityText}>{priorityInfo.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
              {categoryInfo.icon}
              <Text style={[styles.categoryText, { color: categoryInfo.color }]}>{categoryInfo.label}</Text>
            </View>
            <View style={styles.pointsBadge}>
              <StarIcon size={18} color={colors.momentum} />
              <Text style={styles.pointsText}>+{task.points} pts</Text>
            </View>
          </View>

          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.description}>{task.description}</Text>

          {/* Quick Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <ClockIcon size={18} color={colors.slate500} />
              <View>
                <Text style={styles.infoLabel}>{t('tasks.duration')}</Text>
                <Text style={styles.infoValue}>{task.duration}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <CalendarIcon size={18} color={priorityInfo.color} />
              <View>
                <Text style={styles.infoLabel}>{t('tasks.dueDate')}</Text>
                <Text style={[styles.infoValue, { color: priorityInfo.color }]}>{task.dueDate} {task.dueTime}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <MapPinIcon size={18} color={colors.slate500} />
              <View>
                <Text style={styles.infoLabel}>{t('common.location')}</Text>
                <Text style={styles.infoValue}>{task.location}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <UserIcon size={18} color={colors.slate500} />
              <View>
                <Text style={styles.infoLabel}>{t('tasks.assignedBy')}</Text>
                <Text style={styles.infoValue}>{task.assignedBy?.name}</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t('tasks.progress')}</Text>
              <Text style={styles.progressValue}>{completedSubtasks}/{totalSubtasks} {t('tasks.stepsCompleted')}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {task.requiresProof && (
            <View style={styles.proofBanner}>
              <CameraIcon size={20} color={colors.info} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proofTitle}>{t('tasks.photoRequired')}</Text>
                <Text style={styles.proofText}>{t('tasks.photoRequiredDesc')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Steps/Checklist */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeaderTouchable}
            onPress={() => setExpandedSection(expandedSection === 'steps' ? null : 'steps')}
          >
            <View style={styles.cardHeader}>
              <CheckSquareIcon size={22} color={colors.momentum} />
              <Text style={styles.cardTitle}>{t('tasks.steps')}</Text>
              <View style={styles.stepsBadge}>
                <Text style={styles.stepsBadgeText}>{completedSubtasks}/{totalSubtasks}</Text>
              </View>
            </View>
            <Text style={styles.expandIcon}>{expandedSection === 'steps' ? '−' : '+'}</Text>
          </TouchableOpacity>

          {expandedSection === 'steps' && task.subtasks?.map((subtask: any, index: number) => (
            <View key={subtask.id} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, subtask.completed && styles.stepTitleCompleted]}>
                  {subtask.title || subtask.text}
                </Text>
                {subtask.duration && (
                  <View style={styles.stepMeta}>
                    <ClockIcon size={12} color={colors.slate400} />
                    <Text style={styles.stepMetaText}>{subtask.duration}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.stepCheckbox, subtask.completed && styles.stepCheckboxCompleted]}>
                {subtask.completed && <CheckCircleIcon size={18} color={colors.background} />}
              </View>
            </View>
          ))}
        </View>

        {/* Completion Requirements */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeaderTouchable}
            onPress={() => setExpandedSection(expandedSection === 'requirements' ? null : 'requirements')}
          >
            <View style={styles.cardHeader}>
              <AlertCircleIcon size={22} color={colors.error} />
              <Text style={styles.cardTitle}>{t('screens.taskDetail.requirements_to_complete')}</Text>
              <View style={styles.reqProgressBadge}>
                <Text style={styles.reqProgressText}>
                  {task.requirements?.filter((r: any) => r.met).length || 0}/{task.requirements?.length || 0}
                </Text>
              </View>
            </View>
            <Text style={styles.expandIcon}>{expandedSection === 'requirements' ? '−' : '+'}</Text>
          </TouchableOpacity>

          {expandedSection === 'requirements' && (
            <View style={styles.requirementsBox}>
              {task.requirements?.map((req: any, index: number) => (
                <View key={index} style={[styles.requirementItem, req.met && styles.requirementItemMet]}>
                  <View style={[styles.reqIconBox, req.met && styles.reqIconBoxMet]}>
                    {req.type === 'checklist' && <CheckSquareIcon size={16} color={req.met ? colors.success : colors.slate600} />}
                    {req.type === 'photo' && <CameraIcon size={16} color={req.met ? colors.success : colors.slate600} />}
                    {req.type === 'notes' && <FileTextIcon size={16} color={req.met ? colors.success : colors.slate600} />}
                    {req.type === 'location' && <MapPinIcon size={16} color={req.met ? colors.success : colors.slate600} />}
                    {req.type === 'signature' && <UserIcon size={16} color={req.met ? colors.success : colors.slate600} />}
                    {!req.type && (req.met ? <CheckCircleIcon size={16} color={colors.success} /> : <AlertCircleIcon size={16} color={colors.warning} />)}
                  </View>
                  <Text style={[styles.requirementText, req.met && styles.requirementTextMet]}>
                    {typeof req === 'string' ? req : req.text}
                  </Text>
                  {req.met ? (
                    <CheckCircleIcon size={18} color={colors.success} />
                  ) : (
                    <View style={styles.reqPending}>
                      <Text style={styles.reqPendingText}>Required</Text>
                    </View>
                  )}
                </View>
              ))}
              <Text style={styles.requirementsNote}>
                Complete all requirements above to enable the "Complete Task" button
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        {task.instructions && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AlertCircleIcon size={22} color={colors.info} />
              <Text style={styles.cardTitle}>{t('tasks.instructions')}</Text>
            </View>
            <Text style={styles.instructionsText}>{task.instructions}</Text>
          </View>
        )}

        {/* Resources */}
        {task.resources && task.resources.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LinkIcon size={22} color={colors.slate700} />
              <Text style={styles.cardTitle}>{t('tasks.resources')}</Text>
            </View>
            {task.resources.map((resource: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.resourceItem}
                onPress={() => resource.url && resource.url !== '#' && Linking.openURL(resource.url)}
              >
                {resource.type === 'video' && <PlayCircleIcon size={20} color={colors.error} />}
                {resource.type === 'document' && <FileTextIcon size={20} color={colors.info} />}
                {resource.type === 'link' && <LinkIcon size={20} color={colors.momentum} />}
                <Text style={styles.resourceTitle}>{resource.title}</Text>
                <Text style={styles.resourceArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Skills Gained */}
        {task.skillsGained && task.skillsGained.length > 0 && (
          <View style={styles.skillsCard}>
            <View style={styles.skillsHeader}>
              <AwardIcon size={20} color={colors.success} />
              <Text style={styles.skillsTitle}>{t('tasks.skillsYoullGain')}</Text>
            </View>
            <View style={styles.skillsTags}>
              {task.skillsGained.map((skill: string, index: number) => (
                <View key={index} style={styles.skillTag}>
                  <TrendingUpIcon size={14} color={colors.success} />
                  <Text style={styles.skillTagText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Start Task Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('TaskExecution', { task })}
        >
          <PlayCircleIcon size={24} color={colors.background} />
          <Text style={styles.startButtonText}>{t('tasks.startTask')}</Text>
        </TouchableOpacity>

        {/* Estimated Time Note */}
        <View style={styles.estimateNote}>
          <ClockIcon size={16} color={colors.slate500} />
          <Text style={styles.estimateText}>
            {t('tasks.estimatedTime', { time: task.duration })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyStateTitle: { ...typography.h3, color: colors.slate600, marginTop: spacing.md, textAlign: 'center' },
  emptyStateText: { ...typography.body, color: colors.slate500, marginTop: spacing.sm, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    ...shadows.sm
  },
  backButtonContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: { padding: spacing.xs },
  backButtonText: { ...typography.bodyBold, color: colors.momentum },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priorityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm
  },
  priorityText: { ...typography.caption, color: colors.background, fontWeight: '700' },

  content: { flex: 1 },

  // Hero Card
  heroCard: {
    backgroundColor: colors.background,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.lg
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm
  },
  categoryText: { ...typography.caption, fontWeight: '700' },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.momentum + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full
  },
  pointsText: { ...typography.bodyBold, color: colors.momentum },
  title: { ...typography.h2, color: colors.slate900, marginBottom: spacing.sm, fontSize: 22 },
  description: { ...typography.body, color: colors.slate600, lineHeight: 24, marginBottom: spacing.lg },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '47%',
    marginBottom: spacing.sm,
  },
  infoLabel: { ...typography.caption, color: colors.slate500, marginBottom: 2 },
  infoValue: { ...typography.bodyBold, color: colors.slate900, fontSize: 13 },

  // Progress
  progressSection: { marginBottom: spacing.lg },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  progressLabel: { ...typography.bodyBold, color: colors.slate700 },
  progressValue: { ...typography.caption, color: colors.slate600 },
  progressBar: {
    height: 8,
    backgroundColor: colors.slate200,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: { height: '100%', backgroundColor: colors.momentum, borderRadius: 4 },

  // Proof Banner
  proofBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderStartWidth: 4,
    borderStartColor: colors.info
  },
  proofTitle: { ...typography.bodyBold, color: colors.info, marginBottom: 2 },
  proofText: { ...typography.caption, color: colors.slate600 },

  // Cards
  card: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md
  },
  cardHeaderTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  cardTitle: { ...typography.h3, color: colors.slate900, flex: 1 },
  expandIcon: { fontSize: 24, color: colors.slate400, fontWeight: '300' },
  stepsBadge: {
    backgroundColor: colors.momentum + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm
  },
  stepsBadgeText: { ...typography.caption, color: colors.momentum, fontWeight: '700' },

  // Step Items
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100
  },
  stepNumber: {
    width: 28,
    height: 28,
    backgroundColor: colors.slate100,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumberText: { ...typography.bodyBold, color: colors.slate600, fontSize: 13 },
  stepContent: { flex: 1 },
  stepTitle: { ...typography.body, color: colors.slate900 },
  stepTitleCompleted: { color: colors.slate400, textDecorationLine: 'line-through' },
  stepMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  stepMetaText: { ...typography.caption, color: colors.slate400 },
  stepCheckbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: colors.slate300,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepCheckboxCompleted: { backgroundColor: colors.success, borderColor: colors.success },

  // Requirements
  reqProgressBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: 'auto',
    marginEnd: spacing.md,
  },
  reqProgressText: { ...typography.caption, color: colors.error, fontWeight: '700' },
  requirementsBox: {
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  requirementItemMet: {
    opacity: 0.7,
  },
  reqIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqIconBoxMet: {
    backgroundColor: colors.success + '20',
  },
  requirementText: { ...typography.body, color: colors.slate700, flex: 1 },
  requirementTextMet: { color: colors.slate500, textDecorationLine: 'line-through' },
  reqPending: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  reqPendingText: { ...typography.small, color: colors.warning, fontWeight: '700' },
  requirementsNote: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.md,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Instructions
  instructionsText: { ...typography.body, color: colors.slate700, lineHeight: 26 },

  // Resources
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100
  },
  resourceTitle: { ...typography.body, color: colors.slate900, flex: 1 },
  resourceArrow: { ...typography.body, color: colors.momentum },

  // Skills Card
  skillsCard: {
    backgroundColor: colors.success + '10',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderStartWidth: 4,
    borderStartColor: colors.success
  },
  skillsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  skillsTitle: { ...typography.h3, color: colors.success },
  skillsTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full
  },
  skillTagText: { ...typography.bodyBold, color: colors.success, fontSize: 13 },

  // Start Button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.momentum,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.lg
  },
  startButtonText: { ...typography.h3, color: colors.background },

  // Estimate Note
  estimateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg
  },
  estimateText: { ...typography.caption, color: colors.slate500 },
});
