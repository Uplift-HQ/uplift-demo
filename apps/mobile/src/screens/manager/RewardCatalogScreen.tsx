import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { api } from '../../services/api';
import { showAlert } from '../../utils/alert';
import {
  ChevronLeftIcon,
  GiftIcon,
  PlusIcon,
  EditIcon,
  XIcon,
  CheckIcon,
  UserIcon,
} from '../../components/Icons';

interface Reward {
  id: string;
  name: string;
  description: string;
  category: 'extra_pto' | 'preferred_shift' | 'gift_card' | 'recognition' | 'other';
  pointsCost: number;
  quantityAvailable: number;
  isActive: boolean;
}

interface Redemption {
  id: string;
  employeeId: string;
  employeeName: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const RewardCatalogScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'catalog' | 'approvals'>('catalog');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'gift_card' as Reward['category'],
    pointsCost: '',
    quantityAvailable: '',
  });

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRedemption, setRejectingRedemption] = useState<Redemption | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch data
  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getRewardCatalog();
      setRewards((response.rewards || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        category: r.category || 'other',
        pointsCost: r.points_cost || r.pointsCost || 0,
        quantityAvailable: r.quantity_available ?? r.quantityAvailable ?? 0,
        isActive: r.is_active ?? r.isActive ?? true,
      })));
    } catch (error) {
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRedemptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getPendingRedemptions();
      setRedemptions((response.redemptions || []).map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id || r.employeeId,
        employeeName: r.first_name ? `${r.first_name} ${r.last_name}` : (r.employeeName || 'Unknown'),
        rewardId: r.reward_id || r.rewardId,
        rewardName: r.reward_name || r.rewardName || '',
        pointsSpent: r.points_spent || r.pointsSpent || 0,
        requestedAt: r.created_at || r.requestedAt || '',
        status: r.status || 'pending',
      })));
    } catch (error) {
      showAlert('Error', 'Failed to load pending redemptions');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'catalog') {
      await fetchRewards();
    } else {
      await fetchRedemptions();
    }
    setRefreshing(false);
  }, [activeTab, fetchRewards, fetchRedemptions]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchRewards();
    } else {
      fetchRedemptions();
    }
  }, [activeTab, fetchRewards, fetchRedemptions]);

  // Form handlers
  const openAddForm = () => {
    setEditingReward(null);
    setFormData({
      name: '',
      description: '',
      category: 'gift_card',
      pointsCost: '',
      quantityAvailable: '',
    });
    setShowForm(true);
  };

  const openEditForm = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description,
      category: reward.category,
      pointsCost: reward.pointsCost.toString(),
      quantityAvailable: reward.quantityAvailable.toString(),
    });
    setShowForm(true);
  };

  const handleSaveReward = async () => {
    if (!formData.name || !formData.pointsCost || !formData.quantityAvailable) {
      showAlert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      const rewardData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        pointsCost: parseInt(formData.pointsCost, 10),
        quantityAvailable: parseInt(formData.quantityAvailable, 10),
      };

      if (editingReward) {
        // Placeholder - replace with actual API call
        await api.updateReward(editingReward.id, rewardData);
        showAlert('Success', 'Reward updated successfully');
      } else {
        await api.createReward(rewardData);
        showAlert('Success', 'Reward created successfully');
      }

      setShowForm(false);
      fetchRewards();
    } catch (error) {
      showAlert('Error', 'Failed to save reward');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReward = (reward: Reward) => {
    showAlert(
      'Delete Reward',
      `Are you sure you want to delete "${reward.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await api.deleteReward(reward.id);
              showAlert('Success', 'Reward deleted successfully');
              fetchRewards();
            } catch (error) {
              showAlert('Error', 'Failed to delete reward');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (reward: Reward) => {
    try {
      setIsSubmitting(true);
      await api.updateReward(reward.id, { isActive: !reward.isActive });
      showAlert('Success', `Reward ${!reward.isActive ? 'activated' : 'deactivated'}`);
      fetchRewards();
    } catch (error) {
      showAlert('Error', 'Failed to update reward');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redemption handlers
  const handleApproveRedemption = async (redemption: Redemption) => {
    showAlert(
      'Approve Redemption',
      `Approve ${redemption.employeeName}'s redemption for "${redemption.rewardName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await api.approveRedemption(redemption.id);
              showAlert('Success', 'Redemption approved');
              fetchRedemptions();
            } catch (error) {
              showAlert('Error', 'Failed to approve redemption');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectRedemption = (redemption: Redemption) => {
    setRejectingRedemption(redemption);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmRejectRedemption = async () => {
    if (!rejectingRedemption) return;
    try {
      setIsSubmitting(true);
      await api.rejectRedemption(rejectingRedemption.id, rejectReason || 'No reason provided');
      showAlert('Success', 'Redemption rejected');
      setShowRejectModal(false);
      setRejectingRedemption(null);
      fetchRedemptions();
    } catch (error) {
      showAlert('Error', 'Failed to reject redemption');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (category: Reward['category']) => {
    switch (category) {
      case 'extra_pto':
        return 'Extra PTO';
      case 'preferred_shift':
        return 'Preferred Shift';
      case 'gift_card':
        return 'Gift Card';
      case 'recognition':
        return 'Recognition';
      case 'other':
        return 'Other';
    }
  };

  const getCategoryColor = (category: Reward['category']) => {
    switch (category) {
      case 'extra_pto':
        return colors.info;
      case 'preferred_shift':
        return colors.success;
      case 'gift_card':
        return colors.warning;
      case 'recognition':
        return colors.momentum;
      case 'other':
        return colors.slate400;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeftIcon size={24} color={colors.background} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('screens.rewardCatalog.reward_catalog')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'catalog' && styles.tabActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>
            Catalog
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'approvals' && styles.tabActive]}
          onPress={() => setActiveTab('approvals')}
        >
          <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>
            Pending Approvals
          </Text>
          {redemptions.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{redemptions.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {(loading || isSubmitting) && (
          <ActivityIndicator size="small" color={colors.momentum} style={{ marginBottom: spacing.md }} />
        )}

        {activeTab === 'catalog' ? (
          // Catalog Tab
          <>
            {rewards.length === 0 ? (
              <View style={styles.emptyState}>
                <GiftIcon size={48} color={colors.slate300} />
                <Text style={styles.emptyTitle}>{t('screens.rewardCatalog.no_rewards_yet')}</Text>
                <Text style={styles.emptyText}>{t('screens.rewardCatalog.add_your_first_reward_to_get_started')}</Text>
              </View>
            ) : (
              rewards.map((reward) => (
                <View key={reward.id} style={styles.rewardCard}>
                  <View style={styles.rewardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardName}>{reward.name}</Text>
                      <Text style={styles.rewardDescription}>{reward.description}</Text>
                      <View style={styles.rewardMeta}>
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: getCategoryColor(reward.category) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryText,
                              { color: getCategoryColor(reward.category) },
                            ]}
                          >
                            {getCategoryLabel(reward.category)}
                          </Text>
                        </View>
                        <Text style={styles.pointsCost}>{reward.pointsCost} pts</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditForm(reward)}
                    >
                      <EditIcon size={20} color={colors.momentum} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.rewardFooter}>
                    <Text style={styles.quantityText}>
                      {reward.quantityAvailable} available
                    </Text>
                    <View style={styles.rewardActions}>
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          reward.isActive ? styles.toggleButtonActive : styles.toggleButtonInactive,
                        ]}
                        onPress={() => handleToggleActive(reward)}
                      >
                        <Text
                          style={[
                            styles.toggleButtonText,
                            reward.isActive
                              ? styles.toggleButtonTextActive
                              : styles.toggleButtonTextInactive,
                          ]}
                        >
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteReward(reward)}
                      >
                        <XIcon size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          // Pending Approvals Tab
          <>
            {redemptions.length === 0 ? (
              <View style={styles.emptyState}>
                <CheckIcon size={48} color={colors.success} />
                <Text style={styles.emptyTitle}>{t('screens.rewardCatalog.all_caught_up')}</Text>
                <Text style={styles.emptyText}>{t('screens.rewardCatalog.no_pending_redemptions')}</Text>
              </View>
            ) : (
              redemptions.map((redemption) => (
                <View key={redemption.id} style={styles.redemptionCard}>
                  <View style={styles.redemptionHeader}>
                    <View style={styles.employeeIcon}>
                      <UserIcon size={20} color={colors.momentum} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.employeeName}>{redemption.employeeName}</Text>
                      <Text style={styles.rewardName}>{redemption.rewardName}</Text>
                      <Text style={styles.redemptionDate}>
                        Requested {formatDate(redemption.requestedAt)}
                      </Text>
                    </View>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsBadgeText}>{redemption.pointsSpent} pts</Text>
                    </View>
                  </View>

                  <View style={styles.redemptionActions}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectRedemption(redemption)}
                    >
                      <XIcon size={18} color={colors.error} />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveRedemption(redemption)}
                    >
                      <CheckIcon size={18} color={colors.background} />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB - Add Reward (only shown on Catalog tab) */}
      {activeTab === 'catalog' && (
        <TouchableOpacity style={styles.fab} onPress={openAddForm}>
          <PlusIcon size={24} color={colors.background} />
        </TouchableOpacity>
      )}

      {/* Add/Edit Reward Modal */}
      <Modal visible={showForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReward ? 'Edit Reward' : 'Add Reward'}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <XIcon size={24} color={colors.slate700} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g., £50 Amazon Gift Card"
                placeholderTextColor={colors.slate400}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Brief description of the reward"
                placeholderTextColor={colors.slate400}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>Category *</Text>
              <View style={styles.categoryGrid}>
                {(['extra_pto', 'preferred_shift', 'gift_card', 'recognition', 'other'] as const).map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        formData.category === cat && styles.categoryOptionActive,
                        { borderColor: getCategoryColor(cat) },
                      ]}
                      onPress={() => setFormData({ ...formData, category: cat })}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          formData.category === cat && styles.categoryOptionTextActive,
                          { color: getCategoryColor(cat) },
                        ]}
                      >
                        {getCategoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.fieldLabel}>Points Cost *</Text>
              <TextInput
                style={styles.input}
                value={formData.pointsCost}
                onChangeText={(text) => setFormData({ ...formData, pointsCost: text.replace(/[^0-9]/g, '') })}
                placeholder="e.g., 300"
                placeholderTextColor={colors.slate400}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Quantity Available *</Text>
              <TextInput
                style={styles.input}
                value={formData.quantityAvailable}
                onChangeText={(text) =>
                  setFormData({ ...formData, quantityAvailable: text.replace(/[^0-9]/g, '') })
                }
                placeholder="e.g., 25"
                placeholderTextColor={colors.slate400}
                keyboardType="numeric"
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveReward}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject Redemption Modal */}
      <Modal visible={showRejectModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Redemption</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <XIcon size={24} color={colors.slate700} />
              </TouchableOpacity>
            </View>

            <View style={styles.formScroll}>
              <Text style={styles.fieldLabel}>
                Provide a reason for rejecting {rejectingRedemption?.employeeName}'s request:
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Enter rejection reason..."
                placeholderTextColor={colors.slate400}
                multiline
                numberOfLines={3}
                autoFocus
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowRejectModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.error }]}
                  onPress={confirmRejectRedemption}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={styles.saveButtonText}>Reject</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    backgroundColor: '#1F2937',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: -spacing.sm,
  },
  title: { ...typography.h1, color: colors.background, fontSize: 24 },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.momentum,
  },
  tabText: { ...typography.bodyBold, color: colors.slate500, fontSize: 15 },
  tabTextActive: { color: colors.momentum },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: { ...typography.small, color: colors.background, fontWeight: '700', fontSize: 11 },

  // Content
  content: { flex: 1, padding: spacing.lg },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: { ...typography.h2, color: colors.slate900, marginTop: spacing.lg },
  emptyText: { ...typography.body, color: colors.slate500, marginTop: spacing.sm },

  // Reward Card
  rewardCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  rewardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rewardName: { ...typography.bodyBold, color: colors.slate900, fontSize: 16 },
  rewardDescription: { ...typography.body, color: colors.slate600, fontSize: 14, marginTop: 4 },
  rewardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: { ...typography.caption, fontWeight: '600', fontSize: 12 },
  pointsCost: { ...typography.bodyBold, color: colors.momentum, fontSize: 14 },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.momentum + '15',
    borderRadius: borderRadius.lg,
  },
  rewardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  quantityText: { ...typography.body, color: colors.slate500, fontSize: 14 },
  rewardActions: { flexDirection: 'row', gap: spacing.sm },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  toggleButtonActive: { backgroundColor: colors.success + '20' },
  toggleButtonInactive: { backgroundColor: colors.slate200 },
  toggleButtonText: { ...typography.bodyBold, fontSize: 13 },
  toggleButtonTextActive: { color: colors.success },
  toggleButtonTextInactive: { color: colors.slate500 },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.lg,
  },

  // Redemption Card
  redemptionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  redemptionHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  employeeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.momentum + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeName: { ...typography.bodyBold, color: colors.slate900, fontSize: 16 },
  redemptionDate: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  pointsBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.momentum + '20',
    borderRadius: borderRadius.lg,
    height: 28,
    justifyContent: 'center',
  },
  pointsBadgeText: { ...typography.bodyBold, color: colors.momentum, fontSize: 13 },
  redemptionActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.error + '15',
  },
  rejectButtonText: { ...typography.bodyBold, color: colors.error },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.success,
  },
  approveButtonText: { ...typography.bodyBold, color: colors.background },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.momentum,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  modalTitle: { ...typography.h2, color: colors.slate900, fontSize: 20 },
  formScroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  fieldLabel: {
    ...typography.bodyBold,
    color: colors.slate700,
    fontSize: 14,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.slate900,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    backgroundColor: colors.background,
  },
  categoryOptionActive: {
    backgroundColor: colors.slate50,
  },
  categoryOptionText: { ...typography.bodyBold, fontSize: 13 },
  categoryOptionTextActive: { fontWeight: '700' },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.slate200,
    alignItems: 'center',
  },
  cancelButtonText: { ...typography.bodyBold, color: colors.slate700 },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.momentum,
    alignItems: 'center',
  },
  saveButtonText: { ...typography.bodyBold, color: colors.background },
});
