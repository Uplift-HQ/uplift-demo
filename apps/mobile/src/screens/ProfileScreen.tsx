import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  Image,
  ImageStyle,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMySkills, useGamificationStats } from '../hooks/useData';
import { api } from '../services/api';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  SettingsIcon,
  LogOutIcon,
  FileTextIcon,
  ChevronRightIcon,
  GlobeIcon,
  CheckIcon,
  AwardIcon,
  LinkIcon,
  HelpCircleIcon,
  MoonIcon,
  SunIcon,
  CalendarIcon,
  ClockIcon,
  DollarSignIcon,
  TrendingUpIcon,
  StarIcon,
  ShieldIcon,
  BriefcaseIcon,
  MapPinIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XIcon,
  EditIcon,
  CameraIcon,
  DownloadIcon,
  EyeIcon,
  UploadIcon,
} from '../components/Icons';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { colors, lightColors, darkColors, typography, spacing, borderRadius, shadows } from '../theme';
import { showAlert } from '../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Supported languages for selection
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
  { code: 'fr', name: 'French', nativeName: 'Francais' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'ro', name: 'Romanian', nativeName: 'Romana' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'tr', name: 'Turkish', nativeName: 'Turkce' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tieng Viet' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

// User stats data
interface UserStats {
  hoursThisWeek: number;
  hoursThisMonth: number;
  shiftsCompleted: number;
  earningsThisMonth: number;
  streakDays: number;
  onTimeRate: number;
  tasksCompleted: number;
  recognitionsReceived: number;
}

// User skills
interface UserSkill {
  id: string;
  name: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  expiresAt?: string;
}

// Documents
interface Document {
  id: string;
  name: string;
  type: 'id' | 'contract' | 'certificate' | 'payslip' | 'other';
  status: 'valid' | 'expiring' | 'expired' | 'pending';
  expiresAt?: string;
  uploadedAt: string;
}

// Availability
interface AvailabilitySlot {
  day: string;
  available: boolean;
  preferredStart?: string;
  preferredEnd?: string;
}

const DEFAULT_AVAILABILITY: AvailabilitySlot[] = [
  { day: 'Monday', available: false },
  { day: 'Tuesday', available: false },
  { day: 'Wednesday', available: false },
  { day: 'Thursday', available: false },
  { day: 'Friday', available: false },
  { day: 'Saturday', available: false },
  { day: 'Sunday', available: false },
];

const formatUKPhone = (phone: string) => phone;

const getSkillLevelColor = (level: string) => {
  switch (level) {
    case 'expert': return colors.momentum;
    case 'advanced': return colors.success;
    case 'intermediate': return colors.info;
    case 'basic': return colors.slate500;
    default: return colors.slate400;
  }
};

const getDocumentStatusColor = (status: string) => {
  switch (status) {
    case 'valid': return colors.success;
    case 'expiring': return colors.warning;
    case 'expired': return colors.error;
    case 'pending': return colors.slate500;
    default: return colors.slate400;
  }
};

const getDocumentIcon = (type: string) => {
  switch (type) {
    case 'id': return <ShieldIcon size={20} color={colors.slate600} />;
    case 'contract': return <FileTextIcon size={20} color={colors.slate600} />;
    case 'certificate': return <AwardIcon size={20} color={colors.slate600} />;
    case 'payslip': return <DollarSignIcon size={20} color={colors.slate600} />;
    default: return <FileTextIcon size={20} color={colors.slate600} />;
  }
};

export const ProfileScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { isDark, toggleDark } = useThemeStore();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);

  // Fetch employee profile from API
  useEffect(() => {
    api.getMyEmployee().then(res => {
      if (res.employee) setEmployeeProfile(res.employee);
    }).catch(() => {/* fallback to auth store user */});
  }, []);

  // Wire skills to API hook
  const { data: skillsData, loading: skillsLoading } = useMySkills();
  const skills: UserSkill[] = (skillsData?.skills ?? []).map((s: any, i: number) => ({
    id: s.id || String(i),
    name: s.name,
    level: s.level <= 1 ? 'basic' : s.level <= 2 ? 'intermediate' : s.level <= 3 ? 'advanced' : 'expert',
    verified: s.verified ?? false,
    expiresAt: s.expiresAt,
  }));

  // Wire gamification stats to API hook
  const { data: gamificationData, loading: gamificationLoading } = useGamificationStats();
  const gamificationDataExtended = gamificationData as typeof gamificationData & {
    hoursThisWeek?: number;
    hoursThisMonth?: number;
    shiftsCompleted?: number;
    earningsThisMonth?: number;
    onTimeRate?: number;
    tasksCompleted?: number;
    recognitionsReceived?: number;
  };
  const stats: UserStats = {
    hoursThisWeek: gamificationDataExtended?.hoursThisWeek ?? 0,
    hoursThisMonth: gamificationDataExtended?.hoursThisMonth ?? 0,
    shiftsCompleted: gamificationDataExtended?.shiftsCompleted ?? 0,
    earningsThisMonth: gamificationDataExtended?.earningsThisMonth ?? 0,
    streakDays: gamificationData?.streak ?? 0,
    onTimeRate: gamificationDataExtended?.onTimeRate ?? 0,
    tasksCompleted: gamificationDataExtended?.tasksCompleted ?? 0,
    recognitionsReceived: gamificationDataExtended?.recognitionsReceived ?? 0,
  };

  // No backend API for documents yet - show empty state
  const documents: Document[] = [];

  const isLoading = skillsLoading || gamificationLoading;

  const handleLogout = () => {
    showAlert(
      t('auth.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleLanguageSelect = (language: typeof LANGUAGES[0]) => {
    setSelectedLanguage(language);
    setLanguageModalVisible(false);
    showAlert(
      t('profile.languageChangedTitle'),
      t('profile.languageChangedMessage', { language: language.name })
    );
  };

  const toggleAvailability = (dayIndex: number) => {
    const newAvailability = [...availability];
    newAvailability[dayIndex] = {
      ...newAvailability[dayIndex],
      available: !newAvailability[dayIndex].available,
    };
    setAvailability(newAvailability);
  };

  const renderLanguageItem = ({ item }: { item: typeof LANGUAGES[0] }) => (
    <TouchableOpacity
      style={[styles.languageItem, item.code === selectedLanguage.code && styles.languageItemSelected]}
      onPress={() => handleLanguageSelect(item)}
    >
      <View>
        <Text style={styles.languageNative}>{item.nativeName}</Text>
        <Text style={styles.languageName}>{item.name}</Text>
      </View>
      {item.code === selectedLanguage.code && <CheckIcon size={20} color={colors.momentum} />}
    </TouchableOpacity>
  );

  // Calculate document alerts
  const expiringDocs = documents.filter(d => d.status === 'expiring' || d.status === 'expired');
  const verifiedSkillsCount = skills.filter(s => s.verified).length;

  // Dynamic colors based on theme
  const themeColors = isDark ? darkColors : lightColors;

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.surface }]} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>

        {isLoading && (
          <ActivityIndicator size="small" color={colors.momentum} style={{ marginBottom: spacing.sm }} />
        )}

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <UserIcon size={48} color={colors.momentum} />
            </View>
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => showAlert('Change Photo', 'Photo upload would open here')}
            >
              <CameraIcon size={14} color={colors.background} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: themeColors.text }]}>{employeeProfile?.firstName ?? user?.firstName} {employeeProfile?.lastName ?? user?.lastName}</Text>
            <Text style={styles.role}>{employeeProfile?.roleName ?? user?.role ?? 'Floor Associate'}</Text>
            <View style={styles.locationBadge}>
              <MapPinIcon size={12} color={colors.slate500} />
              <Text style={styles.locationText}>{employeeProfile?.locationName ?? '--'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => showAlert('Edit Profile', 'Profile editor would open here')}
          >
            <EditIcon size={16} color={colors.momentum} />
          </TouchableOpacity>
        </View>

        {/* Momentum Badge */}
        <View style={styles.momentumCard}>
          <View style={styles.momentumHeader}>
            <TrendingUpIcon size={20} color={colors.background} />
            <Text style={styles.momentumLabel}>{t('screens.profile.momentum_score')}</Text>
          </View>
          <View style={styles.momentumContent}>
            <Text style={styles.momentumValue}>{user?.momentumScore ?? '--'}</Text>
            <View style={styles.momentumMeta}>
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>{t('screens.profile.dayStreak', { count: stats.streakDays })}</Text>
              </View>
              <Text style={styles.momentumRank}>{t('screens.profile.topPercent', { percent: 15 })}</Text>
            </View>
          </View>
          <View style={styles.momentumBar}>
            <View style={[styles.momentumProgress, { width: `${user?.momentumScore ?? 0}%` }]} />
          </View>
        </View>
      </View>

      {/* Stats Dashboard */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('screens.profile.your_stats')}</Text>
          <TouchableOpacity onPress={() => showAlert(t('screens.profile.yourStats'), t('screens.profile.statsComingSoon'))}>
            <Text style={styles.seeAllText}>{t('screens.profile.view_all')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <ClockIcon size={20} color={colors.momentum} />
            <Text style={styles.statValue}>{stats.hoursThisWeek}h</Text>
            <Text style={styles.statLabel}>{t('screens.profile.this_week')}</Text>
          </View>
          <View style={styles.statCard}>
            <CalendarIcon size={20} color={colors.success} />
            <Text style={styles.statValue}>{stats.shiftsCompleted}</Text>
            <Text style={styles.statLabel}>{t('screens.profile.shifts')}</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSignIcon size={20} color={colors.info} />
            <Text style={styles.statValue}>£{stats.earningsThisMonth}</Text>
            <Text style={styles.statLabel}>{t('screens.profile.this_month')}</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircleIcon size={20} color={colors.warning} />
            <Text style={styles.statValue}>{stats.onTimeRate}%</Text>
            <Text style={styles.statLabel}>{t('screens.profile.on_time')}</Text>
          </View>
        </View>

        {/* Additional Stats Row */}
        <View style={styles.additionalStats}>
          <View style={styles.additionalStatItem}>
            <View style={styles.additionalStatIcon}>
              <CheckIcon size={16} color={colors.success} />
            </View>
            <View>
              <Text style={styles.additionalStatValue}>{stats.tasksCompleted}</Text>
              <Text style={styles.additionalStatLabel} numberOfLines={1}>{t('screens.profile.tasks_done')}</Text>
            </View>
          </View>
          <View style={styles.additionalStatDivider} />
          <View style={styles.additionalStatItem}>
            <View style={styles.additionalStatIcon}>
              <StarIcon size={16} color={colors.warning} />
            </View>
            <View>
              <Text style={styles.additionalStatValue}>{stats.recognitionsReceived}</Text>
              <Text style={styles.additionalStatLabel}>{t('screens.profile.recognitions')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* My Bonus Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('screens.profile.myBonus') || 'My Bonus'}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payslips')}>
            <Text style={styles.seeAllText}>{t('screens.profile.viewDetails') || 'View Details'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bonusCard}>
          <View style={styles.bonusHeader}>
            <View style={styles.bonusIconContainer}>
              <TrendingUpIcon size={20} color={colors.success} />
            </View>
            <View style={styles.bonusInfo}>
              <Text style={styles.bonusAmount}>£1,500</Text>
              <Text style={styles.bonusLabel}>{t('screens.profile.eligibleBonus') || 'Eligible Bonus'}</Text>
            </View>
          </View>

          <View style={styles.bonusDivider} />

          <View style={styles.bonusPayouts}>
            <View style={styles.bonusPayoutItem}>
              <View>
                <Text style={styles.bonusPayoutPeriod}>Q4 2025</Text>
                <Text style={styles.bonusPayoutScore}>94.0% {t('screens.profile.siteScore') || 'site score'}</Text>
              </View>
              <View style={styles.bonusPayoutRight}>
                <Text style={styles.bonusPayoutAmount}>£1,410</Text>
                <View style={[styles.bonusPayoutStatus, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.bonusPayoutStatusText, { color: colors.warning }]}>
                    {t('screens.profile.approved') || 'Approved'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.bonusPayoutItem}>
              <View>
                <Text style={styles.bonusPayoutPeriod}>Q3 2025</Text>
                <Text style={styles.bonusPayoutScore}>92.5% {t('screens.profile.siteScore') || 'site score'}</Text>
              </View>
              <View style={styles.bonusPayoutRight}>
                <Text style={styles.bonusPayoutAmount}>£1,388</Text>
                <View style={[styles.bonusPayoutStatus, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.bonusPayoutStatusText, { color: colors.success }]}>
                    {t('screens.profile.paid') || 'Paid'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Skills Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('screens.profile.skills_certifications')}</Text>
          <TouchableOpacity onPress={() => showAlert(t('screens.profile.skillsCertifications'), t('screens.profile.manageSkillsCareer'))}>
            <Text style={styles.seeAllText}>{t('screens.profile.manage')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.skillsSummary}>
          <View style={styles.skillsSummaryItem}>
            <Text style={styles.skillsSummaryValue}>{skills.length}</Text>
            <Text style={styles.skillsSummaryLabel}>{t('screens.profile.total_skills')}</Text>
          </View>
          <View style={styles.skillsSummaryDivider} />
          <View style={styles.skillsSummaryItem}>
            <Text style={styles.skillsSummaryValue}>{verifiedSkillsCount}</Text>
            <Text style={styles.skillsSummaryLabel}>{t('skills.verified')}</Text>
          </View>
          <View style={styles.skillsSummaryDivider} />
          <View style={styles.skillsSummaryItem}>
            <Text style={styles.skillsSummaryValue}>
              {skills.filter(s => s.level === 'advanced' || s.level === 'expert').length}
            </Text>
            <Text style={styles.skillsSummaryLabel}>{t('screens.profile.advancedPlus')}</Text>
          </View>
        </View>

        <View style={styles.skillsList}>
          {skills.slice(0, 4).map((skill) => (
            <View key={skill.id} style={styles.skillItem}>
              <View style={styles.skillInfo}>
                <View style={[styles.skillLevelDot, { backgroundColor: getSkillLevelColor(skill.level) }]} />
                <Text style={styles.skillName}>{skill.name}</Text>
              </View>
              <View style={styles.skillMeta}>
                <Text style={[styles.skillLevel, { color: getSkillLevelColor(skill.level) }]}>
                  {skill.level}
                </Text>
                {skill.verified && (
                  <View style={styles.verifiedBadge}>
                    <CheckCircleIcon size={12} color={colors.success} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {skills.length > 4 && (
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => showAlert(t('screens.profile.allSkills'), t('screens.profile.viewAllSkillsCareer'))}
          >
            <Text style={styles.viewMoreText}>{t('screens.profile.viewAllSkills', { count: skills.length })}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Documents Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('profile.documents')}</Text>
          {expiringDocs.length > 0 && (
            <View style={styles.alertBadge}>
              <AlertCircleIcon size={12} color={colors.background} />
              <Text style={styles.alertBadgeText}>{expiringDocs.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.documentsCard}
          onPress={() => setDocumentsModalVisible(true)}
        >
          <View style={styles.documentsPreview}>
            {documents.slice(0, 3).map((doc, index) => (
              <View
                key={doc.id}
                style={[
                  styles.documentPreviewItem,
                  { marginStart: index > 0 ? -8 : 0 }
                ]}
              >
                <View style={[
                  styles.documentPreviewIcon,
                  { borderColor: getDocumentStatusColor(doc.status) }
                ]}>
                  {getDocumentIcon(doc.type)}
                </View>
              </View>
            ))}
            {documents.length > 3 && (
              <View style={[styles.documentPreviewItem, { marginStart: -8 }]}>
                <View style={styles.documentPreviewMore}>
                  <Text style={styles.documentPreviewMoreText}>+{documents.length - 3}</Text>
                </View>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.documentsTitle}>{t('screens.profile.documentsCount', { count: documents.length })}</Text>
            <Text style={styles.documentsSubtitle}>
              {expiringDocs.length > 0
                ? t('screens.profile.needAttention', { count: expiringDocs.length })
                : t('screens.profile.allDocumentsUpToDate')
              }
            </Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>
      </View>

      {/* Availability Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('profile.availability')}</Text>
          <TouchableOpacity onPress={() => setAvailabilityModalVisible(true)}>
            <Text style={styles.seeAllText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.availabilityPreview}>
          {availability.map((slot, index) => (
            <View
              key={slot.day}
              style={[
                styles.availabilityDay,
                !slot.available && styles.availabilityDayUnavailable
              ]}
            >
              <Text style={[
                styles.availabilityDayText,
                !slot.available && styles.availabilityDayTextUnavailable
              ]}>
                {slot.day.slice(0, 2)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.availabilityNote}>
          {t('screens.profile.daysAvailable', { count: availability.filter(a => a.available).length })}
        </Text>
      </View>

      {/* Contact Info */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('settings.account')}</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MailIcon size={20} color={colors.slate600} />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <PhoneIcon size={20} color={colors.slate600} />
            <Text style={styles.infoText}>{formatUKPhone(user?.phone || t('profile.notSet'))}</Text>
          </View>
        </View>
      </View>

      {/* Money Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('profile.money')}</Text>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => navigation.navigate('Expenses')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.momentum + '15' }]}>
            <FileTextIcon size={20} color={colors.momentum} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{t('expenses.myExpenses')}</Text>
            <Text style={styles.menuSubtitle}>{t('profile.submitTrackExpenses')}</Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{t('profile.pendingCount', { count: 2 })}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuRow, { marginTop: spacing.sm }]}
          onPress={() => navigation.navigate('Payslips')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.success + '15' }]}>
            <DollarSignIcon size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{t('profile.payslips')}</Text>
            <Text style={styles.menuSubtitle}>{t('profile.viewPayslips')}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>
      </View>

      {/* Compliance Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('profile.compliance')}</Text>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => navigation.navigate('Compliance')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.info + '15' }]}>
            <AwardIcon size={20} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{t('profile.trainingCertifications')}</Text>
            <Text style={styles.menuSubtitle}>{t('profile.manageCompliance')}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('navigation.settings')}</Text>

        {/* Language Selection */}
        <TouchableOpacity style={styles.settingRow} onPress={() => setLanguageModalVisible(true)}>
          <View style={[styles.menuIcon, { backgroundColor: colors.momentum + '15' }]}>
            <GlobeIcon size={20} color={colors.momentum} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{t('settings.language')}</Text>
            <Text style={styles.menuSubtitle}>{selectedLanguage.nativeName}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>

        {/* Dark Mode Toggle */}
        <TouchableOpacity style={styles.settingRow} onPress={toggleDark}>
          <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.warning + '15' : colors.slate800 + '15' }]}>
            {isDark ? <SunIcon size={20} color={colors.warning} /> : <MoonIcon size={20} color={colors.slate800} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{t('settings.appearance')}</Text>
            <Text style={styles.menuSubtitle}>{isDark ? t('settings.darkMode') : t('settings.lightMode')}</Text>
          </View>
          <View style={[styles.toggleSwitch, isDark && styles.toggleSwitchActive]}>
            <View style={[styles.toggleKnob, isDark && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>

        {/* Other Settings */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => showAlert(t('onboarding.preferences'), 'Configure your app preferences.')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.slate200 }]}>
            <SettingsIcon size={20} color={colors.slate600} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{t('onboarding.preferences')}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => navigation.navigate('Integrations')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.slate200 }]}>
            <LinkIcon size={20} color={colors.slate600} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{t('profile.integrations')}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>
      </View>

      {/* Help & Support */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => navigation.navigate('Help')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.success + '15' }]}>
            <HelpCircleIcon size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{t('profile.helpSupport')}</Text>
            <Text style={styles.menuSubtitle}>{t('profile.getHelp')}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOutIcon size={20} color={colors.error} />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>{t('profile.version', { version: '1.0.0' })}</Text>
        <Text style={styles.versionText}>{t('profile.languagesSupported', { count: 47 })}</Text>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
              <Text style={styles.modalClose}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            {t('profile.languageModalSubtitle')}
          </Text>
          <FlatList
            data={LANGUAGES}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* Documents Modal */}
      <Modal
        visible={documentsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDocumentsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('screens.profile.my_documents')}</Text>
            <TouchableOpacity onPress={() => setDocumentsModalVisible(false)}>
              <XIcon size={24} color={colors.slate700} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Upload Button */}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => showAlert('Upload Document', 'Document upload would open here')}
            >
              <UploadIcon size={20} color={colors.momentum} />
              <Text style={styles.uploadButtonText}>{t('screens.profile.upload_new_document')}</Text>
            </TouchableOpacity>

            {/* Documents List */}
            <View style={styles.documentsList}>
              {documents.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.documentItem}
                  onPress={() => showAlert(doc.name, 'Document preview would open here')}
                >
                  <View style={[
                    styles.documentIcon,
                    { borderStartColor: getDocumentStatusColor(doc.status) }
                  ]}>
                    {getDocumentIcon(doc.type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.documentName}>{doc.name}</Text>
                    <View style={styles.documentMeta}>
                      <Text style={styles.documentDate}>{t('screens.profile.uploadedDate', { date: doc.uploadedAt })}</Text>
                      {doc.expiresAt && (
                        <Text style={[
                          styles.documentExpiry,
                          { color: getDocumentStatusColor(doc.status) }
                        ]}>
                          {doc.status === 'expired' ? t('screens.profile.expired') : t('screens.profile.expiresDate', { date: doc.expiresAt })}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.documentStatus, { backgroundColor: getDocumentStatusColor(doc.status) + '20' }]}>
                    <Text style={[styles.documentStatusText, { color: getDocumentStatusColor(doc.status) }]}>
                      {doc.status}
                    </Text>
                  </View>
                  <View style={styles.documentActions}>
                    <TouchableOpacity style={styles.documentAction} onPress={() => showAlert("Document", "Document management available in the full app.")}>
                      <EyeIcon size={18} color={colors.slate500} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.documentAction} onPress={() => showAlert("Document", "Document management available in the full app.")}>
                      <DownloadIcon size={18} color={colors.slate500} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Availability Modal */}
      <Modal
        visible={availabilityModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAvailabilityModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('screens.profile.set_availability')}</Text>
            <TouchableOpacity onPress={() => setAvailabilityModalVisible(false)}>
              <Text style={styles.modalClose}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            {t('screens.profile.availabilityModalSubtitle')}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {availability.map((slot, index) => (
              <View key={slot.day} style={styles.availabilityRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.availabilityDayName}>{slot.day}</Text>
                  {slot.available && (
                    <Text style={styles.availabilityTime}>
                      {slot.preferredStart} - {slot.preferredEnd}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.availabilityToggle, slot.available && styles.availabilityToggleActive]}
                  onPress={() => toggleAvailability(index)}
                >
                  <View style={[styles.availabilityToggleKnob, slot.available && styles.availabilityToggleKnobActive]} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.availabilityNote2}>
              <AlertCircleIcon size={16} color={colors.info} />
              <Text style={styles.availabilityNoteText}>
                {t('screens.profile.availabilityChangeNote')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    ...shadows.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  backButtonText: {
    ...typography.bodyBold,
    color: colors.momentum,
  },

  // Profile Section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: colors.slate100,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.momentum,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.momentum,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    ...typography.h2,
    color: colors.slate900,
    fontSize: 20,
  },
  role: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  locationText: {
    ...typography.caption,
    color: colors.slate500,
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Momentum Card
  momentumCard: {
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  momentumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  momentumLabel: {
    ...typography.bodyBold,
    color: colors.background,
    fontSize: 14,
  },
  momentumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  momentumValue: {
    ...typography.h1,
    color: colors.background,
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
  },
  momentumMeta: {
    alignItems: 'flex-end',
  },
  streakBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  streakText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '600',
  },
  momentumRank: {
    ...typography.caption,
    color: colors.background,
    opacity: 0.8,
  },
  momentumBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  momentumProgress: {
    height: '100%',
    backgroundColor: colors.background,
    borderRadius: 3,
  },

  // Section
  section: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
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
  seeAllText: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 14,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2 - spacing.md / 2,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.slate900,
    marginTop: spacing.sm,
    fontWeight: '800',
  },
  statLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs,
  },

  // Additional Stats
  additionalStats: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  additionalStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  additionalStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalStatValue: {
    ...typography.h3,
    color: colors.slate900,
  },
  additionalStatLabel: {
    ...typography.caption,
    color: colors.slate500,
  },
  additionalStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.slate200,
    marginHorizontal: spacing.md,
  },

  // Skills
  skillsSummary: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  skillsSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  skillsSummaryValue: {
    ...typography.h2,
    color: colors.slate900,
    fontWeight: '800',
  },
  skillsSummaryLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs,
  },
  skillsSummaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.slate200,
  },
  skillsList: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  skillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skillLevelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skillName: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  skillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skillLevel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  viewMoreText: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 14,
  },

  // Documents
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  alertBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
    fontSize: 11,
  },
  documentsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  documentsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentPreviewItem: {},
  documentPreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  documentPreviewMore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentPreviewMoreText: {
    ...typography.caption,
    color: colors.slate600,
    fontWeight: '700',
  },
  documentsTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  documentsSubtitle: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },

  // Availability
  availabilityPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  availabilityDay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.momentum + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityDayUnavailable: {
    backgroundColor: colors.slate100,
  },
  availabilityDayText: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 12,
  },
  availabilityDayTextUnavailable: {
    color: colors.slate400,
  },
  availabilityNote: {
    ...typography.caption,
    color: colors.slate500,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.slate700,
  },

  // Menu Row
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  menuSubtitle: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  pendingBadgeText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },

  // Toggle Switch
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.slate200,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: colors.momentum,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.error + '10',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    ...typography.bodyBold,
    color: colors.error,
  },

  // Version Info
  versionInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: 100,
  },
  versionText: {
    ...typography.caption,
    color: colors.slate400,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.slate900,
  },
  modalClose: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.slate600,
    padding: spacing.lg,
    paddingTop: spacing.md,
    lineHeight: 22,
  },

  // Language Item
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  languageItemSelected: {
    backgroundColor: colors.momentum + '10',
  },
  languageNative: {
    ...typography.bodyBold,
    color: colors.slate900,
    fontSize: 16,
  },
  languageName: {
    ...typography.caption,
    color: colors.slate600,
    marginTop: 2,
  },

  // Documents Modal
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.momentum,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
  },
  uploadButtonText: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  documentsList: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.slate50,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderStartWidth: 3,
  },
  documentName: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  documentMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  documentDate: {
    ...typography.caption,
    color: colors.slate500,
  },
  documentExpiry: {
    ...typography.caption,
    fontWeight: '600',
  },
  documentStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  documentStatusText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  documentActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  documentAction: {
    padding: spacing.xs,
  },

  // Availability Modal
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  availabilityDayName: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  availabilityTime: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  availabilityToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.slate200,
    padding: 2,
    justifyContent: 'center',
  },
  availabilityToggleActive: {
    backgroundColor: colors.momentum,
  },
  availabilityToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  availabilityToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  availabilityNote2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.lg,
  },
  availabilityNoteText: {
    ...typography.body,
    color: colors.info,
    flex: 1,
    fontSize: 14,
  },
  // Bonus section styles
  bonusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bonusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusInfo: {
    flex: 1,
  },
  bonusAmount: {
    ...typography.h2,
    color: colors.success,
    fontWeight: '800',
  },
  bonusLabel: {
    ...typography.caption,
    color: colors.slate500,
  },
  bonusDivider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: spacing.md,
  },
  bonusPayouts: {
    gap: spacing.sm,
  },
  bonusPayoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  bonusPayoutPeriod: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  bonusPayoutScore: {
    ...typography.caption,
    color: colors.slate500,
  },
  bonusPayoutRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  bonusPayoutAmount: {
    ...typography.bodyBold,
    color: colors.success,
  },
  bonusPayoutStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  bonusPayoutStatusText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
});
