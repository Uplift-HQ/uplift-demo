import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
  Dimensions,
  Platform,
  ImageStyle,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useShiftDetail } from '../../hooks/useData';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  CheckSquareIcon,
  AlertCircleIcon,
  PhoneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  DollarSignIcon,
  AwardIcon,
  CheckCircleIcon,
  ShareIcon,
} from '../../components/Icons';
import { SunIcon, CloudIcon, CloudRainIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatUKPhone, formatTemperature } from '../../constants/ukFormatters';
import { showAlert } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Shift status types
type ShiftStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<ShiftStatus, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: 'Scheduled', color: colors.info, bgColor: colors.info + '20' },
  confirmed: { label: 'Confirmed', color: colors.success, bgColor: colors.success + '20' },
  in_progress: { label: 'In Progress', color: colors.momentum, bgColor: colors.momentumLight },
  completed: { label: 'Completed', color: colors.slate500, bgColor: colors.slate100 },
  cancelled: { label: 'Cancelled', color: colors.error, bgColor: colors.error + '15' },
};

export const ShiftDetailScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});

  const shiftId = route.params?.shiftId || route.params?.shift?.id;
  const { data: shiftDetail, loading } = useShiftDetail(shiftId || 'shift-1');

  // Shift data from route params
  const passedShift = route?.params?.shift;

  // Handle location being either a string or object
  const getLocationObject = () => {
    if (!passedShift?.location) {
      return {
        id: 'loc-default',
        name: t('schedule.yourWorkplace', 'Your Workplace'),
        city: '',
        postcode: '',
        lat: 0,
        lon: 0,
        geofenceRadius: 100,
      };
    }
    if (typeof passedShift.location === 'string') {
      return {
        id: passedShift.locationId || 'loc-1',
        name: passedShift.location,
        city: passedShift.city || '',
        postcode: passedShift.postcode || '',
        lat: passedShift.lat || 0,
        lon: passedShift.lon || 0,
        geofenceRadius: passedShift.geofenceRadius || 100,
      };
    }
    return passedShift.location;
  };

  const locationObj = getLocationObject();

  // Build comprehensive shift data
  const shift = {
    id: passedShift?.id || 'shift-1',
    role: passedShift?.role || passedShift?.roleName || 'Senior Server',
    department: passedShift?.department || 'Front of House',
    date: passedShift?.date || 'Wed, 22 Jan',
    dateFormatted: passedShift?.dateFormatted || 'Wednesday, 22 January 2025',
    startTime: passedShift?.startTime || '09:00',
    endTime: passedShift?.endTime || '17:00',
    duration: passedShift?.duration || '8 hours',
    breakDuration: passedShift?.breakDuration || '30 min break',
    location: locationObj,
    status: (passedShift?.status || 'scheduled') as ShiftStatus,
    weather: passedShift?.weather || { temp: 8, condition: 'cloudy', high: 10, low: 4 },
    // Team members from passed shift data
    teamMembers: passedShift?.teamMembers || [],
    // Manager info
    manager: passedShift?.manager || {
      name: 'James Wilson',
      role: 'Restaurant Manager',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      phone: '07700 900001',
    },
    // Pre-shift checklist
    checklist: passedShift?.checklist || [
      { id: 'uniform', label: 'Uniform ready (black trousers, white shirt)', required: true },
      { id: 'badge', label: 'Name badge', required: true },
      { id: 'shoes', label: 'Non-slip shoes', required: true },
      { id: 'certifications', label: 'Certifications valid', required: true },
      { id: 'transport', label: 'Transport arranged', required: false },
    ],
    // Pay info
    pay: passedShift?.pay || {
      hourlyRate: 12.50,
      estimatedGross: 100.00,
      currency: '£',
      bonus: passedShift?.premium ? 2.00 : 0,
      bonusReason: passedShift?.premium || null,
    },
    // Required skills for shift
    requiredSkills: passedShift?.requiredSkills || ['Food Safety L2', 'Table Service', 'Allergen Awareness'],
    // Additional info
    notes: passedShift?.notes || 'Large party (25 guests) booked for 13:00. VIP table 12 requires attention.',
    parking: passedShift?.parking || 'Staff car park at rear entrance, code: 1234#',
    dressCode: passedShift?.dressCode || 'Black trousers, white shirt, black shoes. Hair tied back.',
    equipmentNeeded: passedShift?.equipmentNeeded || 'Name badge, order pad, handheld POS device',
    responsibilities: passedShift?.responsibilities || [
      'Station: Tables 10-18 (Front section)',
      'Support bar service during peak (12:00-14:00)',
      'Train new team member Chen W. on POS system',
      'Assist with VIP table setup at 12:30',
    ],
  };

  // Get user's matching skills (no demo data - show 0% match if no skills data available)
  const userSkills: string[] = [];
  const matchingSkills = shift.requiredSkills.filter((s: string) =>
    userSkills.some((us: string) => us.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(us.toLowerCase()))
  );
  const skillsMatch = shift.requiredSkills.length > 0 ? Math.round((matchingSkills.length / shift.requiredSkills.length) * 100) : 0;

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <SunIcon size={24} color={colors.warning} />;
      case 'cloudy': return <CloudIcon size={24} color={colors.slate500} />;
      case 'rainy': return <CloudRainIcon size={24} color={colors.info} />;
      default: return <CloudIcon size={24} color={colors.slate500} />;
    }
  };

  const handleGetDirections = () => {
    const address = encodeURIComponent(`${locationObj.name}, ${locationObj.postcode}`);
    const url = Platform.select({
      ios: `maps://app?daddr=${address}`,
      android: `google.navigation:q=${address}`,
    }) || `https://maps.google.com/?q=${address}`;
    Linking.openURL(url);
  };

  const handleCallManager = () => {
    Linking.openURL(`tel:${shift.manager.phone.replace(/\s/g, '')}`);
  };

  const handleCallTeamMember = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleAddToCalendar = () => {
    showAlert(t('screens.shiftDetail.addToCalendar'), t('screens.shiftDetail.shiftAddedToCalendar'), [{ text: t('common.ok') }]);
  };

  const handleRequestSwap = () => {
    navigation.navigate('ShiftSwap', { shift });
  };

  const handleClockIn = () => {
    navigation.navigate('ClockInOut', { shift });
  };

  const handleCallInSick = () => {
    showAlert(
      t('screens.shiftDetail.reportAbsence'),
      t('screens.shiftDetail.reportAbsenceConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('screens.shiftDetail.reportAbsence'),
          style: 'destructive',
          onPress: () => {
            showAlert(
              t('screens.shiftDetail.absenceReported'),
              t('screens.shiftDetail.absenceReportedMsg'),
              [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
            );
          },
        },
      ]
    );
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedCount = Object.values(checklistItems).filter(Boolean).length;
  const checklistProgress = Math.round((checkedCount / shift.checklist.length) * 100);

  const statusConfig = STATUS_CONFIG[shift.status];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.momentum} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeftIcon size={24} color={colors.momentum} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('screens.shiftDetail.shift_details')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={() => showAlert(t('screens.shiftDetail.share'), t('screens.shiftDetail.shareAvailableSoon'))}>
          <ShareIcon size={22} color={colors.slate600} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Role Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>{shift.role}</Text>
              <Text style={styles.department}>{shift.department}</Text>
            </View>
            {shift.pay.bonus > 0 && (
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusText}>+{shift.pay.currency}{shift.pay.bonus}/hr</Text>
              </View>
            )}
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <CalendarIcon size={18} color={colors.momentum} />
              <Text style={styles.heroStatText}>{shift.dateFormatted}</Text>
            </View>
            <View style={styles.heroStat}>
              <ClockIcon size={18} color={colors.momentum} />
              <Text style={styles.heroStatText}>{shift.startTime} - {shift.endTime}</Text>
              <Text style={styles.heroStatSubtext}>({shift.duration})</Text>
            </View>
          </View>
        </View>

        {/* Time & Location Card with Map */}
        <View style={styles.mapCard}>
          {/* Map Visual */}
          <TouchableOpacity style={styles.mapContainer} onPress={handleGetDirections} activeOpacity={0.9}>
            {/* Stylized map background */}
            <View style={styles.mapVisual}>
              <View style={styles.mapGrid}>
                {[...Array(6)].map((_, i) => (
                  <View key={`h-${i}`} style={[styles.mapGridLine, styles.mapGridHorizontal, { top: 20 + i * 25 }]} />
                ))}
                {[...Array(8)].map((_, i) => (
                  <View key={`v-${i}`} style={[styles.mapGridLine, styles.mapGridVertical, { left: 20 + i * (SCREEN_WIDTH - 72) / 8 }]} />
                ))}
              </View>
              {/* Map pin */}
              <View style={styles.mapPinContainer}>
                <View style={styles.mapPin}>
                  <MapPinIcon size={28} color={colors.background} />
                </View>
                <View style={styles.mapPinShadow} />
              </View>
              {/* Tap hint */}
              <View style={styles.mapTapHint}>
                <Text style={styles.mapTapHintText}>{t('screens.shiftDetail.tap_to_open_in_maps')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.locationDetails}>
            <Text style={styles.locationName}>{locationObj.name}</Text>
            <Text style={styles.locationAddress}>{locationObj.address || '123 High Street'}</Text>
            <Text style={styles.locationPostcode}>{locationObj.city}, {locationObj.postcode}</Text>

            <View style={styles.locationActions}>
              <TouchableOpacity style={styles.locationActionPrimary} onPress={handleGetDirections}>
                <MapPinIcon size={18} color={colors.background} />
                <Text style={styles.locationActionPrimaryText}>{t('screens.shiftDetail.get_directions')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationActionSecondary}
                onPress={() => Linking.openURL(`tel:${locationObj.phone?.replace(/\s/g, '') || '02012345678'}`)}
              >
                <PhoneIcon size={18} color={colors.momentum} />
                <Text style={styles.locationActionSecondaryText}>{t('screens.shiftDetail.call')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherMain}>
            {getWeatherIcon(shift.weather.condition)}
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherTemp}>{formatTemperature(shift.weather.temp)}</Text>
              <Text style={styles.weatherCondition}>{shift.weather.condition.charAt(0).toUpperCase() + shift.weather.condition.slice(1)}</Text>
            </View>
          </View>
          <View style={styles.weatherDetails}>
            <Text style={styles.weatherHighLow}>H: {shift.weather.high}° L: {shift.weather.low}°</Text>
            <Text style={styles.weatherNote}>{t('screens.shiftDetail.bring_a_jacket')}</Text>
          </View>
        </View>

        {/* Pay Information Card */}
        <View style={styles.payCard}>
          <View style={styles.payHeader}>
            <DollarSignIcon size={20} color={colors.success} />
            <Text style={styles.payTitle}>{t('screens.shiftDetail.estimated_earnings')}</Text>
          </View>
          <View style={styles.payDetails}>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>{shift.duration} @ {shift.pay.currency}{shift.pay.hourlyRate.toFixed(2)}/hr</Text>
              <Text style={styles.payValue}>{shift.pay.currency}{shift.pay.estimatedGross.toFixed(2)}</Text>
            </View>
            {shift.pay.bonus > 0 && (
              <View style={styles.payRow}>
                <Text style={styles.payLabelBonus}>Bonus ({shift.pay.bonusReason})</Text>
                <Text style={styles.payValueBonus}>+{shift.pay.currency}{(shift.pay.bonus * 8).toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.payRow, styles.payTotal]}>
              <Text style={styles.payTotalLabel}>{t('screens.shiftDetail.total_before_tax')}</Text>
              <Text style={styles.payTotalValue}>
                {shift.pay.currency}{(shift.pay.estimatedGross + (shift.pay.bonus * 8)).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Skills Required Card - UPLIFT DIFFERENTIATOR */}
        <View style={styles.skillsCard}>
          <View style={styles.skillsHeader}>
            <View style={styles.skillsHeaderLeft}>
              <AwardIcon size={20} color={colors.momentum} />
              <Text style={styles.skillsTitle}>{t('screens.shiftDetail.skills_required')}</Text>
            </View>
            <View style={[
              styles.skillsMatchBadge,
              { backgroundColor: skillsMatch === 100 ? colors.success + '20' : colors.warning + '20' }
            ]}>
              <Text style={[
                styles.skillsMatchText,
                { color: skillsMatch === 100 ? colors.success : colors.warning }
              ]}>
                {skillsMatch}% Match
              </Text>
            </View>
          </View>
          <View style={styles.skillsList}>
            {shift.requiredSkills.map((skill: string, index: number) => {
              const hasSkill = matchingSkills.includes(skill);
              return (
                <View key={index} style={styles.skillItem}>
                  <CheckCircleIcon
                    size={18}
                    color={hasSkill ? colors.success : colors.slate300}
                  />
                  <Text style={[
                    styles.skillText,
                    !hasSkill && styles.skillTextMissing
                  ]}>{skill}</Text>
                  {!hasSkill && (
                    <TouchableOpacity
                      style={styles.learnButton}
                      onPress={() => navigation.navigate('CareerPath')}
                    >
                      <Text style={styles.learnButtonText}>{t('screens.shiftDetail.learn')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Responsibilities Card */}
        <View style={styles.responsibilitiesCard}>
          <Text style={styles.sectionTitle}>{t('screens.shiftDetail.your_responsibilities')}</Text>
          {shift.responsibilities.map((resp: string, index: number) => (
            <View key={index} style={styles.responsibilityItem}>
              <View style={styles.responsibilityBullet}>
                <Text style={styles.responsibilityBulletText}>{index + 1}</Text>
              </View>
              <Text style={styles.responsibilityText}>{resp}</Text>
            </View>
          ))}
        </View>

        {/* Pre-Shift Checklist */}
        <View style={styles.checklistCard}>
          <View style={styles.checklistHeader}>
            <CheckSquareIcon size={20} color={colors.slate700} />
            <Text style={styles.checklistTitle}>{t('screens.shiftDetail.preshift_checklist')}</Text>
            <View style={styles.checklistProgress}>
              <Text style={styles.checklistProgressText}>{checkedCount}/{shift.checklist.length}</Text>
              <View style={styles.checklistProgressBar}>
                <View style={[styles.checklistProgressFill, { width: `${checklistProgress}%` }]} />
              </View>
            </View>
          </View>
          {shift.checklist.map((item: { id: string; label: string; required: boolean }) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem(item.id)}
            >
              <View style={[
                styles.checkbox,
                checklistItems[item.id] && styles.checkboxChecked
              ]}>
                {checklistItems[item.id] && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={[
                styles.checklistLabel,
                checklistItems[item.id] && styles.checklistLabelChecked
              ]}>
                {item.label}
                {item.required && <Text style={styles.requiredStar}> *</Text>}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Team Section */}
        <View style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <UsersIcon size={20} color={colors.slate700} />
            <Text style={styles.teamTitle}>{t('screens.shiftDetail.workingWithYou')} ({shift.teamMembers.length})</Text>
          </View>

          {/* Manager first */}
          <TouchableOpacity style={styles.managerRow} onPress={handleCallManager}>
            <Image source={{ uri: shift.manager.avatar }} style={styles.teamAvatarLarge as ImageStyle} />
            <View style={styles.teamMemberInfo}>
              <View style={styles.teamMemberNameRow}>
                <Text style={styles.teamMemberName}>{shift.manager.name}</Text>
                <View style={styles.managerBadge}>
                  <StarIcon size={12} color={colors.momentum} />
                  <Text style={styles.managerBadgeText}>{t('screens.shiftDetail.manager')}</Text>
                </View>
              </View>
              <Text style={styles.teamMemberRole}>{shift.manager.role}</Text>
            </View>
            <View style={styles.teamCallButton}>
              <PhoneIcon size={18} color={colors.momentum} />
            </View>
          </TouchableOpacity>

          {/* Team members */}
          {shift.teamMembers.map((member: any, index: number) => (
            <TouchableOpacity
              key={member.id || index}
              style={styles.teamMemberRow}
              onPress={() => handleCallTeamMember(member.phone)}
            >
              {member.avatar ? (
                <Image source={{ uri: member.avatar }} style={styles.teamAvatar as ImageStyle} />
              ) : (
                <View style={styles.teamAvatarPlaceholder}>
                  <Text style={styles.teamAvatarInitials}>
                    {member.name.split(' ').map((n: string) => n[0]).join('')}
                  </Text>
                </View>
              )}
              <View style={styles.teamMemberInfo}>
                <View style={styles.teamMemberNameRow}>
                  <Text style={styles.teamMemberName}>{member.name}</Text>
                  {member.isLead && (
                    <View style={styles.leadBadge}>
                      <Text style={styles.leadBadgeText}>{t('screens.shiftDetail.lead')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.teamMemberRole}>{member.role}</Text>
              </View>
              <View style={styles.teamCallButtonSmall}>
                <PhoneIcon size={16} color={colors.slate500} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Important Notes */}
        {shift.notes && (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <AlertCircleIcon size={20} color={colors.warning} />
              <Text style={styles.notesTitle}>{t('screens.shiftDetail.important_notes')}</Text>
            </View>
            <Text style={styles.notesText}>{shift.notes}</Text>
          </View>
        )}

        {/* Shift Info Details */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('screens.shiftDetail.shift_information')}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('screens.shiftDetail.break')}</Text>
            <Text style={styles.infoValue}>{shift.breakDuration}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('screens.shiftDetail.parking')}</Text>
            <Text style={styles.infoValue}>{shift.parking}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('screens.shiftDetail.dress_code')}</Text>
            <Text style={styles.infoValue}>{shift.dressCode}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('screens.shiftDetail.equipment')}</Text>
            <Text style={styles.infoValue}>{shift.equipmentNeeded}</Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleRequestSwap}>
            <Text style={styles.actionButtonSecondaryText}>{t('screens.shiftDetail.request_swap')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleAddToCalendar}>
            <CalendarIcon size={18} color={colors.momentum} />
            <Text style={styles.actionButtonSecondaryText}>{t('screens.shiftDetail.add_to_calendar')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.sickButton} onPress={handleCallInSick}>
          <Text style={styles.sickButtonText}>{t('screens.shiftDetail.i_cant_make_this_shift')}</Text>
        </TouchableOpacity>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Clock In Button */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.clockInButton} onPress={handleClockIn}>
          <ClockIcon size={24} color={colors.background} />
          <Text style={styles.clockInButtonText}>{t('screens.shiftDetail.clock_in')}</Text>
          <ChevronRightIcon size={24} color={colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.slate900,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.background,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    ...typography.h2,
    color: colors.slate900,
  },
  department: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  bonusBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  bonusText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.success,
  },
  heroStats: {
    gap: spacing.sm,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroStatText: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  heroStatSubtext: {
    ...typography.caption,
    color: colors.slate500,
  },

  // Map Card
  mapCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  mapContainer: {
    height: 160,
    backgroundColor: colors.slate100,
    position: 'relative',
    overflow: 'hidden',
  },
  mapVisual: {
    flex: 1,
    backgroundColor: '#E8F4E8',
    position: 'relative',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  mapGridLine: {
    position: 'absolute',
    backgroundColor: colors.slate200,
  },
  mapGridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  mapGridVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  mapPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -48 }],
    alignItems: 'center',
  },
  mapPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.momentum,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  mapPinShadow: {
    width: 20,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    marginTop: 4,
  },
  mapTapHint: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapTapHintText: {
    ...typography.small,
    color: colors.slate600,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  locationDetails: {
    padding: spacing.lg,
  },
  locationName: {
    ...typography.h3,
    color: colors.slate900,
  },
  locationAddress: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  locationPostcode: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  locationActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  locationActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  locationActionPrimaryText: {
    ...typography.bodyBold,
    color: colors.background,
  },
  locationActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  locationActionSecondaryText: {
    ...typography.bodyBold,
    color: colors.momentum,
  },

  // Weather Card
  weatherCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weatherInfo: {},
  weatherTemp: {
    ...typography.h2,
    color: colors.slate900,
  },
  weatherCondition: {
    ...typography.caption,
    color: colors.slate600,
  },
  weatherDetails: {
    alignItems: 'flex-end',
  },
  weatherHighLow: {
    ...typography.caption,
    color: colors.slate600,
  },
  weatherNote: {
    ...typography.small,
    color: colors.info,
    marginTop: spacing.xs,
  },

  // Pay Card
  payCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  payHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  payTitle: {
    ...typography.h3,
    color: colors.slate900,
  },
  payDetails: {
    gap: spacing.sm,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payLabel: {
    ...typography.body,
    color: colors.slate600,
  },
  payValue: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  payLabelBonus: {
    ...typography.body,
    color: colors.success,
  },
  payValueBonus: {
    ...typography.bodyBold,
    color: colors.success,
  },
  payTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  payTotalLabel: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  payTotalValue: {
    ...typography.h3,
    color: colors.success,
  },

  // Skills Card
  skillsCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  skillsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skillsTitle: {
    ...typography.h3,
    color: colors.slate900,
  },
  skillsMatchBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  skillsMatchText: {
    ...typography.small,
    fontWeight: '700',
  },
  skillsList: {
    gap: spacing.sm,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skillText: {
    ...typography.body,
    color: colors.slate800,
    flex: 1,
  },
  skillTextMissing: {
    color: colors.slate500,
  },
  learnButton: {
    backgroundColor: colors.momentum + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  learnButtonText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.momentum,
  },

  // Responsibilities Card
  responsibilitiesCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  responsibilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  responsibilityBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.momentum + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  responsibilityBulletText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.momentum,
  },
  responsibilityText: {
    ...typography.body,
    color: colors.slate700,
    flex: 1,
    lineHeight: 22,
  },

  // Checklist Card
  checklistCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checklistTitle: {
    ...typography.h3,
    color: colors.slate900,
    flex: 1,
  },
  checklistProgress: {
    alignItems: 'flex-end',
  },
  checklistProgressText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.momentum,
    marginBottom: 4,
  },
  checklistProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: colors.slate200,
    borderRadius: 2,
  },
  checklistProgressFill: {
    height: '100%',
    backgroundColor: colors.momentum,
    borderRadius: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.slate300,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxCheck: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
  checklistLabel: {
    ...typography.body,
    color: colors.slate800,
    flex: 1,
  },
  checklistLabelChecked: {
    color: colors.slate500,
    textDecorationLine: 'line-through',
  },
  requiredStar: {
    color: colors.error,
  },

  // Team Card
  teamCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  teamTitle: {
    ...typography.h3,
    color: colors.slate900,
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    marginBottom: spacing.sm,
  },
  teamAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.momentum,
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  teamAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.momentum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarInitials: {
    ...typography.bodyBold,
    color: colors.background,
    fontSize: 14,
  },
  teamMemberInfo: {
    flex: 1,
  },
  teamMemberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamMemberName: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  teamMemberRole: {
    ...typography.caption,
    color: colors.slate600,
    marginTop: 2,
  },
  managerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.momentumLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  managerBadgeText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.momentum,
  },
  leadBadge: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  leadBadgeText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.info,
  },
  teamCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.momentum + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCallButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notes Card
  notesCard: {
    backgroundColor: colors.warning + '15',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderStartWidth: 4,
    borderStartColor: colors.warning,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  notesTitle: {
    ...typography.bodyBold,
    color: colors.warning,
  },
  notesText: {
    ...typography.body,
    color: colors.slate800,
    lineHeight: 22,
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  infoTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  infoLabel: {
    ...typography.bodyBold,
    color: colors.slate700,
    width: 100,
  },
  infoValue: {
    ...typography.body,
    color: colors.slate600,
    flex: 1,
  },

  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.momentum,
    ...shadows.sm,
  },
  actionButtonSecondaryText: {
    ...typography.bodyBold,
    color: colors.momentum,
  },

  sickButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sickButtonText: {
    ...typography.body,
    color: colors.error,
    textDecorationLine: 'underline',
  },

  // Bottom Button
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    ...shadows.lg,
  },
  clockInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  clockInButtonText: {
    ...typography.h3,
    color: colors.background,
    flex: 1,
    textAlign: 'center',
  },
});
