import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarIcon,
  UsersIcon,
  ZapIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  StarIcon,
  TargetIcon,
  MapPinIcon,
  PlusIcon,
  EditIcon,
  XIcon,
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 6) / 5;

type ViewMode = 'day' | 'week' | 'month';

interface Shift {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  role: string;
  department: string;
  assignedTo?: {
    name: string;
    skillMatch: number;
    momentum: number;
  };
  required: number;
  filled: number;
  location: string;
  status: 'published' | 'draft' | 'open';
}

interface Worker {
  id: string;
  name: string;
  role: string;
  skillMatch: number;
  momentum: number;
  hoursThisWeek: number;
  maxHours: number;
  available: boolean;
  reason?: string;
}

// Role/Department color mapping
const ROLE_COLORS: Record<string, string> = {
  'Opening': '#10B981',
  'Floor': '#3B82F6',
  'Closing': '#8B5CF6',
  'Weekend': '#F59E0B',
  'Kitchen': '#EF4444',
  'Bar': '#EC4899',
  'default': colors.momentum,
};


const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  published: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
  draft: { bg: '#FFF7ED', border: '#F59E0B', text: '#92400E' },
  open: { bg: '#F8FAFC', border: '#94A3B8', text: '#475569' },
};

const getRoleColor = (role: string): string => {
  return ROLE_COLORS[role] || ROLE_COLORS.default;
};


