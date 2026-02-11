import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PlusIcon,
  SunIcon,
  CloudIcon,
  CloudRainIcon,
  CoffeeIcon,
  FileTextIcon,
  MapIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '../../components/Icons';
import { useMyShifts } from '../../hooks/useData';
import { useAuthStore } from '../../store/authStore';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 6) / 5; // Show ~5 days visible

type ViewMode = 'week' | 'month';

interface Shift {
  id: string;
  date: string;
  fullDate: Date;
  dayOfWeek: string;
  role: string;
  department: string;
  startTime: string;
  endTime: string;
  duration: string;
  location: string;
  weather: { temp: number; condition: 'sunny' | 'cloudy' | 'rainy' };
  teamMembers: { name: string; avatar?: string }[];
  status: 'confirmed' | 'pending' | 'completed';
  tasks: number;
  breakTime?: string;
  managerNote?: string;
}

interface AvailableShift {
  id: string;
  date: string;
  dayOfWeek: string;
  role: string;
  department: string;
  startTime: string;
  endTime: string;
  duration: string;
  location: string;
  hourlyRate?: number;
  urgency: 'normal' | 'urgent';
}

// Role/Department color mapping for visual distinction
const ROLE_COLORS: Record<string, string> = {
  'Front of House': '#3B82F6',    // Blue
  'Kitchen': '#EF4444',           // Red
  'Bar': '#8B5CF6',               // Purple
  'Management': '#10B981',         // Green
  'Delivery': '#F59E0B',          // Amber
  'Events': '#EC4899',            // Pink
  'Cleaning': '#06B6D4',          // Cyan
  'Security': '#6366F1',          // Indigo
  'default': colors.momentum,
};

const getRoleColor = (department: string): string => {
  return ROLE_COLORS[department] || ROLE_COLORS.default;
};

