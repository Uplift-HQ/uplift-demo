import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  SearchIcon,
  ChevronRightIcon,
  MailIcon,
  PhoneIcon,
  MessageCircleIcon,
  AlertCircleIcon,
  StarIcon,
  CalendarIcon,
  ClockIcon,
  CheckSquareIcon,
  BriefcaseIcon,
  GiftIcon,
  BookOpenIcon,
} from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { showAlert } from '../utils/alert';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// FAQ Category type
interface FAQCategory {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  questions: FAQItem[];
}

// FAQ Item type
interface FAQItem {
  id: string;
  questionKey: string;
  answerKey: string;
}

// FAQ data organized by category
const FAQ_DATA: FAQCategory[] = [
  {
    id: 'getting-started',
    titleKey: 'help.categories.gettingStarted',
    icon: <BookOpenIcon size={20} color={colors.momentum} />,
    questions: [
      {
        id: 'gs-1',
        questionKey: 'help.faq.gettingStarted.q1',
        answerKey: 'help.faq.gettingStarted.a1',
      },
      {
        id: 'gs-2',
        questionKey: 'help.faq.gettingStarted.q2',
        answerKey: 'help.faq.gettingStarted.a2',
      },
      {
        id: 'gs-3',
        questionKey: 'help.faq.gettingStarted.q3',
        answerKey: 'help.faq.gettingStarted.a3',
      },
    ],
  },
  {
    id: 'schedule',
    titleKey: 'help.categories.schedule',
    icon: <CalendarIcon size={20} color={colors.momentum} />,
    questions: [
      {
        id: 'sch-1',
        questionKey: 'help.faq.schedule.q1',
        answerKey: 'help.faq.schedule.a1',
      },
      {
        id: 'sch-2',
        questionKey: 'help.faq.schedule.q2',
        answerKey: 'help.faq.schedule.a2',
      },
      {
        id: 'sch-3',
        questionKey: 'help.faq.schedule.q3',
        answerKey: 'help.faq.schedule.a3',
      },
    ],
  },
  {
    id: 'time-tracking',
    titleKey: 'help.categories.timeTracking',
    icon: <ClockIcon size={20} color={colors.momentum} />,
    questions: [
      {
        id: 'tt-1',
        questionKey: 'help.faq.timeTracking.q1',
        answerKey: 'help.faq.timeTracking.a1',
      },
      {
        id: 'tt-2',
        questionKey: 'help.faq.timeTracking.q2',
        answerKey: 'help.faq.timeTracking.a2',
      },
      {
        id: 'tt-3',
        questionKey: 'help.faq.timeTracking.q3',
        answerKey: 'help.faq.timeTracking.a3',
      },
    ],
  },
  {
    id: 'tasks',
    titleKey: 'help.categories.tasks',
    icon: <CheckSquareIcon size={20} color={colors.momentum} />,
    questions: [
      {
        id: 'tsk-1',
        questionKey: 'help.faq.tasks.q1',
        answerKey: 'help.faq.tasks.a1',
      },
      {
        id: 'tsk-2',
        questionKey: 'help.faq.tasks.q2',
        answerKey: 'help.faq.tasks.a2',
      },
      {
        id: 'tsk-3',
        questionKey: 'help.faq.tasks.q3',
        answerKey: 'help.faq.tasks.a3',
      },
    ],
  },
  {
    id: 'career',
    titleKey: 'help.categories.career',
    icon: <BriefcaseIcon size={20} color={colors.momentum} />,
    questions: [
      {
        id: 'car-1',
        questionKey: 'help.faq.career.q1',
        answerKey: 'help.faq.career.a1',
      },
      {
        id: 'car-2',
        questionKey: 'help.faq.career.q2',
        answerKey: 'help.faq.career.a2',
      },
      {
        id: 'car-3',
        questionKey: 'help.faq.career.q3',
        answerKey: 'help.faq.career.a3',
      },
    ],
  },
  {
    id: 'rewards',
    titleKey: 'help.categories.rewards',
    icon: <GiftIcon size={20} color={colors.momentum} />,
    questions: [
      {
        id: 'rew-1',
        questionKey: 'help.faq.rewards.q1',
        answerKey: 'help.faq.rewards.a1',
      },
      {
        id: 'rew-2',
        questionKey: 'help.faq.rewards.q2',
        answerKey: 'help.faq.rewards.a2',
      },
      {
        id: 'rew-3',
        questionKey: 'help.faq.rewards.q3',
        answerKey: 'help.faq.rewards.a3',
      },
    ],
  },
];

