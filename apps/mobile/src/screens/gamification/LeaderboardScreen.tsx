import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUpIcon, StarIcon, AwardIcon, ZapIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useLeaderboard } from '../../hooks/useData';

type LeaderboardFilter = 'weekly' | 'monthly' | 'alltime';

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  role: string;
  initials: string;
  points: number;
  change: number;
  isCurrentUser: boolean;
}

export const LeaderboardScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<LeaderboardFilter>('weekly');

  // Map filter to API period param
  const apiPeriod = filter === 'weekly' ? 'week' : filter === 'monthly' ? 'month' : 'all';
  const { data: leaderboardApiData, loading: leaderboardLoading } = useLeaderboard(apiPeriod as any);

  // Map API data to local format
  const leaderboard: LeaderboardEntry[] = (leaderboardApiData?.leaderboard ?? []).map((entry: any, idx: number) => ({
    id: entry.id ?? String(idx + 1),
    rank: entry.rank ?? idx + 1,
    name: entry.name ?? 'Unknown',
    role: entry.role ?? '',
    initials: entry.initials ?? (entry.name ? entry.name.split(' ').map((w: string) => w[0]).join('') : '??'),
    points: entry.points ?? 0,
    change: entry.change ?? 0,
    isCurrentUser: entry.isCurrentUser ?? false,
  }));
  const currentUserRank = leaderboard.find(e => e.isCurrentUser)?.rank || 0;
  const nextRank = currentUserRank > 1 ? leaderboard[currentUserRank - 2] : null;
  const pointsToNext = nextRank ? nextRank.points - (leaderboard.find(e => e.isCurrentUser)?.points || 0) : 0;

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { bg: colors.warning, text: colors.warning };
    if (rank === 2) return { bg: colors.slate400, text: colors.slate400 };
    if (rank === 3) return { bg: '#CD7F32', text: '#CD7F32' };
    return { bg: colors.slate200, text: colors.slate600 };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('gamification.leaderboard')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {(['weekly', 'monthly', 'alltime'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'alltime' ? t('gamification.allTime') : t(`gamification.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading */}
      {leaderboardLoading && (
        <ActivityIndicator size="large" color={colors.momentum} style={{ marginTop: spacing.lg }} />
      )}

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 ? (
        <View style={styles.podium}>
          {/* 2nd Place */}
          <View style={styles.podiumItem}>
            <View style={[styles.podiumAvatar, styles.podiumAvatarSecond]}>
              <Text style={styles.podiumInitials}>{leaderboard[1].initials}</Text>
            </View>
            <Text style={styles.podiumName}>{leaderboard[1].name.split(' ')[0]}</Text>
            <Text style={styles.podiumPoints}>{leaderboard[1].points.toLocaleString()}</Text>
            <View style={[styles.podiumRank, { backgroundColor: colors.slate400 }]}>
              <Text style={styles.podiumRankText}>2</Text>
            </View>
          </View>

          {/* 1st Place */}
          <View style={[styles.podiumItem, styles.podiumFirst]}>
            <AwardIcon size={32} color={colors.warning} />
            <View style={[styles.podiumAvatar, styles.podiumAvatarFirst]}>
              <Text style={styles.podiumInitials}>{leaderboard[0].initials}</Text>
            </View>
            <Text style={styles.podiumName}>{leaderboard[0].name.split(' ')[0]}</Text>
            <Text style={styles.podiumPoints}>{leaderboard[0].points.toLocaleString()}</Text>
            <View style={[styles.podiumRank, { backgroundColor: colors.warning }]}>
              <Text style={styles.podiumRankText}>1</Text>
            </View>
          </View>

          {/* 3rd Place */}
          <View style={styles.podiumItem}>
            <View style={[styles.podiumAvatar, styles.podiumAvatarThird]}>
              <Text style={styles.podiumInitials}>{leaderboard[2].initials}</Text>
            </View>
            <Text style={styles.podiumName}>{leaderboard[2].name.split(' ')[0]}</Text>
            <Text style={styles.podiumPoints}>{leaderboard[2].points.toLocaleString()}</Text>
            <View style={[styles.podiumRank, { backgroundColor: '#CD7F32' }]}>
              <Text style={styles.podiumRankText}>3</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ ...typography.body, color: colors.slate500 }}>
            {leaderboardLoading ? '' : 'No leaderboard data available'}
          </Text>
        </View>
      )}

      {/* Full Leaderboard */}
      <ScrollView style={styles.content}>
        {leaderboard.slice(3).map((entry) => (
          <View 
            key={entry.id} 
            style={[
              styles.entryCard,
              entry.isCurrentUser && styles.entryCardHighlight
            ]}
          >
            <View style={[
              styles.rankBadge,
              { backgroundColor: entry.isCurrentUser ? colors.momentum : colors.slate100 }
            ]}>
              <Text style={[
                styles.rankText,
                { color: entry.isCurrentUser ? colors.background : colors.slate700 }
              ]}>
                {entry.rank}
              </Text>
            </View>

            <View style={styles.entryAvatar}>
              <Text style={styles.entryInitials}>{entry.initials}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.entryName}>{entry.name}</Text>
              <Text style={styles.entryRole}>{entry.role}</Text>
            </View>

            <View style={styles.entryStats}>
              <View style={styles.pointsContainer}>
                <StarIcon size={14} color={colors.momentum} />
                <Text style={styles.entryPoints}>{entry.points.toLocaleString()}</Text>
              </View>
              <View style={[
                styles.changeBadge,
                { backgroundColor: entry.change > 0 ? colors.success + '20' : entry.change < 0 ? colors.error + '20' : colors.slate100 }
              ]}>
                <Text style={[
                  styles.changeText,
                  { color: entry.change > 0 ? colors.success : entry.change < 0 ? colors.error : colors.slate600 }
                ]}>
                  {entry.change > 0 ? `↑${entry.change}` : entry.change < 0 ? `↓${Math.abs(entry.change)}` : '-'}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Motivation Card */}
        <View style={styles.motivationCard}>
          <ZapIcon size={24} color={colors.momentum} />
          <View style={{ flex: 1 }}>
            <Text style={styles.motivationTitle}>{t('gamification.keepClimbing')}</Text>
            <Text style={styles.motivationText}>{t('gamification.pointsFromRank', { points: pointsToNext, rank: currentUserRank - 1 })}</Text>
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
  
  filterContainer: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.background, gap: spacing.sm },
  filterTab: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.slate100, alignItems: 'center' },
  filterTabActive: { backgroundColor: colors.momentum },
  filterText: { ...typography.bodyBold, color: colors.slate700 },
  filterTextActive: { color: colors.background },
  
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', padding: spacing.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  podiumItem: { alignItems: 'center', marginHorizontal: spacing.md },
  podiumFirst: { marginBottom: spacing.md },
  podiumAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  podiumAvatarFirst: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.warning },
  podiumAvatarSecond: { backgroundColor: colors.slate400 },
  podiumAvatarThird: { backgroundColor: '#CD7F32' },
  podiumInitials: { ...typography.h3, color: colors.background },
  podiumName: { ...typography.bodyBold, color: colors.slate900, fontSize: 13 },
  podiumPoints: { ...typography.caption, color: colors.slate600 },
  podiumRank: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  podiumRankText: { ...typography.bodyBold, color: colors.background, fontSize: 12 },
  
  content: { flex: 1, padding: spacing.md },
  
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, ...shadows.sm },
  entryCardHighlight: { borderWidth: 2, borderColor: colors.momentum, backgroundColor: colors.momentum + '10' },
  rankBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rankText: { ...typography.bodyBold, fontSize: 14 },
  entryAvatar: { width: 44, height: 44, backgroundColor: colors.momentum, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  entryInitials: { ...typography.bodyBold, color: colors.background, fontSize: 14 },
  entryName: { ...typography.bodyBold, color: colors.slate900 },
  entryRole: { ...typography.caption, color: colors.slate600 },
  entryStats: { alignItems: 'flex-end' },
  pointsContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  entryPoints: { ...typography.bodyBold, color: colors.slate900 },
  changeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginTop: spacing.xs },
  changeText: { ...typography.caption, fontWeight: '700' },
  
  motivationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.momentum + '15', padding: spacing.lg, borderRadius: borderRadius.lg, marginTop: spacing.md },
  motivationTitle: { ...typography.bodyBold, color: colors.momentum },
  motivationText: { ...typography.body, color: colors.slate700 },
});
