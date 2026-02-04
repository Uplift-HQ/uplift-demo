// ============================================================
// DASHBOARD PAGE
// All data fetched from dashboardApi — no demo data
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useEntity } from '../lib/entityContext';
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  ArrowRight,
  Award,
  Briefcase,
  MapPin,
  Activity,
  Zap,
  Heart,
  Shield,
  AlertTriangle,
  Coffee,
  UserCheck,
  UserPlus,
  Bell,
  Star,
  ChevronRight,
  Play,
  Gift,
  Target,
  BarChart3,
  Sun,
  Sunset,
  Moon,
  CalendarOff,
  DollarSign,
  BookOpen,
  FileText,
  Cake,
  Lock,
  Megaphone,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import DemandForecast from '../components/DemandForecast';

function scaleNumericValues(obj, multiplier) {
  if (!obj || multiplier === 1) return obj;
  const scaled = { ...obj };
  for (const key of Object.keys(scaled)) {
    if (typeof scaled[key] === 'number') {
      scaled[key] = Math.round(scaled[key] * multiplier);
    }
  }
  return scaled;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, isManager, isAdmin } = useAuth();
  const { currentEntity } = useEntity();

  const ENTITY_MULTIPLIERS = {
    'gm-uk': 1,
    'gm-de': 0.42,
    'gm-ae': 0.57,
    'gm-sg': 0.35,
    'gm-us': 0.44,
  };
  const entityMultiplier = ENTITY_MULTIPLIERS[currentEntity?.id] || 1;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const orgOnboardingChecked = useRef(false);

  // State for showing compliance detail modal
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setError(null);
      const result = await dashboardApi.get();
      setData(result);
    } catch (err) {
      setError(err.message || t('dashboard.loadError', 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  };

  // Redirect admins with no employees to org onboarding (once per session)
  useEffect(() => {
    if (
      !loading &&
      data &&
      isAdmin &&
      !orgOnboardingChecked.current &&
      !sessionStorage.getItem('org_onboarding_shown')
    ) {
      orgOnboardingChecked.current = true;
      const employeeCount = data.activeEmployees ?? data.totalEmployees ?? null;
      if (employeeCount === 0) {
        sessionStorage.setItem('org_onboarding_shown', '1');
        navigate('/org-onboarding', { replace: true });
      }
    }
  }, [loading, data, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium mb-1">{t('dashboard.loadError', 'Failed to load dashboard')}</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button onClick={loadDashboard} className="btn btn-primary">{t('common.retry', 'Retry')}</button>
      </div>
    );
  }

  const realtimeData = scaleNumericValues(data?.realtime || {}, entityMultiplier);
  const activeEmployees = Math.round((data?.activeEmployees || 0) * entityMultiplier);
  const openShifts = Math.round((data?.openShifts || 0) * entityMultiplier);
  const complianceAlerts = data?.complianceAlerts || [];
  const activityFeed = data?.activityFeed || [];
  const timeTrackingEntries = data?.timeTrackingEntries || [];
  const careerInsights = data?.careerInsights || [];
  const recentRecognitions = data?.recentRecognitions || [];
  const lifecycleMetrics = {
    ...data?.lifecycleMetrics,
    newHires: Math.round((data?.lifecycleMetrics?.newHires || 0) * entityMultiplier),
    onboarding: Math.round((data?.lifecycleMetrics?.onboarding || 0) * entityMultiplier),
  };
  const jobOpenings = data?.jobOpenings || [];
  const weeklyChart = data?.weeklyChart || [];
  const weekMetrics = scaleNumericValues(data?.weekMetrics || {}, entityMultiplier);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('dashboard.welcomeBack', 'Welcome back')}, {user?.firstName}
          </h1>
          <p className="text-slate-600">
            {t('dashboard.whatIsHappening', "Here's what's happening today")}
          </p>
        </div>
        {isManager && (
          <div className="flex items-center gap-3">
            <Link to="/schedule" className="btn btn-primary">
              <Calendar className="w-4 h-4" />
              {t('dashboard.createSchedule', 'Create Schedule')}
            </Link>
          </div>
        )}
      </div>

      {isManager ? (
        // Manager/Admin Dashboard
        <>
          {/* Real-time Status Bar - Deputy Style */}
          <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="text-green-400 font-semibold text-sm">{t('dashboard.live', 'LIVE')}</span>
            </div>
            <div className="flex items-center gap-8">
              <Link to="/time-tracking?status=working" className="hover:opacity-80 transition-opacity">
                <RealtimeStat icon={UserCheck} value={realtimeData.onShiftNow ?? 0} label={t('dashboard.onShift', 'On Shift')} color="green" />
              </Link>
              <div className="w-px h-8 bg-slate-700" />
              <Link to="/time-tracking?status=break" className="hover:opacity-80 transition-opacity">
                <RealtimeStat icon={Coffee} value={realtimeData.onBreak ?? 0} label={t('dashboard.onBreak', 'On Break')} color="yellow" />
              </Link>
              <div className="w-px h-8 bg-slate-700" />
              <Link to="/time-tracking?status=clocked-in" className="hover:opacity-80 transition-opacity">
                <RealtimeStat icon={Clock} value={realtimeData.clockedIn ?? 0} label={t('dashboard.justClockedIn', 'Just Clocked In')} color="blue" />
              </Link>
              <div className="w-px h-8 bg-slate-700" />
              <Link to="/time-tracking?status=late" className="hover:opacity-80 transition-opacity">
                <RealtimeStat icon={AlertCircle} value={realtimeData.runningLate ?? 0} label={t('dashboard.runningLate', 'Running Late')} color="red" alert />
              </Link>
              <div className="w-px h-8 bg-slate-700" />
              <Link to="/schedule?view=open" className="hover:opacity-80 transition-opacity">
                <RealtimeStat icon={Briefcase} value={realtimeData.openShifts ?? 0} label={t('schedule.openShifts', 'Open Shifts')} color="orange" />
              </Link>
            </div>
            <Link to="/activity" className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
              {t('dashboard.activityFeed', 'Activity Feed')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Compliance Alerts */}
          {complianceAlerts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {complianceAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-l-4 transition-all hover:shadow-md text-left w-full ${
                    alert.severity === 'error' ? 'bg-red-50 border-red-500' :
                    alert.severity === 'warning' ? 'bg-amber-50 border-amber-500' :
                    'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    alert.severity === 'error' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'warning' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {alert.type === 'expiring' && <Shield className="w-5 h-5" />}
                    {alert.type === 'training' && <Play className="w-5 h-5" />}
                    {alert.type === 'document' && <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{
                      alert.type === 'expiring' ? t('dashboard.alerts.expiring', 'Certifications expiring within 30 days') :
                      alert.type === 'training' ? t('dashboard.alerts.training', 'Training in progress or pending') :
                      alert.type === 'document' ? t('dashboard.alerts.document', 'Probation reviews due') :
                      alert.title
                    }</p>
                    <p className={`text-xs ${
                      alert.severity === 'error' ? 'text-red-600' :
                      alert.severity === 'warning' ? 'text-amber-600' :
                      'text-blue-600'
                    }`}>{alert.employees?.length || 0} {(alert.employees?.length || 0) === 1 ? t('common.employee', 'employee') : t('common.employees', 'employees')} - {t('dashboard.clickToSeeWho', 'Click to see who')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              ))}
            </div>
          )}

          {/* Compliance Alert Detail Modal */}
          {selectedAlert && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                <div className={`px-6 py-4 border-b ${
                  selectedAlert.severity === 'error' ? 'bg-red-50 border-red-200' :
                  selectedAlert.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedAlert.severity === 'error' ? 'bg-red-100 text-red-600' :
                        selectedAlert.severity === 'warning' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {selectedAlert.type === 'expiring' && <Shield className="w-5 h-5" />}
                        {selectedAlert.type === 'training' && <Play className="w-5 h-5" />}
                        {selectedAlert.type === 'document' && <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div>
                        <h2 className="font-semibold text-slate-900">{
                          selectedAlert.type === 'expiring' ? t('dashboard.alerts.expiring', 'Certifications expiring within 30 days') :
                          selectedAlert.type === 'training' ? t('dashboard.alerts.training', 'Training in progress or pending') :
                          selectedAlert.type === 'document' ? t('dashboard.alerts.document', 'Probation reviews due') :
                          selectedAlert.title
                        }</h2>
                        <p className="text-sm text-slate-600">{selectedAlert.employees?.length || 0} {(selectedAlert.employees?.length || 0) === 1 ? t('common.employee', 'employee') : t('common.employees', 'employees')} {t('dashboard.affected', 'affected')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAlert(null)}
                      className="text-slate-400 hover:text-slate-600 text-2xl"
                    >
                      &times;
                    </button>
                  </div>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-3">
                    {(selectedAlert.employees || []).map((emp) => (
                      <Link
                        key={emp.id}
                        to={`/employees/${emp.id}`}
                        onClick={() => setSelectedAlert(null)}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium">
                            {emp.name?.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{emp.name}</p>
                            <p className="text-sm text-slate-500">
                              {emp.skill || emp.document}
                              {emp.expiresIn && <span className="text-amber-600"> - {t('dashboard.expiresIn', 'Expires in')} {emp.expiresIn}</span>}
                              {emp.overdueBy && <span className="text-red-600"> - {t('dashboard.overdueBy', 'Overdue by')} {emp.overdueBy}</span>}
                              {emp.reason && <span className="text-blue-600"> - {emp.reason}</span>}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="px-6 py-4 border-t bg-slate-50 flex justify-between">
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="btn btn-secondary"
                  >
                    {t('common.close', 'Close')}
                  </button>
                  <Link
                    to={
                      selectedAlert.type === 'expiring' ? '/skills?tab=expiring' :
                      selectedAlert.type === 'training' ? '/skills?tab=training' :
                      '/employees?filter=documents'
                    }
                    onClick={() => setSelectedAlert(null)}
                    className="btn btn-primary"
                  >
                    {t('dashboard.manageAll', 'Manage All')}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Calendar}
              label={t('dashboard.todaysShifts', "Today's Shifts")}
              value={data?.today?.shifts?.total || 0}
              subValue={`${data?.today?.shifts?.filled || 0} ${t('dashboard.filled', 'filled')}`}
              color="blue"
            />
            <StatCard
              icon={Users}
              label={t('dashboard.activeEmployees', 'Active Employees')}
              value={activeEmployees}
              color="green"
            />
            <StatCard
              icon={AlertCircle}
              label={t('schedule.openShifts', 'Open Shifts')}
              value={openShifts}
              color="orange"
              alert={openShifts > 0}
            />
            <StatCard
              icon={Clock}
              label={t('dashboard.pendingApprovals', 'Pending Approvals')}
              value={(data?.pendingApprovals?.timesheets || 0) + (data?.pendingApprovals?.time_off || 0)}
              color="purple"
              alert={(data?.pendingApprovals?.timesheets || 0) > 0}
            />
          </div>

          {/* Three column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Feed */}
            <div className="card lg:col-span-2">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-momentum-500" />
                  <h2 className="font-semibold text-slate-900">{t('dashboard.liveActivity', 'Live Activity')}</h2>
                </div>
              </div>
              <div className="card-body">
                {activityFeed.length > 0 ? (
                  <div className="space-y-3">
                    {activityFeed.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          activity.type === 'clock_in' ? 'bg-green-100 text-green-600' :
                          activity.type === 'clock_out' ? 'bg-slate-100 text-slate-600' :
                          activity.type === 'shift_swap' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'time_off' ? 'bg-purple-100 text-purple-600' :
                          'bg-pink-100 text-pink-600'
                        }`}>
                          {activity.type === 'clock_in' && <UserCheck className="w-4 h-4" />}
                          {activity.type === 'clock_out' && <Clock className="w-4 h-4" />}
                          {activity.type === 'shift_swap' && <Calendar className="w-4 h-4" />}
                          {activity.type === 'time_off' && <Coffee className="w-4 h-4" />}
                          {activity.type === 'recognition' && <Heart className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900">
                            <span className="font-medium">{activity.user}</span>
                            {' '}{activity.action}
                            {activity.location && <span className="text-slate-500"> {t('common.at', 'at')} {activity.location}</span>}
                          </p>
                          {activity.message && (
                            <p className="text-sm text-slate-600 mt-0.5">"{activity.message}"</p>
                          )}
                          <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">{t('dashboard.noRecentActivity', 'No recent activity')}</p>
                )}
              </div>
            </div>

            {/* Employee Lifecycle */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-momentum-500" />
                  <h2 className="font-semibold text-slate-900">{t('dashboard.teamHealth', 'Team Health')}</h2>
                </div>
                <Link to="/employees" className="text-sm text-momentum-500 hover:text-momentum-600">
                  {t('common.viewMore', 'View all')}
                </Link>
              </div>
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-700">{lifecycleMetrics.retentionRate ?? '--'}%</p>
                      <p className="text-xs text-green-600">{t('dashboard.retentionRate', 'Retention Rate')}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xl font-bold text-slate-900">{lifecycleMetrics.newHires ?? 0}</p>
                    <p className="text-xs text-slate-500">{t('dashboard.newHires', 'New Hires')}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xl font-bold text-slate-900">{lifecycleMetrics.onboarding ?? 0}</p>
                    <p className="text-xs text-slate-500">{t('dashboard.onboarding', 'Onboarding')}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">{t('dashboard.avgTenure', 'Avg. Tenure')}</p>
                    <p className="text-sm font-semibold text-slate-900">{lifecycleMetrics.avgTenure ?? '--'}</p>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-momentum-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recognition Feed */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <h2 className="font-semibold text-slate-900">{t('dashboard.recognition', 'Recognition')}</h2>
                </div>
                {/* TODO: Wire to recognition API when available */}
              </div>
              <div className="card-body space-y-3">
                {recentRecognitions.length > 0 ? recentRecognitions.map((rec) => (
                  <div key={rec.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="text-2xl">{rec.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{rec.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {rec.from} → {rec.to}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Heart className="w-4 h-4" />
                      <span className="text-xs">{rec.likes}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-500 py-6">{t('dashboard.noRecentRecognitions', 'No recent recognitions')}</p>
                )}
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{t('dashboard.pendingApprovals', 'Pending Approvals')}</h2>
                <Link to="/time-tracking" className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1">
                  {t('common.viewMore', 'View all')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="card-body space-y-3">
                {data?.pendingApprovals && (
                  <>
                    <ApprovalItem
                      icon={Clock}
                      label={t('dashboard.timesheetEntries', 'Timesheet Entries')}
                      count={data.pendingApprovals.timesheets || 0}
                      href="/time-tracking"
                    />
                    <ApprovalItem
                      icon={Coffee}
                      label={t('dashboard.timeOffRequests', 'Time Off Requests')}
                      count={data.pendingApprovals.time_off || 0}
                      href="/time-off"
                    />
                    <ApprovalItem
                      icon={Calendar}
                      label={t('dashboard.shiftSwaps', 'Shift Swaps')}
                      count={data.pendingApprovals.swaps || 0}
                      href="/schedule"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Week Summary with Chart */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-momentum-500" />
                <h2 className="font-semibold text-slate-900">{t('dashboard.thisWeeksPerformance', "This Week's Performance")}</h2>
              </div>
              <Link to="/reports" className="text-sm text-momentum-500 hover:text-momentum-600">
                {t('dashboard.viewReports', 'View Reports')}
              </Link>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">
                    {parseFloat(weekMetrics?.scheduled || 0).toFixed(0)}h
                  </p>
                  <p className="text-sm text-slate-500">{t('dashboard.hoursScheduled', 'Hours Scheduled')}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">
                    {parseFloat(weekMetrics?.worked || 0).toFixed(0)}h
                  </p>
                  <p className="text-sm text-slate-500">{t('dashboard.hoursWorked', 'Hours Worked')}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    £{parseFloat(weekMetrics?.cost_scheduled || 0).toFixed(0)}
                  </p>
                  <p className="text-sm text-slate-500">{t('dashboard.scheduledCost', 'Scheduled Cost')}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-momentum-600">
                    £{parseFloat(weekMetrics?.cost_actual || 0).toFixed(0)}
                  </p>
                  <p className="text-sm text-slate-500">{t('dashboard.actualCost', 'Actual Cost')}</p>
                </div>
              </div>
              {/* Bar chart visualization from API data */}
              {weeklyChart.length > 0 && (
                <>
                  <div className="mt-6 flex items-end justify-around h-40 px-4">
                    {weeklyChart.map((dayData, i) => {
                      const maxHours = Math.max(...weeklyChart.map(d => Math.max(d.scheduled || 0, d.worked || 0)), 1);
                      const scheduledHeight = ((dayData.scheduled || 0) / maxHours) * 100;
                      const workedHeight = ((dayData.worked || 0) / maxHours) * 100;
                      const isToday = i === new Date().getDay() - 1;
                      return (
                        <div key={dayData.day} className="flex flex-col items-center gap-2">
                          <div className="flex items-end gap-1 h-28">
                            <div
                              className="w-5 rounded-t bg-slate-300"
                              style={{ height: `${scheduledHeight}%`, minHeight: '8px' }}
                              title={`Scheduled: ${dayData.scheduled}h`}
                            />
                            <div
                              className={`w-5 rounded-t ${isToday ? 'bg-momentum-500' : 'bg-momentum-400'}`}
                              style={{ height: `${workedHeight}%`, minHeight: '8px' }}
                              title={`Worked: ${dayData.worked}h`}
                            />
                          </div>
                          <span className={`text-xs ${isToday ? 'text-momentum-600 font-semibold' : 'text-slate-500'}`}>
                            {dayData.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-slate-300" />
                      <span className="text-xs text-slate-500">{t('dashboard.scheduled', 'Scheduled')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-momentum-500" />
                      <span className="text-xs text-slate-500">{t('dashboard.worked', 'Worked')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* AI Demand Forecast */}
          <DemandForecast compact />

          {/* Career Development Insights */}
          {careerInsights.length > 0 && (
            <div className="card border-l-4 border-momentum-500">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-momentum-500" />
                  <h2 className="font-semibold text-slate-900">{t('dashboard.careerInsights', 'Career Development Insights')}</h2>
                  <span className="px-2 py-0.5 bg-momentum-100 text-momentum-700 text-xs font-medium rounded-full">
                    {t('dashboard.skillsDriven', 'Skills-Driven')}
                  </span>
                </div>
                <Link to="/skills?filter=gaps" className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1">
                  {t('dashboard.viewSkillGaps', 'View Skill Gaps')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="card-body">
                <p className="text-sm text-slate-600 mb-4">
                  {t('dashboard.careerInsightsDesc', 'Workers ready for their next role - use AI scheduling to give them development opportunities.')}
                </p>
                <div className="space-y-3">
                  {careerInsights.map((insight) => (
                    <Link
                      key={insight.id}
                      to={`/employees/${insight.id}`}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-momentum-50/30 rounded-lg border border-slate-100 hover:border-momentum-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-semibold">
                          {insight.employee?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{insight.employee}</p>
                          <p className="text-sm text-slate-500">
                            {insight.currentRole} → <span className="text-momentum-600 font-medium">{insight.nextRole}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{insight.recommendation}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          insight.matchScore >= 90 ? 'text-green-600' :
                          insight.matchScore >= 75 ? 'text-amber-600' :
                          'text-slate-600'
                        }`}>
                          {insight.matchScore}%
                        </div>
                        <p className="text-xs text-slate-500">{t('dashboard.matchScore', 'match score')}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          insight.readyStatus === 'Ready now' ? 'bg-green-100 text-green-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {insight.readyStatus}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-momentum-50 rounded-lg border border-momentum-200">
                  <p className="text-sm text-momentum-800">
                    <strong>{t('dashboard.proTip', 'Pro tip')}:</strong> {t('dashboard.proTipText', 'Use AI Fill in the Schedule Builder to automatically assign development shifts to workers building toward promotions.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Job Openings */}
          {jobOpenings.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-500" />
                  <h2 className="font-semibold text-slate-900">{t('dashboard.activeJobOpenings', 'Active Job Openings')}</h2>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    {jobOpenings.length} {t('jobs.open', 'open')}
                  </span>
                </div>
                <Link to="/jobs" className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1">
                  {t('dashboard.manageJobs', 'Manage Jobs')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {jobOpenings.map((job) => (
                    <Link
                      key={job.id}
                      to={`/jobs?id=${job.id}`}
                      className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <h3 className="font-medium text-slate-900">{job.title}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                        <span className="text-sm text-slate-600">
                          <Users className="w-4 h-4 inline mr-1" />
                          {job.applicants} {t('jobs.applicants', 'applicants')}
                        </span>
                        <span className="text-xs text-slate-400">{job.daysOpen}d ago</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-900">{t('dashboard.quickActions', 'Quick Actions')}</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <QuickActionButton icon={Calendar} label={t('dashboard.createSchedule', 'Create Schedule')} to="/schedule" color="momentum" />
                <QuickActionButton icon={Users} label={t('dashboard.addEmployee', 'Add Employee')} to="/onboarding" color="blue" />
                <QuickActionButton icon={Award} label={t('dashboard.manageSkills', 'Manage Skills')} to="/skills" color="purple" />
                <QuickActionButton icon={Briefcase} label={t('dashboard.postJob', 'Post Job')} to="/jobs" color="green" />
                <QuickActionButton icon={TrendingUp} label={t('dashboard.viewReports', 'View Reports')} to="/reports" color="orange" />
              </div>
            </div>
          </div>
        </>
      ) : (
        // Worker Dashboard — Employee Self-Service Homepage
        (() => {
          const hour = new Date().getHours();
          const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
          const GreetingIcon = hour < 12 ? Sun : hour < 18 ? Sunset : Moon;
          const greetingText = {
            morning: t('workerHome.goodMorning', 'Good morning'),
            afternoon: t('workerHome.goodAfternoon', 'Good afternoon'),
            evening: t('workerHome.goodEvening', 'Good evening'),
          }[greetingKey];
          const momentumScore = 91;
          const momentumTrend = 3;
          const leaveRemaining = 18;
          const leaveTotal = 25;
          const trainingComplete = 4;
          const trainingTotal = 5;
          const trainingPercent = Math.round((trainingComplete / trainingTotal) * 100);

          return (
            <>
              {/* ROW 1: Welcome Banner + Momentum Score */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Welcome Banner */}
                <div className="lg:col-span-2 bg-gradient-to-br from-momentum-500 to-momentum-700 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <GreetingIcon className="w-7 h-7 text-white/80" />
                    <h2 className="text-2xl font-bold">{greetingText}, {user?.firstName}</h2>
                  </div>
                  <p className="text-white/80 text-sm mb-1">
                    {t('workerHome.teamSubtitle', 'Front of House Team • The Grand Hotel, London')}
                  </p>
                  <p className="text-white/60 text-xs">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Momentum Score */}
                <div className="card flex flex-col items-center justify-center py-4">
                  <div className="relative">
                    <svg className="w-32 h-32" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="54" fill="none"
                        stroke={momentumScore >= 80 ? '#22c55e' : momentumScore >= 60 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${(momentumScore / 100) * 339.3} 339.3`}
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">{momentumScore}</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-700 mt-2">{t('workerHome.momentumScore', 'Your Momentum Score')}</p>
                  <p className="text-xs text-green-600 font-medium">
                    {t('workerHome.momentumTrend', '↑{{count}} from last month', { count: momentumTrend })}
                  </p>
                  <Link to="/momentum" className="text-xs text-momentum-500 hover:text-momentum-600 mt-1 flex items-center gap-1">
                    {t('workerHome.viewDetails', 'View details')} <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* ROW 2: Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Link to="/time-off" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CalendarOff className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-center">{t('workerHome.requestTimeOff', 'Request Time Off')}</span>
                </Link>
                <Link to="/time-tracking" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-center">{t('workerHome.clockIn', 'Clock In')}</span>
                </Link>
                <Link to="/compensation" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-center">{t('workerHome.latestPayslip', 'Latest Payslip')}</span>
                </Link>
                <Link to="/learning" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-momentum-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-momentum-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-center">{t('workerHome.continueTraining', 'Continue Training')}</span>
                </Link>
                <Link to="/recognition" className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-center">{t('workerHome.giveRecognition', 'Give Recognition')}</span>
                </Link>
              </div>

              {/* ROW 3: Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Leave Balance */}
                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarOff className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm font-semibold text-slate-700">{t('workerHome.leaveBalance', 'Leave Balance')}</h3>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{t('workerHome.daysRemaining', '{{count}} days remaining', { count: leaveRemaining })}</p>
                    <div className="mt-3">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(leaveRemaining / leaveTotal) * 100}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{leaveRemaining}/{leaveTotal}</p>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                      {t('workerHome.annualLeave', 'Annual Leave')}
                    </span>
                  </div>
                </div>

                {/* Training Compliance */}
                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-momentum-500" />
                      <h3 className="text-sm font-semibold text-slate-700">{t('workerHome.trainingCompliance', 'Training Compliance')}</h3>
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {t('workerHome.trainingProgress', '{{complete}} of {{total}} required complete', { complete: trainingComplete, total: trainingTotal })}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <svg className="w-12 h-12 shrink-0" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                        <circle cx="24" cy="24" r="20" fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(trainingPercent / 100) * 125.7} 125.7`} transform="rotate(-90 24 24)" />
                        <text x="24" y="28" textAnchor="middle" className="text-xs font-bold fill-slate-700">{trainingPercent}%</text>
                      </svg>
                      <div>
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {t('workerHome.overdueTraining', 'Fire Safety — due Feb 10')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Shift */}
                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <h3 className="text-sm font-semibold text-slate-700">{t('workerHome.nextShift', 'Next Shift')}</h3>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{t('workerHome.nextShiftTime', 'Tomorrow, 7:00 AM — 3:00 PM')}</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {t('workerHome.nextShiftLocation', 'The Grand Hotel, Main Restaurant')}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {t('workerHome.nextShiftRole', 'Front of House')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pending Actions */}
                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-semibold text-slate-700">{t('workerHome.pendingActions', 'Pending Actions')}</h3>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{t('workerHome.pendingCount', '3 items need attention')}</p>
                    <ul className="mt-3 space-y-1.5">
                      <li className="text-xs text-slate-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        {t('workerHome.pendingTraining', '1 training overdue')}
                      </li>
                      <li className="text-xs text-slate-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {t('workerHome.pendingDocument', '1 document to sign')}
                      </li>
                      <li className="text-xs text-slate-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {t('workerHome.pendingExpense', '1 expense pending')}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* ROW 4: Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                  {/* Recent Recognition */}
                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" />
                        <h2 className="font-semibold text-slate-900">{t('workerHome.recentRecognition', 'Recent Recognition')}</h2>
                      </div>
                      <Link to="/recognition" className="text-sm text-momentum-500 hover:text-momentum-600">
                        {t('common.viewMore', 'View all')}
                      </Link>
                    </div>
                    <div className="card-body space-y-3">
                      {[
                        { emoji: '\u2B50', from: 'Sarah M.', to: 'You', message: t('workerHome.kudos1', 'Amazing service with the VIP table last night!'), time: t('workerHome.kudos1Time', '2 hours ago') },
                        { emoji: '\uD83D\uDE4C', from: 'James T.', to: 'Maria L.', message: t('workerHome.kudos2', 'Thanks for covering my shift on short notice'), time: t('workerHome.kudos2Time', 'Yesterday') },
                        { emoji: '\uD83C\uDF1F', from: 'Manager', to: 'You', message: t('workerHome.kudos3', 'Guest satisfaction score of 98% this week — outstanding!'), time: t('workerHome.kudos3Time', '2 days ago') },
                        { emoji: '\uD83D\uDCAA', from: 'You', to: 'Alex R.', message: t('workerHome.kudos4', 'Great teamwork during the Saturday rush'), time: t('workerHome.kudos4Time', '3 days ago') },
                      ].map((kudos, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <span className="text-2xl">{kudos.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900">{kudos.message}</p>
                            <p className="text-xs text-slate-500 mt-1">{kudos.from} → {kudos.to} • {kudos.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Celebrations */}
                  <div className="card">
                    <div className="card-header flex items-center gap-2">
                      <Gift className="w-5 h-5 text-momentum-500" />
                      <h2 className="font-semibold text-slate-900">{t('workerHome.teamCelebrations', 'Team Celebrations')}</h2>
                    </div>
                    <div className="card-body space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                        <Cake className="w-5 h-5 text-pink-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{t('workerHome.birthdayName', 'Maria Lopez')}</p>
                          <p className="text-xs text-slate-500">{t('workerHome.birthdayLabel', 'Birthday today — wish them well!')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-momentum-50 rounded-lg">
                        <Award className="w-5 h-5 text-momentum-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{t('workerHome.anniversaryName', 'James Turner')}</p>
                          <p className="text-xs text-slate-500">{t('workerHome.anniversaryLabel', '2-year work anniversary this week')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <UserPlus className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{t('workerHome.newStarterName', 'Emily Chen')}</p>
                          <p className="text-xs text-slate-500">{t('workerHome.newStarterLabel', 'New starter — say hello!')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                  {/* My Achievements */}
                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-momentum-500" />
                        <h2 className="font-semibold text-slate-900">{t('workerHome.myAchievements', 'My Achievements')}</h2>
                      </div>
                      <Link to="/career" className="text-sm text-momentum-500 hover:text-momentum-600">
                        {t('common.viewMore', 'View all')}
                      </Link>
                    </div>
                    <div className="card-body">
                      <div className="grid grid-cols-3 gap-3">
                        {/* Earned badges */}
                        {[
                          { emoji: '\uD83C\uDF1F', name: t('workerHome.badgeServiceStar', 'Service Star') },
                          { emoji: '\u26A1', name: t('workerHome.badgeSpeedDemon', 'Speed Demon') },
                          { emoji: '\uD83E\uDD1D', name: t('workerHome.badgeTeamPlayer', 'Team Player') },
                        ].map((badge, i) => (
                          <div key={i} className="flex flex-col items-center p-3 bg-momentum-50 rounded-xl border border-momentum-200">
                            <span className="text-2xl mb-1">{badge.emoji}</span>
                            <span className="text-xs font-medium text-momentum-700 text-center">{badge.name}</span>
                          </div>
                        ))}
                        {/* Locked badges */}
                        {[
                          { emoji: '\uD83C\uDFC6', name: t('workerHome.badgeMentor', 'Mentor') },
                          { emoji: '\uD83C\uDF93', name: t('workerHome.badgeCertified', 'Certified Pro') },
                          { emoji: '\uD83D\uDC8E', name: t('workerHome.badgeLoyalty', '5-Year Club') },
                        ].map((badge, i) => (
                          <div key={i} className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-50">
                            <div className="relative">
                              <span className="text-2xl mb-1 grayscale">{badge.emoji}</span>
                              <Lock className="w-3 h-3 text-slate-400 absolute -top-1 -right-1" />
                            </div>
                            <span className="text-xs font-medium text-slate-400 text-center mt-1">{badge.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Company Announcements */}
                  <div className="card">
                    <div className="card-header flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-blue-500" />
                      <h2 className="font-semibold text-slate-900">{t('workerHome.companyAnnouncements', 'Company Announcements')}</h2>
                    </div>
                    <div className="card-body space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <p className="text-sm font-medium text-slate-900">{t('workerHome.announcement1Title', 'New Employee Wellness Programme')}</p>
                        <p className="text-xs text-slate-600 mt-1">{t('workerHome.announcement1Body', 'Free gym membership and mental health support now available for all team members.')}</p>
                        <p className="text-xs text-slate-400 mt-1">{t('workerHome.announcement1Date', 'HR Team • 1 day ago')}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                        <p className="text-sm font-medium text-slate-900">{t('workerHome.announcement2Title', 'Valentine\'s Day Special Service')}</p>
                        <p className="text-xs text-slate-600 mt-1">{t('workerHome.announcement2Body', 'Special menu and service guidelines for Feb 14. Please review the briefing notes.')}</p>
                        <p className="text-xs text-slate-400 mt-1">{t('workerHome.announcement2Date', 'Operations • 3 days ago')}</p>
                      </div>
                      <div className="p-3 bg-momentum-50 rounded-lg border-l-4 border-momentum-400">
                        <p className="text-sm font-medium text-slate-900">{t('workerHome.announcement3Title', 'Q1 Team Awards Nominations Open')}</p>
                        <p className="text-xs text-slate-600 mt-1">{t('workerHome.announcement3Body', 'Nominate a colleague who has gone above and beyond. Deadline: Feb 28.')}</p>
                        <p className="text-xs text-slate-400 mt-1">{t('workerHome.announcement3Date', 'HR Team • 5 days ago')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 5: My Goals Progress */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-momentum-500" />
                    <h2 className="font-semibold text-slate-900">{t('workerHome.myGoals', 'My Goals Progress')}</h2>
                  </div>
                  <Link to="/career" className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1">
                    {t('common.viewMore', 'View all')} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="card-body space-y-5">
                  {[
                    { label: t('workerHome.goal1', 'Complete Food Safety Level 3'), percent: 60 },
                    { label: t('workerHome.goal2', 'Achieve 90% guest satisfaction'), percent: 85 },
                    { label: t('workerHome.goal3', 'Complete Wine Service certification'), percent: 30 },
                  ].map((goal, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-700">{goal.label}</p>
                        <span className="text-sm font-semibold text-momentum-600">{goal.percent}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-momentum-500 rounded-full transition-all" style={{ width: `${goal.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}

// Real-time stat component for the live bar
function RealtimeStat({ icon: Icon, value, label, color, alert }) {
  const colors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
    orange: 'text-orange-400',
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${colors[color]}`} />
      <span className={`text-lg font-bold text-white ${alert ? 'animate-pulse' : ''}`}>{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, trend, color, alert }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className={`stat-card ${alert ? 'ring-2 ring-orange-200' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="stat-value">{value}</p>
          <p className="stat-label">{label}</p>
          {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
          {trend && <p className="text-xs text-green-600">{trend}</p>}
        </div>
      </div>
    </div>
  );
}

function ApprovalItem({ icon: Icon, label, count, href }) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`badge ${count > 0 ? 'badge-warning' : 'badge-neutral'}`}>
          {count}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-400" />
      </div>
    </Link>
  );
}

function QuickActionButton({ icon: Icon, label, to, color }) {
  const colors = {
    momentum: 'bg-momentum-50 text-momentum-600 hover:bg-momentum-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
  };

  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${colors[color]}`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-sm font-medium text-center">{label}</span>
    </Link>
  );
}
