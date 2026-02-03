import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Modal, FlatList } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage, getCurrentLanguage } from '../i18n';
import {
  HeartIcon, UserIcon, SettingsIcon, HelpCircleIcon, LogOutIcon,
  ChevronRightIcon, MessageCircleIcon, BellIcon, FileTextIcon,
  ShieldIcon, LinkIcon, CreditCardIcon, GlobeIcon, XIcon, CheckIcon,
  GiftIcon, TargetIcon
} from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

export const MoreScreen = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const unreadMessages = (user as any)?.unreadMessages ?? 3;

  const menuSections = [
    {
      title: t('more.social'),
      items: [
        {
          id: 'feed',
          label: t('more.feed'),
          subtitle: t('more.teamUpdates'),
          icon: HeartIcon,
          color: colors.error,
          onPress: () => navigation.navigate('Feed'),
        },
        {
          id: 'chat',
          label: t('more.messages'),
          subtitle: unreadMessages > 0 ? t('more.unread', { count: unreadMessages }) : t('more.teamChat'),
          icon: MessageCircleIcon,
          color: colors.info,
          badge: unreadMessages,
          onPress: () => navigation.navigate('Chat'),
        },
        {
          id: 'notifications',
          label: t('more.notifications'),
          subtitle: t('more.alertsReminders'),
          icon: BellIcon,
          color: colors.warning,
          onPress: () => navigation.navigate('Feed', { screen: 'Notifications' }),
        },
      ]
    },
    {
      title: t('more.growthRewards'),
      items: [
        {
          id: 'rewards',
          label: t('more.rewards'),
          subtitle: t('more.pointsPerks'),
          icon: GiftIcon,
          color: colors.warning,
          onPress: () => navigation.navigate('Career', { screen: 'Rewards' }),
        },
        {
          id: 'career',
          label: t('more.careerPath'),
          subtitle: t('more.skillsProgression'),
          icon: TargetIcon,
          color: colors.momentum,
          onPress: () => navigation.navigate('Career', { screen: 'CareerPath' }),
        },
      ]
    },
    {
      title: t('more.myAccount'),
      items: [
        {
          id: 'profile',
          label: t('more.profile'),
          subtitle: t('more.personalInfo'),
          icon: UserIcon,
          color: colors.momentum,
          onPress: () => navigation.navigate('Profile', { screen: 'ProfileHome' }),
        },
        {
          id: 'expenses',
          label: t('more.expenses'),
          subtitle: t('more.submitTrackClaims'),
          icon: CreditCardIcon,
          color: colors.success,
          onPress: () => navigation.navigate('Profile', { screen: 'Expenses' }),
        },
        {
          id: 'payslips',
          label: t('more.payslips'),
          subtitle: t('more.viewDownload'),
          icon: FileTextIcon,
          color: colors.slate600,
          onPress: () => navigation.navigate('Profile', { screen: 'Payslips' }),
        },
        {
          id: 'compliance',
          label: t('more.compliance'),
          subtitle: t('more.trainingCerts'),
          icon: ShieldIcon,
          color: colors.warning,
          onPress: () => navigation.navigate('Profile', { screen: 'Compliance' }),
        },
      ]
    },
    {
      title: t('more.settings'),
      items: [
        {
          id: 'language',
          label: t('settings.language'),
          subtitle: currentLang.nativeName,
          icon: GlobeIcon,
          color: colors.momentum,
          onPress: () => setShowLanguagePicker(true),
        },
        {
          id: 'integrations',
          label: t('more.connectedApps'),
          subtitle: t('more.manageIntegrations'),
          icon: LinkIcon,
          color: colors.info,
          onPress: () => navigation.navigate('Profile', { screen: 'Integrations' }),
        },
        {
          id: 'help',
          label: t('more.helpSupport'),
          subtitle: t('more.faqsContact'),
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
        <Text style={styles.title}>{t('more.title')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => navigation.navigate('Profile', { screen: 'ProfileHome' })}
        >
          <View style={styles.userAvatar}>
            {(user as any)?.companyLogo ? (
              <Image source={{ uri: (user as any).companyLogo }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userCompany}>{(user as any)?.companyName || t('home.teamMember')}</Text>
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
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOutIcon size={20} color={colors.error} />
          <Text style={styles.logoutText}>{t('more.signOut')}</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>{t('more.version', { version: '1.0.0' })}</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('common.selectLanguage', 'Select Language')}</Text>
            <TouchableOpacity onPress={() => setShowLanguagePicker(false)} style={styles.modalClose}>
              <XIcon size={24} color={colors.slate600} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.languageItem,
                  currentLang.code === item.code && styles.languageItemActive
                ]}
                onPress={async () => {
                  await changeLanguage(item.code);
                  setCurrentLang(getCurrentLanguage());
                  setShowLanguagePicker(false);
                }}
              >
                <Text style={styles.languageName}>{item.nativeName}</Text>
                <Text style={styles.languageNameSecondary}>{item.name}</Text>
                {currentLang.code === item.code && (
                  <CheckIcon size={20} color={colors.momentum} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
    backgroundColor: colors.momentum,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 28 },
  avatarInitials: { ...typography.h2, color: colors.background, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { ...typography.h3, color: colors.slate900, fontSize: 18 },
  userCompany: { ...typography.caption, color: colors.momentum, fontWeight: '600', marginTop: 2 },

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

  // Language Picker Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.slate900,
    fontSize: 20,
  },
  modalClose: {
    padding: spacing.sm,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  languageItemActive: {
    backgroundColor: colors.momentum + '10',
  },
  languageName: {
    ...typography.bodyBold,
    color: colors.slate900,
    flex: 1,
  },
  languageNameSecondary: {
    ...typography.caption,
    color: colors.slate500,
    marginEnd: spacing.md,
  },
});