export const ScheduleOverviewScreen = ({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const weekScrollRef = useRef<ScrollView>(null);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  // Get current week/month dates based on viewMode
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (selectedWeekOffset * 7)); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // For month view
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Use appropriate date range based on view mode
  const startDate = viewMode === 'week' ? startOfWeek : startOfMonth;
  const endDate = viewMode === 'week' ? endOfWeek : endOfMonth;

  // Fetch shifts from API
  const { data: shiftsData, loading, error, refetch } = useMyShifts(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  const weekDays = [
    t('common.weekDaysShortMon'), t('common.weekDaysShortTue'), t('common.weekDaysShortWed'),
    t('common.weekDaysShortThu'), t('common.weekDaysShortFri'), t('common.weekDaysShortSat'),
    t('common.weekDaysShortSun'),
  ];
  const fullWeekDays = [
    t('common.weekDaysMon'), t('common.weekDaysTue'), t('common.weekDaysWed'),
    t('common.weekDaysThu'), t('common.weekDaysFri'), t('common.weekDaysSat'),
    t('common.weekDaysSun'),
  ];

  // Generate week data with dates
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      date: d.getDate(),
      day: weekDays[i],
      fullDay: fullWeekDays[i],
      month: d.toLocaleDateString(i18n.language, { month: 'short' }),
      fullDate: new Date(d),
      isToday: d.toDateString() === today.toDateString(),
      isPast: d < today && d.toDateString() !== today.toDateString(),
    };
  });

  // Generate month calendar data
  const generateMonthCalendar = () => {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7; // Days before month starts (Mon = 0)
    const days = [];

    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    // Add days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: i, isCurrentMonth: true });
    }

    return days;
  };

  const monthCalendar = generateMonthCalendar();

  // Sample departments for demo
  const departments = ['Front of House', 'Kitchen', 'Bar', 'Management', 'Delivery', 'Events'];

  // Transform API shifts to display format with null checks
  const shifts: Shift[] = (shiftsData?.shifts || []).map((s, index) => {
    // Safely parse date
    const shiftDate = s.date ? new Date(s.date) : new Date();
    const dayNames = [
      t('common.weekDaysShortSun'), t('common.weekDaysShortMon'), t('common.weekDaysShortTue'),
      t('common.weekDaysShortWed'), t('common.weekDaysShortThu'), t('common.weekDaysShortFri'),
      t('common.weekDaysShortSat'),
    ];

    // Safely parse times with fallback
    const startTime = s.startTime || '09:00';
    const endTime = s.endTime || '17:00';
    const startHour = parseInt(startTime.split(':')[0]) || 9;
    const endHour = parseInt(endTime.split(':')[0]) || 17;
    const duration = Math.max(0, endHour - startHour);

    // Assign department based on role or cycling through options
    const dept = departments[index % departments.length];

    // Generate sample weather
    const weatherConditions: Array<'sunny' | 'cloudy' | 'rainy'> = ['sunny', 'cloudy', 'rainy'];
    const weatherTemps = [8, 12, 15, 18, 22];

    return {
      id: s.id || String(Math.random()),
      date: `${shiftDate.getDate()} ${shiftDate.toLocaleDateString(i18n.language, { month: 'short' })}`,
      fullDate: shiftDate,
      dayOfWeek: dayNames[shiftDate.getDay()] || 'Mon',
      role: s.roleName || t('schedule.shift'),
      department: dept,
      startTime: startTime,
      endTime: endTime,
      duration: `${duration}h`,
      location: s.locationName || t('home.locationTBC', 'Location TBC'),
      weather: {
        temp: weatherTemps[index % weatherTemps.length],
        condition: weatherConditions[index % weatherConditions.length]
      },
      teamMembers: [
        { name: 'Sarah M' },
        { name: 'John D' },
        { name: 'Emma W' },
      ],
      status: s.status === 'scheduled' ? 'confirmed' : (s.status as any) || 'pending',
      tasks: index % 3,
      breakTime: duration >= 6 ? '30 min' : undefined,
      managerNote: index === 0 ? 'Please arrive 10 min early for briefing' : undefined,
    };
  });

  // Sample available shifts for claiming
  const availableShifts: AvailableShift[] = [
    {
      id: 'avail-1',
      date: '25 Jan',
      dayOfWeek: t('common.weekDaysShortSat'),
      role: 'Bartender',
      department: 'Bar',
      startTime: '18:00',
      endTime: '02:00',
      duration: '8h',
      location: 'The Crown Pub',
      hourlyRate: 14.50,
      urgency: 'urgent',
    },
    {
      id: 'avail-2',
      date: '26 Jan',
      dayOfWeek: t('common.weekDaysShortSun'),
      role: 'Server',
      department: 'Front of House',
      startTime: '11:00',
      endTime: '16:00',
      duration: '5h',
      location: 'City Bistro',
      hourlyRate: 12.00,
      urgency: 'normal',
    },
    {
      id: 'avail-3',
      date: '27 Jan',
      dayOfWeek: t('common.weekDaysShortMon'),
      role: 'Kitchen Porter',
      department: 'Kitchen',
      startTime: '08:00',
      endTime: '14:00',
      duration: '6h',
      location: 'Hotel Grand',
      hourlyRate: 11.50,
      urgency: 'normal',
    },
  ];

  const totalHours = shifts.reduce((acc, shift) => acc + (parseInt(shift.duration) || 0), 0);
  const upcomingShiftsCount = shifts.filter(s => s.status !== 'completed').length;
  const confirmedCount = shifts.filter(s => s.status === 'confirmed').length;
  const pendingCount = shifts.filter(s => s.status === 'pending').length;

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <SunIcon size={16} color="#F59E0B" />;
      case 'cloudy': return <CloudIcon size={16} color="#64748B" />;
      case 'rainy': return <CloudRainIcon size={16} color="#3B82F6" />;
      default: return <CloudIcon size={16} color="#64748B" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'pending': return colors.warning;
      case 'completed': return colors.slate400;
      default: return colors.slate400;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircleIcon size={14} color={colors.success} />;
      case 'pending': return <AlertCircleIcon size={14} color={colors.warning} />;
      default: return null;
    }
  };

  const formatWeekRange = () => {
    const startMonth = startOfWeek.toLocaleDateString(i18n.language, { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString(i18n.language, { month: 'short' });
    if (startMonth === endMonth) {
      return `${startOfWeek.getDate()}-${endOfWeek.getDate()} ${startMonth}`;
    }
    return `${startOfWeek.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeekOffset(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  // Calculate time progress for timeline indicator
  const getTimeProgress = (startTime: string, endTime: string): number => {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    const now = new Date().getHours();

    if (now < start) return 0;
    if (now >= end) return 100;
    return ((now - start) / (end - start)) * 100;
  };

  // Check if shift is happening now
  const isShiftNow = (shift: Shift): boolean => {
    const now = new Date();
    const shiftDate = shift.fullDate;
    if (shiftDate.toDateString() !== now.toDateString()) return false;

    const currentHour = now.getHours();
    const startHour = parseInt(shift.startTime.split(':')[0]);
    const endHour = parseInt(shift.endTime.split(':')[0]);

    return currentHour >= startHour && currentHour < endHour;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, hideHeader && { paddingTop: spacing.md }]}>
        <View>
          <Text style={styles.title}>{hideHeader ? t('schedule.mySchedule', 'My Schedule') : t('schedule.title')}</Text>
          <Text style={styles.subtitle}>
            {viewMode === 'week'
              ? formatWeekRange()
              : today.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
            }
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'week' && styles.viewToggleActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'week' && styles.viewToggleTextActive]}>{t('schedule.weekView')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'month' && styles.viewToggleActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>{t('schedule.monthView')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <ClockIcon size={18} color={colors.momentum} />
            </View>
            <View>
              <Text style={styles.statValue}>{totalHours}h</Text>
              <Text style={styles.statLabel}>{t('screens.scheduleOverview.this_week')}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
              <CalendarIcon size={18} color={colors.success} />
            </View>
            <View>
              <Text style={styles.statValue}>{upcomingShiftsCount}</Text>
              <Text style={styles.statLabel}>{t('screens.scheduleOverview.upcoming', 'Upcoming')}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.info + '20' }]}>
              <CheckCircleIcon size={18} color={colors.info} />
            </View>
            <View>
              <Text style={styles.statValue}>{confirmedCount}</Text>
              <Text style={styles.statLabel}>{t('schedule.confirmed', 'Confirmed')}</Text>
            </View>
          </View>
        </View>

        {/* Week Calendar - Horizontally Scrollable */}
        {viewMode === 'week' && (
          <View style={styles.weekCalendarContainer}>
            <View style={styles.weekNavHeader}>
              <TouchableOpacity
                onPress={() => navigateWeek('prev')}
                style={styles.weekNavButton}
              >
                <ChevronLeftIcon size={20} color={colors.slate600} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedWeekOffset(0)}
                style={styles.todayButton}
              >
                <Text style={styles.todayButtonText}>{t('common.today')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigateWeek('next')}
                style={styles.weekNavButton}
              >
                <ChevronRightIcon size={20} color={colors.slate600} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={weekScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekScrollContent}
            >
              {weekData.map((dayInfo, index) => {
                const dayShifts = shifts.filter(s =>
                  s.fullDate.toDateString() === dayInfo.fullDate.toDateString()
                );
                const hasShift = dayShifts.length > 0;
                const shiftCount = dayShifts.length;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCard,
                      dayInfo.isToday && styles.dayCardToday,
                      dayInfo.isPast && styles.dayCardPast,
                      hasShift && styles.dayCardHasShift,
                    ]}
                    onPress={() => {
                      if (dayShifts.length > 0) {
                        navigation.navigate('ShiftDetail', { shift: dayShifts[0] });
                      } else {
                        showAlert(
                          `${dayInfo.fullDay}, ${dayInfo.date} ${dayInfo.month}`,
                          t('screens.scheduleOverview.noShiftsPickUp', 'No shifts scheduled. Would you like to pick up an open shift?'),
                          [
                            { text: t('screens.scheduleOverview.notNow', 'Not Now'), style: 'cancel' },
                            { text: t('screens.scheduleOverview.viewOpenShifts', 'View Open Shifts'), onPress: () => navigation.navigate('ShiftMarketplace') }
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={[
                      styles.dayCardDay,
                      dayInfo.isToday && styles.dayCardDayToday,
                      dayInfo.isPast && styles.dayCardDayPast,
                    ]}>
                      {dayInfo.day}
                    </Text>
                    <View style={[
                      styles.dayCardDateCircle,
                      dayInfo.isToday && styles.dayCardDateCircleToday,
                    ]}>
                      <Text style={[
                        styles.dayCardDate,
                        dayInfo.isToday && styles.dayCardDateToday,
                        dayInfo.isPast && styles.dayCardDatePast,
                      ]}>
                        {dayInfo.date}
                      </Text>
                    </View>
                    <Text style={[
                      styles.dayCardMonth,
                      dayInfo.isToday && styles.dayCardMonthToday,
                    ]}>
                      {dayInfo.month}
                    </Text>

                    {/* Shift indicators */}
                    <View style={styles.shiftDotsContainer}>
                      {hasShift ? (
                        <>
                          {dayShifts.slice(0, 3).map((shift, i) => (
                            <View
                              key={i}
                              style={[
                                styles.shiftDot,
                                { backgroundColor: getRoleColor(shift.department) }
                              ]}
                            />
                          ))}
                          {shiftCount > 3 && (
                            <Text style={styles.moreShiftsText}>+{shiftCount - 3}</Text>
                          )}
                        </>
                      ) : (
                        <View style={styles.noShiftPlaceholder} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Month Calendar */}
        {viewMode === 'month' && (
          <View style={styles.monthCalendar}>
            {/* Day headers */}
            <View style={styles.monthHeader}>
              {weekDays.map(day => (
                <Text key={day} style={styles.monthHeaderText}>{day.slice(0, 1)}</Text>
              ))}
            </View>
            {/* Calendar grid */}
            <View style={styles.monthGrid}>
              {monthCalendar.map((day, index) => {
                const hasShift = day.date ? shifts.some(s => {
                  try {
                    if (!s.date) return false;
                    const dateParts = s.date.split(' ');
                    const dayNum = parseInt(dateParts[0]);
                    return dayNum === day.date;
                  } catch {
                    return false;
                  }
                }) : false;
                const isToday = day.date === today.getDate() && day.isCurrentMonth;

                return (
                  <View
                    key={index}
                    style={[
                      styles.monthDay,
                      isToday && styles.monthDayToday,
                    ]}
                  >
                    {day.date && (
                      <>
                        <Text style={[
                          styles.monthDayText,
                          isToday && styles.monthDayTextToday,
                          !day.isCurrentMonth && styles.monthDayTextMuted
                        ]}>
                          {day.date}
                        </Text>
                        {hasShift && <View style={styles.monthShiftDot} />}
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Manager Start Shift Card */}
        {isManager && (
          <TouchableOpacity
            style={styles.managerShiftCard}
            onPress={() => navigation.navigate('ClockInOut')}
          >
            <View style={styles.managerShiftIconBg}>
              <ClockIcon size={28} color={colors.background} />
            </View>
            <View style={styles.managerShiftContent}>
              <Text style={styles.managerShiftTitle}>{t('schedule.startMyShift', 'Start My Shift')}</Text>
              <Text style={styles.managerShiftSubtitle}>{t('schedule.clockInNow', 'Clock in to begin your shift')}</Text>
            </View>
            <ChevronRightIcon size={24} color={colors.background} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {!isManager && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ClockInOut')}
            >
              <ClockIcon size={20} color={colors.background} />
              <Text style={styles.actionButtonText}>{t('home.clockIn')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, isManager ? {} : styles.actionButtonSecondary]}
            onPress={() => navigation.navigate('TimeOffRequest')}
          >
            <CalendarIcon size={20} color={isManager ? colors.background : colors.momentum} />
            <Text style={[styles.actionButtonText, isManager ? {} : { color: colors.momentum }]}>{t('timeOff.request')}</Text>
          </TouchableOpacity>
          {isManager && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => navigation.navigate('Approvals')}
            >
              <CheckCircleIcon size={20} color={colors.momentum} />
              <Text style={[styles.actionButtonText, { color: colors.momentum }]}>{t('manager.approvals', 'Approvals')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* My Shifts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.upcomingShifts')}</Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{t('screens.scheduleOverview.pendingCount', { count: pendingCount, defaultValue: '{{count}} pending' })}</Text>
              </View>
            )}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.momentum} />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          )}

          {!loading && shifts.length === 0 && (
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={colors.slate300} />
              <Text style={styles.emptyStateTitle}>{t('schedule.noShifts')}</Text>
              <Text style={styles.emptyStateText}>{t('schedule.moreComingSoon')}</Text>
            </View>
          )}

          {shifts.map((shift) => {
            const roleColor = getRoleColor(shift.department);
            const isNow = isShiftNow(shift);
            const timeProgress = isNow ? getTimeProgress(shift.startTime, shift.endTime) : 0;

            return (
              <TouchableOpacity
                key={shift.id}
                style={[
                  styles.shiftCard,
                  { borderStartColor: roleColor },
                  isNow && styles.shiftCardActive,
                ]}
                onPress={() => navigation.navigate('ShiftDetail', { shift })}
              >
                {/* Role Header with Department Color */}
                <View style={styles.shiftCardHeader}>
                  <View style={styles.roleContainer}>
                    <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
                      <BriefcaseIcon size={14} color={roleColor} />
                      <Text style={[styles.roleText, { color: roleColor }]}>{shift.department}</Text>
                    </View>
                    <Text style={styles.shiftRole}>{shift.role}</Text>
                  </View>

                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status) + '15' }]}>
                    {getStatusIcon(shift.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(shift.status) }]}>
                      {shift.status === 'confirmed' ? t('schedule.confirmed', 'Confirmed')
                        : shift.status === 'pending' ? t('common.pending', 'Pending')
                        : t('screens.scheduleOverview.completed', 'Completed')}
                    </Text>
                  </View>
                </View>

                {/* Date & Time with Timeline */}
                <View style={styles.timeSection}>
                  <View style={styles.dateTimeRow}>
                    <View style={styles.dateContainer}>
                      <CalendarIcon size={14} color={colors.slate500} />
                      <Text style={styles.dateText}>{shift.date} ({shift.dayOfWeek})</Text>
                    </View>
                    <View style={styles.timeContainer}>
                      <ClockIcon size={14} color={colors.slate500} />
                      <Text style={styles.timeText}>{shift.startTime} - {shift.endTime}</Text>
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{shift.duration}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Visual Timeline Indicator */}
                  <View style={styles.timelineContainer}>
                    <View style={styles.timelineBg}>
                      {isNow && (
                        <View style={[styles.timelineProgress, { width: `${timeProgress}%` }]} />
                      )}
                    </View>
                    <View style={styles.timelineLabels}>
                      <Text style={styles.timelineLabel}>{shift.startTime}</Text>
                      {isNow && <Text style={styles.timelineNow}>{t('screens.scheduleOverview.now')}</Text>}
                      <Text style={styles.timelineLabel}>{shift.endTime}</Text>
                    </View>
                  </View>
                </View>

                {/* Location with Map Preview Icon */}
                <View style={styles.locationRow}>
                  <View style={styles.locationContainer}>
                    <MapPinIcon size={14} color={colors.slate500} />
                    <Text style={styles.locationText}>{shift.location}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mapPreviewButton}
                    onPress={() => showAlert(t('schedule.location', 'Location'), `${shift.location}\n\n${t('screens.scheduleOverview.mapViewInfo', 'Map view available in the full app.')}`)}
                  >
                    <MapIcon size={16} color={colors.momentum} />
                  </TouchableOpacity>
                </View>

                {/* Weather Forecast */}
                <View style={styles.infoRow}>
                  <View style={styles.weatherContainer}>
                    {getWeatherIcon(shift.weather.condition)}
                    <Text style={styles.weatherText}>
                      {shift.weather.temp}°C {shift.weather.condition}
                    </Text>
                  </View>

                  {/* Break Time */}
                  {shift.breakTime && (
                    <View style={styles.breakContainer}>
                      <CoffeeIcon size={14} color={colors.slate500} />
                      <Text style={styles.breakText}>{t('screens.scheduleOverview.breakTime', { time: shift.breakTime, defaultValue: '{{time}} break' })}</Text>
                    </View>
                  )}
                </View>

                {/* Manager Note */}
                {shift.managerNote && (
                  <View style={styles.noteContainer}>
                    <FileTextIcon size={14} color={colors.warning} />
                    <Text style={styles.noteText}>{shift.managerNote}</Text>
                  </View>
                )}

                {/* Team Members & Footer */}
                <View style={styles.shiftFooter}>
                  <View style={styles.teamMembers}>
                    <UsersIcon size={14} color={colors.slate400} />
                    <View style={styles.avatarGroup}>
                      {shift.teamMembers.slice(0, 3).map((member, i) => (
                        <View
                          key={i}
                          style={[
                            styles.avatar,
                            {
                              marginStart: i > 0 ? -8 : 0,
                              backgroundColor: roleColor,
                            }
                          ]}
                        >
                          <Text style={styles.avatarText}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                      ))}
                      {shift.teamMembers.length > 3 && (
                        <View style={[styles.avatar, { marginStart: -8, backgroundColor: colors.slate300 }]}>
                          <Text style={[styles.avatarText, { color: colors.slate600 }]}>
                            +{shift.teamMembers.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.teamCountText}>
                      {t('screens.scheduleOverview.teamCount', { count: shift.teamMembers.length, defaultValue: '{{count}} team' })}
                    </Text>
                  </View>

                  <ChevronRightIcon size={20} color={colors.slate400} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Available Shifts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('screens.scheduleOverview.available_shifts')}</Text>
              <View style={styles.availableBadge}>
                <Text style={styles.availableBadgeText}>{t('screens.scheduleOverview.openCount', { count: availableShifts.length, defaultValue: '{{count}} open' })}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ShiftMarketplace')}>
              <Text style={styles.seeAllLink}>{t('screens.scheduleOverview.see_all')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.availableShiftsScroll}
          >
            {availableShifts.map((shift) => {
              const roleColor = getRoleColor(shift.department);

              return (
                <TouchableOpacity
                  key={shift.id}
                  style={[
                    styles.availableShiftCard,
                    shift.urgency === 'urgent' && styles.availableShiftCardUrgent,
                  ]}
                  onPress={() => showAlert(
                    t('schedule.claimThisShift', 'Claim This Shift?'),
                    `${shift.role} — ${shift.date}\n${shift.startTime} - ${shift.endTime} @ ${shift.location}`,
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('screens.scheduleOverview.claim', 'Claim'), onPress: () => showAlert(t('schedule.claimSuccess', 'Shift Claimed!'), t('schedule.claimSuccessMessage', 'This shift has been added to your schedule.')) }
                    ]
                  )}
                >
                  {shift.urgency === 'urgent' && (
                    <View style={styles.urgentBanner}>
                      <Text style={styles.urgentBannerText}>{t('screens.scheduleOverview.urgent')}</Text>
                    </View>
                  )}

                  <View style={[styles.availableRoleBadge, { backgroundColor: roleColor + '15' }]}>
                    <Text style={[styles.availableRoleText, { color: roleColor }]}>{shift.department}</Text>
                  </View>

                  <Text style={styles.availableShiftRole}>{shift.role}</Text>

                  <View style={styles.availableShiftInfo}>
                    <CalendarIcon size={12} color={colors.slate500} />
                    <Text style={styles.availableShiftInfoText}>{shift.date} ({shift.dayOfWeek})</Text>
                  </View>

                  <View style={styles.availableShiftInfo}>
                    <ClockIcon size={12} color={colors.slate500} />
                    <Text style={styles.availableShiftInfoText}>{shift.startTime} - {shift.endTime}</Text>
                  </View>

                  <View style={styles.availableShiftInfo}>
                    <MapPinIcon size={12} color={colors.slate500} />
                    <Text style={styles.availableShiftInfoText} numberOfLines={1}>{shift.location}</Text>
                  </View>

                  {shift.hourlyRate && (
                    <View style={styles.rateContainer}>
                      <Text style={styles.rateText}>£{shift.hourlyRate.toFixed(2)}/hr</Text>
                      <Text style={styles.rateDuration}>{shift.duration}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => showAlert(t('schedule.claimSuccess', 'Shift Claimed!'), t('schedule.claimSuccessMessage', 'This shift has been added to your schedule.'))}
                  >
                    <PlusIcon size={16} color={colors.background} />
                    <Text style={styles.claimButtonText}>{t('screens.scheduleOverview.claim', 'Claim')}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {/* View More Card */}
            <TouchableOpacity
              style={styles.viewMoreCard}
              onPress={() => navigation.navigate('ShiftMarketplace')}
            >
              <View style={styles.viewMoreIcon}>
                <ChevronRightIcon size={24} color={colors.momentum} />
              </View>
              <Text style={styles.viewMoreText}>{t('screens.scheduleOverview.viewAllOpenShifts', 'View all\nopen shifts')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Available Shifts Banner */}
        <TouchableOpacity
          style={styles.availableShiftsBanner}
          onPress={() => navigation.navigate('ShiftMarketplace')}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerIcon}>
              <PlusIcon size={24} color={colors.momentum} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{t('schedule.openShiftsAvailable', { count: availableShifts.length })}</Text>
              <Text style={styles.bannerText}>{t('schedule.claimShiftsMatch')}</Text>
            </View>
            <ChevronRightIcon size={24} color={colors.momentum} />
          </View>
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  title: {
    ...typography.h2,
    color: colors.slate900,
  },
  subtitle: {
    ...typography.caption,
    color: colors.slate600,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  viewToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.slate100,
  },
  viewToggleActive: {
    backgroundColor: colors.momentum,
  },
  viewToggleText: {
    ...typography.bodyBold,
    color: colors.slate700,
    fontSize: 14,
  },
  viewToggleTextActive: {
    color: colors.background,
  },
  content: {
    flex: 1,
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.momentum + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.slate900,
    fontSize: 18,
  },
  statLabel: {
    ...typography.small,
    color: colors.slate500,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.slate200,
    marginHorizontal: spacing.sm,
  },

  // Week Calendar
  weekCalendarContainer: {
    backgroundColor: colors.background,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  weekNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.momentum + '15',
  },
  todayButtonText: {
    ...typography.caption,
    color: colors.momentum,
    fontWeight: '600',
  },
  weekScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  dayCard: {
    width: DAY_CARD_WIDTH,
    minWidth: 58,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayCardToday: {
    backgroundColor: colors.momentum + '10',
    borderColor: colors.momentum,
    borderWidth: 2,
  },
  dayCardPast: {
    opacity: 0.6,
  },
  dayCardHasShift: {
    backgroundColor: colors.background,
    borderColor: colors.slate200,
    borderWidth: 1,
    ...shadows.sm,
  },
  dayCardDay: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dayCardDayToday: {
    color: colors.momentum,
  },
  dayCardDayPast: {
    color: colors.slate400,
  },
  dayCardDateCircle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  dayCardDateCircleToday: {
    backgroundColor: colors.momentum,
  },
  dayCardDate: {
    ...typography.h3,
    color: colors.slate900,
    fontSize: 16,
  },
  dayCardDateToday: {
    color: colors.background,
    fontWeight: '800',
  },
  dayCardDatePast: {
    color: colors.slate400,
  },
  dayCardMonth: {
    ...typography.small,
    color: colors.slate400,
    marginBottom: spacing.sm,
  },
  dayCardMonthToday: {
    color: colors.momentum,
  },
  shiftDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 8,
  },
  shiftDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  noShiftPlaceholder: {
    height: 6,
  },
  moreShiftsText: {
    ...typography.small,
    color: colors.slate500,
    fontSize: 9,
    marginStart: 2,
  },

  // Month Calendar
  monthCalendar: {
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  monthHeaderText: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.slate500,
    fontWeight: '600',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  monthDayToday: {
    backgroundColor: colors.momentum + '20',
    borderRadius: borderRadius.md,
  },
  monthDayText: {
    ...typography.body,
    color: colors.slate900,
  },
  monthDayTextToday: {
    color: colors.momentum,
    fontWeight: '700',
  },
  monthDayTextMuted: {
    color: colors.slate400,
  },
  monthShiftDot: {
    width: 4,
    height: 4,
    backgroundColor: colors.momentum,
    borderRadius: 2,
    marginTop: 2,
  },

  // Manager Start Shift Card
  managerShiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.momentum,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  managerShiftIconBg: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  managerShiftContent: {
    flex: 1,
  },
  managerShiftTitle: {
    ...typography.h3,
    color: colors.background,
    fontSize: 18,
  },
  managerShiftSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.momentum,
  },
  actionButtonText: {
    ...typography.bodyBold,
    color: colors.background,
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
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
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  pendingBadgeText: {
    ...typography.small,
    color: colors.warning,
    fontWeight: '600',
  },
  availableBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  availableBadgeText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '600',
  },
  seeAllLink: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 14,
  },

  // Enhanced Shift Card
  shiftCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderStartWidth: 4,
    ...shadows.md,
  },
  shiftCardActive: {
    borderWidth: 2,
    borderStartWidth: 4,
    borderColor: colors.success,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  roleContainer: {
    flex: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  roleText: {
    ...typography.small,
    fontWeight: '600',
  },
  shiftRole: {
    ...typography.h3,
    color: colors.slate900,
    fontSize: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Time Section
  timeSection: {
    marginBottom: spacing.md,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    ...typography.caption,
    color: colors.slate600,
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.slate600,
    fontWeight: '600',
  },
  durationBadge: {
    backgroundColor: colors.slate100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginStart: spacing.xs,
  },
  durationText: {
    ...typography.small,
    color: colors.slate700,
    fontWeight: '700',
  },

  // Timeline
  timelineContainer: {
    marginTop: spacing.sm,
  },
  timelineBg: {
    height: 4,
    backgroundColor: colors.slate200,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  timelineProgress: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timelineLabel: {
    ...typography.small,
    color: colors.slate400,
    fontSize: 10,
  },
  timelineNow: {
    ...typography.small,
    color: colors.success,
    fontWeight: '700',
    fontSize: 10,
  },

  // Location Row
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  locationText: {
    ...typography.body,
    color: colors.slate700,
    fontSize: 14,
  },
  mapPreviewButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.momentum + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info Row (Weather & Break)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weatherText: {
    ...typography.caption,
    color: colors.slate600,
    textTransform: 'capitalize',
  },
  breakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breakText: {
    ...typography.caption,
    color: colors.slate600,
  },

  // Manager Note
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warning + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  noteText: {
    ...typography.caption,
    color: colors.slate700,
    flex: 1,
    fontStyle: 'italic',
  },

  // Shift Footer
  shiftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  teamMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarGroup: {
    flexDirection: 'row',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarText: {
    ...typography.small,
    color: colors.background,
    fontSize: 9,
    fontWeight: '700',
  },
  teamCountText: {
    ...typography.small,
    color: colors.slate500,
  },

  // Available Shifts Section
  availableShiftsScroll: {
    gap: spacing.md,
    paddingEnd: spacing.lg,
  },
  availableShiftCard: {
    width: 160,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    ...shadows.sm,
  },
  availableShiftCardUrgent: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  urgentBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderTopRightRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
  },
  urgentBannerText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '700',
    fontSize: 9,
  },
  availableRoleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  availableRoleText: {
    ...typography.small,
    fontWeight: '600',
    fontSize: 10,
  },
  availableShiftRole: {
    ...typography.bodyBold,
    color: colors.slate900,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  availableShiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  availableShiftInfoText: {
    ...typography.small,
    color: colors.slate600,
    flex: 1,
  },
  rateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  rateText: {
    ...typography.bodyBold,
    color: colors.success,
    fontSize: 14,
  },
  rateDuration: {
    ...typography.small,
    color: colors.slate500,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  claimButtonText: {
    ...typography.bodyBold,
    color: colors.background,
    fontSize: 12,
  },
  viewMoreCard: {
    width: 100,
    backgroundColor: colors.momentum + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.momentum,
    borderStyle: 'dashed',
  },
  viewMoreIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  viewMoreText: {
    ...typography.caption,
    color: colors.momentum,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Banner
  availableShiftsBanner: {
    backgroundColor: colors.momentum + '15',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.momentum,
    borderStyle: 'dashed',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    ...typography.h3,
    color: colors.momentum,
    fontSize: 16,
  },
  bannerText: {
    ...typography.body,
    color: colors.slate700,
    marginTop: spacing.xs / 2,
  },

  // Loading & Empty States
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.slate600,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.slate700,
    marginTop: spacing.md,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.slate500,
    marginTop: spacing.sm,
  },
});