// Category title keys mapping to translation keys
const CATEGORY_TITLE_KEYS: Record<string, string> = {
  'help.categories.gettingStarted': 'help.categories.gettingStarted',
  'help.categories.schedule': 'help.categories.schedule',
  'help.categories.timeTracking': 'help.categories.timeTracking',
  'help.categories.tasks': 'help.categories.tasks',
  'help.categories.career': 'help.categories.career',
  'help.categories.rewards': 'help.categories.rewards',
};

// Support contact info
const SUPPORT_EMAIL = 'support@getuplift.io';
const SUPPORT_PHONE = '+44 20 7946 0958';

// App version
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '100';

// FAQ Accordion Item Component
const FAQAccordionItem: React.FC<{
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ question, answer, isExpanded, onToggle }) => {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestionText}>{question}</Text>
        <View style={[styles.faqChevron, isExpanded && styles.faqChevronExpanded]}>
          <ChevronRightIcon size={18} color={colors.slate400} />
        </View>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

// Category Section Component
const CategorySection: React.FC<{
  category: FAQCategory;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  t: (key: string) => string;
}> = ({ category, expandedIds, onToggle, t }) => {
  const categoryTitle = t(CATEGORY_TITLE_KEYS[category.titleKey] || category.titleKey);

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        {category.icon}
        <Text style={styles.categoryTitle}>{categoryTitle}</Text>
      </View>
      <View style={styles.categoryContent}>
        {category.questions.map((item) => {
          return (
            <FAQAccordionItem
              key={item.id}
              question={t(item.questionKey)}
              answer={t(item.answerKey)}
              isExpanded={expandedIds.has(item.id)}
              onToggle={() => onToggle(item.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

// Quick Link Component
const QuickLink: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.quickLinkIcon}>{icon}</View>
    <View style={styles.quickLinkContent}>
      <Text style={styles.quickLinkTitle}>{title}</Text>
      <Text style={styles.quickLinkSubtitle}>{subtitle}</Text>
    </View>
    <ChevronRightIcon size={20} color={colors.slate400} />
  </TouchableOpacity>
);

export const HelpScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Toggle FAQ item expansion
  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Filter categories and questions based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return FAQ_DATA;
    }

    const query = searchQuery.toLowerCase();
    return FAQ_DATA.map((category) => ({
      ...category,
      questions: category.questions.filter((item) => {
        const question = t(item.questionKey).toLowerCase();
        const answer = t(item.answerKey).toLowerCase();
        return question.includes(query) || answer.includes(query);
      }),
    })).filter((category) => category.questions.length > 0);
  }, [searchQuery, t]);

  // Handle contact support
  const handleContactSupport = () => {
    showAlert(
      t('help.contactSupport') || 'Contact Support',
      `${t('help.email') || 'Email'}: ${SUPPORT_EMAIL}\n${t('help.phone') || 'Phone'}: ${SUPPORT_PHONE}`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('help.sendEmail') || 'Send Email',
          onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
        },
        {
          text: t('help.callUs') || 'Call Us',
          onPress: () => Linking.openURL(`tel:${SUPPORT_PHONE}`),
        },
      ]
    );
  };

  // Handle report a bug
  const handleReportBug = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Bug Report - Uplift App v${APP_VERSION}`);
  };

  // Handle feature request
  const handleFeatureRequest = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Feature Request - Uplift App`);
  };

  // Handle chat support - redirect to email
  const handleChatSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Support Request - Uplift App`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.help.help_support')}</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {t('screens.help.headerSubtitle')}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={20} color={colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('help.searchPlaceholder') || 'Search help articles...'}
            placeholderTextColor={colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Quick Links Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('help.quickLinks') || 'Quick Links'}</Text>
        <View style={styles.quickLinksContainer}>
          <QuickLink
            icon={<MailIcon size={24} color={colors.momentum} />}
            title={t('help.contactSupport') || 'Contact Support'}
            subtitle={t('help.contactSupportDesc') || 'Get help via email or phone'}
            onPress={handleContactSupport}
          />
          <QuickLink
            icon={<AlertCircleIcon size={24} color={colors.warning} />}
            title={t('help.reportBug') || 'Report a Bug'}
            subtitle={t('help.reportBugDesc') || 'Let us know about issues'}
            onPress={handleReportBug}
          />
          <QuickLink
            icon={<StarIcon size={24} color={colors.info} />}
            title={t('help.featureRequest') || 'Feature Request'}
            subtitle={t('help.featureRequestDesc') || 'Suggest new features'}
            onPress={handleFeatureRequest}
          />
        </View>
      </View>

      {/* Chat Support Button */}
      <View style={styles.chatButtonContainer}>
        <TouchableOpacity style={styles.chatButton} onPress={handleChatSupport} activeOpacity={0.8}>
          <MessageCircleIcon size={24} color={colors.white} />
          <Text style={styles.chatButtonText}>{t('help.chatWithSupport') || 'Chat with Support'}</Text>
        </TouchableOpacity>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('help.faqTitle') || 'Frequently Asked Questions'}</Text>

        {filteredCategories.length === 0 ? (
          <View style={styles.noResults}>
            <SearchIcon size={48} color={colors.slate300} />
            <Text style={styles.noResultsText}>
              {t('help.noResults') || 'No results found'}
            </Text>
            <Text style={styles.noResultsSubtext}>
              {t('help.noResultsHint') || 'Try a different search term or browse categories below'}
            </Text>
          </View>
        ) : (
          filteredCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              expandedIds={expandedIds}
              onToggle={toggleExpanded}
              t={t}
            />
          ))
        )}
      </View>

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>
          {t('help.appVersion') || 'App Version'} {APP_VERSION} ({BUILD_NUMBER})
        </Text>
        <Text style={styles.copyrightText}>
          {t('help.copyright') || '2024 Uplift. All rights reserved.'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontSize: 20, color: colors.slate700 },
  headerTitle: {
    ...typography.h1,
    color: colors.slate900,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.slate600,
    lineHeight: 22,
  },
  searchContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.slate900,
    marginStart: spacing.sm,
    paddingVertical: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  quickLinksContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkContent: {
    flex: 1,
    marginStart: spacing.md,
  },
  quickLinkTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  quickLinkSubtitle: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  chatButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  chatButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    ...typography.bodyBold,
    color: colors.slate700,
  },
  categoryContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  faqQuestionText: {
    flex: 1,
    ...typography.body,
    color: colors.slate900,
    fontWeight: '500',
    paddingEnd: spacing.sm,
  },
  faqChevron: {
    transform: [{ rotate: '0deg' }],
  },
  faqChevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  faqAnswer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: 0,
  },
  faqAnswerText: {
    ...typography.body,
    color: colors.slate600,
    lineHeight: 22,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  noResultsText: {
    ...typography.h3,
    color: colors.slate500,
    marginTop: spacing.md,
  },
  noResultsSubtext: {
    ...typography.body,
    color: colors.slate400,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: 120,
  },
  versionText: {
    ...typography.caption,
    color: colors.slate400,
  },
  copyrightText: {
    ...typography.small,
    color: colors.slate300,
    marginTop: spacing.xs,
  },
});

export default HelpScreen;
