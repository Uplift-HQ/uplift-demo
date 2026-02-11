import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useViewMode } from '../../contexts/ViewContext';
import { ViewToggle } from '../../components/ViewToggle';
import { useAuthStore } from '../../store/authStore';
import { useBranding } from '../../contexts/BrandingContext';
import { JobPostingsScreen } from './JobPostingsScreen';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarIcon,
  StarIcon,
  AwardIcon,
  ChevronRightIcon,
  TargetIcon,
  TrendingUpIcon,
  ClockIcon,
  UsersIcon,
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const MyProfileView = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { branding } = useBranding();

  const profileStats = [
    { icon: StarIcon, color: colors.warning, value: '4.8', label: t('profile.rating', 'Rating') },
    { icon: ClockIcon, color: colors.info, value: '3.2y', label: t('profile.tenure', 'Tenure') },
    { icon: TargetIcon, color: colors.success, value: '94%', label: t('profile.goalsHit', 'Goals') },
    { icon: UsersIcon, color: colors.momentum, value: '12', label: t('profile.teamSize', 'Team') },
  ];

  const quickActions = [
    { id: 'schedule', label: t('profile.mySchedule', 'My Schedule'), icon: CalendarIcon, color: colors.info },
    { id: 'performance', label: t('profile.myPerformance', 'My Performance'), icon: TrendingUpIcon, color: colors.success },
    { id: 'rewards', label: t('profile.myRewards', 'My Rewards'), icon: AwardIcon, color: colors.warning },
    { id: 'settings', label: t('profile.settings', 'Settings'), icon: UserIcon, color: colors.slate600 },
  ];

  return (
    <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarInitialsLarge}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.profileRole}>{user?.role === 'manager' ? 'Manager' : user?.role}</Text>
        <Text style={styles.profileCompany}>{branding?.brandName || 'Your Company'}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {profileStats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: stat.color + '15' }]}>
              <stat.icon size={20} color={stat.color} />
            </View>
            <Text style={styles.statCardValue}>{stat.value}</Text>
            <Text style={styles.statCardLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Contact Info */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>{t('profile.contactInfo', 'Contact Information')}</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MailIcon size={18} color={colors.slate500} />
            <Text style={styles.infoText}>{user?.email || 'email@company.com'}</Text>
          </View>
          <View style={styles.infoRow}>
            <PhoneIcon size={18} color={colors.slate500} />
            <Text style={styles.infoText}>{(user as any)?.phone || '+44 7700 900000'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPinIcon size={18} color={colors.slate500} />
            <Text style={styles.infoText}>{(user as any)?.location || 'London, UK'}</Text>
          </View>
          <View style={styles.infoRow}>
            <BriefcaseIcon size={18} color={colors.slate500} />
            <Text style={styles.infoText}>{(user as any)?.department || 'Operations'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>{t('profile.quickActions', 'Quick Actions')}</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => {
                if (action.id === 'schedule') navigation.navigate('Schedule');
                else if (action.id === 'performance') navigation.navigate('Profile', { screen: 'MyPerformance' });
                else if (action.id === 'rewards') navigation.navigate('MyRewards');
                else navigation.navigate('Profile');
              }}
            >
              <View style={[styles.actionIconBg, { backgroundColor: action.color + '15' }]}>
                <action.icon size={22} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <ChevronRightIcon size={16} color={colors.slate400} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

export const ManagerTeamScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { isPersonalView } = useViewMode();

  return (
    <View style={styles.container}>
      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <ViewToggle />
      </View>

      {/* Header - changes based on view */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isPersonalView ? t('navigation.myProfile', 'My Profile') : t('navigation.team', 'Team')}
        </Text>
      </View>

      {/* Conditional content */}
      {isPersonalView ? (
        <MyProfileView navigation={navigation} />
      ) : (
        <JobPostingsScreen navigation={navigation} hideHeader />
      )}
    </View>
  );
};

// Modify JobPostingsScreen to accept hideHeader prop
export { JobPostingsScreen };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  toggleContainer: { paddingTop: 60, paddingBottom: 8, alignItems: 'center', backgroundColor: colors.background },
  header: { backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, ...shadows.sm },
  title: { ...typography.h2, color: colors.slate900 },

  // Profile View Styles
  profileContent: { flex: 1 },
  profileHeader: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.background },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.slate900, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarInitialsLarge: { ...typography.h1, color: colors.background, fontSize: 36, fontWeight: '800' },
  profileName: { ...typography.h2, color: colors.slate900, marginBottom: spacing.xs },
  profileRole: { ...typography.bodyBold, color: colors.momentum, marginBottom: spacing.xs },
  profileCompany: { ...typography.body, color: colors.slate600 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', ...shadows.sm },
  statIconBg: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statCardValue: { ...typography.h3, color: colors.slate900, fontSize: 18 },
  statCardLabel: { ...typography.caption, color: colors.slate500, marginTop: 2 },

  // Info Section
  infoSection: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionTitle: { ...typography.bodyBold, color: colors.slate700, marginBottom: spacing.sm },
  infoCard: { backgroundColor: colors.background, borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  infoText: { ...typography.body, color: colors.slate700, flex: 1 },

  // Actions Section
  actionsSection: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  actionsGrid: { gap: spacing.sm },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.sm },
  actionIconBg: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginEnd: spacing.md },
  actionLabel: { ...typography.bodyBold, color: colors.slate900, flex: 1 },
});
