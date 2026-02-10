import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  SearchIcon,
  BookOpenIcon,
  AwardIcon,
  ClockIcon,
  CheckCircleIcon,
  StarIcon,
  ShieldIcon,
  UserIcon,
  ZapIcon,
  ChevronRightIcon,
} from '../components/Icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

type Tab = 'courses' | 'catalogue' | 'certificates';

interface EnrolledCourse {
  id: string;
  title: string;
  progress: number;
  badge: 'mandatory' | 'optional' | 'new';
}

interface RecommendedCourse {
  id: string;
  title: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  instructor: string;
}

interface Certificate {
  id: string;
  title: string;
  issueDate: string;
}

const ENROLLED_COURSES: EnrolledCourse[] = [
  { id: '1', title: 'Safety Fundamentals', progress: 85, badge: 'mandatory' },
  { id: '2', title: 'Leadership Basics', progress: 40, badge: 'optional' },
  { id: '3', title: 'Excel for Manufacturing', progress: 10, badge: 'new' },
];

const RECOMMENDED_COURSES: RecommendedCourse[] = [
  { id: '4', title: 'Workplace Communication', duration: '2h 30m', difficulty: 'Beginner', instructor: 'Sarah Mitchell' },
  { id: '5', title: 'Quality Control Essentials', duration: '4h 15m', difficulty: 'Intermediate', instructor: 'James Park' },
  { id: '6', title: 'Advanced Safety Protocols', duration: '3h 45m', difficulty: 'Advanced', instructor: 'Maria Santos' },
];

const CERTIFICATES: Certificate[] = [
  { id: '7', title: 'Workplace Health & Safety', issueDate: '15 Nov 2025' },
  { id: '8', title: 'Fire Safety Awareness', issueDate: '02 Sep 2025' },
];

const getBadgeColor = (badge: EnrolledCourse['badge']) => {
  switch (badge) {
    case 'mandatory': return colors.error;
    case 'optional': return colors.info;
    case 'new': return colors.success;
  }
};

const getBadgeLabel = (badge: EnrolledCourse['badge'], t: any) => {
  switch (badge) {
    case 'mandatory': return t('learning.mandatory', 'Mandatory');
    case 'optional': return t('learning.optional', 'Optional');
    case 'new': return t('learning.new', 'New');
  }
};

const getDifficultyColor = (difficulty: RecommendedCourse['difficulty']) => {
  switch (difficulty) {
    case 'Beginner': return colors.success;
    case 'Intermediate': return colors.warning;
    case 'Advanced': return colors.error;
  }
};