const generateDemoShifts = (): Shift[] => [
  { id: 's1', day: 0, startTime: '06:00', endTime: '14:00', role: 'Opening Manager', department: 'Opening', assignedTo: { name: 'Sarah Johnson', skillMatch: 95, momentum: 92 }, required: 1, filled: 1, location: 'Main Restaurant', status: 'published' },
  { id: 's2', day: 0, startTime: '09:00', endTime: '17:00', role: 'Floor Supervisor', department: 'Floor', assignedTo: { name: 'Mike Chen', skillMatch: 88, momentum: 85 }, required: 2, filled: 2, location: 'Main Restaurant', status: 'published' },
  { id: 's3', day: 0, startTime: '11:00', endTime: '15:00', role: 'Kitchen Assistant', department: 'Kitchen', required: 2, filled: 1, location: 'Main Kitchen', status: 'draft' },
  { id: 's4', day: 1, startTime: '14:00', endTime: '22:00', role: 'Bartender', department: 'Bar', assignedTo: { name: 'Jessica Martinez', skillMatch: 82, momentum: 78 }, required: 2, filled: 1, location: 'Bar & Lounge', status: 'published' },
  { id: 's5', day: 1, startTime: '09:00', endTime: '17:00', role: 'Floor Associate', department: 'Floor', assignedTo: { name: 'Lisa Park', skillMatch: 91, momentum: 86 }, required: 3, filled: 2, location: 'Main Restaurant', status: 'draft' },
  { id: 's6', day: 2, startTime: '06:00', endTime: '14:00', role: 'Opening Manager', department: 'Opening', required: 1, filled: 0, location: 'Main Restaurant', status: 'draft' },
  { id: 's7', day: 2, startTime: '10:00', endTime: '18:00', role: 'Server', department: 'Floor', assignedTo: { name: 'Tom Roberts', skillMatch: 79, momentum: 72 }, required: 2, filled: 2, location: 'Main Restaurant', status: 'published' },
  { id: 's8', day: 3, startTime: '17:00', endTime: '01:00', role: 'Weekend Crew', department: 'Weekend', assignedTo: { name: 'David Kim', skillMatch: 75, momentum: 88 }, required: 3, filled: 2, location: 'Events Hall', status: 'draft' },
  { id: 's9', day: 3, startTime: '06:00', endTime: '14:00', role: 'Kitchen Prep', department: 'Kitchen', required: 2, filled: 0, location: 'Main Kitchen', status: 'draft' },
  { id: 's10', day: 4, startTime: '09:00', endTime: '17:00', role: 'Floor Supervisor', department: 'Floor', assignedTo: { name: 'Sarah Johnson', skillMatch: 95, momentum: 92 }, required: 1, filled: 1, location: 'Main Restaurant', status: 'published' },
  { id: 's11', day: 4, startTime: '16:00', endTime: '00:00', role: 'Closing Manager', department: 'Closing', required: 1, filled: 0, location: 'Main Restaurant', status: 'draft' },
  { id: 's12', day: 5, startTime: '10:00', endTime: '18:00', role: 'Weekend Crew', department: 'Weekend', assignedTo: { name: 'Mike Chen', skillMatch: 88, momentum: 85 }, required: 4, filled: 3, location: 'Events Hall', status: 'published' },
  { id: 's13', day: 6, startTime: '10:00', endTime: '18:00', role: 'Weekend Crew', department: 'Weekend', required: 4, filled: 2, location: 'Events Hall', status: 'draft' },
];
export const ScheduleBuilderScreen = ({ navigation, hideHeader }: { navigation: any; hideHeader?: boolean }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const weekScrollRef = useRef<ScrollView>(null);

  const weekDayKeys = ['common.weekDaysShortMon','common.weekDaysShortTue','common.weekDaysShortWed','common.weekDaysShortThu','common.weekDaysShortFri','common.weekDaysShortSat','common.weekDaysShortSun'];
  const weekDaysShortFallback = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const fullWeekDayKeys = ['common.weekDaysMon','common.weekDaysTue','common.weekDaysWed','common.weekDaysThu','common.weekDaysFri','common.weekDaysSat','common.weekDaysSun'];
  const fullWeekDaysFallback = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  // Get current week dates
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (selectedWeekOffset * 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // Generate week data
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      date: d.getDate(),
      day: t(weekDayKeys[i], weekDaysShortFallback[i]),
      fullDay: t(fullWeekDayKeys[i], fullWeekDaysFallback[i]),
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      fullDate: new Date(d),
      isToday: d.toDateString() === today.toDateString(),
      isPast: d < today && d.toDateString() !== today.toDateString(),
    };
  });

  const formatWeekRange = () => {
    const startMonth = startOfWeek.toLocaleDateString('en-GB', { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString('en-GB', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startOfWeek.getDate()}-${endOfWeek.getDate()} ${startMonth}`;
    }
    return `${startOfWeek.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeekOffset(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  // Shifts populated with demo data

  const [shifts, setShifts] = useState<Shift[]>(generateDemoShifts());

  const availableWorkers: Worker[] = [
    { id: '1', name: 'Sarah Johnson', role: 'Floor Associate', skillMatch: 95, momentum: 92, hoursThisWeek: 24, maxHours: 40, available: true },
    { id: '2', name: 'Mike Chen', role: 'Team Lead', skillMatch: 88, momentum: 85, hoursThisWeek: 32, maxHours: 40, available: true },
    { id: '3', name: 'Jessica Martinez', role: 'Customer Service', skillMatch: 82, momentum: 78, hoursThisWeek: 16, maxHours: 40, available: true },
    { id: '4', name: 'David Kim', role: 'Warehouse', skillMatch: 75, momentum: 88, hoursThisWeek: 40, maxHours: 40, available: false, reason: 'Max hours reached' },
    { id: '5', name: 'Lisa Park', role: 'Floor Associate', skillMatch: 91, momentum: 86, hoursThisWeek: 28, maxHours: 40, available: true },
    { id: '6', name: 'Tom Roberts', role: 'Customer Service', skillMatch: 79, momentum: 72, hoursThisWeek: 20, maxHours: 32, available: true },
  ];

  // Calculate stats
  const totalShifts = shifts.reduce((acc, s) => acc + s.required, 0);
  const filledShifts = shifts.reduce((acc, s) => acc + s.filled, 0);
  const coveragePercent = totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0;
  const labourCost = filledShifts * 8 * 12.50;
  const budgetTarget = 15000;
  const budgetPercent = Math.round((labourCost / budgetTarget) * 100);

  const getDayShifts = (day: number) => shifts.filter(s => s.day === day);

  const getShiftStatus = (shift: Shift) => {
    if (shift.filled >= shift.required) return 'filled';
    if (shift.filled >= shift.required * 0.5) return 'partial';
    return 'critical';
  };

  const handleAIGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowAIModal(false);

      setShifts(prev => prev.map(s => ({
        ...s,
        filled: s.required,
        assignedTo: s.assignedTo || { name: 'AI Assigned', skillMatch: Math.floor(Math.random() * 15) + 80, momentum: Math.floor(Math.random() * 15) + 75 }
      })));

      showAlert(
        'Schedule Generated',
        'AI has optimised the schedule:\n\n• 100% coverage achieved\n• Average skill match: 87%\n• Labour cost: £12,450 (17% under budget)\n• All worker preferences honoured',
        [{ text: 'Review Schedule' }]
      );
    }, 2500);
  };

  const handleAssignWorker = (worker: Worker) => {
    if (!selectedShift) return;

    setShifts(prev => prev.map(s =>
      s.id === selectedShift.id
        ? { ...s, filled: Math.min(s.filled + 1, s.required), assignedTo: { name: worker.name, skillMatch: worker.skillMatch, momentum: worker.momentum } }
        : s
    ));

    setShowAssignModal(false);
    showAlert('Assigned', `${worker.name} assigned to ${selectedShift.role} shift`);
  };

  const openAssignModal = (shift: Shift) => {
    setSelectedShift(shift);
    setShowAssignModal(true);
  };

    const toggleShiftExpansion = (shiftId: string) => setExpandedShiftId(prev => prev === shiftId ? null : shiftId);

  const handleShiftAction = (action: string, shift: Shift) => {
    switch (action) {
      case 'edit': showAlert(t('schedule.editShift', 'Edit Shift'), `${shift.role} - ${shift.startTime} - ${shift.endTime}`); break;
      case 'reassign': openAssignModal(shift); break;
      case 'swap': showAlert(t('schedule.reassignShift', 'Reassign Shift'), `${shift.role} ${t('schedule.swapRequest', 'Swap Request')}`); break;
      case 'delete':
        showAlert(t('schedule.deleteShift', 'Delete Shift'), `${shift.role} - ${shift.startTime}?`, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: () => {
            setShifts(prev => prev.filter(s => s.id !== shift.id)); setExpandedShiftId(null);
            showAlert(t('common.success'), t('schedule.shiftDeleted', 'Shift deleted'));
          }},
        ]); break;
    }
  };

  const handleAddShift = (dayIndex: number) => {
    const dayName = weekData[dayIndex]?.fullDay;
    showAlert(t('schedule.addShift', 'Add Shift'), t('screens.scheduleBuilder.createShiftFor', `Create shift for ${dayName}?`), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.add', 'Add'), onPress: () => {
        const newShift: Shift = { id: `s${Date.now()}`, day: dayIndex, startTime: '09:00', endTime: '17:00', role: 'Floor Associate', department: 'Floor', required: 1, filled: 0, location: 'Main Restaurant', status: 'draft' };
        setShifts(prev => [...prev, newShift]);
        showAlert(t('common.success'), t('screens.scheduleBuilder.newShiftAdded', 'New shift added'));
      }},
    ]);
  };

  const handlePublish = () => {
    showAlert(t('manager.publishSchedule'), t('schedule.publishConfirm', 'Publish all draft shifts and notify team members?'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('manager.publishSchedule'), onPress: () => {
        setShifts(prev => prev.map(s => s.status === 'draft' ? { ...s, status: 'published' as const } : s));
        showAlert(t('common.success'), t('schedule.allShiftsPublished', 'All shifts published'));
      }},
    ]);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return t('schedule.published', 'Published');
      case 'draft': return t('schedule.draft', 'Draft');
      case 'open': return t('schedule.open', 'Open');
      default: return status;
    }
  };

