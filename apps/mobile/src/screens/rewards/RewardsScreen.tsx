import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useBranding } from '../../contexts/BrandingContext';
import { useGamificationStats, useAffiliateOffers, useRewardCatalog, useMyRedemptions } from '../../hooks/useData';
import { api } from '../../services/api';
import {
  GiftIcon,
  StarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PercentIcon,
  TrendingUpIcon,
  AwardIcon,
  SparklesIcon,
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { showAlert } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // 2 cards per row with gaps

// Brand Logo Component - Simple and robust
const BrandLogo = ({
  uri,
  brandName,
  brandColor,
  size = 60,
}: {
  uri: string;
  brandName: string;
  brandColor: string;
  size?: number;
}) => {
  const [showImage, setShowImage] = useState(true);

  const initials = brandName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Reset when URI changes
  useEffect(() => {
    setShowImage(!!uri);
  }, [uri]);

  // If no URI, show fallback immediately
  if (!uri || !showImage) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          backgroundColor: brandColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: size * 0.35,
            fontWeight: '800',
          }}
        >
          {initials}
        </Text>
      </View>
    );
  }

  // Show image with fallback background
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}
    >
      <Image
        source={{ uri }}
        style={{
          width: size - 8,
          height: size - 8,
        }}
        resizeMode="contain"
        onError={() => {
          setShowImage(false);
        }}
      />
    </View>
  );
};


interface Perk {
  id: string;
  brand: string;
  discount: string;
  discountColor: string;
  description: string;
  category: string;
  isNew?: boolean;
  isFeatured?: boolean;
  pointsCost?: number;
  affiliateUrl?: string;
  logoUrl?: string;
  brandColor?: string;
}


const CATEGORIES = [
  { key: 'all', label: 'All', icon: SparklesIcon },
  { key: 'dining', label: 'Dining', icon: null },
  { key: 'shopping', label: 'Shopping', icon: null },
  { key: 'entertainment', label: 'Entertainment', icon: null },
  { key: 'travel', label: 'Travel', icon: null },
  { key: 'wellbeing', label: 'Fitness', icon: null },
];

