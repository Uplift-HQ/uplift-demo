import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon, PlusIcon, UsersIcon, CheckCircleIcon, ClockIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useMyTimeOffRequests } from '../../hooks/useData';

// Types
interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  status: 'approved' | 'pending' | 'rejected';
  reason: 'vacation' | 'sick' | 'personal' | 'other';
  notes?: string;
}

interface DayInfo {
  date: number | null;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  timeOffRequests: TimeOffRequest[];
}

// Holidays
const HOLIDAYS: Record<string, string> = {
  '2026-01-01': 'New Year\'s Day',
  '2026-01-19': 'Martin Luther King Jr. Day',
  '2026-02-16': 'Presidents\' Day',
};

export const TimeOffCalendarScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { data: timeOffData, loading } = useMyTimeOffRequests();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // January 2026 for demo
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [isManagerView, setIsManagerView] = useState(true); // Toggle for demo

  // Map API data (empty array if no data)
  const allTimeOffRequests: TimeOffRequest[] = (timeOffData?.requests ?? []).map((r: any) => ({
    id: r.id,
    employeeId: r.employeeId || 'current',
    employeeName: r.employeeName || 'You',
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    reason: r.reason || 'other',
    notes: r.notes,
  }));

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Navigation between months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Check if a date is within a time off request period
  const isDateInRange = (dateStr: string, request: TimeOffRequest): boolean => {
    return dateStr >= request.startDate && dateStr <= request.endDate;
  };

  // Generate calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7; // Days before month starts (Mon = 0)

    const days: DayInfo[] = [];

    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, isCurrentMonth: false, isWeekend: false, isHoliday: false, timeOffRequests: [] });
    }

    // Add days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, i).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = dateStr in HOLIDAYS;

      // Find time off requests for this date
      const timeOffRequests = allTimeOffRequests.filter(request => isDateInRange(dateStr, request));

      days.push({
        date: i,
        isCurrentMonth: true,
        isWeekend,
        isHoliday,
        holidayName: isHoliday ? HOLIDAYS[dateStr] : undefined,
        timeOffRequests,
      });
    }

    return days;
  }, [currentDate, allTimeOffRequests]);

  // Get day background color based on status
  const getDayBackgroundColor = (day: DayInfo): string | null => {
    if (!day.date || !day.isCurrentMonth) return null;

    // Weekend/holiday color
    if (day.isWeekend || day.isHoliday) return colors.slate200;

    // Check for time off
    if (day.timeOffRequests.length > 0) {
      // Filter based on manager view
      const relevantRequests = isManagerView
        ? day.timeOffRequests
        : day.timeOffRequests.filter(r => r.employeeId === 'current');

      if (relevantRequests.length === 0) return null;

      // Check statuses - approved takes priority for coloring
      const hasApproved = relevantRequests.some(r => r.status === 'approved');
      const hasPending = relevantRequests.some(r => r.status === 'pending');

      if (hasApproved && hasPending) {
        // Mixed - show approved color with indicator
        return colors.success;
      } else if (hasApproved) {
        return colors.success;
      } else if (hasPending) {
        return colors.warning;
      }
    }

    return null;
  };

  // Get formatted month/year string
  const monthYearString = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Handle day press
  const handleDayPress = (day: DayInfo) => {
    if (day.date && day.isCurrentMonth) {
      setSelectedDay(day);
    }
  };

  // Get status badge color
  const getStatusColor = (status: TimeOffRequest['status']) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
    }
  };

  // Get reason display text
  const getReasonText = (reason: TimeOffRequest['reason']) => {
    switch (reason) {
      case 'vacation': return t('timeOff.vacation');
      case 'sick': return t('timeOff.sick');
      case 'personal': return t('timeOff.personal');
      case 'other': return t('timeOff.other');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('timeOff.calendar')}</Text>
        <TouchableOpacity onPress={() => setIsManagerView(!isManagerView)}>
          <UsersIcon size={24} color={isManagerView ? colors.momentum : colors.slate400} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.momentum} />
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToPreviousMonth}
          >
            <ChevronLeftIcon size={24} color={colors.slate700} />
          </TouchableOpacity>

          <Text style={styles.monthTitle}>{monthYearString}</Text>

          <TouchableOpacity
            style={styles.navButton}
            onPress={goToNextMonth}
          >
            <ChevronRightIcon size={24} color={colors.slate700} />
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <View style={styles.calendar}>
          {/* Day headers */}
          <View style={styles.weekHeader}>
            {weekDays.map(day => (
              <Text key={day} style={styles.weekHeaderText}>{day}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {calendarData.map((day, index) => {
              const bgColor = getDayBackgroundColor(day);
              const hasMultipleRequests = day.timeOffRequests.length > 1;
              const relevantRequests = isManagerView
                ? day.timeOffRequests
                : day.timeOffRequests.filter(r => r.employeeId === 'current');

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    bgColor && { backgroundColor: bgColor + '30' },
                  ]}
                  onPress={() => handleDayPress(day)}
                  disabled={!day.date || !day.isCurrentMonth}
                >
                  {day.date && (
                    <>
                      <Text style={[
                        styles.dayText,
                        !day.isCurrentMonth && styles.dayTextMuted,
                        (day.isWeekend || day.isHoliday) && styles.dayTextGray,
                        relevantRequests.some(r => r.status === 'approved') && styles.dayTextApproved,
                        relevantRequests.some(r => r.status === 'pending') && !relevantRequests.some(r => r.status === 'approved') && styles.dayTextPending,
                      ]}>
                        {day.date}
                      </Text>

                      {/* Show team member count in manager view */}
                      {isManagerView && relevantRequests.length > 0 && (
                        <View style={styles.requestIndicator}>
                          <Text style={styles.requestIndicatorText}>
                            {relevantRequests.length}
                          </Text>
                        </View>
                      )}

                      {/* Show status dots for personal view */}
                      {!isManagerView && relevantRequests.length > 0 && (
                        <View style={styles.statusDots}>
                          {relevantRequests.slice(0, 2).map((req, i) => (
                            <View
                              key={i}
                              style={[
                                styles.statusDot,
                                { backgroundColor: getStatusColor(req.status) }
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>{t('timeOff.legend')}</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.success + '30' }]} />
              <Text style={styles.legendText}>{t('timeOff.approved')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.warning + '30' }]} />
              <Text style={styles.legendText}>{t('timeOff.pending')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.slate200 }]} />
              <Text style={styles.legendText}>{t('timeOff.weekendHoliday')}</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Time Off Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>{t('timeOff.upcomingTimeOff')}</Text>
          {allTimeOffRequests
            .filter(r => isManagerView || r.employeeId === 'current')
            .filter(r => r.startDate >= `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`)
            .slice(0, 5)
            .map(request => (
              <View key={request.id} style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <View style={styles.summaryCardInfo}>
                    {isManagerView && (
                      <Text style={styles.summaryEmployeeName}>{request.employeeName}</Text>
                    )}
                    <Text style={styles.summaryDates}>
                      {new Date(request.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {request.startDate !== request.endDate &&
                        ` - ${new Date(request.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                      }
                    </Text>
                    <Text style={styles.summaryReason}>{getReasonText(request.reason)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(request.status) }]}>
                      {request.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TimeOffRequest')}
      >
        <PlusIcon size={24} color={colors.white} />
        <Text style={styles.fabText}>{t('timeOff.requestTimeOff')}</Text>
      </TouchableOpacity>

      {/* Day Detail Modal */}
      <Modal
        visible={selectedDay !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedDay?.date && new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    selectedDay.date
                  ).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                {selectedDay?.isHoliday && (
                  <Text style={styles.holidayLabel}>{selectedDay.holidayName}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <XIcon size={24} color={colors.slate600} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedDay?.isWeekend && !selectedDay.isHoliday && (
                <View style={styles.weekendNotice}>
                  <CalendarIcon size={20} color={colors.slate500} />
                  <Text style={styles.weekendNoticeText}>{t('timeOff.weekend')}</Text>
                </View>
              )}

              {selectedDay?.timeOffRequests && selectedDay.timeOffRequests.length > 0 ? (
                <>
                  {(isManagerView
                    ? selectedDay.timeOffRequests
                    : selectedDay.timeOffRequests.filter(r => r.employeeId === 'current')
                  ).map(request => (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.requestCardHeader}>
                        <View style={styles.requestAvatar}>
                          <Text style={styles.requestAvatarText}>
                            {request.employeeName.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                        <View style={styles.requestCardInfo}>
                          <Text style={styles.requestName}>{request.employeeName}</Text>
                          <Text style={styles.requestReason}>{getReasonText(request.reason)}</Text>
                        </View>
                        <View style={[
                          styles.requestStatusBadge,
                          { backgroundColor: getStatusColor(request.status) + '20' }
                        ]}>
                          {request.status === 'approved' ? (
                            <CheckCircleIcon size={14} color={getStatusColor(request.status)} />
                          ) : (
                            <ClockIcon size={14} color={getStatusColor(request.status)} />
                          )}
                          <Text style={[
                            styles.requestStatusText,
                            { color: getStatusColor(request.status) }
                          ]}>
                            {request.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.requestDates}>
                        <CalendarIcon size={16} color={colors.slate500} />
                        <Text style={styles.requestDatesText}>
                          {new Date(request.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {request.startDate !== request.endDate &&
                            ` - ${new Date(request.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                          }
                        </Text>
                      </View>

                      {request.notes && (
                        <Text style={styles.requestNotes}>{request.notes}</Text>
                      )}
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.noRequestsNotice}>
                  <Text style={styles.noRequestsText}>{t('timeOff.noTimeOffScheduled')}</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setSelectedDay(null);
                navigation.navigate('TimeOffRequest');
              }}
            >
              <PlusIcon size={20} color={colors.white} />
              <Text style={styles.modalButtonText}>{t('timeOff.requestTimeOff')}</Text>
            </TouchableOpacity>
          </View>
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
  backButton: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  title: {
    ...typography.h2,
    color: colors.slate900,
  },
  content: {
    flex: 1,
  },

  // Month Navigation
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.md,
  },
  monthTitle: {
    ...typography.h3,
    color: colors.slate900,
  },

  // Calendar
  calendar: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.slate500,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  dayText: {
    ...typography.body,
    color: colors.slate900,
    fontWeight: '500',
  },
  dayTextMuted: {
    color: colors.slate400,
  },
  dayTextGray: {
    color: colors.slate500,
  },
  dayTextApproved: {
    color: colors.success,
    fontWeight: '700',
  },
  dayTextPending: {
    color: colors.warning,
    fontWeight: '700',
  },
  requestIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 16,
    height: 16,
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestIndicatorText: {
    ...typography.small,
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  statusDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },

  // Legend
  legend: {
    backgroundColor: colors.background,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  legendTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
  },
  legendText: {
    ...typography.caption,
    color: colors.slate600,
  },

  // Summary Section
  summarySection: {
    paddingHorizontal: spacing.lg,
    marginBottom: 100, // Space for FAB
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryCardInfo: {
    flex: 1,
  },
  summaryEmployeeName: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginBottom: spacing.xs / 2,
  },
  summaryDates: {
    ...typography.body,
    color: colors.slate700,
  },
  summaryReason: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs / 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
  },
  fabText: {
    ...typography.h3,
    color: colors.white,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.slate900,
  },
  holidayLabel: {
    ...typography.caption,
    color: colors.momentum,
    marginTop: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
    maxHeight: 300,
  },
  weekendNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.slate100,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  weekendNoticeText: {
    ...typography.body,
    color: colors.slate600,
  },
  requestCard: {
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  requestAvatarText: {
    ...typography.bodyBold,
    color: colors.white,
    fontSize: 14,
  },
  requestCardInfo: {
    flex: 1,
  },
  requestName: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  requestReason: {
    ...typography.caption,
    color: colors.slate500,
  },
  requestStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  requestStatusText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  requestDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestDatesText: {
    ...typography.body,
    color: colors.slate700,
  },
  requestNotes: {
    ...typography.caption,
    color: colors.slate600,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  noRequestsNotice: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noRequestsText: {
    ...typography.body,
    color: colors.slate500,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  modalButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});

export default TimeOffCalendarScreen;
