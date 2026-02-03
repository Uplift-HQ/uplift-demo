import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  TrendingUpIcon, ClockIcon, CheckSquareIcon, BriefcaseIcon, StarIcon,
  AwardIcon, ZapIcon, CalendarIcon, ChevronRightIcon, MapPinIcon,
  HeartIcon, BellIcon, MessageCircleIcon, AlertCircleIcon,
  UsersIcon, ShieldIcon, GiftIcon, ThumbsUpIcon, PlayIcon
} from '../components/Icons';
import { useAuthStore } from '../store/authStore';
import { useDashboard, useGamificationStats, useCareerOpportunities } from '../hooks/useData';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { showAlert } from '../utils/alert';

// Real-time team data (simulated)
const useRealtimeTeam = () => {
  const [data] = useState({
    onShiftNow: 12,
    onBreak: 3,
    openShifts: 5,
  });
  return data;
};

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const realtimeTeam = useRealtimeTeam();

  const { data: dashboard, loading: dashboardLoading } = useDashboard();
  const { data: gamification, loading: gamificationLoading } = useGamificationStats();
  const { data: opportunitiesData } = useCareerOpportunities();

  // Pulse animation for live indicator
  const pulseAnim = new Animated.Value(1);
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Use API data with fallbacks from user object
  const level = gamification?.level ?? (user as any)?.level ?? 12;
  const currentXP = gamification?.currentXP ?? (user as any)?.xp ?? 2450;
  const nextLevelXP = gamification?.nextLevelXP ?? 3000;
  const streak = gamification?.streak ?? 7;
  const badges = gamification?.badges?.length ?? 6;
  const rank = gamification?.rank ?? 3;
  const momentumScore = (user as any)?.momentumScore ?? 87;
  const unreadMessages = (user as any)?.unreadMessages ?? 3;

  const todayShift = dashboard?.nextShift;
  const topOpportunity = opportunitiesData?.opportunities?.[0];
  const isLoading = dashboardLoading || gamificationLoading;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning');
    if (hour < 18) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  const formatShiftTime = (time: string) => {
    if (!time) return '';
    const [hours, mins] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'pm' : 'am';
    const hour12 = h % 12 || 12;
    return `${hour12}:${mins}${ampm}`;
  };

  const complianceAlerts = [
    { id: '1', type: 'expiring', title: 'Food Safety Certificate', daysLeft: 5, severity: 'warning' as const },
  ];

  const recentRecognitions = [
    { id: '1', from: 'Sarah M.', to: 'You', message: 'Great job closing last night!', emoji: '🌟', time: '2h ago' },
    { id: '2', from: 'Manager', to: 'Team', message: 'Record sales this week!', emoji: '🎉', time: '5h ago' },
  ];

  const aiRecommendedShifts = [
    { id: '1', date: 'Tomorrow', time: '2pm-10pm', location: 'Edinburgh Centre', matchScore: 95, bonus: '+£5/hr' },
    { id: '2', date: 'Sat 25th', time: '8am-4pm', location: 'Glasgow West', matchScore: 88, bonus: null },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Company Branding */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.companyBranding}>
            <View style={styles.companyLogoContainer}>
              {(user as any)?.companyLogo ? (
                <Image source={{ uri: (user as any).companyLogo }} style={styles.companyLogo} />
              ) : (
                <View style={styles.companyLogoPlaceholder}>
                  <Text style={styles.companyLogoText}>
                    {((user as any)?.companyName || 'C')?.[0]}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user?.firstName || t('home.teamMember')}</Text>
              <Text style={styles.companyName}>{(user as any)?.companyName || t('home.yourCompany')}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <MessageCircleIcon size={22} color={colors.slate700} />
              {unreadMessages > 0 && (
                <View style={styles.messageBadge}>
                  <Text style={styles.messageBadgeText}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Feed', { screen: 'Notifications' })}
            >
              <BellIcon size={22} color={colors.slate700} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Momentum Score Card */}
        <TouchableOpacity
          style={styles.momentumCard}
          onPress={() => navigation.navigate('Career')}
        >
          <View style={styles.momentumLeft}>
            <View style={styles.momentumScoreRing}>
              <Text style={styles.momentumScoreValue}>{momentumScore}</Text>
            </View>
            <View style={styles.momentumInfo}>
              <Text style={styles.momentumLabel}>{t('home.momentumScore')}</Text>
              <Text style={styles.momentumSubtext}>{t('home.level', { level })} • {currentXP.toLocaleString()} XP</Text>
            </View>
          </View>
          <View style={styles.momentumRight}>
            <View style={styles.levelProgressBar}>
              <View style={[styles.levelProgressFill, { width: `${Math.min((currentXP / nextLevelXP) * 100, 100)}%` }]} />
            </View>
            <Text style={styles.levelProgressText}>{t('home.xpToNext', { xp: (nextLevelXP - currentXP).toLocaleString() })}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Real-time Live Bar */}
      <View style={styles.realtimeBar}>
        <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={styles.liveText}>{t('home.live')}</Text>
        <View style={styles.realtimeStats}>
          <View style={styles.realtimeStat}>
            <UsersIcon size={14} color={colors.white} />
            <Text style={styles.realtimeValue}>{realtimeTeam.onShiftNow}</Text>
            <Text style={styles.realtimeLabel}>{t('home.onShift')}</Text>
          </View>
          <View style={styles.realtimeDivider} />
          <View style={styles.realtimeStat}>
            <ClockIcon size={14} color={colors.white} />
            <Text style={styles.realtimeValue}>{realtimeTeam.onBreak}</Text>
            <Text style={styles.realtimeLabel}>{t('home.onBreak')}</Text>
          </View>
          <View style={styles.realtimeDivider} />
          <View style={styles.realtimeStat}>
            <BriefcaseIcon size={14} color={colors.white} />
            <Text style={styles.realtimeValue}>{realtimeTeam.openShifts}</Text>
            <Text style={styles.realtimeLabel}>{t('home.open')}</Text>
          </View>
        </View>
      </View>

      {/* Compliance Alerts */}
      {complianceAlerts.length > 0 && (
        <View style={styles.alertsSection}>
          {complianceAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[styles.alertCard, { borderStartColor: alert.severity === 'warning' ? colors.warning : colors.info }]}
              onPress={() => navigation.navigate('Profile', { screen: 'Compliance' })}
            >
              <View style={[styles.alertIcon, { backgroundColor: alert.severity === 'warning' ? colors.warning + '20' : colors.info + '20' }]}>
                <ShieldIcon size={18} color={alert.severity === 'warning' ? colors.warning : colors.info} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertSubtitle}>{t('home.expiresInDays', { days: alert.daysLeft })}</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.slate400} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Today's Shift */}
      <View style={styles.todaySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.todayShift')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.momentum} />
          </View>
        ) : todayShift ? (
          <View style={styles.todayShiftCard}>
            <View style={styles.todayShiftContent}>
              <View style={styles.todayShiftHeader}>
                <View style={styles.shiftStatus}>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.statusText}>{todayShift.status || t('schedule.confirmed')}</Text>
                </View>
                <View style={styles.shiftDuration}>
                  <ClockIcon size={14} color={colors.slate500} />
                  <Text style={styles.durationText}>
                    {(() => {
                      try {
                        const start = parseInt(todayShift.startTime?.split(':')[0] || '9');
                        const end = parseInt(todayShift.endTime?.split(':')[0] || '17');
                        return `${end - start}h`;
                      } catch { return '8h'; }
                    })()}
                  </Text>
                </View>
              </View>
              <Text style={styles.todayShiftRole}>{todayShift.roleName || t('schedule.shift')}</Text>
              <View style={styles.todayShiftDetails}>
                <View style={styles.todayShiftDetail}>
                  <ClockIcon size={16} color={colors.slate500} />
                  <Text style={styles.todayShiftDetailText}>
                    {formatShiftTime(todayShift.startTime)} - {formatShiftTime(todayShift.endTime)}
                  </Text>
                </View>
                <View style={styles.todayShiftDetail}>
                  <MapPinIcon size={16} color={colors.slate500} />
                  <Text style={styles.todayShiftDetailText}>{todayShift.locationName || t('home.locationTBC')}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.todayClockInButton}
              onPress={() => navigation.navigate('Schedule', { screen: 'ClockInOut' })}
            >
              <ClockIcon size={22} color={colors.background} />
              <Text style={styles.todayClockInText}>{t('home.clockIn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noShiftCard}>
            <CalendarIcon size={32} color={colors.slate300} />
            <View style={styles.noShiftContent}>
              <Text style={styles.noShiftTitle}>{t('home.noShiftToday')}</Text>
              <Text style={styles.noShiftSubtitle}>{t('home.checkMarketplace')}</Text>
            </View>
            <TouchableOpacity
              style={styles.findShiftButton}
              onPress={() => navigation.navigate('Schedule', { screen: 'ShiftMarketplace' })}
            >
              <Text style={styles.findShiftText}>{t('home.findShifts')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions - NO duplicate clock in */}
      <View style={styles.quickActions}>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Schedule')}>
            <View style={[styles.quickActionIconBg, { backgroundColor: colors.info + '15' }]}>
              <CalendarIcon size={24} color={colors.info} />
            </View>
            <Text style={styles.quickActionLabel}>{t('schedule.title')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Tasks')}>
            <View style={[styles.quickActionIconBg, { backgroundColor: colors.success + '15' }]}>
              <CheckSquareIcon size={24} color={colors.success} />
            </View>
            <Text style={styles.quickActionLabel}>{t('tasks.title')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Schedule', { screen: 'ShiftMarketplace' })}>
            <View style={[styles.quickActionIconBg, { backgroundColor: colors.momentum + '15' }]}>
              <BriefcaseIcon size={24} color={colors.momentum} />
            </View>
            <Text style={styles.quickActionLabel}>{t('schedule.openShifts')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Feed')}>
            <View style={[styles.quickActionIconBg, { backgroundColor: colors.error + '15' }]}>
              <HeartIcon size={24} color={colors.error} />
            </View>
            <Text style={styles.quickActionLabel}>{t('feed.title')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Recommendations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <ZapIcon size={18} color={colors.momentum} />
            <Text style={styles.sectionTitle}>{t('home.recommendedForYou')}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Schedule', { screen: 'ShiftMarketplace' })}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedScroll}>
          {aiRecommendedShifts.map((shift) => (
            <TouchableOpacity
              key={shift.id}
              style={styles.recommendedCard}
              onPress={() => navigation.navigate('Schedule', { screen: 'ShiftMarketplace' })}
            >
              <View style={styles.recommendedHeader}>
                <View style={styles.matchScoreBadge}>
                  <TrendingUpIcon size={12} color={colors.success} />
                  <Text style={styles.matchScoreText}>{shift.matchScore}%</Text>
                </View>
                {shift.bonus && (
                  <View style={styles.bonusBadge}>
                    <Text style={styles.bonusText}>{shift.bonus}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.recommendedDate}>{shift.date}</Text>
              <Text style={styles.recommendedTime}>{shift.time}</Text>
              <View style={styles.recommendedLocation}>
                <MapPinIcon size={14} color={colors.slate500} />
                <Text style={styles.recommendedLocationText}>{shift.location}</Text>
              </View>
              <TouchableOpacity style={styles.claimButton} onPress={() => showAlert('Shift Claimed!', "You've been added to this shift.")}>
                <Text style={styles.claimButtonText}>{t('home.claimShift')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Career')}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '20' }]}>
            <ZapIcon size={20} color={colors.warning} />
          </View>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>{t('gamification.dayStreak')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Career')}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.info + '20' }]}>
            <AwardIcon size={20} color={colors.info} />
          </View>
          <Text style={styles.statValue}>{badges}</Text>
          <Text style={styles.statLabel}>{t('gamification.badges')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Career')}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
            <TrendingUpIcon size={20} color={colors.success} />
          </View>
          <Text style={styles.statValue}>#{rank || '-'}</Text>
          <Text style={styles.statLabel}>{t('gamification.rankLabel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Tasks')}>
          <View style={[styles.statIconContainer, { backgroundColor: colors.momentum + '20' }]}>
            <CheckSquareIcon size={20} color={colors.momentum} />
          </View>
          <Text style={styles.statValue}>{dashboard?.pendingTasks ?? 5}</Text>
          <Text style={styles.statLabel}>{t('tasks.pending')}</Text>
        </TouchableOpacity>
      </View>

      {/* Recognition Feed */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <HeartIcon size={18} color={colors.error} />
            <Text style={styles.sectionTitle}>{t('home.recognition')}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recognitionList}>
          {recentRecognitions.map((rec) => (
            <TouchableOpacity key={rec.id} style={styles.recognitionCard} onPress={() => navigation.navigate('Feed')}>
              <Text style={styles.recognitionEmoji}>{rec.emoji}</Text>
              <View style={styles.recognitionContent}>
                <Text style={styles.recognitionMessage}>{rec.message}</Text>
                <Text style={styles.recognitionMeta}>{rec.from} {rec.to === 'You' ? '→ You' : `→ ${rec.to}`} • {rec.time}</Text>
              </View>
              <TouchableOpacity style={styles.likeButton} onPress={() => showAlert('Liked!', 'Your reaction has been recorded.')}>
                <ThumbsUpIcon size={16} color={colors.slate400} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.giveRecognitionButton} onPress={() => navigation.navigate('Feed', { screen: 'CreatePost' })}>
          <GiftIcon size={18} color={colors.momentum} />
          <Text style={styles.giveRecognitionText}>{t('home.giveRecognition')}</Text>
        </TouchableOpacity>
      </View>

      {/* Open Opportunities */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.openOpportunities')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Career')}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {topOpportunity ? (
          <TouchableOpacity style={styles.opportunityCard} onPress={() => navigation.navigate('Career')}>
            <View style={styles.opportunityHeader}>
              <View style={styles.opportunityIcon}>
                <BriefcaseIcon size={24} color={colors.momentum} />
              </View>
              {topOpportunity.matchScore && (
                <View style={styles.matchBadge}>
                  <TrendingUpIcon size={12} color={colors.success} />
                  <Text style={styles.matchText}>{topOpportunity.matchScore}% match</Text>
                </View>
              )}
            </View>
            <Text style={styles.opportunityTitle}>{topOpportunity.title}</Text>
            <Text style={styles.opportunityMeta}>{topOpportunity.departmentName} • {topOpportunity.employmentType?.replace('_', '-')}</Text>
            {topOpportunity.hourlyRateMax && (
              <View style={styles.opportunityRate}>
                <Text style={styles.rateValue}>£{topOpportunity.hourlyRateMax.toFixed(2)}</Text>
                <Text style={styles.rateLabel}>/{t('common.hour')}</Text>
              </View>
            )}
            <View style={styles.opportunityFooter}>
              <Text style={styles.applyText}>{t('career.viewDetails')}</Text>
              <ChevronRightIcon size={16} color={colors.momentum} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <BriefcaseIcon size={40} color={colors.slate300} />
            <Text style={styles.emptyTitle}>{t('home.noOpportunities')}</Text>
          </View>
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: { backgroundColor: colors.background, paddingTop: 60, paddingBottom: spacing.lg, ...shadows.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  companyBranding: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  companyLogoContainer: { width: 52, height: 52, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.slate100 },
  companyLogo: { width: '100%', height: '100%', resizeMode: 'cover' },
  companyLogoPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.momentum, alignItems: 'center', justifyContent: 'center' },
  companyLogoText: { ...typography.h2, color: colors.background, fontWeight: '800' },
  greetingContainer: { flex: 1 },
  greetingText: { ...typography.caption, color: colors.slate500 },
  userName: { ...typography.h2, color: colors.slate900, marginTop: 2 },
  companyName: { ...typography.caption, color: colors.momentum, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerButton: { width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  messageBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.momentum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.background },
  messageBadgeText: { ...typography.caption, color: colors.background, fontWeight: '800', fontSize: 10 },
  notificationDot: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.slate100 },

  // Momentum Card
  momentumCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.slate900, marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.lg },
  momentumLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 0 },
  momentumScoreRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.momentum, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.momentum + '40', flexShrink: 0 },
  momentumScoreValue: { color: colors.background, fontWeight: '800', fontSize: 24, textAlign: 'center' },
  momentumInfo: { flexShrink: 0 },
  momentumLabel: { ...typography.caption, color: colors.background, fontWeight: '600' },
  momentumSubtext: { ...typography.caption, color: colors.slate400, marginTop: 2 },
  momentumRight: { flex: 1, marginStart: spacing.lg },
  levelProgressBar: { height: 6, backgroundColor: colors.slate700, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.xs },
  levelProgressFill: { height: '100%', backgroundColor: colors.momentum, borderRadius: 3 },
  levelProgressText: { ...typography.small, color: colors.slate500 },

  // Real-time Bar
  realtimeBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate800, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: borderRadius.lg },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, flexShrink: 0 },
  liveText: { ...typography.caption, color: colors.success, fontWeight: '800', letterSpacing: 1, marginStart: spacing.xs, marginEnd: spacing.md, flexShrink: 0 },
  realtimeStats: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  realtimeStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  realtimeValue: { ...typography.bodyBold, color: colors.white, fontSize: 14 },
  realtimeLabel: { ...typography.small, color: colors.slate400 },
  realtimeDivider: { width: 1, height: 16, backgroundColor: colors.slate700 },

  // Alerts
  alertsSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, borderStartWidth: 4, ...shadows.sm },
  alertIcon: { width: 40, height: 40, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginEnd: spacing.md },
  alertContent: { flex: 1 },
  alertTitle: { ...typography.bodyBold, color: colors.slate900, fontSize: 14 },
  alertSubtitle: { ...typography.caption, color: colors.slate500, marginTop: 2 },

  // Today's Shift
  todaySection: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  todayShiftCard: { backgroundColor: colors.background, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.lg },
  todayShiftContent: { padding: spacing.lg },
  todayShiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  todayShiftRole: { ...typography.h2, color: colors.slate900, marginBottom: spacing.md, fontSize: 20 },
  todayShiftDetails: { gap: spacing.sm },
  todayShiftDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  todayShiftDetailText: { ...typography.body, color: colors.slate600 },
  todayClockInButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.momentum, paddingVertical: spacing.lg },
  todayClockInText: { ...typography.bodyBold, color: colors.background, fontSize: 16 },
  noShiftCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.sm },
  noShiftContent: { flex: 1 },
  noShiftTitle: { ...typography.bodyBold, color: colors.slate700 },
  noShiftSubtitle: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  findShiftButton: { backgroundColor: colors.momentum, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
  findShiftText: { ...typography.caption, color: colors.background, fontWeight: '600' },

  // Quick Actions
  quickActions: { padding: spacing.lg },
  quickActionsGrid: { flexDirection: 'row', gap: spacing.md },
  quickActionCard: { flex: 1, backgroundColor: colors.background, paddingVertical: spacing.lg, borderRadius: borderRadius.xl, alignItems: 'center', ...shadows.sm },
  quickActionIconBg: { width: 52, height: 52, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  quickActionLabel: { ...typography.small, color: colors.slate700, fontWeight: '600' },

  // Recommended
  recommendedScroll: { paddingStart: spacing.lg },
  recommendedCard: { width: 180, backgroundColor: colors.background, marginEnd: spacing.md, padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.md },
  recommendedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  matchScoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '15', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  matchScoreText: { ...typography.small, color: colors.success, fontWeight: '700' },
  bonusBadge: { backgroundColor: colors.momentum, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  bonusText: { ...typography.caption, color: colors.white, fontWeight: '700', fontSize: 10 },
  recommendedDate: { ...typography.caption, color: colors.slate500, fontSize: 12 },
  recommendedTime: { ...typography.body, color: colors.slate900, marginBottom: spacing.sm },
  recommendedLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  recommendedLocationText: { ...typography.small, color: colors.slate500 },
  claimButton: { backgroundColor: colors.momentum, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, alignItems: 'center' },
  claimButtonText: { ...typography.bodyBold, color: colors.background, fontSize: 12 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.lg },
  statCard: { width: '47%', backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.sm },
  statIconContainer: { width: 44, height: 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  statValue: { ...typography.h2, color: colors.slate900, fontWeight: '800', marginBottom: 2 },
  statLabel: { ...typography.caption, color: colors.slate500 },

  // Recognition
  recognitionList: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  recognitionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.xl, ...shadows.sm },
  recognitionEmoji: { fontSize: 28, marginEnd: spacing.md },
  recognitionContent: { flex: 1 },
  recognitionMessage: { ...typography.bodyBold, color: colors.slate900, fontSize: 14 },
  recognitionMeta: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  likeButton: { padding: spacing.sm },
  giveRecognitionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.momentum + '10', borderRadius: borderRadius.xl, borderWidth: 1.5, borderColor: colors.momentum + '30', borderStyle: 'dashed' },
  giveRecognitionText: { ...typography.bodyBold, color: colors.momentum, fontSize: 14 },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.slate900 },
  seeAll: { ...typography.caption, color: colors.momentum, fontWeight: '600' },

  // Shift Status
  shiftStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.caption, color: colors.slate600, fontWeight: '600', textTransform: 'capitalize' },
  shiftDuration: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  durationText: { ...typography.caption, color: colors.slate700, fontWeight: '700' },

  // Opportunity
  opportunityCard: { backgroundColor: colors.background, marginHorizontal: spacing.lg, borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.md },
  opportunityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  opportunityIcon: { width: 52, height: 52, backgroundColor: colors.momentum + '15', borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.success + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  matchText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  opportunityTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.xs, fontSize: 18 },
  opportunityMeta: { ...typography.body, color: colors.slate600, marginBottom: spacing.md },
  opportunityRate: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md },
  rateValue: { ...typography.h2, color: colors.momentum, fontWeight: '800' },
  rateLabel: { ...typography.body, color: colors.slate500, marginStart: spacing.xs },
  opportunityFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate100 },
  applyText: { ...typography.bodyBold, color: colors.momentum },

  // Empty States
  loadingCard: { backgroundColor: colors.background, marginHorizontal: spacing.lg, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', ...shadows.sm },
  emptyCard: { backgroundColor: colors.background, marginHorizontal: spacing.lg, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', ...shadows.sm },
  emptyTitle: { ...typography.body, color: colors.slate500, marginTop: spacing.md, textAlign: 'center' },
});
