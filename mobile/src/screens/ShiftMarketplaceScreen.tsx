import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Image,
  ImageStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  DollarSignIcon,
  StarIcon,
  FilterIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  XIcon,
  TrendingUpIcon,
  UsersIcon,
  ThermometerIcon,
  NavigationIcon,
  BookmarkIcon,
  ZapIcon,
  AwardIcon,
  ShieldIcon,
  TargetIcon,
} from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useOpenShifts } from '../hooks/useData';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Skill {
  name: string;
  required: boolean;
  userHas: boolean;
  level?: 'basic' | 'intermediate' | 'advanced';
}

interface Shift {
  id: string;
  role: string;
  department: string;
  date: string;
  dateObj: Date;
  time: string;
  startTime: string;
  endTime: string;
  duration: number;
  location: string;
  locationAddress: string;
  distance: number;
  travelTime: number;
  pay: number;
  bonusPay?: number;
  matchScore: number;
  urgent: boolean;
  skills: Skill[];
  skillsMatched: number;
  skillsTotal: number;
  weather?: { temp: number; condition: string };
  manager: { name: string; avatar?: string };
  teamSize: number;
  spotsLeft: number;
  claimed?: boolean;
  bookmarked?: boolean;
}

type FilterType = 'all' | 'high_pay' | 'high_match' | 'urgent' | 'nearby' | 'bookmarked';
type SortType = 'match' | 'pay' | 'date' | 'distance';

