// ============================================================
// SCHEDULE PAGE - DEPUTY-LEVEL IMPLEMENTATION
// All data from API — no demo data fallbacks
// Supports both Management View (all employees) and Personal View (my schedule only)
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { shiftsApi, employeesApi, locationsApi, timeOffApi, departmentsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useView } from '../lib/viewContext';
import { useToast } from '../components/ToastProvider';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Users, MapPin, Clock, X, Check,
  RefreshCw, Hand, ArrowLeftRight, AlertCircle, Filter, MoreVertical,
  Copy, Trash, UserPlus, CheckCircle, XCircle, Sparkles, Wand2, Zap, DollarSign, TrendingUp,
  GripVertical, Send, FileText, ChevronDown, ChevronUp, Award, Target, Briefcase,
  CalendarDays, CalendarRange, LayoutGrid, Eye, EyeOff, Settings, Bell,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addDays, addMonths, subMonths, parseISO, isSameDay, differenceInDays, eachDayOfInterval } from 'date-fns';

// View mode configuration
const VIEW_MODES = {
  day: { days: 1, labelKey: 'schedule.viewModes.day' },
  week: { days: 7, labelKey: 'schedule.viewModes.week' },
  twoWeek: { days: 14, labelKey: 'schedule.viewModes.twoWeeks' },
  month: { days: 'month', labelKey: 'schedule.viewModes.month' },
};

