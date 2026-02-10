import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  FileTextIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldIcon,
  ChevronRightIcon,
  EyeIcon,
  EditIcon,
} from '../components/Icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

type DocumentStatus = 'signed' | 'viewed' | 'new' | 'pending';

interface ActionDocument {
  id: string;
  name: string;
  type: 'Contract' | 'Policy';
  dueDate: string;
}

interface MyDocument {
  id: string;
  name: string;
  date: string;
  status: DocumentStatus;
}

interface CompanyPolicy {
  id: string;
  name: string;
  description: string;
}

const ACTION_DOCUMENTS: ActionDocument[] = [
  { id: '1', name: 'Updated Employment Terms', type: 'Contract', dueDate: '10 Feb 2026' },
  { id: '2', name: 'Data Privacy Policy v3', type: 'Policy', dueDate: '15 Feb 2026' },
];

const MY_DOCUMENTS: MyDocument[] = [
  { id: '3', name: 'Employment Contract', date: '01 Mar 2025', status: 'signed' },
  { id: '4', name: 'Non-Disclosure Agreement', date: '01 Mar 2025', status: 'signed' },
  { id: '5', name: 'Benefits Guide 2025', date: '15 Jan 2025', status: 'viewed' },
  { id: '6', name: 'Safety Manual', date: '20 Jan 2026', status: 'new' },
];

const COMPANY_POLICIES: CompanyPolicy[] = [
  {
    id: '7',
    name: 'IT Acceptable Use Policy',
    description: 'Guidelines for the appropriate use of company IT resources, including devices, email, internet access, and software. Covers data handling, password management, and reporting security incidents.',
  },
  {
    id: '8',
    name: 'Health & Safety Policy',
    description: 'Outlines the company commitment to maintaining a safe working environment. Includes procedures for hazard reporting, emergency protocols, PPE requirements, and workplace ergonomics.',
  },
  {
    id: '9',
    name: 'Anti-Harassment Policy',
    description: 'Defines unacceptable behaviours in the workplace and provides procedures for reporting and investigating harassment claims. Covers in-person and digital communications.',
  },
];

const getStatusColor = (status: DocumentStatus) => {
  switch (status) {
    case 'signed': return colors.success;
    case 'viewed': return colors.info;
    case 'new': return colors.momentum;
    case 'pending': return colors.warning;
  }
};

const getStatusIcon = (status: DocumentStatus) => {
  switch (status) {
    case 'signed': return CheckCircleIcon;
    case 'viewed': return EyeIcon;
    case 'new': return AlertCircleIcon;
    case 'pending': return ClockIcon;
  }
};

const getTypeColor = (type: ActionDocument['type']) => {
  switch (type) {
    case 'Contract': return colors.momentum;
    case 'Policy': return colors.info;
  }
};

export const DocumentsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

  const togglePolicy = (id: string) => {
    setExpandedPolicy(expandedPolicy === id ? null : id);
  };

  const getStatusLabel = (status: DocumentStatus) => {
    switch (status) {
      case 'signed': return t('documents.signed', 'Signed');
      case 'viewed': return t('documents.viewed', 'Viewed');
      case 'new': return t('documents.new', 'New');
      case 'pending': return t('documents.pending', 'Pending');
    }
  };

  const renderActionDocument = (doc: ActionDocument) => {
    const typeColor = getTypeColor(doc.type);
    return (
      <View key={doc.id} style={styles.actionCard}>
        <View style={styles.actionTop}>
          <View style={[styles.actionIconBg, { backgroundColor: colors.error + '15' }]}>
            <EditIcon size={20} color={colors.error} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionName}>{doc.name}</Text>
            <View style={styles.actionMeta}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>{doc.type}</Text>
              </View>
              <Text style={styles.dueDate}>
                {t('documents.dueBy', 'Due by')} {doc.dueDate}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.signButton}>
          <EditIcon size={16} color={colors.background} />
          <Text style={styles.signButtonText}>{t('documents.signNow', 'Sign Now')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMyDocument = (doc: MyDocument) => {
    const statusColor = getStatusColor(doc.status);
    const StatusIcon = getStatusIcon(doc.status);
    return (
      <TouchableOpacity key={doc.id} style={styles.documentCard}>
        <View style={[styles.docIconBg, { backgroundColor: colors.slate100 }]}>
          <FileTextIcon size={20} color={colors.slate600} />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName}>{doc.name}</Text>
          <Text style={styles.docDate}>{doc.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <StatusIcon size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusLabel(doc.status)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCompanyPolicy = (policy: CompanyPolicy) => {
    const isExpanded = expandedPolicy === policy.id;
    return (
      <View key={policy.id} style={styles.policyCard}>
        <TouchableOpacity
          style={styles.policyHeader}
          onPress={() => togglePolicy(policy.id)}
        >
          <View style={[styles.policyIconBg, { backgroundColor: colors.momentum + '15' }]}>
            <ShieldIcon size={18} color={colors.momentum} />
          </View>
          <Text style={styles.policyName}>{policy.name}</Text>
          <View style={[styles.chevronContainer, isExpanded && styles.chevronExpanded]}>
            <ChevronRightIcon size={18} color={colors.slate400} />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.policyBody}>
            <Text style={styles.policyDescription}>{policy.description}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('documents.title', 'Documents')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Action Required */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <AlertCircleIcon size={20} color={colors.error} />
              <Text style={styles.sectionTitle}>
                {t('documents.actionRequired', 'Action Required')}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{ACTION_DOCUMENTS.length}</Text>
            </View>
          </View>
          {ACTION_DOCUMENTS.map(renderActionDocument)}
        </View>

        {/* My Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('documents.myDocuments', 'My Documents')}
            </Text>
            <Text style={styles.sectionCount}>
              {MY_DOCUMENTS.length} {t('documents.files', 'files')}
            </Text>
          </View>
          <View style={styles.documentsGroup}>
            {MY_DOCUMENTS.map((doc, index) => (
              <View key={doc.id}>
                {renderMyDocument(doc)}
                {index < MY_DOCUMENTS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Company Policies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('documents.companyPolicies', 'Company Policies')}
            </Text>
          </View>
          {COMPANY_POLICIES.map(renderCompanyPolicy)}
        </View>

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

  // Content
  content: {
    flex: 1,
  },

  // Sections
  section: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '800',
    fontSize: 11,
  },

  // Action Required Card
  actionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    ...shadows.sm,
  },
  actionTop: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  actionInfo: {
    flex: 1,
  },
  actionName: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginBottom: spacing.xs,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    ...typography.small,
    fontWeight: '700',
  },
  dueDate: {
    ...typography.caption,
    color: colors.slate500,
  },

  // Sign Button
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  signButtonText: {
    ...typography.bodyBold,
    color: colors.background,
  },

  // My Documents List
  documentsGroup: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
    overflow: 'hidden',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  docIconBg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    ...typography.bodyBold,
    color: colors.slate900,
    fontSize: 15,
  },
  docDate: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.small,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginHorizontal: spacing.md,
  },

  // Company Policy Card
  policyCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  policyIconBg: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  policyName: {
    ...typography.bodyBold,
    color: colors.slate900,
    flex: 1,
    fontSize: 15,
  },
  chevronContainer: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  policyBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: spacing.md,
  },
  policyDescription: {
    ...typography.body,
    color: colors.slate600,
    lineHeight: 22,
  },
});
