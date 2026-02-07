import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CheckSquareIcon,
  ClockIcon,
  StarIcon,
  AlertCircleIcon,
  CameraIcon,
  ChevronRightIcon,
  FilterIcon,
  SearchIcon,
  XIcon,
  CheckCircleIcon,
  AwardIcon,
  ZapIcon,
  BookOpenIcon,
  ShieldIcon,
  UsersIcon,
  SparklesIcon,
  EditIcon,
  ArrowLeftIcon,
} from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useTasks } from '../hooks/useData';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TaskCategory = 'all' | 'cleaning' | 'setup' | 'training' | 'compliance' | 'service' | 'special';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  points: number;
  xpReward: number;
  duration: string;
  dueDate: string;
  dueTime?: string;
  priority: TaskPriority;
  status: TaskStatus;
  requiresPhoto: boolean;
  requiresSignature: boolean;
  subtasks?: { id: string; text: string; completed: boolean }[];
  requirements?: { type: string; text: string; met: boolean }[];
  location?: string;
  assignedBy?: string;
  completedAt?: string;
  completedPhoto?: string;
}

interface CategoryConfig {
  key: TaskCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'all', label: 'All Tasks', icon: <CheckSquareIcon size={18} color={colors.slate600} />, color: colors.slate600 },
  { key: 'cleaning', label: 'Cleaning', icon: <SparklesIcon size={18} color="#3B82F6" />, color: '#3B82F6' },
  { key: 'setup', label: 'Setup', icon: <UsersIcon size={18} color="#10B981" />, color: '#10B981' },
  { key: 'training', label: 'Training', icon: <BookOpenIcon size={18} color="#8B5CF6" />, color: '#8B5CF6' },
  { key: 'compliance', label: 'Compliance', icon: <ShieldIcon size={18} color="#EF4444" />, color: '#EF4444' },
  { key: 'service', label: 'Service', icon: <UsersIcon size={18} color="#F59E0B" />, color: '#F59E0B' },
  { key: 'special', label: 'Special', icon: <StarIcon size={18} color="#EC4899" />, color: '#EC4899' },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  urgent: { label: 'Urgent', color: colors.error, bgColor: colors.error + '15' },
  high: { label: 'High', color: '#EF4444', bgColor: '#EF444415' },
  medium: { label: 'Medium', color: '#F59E0B', bgColor: '#F59E0B15' },
  low: { label: 'Low', color: colors.slate500, bgColor: colors.slate100 },
};