// Generate month calendar
  const generateMonthCalendar = () => {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: i, isCurrentMonth: true });
    }

    return days;
  };

  const renderDayView = () => {
    const dayShifts = getDayShifts(selectedDayIndex);
    const dayLabel = weekData[selectedDayIndex]?.fullDay || weekData[selectedDayIndex]?.day || '';
    
    return (
      <View style={styles.dayViewContainer}>
        {/* Day selector bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector} contentContainerStyle={{ gap: spacing.sm }}>
          {weekData.map((d, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.daySelectorItem, selectedDayIndex === idx && styles.daySelectorItemActive]}
              onPress={() => setSelectedDayIndex(idx)}
            >
              <Text style={[styles.daySelectorLabel, selectedDayIndex === idx && styles.daySelectorLabelActive]}>{d.day}</Text>
              <Text style={[styles.daySelectorDate, selectedDayIndex === idx && styles.daySelectorDateActive]}>{d.date}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Day header */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderTitle}>{dayLabel}</Text>
          <Text style={styles.dayHeaderCount}>{dayShifts.length} {t('screens.scheduleBuilder.shifts_label', 'shifts')}</Text>
        </View>

        {/* Day shifts timeline */}
        {dayShifts.length === 0 ? (
          <View style={styles.dayEmpty}>
            <Text style={styles.dayEmptyText}>{t('screens.scheduleBuilder.no_shifts_day', 'No shifts scheduled for this day')}</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => handleAddShift(selectedDayIndex)}>
              <PlusIcon size={16} color={colors.momentum} />
              <Text style={styles.addButtonText}>{t('common.add', 'Add')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dayShifts.map(shift => {
            const statusColor = STATUS_COLORS[shift.status] || STATUS_COLORS.open;
            return (
              <TouchableOpacity
                key={shift.id}
                activeOpacity={0.7}
                onPress={() => toggleShiftExpansion(shift.id)}
                style={[styles.dayShiftCard, { borderStartColor: statusColor.border, backgroundColor: statusColor.bg }]}
              >
                <View style={styles.dayShiftTime}>
                  <Text style={styles.dayShiftTimeText}>{shift.startTime}</Text>
                  <View style={styles.dayShiftTimeLine} />
                  <Text style={styles.dayShiftTimeText}>{shift.endTime}</Text>
                </View>
                <View style={styles.dayShiftInfo}>
                  <Text style={styles.dayShiftRole} numberOfLines={1}>{shift.role}</Text>
                  <View style={styles.dayShiftMeta}>
                    <MapPinIcon size={12} color={colors.slate500} />
                    <Text style={styles.dayShiftMetaText}>{shift.location}</Text>
                  </View>
                  {shift.assignedTo ? (
                    <Text style={styles.dayShiftAssigned}>{shift.assignedTo.name}</Text>
                  ) : (
                    <Text style={[styles.dayShiftAssigned, { color: colors.warning }]}>{t('screens.scheduleBuilder.unassigned', 'Unassigned')}</Text>
                  )}
                  <View style={[styles.statusPill, { backgroundColor: statusColor.border + '20' }]}>
                    <Text style={[styles.statusPillText, { color: statusColor.text }]}>{getStatusLabel(shift.status)}</Text>
                  </View>
                </View>
                <View style={styles.dayShiftCoverage}>
                  <Text style={[styles.coverageText, { color: shift.filled >= shift.required ? colors.success : colors.warning }]}>{shift.filled}/{shift.required}</Text>
                </View>
                {expandedShiftId === shift.id && (
                  <View style={styles.expandedActions}>
                    <TouchableOpacity style={styles.expandedActionButton} onPress={() => handleShiftAction('edit', shift)}>
                      <EditIcon size={16} color={colors.momentum} />
                      <Text style={styles.expandedActionText}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.expandedActionButton} onPress={() => handleShiftAction('reassign', shift)}>
                      <UsersIcon size={16} color={colors.info} />
                      <Text style={[styles.expandedActionText, { color: colors.info }]}>{t('schedule.reassignShift', 'Reassign')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.expandedActionButton} onPress={() => handleShiftAction('swap', shift)}>
                      <CalendarIcon size={16} color={colors.warning} />
                      <Text style={[styles.expandedActionText, { color: colors.warning }]}>{t('schedule.swapShift', 'Swap')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.expandedActionButton} onPress={() => handleShiftAction('delete', shift)}>
                      <XIcon size={16} color={colors.error} />
                      <Text style={[styles.expandedActionText, { color: colors.error }]}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  };

  const monthCalendar = generateMonthCalendar();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, hideHeader && { paddingTop: spacing.md }]}>
        {!hideHeader && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('manager.scheduleBuilder')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {viewMode === 'week' ? formatWeekRange() : viewMode === 'day' ? today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'day' && styles.viewToggleActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'day' && styles.viewToggleTextActive]}>
              {t('schedule.dayView', 'Day')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'week' && styles.viewToggleActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'week' && styles.viewToggleTextActive]}>{t('schedule.weekView', 'Week')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'month' && styles.viewToggleActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>{t('schedule.monthView', 'Month')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: coveragePercent >= 90 ? colors.success + '20' : colors.warning + '20' }]}>
              <CheckCircleIcon size={18} color={coveragePercent >= 90 ? colors.success : colors.warning} />
            </View>
            <View>
              <Text style={styles.statValue}>{coveragePercent}%</Text>
              <Text style={styles.statLabel}>{t('screens.scheduleBuilder.coverage', 'Coverage')}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.info + '20' }]}>
              <UsersIcon size={18} color={colors.info} />
            </View>
            <View>
              <Text style={styles.statValue}>{filledShifts}/{totalShifts}</Text>
              <Text style={styles.statLabel}>{t('screens.scheduleBuilder.filled', 'Filled')}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: budgetPercent <= 100 ? colors.success + '20' : colors.error + '20' }]}>
              <ClockIcon size={18} color={budgetPercent <= 100 ? colors.success : colors.error} />
            </View>
            <View>
              <Text style={[styles.statValue, { fontSize: 14 }]}>£{(labourCost / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>{budgetPercent}% budget</Text>
            </View>
          </View>
        </View>

        {/* AI Fill Button */}
        <TouchableOpacity
          style={styles.aiFillButton}
          onPress={() => setShowAIModal(true)}
        >
          <ZapIcon size={20} color={colors.background} />
          <Text style={styles.aiFillButtonText}>{t('screens.scheduleBuilder.ai_autofill_gaps')}</Text>
          <View style={styles.aiFillBadge}>
            <Text style={styles.aiFillBadgeText}>{totalShifts - filledShifts} {t('screens.scheduleBuilder.gaps', 'gaps')}</Text>
          </View>
        </TouchableOpacity>

        {/* Week Calendar */}
        {viewMode === 'week' && (
          <View style={styles.weekCalendarContainer}>
            <View style={styles.weekNavHeader}>
              <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.weekNavButton}>
                <ChevronLeftIcon size={20} color={colors.slate600} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedWeekOffset(0)} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>{t('common.today', 'Today')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.weekNavButton}>
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
                const dayShifts = getDayShifts(index);
                const dayFilled = dayShifts.reduce((acc, s) => acc + s.filled, 0);
                const dayRequired = dayShifts.reduce((acc, s) => acc + s.required, 0);
                const hasGaps = dayFilled < dayRequired;
                const gapCount = dayRequired - dayFilled;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCard,
                      dayInfo.isToday && styles.dayCardToday,
                      dayInfo.isPast && styles.dayCardPast,
                      hasGaps && styles.dayCardHasGaps,
                    ]}
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
                    <Text style={[styles.dayCardMonth, dayInfo.isToday && styles.dayCardMonthToday]}>
                      {dayInfo.month}
                    </Text>

                    {/* Shift indicators */}
                    <View style={styles.shiftDotsContainer}>
                      {dayShifts.slice(0, 3).map((shift, i) => (
                        <View
                          key={i}
                          style={[
                            styles.shiftDot,
                            { backgroundColor: getRoleColor(shift.department) }
                          ]}
                        />
                      ))}
                    </View>

                    {/* Gap indicator */}
                    {hasGaps && (
                      <View style={styles.gapBadge}>
                        <Text style={styles.gapBadgeText}>{gapCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Month Calendar */}
        {viewMode === 'month' && (
          <View style={styles.monthCalendar}>
            <View style={styles.monthHeader}>
              {weekData.map(d => (
                <Text key={d.day} style={styles.monthHeaderText}>{d.day.slice(0, 1)}</Text>
              ))}
            </View>
            <View style={styles.monthGrid}>
              {monthCalendar.map((day, index) => {
                const dayIndex = day.date ? (new Date(today.getFullYear(), today.getMonth(), day.date).getDay() + 6) % 7 : -1;
                const dayShifts = dayIndex >= 0 ? getDayShifts(dayIndex) : [];
                const hasGaps = dayShifts.some(s => s.filled < s.required);
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
                        {dayShifts.length > 0 && (
                          <View style={[styles.monthShiftDot, hasGaps && { backgroundColor: colors.error }]} />
                        )}
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Day View */}
        {viewMode === 'day' && renderDayView()}

        {/* Role Color Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>{t('screens.scheduleBuilder.shift_types')}</Text>
          <View style={styles.legendItems}>
            {Object.entries(ROLE_COLORS).filter(([key]) => key !== 'default').map(([role, color]) => (
              <View key={role} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{role}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.legendTitle, { marginTop: spacing.md }]}>{t('screens.scheduleBuilder.status_legend', 'Status')}</Text>
          <View style={styles.legendItems}>
            {Object.entries(STATUS_COLORS).map(([status, sc]) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: sc.border }]} />
                <Text style={styles.legendText}>{getStatusLabel(status)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Shifts List */}
        {viewMode !== 'day' && <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.scheduleBuilder.this_weeks_shifts')}</Text>
            <TouchableOpacity onPress={() => handleAddShift(0)}>
              <View style={styles.addButton}>
                <PlusIcon size={16} color={colors.momentum} />
                <Text style={styles.addButtonText}>{t('common.add', 'Add')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {weekData.map((dayInfo, dayIndex) => {
            const dayShifts = getDayShifts(dayIndex);
            if (dayShifts.length === 0) return null;

            return (
              <View key={dayIndex} style={styles.daySection}>
                <Text style={styles.daySectionTitle}>{dayInfo.fullDay}, {dayInfo.date} {dayInfo.month}</Text>

                {dayShifts.map((shift) => {
                  const roleColor = getRoleColor(shift.department);
                  const status = getShiftStatus(shift);
                  const statusColor = status === 'filled' ? colors.success : status === 'partial' ? colors.warning : colors.error;

                  return (
                    <TouchableOpacity
                      key={shift.id}
                      style={[styles.shiftCard, { borderStartColor: (STATUS_COLORS[shift.status] || STATUS_COLORS.open).border, backgroundColor: (STATUS_COLORS[shift.status] || STATUS_COLORS.open).bg }]}
                      onPress={() => toggleShiftExpansion(shift.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.shiftCardHeader}>
                        <View style={styles.roleContainer}>
                          <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
                            <Text style={[styles.roleText, { color: roleColor }]}>{shift.department}</Text>
                          </View>
                          <Text style={styles.shiftRole}>{shift.role}</Text>
                        </View>

                        <View style={[styles.coverageBadge, { backgroundColor: statusColor + '15' }]}>
                          <Text style={[styles.coverageText, { color: statusColor }]}>
                            {shift.filled}/{shift.required}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.shiftDetails}>
                        <View style={styles.detailRow}>
                          <ClockIcon size={14} color={colors.slate500} />
                          <Text style={styles.detailText}>{shift.startTime} - {shift.endTime}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MapPinIcon size={14} color={colors.slate500} />
                          <Text style={styles.detailText}>{shift.location}</Text>
                        </View>
                      </View>

                      {shift.assignedTo && (
                        <View style={styles.assignedSection}>
                          <View style={styles.workerAvatar}>
                            <Text style={styles.workerInitials}>
                              {shift.assignedTo.name.split(' ').map(n => n[0]).join('')}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.workerName}>{shift.assignedTo.name}</Text>
                            <View style={styles.workerStats}>
                              <View style={styles.workerStat}>
                                <TargetIcon size={12} color={colors.momentum} />
                                <Text style={styles.workerStatText}>{shift.assignedTo.skillMatch}%</Text>
                              </View>
                              <View style={styles.workerStat}>
                                <StarIcon size={12} color={colors.warning} />
                                <Text style={styles.workerStatText}>{shift.assignedTo.momentum}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}

                      {shift.filled < shift.required && (
                        <View style={styles.gapAlert}>
                          <AlertCircleIcon size={14} color={colors.error} />
                          <Text style={styles.gapAlertText}>
                            {t('screens.scheduleBuilder.moreNeeded', {count: shift.required - shift.filled, defaultValue: (shift.required - shift.filled) + ' more needed'})}
                          </Text>
                          <TouchableOpacity style={styles.quickFillButton} onPress={() => showAlert(t('screens.scheduleBuilder.quick_fill'), t('screens.scheduleBuilder.ai_autofill_gaps'))}>
                            <Text style={styles.quickFillText}>{t('screens.scheduleBuilder.quick_fill')}</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Expanded actions */}
                      {expandedShiftId === shift.id && (
                        <View style={styles.expandedActions}>
                          <TouchableOpacity style={styles.expandedActionButton} onPress={() => handleShiftAction('edit', shift)}>
                            <EditIcon size={16} color={colors.momentum} />
                            <Text style={styles.expandedActionText}>{t('common.edit')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.expandedActionButton} onPress={() => handleShiftAction('reassign', shift)}>
                            <UsersIcon size={16} color={colors.info} />
                            <Text style={[styles.expandedActionText, { color: colors.info }]}>{t('schedule.reassignShift', 'Reassign')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.expandedActionButton} onPress={() => handleShiftAction('swap', shift)}>
                            <CalendarIcon size={16} color={colors.warning} />
                            <Text style={[styles.expandedActionText, { color: colors.warning }]}>{t('schedule.swapShift', 'Swap')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.expandedActionButton} onPress={() => handleShiftAction('delete', shift)}>
                            <XIcon size={16} color={colors.error} />
                            <Text style={[styles.expandedActionText, { color: colors.error }]}>{t('common.delete')}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* AI Generation Modal */}
      <Modal visible={showAIModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ZapIcon size={32} color={colors.momentum} />
              <Text style={styles.modalTitle}>{t('screens.scheduleBuilder.ai_auto_scheduler')}</Text>
              <Text style={styles.modalSubtitle}>{t('screens.scheduleBuilder.generate_optimised_schedule')}</Text>
            </View>

            <View style={styles.aiOptions}>
              <Text style={styles.aiOptionsTitle}>{t('screens.scheduleBuilder.optimisation_priorities')}</Text>

              {[
                { label: t('screens.scheduleBuilder.skills_match', 'Skills Match'), desc: t('screens.scheduleBuilder.skills_match_desc', 'Best skill fit for roles'), icon: TargetIcon },
                { label: t('screens.scheduleBuilder.momentum_scores', 'Momentum Scores'), desc: t('screens.scheduleBuilder.momentum_scores_desc', 'Reward high performers'), icon: StarIcon },
                { label: t('screens.scheduleBuilder.worker_preferences', 'Worker Preferences'), desc: t('screens.scheduleBuilder.worker_preferences_desc', 'Honour availability'), icon: UsersIcon },
                { label: t('screens.scheduleBuilder.labour_budget', 'Labour Budget'), desc: t('screens.scheduleBuilder.labour_budget_desc', 'Stay within budget target'), icon: ClockIcon },
              ].map((option, i) => (
                <View key={i} style={styles.aiOption}>
                  <View style={styles.aiOptionIcon}>
                    <option.icon size={20} color={colors.momentum} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiOptionLabel}>{option.label}</Text>
                    <Text style={styles.aiOptionDesc}>{option.desc}</Text>
                  </View>
                  <CheckCircleIcon size={20} color={colors.success} />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
              onPress={handleAIGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Text style={styles.generateButtonText}>{t('screens.scheduleBuilder.generating')}</Text>
              ) : (
                <>
                  <ZapIcon size={20} color={colors.background} />
                  <Text style={styles.generateButtonText}>{t('screens.scheduleBuilder.generate_schedule')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAIModal(false)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Worker Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('screens.scheduleBuilder.assign_worker')}</Text>
            <Text style={styles.modalSubtitle}>
              {selectedShift?.role} • {selectedShift?.startTime} - {selectedShift?.endTime}
            </Text>

            <ScrollView style={styles.workersList}>
              {availableWorkers.map((worker) => (
                <TouchableOpacity
                  key={worker.id}
                  style={[styles.workerOption, !worker.available && styles.workerOptionDisabled]}
                  onPress={() => worker.available && handleAssignWorker(worker)}
                  disabled={!worker.available}
                >
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerInitials}>
                      {worker.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workerOptionName}>{worker.name}</Text>
                    <Text style={styles.workerOptionRole}>{worker.role}</Text>
                    {!worker.available && (
                      <Text style={styles.workerUnavailable}>{worker.reason}</Text>
                    )}
                  </View>
                  <View style={styles.workerScores}>
                    <View style={[styles.scoreTag, { backgroundColor: worker.skillMatch >= 85 ? colors.success + '20' : colors.warning + '20' }]}>
                      <Text style={[styles.scoreTagText, { color: worker.skillMatch >= 85 ? colors.success : colors.warning }]}>
                        {worker.skillMatch}%
                      </Text>
                    </View>
                    <Text style={styles.workerHours}>{worker.hoursThisWeek}/{worker.maxHours}h</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAssignModal(false)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Publish Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.publishButton}
          onPress={handlePublish}
        >
          <Text style={styles.publishButtonText}>{t('manager.publishSchedule')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.md,
    ...shadows.sm,
  },
  backButton: {},
  backButtonText: { ...typography.bodyBold, color: colors.momentum },
  title: { ...typography.h2, color: colors.slate900 },
  subtitle: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  viewToggle: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.slate100 },
  viewToggleActive: { backgroundColor: colors.momentum },
  viewToggleText: { ...typography.bodyBold, color: colors.slate700, fontSize: 12 },
  viewToggleTextActive: { color: colors.background },

  content: { flex: 1 },

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
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statIconContainer: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...typography.h3, color: colors.slate900, fontSize: 16 },
  statLabel: { ...typography.small, color: colors.slate500 },
  statDivider: { width: 1, backgroundColor: colors.slate200, marginHorizontal: spacing.sm },

  // AI Fill Button
  aiFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  aiFillButtonText: { ...typography.bodyBold, color: colors.background },
  aiFillBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  aiFillBadgeText: { ...typography.small, color: colors.background, fontWeight: '600' },

  // Week Calendar
  weekCalendarContainer: { backgroundColor: colors.background, marginTop: spacing.md, paddingVertical: spacing.md },
  weekNavHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  weekNavButton: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  todayButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, backgroundColor: colors.momentum + '15' },
  todayButtonText: { ...typography.caption, color: colors.momentum, fontWeight: '600' },
  weekScrollContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  dayCard: { width: DAY_CARD_WIDTH, minWidth: 58, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.slate50, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  dayCardToday: { backgroundColor: colors.momentum + '10', borderColor: colors.momentum, borderWidth: 2 },
  dayCardPast: { opacity: 0.6 },
  dayCardHasGaps: { borderColor: colors.error, borderWidth: 2 },
  dayCardDay: { ...typography.caption, color: colors.slate500, fontWeight: '600', marginBottom: spacing.xs },
  dayCardDayToday: { color: colors.momentum },
  dayCardDayPast: { color: colors.slate400 },
  dayCardDateCircle: { width: 32, height: 32, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  dayCardDateCircleToday: { backgroundColor: colors.momentum },
  dayCardDate: { ...typography.h3, color: colors.slate900, fontSize: 16 },
  dayCardDateToday: { color: colors.background, fontWeight: '800' },
  dayCardDatePast: { color: colors.slate400 },
  dayCardMonth: { ...typography.small, color: colors.slate400, marginBottom: spacing.sm },
  dayCardMonthToday: { color: colors.momentum },
  shiftDotsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 8 },
  shiftDot: { width: 6, height: 6, borderRadius: borderRadius.full },
  gapBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.error, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  gapBadgeText: { ...typography.small, color: colors.background, fontSize: 10, fontWeight: '700' },

  // Month Calendar
  monthCalendar: { backgroundColor: colors.background, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: borderRadius.lg },
  monthHeader: { flexDirection: 'row', marginBottom: spacing.sm },
  monthHeaderText: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.slate500, fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xs },
  monthDayToday: { backgroundColor: colors.momentum + '20', borderRadius: borderRadius.md },
  monthDayText: { ...typography.body, color: colors.slate900 },
  monthDayTextToday: { color: colors.momentum, fontWeight: '700' },
  monthDayTextMuted: { color: colors.slate400 },
  monthShiftDot: { width: 4, height: 4, backgroundColor: colors.momentum, borderRadius: 2, marginTop: 2 },

  // Legend
  legendContainer: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.lg },
  legendTitle: { ...typography.caption, color: colors.slate600, marginBottom: spacing.sm },
  legendItems: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...typography.small, color: colors.slate600 },

  // Section
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.slate900 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.momentum + '15', borderRadius: borderRadius.md },
  addButtonText: { ...typography.bodyBold, color: colors.momentum, fontSize: 14 },

  // Day Section
  daySection: { marginBottom: spacing.lg },
  daySectionTitle: { ...typography.bodyBold, color: colors.slate700, marginBottom: spacing.sm },

  // Shift Card
  shiftCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderStartWidth: 4, ...shadows.md },
  shiftCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  roleContainer: { flex: 1 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm, alignSelf: 'flex-start', marginBottom: spacing.xs },
  roleText: { ...typography.small, fontWeight: '600' },
  shiftRole: { ...typography.h3, color: colors.slate900, fontSize: 16 },
  coverageBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  coverageText: { ...typography.bodyBold, fontSize: 14 },
  shiftDetails: { marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  detailText: { ...typography.caption, color: colors.slate600 },
  assignedSection: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate100 },
  workerAvatar: { width: 36, height: 36, borderRadius: borderRadius.full, backgroundColor: colors.slate200, alignItems: 'center', justifyContent: 'center' },
  workerInitials: { ...typography.bodyBold, color: colors.slate700, fontSize: 12 },
  workerName: { ...typography.bodyBold, color: colors.slate900 },
  workerStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs / 2 },
  workerStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs / 2 },
  workerStatText: { ...typography.caption, color: colors.slate600 },
  gapAlert: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.error + '10', borderRadius: borderRadius.md },
  gapAlertText: { ...typography.caption, color: colors.error, flex: 1 },
  quickFillButton: { backgroundColor: colors.error, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  quickFillText: { ...typography.small, color: colors.background, fontWeight: '700' },

  // Status pill
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusPillText: { ...typography.small, fontWeight: '600', fontSize: 10 },

  // Expanded actions
  expandedActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate200 },
  expandedActionButton: { alignItems: 'center', gap: spacing.xs / 2, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  expandedActionText: { ...typography.small, color: colors.momentum, fontWeight: '600' },

  // Day View
  dayViewContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  daySelector: { marginBottom: spacing.md },
  daySelectorItem: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.slate100, minWidth: 52 },
  daySelectorItemActive: { backgroundColor: colors.momentum },
  daySelectorLabel: { ...typography.small, color: colors.slate600, fontWeight: '600' },
  daySelectorLabelActive: { color: colors.background },
  daySelectorDate: { ...typography.bodyBold, color: colors.slate900, marginTop: 2 },
  daySelectorDateActive: { color: colors.background },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  dayHeaderTitle: { ...typography.h3, color: colors.slate900 },
  dayHeaderCount: { ...typography.caption, color: colors.slate500 },
  dayEmpty: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.md },
  dayEmptyText: { ...typography.body, color: colors.slate400, textAlign: 'center' },
  dayShiftCard: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderStartWidth: 4, ...shadows.sm, flexWrap: 'wrap' },
  dayShiftTime: { alignItems: 'center', marginRight: spacing.md, paddingTop: 2 },
  dayShiftTimeText: { ...typography.caption, color: colors.slate700, fontWeight: '600', fontSize: 11 },
  dayShiftTimeLine: { width: 1, height: 16, backgroundColor: colors.slate300, marginVertical: 2 },
  dayShiftInfo: { flex: 1, gap: 2 },
  dayShiftRole: { ...typography.bodyBold, color: colors.slate900, fontSize: 14 },
  dayShiftMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs / 2 },
  dayShiftMetaText: { ...typography.caption, color: colors.slate500, fontSize: 11 },
  dayShiftAssigned: { ...typography.small, color: colors.slate700 },
  dayShiftCoverage: { justifyContent: 'center', paddingLeft: spacing.sm },
  shiftCardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { ...typography.h2, color: colors.slate900, marginTop: spacing.md },
  modalSubtitle: { ...typography.body, color: colors.slate600, marginTop: spacing.xs },
  aiOptions: { marginBottom: spacing.xl },
  aiOptionsTitle: { ...typography.bodyBold, color: colors.slate700, marginBottom: spacing.md },
  aiOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  aiOptionIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.momentum + '15', alignItems: 'center', justifyContent: 'center' },
  aiOptionLabel: { ...typography.bodyBold, color: colors.slate900 },
  aiOptionDesc: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs / 2 },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md },
  generateButtonDisabled: { opacity: 0.7 },
  generateButtonText: { ...typography.bodyBold, color: colors.background, fontSize: 16 },
  cancelButton: { alignItems: 'center', paddingVertical: spacing.md },
  cancelButtonText: { ...typography.bodyBold, color: colors.slate600 },
  workersList: { maxHeight: 400 },
  workerOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  workerOptionDisabled: { opacity: 0.5 },
  workerOptionName: { ...typography.bodyBold, color: colors.slate900 },
  workerOptionRole: { ...typography.caption, color: colors.slate600 },
  workerUnavailable: { ...typography.caption, color: colors.error, marginTop: spacing.xs / 2 },
  workerScores: { alignItems: 'flex-end' },
  scoreTag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs / 2, borderRadius: borderRadius.sm },
  scoreTagText: { ...typography.caption, fontWeight: '700' },
  workerHours: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs / 2 },

  // Footer
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.slate200 },
  publishButton: { backgroundColor: colors.success, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center' },
  publishButtonText: { ...typography.bodyBold, color: colors.background, fontSize: 16 },
});