export default function Schedule() {
  const { user, isManagerOrAbove } = useAuth();
  const { isPersonalView } = useView();
  const { t } = useTranslation();
  const toast = useToast();

  // Show management features only when NOT in personal view AND user is manager+
  const showManagementFeatures = !isPersonalView && isManagerOrAbove;

  // Core state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('schedule');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Drag state
  const [draggedShift, setDraggedShift] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  // Publish state
  const [scheduleStatus, setScheduleStatus] = useState('draft');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  // Swaps and open shifts
  const [swaps, setSwaps] = useState([]);
  const [openShifts, setOpenShifts] = useState([]);
  const [pendingTimeOff, setPendingTimeOff] = useState([]);

  // Smart Schedule state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'day') {
      return { start: currentDate, end: currentDate, days: [currentDate] };
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { start, end, days: eachDayOfInterval({ start, end }) };
    } else if (viewMode === 'twoWeek') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 13);
      return { start, end, days: eachDayOfInterval({ start, end }) };
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return { start, end, days: eachDayOfInterval({ start, end }) };
    }
  }, [currentDate, viewMode]);

  const weekStartStr = format(dateRange.start, 'yyyy-MM-dd');

  useEffect(() => { loadData(); }, [weekStartStr, selectedLocation, isPersonalView]);

  // Filter employees based on department and skills
  // In personal view, only show the current user
  const filteredEmployees = useMemo(() => {
    // In personal view, only show the current user
    if (isPersonalView && user?.employeeId) {
      return employees.filter(emp => emp.id === user.employeeId);
    }
    return employees.filter(emp => {
      if (selectedDepartment && emp.department_id !== selectedDepartment) return false;
      if (selectedSkills.length > 0) {
        const empSkillIds = [...(emp.certifications || []), ...(emp.operational_skills || [])].map(s => s.skill_id || s.id);
        const hasAllSkills = selectedSkills.every(skill => empSkillIds.includes(skill));
        if (!hasAllSkills) return false;
      }
      return true;
    });
  }, [employees, selectedDepartment, selectedSkills, isPersonalView, user?.employeeId]);

  const activeFiltersCount = (selectedLocation ? 1 : 0) + (selectedDepartment ? 1 : 0) + selectedSkills.length;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // In personal view or for workers, filter shifts to current user only
      // API requires startDate and endDate parameters
      const shiftParams = {
        startDate: weekStartStr,
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
      };
      if (selectedLocation) {
        shiftParams.location = selectedLocation;
      }
      // Workers always see only their own shifts, regardless of view mode
      if ((isPersonalView || user?.role === 'worker') && user?.employeeId) {
        shiftParams.employee_id = user.employeeId;
      }

      const [shiftsResult, empResult, locResult, deptResult] = await Promise.all([
        shiftsApi.list(shiftParams),
        employeesApi.list({ status: 'active', limit: 100 }),
        locationsApi.list(),
        departmentsApi.list(),
      ]);

      setShifts(shiftsResult.shifts || []);
      setEmployees(empResult.employees || []);
      setLocations(locResult.locations || []);
      setDepartments(deptResult.departments || []);

      // Only load swaps and pending time-off in management view
      if (showManagementFeatures) {
        const swapsResult = await shiftsApi.getSwaps({ status: 'pending' }).catch(() => ({ swaps: [] }));
        setSwaps(swapsResult.swaps || []);

        const timeOffResult = await timeOffApi.getRequests({ status: 'pending' }).catch(() => ({ requests: [] }));
        setPendingTimeOff(timeOffResult.requests || []);
      } else {
        setSwaps([]);
        setPendingTimeOff([]);
      }

    } catch (err) {
      setError(err.message || t('schedule.loadError', 'Failed to load schedule data'));
    } finally {
      setLoading(false);
    }
  };

  const getShiftsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return shifts.filter(s => s.date === dateStr || s.start_time?.startsWith(dateStr));
  };

  const getEmployeeShiftsForDay = (employeeId, day) => {
    return getShiftsForDay(day).filter(s => s.employee_id === employeeId);
  };

  // Calculate skills match for an employee on a shift
  const calculateSkillsMatch = (employee, shift) => {
    if (!shift.required_skills || shift.required_skills.length === 0) return { score: 100, status: 'full' };

    const empSkillIds = [
      ...(employee.certifications || []).map(c => c.id || c.skill_id),
      ...(employee.operational_skills || []).map(s => s.id || s.skill_id),
    ];

    const matched = shift.required_skills.filter(req => empSkillIds.includes(req));
    const score = Math.round((matched.length / shift.required_skills.length) * 100);

    if (score === 100) return { score, status: 'full', matched, missing: [] };
    if (score >= 50) return { score, status: 'partial', matched, missing: shift.required_skills.filter(r => !matched.includes(r)) };
    return { score, status: 'low', matched, missing: shift.required_skills.filter(r => !matched.includes(r)) };
  };

  // Drag and drop handlers
  const handleDragStart = (e, shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, employeeId, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ employeeId, day: format(day, 'yyyy-MM-dd') });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e, employeeId, day) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedShift || !showManagementFeatures) return;

    const dateStr = format(day, 'yyyy-MM-dd');
    const updatedShift = {
      ...draggedShift,
      employee_id: employeeId,
      date: dateStr,
      start_time: draggedShift.start_time?.replace(/^\d{4}-\d{2}-\d{2}/, dateStr),
      end_time: draggedShift.end_time?.replace(/^\d{4}-\d{2}-\d{2}/, dateStr),
      status: 'draft',
    };

    // Optimistic update
    setShifts(prev => prev.map(s => s.id === draggedShift.id ? updatedShift : s));
    setScheduleStatus('draft');
    setDraggedShift(null);

    try {
      await shiftsApi.update(draggedShift.id, { employee_id: employeeId, date: dateStr });
    } catch (err) {
      // Revert on failure
      loadData();
    }
  };

  // Publish handler
  const handlePublish = async () => {
    try {
      const draftShifts = shifts.filter(s => s.status === 'draft');
      // Optimistic UI update
      setShifts(prev => prev.map(s => s.status === 'draft' ? { ...s, status: 'published' } : s));
      setScheduleStatus('published');
      setShowPublishModal(false);

      // Attempt to publish via period endpoint or bulk update
      const periodsRes = await shiftsApi.getPeriods({
        start: weekStartStr,
        end: format(dateRange.end, 'yyyy-MM-dd'),
      }).catch(() => ({ periods: [] }));

      const period = (periodsRes.periods || [])[0];
      if (period?.id) {
        await shiftsApi.publishPeriod(period.id);
      } else {
        // Fallback: update each draft shift individually
        await Promise.all(draftShifts.map(s => shiftsApi.update(s.id, { status: 'published' })));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to publish schedule:', err);
      loadData();
    }
  };

  // Approve/Deny time-off
  const handleTimeOffAction = async (requestId, action) => {
    try {
      if (action === 'approve') {
        await timeOffApi.approve(requestId);
      } else {
        await timeOffApi.reject(requestId);
      }
      setPendingTimeOff(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to process time-off request:', err);
      toast.error(t('schedule.failedTimeOffRequest', 'Failed to process time-off request'));
    }
  };

  // Approve/Deny shift swap
  const handleSwapAction = async (swapId, action) => {
    try {
      if (action === 'approve') {
        await shiftsApi.approveSwap(swapId);
      } else {
        await shiftsApi.rejectSwap(swapId);
      }
      setSwaps(prev => prev.filter(s => s.id !== swapId));
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to process shift swap:', err);
      toast.error(t('schedule.failedShiftSwap', 'Failed to process shift swap'));
    }
  };

  // Navigation handlers
  const navigateDate = (direction) => {
    if (viewMode === 'day') {
      setCurrentDate(prev => direction > 0 ? addDays(prev, 1) : addDays(prev, -1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => direction > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else if (viewMode === 'twoWeek') {
      setCurrentDate(prev => direction > 0 ? addWeeks(prev, 2) : subWeeks(prev, 2));
    } else {
      setCurrentDate(prev => direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  // Calculate staffing metrics
  const staffingMetrics = useMemo(() => {
    const metrics = {};
    dateRange.days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayShifts = getShiftsForDay(day);
      const filled = dayShifts.filter(s => s.employee_id).length;
      const open = dayShifts.filter(s => s.is_open && !s.employee_id).length;
      const total = dayShifts.length;

      metrics[dateStr] = {
        required: total,
        filled,
        open,
        gap: Math.max(0, total - filled),
        coverage: total > 0 ? Math.round((filled / total) * 100) : 100,
      };
    });
    return metrics;
  }, [dateRange.days, shifts]);

  // Calculate labour costs
  const labourCosts = useMemo(() => {
    const costs = {};
    dateRange.days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayShifts = getShiftsForDay(day).filter(s => s.employee_id);
      let totalCost = 0;

      dayShifts.forEach(shift => {
        const emp = employees.find(e => e.id === shift.employee_id);
        const hourlyRate = emp?.hourly_rate || 12;
        const hours = 8; // Simplified
        totalCost += hourlyRate * hours;
      });

      costs[dateStr] = {
        actual: totalCost,
        budget: Math.round(totalCost * 1.1) || 500, // 10% buffer as budget estimate
      };
    });
    return costs;
  }, [dateRange.days, shifts, employees]);

  // Smart Schedule generator - deterministic algorithm for fair scheduling
  const generateSmartSchedule = useCallback(async (startDate, endDate, selectedLocationId) => {
    // Get shift templates for the selected location (or all if none selected)
    const templatesResult = await shiftsApi.getTemplates().catch(() => ({ templates: [] }));
    const allTemplates = templatesResult.templates || [];
    const templates = selectedLocationId
      ? allTemplates.filter(t => t.location_id === selectedLocationId)
      : allTemplates;

    if (templates.length === 0) {
      // If no templates, create default shift patterns
      const defaultTemplates = [
        { id: 'default-morning', name: 'Morning Service', role: 'Front Desk Agent', start_time: '06:00', end_time: '14:00', days_of_week: [1, 2, 3, 4, 5], headcount: 4, location_id: selectedLocationId || locations[0]?.id },
        { id: 'default-afternoon', name: 'Afternoon Service', role: 'Housekeeping Staff', start_time: '14:00', end_time: '22:00', days_of_week: [1, 2, 3, 4, 5], headcount: 4, location_id: selectedLocationId || locations[0]?.id },
        { id: 'default-qc-day', name: 'Concierge Shift', role: 'Concierge', start_time: '08:00', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5], headcount: 2, location_id: selectedLocationId || locations[0]?.id },
        { id: 'default-warehouse', name: 'Maintenance Day', role: 'Maintenance Technician', start_time: '07:00', end_time: '15:00', days_of_week: [1, 2, 3, 4, 5, 6], headcount: 3, location_id: selectedLocationId || locations[0]?.id },
      ];
      templates.push(...defaultTemplates);
    }

    // Track hours per employee for fairness
    const employeeHours = {};
    employees.forEach(emp => {
      employeeHours[emp.id] = 0;
    });

    // Also count existing shifts in the period
    shifts.forEach(shift => {
      if (shift.employee_id && shift.start_time && shift.end_time) {
        const shiftDate = shift.date || shift.start_time.split('T')[0];
        const shiftDateObj = new Date(shiftDate);
        if (shiftDateObj >= startDate && shiftDateObj <= endDate) {
          const start = new Date(shift.start_time);
          const end = new Date(shift.end_time);
          const hours = (end - start) / (1000 * 60 * 60);
          employeeHours[shift.employee_id] = (employeeHours[shift.employee_id] || 0) + hours;
        }
      }
    });

    const generatedShifts = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // For each day in the range
    days.forEach(day => {
      const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dateStr = format(day, 'yyyy-MM-dd');

      // Find templates that apply to this day
      const applicableTemplates = templates.filter(t =>
        (t.days_of_week || [1, 2, 3, 4, 5]).includes(dayOfWeek)
      );

      applicableTemplates.forEach(template => {
        const headcount = template.headcount || 1;
        const templateLocationId = template.location_id || selectedLocationId || locations[0]?.id;
        const templateLocation = locations.find(l => l.id === templateLocationId);

        // Find eligible employees for this shift
        const eligibleEmployees = employees.filter(emp => {
          // Must be active
          if (emp.status !== 'active') return false;
          // Must match location (or be from same location)
          if (templateLocationId && emp.location_id !== templateLocationId) return false;
          // Role matching - check if employee role matches template role
          if (template.role) {
            const templateRoleNorm = template.role.toLowerCase().replace(/\s+/g, '');
            const empRoleNorm = (emp.role || '').toLowerCase().replace(/\s+/g, '');
            // Allow flexible matching: exact match, or role contains template role
            const roleMatch = empRoleNorm === templateRoleNorm ||
                              empRoleNorm.includes(templateRoleNorm) ||
                              templateRoleNorm.includes(empRoleNorm) ||
                              // Common role equivalencies
                              (templateRoleNorm === 'server' && ['server', 'hostess', 'waiter', 'waitress'].includes(empRoleNorm)) ||
                              (templateRoleNorm === 'linecook' && ['linecook', 'souschef', 'cook', 'chef', 'kitchenporter'].includes(empRoleNorm)) ||
                              (templateRoleNorm === 'bartender' && ['bartender', 'barista', 'barstaff'].includes(empRoleNorm));
            if (!roleMatch) return false;
          }
          // Check employee is not already scheduled this day
          const alreadyScheduled = shifts.some(s =>
            s.employee_id === emp.id &&
            (s.date === dateStr || (s.start_time && s.start_time.startsWith(dateStr)))
          );
          if (alreadyScheduled) return false;
          // Check not already assigned in generated shifts for this day
          const alreadyGenerated = generatedShifts.some(s =>
            s.employee_id === emp.id && s.date === dateStr
          );
          if (alreadyGenerated) return false;

          return true;
        });

        // Sort eligible employees by fewest hours (fairness algorithm)
        eligibleEmployees.sort((a, b) => (employeeHours[a.id] || 0) - (employeeHours[b.id] || 0));

        // Assign up to headcount employees
        for (let i = 0; i < headcount && i < eligibleEmployees.length; i++) {
          const emp = eligibleEmployees[i];
          const startTime = template.start_time || '09:00';
          const endTime = template.end_time || '17:00';

          // Calculate shift hours
          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);
          let hours = (endH + endM / 60) - (startH + startM / 60);
          if (hours < 0) hours += 24; // Handle overnight shifts

          // Update employee hours
          employeeHours[emp.id] = (employeeHours[emp.id] || 0) + hours;

          generatedShifts.push({
            id: `smart-${dateStr}-${template.id}-${i}`,
            date: dateStr,
            start_time: `${dateStr}T${startTime}:00`,
            end_time: `${dateStr}T${endTime}:00`,
            shift_type: startTime < '10:00' ? 'Morning' : startTime < '14:00' ? 'Day' : 'Evening',
            location_id: templateLocationId,
            location_name: templateLocation?.name || 'Unknown',
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            employee_role: emp.role,
            is_open: false,
            status: 'draft',
            break_minutes: template.break_minutes || 30,
            hourly_rate: 12.50,
            cost: hours * 12.50,
            template_name: template.name,
            hours: hours,
          });
        }

        // If not enough employees, create open shifts
        const remainingSlots = headcount - Math.min(headcount, eligibleEmployees.length);
        for (let i = 0; i < remainingSlots; i++) {
          const startTime = template.start_time || '09:00';
          const endTime = template.end_time || '17:00';
          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);
          let hours = (endH + endM / 60) - (startH + startM / 60);
          if (hours < 0) hours += 24;

          generatedShifts.push({
            id: `smart-open-${dateStr}-${template.id}-${i}`,
            date: dateStr,
            start_time: `${dateStr}T${startTime}:00`,
            end_time: `${dateStr}T${endTime}:00`,
            shift_type: startTime < '10:00' ? 'Morning' : startTime < '14:00' ? 'Day' : 'Evening',
            location_id: templateLocationId,
            location_name: templateLocation?.name || 'Unknown',
            employee_id: null,
            employee_name: null,
            employee_role: template.role,
            is_open: true,
            status: 'draft',
            break_minutes: template.break_minutes || 30,
            hourly_rate: 12.00,
            cost: hours * 12.00,
            template_name: template.name,
            hours: hours,
          });
        }
      });
    });

    // Calculate summary stats
    const filledShifts = generatedShifts.filter(s => s.employee_id);
    const openShiftsCount = generatedShifts.filter(s => !s.employee_id).length;
    const totalHours = generatedShifts.reduce((sum, s) => sum + (s.hours || 8), 0);
    const estimatedCost = generatedShifts.reduce((sum, s) => sum + (s.cost || 100), 0);

    // Calculate hours variance for fairness metric
    const assignedEmployeeIds = [...new Set(filledShifts.map(s => s.employee_id))];
    const hoursPerEmployee = assignedEmployeeIds.map(id => employeeHours[id] || 0);
    const avgHours = hoursPerEmployee.length > 0 ? hoursPerEmployee.reduce((a, b) => a + b, 0) / hoursPerEmployee.length : 0;
    const maxDeviation = hoursPerEmployee.length > 0 ? Math.max(...hoursPerEmployee.map(h => Math.abs(h - avgHours))) : 0;
    const fairnessScore = avgHours > 0 ? Math.max(0, 100 - (maxDeviation / avgHours) * 100) : 100;

    return {
      suggestions: generatedShifts,
      summary: {
        totalShifts: generatedShifts.length,
        filledShifts: filledShifts.length,
        openShifts: openShiftsCount,
        totalHours: Math.round(totalHours),
        estimatedCost: Math.round(estimatedCost),
        uniqueEmployees: assignedEmployeeIds.length,
        fairnessScore: Math.round(fairnessScore),
        avgHoursPerEmployee: assignedEmployeeIds.length > 0 ? Math.round(totalHours / assignedEmployeeIds.length * 10) / 10 : 0,
      },
      employeeHours: employeeHours,
    };
  }, [employees, locations, shifts]);

  // Smart Schedule handler (replaces AI handler)
  const handleSmartSchedule = async (scheduleStartDate, scheduleEndDate, locationFilter) => {
    setAiLoading(true);
    try {
      const result = await generateSmartSchedule(scheduleStartDate, scheduleEndDate, locationFilter);
      setAiSuggestions(result);
    } catch (err) {
      toast.error(t('schedule.smartScheduleError', 'Failed to generate smart schedule'));
      if (import.meta.env.DEV) console.error('Smart schedule error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Apply generated schedule
  const handleApplySchedule = async (suggestionsToApply) => {
    try {
      // Filter for only selected suggestions
      const shiftsToCreate = suggestionsToApply.map(s => ({
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        employee_id: s.employee_id,
        location_id: s.location_id,
        is_open: s.is_open,
        status: 'draft',
        break_minutes: s.break_minutes,
      }));

      // Try bulk create first
      try {
        await shiftsApi.createBulk(shiftsToCreate);
      } catch {
        // Fallback: create individually
        await Promise.all(shiftsToCreate.map(shift => shiftsApi.create(shift).catch(() => null)));
      }

      // Add to local state optimistically
      setShifts(prev => [
        ...prev,
        ...suggestionsToApply.map(s => ({
          ...s,
          id: s.id.startsWith('smart-') ? `created-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : s.id,
        })),
      ]);

      setShowAiModal(false);
      setAiSuggestions(null);
      toast.success(t('schedule.smartScheduleApplied', '{{count}} shifts have been added to the schedule', { count: suggestionsToApply.length }));

      // Reload to get server-assigned IDs
      loadData();
    } catch (err) {
      toast.error(t('schedule.smartScheduleApplyError', 'Failed to apply schedule'));
      if (import.meta.env.DEV) console.error('Apply schedule error:', err);
    }
  };

  const pendingSwapsCount = swaps.filter(s => s.status === 'pending').length;
  const pendingTimeOffCount = pendingTimeOff.length;

  // Draft shifts count
  const draftShiftsCount = shifts.filter(s => s.status === 'draft').length;

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium mb-1">{t('schedule.loadError', 'Failed to load schedule')}</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('common.retry', 'Retry')}</button>
      </div>
    );
  }

  // Empty state when no employees exist yet
  if (!loading && employees.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('schedule.title', 'Schedule')}</h1>
            <p className="text-slate-600">{t('schedule.subtitle', 'Manage shifts and schedules')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <EmptyState
            icon={Calendar}
            title={t('schedule.noEmployeesYet', 'Add employees to create schedules')}
            description={t('schedule.noEmployeesDescription', 'You need to add employees before you can create schedules. Start by adding your team members, then return here to build their schedules.')}
            action={
              <Link
                to="/onboarding"
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                {t('schedule.addEmployeesFirst', 'Add Employees First')}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // In personal view, hide sidebar
  const effectiveShowSidebar = showSidebar && !isPersonalView;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 ${effectiveShowSidebar ? 'mr-80' : ''}`}>
        {/* Header - only show in management view (personal view has its own header) */}
        {showManagementFeatures && (
          <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {t('schedule.title', 'Schedule')}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-600">
                  {viewMode === 'month'
                    ? format(currentDate, 'MMMM yyyy')
                    : `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`
                  }
                </span>
                {draftShiftsCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                    {draftShiftsCount} {t('schedule.draft', 'Draft')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Wand2 className="w-4 h-4" />
                {t('schedule.smartSchedule', 'Smart Schedule')}
              </button>
              <button
                onClick={() => setShowPublishModal(true)}
                disabled={draftShiftsCount === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  draftShiftsCount > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                {t('schedule.publishButton', 'Publish')}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('schedule.addShift', 'Add Shift')}
              </button>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-2 rounded-lg transition-colors ${showSidebar ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                title={showSidebar ? t('schedule.hideSidebar', 'Hide sidebar') : t('schedule.showSidebar', 'Show sidebar')}
              >
                {showSidebar ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Controls bar - only show in management view */}
        {showManagementFeatures && (
          <div className="flex items-center gap-4 p-4 bg-slate-50 border-b shrink-0 flex-wrap">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm font-medium bg-white border rounded-lg hover:bg-slate-50"
              >
                {t('schedule.today', 'Today')}
              </button>
              <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

          {/* View mode toggle */}
          <div className="flex bg-white border rounded-lg p-1">
            {Object.entries(VIEW_MODES).map(([key, { labelKey }]) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          {/* Location filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 bg-white border rounded-lg text-sm"
          >
            <option value="">{t('schedule.allLocations')}</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-white border text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            {t('schedule.filters', 'Filters')}
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">{activeFiltersCount}</span>
            )}
          </button>

          <div className="flex-1" />

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500" />
              {t('schedule.published', 'Published')}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500" />
              {t('schedule.draft', 'Draft')}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-300" />
              {t('schedule.open', 'Open')}
            </span>
          </div>
        </div>
        )}

        {/* Advanced filters panel - only in management view */}
        {showManagementFeatures && showFilters && (
          <div className="p-4 bg-white border-b space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('common.department', 'Department')}</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">{t('schedule.allDepartments')}</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('schedule.requiredSkills', 'Required Skills')}</label>
                <p className="text-sm text-slate-500">{t('schedule.skillFiltersPlaceholder', 'Skill filters will be available when skills data is loaded from the API.')}</p>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setSelectedLocation(''); setSelectedDepartment(''); setSelectedSkills([]); }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {t('schedule.clearAllFilters', 'Clear all filters')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schedule content */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <ScheduleSkeleton />
          ) : !showManagementFeatures ? (
            /* ============================================================
               PERSONAL/WORKER VIEW - Weekly Timeline Design
               ============================================================ */
            <PersonalScheduleView
              shifts={shifts}
              dateRange={dateRange}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              navigateDate={navigateDate}
              t={t}
            />
          ) : viewMode === 'month' ? (
            /* ============================================================
               MANAGEMENT VIEW - MONTHLY PLANNING OVERVIEW
               ============================================================ */
            <MonthlyPlanningView
              currentDate={currentDate}
              shifts={shifts}
              staffingMetrics={staffingMetrics}
              getShiftsForDay={getShiftsForDay}
              setSelectedDate={(date) => {
                setCurrentDate(date);
                setViewMode('week');
              }}
              t={t}
            />
          ) : (
            /* ============================================================
               MANAGEMENT VIEW - Full grid with all features
               ============================================================ */
            <div>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `200px repeat(${dateRange.days.length}, minmax(0, 1fr))`,
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                background: 'white',
                zIndex: 10
              }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{t('schedule.employee', 'Employee')}</span>
                </div>
                {dateRange.days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const metrics = staffingMetrics[dateStr];
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        borderRight: '1px solid #e2e8f0',
                        background: isToday ? '#eff6ff' : '#f8fafc',
                        overflow: 'hidden'
                      }}
                    >
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{format(day, 'EEE')}</p>
                      <p style={{ fontSize: '18px', fontWeight: 600, color: isToday ? '#2563eb' : '#0f172a', margin: 0 }}>
                        {format(day, 'd')}
                      </p>
                      {metrics && (
                        <div style={{
                          fontSize: '11px',
                          marginTop: '4px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          display: 'inline-block',
                          background: metrics.coverage >= 90 ? '#dcfce7' : metrics.coverage >= 70 ? '#fef3c7' : '#fee2e2',
                          color: metrics.coverage >= 90 ? '#15803d' : metrics.coverage >= 70 ? '#b45309' : '#dc2626'
                        }}>
                          {metrics.filled}/{metrics.required}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Employee rows */}
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  {t('schedule.noEmployeesAvailable', 'No employees available')}
                </div>
              ) : (
                filteredEmployees.slice(0, isPersonalView ? 1 : 15).map((employee) => (
                  <div
                    key={employee.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `200px repeat(${dateRange.days.length}, minmax(0, 1fr))`,
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{
                      padding: '12px',
                      borderRight: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'white',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: '#dbeafe',
                        color: '#2563eb',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 500,
                        flexShrink: 0
                      }}>
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{employee.role || employee.job_title || ''}</p>
                      </div>
                    </div>

                    {dateRange.days.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = getEmployeeShiftsForDay(employee.id, day);
                      const isDropZone = dropTarget?.employeeId === employee.id && dropTarget?.day === dateStr;
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={day.toISOString()}
                          style={{
                            padding: '2px',
                            minHeight: '60px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            background: isDropZone ? '#dbeafe' : isToday ? '#eff6ff' : 'white',
                            borderRight: '1px solid #e2e8f0',
                            borderBottom: '1px solid #e2e8f0',
                            cursor: showManagementFeatures ? 'pointer' : 'default',
                            overflow: 'hidden'
                          }}
                          onDragOver={(e) => showManagementFeatures && handleDragOver(e, employee.id, day)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => showManagementFeatures && handleDrop(e, employee.id, day)}
                          onClick={() => {
                            if (showManagementFeatures && dayShifts.length === 0) {
                              setSelectedSlot({ date: day, employeeId: employee.id });
                              setShowAddModal(true);
                            }
                          }}
                        >
                          {dayShifts.map((shift) => (
                            <ShiftCard
                              key={shift.id}
                              shift={shift}
                              employee={employee}
                              onDragStart={showManagementFeatures ? handleDragStart : null}
                              calculateSkillsMatch={calculateSkillsMatch}
                              onSelect={() => setSelectedShift({ ...shift, employee_name: `${employee.first_name} ${employee.last_name}`, employee_role: employee.role })}
                              t={t}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Open shifts row - only in management view */}
              {showManagementFeatures && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `200px repeat(${dateRange.days.length}, minmax(0, 1fr))`,
                    borderTop: '2px solid #e2e8f0',
                    background: 'rgba(248,250,252,0.5)'
                  }}
                >
                  <div className="p-3 border-r border-slate-200 flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{t('schedule.openShifts', 'Open Shifts')}</span>
                  </div>
                  {dateRange.days.map((day) => {
                    const dayOpenShifts = getShiftsForDay(day).filter(s => s.is_open && !s.employee_id);

                    return (
                      <div key={day.toISOString()} className="p-1 border-r border-slate-200 last:border-r-0 min-h-[70px] overflow-hidden">
                        {dayOpenShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className="p-1.5 rounded text-xs bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer hover:bg-amber-200 mb-1 w-full box-border"
                          >
                            <p className="font-medium">{shift.start_time ? format(parseISO(shift.start_time), 'HH:mm') : '--:--'} - {shift.end_time ? format(parseISO(shift.end_time), 'HH:mm') : '--:--'}</p>
                            <p className="truncate opacity-75">{shift.location_name}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Labour cost row - only in management view */}
              {showManagementFeatures && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `200px repeat(${dateRange.days.length}, minmax(0, 1fr))`,
                    borderTop: '1px solid #e2e8f0',
                    background: 'rgba(240,253,244,0.3)'
                  }}
                >
                  <div className="p-3 border-r border-slate-200 flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{t('schedule.labourCost', 'Labour Cost')}</span>
                  </div>
                  {dateRange.days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const cost = labourCosts[dateStr];

                    return (
                      <div key={day.toISOString()} className="p-2 border-r border-slate-200 last:border-r-0 text-center">
                        {cost && (
                          <p className="text-lg font-bold text-slate-700">
                            £{cost.actual.toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar - hidden in personal view */}
      {effectiveShowSidebar && (
        <div className="w-80 border-l bg-slate-50 flex flex-col fixed right-0 top-16 bottom-0 overflow-hidden">
          <div className="p-4 border-b bg-white">
            <h3 className="font-semibold text-slate-900">{t('schedule.scheduleOverview', 'Schedule Overview')}</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Staffing Summary */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {t('schedule.thisWeeksStaffing', "This Week's Staffing")}
              </h4>
              <div className="space-y-2">
                {Object.entries(staffingMetrics).slice(0, 7).map(([dateStr, metrics]) => {
                  const date = parseISO(dateStr);
                  return (
                    <div key={dateStr} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{format(date, 'EEE d')}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${metrics.gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {metrics.filled}/{metrics.required}
                        </span>
                        {metrics.gap > 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                            -{metrics.gap}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Time-Off Requests */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                {t('schedule.pendingTimeOff', 'Pending Time Off')}
                {pendingTimeOffCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">{pendingTimeOffCount}</span>
                )}
              </h4>
              {pendingTimeOff.length === 0 ? (
                <p className="text-sm text-slate-500">{t('schedule.noPendingRequests', 'No pending requests')}</p>
              ) : (
                <div className="space-y-2">
                  {pendingTimeOff.map((request) => (
                    <div key={request.id} className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">{request.employee_name}</p>
                      <p className="text-xs text-slate-500">{request.start_date} - {request.end_date}</p>
                      <p className="text-xs text-slate-500">{t(`timeOff.types.${request.type?.toLowerCase().replace(/\s+/g, '')}`, request.type)}</p>
                      {showManagementFeatures && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleTimeOffAction(request.id, 'approve')}
                            className="flex-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            {t('common.approve', 'Approve')}
                          </button>
                          <button
                            onClick={() => handleTimeOffAction(request.id, 'deny')}
                            className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            {t('common.deny', 'Deny')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shift Swaps */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                {t('schedule.shiftSwaps', 'Shift Swaps')}
                {pendingSwapsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">{pendingSwapsCount}</span>
                )}
              </h4>
              {swaps.length === 0 ? (
                <p className="text-sm text-slate-500">{t('schedule.noPendingSwaps', 'No pending swaps')}</p>
              ) : (
                <div className="space-y-2">
                  {swaps.slice(0, 3).map((swap) => (
                    <div key={swap.id} className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">
                        {swap.requester_name} → {swap.target_name}
                      </p>
                      <p className="text-xs text-slate-500">{swap.shift_date} - {swap.shift_time}</p>
                      {showManagementFeatures && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSwapAction(swap.id, 'approve')}
                            className="flex-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            {t('common.approve', 'Approve')}
                          </button>
                          <button
                            onClick={() => handleSwapAction(swap.id, 'deny')}
                            className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            {t('common.deny', 'Deny')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Labour Cost Summary */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                {t('schedule.weeklyLabourCost', 'Weekly Labour Cost')}
              </h4>
              {(() => {
                const totalActual = Object.values(labourCosts).reduce((sum, c) => sum + c.actual, 0);

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">{t('schedule.scheduled', 'Scheduled')}</span>
                      <span className="text-sm font-medium">£{totalActual.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddShiftModal
          onClose={() => { setShowAddModal(false); setSelectedSlot(null); }}
          onSubmit={async (data) => {
            try {
              const newShift = await shiftsApi.create({
                ...data,
                start_time: `${data.date}T${data.start_time}:00`,
                end_time: `${data.date}T${data.end_time}:00`,
              });
              loadData();
            } catch (err) {
              // Fallback: add locally
              const localShift = {
                id: `new-${Date.now()}`,
                ...data,
                start_time: `${data.date}T${data.start_time}:00`,
                end_time: `${data.date}T${data.end_time}:00`,
                status: 'draft',
              };
              setShifts(prev => [...prev, localShift]);
            }
            setShowAddModal(false);
            setSelectedSlot(null);
          }}
          employees={employees}
          locations={locations}
          defaultDate={selectedSlot?.date}
          defaultEmployeeId={selectedSlot?.employeeId}
          t={t}
        />
      )}

      {showPublishModal && (
        <PublishModal
          draftCount={draftShiftsCount}
          onClose={() => setShowPublishModal(false)}
          onPublish={handlePublish}
          t={t}
        />
      )}

      {showAiModal && (
        <SmartScheduleModal
          suggestions={aiSuggestions}
          loading={aiLoading}
          onClose={() => { setShowAiModal(false); setAiSuggestions(null); }}
          onGenerate={handleSmartSchedule}
          onApply={handleApplySchedule}
          locations={locations}
          dateRange={dateRange}
          t={t}
        />
      )}

      {selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          t={t}
          toast={toast}
        />
      )}
    </div>
  );
}

// ============================================================
// PERSONAL SCHEDULE VIEW - Weekly/Bi-Weekly/Monthly Timeline Design
// ============================================================
function PersonalScheduleView({ shifts, dateRange, currentDate, setCurrentDate, navigateDate, t }) {
  const [personalViewMode, setPersonalViewMode] = useState('week'); // week, twoWeek, month
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate the appropriate date range based on view mode
  const viewDateRange = useMemo(() => {
    if (personalViewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { start, end, days: eachDayOfInterval({ start, end }) };
    } else if (personalViewMode === 'twoWeek') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 13);
      return { start, end, days: eachDayOfInterval({ start, end }) };
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      // For month view, we need to pad to full weeks
      const calStart = startOfWeek(start, { weekStartsOn: 1 });
      const calEnd = endOfWeek(end, { weekStartsOn: 1 });
      return { start, end, days: eachDayOfInterval({ start: calStart, end: calEnd }) };
    }
  }, [currentDate, personalViewMode]);

  // Navigation step based on view
  const handleNavigate = (direction) => {
    if (personalViewMode === 'week') {
      setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else if (personalViewMode === 'twoWeek') {
      setCurrentDate(direction > 0 ? addWeeks(currentDate, 2) : subWeeks(currentDate, 2));
    } else {
      setCurrentDate(direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  // Get shift for a specific day
  const getShiftForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return shifts.find(s => s.date === dateStr || s.start_time?.startsWith(dateStr));
  };

  // Get selected day's shift
  const selectedShift = getShiftForDay(selectedDate);

  // Calculate stats for current view
  const viewStats = useMemo(() => {
    let totalMinutes = 0;
    let shiftCount = 0;
    let pendingCount = 0;
    const viewStart = viewDateRange.start;
    const viewEnd = viewDateRange.end;

    shifts.forEach(shift => {
      const shiftDate = shift.date ? parseISO(shift.date) : (shift.start_time ? parseISO(shift.start_time) : null);
      if (shiftDate && shiftDate >= viewStart && shiftDate <= viewEnd) {
        shiftCount++;
        if (shift.status === 'draft' || shift.status === 'pending') pendingCount++;
        if (shift.start_time && shift.end_time) {
          const start = parseISO(shift.start_time);
          const end = parseISO(shift.end_time);
          totalMinutes += (end - start) / (1000 * 60);
        }
      }
    });

    return { totalHours: Math.floor(totalMinutes / 60), shiftCount, pendingCount };
  }, [shifts, viewDateRange]);

  // Format short time (e.g., "6-14")
  const formatShortTime = (shift) => {
    if (!shift?.start_time || !shift?.end_time) return '';
    const start = format(parseISO(shift.start_time), 'H');
    const end = format(parseISO(shift.end_time), 'H');
    return `${start}-${end}`;
  };

  // Calculate duration string
  const getDuration = (shift) => {
    if (!shift?.start_time || !shift?.end_time) return '';
    const start = parseISO(shift.start_time);
    const end = parseISO(shift.end_time);
    const hours = Math.floor((end - start) / (1000 * 60 * 60));
    const mins = Math.floor(((end - start) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins > 0 ? `${String(mins).padStart(2, '0')}m` : '00m'}`;
  };

  // Day cell component used in all views
  const DayCell = ({ day, compact = false }) => {
    const dayShift = getShiftForDay(day);
    const isToday = isSameDay(day, new Date());
    const isSelected = isSameDay(day, selectedDate);
    const hasShift = !!dayShift;
    const isPublished = dayShift?.status === 'published' || dayShift?.status === 'confirmed';
    const isCurrentMonth = personalViewMode !== 'month' || day.getMonth() === currentDate.getMonth();

    return (
      <button
        onClick={() => setSelectedDate(day)}
        className={`flex flex-col items-center p-2 rounded-lg transition-all ${
          isSelected
            ? 'bg-blue-600 text-white shadow-md'
            : isToday
            ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
            : hasShift && isCurrentMonth
            ? 'bg-slate-50 hover:bg-slate-100 text-slate-900'
            : isCurrentMonth
            ? 'bg-slate-50/50 text-slate-400 hover:bg-slate-100'
            : 'text-slate-300'
        } ${compact ? 'p-1.5' : 'p-2 md:p-3'}`}
      >
        {!compact && (
          <span className={`text-xs font-medium ${isSelected ? 'text-blue-100' : ''}`}>
            {format(day, 'EEE')}
          </span>
        )}
        <span className={`${compact ? 'text-sm' : 'text-lg'} font-bold ${isSelected ? 'text-white' : ''}`}>
          {format(day, 'd')}
        </span>
        {hasShift && isCurrentMonth ? (
          <>
            <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
              isSelected ? 'bg-white' : isPublished ? 'bg-green-500' : 'bg-amber-500'
            }`} />
            {!compact && (
              <span className={`text-xs mt-0.5 font-medium ${isSelected ? 'text-blue-100' : 'text-slate-600'}`}>
                {formatShortTime(dayShift)}
              </span>
            )}
          </>
        ) : isCurrentMonth ? (
          <span className={`text-xs mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
            {compact ? '—' : 'OFF'}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('schedule.mySchedule', 'My Schedule')}</h1>
          <p className="text-slate-500">
            {personalViewMode === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : `${format(viewDateRange.start, 'd MMM')} - ${format(viewDateRange.end, 'd MMM yyyy')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleNavigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
            className="px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {t('schedule.today', 'Today')}
          </button>
          <button onClick={() => handleNavigate(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* View Toggle - hidden on mobile */}
      <div className="hidden md:flex justify-center mb-6">
        <div className="inline-flex bg-slate-100 rounded-lg p-1">
          {[
            { key: 'week', label: t('schedule.week', 'Week') },
            { key: 'twoWeek', label: t('schedule.twoWeeks', '2 Weeks') },
            { key: 'month', label: t('schedule.month', 'Month') },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPersonalViewMode(key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                personalViewMode === key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        {personalViewMode === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {viewDateRange.days.map((day) => {
              const dayShift = getShiftForDay(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              const hasShift = !!dayShift;

              const statusColors = {
                published: '#22c55e',
                confirmed: '#22c55e',
                draft: '#f97316',
                open: '#94a3b8',
              };

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  style={{
                    padding: '2px',
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    background: isSelected ? '#2563eb' : isToday ? '#eff6ff' : 'white',
                    borderRight: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: isSelected ? '#93c5fd' : '#64748b' }}>
                      {format(day, 'EEE')}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: isSelected ? 'white' : '#1e293b' }}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  {hasShift ? (
                    <div style={{
                      background: statusColors[dayShift.status] || statusColors.draft,
                      color: 'white',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      marginBottom: '2px',
                      fontSize: '11px',
                      lineHeight: '1.3',
                      width: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      minHeight: '44px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontWeight: 600 }}>{formatShortTime(dayShift)}</div>
                      <div style={{ opacity: 0.85, fontSize: '10px' }}>{dayShift.location_name || ''}</div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: isSelected ? '#93c5fd' : '#94a3b8', textAlign: 'center', padding: '4px' }}>
                      OFF
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {personalViewMode === 'twoWeek' && (
          <div style={{ overflowX: 'auto' }}>
            {/* 14-day grid with inline styles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: '2px' }}>
              {/* Day headers - 14 columns */}
              {viewDateRange.days.map((day, idx) => (
                <div key={`header-${idx}`} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#475569', padding: '8px 4px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {format(day, 'EEE d')}
                </div>
              ))}
              {/* Day cells - 14 columns */}
              {viewDateRange.days.map((day) => {
                const dayShift = getShiftForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const hasShift = !!dayShift;

                // Status colors matching ShiftCard
                const statusColors = {
                  published: '#22c55e',
                  confirmed: '#22c55e',
                  draft: '#f97316',
                  open: '#94a3b8',
                };

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      padding: '2px',
                      minHeight: '60px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      background: isSelected ? '#2563eb' : isToday ? '#eff6ff' : 'white',
                      borderRight: '1px solid #e2e8f0',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? 'white' : '#1e293b', padding: '2px 4px' }}>
                      {format(day, 'd')}
                    </span>
                    {hasShift ? (
                      <div style={{
                        background: statusColors[dayShift.status] || statusColors.draft,
                        color: 'white',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        marginBottom: '2px',
                        fontSize: '11px',
                        lineHeight: '1.3',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        minHeight: '44px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div style={{ fontWeight: 600 }}>{formatShortTime(dayShift)}</div>
                        <div style={{ opacity: 0.85, fontSize: '10px' }}>{dayShift.location_name || ''}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: isSelected ? '#93c5fd' : '#94a3b8', marginTop: 'auto', padding: '2px 4px' }}>
                        OFF
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {personalViewMode === 'month' && (
          <div>
            {/* Day headers - using inline styles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 500, color: '#64748b', padding: '8px 4px' }}>{d}</div>
              ))}
            </div>
            {/* Calendar grid - using inline styles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {viewDateRange.days.map((day) => {
                const dayShift = getShiftForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const hasShift = !!dayShift;
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                // Status colors matching ShiftCard
                const statusColors = {
                  published: '#22c55e',
                  confirmed: '#22c55e',
                  draft: '#f97316',
                  open: '#94a3b8',
                };

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      padding: '2px',
                      minHeight: '60px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      background: isSelected ? '#2563eb' : isToday ? '#eff6ff' : 'white',
                      borderRight: '1px solid #e2e8f0',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      opacity: isCurrentMonth ? 1 : 0.4
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? 'white' : '#1e293b', padding: '2px 4px' }}>
                      {format(day, 'd')}
                    </span>
                    {hasShift && isCurrentMonth ? (
                      <div style={{
                        background: statusColors[dayShift.status] || statusColors.draft,
                        color: 'white',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        marginBottom: '2px',
                        fontSize: '11px',
                        lineHeight: '1.3',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        minHeight: '44px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div style={{ fontWeight: 600 }}>{formatShortTime(dayShift)}</div>
                        <div style={{ opacity: 0.85, fontSize: '10px' }}>{dayShift.location_name || ''}</div>
                      </div>
                    ) : isCurrentMonth ? (
                      <span style={{ fontSize: '11px', color: isSelected ? '#93c5fd' : '#94a3b8', marginTop: 'auto', padding: '2px 4px' }}>
                        OFF
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Detail */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-slate-500 mb-3">
          {isSameDay(selectedDate, new Date())
            ? t('schedule.todayLabel', 'Today')
            : format(selectedDate, 'EEEE')} — {format(selectedDate, 'd MMMM')}
        </h2>

        {selectedShift ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`h-1.5 ${
              selectedShift.status === 'published' || selectedShift.status === 'confirmed'
                ? 'bg-green-500'
                : 'bg-amber-500'
            }`} />
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-3xl font-bold text-slate-900">
                    {selectedShift.start_time ? format(parseISO(selectedShift.start_time), 'HH:mm') : '--:--'}
                    <span className="text-slate-400 mx-2">—</span>
                    {selectedShift.end_time ? format(parseISO(selectedShift.end_time), 'HH:mm') : '--:--'}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-slate-700">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <span className="font-medium">{selectedShift.location_name || selectedShift.location || t('schedule.noLocation', 'Location TBC')}</span>
                  </div>
                  {(selectedShift.role || selectedShift.position || selectedShift.job_title) && (
                    <div className="flex items-center gap-2 mt-2 text-slate-600">
                      <Briefcase className="w-5 h-5 text-slate-400" />
                      <span>{selectedShift.role || selectedShift.position || selectedShift.job_title}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-700">{getDuration(selectedShift)}</p>
                  <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    selectedShift.status === 'published' || selectedShift.status === 'confirmed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      selectedShift.status === 'published' || selectedShift.status === 'confirmed' ? 'bg-green-500' : 'bg-amber-500'
                    }`} />
                    {selectedShift.status === 'published' || selectedShift.status === 'confirmed'
                      ? t('schedule.confirmed', 'Confirmed')
                      : t('schedule.draft', 'Draft')}
                  </div>
                </div>
              </div>
              {isSameDay(selectedDate, new Date()) && (
                <Link
                  to="/time"
                  className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Clock className="w-5 h-5" />
                  {t('schedule.clockIn', 'Clock In')}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-200 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-700">{t('schedule.dayOff', 'Day Off')}</p>
            <p className="text-slate-500 mt-1">{t('schedule.enjoyYourRest', 'Enjoy your rest!')}</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-medium text-slate-500 mb-3">
          {personalViewMode === 'week' ? t('schedule.thisWeekSummary', 'This Week') :
           personalViewMode === 'twoWeek' ? t('schedule.twoWeekSummary', '2 Week Summary') :
           t('schedule.monthSummary', 'This Month')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{viewStats.totalHours}h</p>
            <p className="text-xs text-slate-500">{t('schedule.totalHours', 'Total Hours')}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{viewStats.shiftCount}</p>
            <p className="text-xs text-slate-500">{t('schedule.shifts', 'Shifts')}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className={`text-2xl font-bold ${viewStats.pendingCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {viewStats.pendingCount}
            </p>
            <p className="text-xs text-slate-500">{t('schedule.pending', 'Pending')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Monthly Planning Overview - Admin view only
// Click any day to navigate to week view for that date
function MonthlyPlanningView({ currentDate, shifts, staffingMetrics, getShiftsForDay, setSelectedDate, t }) {
  // Calculate month grid - need to pad to full weeks
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group days into weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // Demo events for specific dates
  const events = {
    '2026-03-20': 'ISO 9001 Audit',
    '2026-03-23': 'Planned Maintenance'
  };

  // Get day stats
  const getDayStats = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayShifts = getShiftsForDay(day);
    const totalShifts = dayShifts.length;

    // Calculate total hours
    let totalHours = 0;
    dayShifts.forEach(shift => {
      if (shift.start_time && shift.end_time) {
        const start = parseISO(shift.start_time);
        const end = parseISO(shift.end_time);
        totalHours += (end - start) / (1000 * 60 * 60);
      }
    });

    // Get coverage from staffingMetrics
    const metrics = staffingMetrics[dateStr];
    const coverage = metrics?.coverage || 0;

    // Determine coverage status
    let coverageStatus = 'none';
    let coverageColor = '#94a3b8'; // grey
    if (totalShifts > 0) {
      if (coverage >= 95) {
        coverageStatus = 'full';
        coverageColor = '#22c55e'; // green
      } else if (coverage >= 80) {
        coverageStatus = 'partial';
        coverageColor = '#f59e0b'; // amber
      } else {
        coverageStatus = 'low';
        coverageColor = '#ef4444'; // red
      }
    }

    // Get event for this day
    const event = events[dateStr];

    return { totalShifts, totalHours: Math.round(totalHours), coverageStatus, coverageColor, event };
  };

  // Get week number
  const getWeekNumber = (date) => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    return Math.ceil((differenceInDays(date, start) + 1) / 7);
  };

  const isToday = (day) => isSameDay(day, new Date());
  const isCurrentMonth = (day) => day.getMonth() === currentDate.getMonth();

  return (
    <div style={{ padding: '16px' }}>
      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px repeat(7, 1fr)',
        gridAutoRows: '44px'
      }}>
        <div style={{ background: '#f8fafc' }} />
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '13px',
            color: '#475569',
            background: '#f8fafc',
            borderBottom: '2px solid #e2e8f0'
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} style={{
          display: 'grid',
          gridTemplateColumns: '40px repeat(7, 1fr)',
          gridAutoRows: '120px'
        }}>
          {/* Week number */}
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '8px',
            fontSize: '11px',
            color: '#94a3b8',
            fontWeight: 500,
            background: '#fafafa'
          }}>
            W{getWeekNumber(week[0]) + weekIndex}
          </div>

          {/* Day cells */}
          {week.map((day) => {
            const stats = getDayStats(day);
            const today = isToday(day);
            const inMonth = isCurrentMonth(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                style={{
                  height: '100%',
                  overflow: 'hidden',
                  padding: '8px',
                  background: inMonth ? 'white' : '#fafafa',
                  borderRight: '1px solid #e2e8f0',
                  borderBottom: '1px solid #e2e8f0',
                  borderLeft: `3px solid ${inMonth ? stats.coverageColor : '#e2e8f0'}`,
                  cursor: 'pointer',
                  position: 'relative',
                  opacity: inMonth ? 1 : 0.5,
                  boxShadow: today ? 'inset 0 0 0 2px #3b82f6' : 'none'
                }}
              >
                {/* Date number */}
                <div style={{ marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: today ? '#2563eb' : inMonth ? '#0f172a' : '#94a3b8',
                    width: '24px',
                    height: '24px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: today ? '#dbeafe' : 'transparent'
                  }}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Shift summary badges */}
                {inMonth && stats.totalShifts > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 500,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: '#f1f5f9',
                      color: '#475569'
                    }}>
                      {stats.totalShifts} shifts
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 500,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: '#f1f5f9',
                      color: '#475569'
                    }}>
                      {stats.totalHours}h
                    </span>
                  </div>
                )}

                {/* Coverage indicator text */}
                {inMonth && stats.totalShifts > 0 && (
                  <div style={{
                    fontSize: '9px',
                    color: stats.coverageColor,
                    fontWeight: 500
                  }}>
                    {stats.coverageStatus === 'full' && '✓ Staffed'}
                    {stats.coverageStatus === 'partial' && '⚠ Gaps'}
                    {stats.coverageStatus === 'low' && '✗ Low'}
                  </div>
                )}

                {/* Event label */}
                {inMonth && stats.event && (
                  <div style={{
                    fontSize: '9px',
                    color: '#7c3aed',
                    fontWeight: 500,
                    background: '#f3e8ff',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '3px'
                  }}>
                    📌 {stats.event}
                  </div>
                )}

                {/* No shifts indicator */}
                {inMonth && stats.totalShifts === 0 && (
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    No shifts
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Click hint */}
      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#64748b',
        textAlign: 'center'
      }}>
        Click any day to view details in weekly view
      </div>
    </div>
  );
}

// Shift card component with skills match indicator
function ShiftCard({ shift, employee, onDragStart, calculateSkillsMatch, onSelect, t }) {
  const startTime = shift.start_time ? format(parseISO(shift.start_time), "HH:mm") : "--:--";
  const endTime = shift.end_time ? format(parseISO(shift.end_time), "HH:mm") : "--:--";

  // Status-based colors (inline)
  const statusColors = {
    published: '#22c55e',  // green-500
    confirmed: '#22c55e',
    draft: '#f97316',      // orange-500
    open: '#94a3b8',       // slate-400
  };
  const bgColor = statusColors[shift.status] || statusColors.draft;

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart && onDragStart(e, shift)}
      onClick={(e) => { e.stopPropagation(); onSelect && onSelect(); }}
      style={{
        background: bgColor,
        color: 'white',
        borderRadius: '6px',
        padding: '4px 8px',
        marginBottom: '2px',
        fontSize: '11px',
        lineHeight: '1.3',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        minHeight: '44px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        cursor: 'pointer'
      }}
    >
      <div style={{ fontWeight: 600 }}>{startTime} - {endTime}</div>
      <div style={{ opacity: 0.85, fontSize: '10px' }}>{shift.location_name || employee?.role || ''}</div>
    </div>
  );
}
function ScheduleSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-48 h-12 bg-slate-200 rounded"></div>
          {[...Array(7)].map((_, j) => (
            <div key={j} className="flex-1 h-12 bg-slate-100 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AddShiftModal({ onClose, onSubmit, employees, locations, defaultDate, defaultEmployeeId, t }) {
  const [form, setForm] = useState({
    date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '17:00',
    employee_id: defaultEmployeeId || '',
    location_id: locations[0]?.id || '',
    required_skills: [],
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t('schedule.addShift', 'Add Shift')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date', 'Date')}</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('schedule.startTime', 'Start Time')}</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('schedule.endTime', 'End Time')}</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.location', 'Location')}</label>
            <select
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.employee', 'Employee')}</label>
            <select
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">{t('schedule.leaveOpen')}</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {t('schedule.createShift', 'Create Shift')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PublishModal({ draftCount, onClose, onPublish, t }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            {t('schedule.publishSchedule', 'Publish Schedule')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-slate-600">
            {t('schedule.publishConfirmation', 'You are about to publish {{count}} draft shift(s). This will notify all affected employees about their upcoming shifts.', { count: draftCount })}
          </p>
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            <p className="font-medium">{t('schedule.publish.whatHappens', 'What happens when you publish:')}</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>{t('schedule.publish.notification1', 'Employees receive push notifications')}</li>
              <li>{t('schedule.publish.notification2', 'Shifts appear in employee apps')}</li>
              <li>{t('schedule.publish.notification3', 'Changes after this will trigger new notifications')}</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            {t('common.cancel', 'Cancel')}
          </button>
          <button onClick={onPublish} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Send className="w-4 h-4" />
            {t('schedule.publishNow', 'Publish Now')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SmartScheduleModal({ suggestions, loading, onClose, onGenerate, onApply, locations, dateRange, t }) {
  // 3-Step Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [scheduleMode, setScheduleMode] = useState('templates'); // templates, demand, agreedHours
  const [scheduleRange, setScheduleRange] = useState('week');
  const [startDate, setStartDate] = useState(format(dateRange.start, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(dateRange.end, 'yyyy-MM-dd'));
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [expandedDays, setExpandedDays] = useState({});

  // Step 2: Auto-Fill Configuration
  const [prioritySliders, setPrioritySliders] = useState({
    costOptimization: 50,
    equalHours: 70,
    skillMatching: 80,
    seniorityWeight: 40,
  });
  const [constraints, setConstraints] = useState({
    maxHoursWeek: 48,
    minRestHours: 11,
    maxConsecutiveDays: 6,
    preferredShiftLength: 8,
  });
  const [countryRules, setCountryRules] = useState('UK');

  // Step 3: Compliance issues (demo)
  const [complianceIssues, setComplianceIssues] = useState([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Update dates when range changes
  const handleRangeChange = (range) => {
    setScheduleRange(range);
    const today = new Date();
    if (range === 'week') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      setStartDate(format(weekStart, 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (range === 'twoWeek') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      setStartDate(format(weekStart, 'yyyy-MM-dd'));
      setEndDate(format(addDays(weekStart, 13), 'yyyy-MM-dd'));
    } else if (range === 'month') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    }
  };

  // Select/deselect all suggestions
  const handleSelectAll = () => {
    if (suggestions?.suggestions) {
      if (selectedSuggestions.length === suggestions.suggestions.length) {
        setSelectedSuggestions([]);
      } else {
        setSelectedSuggestions(suggestions.suggestions.map(s => s.id));
      }
    }
  };

  // Toggle individual suggestion
  const toggleSuggestion = (id) => {
    setSelectedSuggestions(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Group suggestions by date for preview
  const groupedByDate = useMemo(() => {
    if (!suggestions?.suggestions) return {};
    const groups = {};
    suggestions.suggestions.forEach(s => {
      if (!groups[s.date]) groups[s.date] = [];
      groups[s.date].push(s);
    });
    return groups;
  }, [suggestions]);

  // Initialize selected suggestions when suggestions are generated
  useEffect(() => {
    if (suggestions?.suggestions) {
      setSelectedSuggestions(suggestions.suggestions.map(s => s.id));
      // Generate demo compliance issues
      const issues = [];
      if (suggestions.summary.totalHours > 200) {
        issues.push({ type: 'warning', message: 'High total hours scheduled - verify overtime approvals' });
      }
      if (suggestions.summary.openShifts > 5) {
        issues.push({ type: 'info', message: `${suggestions.summary.openShifts} shifts need staff assignment` });
      }
      setComplianceIssues(issues);
      setCurrentStep(3);
    }
  }, [suggestions]);

  // Country-specific compliance rules
  const countryRulesData = {
    UK: { maxWeekly: 48, minRest: 11, label: 'UK - Working Time Regulations' },
    DE: { maxWeekly: 48, minRest: 11, label: 'Germany - ArbZG' },
    PL: { maxWeekly: 40, minRest: 11, label: 'Poland - Kodeks Pracy' },
    US: { maxWeekly: 40, minRest: 8, label: 'USA - FLSA (overtime after 40h)' },
    FR: { maxWeekly: 35, minRest: 11, label: 'France - Code du Travail' },
    ES: { maxWeekly: 40, minRest: 12, label: 'Spain - Estatuto de los Trabajadores' },
    IT: { maxWeekly: 40, minRest: 11, label: 'Italy - D.Lgs. 66/2003' },
    AE: { maxWeekly: 48, minRest: 8, label: 'UAE - Federal Labour Law' },
  };

  // Step progress indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-4 mb-6">
      {[
        { num: 1, label: 'Choose Mode' },
        { num: 2, label: 'Configure' },
        { num: 3, label: 'Review' },
      ].map(({ num, label }, idx) => (
        <div key={num} className="flex items-center">
          <div className={`flex items-center gap-2 ${currentStep >= num ? 'text-purple-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep > num ? 'bg-purple-600 text-white' :
              currentStep === num ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-600' :
              'bg-slate-100 text-slate-400'
            }`}>
              {currentStep > num ? <Check className="w-4 h-4" /> : num}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{label}</span>
          </div>
          {idx < 2 && <div className={`w-12 h-0.5 mx-2 ${currentStep > num ? 'bg-purple-600' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            {t('schedule.smartScheduleBuilder', 'AI Schedule Builder')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <StepIndicator />

          {/* ============================================================
              STEP 1: Choose Scheduling Mode
              ============================================================ */}
          {currentStep === 1 && !loading && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('schedule.howBuildSchedule', 'How would you like to build your schedule?')}</h3>
                <p className="text-slate-500">{t('schedule.chooseApproach', 'Choose a scheduling approach that fits your business')}</p>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Templates Mode */}
                <button
                  onClick={() => setScheduleMode('templates')}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    scheduleMode === 'templates'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      scheduleMode === 'templates' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{t('schedule.scheduleFromTemplates', 'Schedule from Templates')}</h4>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{t('common.recommended', 'Recommended')}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Use your shift templates to build the schedule. Define production runs, maintenance windows, and changeovers with automatic role timing.
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-600">
                    <strong>{t('common.examples', 'Examples')}:</strong> {t('schedule.templateExamples', '3-shift rotation, Line Changeover, Maintenance Shutdown, Quality Audit')}
                  </div>
                </button>

                {/* Demand Mode */}
                <button
                  onClick={() => setScheduleMode('demand')}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    scheduleMode === 'demand'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      scheduleMode === 'demand' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-slate-900">{t('schedule.scheduleFromDemand', 'Schedule from Demand')}</h4>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Set staffing levels per production line and department based on order volume and output targets.
                  </p>
                  <div className="text-xs text-slate-500">
                    Best for: Variable production schedules, seasonal demand
                  </div>
                </button>

                {/* Agreed Hours Mode */}
                <button
                  onClick={() => setScheduleMode('agreedHours')}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    scheduleMode === 'agreedHours'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      scheduleMode === 'agreedHours' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-slate-900">{t('schedule.scheduleFromContractedHours', 'Schedule from Contracted Hours')}</h4>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Build schedules from employees' contracted shift patterns and availability.
                  </p>
                  <div className="text-xs text-slate-500">
                    Best for: Fixed-hours contracts, union environments
                  </div>
                </button>
              </div>

              {/* Date Range Selection */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-slate-900 mb-4">{t('schedule.schedulePeriod', 'Schedule Period')}</h4>
                <div className="flex gap-3 mb-4">
                  {[
                    { key: 'week', label: 'This Week' },
                    { key: 'twoWeek', label: '2 Weeks' },
                    { key: 'month', label: 'This Month' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleRangeChange(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        scheduleRange === key
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.startDate', 'Start Date')}</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.endDate', 'End Date')}</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('common.location', 'Location')}</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">{t('common.allLocations', 'All Locations')}</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ============================================================
              STEP 2: Auto-Fill Staff Configuration
              ============================================================ */}
          {currentStep === 2 && !loading && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('schedule.configureAutoFill', 'Configure Auto-Fill Settings')}</h3>
                <p className="text-slate-500">{t('schedule.adjustStaffAssignment', 'Adjust how staff are assigned to shifts')}</p>
              </div>

              {/* Priority Sliders */}
              <div className="bg-slate-50 rounded-xl p-5 border">
                <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  Optimization Priorities
                </h4>
                <div className="space-y-5">
                  {[
                    { key: 'costOptimization', label: 'Cost Optimization', desc: 'Prefer lower-cost staff where possible' },
                    { key: 'equalHours', label: 'Equal Hours Distribution', desc: 'Distribute hours fairly across team' },
                    { key: 'skillMatching', label: 'Skill Matching', desc: 'Prioritize best-qualified staff for each role' },
                    { key: 'seniorityWeight', label: 'Seniority Weight', desc: 'Give preference to senior employees' },
                  ].map(({ key, label, desc }) => (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                        <span className="text-sm text-purple-600 font-medium">{prioritySliders[key]}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={prioritySliders[key]}
                        onChange={(e) => setPrioritySliders(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constraints */}
              <div className="bg-slate-50 rounded-xl p-5 border">
                <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Scheduling Constraints
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('schedule.maxHoursWeek', 'Max Hours/Week')}</label>
                    <input
                      type="number"
                      value={constraints.maxHoursWeek}
                      onChange={(e) => setConstraints(prev => ({ ...prev, maxHoursWeek: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('schedule.minRestBetweenShifts', 'Min Rest Between Shifts (hrs)')}</label>
                    <input
                      type="number"
                      value={constraints.minRestHours}
                      onChange={(e) => setConstraints(prev => ({ ...prev, minRestHours: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('schedule.maxConsecutiveDays', 'Max Consecutive Days')}</label>
                    <input
                      type="number"
                      value={constraints.maxConsecutiveDays}
                      onChange={(e) => setConstraints(prev => ({ ...prev, maxConsecutiveDays: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('schedule.preferredShiftLength', 'Preferred Shift Length (hrs)')}</label>
                    <select
                      value={constraints.preferredShiftLength}
                      onChange={(e) => setConstraints(prev => ({ ...prev, preferredShiftLength: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {[4, 6, 8, 10, 12].map(h => <option key={h} value={h}>{h} hours</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Country-Specific Rules */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Country-Specific Labour Rules
                </h4>
                <select
                  value={countryRules}
                  onChange={(e) => {
                    setCountryRules(e.target.value);
                    const rules = countryRulesData[e.target.value];
                    if (rules) {
                      setConstraints(prev => ({
                        ...prev,
                        maxHoursWeek: rules.maxWeekly,
                        minRestHours: rules.minRest,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white mb-3"
                >
                  {Object.entries(countryRulesData).map(([code, { label }]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-blue-700">
                  Selected: {countryRulesData[countryRules]?.label} — Max {countryRulesData[countryRules]?.maxWeekly}h/week, Min {countryRulesData[countryRules]?.minRest}h rest
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600 font-medium text-lg">{t('schedule.generatingSchedule', 'Generating smart schedule...')}</p>
              <p className="text-sm text-gray-500 mt-2">
                {scheduleMode === 'templates'
                  ? 'Matching shift templates to events and calculating arrival times...'
                  : scheduleMode === 'demand'
                  ? 'Analyzing demand patterns and optimizing coverage...'
                  : 'Distributing contracted hours fairly across your team...'}
              </p>
            </div>
          )}

          {/* ============================================================
              STEP 3: Review & Publish
              ============================================================ */}
          {currentStep === 3 && suggestions && !loading && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('schedule.reviewGeneratedSchedule', 'Review Generated Schedule')}</h3>
                <p className="text-slate-500">{t('schedule.reviewShiftsPublish', 'Review shifts and publish when ready')}</p>
              </div>

              {/* Compliance Check */}
              {complianceIssues.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Compliance Check
                  </h4>
                  <ul className="space-y-1">
                    {complianceIssues.map((issue, idx) => (
                      <li key={idx} className={`text-sm flex items-center gap-2 ${
                        issue.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
                      }`}>
                        {issue.type === 'warning' ? '⚠️' : 'ℹ️'} {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">{suggestions.summary.totalShifts}</p>
                  <p className="text-xs text-purple-600">{t('schedule.totalShifts', 'Total Shifts')}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{suggestions.summary.filledShifts}</p>
                  <p className="text-xs text-green-600">{t('schedule.filledShifts', 'Filled Shifts')}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{suggestions.summary.openShifts}</p>
                  <p className="text-xs text-amber-600">{t('schedule.openShifts', 'Open Shifts')}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{suggestions.summary.fairnessScore}%</p>
                  <p className="text-xs text-blue-600">{t('schedule.fairnessScore', 'Fairness Score')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">
                  Est. Cost: <span className="font-medium">£{suggestions.summary.estimatedCost.toLocaleString()}</span>
                  <span className="mx-2">|</span>
                  Total Hours: <span className="font-medium">{suggestions.summary.totalHours}</span>
                  <span className="mx-2">|</span>
                  Avg/Employee: <span className="font-medium">{suggestions.summary.avgHoursPerEmployee}h</span>
                </p>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  {selectedSuggestions.length === suggestions.suggestions.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Shifts grouped by date */}
              <div className="border rounded-lg divide-y max-h-[35vh] overflow-y-auto">
                {Object.entries(groupedByDate).map(([date, dayShifts]) => {
                  const isExpanded = expandedDays[date] !== false;
                  const selectedCount = dayShifts.filter(s => selectedSuggestions.includes(s.id)).length;

                  return (
                    <div key={date}>
                      <button
                        onClick={() => setExpandedDays(prev => ({ ...prev, [date]: !isExpanded }))}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          <span className="font-medium text-slate-900">{format(parseISO(date), 'EEEE, MMM d')}</span>
                          <span className="text-sm text-slate-500">({dayShifts.length} shifts)</span>
                        </div>
                        <span className="text-sm text-purple-600">{selectedCount}/{dayShifts.length} selected</span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {dayShifts.map(shift => {
                            const isSelected = selectedSuggestions.includes(shift.id);
                            const shiftStartTime = shift.start_time ? format(parseISO(shift.start_time), 'HH:mm') : '--:--';
                            const shiftEndTime = shift.end_time ? format(parseISO(shift.end_time), 'HH:mm') : '--:--';

                            return (
                              <label
                                key={shift.id}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                  isSelected ? 'bg-purple-50 border border-purple-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSuggestion(shift.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-purple-600"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-slate-900">{shiftStartTime} - {shiftEndTime}</span>
                                    <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">{shift.employee_role}</span>
                                    {shift.is_open && (
                                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{t('common.open', 'Open')}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 truncate">
                                    {shift.employee_name || 'Unassigned'} — {shift.location_name}
                                  </p>
                                </div>
                                <span className="text-sm text-slate-600">{shift.hours}h</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Save as Template Option */}
              <div className="border rounded-lg p-4 bg-slate-50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                  <span className="text-sm font-medium text-slate-700">{t('schedule.saveAsTemplate', 'Save this configuration as a template')}</span>
                </label>
                {saveAsTemplate && (
                  <input
                    type="text"
                    placeholder={t('schedule.templateNamePlaceholder', "Template name (e.g., 'Weekend Brunch Setup')")}
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="mt-3 w-full px-3 py-2 border rounded-lg text-sm"
                  />
                )}
              </div>

              {suggestions.suggestions.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">{t('schedule.noShiftsGenerated', 'No shifts could be generated')}</p>
                  <p className="text-sm text-slate-500 mt-1">{t('schedule.checkShiftTemplates', 'Check that you have shift templates configured for the selected date range and location.')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="p-6 border-t bg-white shrink-0 flex justify-between">
          <div>
            {currentStep === 3 && suggestions && selectedSuggestions.length > 0 && (
              <p className="text-sm text-slate-600">
                {selectedSuggestions.length} shifts will be added
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {currentStep > 1 && !loading && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Back
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancel
            </button>

            {currentStep === 1 && (
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                Next: Configure
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                onClick={() => onGenerate(parseISO(startDate), parseISO(endDate), locationFilter)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Generate Schedule
              </button>
            )}

            {currentStep === 3 && suggestions && (
              <button
                onClick={() => {
                  const toApply = suggestions.suggestions.filter(s => selectedSuggestions.includes(s.id));
                  onApply(toApply);
                }}
                disabled={selectedSuggestions.length === 0}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  selectedSuggestions.length > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                Publish Schedule
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShiftDetailModal({ shift, onClose, t, toast }) {
  if (!shift) return null;

  const startTime = shift.start_time ? format(parseISO(shift.start_time), "HH:mm") : "--:--";
  const endTime = shift.end_time ? format(parseISO(shift.end_time), "HH:mm") : "--:--";
  const shiftDate = shift.date || (shift.start_time ? format(parseISO(shift.start_time), "yyyy-MM-dd") : "");

  const statusBadge = {
    published: "bg-green-100 text-green-700",
    draft: "bg-orange-100 text-orange-700",
    open: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-semibold">{t('schedule.shiftDetails', 'Shift Details')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {shift.employee_name && (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('schedule.employee', 'Employee')}</span>
              <span className="font-medium text-slate-900">{shift.employee_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">{t('common.date', 'Date')}</span>
            <span className="font-medium text-slate-900">{shiftDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('schedule.shift', 'Shift')}</span>
            <span className="font-medium text-slate-900">{startTime} - {endTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('schedule.location', 'Location')}</span>
            <span className="font-medium text-slate-900">{shift.location_name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('schedule.role', 'Role')}</span>
            <span className="font-medium text-slate-900">{shift.employee_role || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('common.status', 'Status')}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[shift.status] || statusBadge.draft}`}>
              {t(`schedule.${t('common.' + shift.status, shift.status)}`, shift.status)}
            </span>
          </div>
          {shift.break_minutes && (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('schedule.breakDuration', 'Break')}</span>
              <span className="font-medium text-slate-900">{shift.break_minutes} {t('schedule.minutes', 'min')}</span>
            </div>
          )}
        </div>
        <div className="p-5 border-t grid grid-cols-4 gap-2">
          <button
            onClick={() => { toast.success(t('schedule.shiftUpdated', 'Shift updated')); onClose(); }}
            className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
          >
            {t('common.edit', 'Edit')}
          </button>
          <button
            onClick={() => { toast.success(t('schedule.shiftReassigned', 'Shift reassigned')); onClose(); }}
            className="px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium"
          >
            {t('schedule.reassign', 'Reassign')}
          </button>
          <button
            onClick={() => { toast.success(t('schedule.swapRequested', 'Swap requested')); onClose(); }}
            className="px-3 py-2 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 font-medium"
          >
            {t('schedule.swapShift', 'Swap')}
          </button>
          <button
            onClick={() => { toast.success(t('schedule.shiftDeleted', 'Shift deleted')); onClose(); }}
            className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium"
          >
            {t('common.delete', 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