export const TasksScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'points'>('priority');
  const [showCompleted, setShowCompleted] = useState(true);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Fetch tasks from API
  const { data: tasksData, loading, error, refetch } = useTasks();
  const tasks: Task[] = (tasksData?.tasks ?? []) as Task[];

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      if (selectedCategory !== 'all' && task.category !== selectedCategory) return false;
      if (!showCompleted && task.status === 'completed') return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return task.title.toLowerCase().includes(query) ||
               task.description.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === 'points') {
        return b.points - a.points;
      }
      // Due date sorting (Today first, then by days)
      return 0;
    });

  const pendingTasks = filteredTasks.filter(t => t.status !== 'completed');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const totalPoints = tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.points, 0);
  const totalXP = tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.xpReward, 0);

  const getCategoryConfig = (category: TaskCategory): CategoryConfig => {
    return CATEGORIES.find(c => c.key === category) || CATEGORIES[0];
  };

  const getSubtaskProgress = (task: Task): number => {
    if (!task.subtasks) return 0;
    const completed = task.subtasks.filter(s => s.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const handleStartTask = (task: Task) => {
    navigation.navigate('TaskDetail', { task });
  };

  const handleCompleteTask = (task: Task) => {
    if (task.requiresPhoto || task.requiresSignature) {
      setCompletingTask(task);
    } else {
      showAlert(
        'Complete Task',
        `Mark "${task.title}" as complete? You'll earn ${task.points} points and ${task.xpReward} XP!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => confirmCompletion(task) }
        ]
      );
    }
  };

  const handleTakePhoto = () => {
    showAlert(
      'Take Photo',
      'Camera would open here. For demo, we\'ll use a sample photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Demo Photo',
          onPress: () => setCompletionPhoto('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200')
        }
      ]
    );
  };

  const confirmCompletion = async (task: Task) => {
    try {
      await api.completeTask(task.id, { notes: completionNotes || undefined });
      showAlert(
        'Task Completed!',
        `You earned:\n+${task.points} Points\n+${task.xpReward} XP`,
        [{ text: 'Awesome!', onPress: () => {
          setCompletingTask(null);
          setCompletionPhoto(null);
          setCompletionNotes('');
          refetch();
        }}]
      );
    } catch (e: any) {
      showAlert(t('common.error'), e.message || t('screens.tasks.failedToComplete'));
    }
  };

  const handleSubmitCompletion = () => {
    if (completingTask) {
      if (completingTask.requiresPhoto && !completionPhoto) {
        showAlert(t('tasks.photoRequired'), t('tasks.photoRequiredDesc'));
        return;
      }
      confirmCompletion(completingTask);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
          >
            <ArrowLeftIcon size={20} color={colors.momentum} />
            <Text style={{ color: colors.momentum, fontSize: 15, fontWeight: '600', marginStart: 4 }}>{t('common.back')}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>{t('tasks.myTasks')}</Text>
            <Text style={styles.subtitle}>
              {pendingTasks.length} pending, {completedTasks.length} completed
            </Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statBadge}>
              <StarIcon size={16} color={colors.momentum} />
              <Text style={styles.statValue}>{totalPoints}</Text>
            </View>
            <View style={[styles.statBadge, { backgroundColor: colors.success + '15' }]}>
              <ZapIcon size={16} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.success }]}>{totalXP} XP</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchIcon size={18} color={colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('screens.tasks.searchPlaceholder')}
            placeholderTextColor={colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <XIcon size={18} color={colors.slate400} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
              <FilterIcon size={18} color={colors.momentum} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const taskCount = cat.key === 'all'
              ? tasks.filter(t => t.status !== 'completed').length
              : tasks.filter(t => t.category === cat.key && t.status !== 'completed').length;

            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryTab,
                  isSelected && { backgroundColor: cat.color + '20', borderColor: cat.color }
                ]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                {cat.icon}
                <Text style={[
                  styles.categoryLabel,
                  isSelected && { color: cat.color }
                ]}>
                  {cat.label}
                </Text>
                {taskCount > 0 && (
                  <View style={[styles.categoryBadge, { backgroundColor: cat.color }]}>
                    <Text style={styles.categoryBadgeText}>{taskCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort Options */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>{t('screens.tasks.sort_by')}</Text>
          <View style={styles.sortButtons}>
            {[
              { key: 'priority', label: t('tasks.priority') },
              { key: 'dueDate', label: t('tasks.dueDate') },
              { key: 'points', label: t('gamification.points') },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortButton,
                  sortBy === option.key && styles.sortButtonActive
                ]}
                onPress={() => setSortBy(option.key as any)}
              >
                <Text style={[
                  styles.sortButtonText,
                  sortBy === option.key && styles.sortButtonTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            <View style={[styles.toggle, showCompleted && styles.toggleActive]}>
              {showCompleted && <CheckCircleIcon size={12} color={colors.background} />}
            </View>
            <Text style={styles.toggleLabel}>{t('screens.tasks.show_completed')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.momentum} />
            <Text style={styles.loadingText}>{t('screens.tasks.loading_tasks')}</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.emptyState}>
            <AlertCircleIcon size={64} color={colors.error} />
            <Text style={styles.emptyTitle}>{t('screens.tasks.something_went_wrong')}</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>{t('screens.tasks.try_again')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Tasks */}
        {!loading && !error && pendingTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('screens.tasks.to_do')}</Text>
              <Text style={styles.sectionCount}>{t('schedule.tasks', { count: pendingTasks.length })}</Text>
            </View>

            {pendingTasks.map((task) => {
              const categoryConfig = getCategoryConfig(task.category as TaskCategory);
              const priorityConfig = PRIORITY_CONFIG[task.priority];
              const progress = getSubtaskProgress(task);

              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, task.status === 'in_progress' && styles.taskCardInProgress]}
                  onPress={() => handleStartTask(task)}
                >
                  {/* Category & Priority Header */}
                  <View style={styles.taskHeader}>
                    <View style={[styles.categoryTag, { backgroundColor: categoryConfig.color + '15' }]}>
                      {categoryConfig.icon}
                      <Text style={[styles.categoryTagText, { color: categoryConfig.color }]}>
                        {categoryConfig.label}
                      </Text>
                    </View>
                    <View style={[styles.priorityTag, { backgroundColor: priorityConfig.bgColor }]}>
                      <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                        {priorityConfig.label}
                      </Text>
                    </View>
                  </View>

                  {/* Task Content */}
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription} numberOfLines={2}>{task.description}</Text>

                  {/* Subtasks Progress */}
                  {task.subtasks && (
                    <View style={styles.subtasksContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                      </View>
                      <Text style={styles.progressText}>
                        {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} steps
                      </Text>
                    </View>
                  )}

                  {/* Task Meta */}
                  <View style={styles.taskMeta}>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <ClockIcon size={14} color={colors.slate500} />
                        <Text style={styles.metaText}>{task.duration}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <AlertCircleIcon size={14} color={priorityConfig.color} />
                        <Text style={[styles.metaText, { color: priorityConfig.color }]}>
                          Due: {task.dueDate} {task.dueTime && `at ${task.dueTime}`}
                        </Text>
                      </View>
                    </View>

                    {task.location && (
                      <Text style={styles.locationText}>{task.location}</Text>
                    )}
                  </View>

                  {/* Requirements & Rewards */}
                  <View style={styles.taskFooter}>
                    <View style={styles.requirementBadges}>
                      {task.requiresPhoto && (
                        <View style={styles.requirementBadge}>
                          <CameraIcon size={12} color={colors.info} />
                          <Text style={styles.requirementText}>{t('screens.tasks.photo')}</Text>
                        </View>
                      )}
                      {task.requiresSignature && (
                        <View style={styles.requirementBadge}>
                          <EditIcon size={12} color={colors.info} />
                          <Text style={styles.requirementText}>{t('screens.tasks.sign')}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.rewardBadges}>
                      <View style={styles.rewardBadge}>
                        <StarIcon size={14} color={colors.momentum} />
                        <Text style={styles.rewardText}>+{task.points}</Text>
                      </View>
                      <View style={[styles.rewardBadge, { backgroundColor: colors.success + '15' }]}>
                        <ZapIcon size={14} color={colors.success} />
                        <Text style={[styles.rewardText, { color: colors.success }]}>+{task.xpReward} XP</Text>
                      </View>
                    </View>
                  </View>

                  {/* Quick Action */}
                  {task.status === 'in_progress' && (
                    <TouchableOpacity
                      style={styles.continueButton}
                      onPress={() => handleCompleteTask(task)}
                    >
                      <Text style={styles.continueButtonText}>{t('screens.tasks.continue_task')}</Text>
                      <ChevronRightIcon size={18} color={colors.background} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Completed Tasks */}
        {!loading && !error && showCompleted && completedTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('common.completed')}</Text>
              <Text style={styles.sectionCount}>{t('schedule.tasks', { count: completedTasks.length })}</Text>
            </View>

            {completedTasks.map((task) => {
              const categoryConfig = getCategoryConfig(task.category as TaskCategory);

              return (
                <View key={task.id} style={[styles.taskCard, styles.taskCardCompleted]}>
                  <View style={styles.completedHeader}>
                    <View style={[styles.categoryTag, { backgroundColor: categoryConfig.color + '10' }]}>
                      {categoryConfig.icon}
                      <Text style={[styles.categoryTagText, { color: categoryConfig.color }]}>
                        {categoryConfig.label}
                      </Text>
                    </View>
                    <CheckCircleIcon size={24} color={colors.success} />
                  </View>

                  <Text style={styles.taskTitleCompleted}>{task.title}</Text>

                  <View style={styles.completedMeta}>
                    <Text style={styles.completedTime}>
                      Completed {task.dueDate} at {task.completedAt}
                    </Text>
                    <View style={styles.earnedBadge}>
                      <StarIcon size={12} color={colors.momentum} />
                      <Text style={styles.earnedText}>+{task.points}</Text>
                      <ZapIcon size={12} color={colors.success} />
                      <Text style={[styles.earnedText, { color: colors.success }]}>+{task.xpReward} XP</Text>
                    </View>
                  </View>

                  {task.completedPhoto && (
                    <Image source={{ uri: task.completedPhoto }} style={styles.completedPhoto} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <CheckSquareIcon size={64} color={colors.slate300} />
            <Text style={styles.emptyTitle}>{t('screens.tasks.no_tasks_found')}</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? t('screens.tasks.tryDifferentSearch')
                : t('screens.tasks.allCaughtUp')}
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>

      {/* Task Completion Modal */}
      <Modal
        visible={!!completingTask}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {completingTask && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setCompletingTask(null);
                setCompletionPhoto(null);
                setCompletionNotes('');
              }}>
                <XIcon size={24} color={colors.slate600} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('screens.tasks.complete_task')}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalTaskTitle}>{completingTask.title}</Text>

              {/* Photo Section */}
              {completingTask.requiresPhoto && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    <CameraIcon size={16} color={colors.slate700} /> {t('screens.tasks.verificationPhotoRequired')}
                  </Text>
                  {completionPhoto ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: completionPhoto }} style={styles.photoPreview} />
                      <TouchableOpacity
                        style={styles.retakeButton}
                        onPress={handleTakePhoto}
                      >
                        <Text style={styles.retakeText}>{t('screens.tasks.retake')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                      <CameraIcon size={32} color={colors.momentum} />
                      <Text style={styles.photoButtonText}>{t('screens.tasks.take_photo')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Signature Section */}
              {completingTask.requiresSignature && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    <EditIcon size={16} color={colors.slate700} /> {t('screens.tasks.signatureRequired')}
                  </Text>
                  <TouchableOpacity style={styles.signatureBox} onPress={() => showAlert(t('screens.tasks.signature'), t('screens.tasks.signatureDemo'))}>
                    <EditIcon size={24} color={colors.slate300} />
                    <Text style={styles.signatureText}>{t('screens.tasks.tap_to_sign')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Notes Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('screens.tasks.notes_optional')}</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder={t('screens.tasks.addNotesPlaceholder')}
                  placeholderTextColor={colors.slate400}
                  multiline
                  numberOfLines={3}
                  value={completionNotes}
                  onChangeText={setCompletionNotes}
                />
              </View>

              {/* Rewards Preview */}
              <View style={styles.rewardsPreview}>
                <Text style={styles.rewardsPreviewTitle}>{t('screens.tasks.youll_earn')}</Text>
                <View style={styles.rewardsPreviewBadges}>
                  <View style={styles.rewardPreviewBadge}>
                    <StarIcon size={24} color={colors.momentum} />
                    <Text style={styles.rewardPreviewValue}>+{completingTask.points}</Text>
                    <Text style={styles.rewardPreviewLabel}>{t('gamification.points')}</Text>
                  </View>
                  <View style={styles.rewardPreviewBadge}>
                    <ZapIcon size={24} color={colors.success} />
                    <Text style={[styles.rewardPreviewValue, { color: colors.success }]}>+{completingTask.xpReward}</Text>
                    <Text style={styles.rewardPreviewLabel}>{t('gamification.xpUnit')}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitCompletion}
              >
                <CheckCircleIcon size={24} color={colors.background} />
                <Text style={styles.submitButtonText}>{t('screens.tasks.complete_task')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Header
  header: {
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.slate900,
  },
  subtitle: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  headerStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.momentum + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statValue: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 14,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.slate900,
    padding: 0,
  },

  // Categories
  categoriesContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  categoriesScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: 'transparent',
    marginEnd: spacing.sm,
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.slate600,
    fontWeight: '600',
  },
  categoryBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  categoryBadgeText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '700',
    fontSize: 10,
  },

  // Filters
  filtersContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.slate600,
    marginBottom: spacing.sm,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.slate100,
  },
  sortButtonActive: {
    backgroundColor: colors.momentum,
  },
  sortButtonText: {
    ...typography.caption,
    color: colors.slate700,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: colors.background,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggle: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.slate700,
  },

  // Content
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.slate900,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.slate500,
  },

  // Task Card
  taskCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  taskCardInProgress: {
    borderStartWidth: 4,
    borderStartColor: colors.momentum,
  },
  taskCardCompleted: {
    opacity: 0.8,
  },

  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryTagText: {
    ...typography.small,
    fontWeight: '600',
  },
  priorityTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    ...typography.small,
    fontWeight: '700',
  },

  taskTitle: {
    ...typography.h3,
    color: colors.slate900,
    fontSize: 17,
    marginBottom: spacing.xs,
  },
  taskTitleCompleted: {
    ...typography.h3,
    color: colors.slate600,
    fontSize: 17,
    textDecorationLine: 'line-through',
    marginBottom: spacing.sm,
  },
  taskDescription: {
    ...typography.body,
    color: colors.slate600,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  // Subtasks
  subtasksContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.slate200,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.momentum,
    borderRadius: 3,
  },
  progressText: {
    ...typography.small,
    color: colors.slate500,
  },

  // Meta
  taskMeta: {
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.slate600,
  },
  locationText: {
    ...typography.small,
    color: colors.slate500,
    fontStyle: 'italic',
  },

  // Footer
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  requirementBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.info + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  requirementText: {
    ...typography.small,
    color: colors.info,
    fontWeight: '600',
  },
  rewardBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.momentum + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  rewardText: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 12,
  },

  // Continue Button
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  continueButtonText: {
    ...typography.bodyBold,
    color: colors.background,
  },

  // Completed
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  completedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedTime: {
    ...typography.caption,
    color: colors.slate500,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  earnedText: {
    ...typography.small,
    color: colors.momentum,
    fontWeight: '600',
  },
  completedPhoto: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },

  // Loading State
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
  },
  loadingText: {
    ...typography.body,
    color: colors.slate500,
    marginTop: spacing.md,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.momentum,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.bodyBold,
    color: colors.background,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.slate700,
    marginTop: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.slate500,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.slate900,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalTaskTitle: {
    ...typography.h2,
    color: colors.slate900,
    marginBottom: spacing.xl,
  },
  modalSection: {
    marginBottom: spacing.xl,
  },
  modalSectionTitle: {
    ...typography.bodyBold,
    color: colors.slate700,
    marginBottom: spacing.md,
  },

  // Photo
  photoButton: {
    height: 160,
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.momentum,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    ...typography.bodyBold,
    color: colors.momentum,
    marginTop: spacing.sm,
  },
  photoPreviewContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.xl,
  },
  retakeButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  retakeText: {
    ...typography.bodyBold,
    color: colors.slate700,
  },

  // Signature
  signatureBox: {
    height: 120,
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate300,
  },
  signatureText: {
    ...typography.body,
    color: colors.slate400,
    marginTop: spacing.sm,
  },

  // Notes
  notesInput: {
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...typography.body,
    color: colors.slate900,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Rewards Preview
  rewardsPreview: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  rewardsPreviewTitle: {
    ...typography.body,
    color: colors.slate600,
    marginBottom: spacing.md,
  },
  rewardsPreviewBadges: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  rewardPreviewBadge: {
    alignItems: 'center',
  },
  rewardPreviewValue: {
    ...typography.h1,
    color: colors.momentum,
    marginTop: spacing.sm,
  },
  rewardPreviewLabel: {
    ...typography.caption,
    color: colors.slate500,
  },

  // Modal Footer
  modalFooter: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  submitButtonText: {
    ...typography.h3,
    color: colors.background,
  },
});
