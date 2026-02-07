import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronRightIcon,
  AwardIcon,
  FileTextIcon,
  BookOpenIcon,
  BriefcaseIcon,
} from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useCompliance } from '../hooks/useData';

// Types
type ComplianceStatus = 'valid' | 'expiring' | 'expired';
type ComplianceCategory = 'health_safety' | 'food_safety' | 'company_policies' | 'role_specific';

interface ComplianceItem {
  id: string;
  name: string;
  category: ComplianceCategory;
  status: ComplianceStatus;
  expiryDate: string | null;
  completionDate: string | null;
  progress?: number; // 0-100 for incomplete training
  trainingUrl?: string;
}

const getCategoryIcon = (category: ComplianceCategory) => {
  switch (category) {
    case 'health_safety':
      return AlertCircleIcon;
    case 'food_safety':
      return AwardIcon;
    case 'company_policies':
      return FileTextIcon;
    case 'role_specific':
      return BriefcaseIcon;
    default:
      return BookOpenIcon;
  }
};

const getStatusColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'valid':
      return colors.success;
    case 'expiring':
      return colors.warning;
    case 'expired':
      return colors.error;
    default:
      return colors.slate500;
  }
};

const getStatusBackgroundColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'valid':
      return colors.success + '15';
    case 'expiring':
      return colors.warning + '15';
    case 'expired':
      return colors.error + '15';
    default:
      return colors.slate100;
  }
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const isExpiringSoon = (expiryDate: string | null): boolean => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiry <= thirtyDaysFromNow && expiry > now;
};

const isExpired = (expiryDate: string | null): boolean => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

