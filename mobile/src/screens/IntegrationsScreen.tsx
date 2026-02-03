import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, ChevronRightIcon, RefreshCwIcon, AlertCircleIcon } from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { showAlert } from '../utils/alert';
import { useIntegrations } from '../hooks/useData';
import { api } from '../services/api';

// Integration data structure
interface Integration {
  id: string;
  name: string;
  initial: string;
  color: string;
  connected: boolean;
  lastSynced?: string;
  categoryId?: string;
}

interface IntegrationCategory {
  id: string;
  titleKey: string;
  integrations: Integration[];
}

// Group flat integrations list into categories
function groupByCategory(integrations: any[]): IntegrationCategory[] {
  const categoryMap: Record<string, IntegrationCategory> = {};
  const categoryOrder: string[] = [];

  for (const item of integrations) {
    const catId = item.categoryId || 'other';
    if (!categoryMap[catId]) {
      categoryMap[catId] = {
        id: catId,
        titleKey: `integrations.categories.${catId}`,
        integrations: [],
      };
      categoryOrder.push(catId);
    }
    categoryMap[catId].integrations.push(item);
  }

  return categoryOrder.map((id) => categoryMap[id]);
}

export const IntegrationsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useIntegrations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const categories = data ? groupByCategory(data.integrations) : [];

  const handleConnect = useCallback((integrationId: string) => {
    showAlert(
      t('integrations.connectTitle'),
      t('integrations.connectMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('integrations.connect'),
          onPress: async () => {
            try {
              setActionLoading(integrationId);
              await api.connectIntegration(integrationId);
              refetch();
            } catch (e: any) {
              showAlert(t('common.error'), e.message || t('common.somethingWentWrong'));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, [t, refetch]);

  const handleDisconnect = useCallback((integrationId: string, integrationName: string) => {
    showAlert(
      t('integrations.disconnectTitle'),
      t('integrations.disconnectMessage', { name: integrationName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('integrations.disconnect'),
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(integrationId);
              await api.disconnectIntegration(integrationId);
              refetch();
            } catch (e: any) {
              showAlert(t('common.error'), e.message || t('common.somethingWentWrong'));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, [t, refetch]);

  const handleSync = (integrationName: string) => {
    showAlert(
      t('integrations.syncStarted'),
      t('integrations.syncMessage', { name: integrationName })
    );
  };

  const renderIntegrationCard = (integration: Integration) => {
    const isActionLoading = actionLoading === integration.id;

    return (
      <View key={integration.id} style={styles.integrationCard}>
        <View style={styles.integrationLeft}>
          <View style={[styles.integrationLogo, { backgroundColor: integration.color }]}>
            <Text style={styles.integrationInitial}>{integration.initial}</Text>
          </View>
          <View style={styles.integrationInfo}>
            <Text style={styles.integrationName}>{integration.name}</Text>
            {integration.connected ? (
              <View style={styles.connectedRow}>
                <CheckCircleIcon size={14} color={colors.success} />
                <Text style={styles.connectedText}>{t('integrations.connected')}</Text>
                {integration.lastSynced && (
                  <Text style={styles.lastSyncedText}>
                    {t('integrations.lastSynced', { time: integration.lastSynced })}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.notConnectedText}>{t('integrations.notConnected')}</Text>
            )}
          </View>
        </View>
        <View style={styles.integrationActions}>
          {isActionLoading ? (
            <ActivityIndicator size="small" color={colors.momentum} />
          ) : integration.connected ? (
            <>
              <TouchableOpacity
                style={styles.syncButton}
                onPress={() => handleSync(integration.name)}
              >
                <RefreshCwIcon size={16} color={colors.momentum} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => handleDisconnect(integration.id, integration.name)}
              >
                <Text style={styles.manageButtonText}>{t('integrations.manage')}</Text>
                <ChevronRightIcon size={16} color={colors.slate600} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => handleConnect(integration.id)}
            >
              <Text style={styles.connectButtonText}>{t('integrations.connect')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderCategory = (category: IntegrationCategory) => (
    <View key={category.id} style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{t(category.titleKey)}</Text>
      <View style={styles.categoryCards}>
        {category.integrations.map((integration) =>
          renderIntegrationCard(integration)
        )}
      </View>
    </View>
  );

  const connectedCount = categories.reduce(
    (total, cat) => total + cat.integrations.filter((int) => int.connected).length,
    0
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.integrations.connected_apps')}</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {connectedCount} integrations connected
        </Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconWrapper}>
          <AlertCircleIcon size={20} color={colors.info} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>{t('integrations.infoTitle')}</Text>
          <Text style={styles.infoText}>{t('integrations.infoText')}</Text>
        </View>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.momentum} />
          <Text style={styles.stateText}>{t('common.loading')}</Text>
        </View>
      )}

      {/* Error State */}
      {!loading && error && (
        <View style={styles.centeredState}>
          <AlertCircleIcon size={32} color={colors.error} />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {!loading && !error && categories.length === 0 && (
        <View style={styles.centeredState}>
          <Text style={styles.stateText}>{t('integrations.noIntegrations')}</Text>
        </View>
      )}

      {/* Integration Categories */}
      {!loading && !error && categories.map(renderCategory)}

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
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
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  infoIconWrapper: {
    marginEnd: spacing.md,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.bodyBold,
    color: colors.info,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.slate700,
    lineHeight: 20,
  },
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  stateText: {
    ...typography.body,
    color: colors.slate600,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.momentum,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  categorySection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  categoryTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  categoryCards: {
    gap: spacing.sm,
  },
  integrationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  integrationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  integrationLogo: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  integrationInitial: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  connectedText: {
    ...typography.small,
    color: colors.success,
    marginStart: spacing.xs,
    fontWeight: '600',
  },
  lastSyncedText: {
    ...typography.small,
    color: colors.slate500,
    marginStart: spacing.sm,
  },
  notConnectedText: {
    ...typography.small,
    color: colors.slate500,
    marginTop: spacing.xs,
  },
  integrationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncButton: {
    padding: spacing.sm,
    backgroundColor: colors.momentum + '15',
    borderRadius: borderRadius.md,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  manageButtonText: {
    ...typography.caption,
    color: colors.slate600,
    marginEnd: spacing.xs,
  },
  connectButton: {
    backgroundColor: colors.momentum,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  connectButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default IntegrationsScreen;
