import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AwardIcon, StarIcon, CheckCircleIcon, ZapIcon, TargetIcon, TrendingUpIcon, HeartIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useBadges } from '../../hooks/useData';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'star' | 'award' | 'zap' | 'target' | 'trending' | 'heart' | 'check';
  color: string;
  category: 'performance' | 'skills' | 'teamwork' | 'milestones';
  earnedDate?: string;
  progress?: number;
  requirement: string;
}

export const BadgesScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'earned' | 'available'>('all');

  // Wire to real API
  const { data: badgesData, loading: badgesLoading } = useBadges();

  const badges: Badge[] = (badgesData?.badges ?? []).map((b: any) => ({
    id: b.id,
    name: b.name ?? b.title ?? '',
    description: b.description ?? '',
    icon: b.icon ?? 'award',
    color: b.color ?? colors.momentum,
    category: b.category ?? 'performance',
    earnedDate: b.earnedDate ?? (b.earned ? 'Earned' : undefined),
    progress: b.progress,
    requirement: b.requirement ?? '',
  }));

  const getIcon = (icon: string, color: string, size: number = 32) => {
    switch (icon) {
      case 'star': return <StarIcon size={size} color={color} />;
      case 'award': return <AwardIcon size={size} color={color} />;
      case 'zap': return <ZapIcon size={size} color={color} />;
      case 'target': return <TargetIcon size={size} color={color} />;
      case 'trending': return <TrendingUpIcon size={size} color={color} />;
      case 'heart': return <HeartIcon size={size} color={color} />;
      case 'check': return <CheckCircleIcon size={size} color={color} />;
      default: return <AwardIcon size={size} color={color} />;
    }
  };

  const earnedBadges = badges.filter(b => b.earnedDate);
  const inProgressBadges = badges.filter(b => b.progress && !b.earnedDate);
  const lockedBadges = badges.filter(b => !b.earnedDate && !b.progress);

  const filteredBadges = filter === 'earned' 
    ? earnedBadges 
    : filter === 'available'
    ? [...inProgressBadges, ...lockedBadges]
    : badges;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('gamification.badges')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{earnedBadges.length}</Text>
          <Text style={styles.statLabel}>{t('gamification.badgesEarned', { count: earnedBadges.length }).split(' ')[1]}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{inProgressBadges.length}</Text>
          <Text style={styles.statLabel}>{t('tasks.inProgress')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{lockedBadges.length}</Text>
          <Text style={styles.statLabel}>{t('common.disabled')}</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {(['all', 'earned', 'available'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? t('common.all') : f === 'earned' ? t('rewards.redeemed') : t('timeOff.available')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Badges Grid */}
      {badgesLoading && (
        <ActivityIndicator size="large" color={colors.momentum} style={{ marginTop: spacing.lg }} />
      )}
      <ScrollView style={styles.content}>
        <View style={styles.badgesGrid}>
          {filteredBadges.map((badge) => {
            const isEarned = !!badge.earnedDate;
            const isInProgress = !!badge.progress && !badge.earnedDate;
            const isLocked = !badge.earnedDate && !badge.progress;

            return (
              <View 
                key={badge.id} 
                style={[
                  styles.badgeCard,
                  isLocked && styles.badgeCardLocked
                ]}
              >
                <View style={[
                  styles.badgeIcon,
                  { backgroundColor: isLocked ? colors.slate200 : badge.color + '20' }
                ]}>
                  {getIcon(badge.icon, isLocked ? colors.slate400 : badge.color)}
                </View>

                <Text style={[styles.badgeName, isLocked && styles.badgeNameLocked]}>
                  {badge.name}
                </Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>

                {isEarned && (
                  <View style={styles.earnedBadge}>
                    <CheckCircleIcon size={14} color={colors.success} />
                    <Text style={styles.earnedText}>{badge.earnedDate}</Text>
                  </View>
                )}

                {isInProgress && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${badge.progress ?? 0}%` as const, backgroundColor: badge.color }]} />
                    </View>
                    <Text style={styles.progressText}>{badge.progress ?? 0}%</Text>
                  </View>
                )}

                {isLocked && (
                  <Text style={styles.lockedText}>{badge.requirement}</Text>
                )}
              </View>
            );
          })}
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

  statsCard: { flexDirection: 'row', backgroundColor: colors.background, margin: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h1, color: colors.momentum, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs },
  statDivider: { width: 1, backgroundColor: colors.slate200, marginHorizontal: spacing.md },

  filterContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  filterTab: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.slate100, alignItems: 'center' },
  filterTabActive: { backgroundColor: colors.momentum },
  filterText: { ...typography.bodyBold, color: colors.slate700, fontSize: 14 },
  filterTextActive: { color: colors.background },

  content: { flex: 1, padding: spacing.md },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  
  badgeCard: { width: '47%', backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', ...shadows.md },
  badgeCardLocked: { opacity: 0.6 },
  badgeIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  badgeName: { ...typography.bodyBold, color: colors.slate900, textAlign: 'center', marginBottom: spacing.xs },
  badgeNameLocked: { color: colors.slate500 },
  badgeDescription: { ...typography.caption, color: colors.slate600, textAlign: 'center', marginBottom: spacing.sm },

  earnedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.success + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  earnedText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  progressContainer: { width: '100%' },
  progressBar: { height: 6, backgroundColor: colors.slate200, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.xs },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { ...typography.caption, color: colors.slate600, textAlign: 'center' },

  lockedText: { ...typography.caption, color: colors.slate500, textAlign: 'center', fontStyle: 'italic' },
});
