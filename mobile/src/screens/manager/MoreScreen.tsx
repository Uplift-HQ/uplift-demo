import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import {
  HeartIcon, UserIcon, HelpCircleIcon, LogOutIcon,
  ChevronRightIcon, MessageCircleIcon, BellIcon, FileTextIcon,
  ShieldIcon, LinkIcon, CreditCardIcon, CalendarIcon, CheckSquareIcon,
  TargetIcon, GiftIcon, BarChartIcon, BriefcaseIcon, ClockIcon, ClipboardCheckIcon
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { useTranslation } from 'react-i18next';

export const ManagerMoreScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const unreadMessages = (user as any)?.unreadMessages ?? 7;

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout }
    ]);
  };

  const menuSections = [
    {
      title: 'My Work',
      items: [
        {
          id: 'my-schedule',
          label: 'My Schedule',
          subtitle: 'View your shifts',
          icon: CalendarIcon,
          color: colors.info,
          onPress: () => navigation.navigate('Schedule', { screen: 'MyScheduleView' }),
        },
        {
          id: 'clock',
          label: 'Clock In/Out',
          subtitle: 'Time tracking',
          icon: ClockIcon,
          color: colors.momentum,
          onPress: () => navigation.navigate('Schedule', { screen: 'ClockInOut' }),
        },
        {
          id: 'my-tasks',
          label: 'My Tasks',
          subtitle: 'Personal to-dos',
          icon: CheckSquareIcon,
          color: colors.success,
          onPress: () => navigation.navigate('MyTasks'),
        },
      ]
    },
    {
      title: 'Growth & Rewards',
      items: [
        {
          id: 'my-career',
          label: 'My Career',
          subtitle: 'Skills & progression',
          icon: TargetIcon,
          color: colors.momentum,
          onPress: () => navigation.navigate('MyCareer'),
        },
        {
          id: 'my-rewards',
          label: 'My Rewards',
          subtitle: 'Points & perks',
          icon: GiftIcon,
          color: colors.warning,
          onPress: () => navigation.navigate('MyRewards'),
        },
      ]
    },
    {
      title: 'Social',
      items: [
        {
          id: 'feed',
          label: 'Feed',
          subtitle: 'Team updates & recognition',
          icon: HeartIcon,
          color: colors.error,
          onPress: () => navigation.navigate('MyFeed'),
        },
        {
          id: 'chat',
          label: 'Messages',
          subtitle: unreadMessages > 0 ? `${unreadMessages} unread` : 'Team chat',
          icon: MessageCircleIcon,
          color: colors.info,
          badge: unreadMessages,
          onPress: () => navigation.navigate('Chat'),
        },
      ]
    },
    {
      title: 'Admin',
      items: [
        {
          id: 'approvals',
          label: 'Approvals',
          subtitle: 'Pending requests',
          icon: ClipboardCheckIcon,
          color: colors.warning,
          badge: 8,
          onPress: () => navigation.navigate('Approvals'),
        },
        {
          id: 'reports',
          label: 'Reports',
          subtitle: 'Analytics & insights',
          icon: BarChartIcon,
          color: colors.slate600,
          onPress: () => navigation.navigate('Reports'),
        },
        {
          id: 'job-postings',
          label: 'Job Postings',
          subtitle: 'Manage openings',
          icon: BriefcaseIcon,
          color: colors.momentum,
          onPress: () => navigation.navigate('JobPostings'),
        },
      ]
    },
    {
      title: 'HR Management',
      items: [
        {
          id: 'team-performance',
          label: 'Team Performance',
          subtitle: 'Reviews & goals',
          icon: TargetIcon,
          color: colors.momentum,
          onPress: () => navigation.navigate('TeamPerformance'),
        },
        {
          id: 'offboarding',
          label: 'Offboarding',
          subtitle: 'Employee departures',
          icon: UserIcon,
          color: colors.error,
          onPress: () => navigation.navigate('Offboarding'),
        },
      ]
    },
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          label: 'Profile',
          subtitle: 'Personal information',
          icon: UserIcon,
          color: colors.momentum,
          onPress: () => navigation.navigate('Profile'),
        },
        {
          id: 'help',
          label: 'Help & Support',
          subtitle: 'FAQs & contact us',
          icon: HelpCircleIcon,
          color: colors.slate500,
          onPress: () => navigation.navigate('Profile', { screen: 'Help' }),
        },
      ]
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.avatarInitials}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userRole}>Manager • {(user as any)?.companyName || 'Grand Metro Hotels'}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuGroup}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index === section.items.length - 1 && styles.menuItemLast
                  ]}
                  onPress={item.onPress}
                >
                  <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
                    <item.icon size={20} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  ) : (
                    <ChevronRightIcon size={18} color={colors.slate400} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOutIcon size={20} color={colors.error} />
          <Text style={styles.logoutText}>{t('screens.managerMore.sign_out')}</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>{t('screens.managerMore.uplift_manager_v100')}</Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  header: {
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.sm
  },
  title: { ...typography.h1, color: colors.slate900, fontSize: 28 },

  content: { flex: 1 },

  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  avatarInitials: { ...typography.h2, color: colors.background, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { ...typography.h3, color: colors.slate900, fontSize: 18 },
  userRole: { ...typography.caption, color: colors.momentum, fontWeight: '600', marginTop: 2 },

  // Sections
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm
  },
  menuGroup: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  menuContent: { flex: 1 },
  menuLabel: { ...typography.bodyBold, color: colors.slate900, fontSize: 15 },
  menuSubtitle: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.momentum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: { ...typography.caption, color: colors.background, fontWeight: '800', fontSize: 11 },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.xl,
  },
  logoutText: { ...typography.bodyBold, color: colors.error },

  version: {
    ...typography.caption,
    color: colors.slate400,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