export const ComplianceScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState<ComplianceCategory | null>(null);
  const { data, loading, error, refetch } = useCompliance();

  const certifications: ComplianceItem[] = (data?.certifications ?? []) as ComplianceItem[];

  const categories: { key: ComplianceCategory; label: string }[] = [
    { key: 'health_safety', label: t('compliance.healthSafety', 'Health & Safety') },
    { key: 'food_safety', label: t('compliance.foodSafety', 'Food Safety') },
    { key: 'company_policies', label: t('compliance.companyPolicies', 'Company Policies') },
    { key: 'role_specific', label: t('compliance.roleSpecific', 'Role-Specific') },
  ];

  // Check for items expiring within 30 days or already expired
  const expiringItems = certifications.filter(
    (item) => isExpiringSoon(item.expiryDate) || item.status === 'expiring'
  );
  const expiredItems = certifications.filter(
    (item) => isExpired(item.expiryDate) || item.status === 'expired'
  );
  const urgentItems = [...expiredItems, ...expiringItems.filter(item => !expiredItems.includes(item))];

  const getItemsByCategory = (category: ComplianceCategory) => {
    return certifications.filter((item) => item.category === category);
  };

  const getCategoryStats = (category: ComplianceCategory) => {
    const items = getItemsByCategory(category);
    const valid = items.filter((i) => i.status === 'valid' && !i.progress).length;
    const expiring = items.filter((i) => i.status === 'expiring').length;
    const expired = items.filter((i) => i.status === 'expired').length;
    const inProgress = items.filter((i) => i.progress !== undefined && i.progress < 100).length;
    return { total: items.length, valid, expiring, expired, inProgress };
  };

  const handleCompleteTraining = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const toggleCategory = (category: ComplianceCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const renderStatusBadge = (item: ComplianceItem) => {
    // For in-progress training
    if (item.progress !== undefined && item.progress < 100) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.info + '15' }]}>
          <Text style={[styles.statusText, { color: colors.info }]}>
            {t('compliance.inProgress', 'In Progress')}
          </Text>
        </View>
      );
    }

    const statusLabels: Record<ComplianceStatus, string> = {
      valid: t('compliance.valid', 'Valid'),
      expiring: t('compliance.expiringSoon', 'Expiring Soon'),
      expired: t('compliance.expired', 'Expired'),
    };

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: getStatusBackgroundColor(item.status) },
        ]}
      >
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {statusLabels[item.status]}
        </Text>
      </View>
    );
  };

  const renderStatusIcon = (item: ComplianceItem) => {
    if (item.progress !== undefined && item.progress < 100) {
      return <ClockIcon size={20} color={colors.info} />;
    }

    switch (item.status) {
      case 'valid':
        return <CheckCircleIcon size={20} color={colors.success} />;
      case 'expiring':
        return <AlertCircleIcon size={20} color={colors.warning} />;
      case 'expired':
        return <XCircleIcon size={20} color={colors.error} />;
      default:
        return <ClockIcon size={20} color={colors.slate500} />;
    }
  };

  const renderProgressBar = (progress: number) => {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}%</Text>
      </View>
    );
  };

  const renderComplianceItem = (item: ComplianceItem) => {
    const isInProgress = item.progress !== undefined && item.progress < 100;

    return (
      <View
        key={item.id}
        style={[
          styles.itemCard,
          item.status === 'expired' && styles.itemCardExpired,
          item.status === 'expiring' && styles.itemCardExpiring,
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemIconContainer}>{renderStatusIcon(item)}</View>
          <View style={styles.itemContent}>
            <Text style={styles.itemName}>{item.name}</Text>
            {renderStatusBadge(item)}
          </View>
        </View>

        {isInProgress ? (
          <View style={styles.itemDetails}>
            {renderProgressBar(item.progress!)}
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteTraining(item.trainingUrl)}
            >
              <BookOpenIcon size={16} color={colors.white} />
              <Text style={styles.completeButtonText}>
                {t('compliance.completeTraining', 'Complete Training')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemDates}>
            {item.completionDate && (
              <Text style={styles.dateText}>
                {t('compliance.completed', 'Completed')}: {formatDate(item.completionDate)}
              </Text>
            )}
            {item.expiryDate && (
              <Text
                style={[
                  styles.dateText,
                  (item.status === 'expired' || item.status === 'expiring') && {
                    color: getStatusColor(item.status),
                    fontWeight: '600',
                  },
                ]}
              >
                {t('compliance.expires', 'Expires')}: {formatDate(item.expiryDate)}
              </Text>
            )}
            {!item.expiryDate && item.completionDate && (
              <Text style={[styles.dateText, { color: colors.success }]}>
                {t('compliance.noExpiry', 'No expiry')}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderCategorySection = (category: { key: ComplianceCategory; label: string }) => {
    const CategoryIcon = getCategoryIcon(category.key);
    const stats = getCategoryStats(category.key);
    const isExpanded = expandedCategory === category.key;
    const items = getItemsByCategory(category.key);
    const hasIssues = stats.expired > 0 || stats.expiring > 0;

    return (
      <View key={category.key} style={styles.categoryContainer}>
        <TouchableOpacity
          style={[styles.categoryHeader, hasIssues && styles.categoryHeaderWarning]}
          onPress={() => toggleCategory(category.key)}
        >
          <View style={styles.categoryLeft}>
            <View
              style={[
                styles.categoryIconContainer,
                hasIssues && { backgroundColor: colors.error + '15' },
              ]}
            >
              <CategoryIcon
                size={20}
                color={hasIssues ? colors.error : colors.momentum}
              />
            </View>
            <View>
              <Text style={styles.categoryTitle}>{category.label}</Text>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryStatText}>
                  {stats.valid} {t('compliance.valid', 'valid')}
                </Text>
                {stats.inProgress > 0 && (
                  <Text style={[styles.categoryStatText, { color: colors.info }]}>
                    {' '}{stats.inProgress} {t('compliance.inProgress', 'in progress')}
                  </Text>
                )}
                {stats.expiring > 0 && (
                  <Text style={[styles.categoryStatText, { color: colors.warning }]}>
                    {' '}{stats.expiring} {t('compliance.expiring', 'expiring')}
                  </Text>
                )}
                {stats.expired > 0 && (
                  <Text style={[styles.categoryStatText, { color: colors.error }]}>
                    {' '}{stats.expired} {t('compliance.expired', 'expired')}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <View
            style={[
              styles.chevronContainer,
              isExpanded && styles.chevronExpanded,
            ]}
          >
            <ChevronRightIcon size={20} color={colors.slate500} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.categoryItems}>
            {items.map((item) => renderComplianceItem(item))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Compliance</Text>
            <Text style={styles.subtitle}>{t('screens.compliance.certifications_training')}</Text>
          </View>
        </View>
        <View style={styles.overallStatus}>
          <Text style={styles.overallStatusLabel}>
            {t('compliance.status', 'Status')}
          </Text>
          <View
            style={[
              styles.overallStatusBadge,
              {
                backgroundColor:
                  expiredItems.length > 0
                    ? colors.error + '15'
                    : expiringItems.length > 0
                    ? colors.warning + '15'
                    : colors.success + '15',
              },
            ]}
          >
            <Text
              style={[
                styles.overallStatusText,
                {
                  color:
                    expiredItems.length > 0
                      ? colors.error
                      : expiringItems.length > 0
                      ? colors.warning
                      : colors.success,
                },
              ]}
            >
              {expiredItems.length > 0
                ? t('compliance.actionRequired', 'Action Required')
                : expiringItems.length > 0
                ? t('compliance.attentionNeeded', 'Attention Needed')
                : t('compliance.compliant', 'Compliant')}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.momentum} />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <AlertCircleIcon size={48} color={colors.error} />
          <Text style={styles.emptyTitle}>{t('common.error', 'Something went wrong')}</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : certifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AwardIcon size={48} color={colors.slate400} />
          <Text style={styles.emptyTitle}>{t('compliance.noCertifications', 'No Certifications')}</Text>
          <Text style={styles.emptyText}>
            {t('compliance.noCertificationsText', 'You have no compliance certifications or training records yet.')}
          </Text>
        </View>
      ) : (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Alert Banner */}
        {urgentItems.length > 0 && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconContainer}>
              <AlertCircleIcon size={24} color={colors.white} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {t('compliance.alertTitle', 'Attention Required')}
              </Text>
              <Text style={styles.alertText}>
                {expiredItems.length > 0 &&
                  t(
                    'compliance.expiredAlert',
                    '{{count}} certification(s) have expired.',
                    { count: expiredItems.length }
                  )}
                {expiredItems.length > 0 && expiringItems.length > 0 && ' '}
                {expiringItems.length > 0 &&
                  t(
                    'compliance.expiringAlert',
                    '{{count}} certification(s) expiring within 30 days.',
                    { count: expiringItems.length }
                  )}
              </Text>
            </View>
          </View>
        )}

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.success + '10' }]}>
            <CheckCircleIcon size={24} color={colors.success} />
            <Text style={styles.summaryNumber}>
              {certifications.filter((i) => i.status === 'valid' && !i.progress).length}
            </Text>
            <Text style={styles.summaryLabel}>{t('compliance.valid', 'Valid')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.warning + '10' }]}>
            <AlertCircleIcon size={24} color={colors.warning} />
            <Text style={styles.summaryNumber}>
              {certifications.filter((i) => i.status === 'expiring').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('compliance.expiring', 'Expiring')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.error + '10' }]}>
            <XCircleIcon size={24} color={colors.error} />
            <Text style={styles.summaryNumber}>
              {certifications.filter((i) => i.status === 'expired').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('compliance.expired', 'Expired')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.info + '10' }]}>
            <ClockIcon size={24} color={colors.info} />
            <Text style={styles.summaryNumber}>
              {certifications.filter((i) => i.progress !== undefined && i.progress < 100).length}
            </Text>
            <Text style={styles.summaryLabel}>{t('compliance.pending', 'Pending')}</Text>
          </View>
        </View>

        {/* Category Sections */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>
            {t('compliance.byCategory', 'By Category')}
          </Text>
          {categories.map((category) => renderCategorySection(category))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <AwardIcon size={24} color={colors.momentum} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              {t('compliance.stayCompliant', 'Stay Compliant')}
            </Text>
            <Text style={styles.infoText}>
              {t(
                'compliance.stayCompliantText',
                'Keep your certifications up to date to maintain eligibility for shifts and ensure workplace safety.'
              )}
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  title: {
    ...typography.h2,
    color: colors.slate900,
  },
  subtitle: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  overallStatus: {
    alignItems: 'flex-end',
  },
  overallStatusLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginBottom: spacing.xs,
  },
  overallStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    maxWidth: 100,
  },
  overallStatusText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  content: {
    flex: 1,
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.bodyBold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  alertText: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 18,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  summaryNumber: {
    ...typography.h2,
    color: colors.slate900,
    marginTop: spacing.xs,
  },
  summaryLabel: {
    ...typography.small,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  categoriesContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  categoryContainer: {
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  categoryHeaderWarning: {
    borderStartWidth: 4,
    borderStartColor: colors.error,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.momentumLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  categoryTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  categoryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  categoryStatText: {
    ...typography.small,
    color: colors.slate600,
  },
  chevronContainer: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  categoryItems: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  itemCard: {
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  itemCardExpired: {
    borderWidth: 1,
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '05',
  },
  itemCardExpiring: {
    borderWidth: 1,
    borderColor: colors.warning + '40',
    backgroundColor: colors.warning + '05',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemIconContainer: {
    marginEnd: spacing.md,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.slate900,
    flex: 1,
    minWidth: 120,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  itemDetails: {
    marginTop: spacing.md,
    marginStart: 36,
  },
  itemDates: {
    marginTop: spacing.sm,
    marginStart: 36,
  },
  dateText: {
    ...typography.caption,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.momentum,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  completeButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.momentumLight,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  infoContent: {
    flex: 1,
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
  bottomPadding: {
    height: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  loadingText: {
    ...typography.body,
    color: colors.slate500,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.slate500,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.momentum,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});
