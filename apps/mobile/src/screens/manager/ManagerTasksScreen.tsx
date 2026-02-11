import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useViewMode, useCanToggleView } from '../../contexts/ViewContext';
import { ViewToggle } from '../../components/ViewToggle';
import { useAuthStore } from '../../store/authStore';
import { useTasks } from '../../hooks/useData';
import {
  CheckSquareIcon,
  ClockIcon,
  StarIcon,
  AlertCircleIcon,
  FilterIcon,
  SearchIcon,
  XIcon,
  CheckCircleIcon,
  ZapIcon,
  SparklesIcon,
  BookOpenIcon,
  ShieldIcon,
  UsersIcon,
  ChevronRightIcon,
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

type TaskCategory = 'all' | 'cleaning' | 'setup' | 'training' | 'compliance' | 'service' | 'special';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

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
  status: string;
  requiresPhoto: boolean;
  requiresSignature: boolean;
  assignedTo?: string;
  assignedToId?: string;
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

export const ManagerTasksScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { isPersonalView, isTeamView } = useViewMode();
  const canToggle = useCanToggleView();
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'points'>('priority');
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasksData, loading, error, refetch } = useTasks();
  const allTasks: Task[] = (tasksData?.tasks ?? []) as Task[];

  // Filter tasks based on view mode
  const viewFilteredTasks = isPersonalView
    ? allTasks.filter(task => {
        // In personal view, show only tasks assigned to current user
        const userId = user?.id || user?.email;
        return task.assignedToId === userId ||
               task.assignedTo === user?.firstName ||
               task.assignedTo === `${user?.firstName} ${user?.lastName}`;
      })
    : allTasks; // Team view shows all tasks

  // Apply category and search filters
  const filteredTasks = viewFilteredTasks
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
        return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      }
      if (sortBy === 'points') {
        return b.points - a.points;
      }
      return 0;
    });

  const pendingTasks = filteredTasks.filter(t => t.status !== 'completed');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const totalPoints = viewFilteredTasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.points, 0);
  const totalXP = viewFilteredTasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.xpReward, 0);

  const getCategoryConfig = (category: TaskCategory): CategoryConfig => {
    return CATEGORIES.find(c => c.key === category) || CATEGORIES[0];
  };

  const handleStartTask = (task: Task) => {
    navigation.navigate('TaskDetail', { task });
  };

  return (
    <View style={styles.container}>
      {/* View Toggle */}
      {canToggle && (
        <View style={styles.toggleContainer}>
          <ViewToggle />
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, !canToggle && { paddingTop: 60 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>
              {isPersonalView ? t('tasks.myTasks') : t('tasks.teamTasks', 'Team Tasks')}
            </Text>
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
              ? viewFilteredTasks.filter(t => t.status !== 'completed').length
              : viewFilteredTasks.filter(t => t.category === cat.key && t.status !== 'completed').length;

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
                <Text style={[styles.categoryLabel, isSelected && { color: cat.color }]}>
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
                style={[styles.sortButton, sortBy === option.key && styles.sortButtonActive]}
                onPress={() => setSortBy(option.key as any)}
              >
                <Text style={[styles.sortButtonText, sortBy === option.key && styles.sortButtonTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.toggleButton} onPress={() => setShowCompleted(!showCompleted)}>
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
              const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;

              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, task.status === 'in_progress' && styles.taskCardInProgress]}
                  onPress={() => handleStartTask(task)}
                >
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

                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription} numberOfLines={2}>{task.description}</Text>

                  <View style={styles.taskMeta}>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <ClockIcon size={14} color={colors.slate500} />
                        <Text style={styles.metaText}>{task.duration}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <AlertCircleIcon size={14} color={priorityConfig.color} />
                        <Text style={[styles.metaText, { color: priorityConfig.color }]}>
                          Due: {task.dueDate}
                        </Text>
                      </View>
                    </View>
                    {isTeamView && task.assignedTo && (
                      <View style={styles.assigneeRow}>
                        <UsersIcon size={14} color={colors.info} />
                        <Text style={[styles.metaText, { color: colors.info }]}>
                          {task.assignedTo}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.taskFooter}>
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
                    <ChevronRightIcon size={20} color={colors.slate400} />
                  </View>
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
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <CheckSquareIcon size={64} color={colors.slate300} />
            <Text style={styles.emptyTitle}>
              {isPersonalView
                ? t('screens.tasks.no_personal_tasks', 'No tasks assigned to you')
                : t('screens.tasks.no_tasks_found')}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? t('screens.tasks.tryDifferentSearch')
                : isPersonalView
                  ? t('screens.tasks.noPersonalTasksDesc', 'Tasks assigned to you will appear here')
                  : t('screens.tasks.allCaughtUp')}
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  toggleContainer: { paddingTop: 60, paddingBottom: 8, alignItems: 'center', backgroundColor: colors.background },
  header: { backgroundColor: colors.background, paddingTop: 8, paddingBottom: spacing.md, paddingHorizontal: spacing.lg, ...shadows.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.slate900 },
  subtitle: { ...typography.body, color: colors.slate600, marginTop: spacing.xs },
  headerStats: { flexDirection: 'row', gap: spacing.sm },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.momentum + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  statValue: { ...typography.bodyBold, color: colors.momentum, fontSize: 14 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, gap: spacing.sm },
  searchInput: { flex: 1, ...typography.body, color: colors.slate900, padding: 0 },
  categoriesContainer: { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  categoriesScroll: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  categoryTab: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.slate50, borderWidth: 1, borderColor: 'transparent', marginEnd: spacing.sm },
  categoryLabel: { ...typography.caption, color: colors.slate600, fontWeight: '600' },
  categoryBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  categoryBadgeText: { ...typography.small, color: colors.background, fontWeight: '700', fontSize: 10 },
  filtersContainer: { backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  filterLabel: { ...typography.caption, color: colors.slate600, marginBottom: spacing.sm },
  sortButtons: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sortButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.slate100 },
  sortButtonActive: { backgroundColor: colors.momentum },
  sortButtonText: { ...typography.caption, color: colors.slate700, fontWeight: '600' },
  sortButtonTextActive: { color: colors.background },
  toggleButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggle: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.slate300, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.success, borderColor: colors.success },
  toggleLabel: { ...typography.body, color: colors.slate700 },
  content: { flex: 1 },
  section: { padding: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.slate900 },
  sectionCount: { ...typography.caption, color: colors.slate500 },
  taskCard: { backgroundColor: colors.background, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  taskCardInProgress: { borderStartWidth: 4, borderStartColor: colors.momentum },
  taskCardCompleted: { opacity: 0.8 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  categoryTag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  categoryTagText: { ...typography.small, fontWeight: '600' },
  priorityTag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  priorityText: { ...typography.small, fontWeight: '700' },
  taskTitle: { ...typography.h3, color: colors.slate900, fontSize: 17, marginBottom: spacing.xs },
  taskTitleCompleted: { ...typography.h3, color: colors.slate600, fontSize: 17, textDecorationLine: 'line-through', marginBottom: spacing.sm },
  taskDescription: { ...typography.body, color: colors.slate600, lineHeight: 20, marginBottom: spacing.md },
  taskMeta: { marginBottom: spacing.md },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.caption, color: colors.slate600 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate100 },
  rewardBadges: { flexDirection: 'row', gap: spacing.sm },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.momentum + '15', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  rewardText: { ...typography.bodyBold, color: colors.momentum, fontSize: 12 },
  completedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  loadingState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 3 },
  loadingText: { ...typography.body, color: colors.slate500, marginTop: spacing.md },
  retryButton: { marginTop: spacing.lg, backgroundColor: colors.momentum, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
  retryButtonText: { ...typography.bodyBold, color: colors.background },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 3 },
  emptyTitle: { ...typography.h3, color: colors.slate700, marginTop: spacing.lg },
  emptyText: { ...typography.body, color: colors.slate500, marginTop: spacing.sm, textAlign: 'center' },
});