export const RewardsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { branding } = useBranding();
  const [activeTab, setActiveTab] = useState<'perks' | 'redeem'>('perks');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch real data from API
  const { data: stats, loading: statsLoading } = useGamificationStats();
  const { data: offersData } = useAffiliateOffers();
  const { data: catalogData } = useRewardCatalog();

  // User data - wire points to API
  const userPoints = stats?.totalPoints ?? 0;
  const totalSaved = 848;
  const level = stats?.level ?? 3;
  const LEVEL_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const currentLevelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] || 'Gold';
  const nextLevelName = LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)] || 'Platinum';
  const currentXP = stats?.currentXP ?? 0;
  const nextLevelXP = stats?.nextLevelXP ?? 500;
  const pointsToNextLevel = nextLevelXP - currentXP;
  const levelProgress = nextLevelXP > 0 ? Math.round((currentXP / nextLevelXP) * 100) : 0;
  const companyName = (user as any)?.companyName || branding.brandName || 'Your Company';

  // Map affiliate offers to Perk format from API
  const affiliatePerks: Perk[] = (offersData?.offers || []).map((o: any) => ({
    id: o.id,
    brand: o.brand,
    discount: o.discount_text || o.discountText || '',
    discountColor: '#22C55E',
    description: o.description || '',
    category: o.category || 'shopping',
    isNew: false,
    isFeatured: o.is_featured || o.isFeatured || false,
    affiliateUrl: o.affiliate_url || o.affiliateUrl,
    logoUrl: o.logo_url || o.logoUrl || '',
    brandColor: colors.momentum,
  }));

  // Map reward catalog to Perk format from API
  const redeemPerks: Perk[] = (catalogData?.rewards || []).map((r: any) => ({
    id: r.id,
    brand: r.name,
    discount: `${r.points_cost || r.pointsCost} PTS`,
    discountColor: colors.momentum,
    description: r.description || '',
    category: r.category || 'other',
    pointsCost: r.points_cost || r.pointsCost,
    brandColor: colors.momentum,
  }));

  // Filter perks based on both tab and category
  const getFilteredPerks = () => {
    let perks = activeTab === 'perks' ? affiliatePerks : redeemPerks;

    if (selectedCategory !== 'all') {
      perks = perks.filter((p) => p.category === selectedCategory);
    }

    return perks;
  };

  const featuredPerks = affiliatePerks.filter((p) => p.isFeatured);
  const filteredPerks = getFilteredPerks();

  const handleClaimPerk = (perk: Perk) => {
    // Affiliate offer — open URL directly
    if (perk.affiliateUrl) {
      Linking.openURL(perk.affiliateUrl).catch(() => {
        showAlert('Error', 'Could not open link.');
      });
      return;
    }

    if (perk.pointsCost && perk.pointsCost > userPoints) {
      showAlert(
        'Not Enough Points',
        `You need ${perk.pointsCost - userPoints} more points to claim this offer.`
      );
      return;
    }

    if (perk.pointsCost) {
      // Redeem via API
      showAlert(
        `Redeem ${perk.brand}`,
        `Spend ${perk.pointsCost} points to redeem "${perk.brand}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Redeem',
            onPress: async () => {
              try {
                await api.redeemReward(perk.id);
                showAlert('Redeemed!', 'Your redemption is pending manager approval.');
              } catch (e: any) {
                showAlert('Error', e.message || 'Redemption failed.');
              }
            },
          },
        ]
      );
      return;
    }

    // Open affiliate link or show info
    showAlert(
      `${perk.brand} Offer`,
      `${perk.discount} — ${perk.description}`
    );
  };

  // Featured Card Component
  const FeaturedCard = ({ perk }: { perk: Perk }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleClaimPerk(perk)}
      activeOpacity={0.9}
    >
      {perk.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>{t('screens.rewards.new')}</Text>
        </View>
      )}
      <View style={[styles.discountBadge, { backgroundColor: perk.discountColor }]}>
        <Text style={styles.discountText}>{perk.discount}</Text>
      </View>
      <View style={styles.logoContainer}>
        <BrandLogo
          uri={perk.logoUrl || ''}
          brandName={perk.brand}
          brandColor={perk.brandColor || colors.momentum}
          size={64}
        />
      </View>
      <Text style={styles.featuredBrandName}>{perk.brand}</Text>
      <Text style={styles.featuredDescription} numberOfLines={2}>
        {perk.description}
      </Text>
      <TouchableOpacity
        style={styles.getPerkButton}
        onPress={() => handleClaimPerk(perk)}
      >
        <Text style={styles.getPerkButtonText}>{t('screens.rewards.get_perk')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // List Card Component
  const PerkCard = ({ perk }: { perk: Perk }) => (
    <TouchableOpacity
      style={styles.perkCard}
      onPress={() => handleClaimPerk(perk)}
      activeOpacity={0.9}
    >
      {perk.isNew && (
        <View style={[styles.newBadge, { left: 12 }]}>
          <Text style={styles.newBadgeText}>{t('screens.rewards.new')}</Text>
        </View>
      )}
      <View style={styles.perkCardContent}>
        <BrandLogo
          uri={perk.logoUrl || ''}
          brandName={perk.brand}
          brandColor={perk.brandColor || colors.momentum}
          size={56}
        />
        <View style={styles.perkInfo}>
          <Text style={styles.perkBrandName}>{perk.brand}</Text>
          <Text style={styles.perkDescription} numberOfLines={2}>
            {perk.description}
          </Text>
          {perk.pointsCost && (
            <View style={styles.pointsCostBadge}>
              <StarIcon size={12} color={colors.momentum} />
              <Text style={styles.pointsCostText}>{perk.pointsCost} pts</Text>
            </View>
          )}
        </View>
        <View style={styles.perkAction}>
          <View style={[styles.discountBadgeSmall, { backgroundColor: perk.discountColor }]}>
            <Text style={styles.discountTextSmall}>{perk.discount}</Text>
          </View>
          <ChevronRightIcon size={20} color={colors.slate400} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Dark Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rewards</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.companyPerks}>{companyName} Perks</Text>

        {/* Tier Card */}
        <View style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <View style={styles.tierBadge}>
              <AwardIcon size={20} color="#FCD34D" />
              <Text style={styles.tierName}>{currentLevelName}</Text>
            </View>
            <Text style={styles.tierLevel}>Level {level}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${levelProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {pointsToNextLevel} pts to {nextLevelName}
          </Text>
        </View>

        {/* Loading indicator */}
        {statsLoading && (
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginBottom: 8 }} />
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconBg}>
              <StarIcon size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.statNumber}>{userPoints.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{t('screens.rewards.available_points')}</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success }]}>
            <View style={[styles.statIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <TrendingUpIcon size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.statNumber}>£{totalSaved}</Text>
              <Text style={styles.statLabel}>{t('screens.rewards.total_saved')}</Text>
            </View>
          </View>
        </View>

        {/* Main Tabs */}
        <View style={styles.mainTabs}>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === 'perks' && styles.mainTabActive]}
            onPress={() => setActiveTab('perks')}
          >
            <PercentIcon
              size={18}
              color={activeTab === 'perks' ? '#FFFFFF' : colors.slate500}
            />
            <Text
              style={[
                styles.mainTabText,
                activeTab === 'perks' && styles.mainTabTextActive,
              ]}
            >
              Perks & Discounts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === 'redeem' && styles.mainTabActive]}
            onPress={() => setActiveTab('redeem')}
          >
            <GiftIcon
              size={18}
              color={activeTab === 'redeem' ? '#FFFFFF' : colors.slate500}
            />
            <Text
              style={[
                styles.mainTabText,
                activeTab === 'redeem' && styles.mainTabTextActive,
              ]}
            >
              Redeem Points
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabs}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryTab,
                selectedCategory === cat.key && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === cat.key && styles.categoryTabTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Featured Section */}
        {selectedCategory === 'all' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('screens.rewards.featured_offers')}</Text>
              <View style={styles.perkCountBadge}>
                <Text style={styles.perkCountText}>{affiliatePerks.length}+ perks</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredPerks.map((perk) => (
                <FeaturedCard key={perk.id} perk={perk} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Perks List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'redeem'
              ? 'Redeem with Points'
              : selectedCategory === 'all'
                ? 'All Perks & Discounts'
                : CATEGORIES.find((c) => c.key === selectedCategory)?.label || 'Perks'}
          </Text>
          {filteredPerks.length === 0 ? (
            <View style={styles.emptyState}>
              <GiftIcon size={48} color={colors.slate300} />
              <Text style={styles.emptyStateTitle}>
                {activeTab === 'redeem'
                  ? 'No redeemable rewards in this category'
                  : 'No perks in this category'}
              </Text>
              <Text style={styles.emptyStateText}>
                {activeTab === 'redeem'
                  ? 'Try selecting "All" or a different category'
                  : 'Check back soon for new offers!'}
              </Text>
            </View>
          ) : (
            filteredPerks.map((perk) => (
              <PerkCard key={perk.id} perk={perk} />
            ))
          )}
        </View>

        {/* How to Earn */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('screens.rewards.how_to_earn_points')}</Text>
          <View style={styles.infoItem}>
            <CheckCircleIcon size={18} color={colors.success} />
            <Text style={styles.infoText}>Complete shifts on time (+50 pts)</Text>
          </View>
          <View style={styles.infoItem}>
            <CheckCircleIcon size={18} color={colors.success} />
            <Text style={styles.infoText}>Maintain weekly streaks (+100 pts)</Text>
          </View>
          <View style={styles.infoItem}>
            <CheckCircleIcon size={18} color={colors.success} />
            <Text style={styles.infoText}>Get peer recognition (+25 pts)</Text>
          </View>
          <View style={styles.infoItem}>
            <CheckCircleIcon size={18} color={colors.success} />
            <Text style={styles.infoText}>Complete training modules (+100 pts)</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header - Dark theme like Perkbox
  header: {
    backgroundColor: '#1F2937',
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    color: colors.momentum,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  companyPerks: {
    color: colors.momentum,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Tier Card
  tierCard: {
    backgroundColor: '#374151',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierName: {
    color: '#FCD34D',
    fontSize: 18,
    fontWeight: '700',
  },
  tierLevel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#4B5563',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FCD34D',
    borderRadius: 4,
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.momentum,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },

  // Main Tabs
  mainTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#374151',
    borderRadius: 10,
  },
  mainTabActive: {
    backgroundColor: colors.momentum,
  },
  mainTabText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  mainTabTextActive: {
    color: '#FFFFFF',
  },

  // Category Tabs
  categoryWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryTabs: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryTabActive: {
    backgroundColor: colors.momentum,
    borderColor: colors.momentum,
  },
  categoryTabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  perkCountBadge: {
    backgroundColor: colors.momentum + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  perkCountText: {
    color: colors.momentum,
    fontSize: 13,
    fontWeight: '700',
  },

  // Featured Cards
  featuredScroll: {
    paddingEnd: 16,
  },
  featuredCard: {
    width: 165,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginEnd: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 1,
  },
  discountText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  featuredBrandName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  featuredDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    minHeight: 36,
  },
  getPerkButton: {
    backgroundColor: colors.momentum,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  getPerkButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Perk List Cards
  perkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  perkCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  perkInfo: {
    flex: 1,
  },
  perkBrandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  perkDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  pointsCostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: colors.momentum + '12',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pointsCostText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.momentum,
  },
  perkAction: {
    alignItems: 'flex-end',
    gap: 8,
  },
  discountBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discountTextSmall: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#EFF6FF',
    margin: 16,
    padding: 18,
    borderRadius: 14,
    borderStartWidth: 4,
    borderStartColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 14,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