// Shifts data with full details
const DEMO_SHIFTS: Shift[] = [
  {
    id: '1',
    role: 'Front Desk Agent',
    department: 'Front Office',
    date: 'Today',
    dateObj: new Date(),
    time: '14:00 - 22:00',
    startTime: '14:00',
    endTime: '22:00',
    duration: 8,
    location: 'Grand Metro Hotel',
    locationAddress: '123 High Street, Edinburgh EH1 1AA',
    distance: 1.2,
    travelTime: 15,
    pay: 14.50,
    bonusPay: 5.00,
    matchScore: 95,
    urgent: true,
    skills: [
      { name: 'Customer Service', required: true, userHas: true, level: 'advanced' },
      { name: 'Check-In Systems', required: true, userHas: true, level: 'intermediate' },
      { name: 'Cash Handling', required: true, userHas: true, level: 'basic' },
      { name: 'Conflict Resolution', required: false, userHas: true },
    ],
    skillsMatched: 4,
    skillsTotal: 4,
    weather: { temp: 8, condition: 'Cloudy' },
    manager: { name: 'Sarah Thompson', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    teamSize: 6,
    spotsLeft: 1,
    bookmarked: false,
  },
  {
    id: '2',
    role: 'Concierge',
    department: 'Guest Services',
    date: 'Tomorrow',
    dateObj: new Date(Date.now() + 86400000),
    time: '06:00 - 14:00',
    startTime: '06:00',
    endTime: '14:00',
    duration: 8,
    location: 'Royal Edinburgh Hotel',
    locationAddress: '45 Princes Street, Edinburgh EH2 2BY',
    distance: 2.5,
    travelTime: 22,
    pay: 15.00,
    matchScore: 88,
    urgent: false,
    skills: [
      { name: 'Guest Relations', required: true, userHas: true, level: 'advanced' },
      { name: 'Local Knowledge', required: true, userHas: true, level: 'intermediate' },
      { name: 'Booking Systems', required: true, userHas: false, level: 'basic' },
    ],
    skillsMatched: 2,
    skillsTotal: 3,
    weather: { temp: 6, condition: 'Rainy' },
    manager: { name: 'James Wilson', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
    teamSize: 4,
    spotsLeft: 2,
    bookmarked: true,
  },
  {
    id: '3',
    role: 'Night Auditor',
    department: 'Front Office',
    date: 'Friday',
    dateObj: new Date(Date.now() + 172800000),
    time: '22:00 - 06:00',
    startTime: '22:00',
    endTime: '06:00',
    duration: 8,
    location: 'Grand Metro Hotel',
    locationAddress: '123 High Street, Edinburgh EH1 1AA',
    distance: 1.2,
    travelTime: 15,
    pay: 16.50,
    bonusPay: 2.00,
    matchScore: 72,
    urgent: false,
    skills: [
      { name: 'Night Audit', required: true, userHas: false, level: 'advanced' },
      { name: 'Accounting Basics', required: true, userHas: true, level: 'intermediate' },
      { name: 'PMS Systems', required: true, userHas: true, level: 'basic' },
      { name: 'Security Awareness', required: false, userHas: true },
    ],
    skillsMatched: 3,
    skillsTotal: 4,
    weather: { temp: 4, condition: 'Clear' },
    manager: { name: 'Sarah Thompson', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    teamSize: 2,
    spotsLeft: 1,
    bookmarked: false,
  },
  {
    id: '4',
    role: 'Restaurant Server',
    department: 'Food & Beverage',
    date: 'Saturday',
    dateObj: new Date(Date.now() + 259200000),
    time: '17:00 - 23:00',
    startTime: '17:00',
    endTime: '23:00',
    duration: 6,
    location: 'The Balmoral',
    locationAddress: '1 Princes Street, Edinburgh EH2 2EQ',
    distance: 3.1,
    travelTime: 28,
    pay: 12.50,
    bonusPay: 8.00,
    matchScore: 65,
    urgent: true,
    skills: [
      { name: 'Food Service', required: true, userHas: true, level: 'basic' },
      { name: 'Wine Knowledge', required: true, userHas: false, level: 'intermediate' },
      { name: 'POS Systems', required: true, userHas: true, level: 'basic' },
    ],
    skillsMatched: 2,
    skillsTotal: 3,
    weather: { temp: 7, condition: 'Cloudy' },
    manager: { name: 'Emma Clarke', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
    teamSize: 8,
    spotsLeft: 3,
    bookmarked: false,
  },
];

export const ShiftMarketplaceScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { data: shiftsData, loading, refetch } = useOpenShifts();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('match');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set(['2']));

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Use demo data combined with API data
  const shifts: Shift[] = DEMO_SHIFTS.map(s => ({
    ...s,
    bookmarked: bookmarkedIds.has(s.id),
  }));

  const handleClaimShift = async (shift: Shift) => {
    showAlert(
      t('schedule.claimThisShift'),
      `${shift.role} on ${shift.date}\n${shift.time} at ${shift.location}\n\nEstimated earnings: £${(shift.pay * shift.duration + (shift.bonusPay || 0)).toFixed(2)}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('schedule.claimShift'),
          onPress: async () => {
            setClaimingId(shift.id);
            try {
              await api.claimOpenShift(shift.id);
              showAlert(
                t('schedule.claimSuccess'),
                t('schedule.claimSuccessMessage'),
                [{ text: t('common.ok'), onPress: () => setSelectedShift(null) }]
              );
              refetch();
            } catch (error: any) {
              showAlert(t('common.error'), error.message || t('schedule.failedToClaim'));
            } finally {
              setClaimingId(null);
            }
          },
        },
      ]
    );
  };

  const toggleBookmark = (shiftId: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  const openShiftDetail = (shift: Shift) => {
    setSelectedShift(shift);
    Animated.spring(modalSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeShiftDetail = () => {
    Animated.timing(modalSlideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSelectedShift(null));
  };

  const getMatchColor = (score: number) => {
    if (score >= 85) return colors.success;
    if (score >= 70) return colors.warning;
    return colors.slate500;
  };

  const getMatchLabel = (score: number) => {
    if (score >= 90) return t('screens.shiftMarketplace.excellentMatch');
    if (score >= 80) return t('screens.shiftMarketplace.greatMatch');
    if (score >= 70) return t('screens.shiftMarketplace.goodMatch');
    return t('screens.shiftMarketplace.partialMatch');
  };

  // Filter and sort shifts
  const filteredShifts = shifts
    .filter(s => !s.claimed)
    .filter(s => {
      if (filter === 'all') return true;
      if (filter === 'high_pay') return (s.pay + (s.bonusPay || 0) / s.duration) >= 15;
      if (filter === 'high_match') return s.matchScore >= 80;
      if (filter === 'urgent') return s.urgent;
      if (filter === 'nearby') return s.distance <= 2;
      if (filter === 'bookmarked') return s.bookmarked;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'match') return b.matchScore - a.matchScore;
      if (sortBy === 'pay') return (b.pay + (b.bonusPay || 0)) - (a.pay + (a.bonusPay || 0));
      if (sortBy === 'date') return a.dateObj.getTime() - b.dateObj.getTime();
      if (sortBy === 'distance') return a.distance - b.distance;
      return 0;
    });

  // Calculate summary stats
  const totalEarningsPotential = shifts.reduce((sum, s) => sum + (s.pay * s.duration) + (s.bonusPay || 0), 0);
  const avgMatchScore = Math.round(shifts.reduce((sum, s) => sum + s.matchScore, 0) / shifts.length);
  const urgentCount = shifts.filter(s => s.urgent).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.momentum} />
        <Text style={styles.loadingText}>{t('screens.shiftMarketplace.finding_shifts_for_you')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('schedule.availableShifts')}</Text>
            <Text style={styles.subtitle}>
              {shifts.length} shifts matching your profile
            </Text>
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FilterIcon size={22} color={colors.slate700} />
            {filter !== 'all' && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <DollarSignIcon size={16} color={colors.success} />
            <Text style={styles.statValue}>£{totalEarningsPotential.toFixed(0)}</Text>
            <Text style={styles.statLabel}>potential</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <StarIcon size={16} color={colors.warning} />
            <Text style={styles.statValue}>{avgMatchScore}%</Text>
            <Text style={styles.statLabel}>avg match</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ZapIcon size={16} color={colors.momentum} />
            <Text style={styles.statValue}>{urgentCount}</Text>
            <Text style={styles.statLabel}>urgent</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersExpanded}>
          <Text style={styles.filterSectionLabel}>{t('screens.shiftMarketplace.filter_by')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {[
              { key: 'all', label: 'All', icon: null },
              { key: 'high_match', label: 'Best Match', icon: <StarIcon size={14} color={filter === 'high_match' ? colors.background : colors.slate600} /> },
              { key: 'high_pay', label: 'High Pay', icon: <DollarSignIcon size={14} color={filter === 'high_pay' ? colors.background : colors.slate600} /> },
              { key: 'urgent', label: 'Urgent', icon: <ZapIcon size={14} color={filter === 'urgent' ? colors.background : colors.slate600} /> },
              { key: 'nearby', label: 'Nearby', icon: <MapPinIcon size={14} color={filter === 'nearby' ? colors.background : colors.slate600} /> },
              { key: 'bookmarked', label: 'Saved', icon: <BookmarkIcon size={14} color={filter === 'bookmarked' ? colors.background : colors.slate600} /> },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
                onPress={() => setFilter(f.key as FilterType)}
              >
                {f.icon}
                <Text style={[styles.filterPillText, filter === f.key && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterSectionLabel, { marginTop: spacing.md }]}>{t('screens.shiftMarketplace.sort_by')}</Text>
          <View style={styles.sortOptions}>
            {[
              { key: 'match', label: 'Best Match' },
              { key: 'pay', label: 'Highest Pay' },
              { key: 'date', label: 'Soonest' },
              { key: 'distance', label: 'Nearest' },
            ].map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sortOption, sortBy === s.key && styles.sortOptionActive]}
                onPress={() => setSortBy(s.key as SortType)}
              >
                <Text style={[styles.sortOptionText, sortBy === s.key && styles.sortOptionTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Quick Filters */}
      {!showFilters && (
        <View style={styles.quickFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: t('schedule.allShifts') },
              { key: 'high_match', label: t('schedule.bestMatch') },
              { key: 'urgent', label: t('schedule.urgent') },
              { key: 'nearby', label: 'Nearby' },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.quickFilterPill, filter === f.key && styles.quickFilterPillActive]}
                onPress={() => setFilter(f.key as FilterType)}
              >
                <Text style={[styles.quickFilterText, filter === f.key && styles.quickFilterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Shift Cards */}
      <ScrollView style={styles.shiftList} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {filteredShifts.map((shift, index) => (
            <TouchableOpacity
              key={shift.id}
              style={[styles.shiftCard, shift.urgent && styles.shiftCardUrgent]}
              onPress={() => openShiftDetail(shift)}
              activeOpacity={0.7}
            >
              {/* Urgent Banner */}
              {shift.urgent && (
                <View style={styles.urgentBanner}>
                  <ZapIcon size={14} color={colors.background} />
                  <Text style={styles.urgentText}>
                    URGENT - £{(shift.bonusPay || 0).toFixed(2)} bonus
                  </Text>
                </View>
              )}

              <View style={styles.shiftCardContent}>
                {/* Header Row */}
                <View style={styles.shiftHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shiftRole}>{shift.role}</Text>
                    <View style={styles.locationRow}>
                      <MapPinIcon size={12} color={colors.slate500} />
                      <Text style={styles.locationText}>{shift.location}</Text>
                      <Text style={styles.distanceText}>• {shift.distance} km</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.bookmarkButton}
                    onPress={() => toggleBookmark(shift.id)}
                  >
                    <BookmarkIcon
                      size={20}
                      color={shift.bookmarked ? colors.momentum : colors.slate400}
                    />
                  </TouchableOpacity>
                </View>

                {/* Match Score */}
                <View style={styles.matchContainer}>
                  <View style={[styles.matchBadge, { backgroundColor: getMatchColor(shift.matchScore) + '15' }]}>
                    <TargetIcon size={14} color={getMatchColor(shift.matchScore)} />
                    <Text style={[styles.matchScore, { color: getMatchColor(shift.matchScore) }]}>
                      {shift.matchScore}%
                    </Text>
                    <Text style={[styles.matchLabel, { color: getMatchColor(shift.matchScore) }]}>
                      {getMatchLabel(shift.matchScore)}
                    </Text>
                  </View>
                  <View style={styles.skillsPreview}>
                    <Text style={styles.skillsPreviewText}>
                      {shift.skillsMatched}/{shift.skillsTotal} skills matched
                    </Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <CalendarIcon size={14} color={colors.slate500} />
                    <Text style={styles.detailValue}>{shift.date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <ClockIcon size={14} color={colors.slate500} />
                    <Text style={styles.detailValue}>{shift.time}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <NavigationIcon size={14} color={colors.slate500} />
                    <Text style={styles.detailValue}>{shift.travelTime} min</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <UsersIcon size={14} color={colors.slate500} />
                    <Text style={styles.detailValue}>{shift.spotsLeft} spots</Text>
                  </View>
                </View>

                {/* Pay and Action */}
                <View style={styles.shiftFooter}>
                  <View style={styles.payContainer}>
                    <Text style={styles.payRate}>£{shift.pay.toFixed(2)}/hr</Text>
                    {shift.bonusPay && (
                      <Text style={styles.bonusPay}>+£{shift.bonusPay.toFixed(2)} bonus</Text>
                    )}
                    <Text style={styles.totalEarnings}>
                      Est. £{(shift.pay * shift.duration + (shift.bonusPay || 0)).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.quickClaimButton}
                    onPress={() => handleClaimShift(shift)}
                    disabled={claimingId === shift.id}
                  >
                    {claimingId === shift.id ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <>
                        <Text style={styles.quickClaimText}>{t('screens.shiftMarketplace.claim')}</Text>
                        <ChevronRightIcon size={16} color={colors.background} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Empty state */}
          {filteredShifts.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <CalendarIcon size={48} color={colors.slate300} />
              </View>
              <Text style={styles.emptyTitle}>{t('screens.shiftMarketplace.no_shifts_found')}</Text>
              <Text style={styles.emptyText}>
                {t('screens.shiftMarketplace.noShiftsText')}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setFilter('all')}
              >
                <Text style={styles.emptyButtonText}>{t('screens.shiftMarketplace.clear_filters')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* More Coming */}
          {filteredShifts.length > 0 && (
            <View style={styles.moreSection}>
              <View style={styles.moreSectionContent}>
                <Text style={styles.moreTitle}>{t('schedule.moreComingSoon')}</Text>
                <Text style={styles.moreText}>{t('schedule.notifyNewShifts')}</Text>
                <TouchableOpacity
                  style={styles.notifyButton}
                  onPress={() => showAlert(t('schedule.notificationsEnabled'), t('schedule.notificationsEnabledMessage'))}
                >
                  <Text style={styles.notifyButtonText}>{t('schedule.enableNotifications')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Shift Detail Modal */}
      <Modal
        visible={selectedShift !== null}
        transparent
        animationType="none"
        onRequestClose={closeShiftDetail}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeShiftDetail} />
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateX: modalSlideAnim }] }
            ]}
          >
            {selectedShift && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity style={styles.modalClose} onPress={closeShiftDetail}>
                    <XIcon size={24} color={colors.slate700} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalBookmark}
                    onPress={() => toggleBookmark(selectedShift.id)}
                  >
                    <BookmarkIcon
                      size={24}
                      color={selectedShift.bookmarked ? colors.momentum : colors.slate400}
                    />
                  </TouchableOpacity>
                </View>

                {/* Role Info */}
                <View style={styles.modalRoleSection}>
                  {selectedShift.urgent && (
                    <View style={styles.modalUrgentBadge}>
                      <ZapIcon size={12} color={colors.background} />
                      <Text style={styles.modalUrgentText}>{t('screens.shiftMarketplace.urgent_shift')}</Text>
                    </View>
                  )}
                  <Text style={styles.modalRole}>{selectedShift.role}</Text>
                  <Text style={styles.modalDepartment}>{selectedShift.department}</Text>
                  <View style={styles.modalLocation}>
                    <MapPinIcon size={16} color={colors.slate500} />
                    <View>
                      <Text style={styles.modalLocationName}>{selectedShift.location}</Text>
                      <Text style={styles.modalLocationAddress}>{selectedShift.locationAddress}</Text>
                    </View>
                  </View>
                </View>

                {/* Match Score Card */}
                <View style={[styles.matchCard, { backgroundColor: getMatchColor(selectedShift.matchScore) + '15' }]}>
                  <View style={styles.matchCardHeader}>
                    <TargetIcon size={24} color={getMatchColor(selectedShift.matchScore)} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.matchCardTitle, { color: getMatchColor(selectedShift.matchScore) }]}>
                        {selectedShift.matchScore}% Match
                      </Text>
                      <Text style={styles.matchCardSubtitle}>{getMatchLabel(selectedShift.matchScore)}</Text>
                    </View>
                  </View>
                  <View style={styles.matchProgress}>
                    <View style={[styles.matchProgressFill, { width: `${selectedShift.matchScore}%`, backgroundColor: getMatchColor(selectedShift.matchScore) }]} />
                  </View>
                </View>

                {/* Skills Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('screens.shiftMarketplace.skills_required')}</Text>
                  <View style={styles.skillsList}>
                    {selectedShift.skills.map((skill, i) => (
                      <View key={i} style={styles.skillItem}>
                        <View style={[
                          styles.skillStatus,
                          { backgroundColor: skill.userHas ? colors.success + '20' : colors.error + '20' }
                        ]}>
                          {skill.userHas ? (
                            <CheckCircleIcon size={16} color={colors.success} />
                          ) : (
                            <AlertCircleIcon size={16} color={colors.error} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.skillName}>{skill.name}</Text>
                          {skill.level && (
                            <Text style={styles.skillLevel}>{skill.level} level</Text>
                          )}
                        </View>
                        {skill.required && (
                          <View style={styles.requiredBadge}>
                            <Text style={styles.requiredText}>{t('common.required')}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                  {selectedShift.skillsMatched < selectedShift.skillsTotal && (
                    <TouchableOpacity style={styles.learnSkillsButton} onPress={() => showAlert(t('navigation.skills'), t('screens.shiftMarketplace.viewTrainingCourses'))}>
                      <AwardIcon size={16} color={colors.momentum} />
                      <Text style={styles.learnSkillsText}>{t('screens.shiftMarketplace.learn_missing_skills')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Schedule Details */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('screens.shiftMarketplace.schedule')}</Text>
                  <View style={styles.scheduleCard}>
                    <View style={styles.scheduleRow}>
                      <CalendarIcon size={20} color={colors.momentum} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleLabel}>{t('common.date')}</Text>
                        <Text style={styles.scheduleValue}>{selectedShift.date}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleRow}>
                      <ClockIcon size={20} color={colors.momentum} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleLabel}>{t('common.time')}</Text>
                        <Text style={styles.scheduleValue}>{selectedShift.time} ({selectedShift.duration} hours)</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleRow}>
                      <NavigationIcon size={20} color={colors.momentum} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleLabel}>{t('screens.shiftMarketplace.travel')}</Text>
                        <Text style={styles.scheduleValue}>{selectedShift.distance} km • ~{selectedShift.travelTime} min</Text>
                      </View>
                    </View>
                    {selectedShift.weather && (
                      <View style={styles.scheduleRow}>
                        <ThermometerIcon size={20} color={colors.momentum} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.scheduleLabel}>{t('screens.shiftMarketplace.weather')}</Text>
                          <Text style={styles.scheduleValue}>{selectedShift.weather.temp}°C, {selectedShift.weather.condition}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Team Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('screens.shiftMarketplace.team')}</Text>
                  <View style={styles.teamCard}>
                    <View style={styles.managerRow}>
                      {selectedShift.manager.avatar ? (
                        <Image
                          source={{ uri: selectedShift.manager.avatar }}
                          style={styles.managerAvatar as ImageStyle}
                        />
                      ) : (
                        <View style={[styles.managerAvatar, styles.managerAvatarPlaceholder]}>
                          <UsersIcon size={20} color={colors.slate500} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.managerName}>{selectedShift.manager.name}</Text>
                        <Text style={styles.managerLabel}>{t('screens.shiftMarketplace.shift_manager')}</Text>
                      </View>
                    </View>
                    <View style={styles.teamStats}>
                      <View style={styles.teamStat}>
                        <Text style={styles.teamStatValue}>{selectedShift.teamSize}</Text>
                        <Text style={styles.teamStatLabel}>{t('screens.shiftMarketplace.teamSize')}</Text>
                      </View>
                      <View style={styles.teamStatDivider} />
                      <View style={styles.teamStat}>
                        <Text style={styles.teamStatValue}>{selectedShift.spotsLeft}</Text>
                        <Text style={styles.teamStatLabel}>{t('screens.shiftMarketplace.spotsLeft')}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Earnings Calculator */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('screens.shiftMarketplace.earnings')}</Text>
                  <View style={styles.earningsCard}>
                    <View style={styles.earningsRow}>
                      <Text style={styles.earningsLabel}>{t('screens.shiftMarketplace.base_pay')}</Text>
                      <Text style={styles.earningsValue}>
                        £{selectedShift.pay.toFixed(2)}/hr × {selectedShift.duration}h = £{(selectedShift.pay * selectedShift.duration).toFixed(2)}
                      </Text>
                    </View>
                    {selectedShift.bonusPay && (
                      <View style={styles.earningsRow}>
                        <Text style={styles.earningsLabel}>{t('screens.shiftMarketplace.bonus')}</Text>
                        <Text style={[styles.earningsValue, { color: colors.success }]}>+£{selectedShift.bonusPay.toFixed(2)}</Text>
                      </View>
                    )}
                    <View style={styles.earningsDivider} />
                    <View style={styles.earningsRow}>
                      <Text style={styles.earningsTotalLabel}>{t('common.total')}</Text>
                      <Text style={styles.earningsTotalValue}>
                        £{(selectedShift.pay * selectedShift.duration + (selectedShift.bonusPay || 0)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Claim Button */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => handleClaimShift(selectedShift)}
                    disabled={claimingId === selectedShift.id}
                  >
                    {claimingId === selectedShift.id ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <>
                        <CheckCircleIcon size={20} color={colors.background} />
                        <Text style={styles.claimButtonText}>{t('schedule.claimShift')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.md,
  },

  // Header
  header: {
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.slate900,
  },
  subtitle: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.momentum,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.bodyBold,
    color: colors.slate900,
    fontSize: 15,
  },
  statLabel: {
    ...typography.caption,
    color: colors.slate500,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.slate200,
    marginHorizontal: spacing.md,
  },

  // Filters
  filtersExpanded: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  filterSectionLabel: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.slate100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginEnd: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.momentum,
  },
  filterPillText: {
    ...typography.bodyBold,
    color: colors.slate700,
    fontSize: 13,
  },
  filterPillTextActive: {
    color: colors.background,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.slate100,
    alignItems: 'center',
  },
  sortOptionActive: {
    backgroundColor: colors.slate900,
  },
  sortOptionText: {
    ...typography.caption,
    color: colors.slate600,
    fontWeight: '600',
  },
  sortOptionTextActive: {
    color: colors.background,
  },

  // Quick Filters
  quickFilters: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  quickFilterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate100,
    marginEnd: spacing.sm,
  },
  quickFilterPillActive: {
    backgroundColor: colors.momentum,
  },
  quickFilterText: {
    ...typography.bodyBold,
    color: colors.slate700,
    fontSize: 13,
  },
  quickFilterTextActive: {
    color: colors.background,
  },

  // Shift List
  shiftList: {
    flex: 1,
    padding: spacing.md,
  },

  // Shift Card
  shiftCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  shiftCardUrgent: {
    borderWidth: 2,
    borderColor: colors.momentum,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.sm,
  },
  urgentText: {
    ...typography.bodyBold,
    color: colors.background,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  shiftCardContent: {
    padding: spacing.lg,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  shiftRole: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    ...typography.caption,
    color: colors.slate600,
  },
  distanceText: {
    ...typography.caption,
    color: colors.slate400,
  },
  bookmarkButton: {
    padding: spacing.xs,
  },

  // Match
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  matchScore: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  matchLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  skillsPreview: {
    flex: 1,
  },
  skillsPreviewText: {
    ...typography.caption,
    color: colors.slate500,
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '45%',
  },
  detailValue: {
    ...typography.caption,
    color: colors.slate700,
    fontWeight: '500',
  },

  // Footer
  shiftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  payContainer: {},
  payRate: {
    ...typography.h3,
    color: colors.slate900,
    fontSize: 18,
  },
  bonusPay: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  totalEarnings: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  quickClaimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.momentum,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  quickClaimText: {
    ...typography.bodyBold,
    color: colors.background,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.slate600,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.momentum,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyButtonText: {
    ...typography.bodyBold,
    color: colors.background,
  },

  // More Section
  moreSection: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.md,
  },
  moreSectionContent: {
    alignItems: 'center',
  },
  moreTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.sm,
  },
  moreText: {
    ...typography.body,
    color: colors.slate600,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  notifyButton: {
    backgroundColor: colors.slate200,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  notifyButtonText: {
    ...typography.bodyBold,
    color: colors.slate700,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  modalClose: {
    padding: spacing.sm,
  },
  modalBookmark: {
    padding: spacing.sm,
  },

  // Modal Role Section
  modalRoleSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  modalUrgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.momentum,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  modalUrgentText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
  },
  modalRole: {
    ...typography.h1,
    color: colors.slate900,
    fontSize: 24,
  },
  modalDepartment: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  modalLocation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalLocationName: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  modalLocationAddress: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },

  // Match Card
  matchCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  matchCardTitle: {
    ...typography.h2,
    fontSize: 20,
  },
  matchCardSubtitle: {
    ...typography.caption,
    color: colors.slate600,
    marginTop: 2,
  },
  matchProgress: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  matchProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Modal Sections
  modalSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalSectionTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },

  // Skills List
  skillsList: {
    gap: spacing.sm,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.slate50,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  skillStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillName: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  skillLevel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  requiredBadge: {
    backgroundColor: colors.slate200,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  requiredText: {
    ...typography.caption,
    color: colors.slate600,
    fontSize: 10,
    fontWeight: '600',
  },
  learnSkillsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.momentum,
    borderRadius: borderRadius.lg,
  },
  learnSkillsText: {
    ...typography.bodyBold,
    color: colors.momentum,
  },

  // Schedule Card
  scheduleCard: {
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scheduleLabel: {
    ...typography.caption,
    color: colors.slate500,
  },
  scheduleValue: {
    ...typography.bodyBold,
    color: colors.slate800,
    marginTop: 2,
  },

  // Team Card
  teamCard: {
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  managerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  managerAvatarPlaceholder: {
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerName: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  managerLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  teamStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  teamStat: {
    alignItems: 'center',
  },
  teamStatValue: {
    ...typography.h2,
    color: colors.slate900,
    fontSize: 20,
  },
  teamStatLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  teamStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.slate200,
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  earningsLabel: {
    ...typography.body,
    color: colors.slate600,
  },
  earningsValue: {
    ...typography.body,
    color: colors.slate800,
  },
  earningsDivider: {
    height: 1,
    backgroundColor: colors.slate200,
    marginVertical: spacing.md,
  },
  earningsTotalLabel: {
    ...typography.h3,
    color: colors.slate900,
  },
  earningsTotalValue: {
    ...typography.h2,
    color: colors.momentum,
    fontSize: 24,
  },

  // Modal Actions
  modalActions: {
    padding: spacing.lg,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  claimButtonText: {
    ...typography.h3,
    color: colors.background,
    fontSize: 18,
  },
});