export const LearningScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('courses');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'courses', label: t('learning.myCourses', 'My Courses') },
    { key: 'catalogue', label: t('learning.catalogue', 'Catalogue') },
    { key: 'certificates', label: t('learning.certificates', 'Certificates') },
  ];

  const renderProgressBar = (progress: number) => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{progress}%</Text>
    </View>
  );

  const renderEnrolledCourse = (course: EnrolledCourse) => {
    const badgeColor = getBadgeColor(course.badge);
    return (
      <TouchableOpacity key={course.id} style={styles.courseCard}>
        <View style={styles.courseHeader}>
          <View style={[styles.courseIconBg, { backgroundColor: colors.momentum + '15' }]}>
            <BookOpenIcon size={20} color={colors.momentum} />
          </View>
          <View style={styles.courseInfo}>
            <Text style={styles.courseName}>{course.title}</Text>
            <View style={[styles.courseBadge, { backgroundColor: badgeColor + '15' }]}>
              <Text style={[styles.courseBadgeText, { color: badgeColor }]}>
                {getBadgeLabel(course.badge, t)}
              </Text>
            </View>
          </View>
          <ChevronRightIcon size={18} color={colors.slate400} />
        </View>
        {renderProgressBar(course.progress)}
      </TouchableOpacity>
    );
  };

  const renderRecommendedCourse = (course: RecommendedCourse) => {
    const difficultyColor = getDifficultyColor(course.difficulty);
    return (
      <View key={course.id} style={styles.recommendedCard}>
        <View style={styles.recommendedTop}>
          <View style={[styles.courseIconBg, { backgroundColor: colors.info + '15' }]}>
            <StarIcon size={20} color={colors.info} />
          </View>
          <View style={styles.recommendedInfo}>
            <Text style={styles.courseName}>{course.title}</Text>
            <View style={styles.recommendedMeta}>
              <ClockIcon size={14} color={colors.slate500} />
              <Text style={styles.metaText}>{course.duration}</Text>
              <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + '15' }]}>
                <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                  {t(`learning.${course.difficulty.toLowerCase()}`, course.difficulty)}
                </Text>
              </View>
            </View>
            <View style={styles.instructorRow}>
              <UserIcon size={14} color={colors.slate500} />
              <Text style={styles.instructorText}>{course.instructor}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.enrollButton}>
          <Text style={styles.enrollButtonText}>{t('learning.enroll', 'Enroll')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCertificate = (cert: Certificate) => (
    <View key={cert.id} style={styles.certificateCard}>
      <View style={[styles.certIconBg, { backgroundColor: colors.success + '15' }]}>
        <AwardIcon size={24} color={colors.success} />
      </View>
      <View style={styles.certInfo}>
        <Text style={styles.certTitle}>{cert.title}</Text>
        <Text style={styles.certDate}>
          {t('learning.issuedOn', 'Issued on')} {cert.issueDate}
        </Text>
      </View>
      <CheckCircleIcon size={20} color={colors.success} />
    </View>
  );

  const renderCoursesTab = () => (
    <>
      {/* My Courses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('learning.myCourses', 'My Courses')}</Text>
          <Text style={styles.sectionCount}>
            {ENROLLED_COURSES.length} {t('learning.active', 'active')}
          </Text>
        </View>
        {ENROLLED_COURSES.map(renderEnrolledCourse)}
      </View>

      {/* Recommended */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('learning.recommended', 'Recommended')}</Text>
          <ZapIcon size={18} color={colors.momentum} />
        </View>
        {RECOMMENDED_COURSES.map(renderRecommendedCourse)}
      </View>
    </>
  );

  const renderCatalogueTab = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('learning.allCourses', 'All Courses')}</Text>
      </View>
      {RECOMMENDED_COURSES.map(renderRecommendedCourse)}
      <View style={styles.infoCard}>
        <BookOpenIcon size={24} color={colors.momentum} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>{t('learning.moreComing', 'More courses coming soon')}</Text>
          <Text style={styles.infoText}>
            {t('learning.moreComingText', 'New courses are added regularly. Check back often for fresh content.')}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCertificatesTab = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('learning.earnedCertificates', 'Earned Certificates')}</Text>
        <Text style={styles.sectionCount}>
          {CERTIFICATES.length} {t('learning.earned', 'earned')}
        </Text>
      </View>
      {CERTIFICATES.map(renderCertificate)}

      <View style={styles.infoCard}>
        <AwardIcon size={24} color={colors.momentum} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>{t('learning.keepLearning', 'Keep Learning')}</Text>
          <Text style={styles.infoText}>
            {t('learning.keepLearningText', 'Complete courses to earn certificates and boost your professional profile.')}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('learning.title', 'Learning')}
        onBack={() => navigation.goBack()}
      />

      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <SearchIcon size={18} color={colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('learning.searchCourses', 'Search courses...')}
            placeholderTextColor={colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'courses' && renderCoursesTab()}
        {activeTab === 'catalogue' && renderCatalogueTab()}
        {activeTab === 'certificates' && renderCertificatesTab()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Search
  searchWrapper: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.slate900,
    padding: 0,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.momentum,
  },
  tabText: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.momentum,
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
  },

  // Sections
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
    fontWeight: '600',
  },

  // Enrolled Course Card
  courseCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  courseIconBg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    ...typography.bodyBold,
    color: colors.slate900,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  courseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  courseBadgeText: {
    ...typography.small,
    fontWeight: '700',
  },

  // Progress Bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.slate200,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginEnd: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...typography.caption,
    color: colors.slate700,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },

  // Recommended Course Card
  recommendedCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  recommendedTop: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  recommendedInfo: {
    flex: 1,
  },
  recommendedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.slate500,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  difficultyText: {
    ...typography.small,
    fontWeight: '700',
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  instructorText: {
    ...typography.caption,
    color: colors.slate600,
  },

  // Enroll Button
  enrollButton: {
    backgroundColor: colors.momentum,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  enrollButtonText: {
    ...typography.bodyBold,
    color: colors.background,
  },

  // Certificate Card
  certificateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  certIconBg: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  certInfo: {
    flex: 1,
  },
  certTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginBottom: spacing.xs,
  },
  certDate: {
    ...typography.caption,
    color: colors.slate500,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.momentum + '15',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  infoTitle: {
    ...typography.bodyBold,
    color: colors.momentum,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.slate700,
    lineHeight: 18,
  },
});
