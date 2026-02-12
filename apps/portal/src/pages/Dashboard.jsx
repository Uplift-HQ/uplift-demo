// ============================================================
// DASHBOARD PAGE
// Three-tier dashboard: Admin / Manager / Worker
// All inline demo data — no API calls for demo mode
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi, departmentsApi, employeesApi, shiftsApi, timeOffApi, locationsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useEntity } from '../lib/entityContext';
import { useView } from '../lib/viewContext';
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
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
  CalendarDays,
  DollarSign,
  BookOpen,
  FileText,
  Cake,
  Lock,
  Megaphone,
  Hand,
  Receipt,
  Trophy,
  GraduationCap,
  HeartHandshake,
  Flame,
  Info,
  X,
  ChevronDown,
  Gauge,
  Wallet,
  Palmtree,
} from 'lucide-react';
import DemandForecast from '../components/DemandForecast';

// ============================================================
// UTILITY
// ============================================================

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

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, isManagerOrAbove, isAdmin, isManager, isWorker } = useAuth();
  const { currentEntity } = useEntity();
  const { isPersonalView } = useView();
  const navigate = useNavigate();

  const ENTITY_MULTIPLIERS = {
    'gm-uk': 1,
    'gm-de': 0.42,
    'gm-ae': 0.57,
    'gm-sg': 0.35,
    'gm-us': 0.44,
  };
  const entityMultiplier = ENTITY_MULTIPLIERS[currentEntity?.id] || 1;

  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const orgOnboardingChecked = useRef(false);

  // Modal states
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showTipsModal, setShowTipsModal] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setError(null);
      const [dashboardResult, deptResult] = await Promise.all([
        dashboardApi.get(),
        departmentsApi.list(),
      ]);
      setData(dashboardResult);
      setDepartments(deptResult.departments || []);
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

  // ============================================================
  // ROLE ROUTING
  // ============================================================

  // If Admin or Manager is in "My View", show personal dashboard
  if (isPersonalView && (isAdmin || isManager)) {
    return (
      <PersonalDashboard
        t={t}
        user={user}
        showTipsModal={showTipsModal}
        setShowTipsModal={setShowTipsModal}
      />
    );
  }

  if (isAdmin) {
    return (
      <AdminDashboard
        t={t}
        user={user}
        data={data}
        entityMultiplier={entityMultiplier}
        selectedAlert={selectedAlert}
        setSelectedAlert={setSelectedAlert}
      />
    );
  }

  if (isManager) {
    return <ManagerDashboard t={t} user={user} data={data} />;
  }

  // Default: worker
  return (
    <WorkerDashboard
      t={t}
      user={user}
      showTipsModal={showTipsModal}
      setShowTipsModal={setShowTipsModal}
    />
  );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================

function AdminDashboard({ t, user, data, entityMultiplier, selectedAlert, setSelectedAlert }) {
  const realtimeData = scaleNumericValues(data?.realtime || {}, entityMultiplier);
  const activeEmployees = Math.round((data?.activeEmployees || 0) * entityMultiplier);
  const openShifts = Math.round((data?.openShifts || 0) * entityMultiplier);
  const complianceAlerts = data?.complianceAlerts || [];
  const activityFeed = data?.activityFeed || [];
  const recentRecognitions = data?.recentRecognitions || [];
  const lifecycleMetrics = {
    ...data?.lifecycleMetrics,
    newHires: Math.round((data?.lifecycleMetrics?.newHires || 0) * entityMultiplier),
    onboarding: Math.round((data?.lifecycleMetrics?.onboarding || 0) * entityMultiplier),
  };
  const jobOpenings = data?.jobOpenings || [];
  const weeklyChart = data?.weeklyChart || [];
  const weekMetrics = scaleNumericValues(data?.weekMetrics || {}, entityMultiplier);
  const careerInsights = data?.careerInsights || [];

  // Demo KPI data
  const kpiData = {
    totalEmployees: activeEmployees || 108,
    newHires: lifecycleMetrics.newHires || 12,
    turnoverRate: 4.2,
    openPositions: jobOpenings.length || 3,
    avgMomentum: 78,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('dashboard.welcomeBack', 'Welcome back')}, {user?.firstName || 'Sarah'}
          </h1>
          <p className="text-slate-600">
            {t('dashboard.adminSubtitle', 'Organisation overview and key metrics')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/schedule" className="btn btn-primary">
            <Calendar className="w-4 h-4" />
            {t('dashboard.createSchedule', 'Create Schedule')}
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label={t('dashboard.totalEmployees', 'Total Employees')}
          value={kpiData.totalEmployees}
          color="blue"
        />
        <StatCard
          icon={UserPlus}
          label={t('dashboard.newHiresMonth', 'New Hires (Month)')}
          value={kpiData.newHires}
          color="green"
        />
        <StatCard
          icon={TrendingDown}
          label={t('dashboard.turnoverRate', 'Turnover Rate')}
          value={`${kpiData.turnoverRate}%`}
          color="orange"
        />
        <StatCard
          icon={Briefcase}
          label={t('dashboard.openPositions', 'Open Positions')}
          value={kpiData.openPositions}
          color="purple"
        />
        <StatCard
          icon={Zap}
          label={t('dashboard.avgMomentum', 'Avg Momentum Score')}
          value={kpiData.avgMomentum}
          color="momentum"
        />
      </div>

      {/* Real-time Status Bar */}
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
                <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
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
              <button onClick={() => setSelectedAlert(null)} className="btn btn-secondary">
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

      {/* Three column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-momentum-500" />
              <h2 className="font-semibold text-slate-900">{t('dashboard.recentActivity', 'Recent Activity')}</h2>
            </div>
            <Link to="/activity" className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1">
              {t('common.viewMore', 'View all')} <ArrowRight className="w-4 h-4" />
            </Link>
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

        {/* Department Breakdown */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-momentum-500" />
              <h2 className="font-semibold text-slate-900">{t('dashboard.departmentBreakdown', 'Department Breakdown')}</h2>
            </div>
          </div>
          <div className="card-body space-y-4">
            {(() => {
              const DEPT_COLORS = ['bg-momentum-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500'];
              const sortedDepts = [...departments].sort((a, b) => (b.employee_count || 0) - (a.employee_count || 0)).slice(0, 5);
              const maxCount = Math.max(...sortedDepts.map(d => d.employee_count || 0), 1);
              return sortedDepts.map((dept, idx) => (
                <div key={dept.id || dept.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{dept.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{dept.employee_count || 0}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${DEPT_COLORS[idx % DEPT_COLORS.length]}`} style={{ width: `${((dept.employee_count || 0) / maxCount) * 100}%` }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

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
                        {insight.currentRole} <ArrowRight className="w-3 h-3 inline" /> <span className="text-momentum-600 font-medium">{insight.nextRole}</span>
                      </p>
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
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MANAGER DASHBOARD — THE OPERATIONS COCKPIT
// Real-time status, action queue, today's schedule
// Fetches live data from API
// ============================================================

function ManagerDashboard({ t, user }) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [pendingTimeOff, setPendingTimeOff] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [departmentName, setDepartmentName] = useState('');

  useEffect(() => {
    const loadManagerData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [empResult, shiftsResult, timeOffResult, locResult, deptResult] = await Promise.all([
          employeesApi.list({ status: 'active', limit: 50 }),
          shiftsApi.list({ start: today, end: today }),
          timeOffApi.getRequests({ status: 'pending' }).catch(() => ({ requests: [] })),
          locationsApi.list(),
          departmentsApi.list(),
        ]);
        setEmployees(empResult.employees || []);
        setTodayShifts(shiftsResult.shifts || []);
        setPendingTimeOff(timeOffResult.requests || []);
        // Set location/department from first available
        if (locResult.locations?.length > 0) {
          setLocationName(locResult.locations[0].name);
        }
        if (deptResult.departments?.length > 0) {
          setDepartmentName(deptResult.departments[0].name);
        }
      } catch (err) {
        console.error('Failed to load manager dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadManagerData();
  }, []);

  // Build team members from today's shifts
  const teamMembers = todayShifts.map(shift => {
    const emp = employees.find(e => e.id === shift.employee_id);
    const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : shift.employee_name || 'Unassigned';
    const startHour = shift.start_time ? parseInt(shift.start_time.split(':')[0]) : 0;
    const endHour = shift.end_time ? parseInt(shift.end_time.split(':')[0]) : 0;
    const shiftTime = shift.start_time && shift.end_time
      ? `${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`
      : '-';
    return {
      id: shift.id,
      name: empName,
      role: emp?.role_name || shift.role_name || emp?.role || '-',
      shift: shiftTime,
      status: shift.status === 'published' ? 'scheduled' : shift.status || 'scheduled',
      clockedIn: null,
      momentum: emp?.momentum_score || 75,
    };
  });

  // Action queue from pending time-off requests
  const actionQueue = pendingTimeOff.slice(0, 5).map((req, idx) => ({
    id: req.id || idx,
    type: 'time-off',
    urgency: 'medium',
    employee: req.employee_name || 'Employee',
    detail: `${req.start_date || ''} - ${req.end_date || ''} (${req.type || 'Leave'})`,
    impact: req.reason || '',
    href: '/time-off',
  }));

  // Compliance - show empty state (would need learning/compliance API)
  const compliance = [];

  // Weekly coverage - would need shift analysis API
  const weekCoverage = [];

  const onShiftNow = teamMembers.filter(m => m.status === 'on-shift' || m.status === 'on-break').length;
  const openShifts = todayShifts.filter(s => !s.employee_id).length;
  const avgMomentum = teamMembers.length > 0
    ? Math.round(teamMembers.reduce((sum, m) => sum + (m.momentum || 75), 0) / teamMembers.length)
    : 0;

  const statusStyles = {
    'on-shift': 'bg-green-500',
    'on-break': 'bg-yellow-500',
    'scheduled': 'bg-blue-400',
    'off-today': 'bg-slate-300',
  };

  const urgencyConfig = {
    high: { bg: 'bg-red-50 border-red-200', icon: 'text-red-500', badge: 'bg-red-100 text-red-700' },
    medium: { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
    low: { bg: 'bg-slate-50 border-slate-200', icon: 'text-slate-400', badge: 'bg-slate-100 text-slate-600' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER — Operations cockpit style */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('manager.opsCockpit', 'Operations Cockpit')}</h1>
            <p className="text-slate-300 mt-1">
              {locationName || t('manager.location', 'Your Location')} — {departmentName || t('manager.dept', 'Your Team')} — {teamMembers.length} {t('manager.teamMembers', 'team members')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/schedule" className="bg-momentum-500 hover:bg-momentum-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" />
              {t('manager.manageSchedule', 'Manage Schedule')}
            </Link>
          </div>
        </div>

        {/* Live status indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-green-400">{onShiftNow}</div>
            <div className="text-xs text-slate-300 mt-1">{t('manager.onShiftNow', 'On Shift Now')}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-red-400">0</div>
            <div className="text-xs text-slate-300 mt-1">{t('manager.absentToday', 'Absent Today')}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-amber-400">{openShifts}</div>
            <div className="text-xs text-slate-300 mt-1">{t('manager.openShifts', 'Open Shifts')}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-blue-400">{actionQueue.length}</div>
            <div className="text-xs text-slate-300 mt-1">{t('manager.pendingActions', 'Pending Actions')}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-momentum-400">{avgMomentum}</div>
            <div className="text-xs text-slate-300 mt-1">{t('manager.teamMomentum', 'Team Momentum')}</div>
          </div>
        </div>
      </div>

      {/* ACTION REQUIRED — The heart of the operations cockpit */}
      <div className="card border-2 border-amber-200 bg-amber-50/30">
        <div className="card-header bg-amber-100/50 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="font-bold text-slate-900">{t('manager.needsYourAction', 'NEEDS YOUR ACTION')} ({actionQueue.length})</h2>
        </div>
        <div className="divide-y divide-amber-100">
          {actionQueue.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">{t('manager.allCaughtUp', 'All caught up!')}</p>
              <p className="text-sm text-slate-500">{t('manager.noPendingActions', 'No pending actions require your attention')}</p>
            </div>
          ) : actionQueue.map((item) => (
            <div key={item.id} className={`p-4 flex items-center justify-between ${urgencyConfig[item.urgency]?.bg || 'bg-slate-50'} border-l-4 ${item.urgency === 'high' ? 'border-l-red-500' : item.urgency === 'medium' ? 'border-l-amber-500' : 'border-l-slate-300'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${urgencyConfig[item.urgency]?.badge || 'bg-slate-100 text-slate-600'}`}>
                  {item.type === 'time-off' && <Coffee className="w-5 h-5" />}
                  {item.type === 'expense' && <Receipt className="w-5 h-5" />}
                  {item.type === 'shift-swap' && <Calendar className="w-5 h-5" />}
                  {item.type === 'training' && <GraduationCap className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{item.employee}</p>
                  <p className="text-sm text-slate-600">{item.detail}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('manager.impact', 'Impact')}: {item.impact}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors">
                  {t('manager.approve', 'Approve')}
                </button>
                <button className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors">
                  {t('manager.deny', 'Deny')}
                </button>
                <Link to={item.href} className="p-1.5 text-slate-400 hover:text-slate-600">
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns: Today's Schedule + Team Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TODAY'S SCHEDULE — Timeline view */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-momentum-500" />
              <h2 className="font-semibold text-slate-900">{t('manager.todaysSchedule', "Today's Schedule")}</h2>
            </div>
            <Link to="/schedule" className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1">
              {t('manager.fullSchedule', 'Full Schedule')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="card-body">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">{t('manager.noShiftsToday', 'No shifts scheduled for today')}</p>
                <Link to="/schedule" className="text-sm text-momentum-500 hover:text-momentum-600 mt-2 inline-block">
                  {t('manager.viewSchedule', 'View full schedule')}
                </Link>
              </div>
            ) : (
              ['AM (06:00-14:00)', 'PM (14:00-22:00)', 'Night (22:00-06:00)'].map((period, idx) => {
                const periodMembers = teamMembers.filter(m => {
                  const hour = parseInt(m.shift?.split(':')[0] || '0');
                  if (idx === 0) return hour >= 5 && hour < 12;
                  if (idx === 1) return hour >= 11 && hour < 20;
                  return hour >= 20 || hour < 6;
                });
                if (periodMembers.length === 0) return null;
                return (
                  <div key={period} className={idx > 0 ? 'mt-4 pt-4 border-t border-slate-100' : ''}>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{period}</p>
                    <div className="space-y-2">
                      {periodMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${statusStyles[member.status] || 'bg-slate-300'}`} />
                            <div className="w-8 h-8 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs">
                              {member.name?.split(' ').map(n => n?.[0] || '').join('') || '??'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{member.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">{member.role || '-'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-700">{member.shift || '-'}</p>
                            {member.clockedIn && (
                              <p className="text-xs text-green-600">{t('manager.clockedIn', 'In')}: {member.clockedIn}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TEAM COMPLIANCE + WEEKLY COVERAGE */}
        <div className="space-y-6">
          {/* Compliance status */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <h2 className="font-semibold text-slate-900">{t('manager.teamCompliance', 'Team Compliance')}</h2>
            </div>
            <div className="card-body space-y-3">
              {compliance.length > 0 ? compliance.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.status === 'ok' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    {item.status === 'alert' && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-sm text-slate-700">{item.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${item.status === 'ok' ? 'text-green-600' : item.status === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
                    {item.completed}/{item.total}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-slate-500 text-center py-4">{t('manager.noComplianceData', 'No compliance data available')}</p>
              )}
            </div>
          </div>

          {/* Weekly coverage */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-slate-900">{t('manager.weekCoverage', "This Week's Coverage")}</h2>
            </div>
            <div className="card-body">
              {weekCoverage.length > 0 ? (
                <div className="grid grid-cols-7 gap-2">
                  {weekCoverage.map((day) => (
                    <div key={day.day} className={`text-center p-2 rounded-lg ${day.status === 'ok' ? 'bg-green-50' : day.status === 'warning' ? 'bg-amber-50' : 'bg-red-50'}`}>
                      <p className="text-xs font-medium text-slate-500">{day.day}</p>
                      <p className={`text-lg font-bold ${day.status === 'ok' ? 'text-green-600' : day.status === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
                        {day.filled}
                      </p>
                      <p className="text-xs text-slate-400">/{day.required}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">{t('manager.noCoverageData', 'View full schedule for coverage details')}</p>
              )}
            </div>
          </div>

          {/* Team Momentum */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Zap className="w-5 h-5 text-momentum-500" />
              <h2 className="font-semibold text-slate-900">{t('manager.teamMomentum', 'Team Momentum')}</h2>
            </div>
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-4xl font-bold text-momentum-500">{avgMomentum}</p>
                  <p className="text-sm text-slate-500">{t('manager.avgScore', 'avg score')}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">+3 {t('manager.thisMonth', 'this month')}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {teamMembers.length > 0 ? teamMembers.slice(0, 4).map(member => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs">
                      {member.name?.split(' ')[0]?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">{member.name?.split(' ')[0] || 'Employee'}</span>
                        <span className="text-xs font-medium text-slate-900">{member.momentum || 0}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-momentum-500 rounded-full" style={{ width: `${member.momentum || 0}%` }} />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 text-center">{t('manager.noTeamData', 'No team members to display')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WORKER DASHBOARD
// ============================================================

function WorkerDashboard({ t, user, showTipsModal, setShowTipsModal }) {
  const [scoreAnimated, setScoreAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setScoreAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Time-of-day greeting
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const GreetingIcon = hour < 12 ? Sun : hour < 18 ? Sunset : Moon;
  const greetingText = {
    morning: t('workerDash.goodMorning', 'Good morning'),
    afternoon: t('workerDash.goodAfternoon', 'Good afternoon'),
    evening: t('workerDash.goodEvening', 'Good evening'),
  }[greetingKey];

  const firstName = user?.firstName || 'Maria';

  // Demo data for Maria Santos
  const momentumScore = 82;
  const momentumComponents = [
    { label: t('workerDash.momentum.attendance', 'Attendance'), value: 88, weight: 30 },
    { label: t('workerDash.momentum.skills', 'Skills'), value: 75, weight: 25 },
    { label: t('workerDash.momentum.performance', 'Performance'), value: 85, weight: 25 },
    { label: t('workerDash.momentum.engagement', 'Engagement'), value: 80, weight: 20 },
  ];

  const announcements = [
    {
      id: 1,
      title: t('workerDash.announcement1.title', 'Q1 Town Hall - February 15th'),
      body: t('workerDash.announcement1.body', 'All-hands meeting at 14:00 in the Grand Ballroom. Remote link will be shared.'),
      date: t('workerDash.announcement1.date', '3 Feb 2026'),
      color: 'blue',
    },
    {
      id: 2,
      title: t('workerDash.announcement2.title', 'New uniform policy effective March 1st'),
      body: t('workerDash.announcement2.body', 'Updated guidelines for front-of-house uniforms. Please collect new items from HR.'),
      date: t('workerDash.announcement2.date', '1 Feb 2026'),
      color: 'amber',
    },
    {
      id: 3,
      title: t('workerDash.announcement3.title', 'Employee of the Month nominations open'),
      body: t('workerDash.announcement3.body', 'Nominate a colleague who went above and beyond. Deadline: February 28th.'),
      date: t('workerDash.announcement3.date', '30 Jan 2026'),
      color: 'green',
    },
  ];

  const goals = [
    { id: 1, label: t('workerDash.goal1', 'Complete GDPR refresher training'), percent: 80 },
    { id: 2, label: t('workerDash.goal2', 'Achieve 90% guest satisfaction rating'), percent: 65 },
    { id: 3, label: t('workerDash.goal3', 'Complete Wine Service certification'), percent: 30 },
  ];

  const badges = [
    { icon: Trophy, name: t('workerDash.badge.perfectAttendance', 'Perfect Attendance'), desc: t('workerDash.badge.perfectAttendanceDesc', '30 days streak'), earned: true },
    { icon: GraduationCap, name: t('workerDash.badge.fastLearner', 'Fast Learner'), desc: t('workerDash.badge.fastLearnerDesc', '5 courses completed'), earned: true },
    { icon: Star, name: t('workerDash.badge.guestFavourite', 'Guest Favourite'), desc: t('workerDash.badge.guestFavouriteDesc', '10 guest mentions'), earned: true },
    { icon: HeartHandshake, name: t('workerDash.badge.teamPlayer', 'Team Player'), desc: t('workerDash.badge.teamPlayerDesc', '5 peer recognitions'), earned: false, unlockHint: t('workerDash.badge.teamPlayerHint', 'Receive 2 more peer recognitions to unlock') },
    { icon: Target, name: t('workerDash.badge.goalCrusher', 'Goal Crusher'), desc: t('workerDash.badge.goalCrusherDesc', 'All Q4 goals met'), earned: false, unlockHint: t('workerDash.badge.goalCrusherHint', 'Complete all quarterly goals to unlock') },
    { icon: Flame, name: t('workerDash.badge.onFire', 'On Fire'), desc: t('workerDash.badge.onFireDesc', '90+ for 3 months'), earned: false, unlockHint: t('workerDash.badge.onFireHint', 'Maintain 90+ Momentum for 3 consecutive months') },
  ];

  const recognitionFeed = [
    {
      id: 1,
      from: 'James Williams',
      fromInitials: 'JW',
      category: t('workerDash.recognition.greatWork', 'Great Work'),
      message: t('workerDash.recognition1', 'Handled VIP check-in perfectly'),
      time: t('workerDash.recognition1Time', '2 hours ago'),
      received: true,
    },
    {
      id: 2,
      from: 'Aiko Yamamoto',
      fromInitials: 'AY',
      category: t('workerDash.recognition.teamwork', 'Teamwork'),
      message: t('workerDash.recognition2', 'Covered the lobby during the rush without being asked'),
      time: t('workerDash.recognition2Time', 'Yesterday'),
      received: true,
    },
    {
      id: 3,
      from: 'You',
      fromInitials: 'MS',
      to: 'Pierre Dubois',
      category: t('workerDash.recognition.aboveAndBeyond', 'Above & Beyond'),
      message: t('workerDash.recognition3', 'Stayed late to help with event setup'),
      time: t('workerDash.recognition3Time', '3 days ago'),
      received: false,
    },
  ];

  const celebrations = [
    {
      id: 1,
      type: 'birthday',
      icon: Gift,
      name: 'Pierre Dubois',
      detail: t('workerDash.celebration.birthday', 'Turns 30 on Thursday'),
      bg: 'bg-pink-50',
      iconColor: 'text-pink-500',
    },
    {
      id: 2,
      type: 'anniversary',
      icon: Award,
      name: 'Aiko Yamamoto',
      detail: t('workerDash.celebration.anniversary', '5 year work anniversary'),
      bg: 'bg-momentum-50',
      iconColor: 'text-momentum-500',
    },
    {
      id: 3,
      type: 'new-member',
      icon: UserPlus,
      name: 'Raj Patel',
      detail: t('workerDash.celebration.newMember', 'New Night Auditor - say hello!'),
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
  ];

  // SVG ring calculations
  const RING_RADIUS = 70;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const ringOffset = RING_CIRCUMFERENCE - (momentumScore / 100) * RING_CIRCUMFERENCE;

  const colorBarClasses = [
    'bg-green-500',
    'bg-blue-500',
    'bg-momentum-500',
    'bg-purple-500',
  ];

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. WELCOME BANNER */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-br from-momentum-500 via-momentum-600 to-momentum-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Hand className="w-7 h-7 text-white/90" />
            <h1 className="text-2xl md:text-3xl font-bold">{greetingText}, {firstName}</h1>
          </div>
          <p className="text-white/80 text-sm mb-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-white/70" />
            <p className="text-white/70 text-sm">
              {t('workerDash.shiftToday', "You're on the 07:00 - 15:00 shift today")}
            </p>
          </div>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <Link to="/time-tracking" className="flex items-center gap-3 px-4 py-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/25 transition-colors">
              <Clock className="w-5 h-5 text-white" />
              <span className="text-sm font-medium text-white">{t('workerDash.action.clockIn', 'Clock In')}</span>
            </Link>
            <Link to="/time-off" className="flex items-center gap-3 px-4 py-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/25 transition-colors">
              <CalendarOff className="w-5 h-5 text-white" />
              <span className="text-sm font-medium text-white">{t('workerDash.action.requestTimeOff', 'Request Time Off')}</span>
            </Link>
            <Link to="/expenses" className="flex items-center gap-3 px-4 py-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/25 transition-colors">
              <Receipt className="w-5 h-5 text-white" />
              <span className="text-sm font-medium text-white">{t('workerDash.action.submitExpense', 'Submit Expense')}</span>
            </Link>
            <Link to="/compensation" className="flex items-center gap-3 px-4 py-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/25 transition-colors">
              <FileText className="w-5 h-5 text-white" />
              <span className="text-sm font-medium text-white">{t('workerDash.action.viewPayslip', 'View Payslip')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TWO-COLUMN LAYOUT */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN (wider: 3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* ------------------------------------------------ */}
          {/* MOMENTUM SCORE RING */}
          {/* ------------------------------------------------ */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-momentum-500" />
                <h2 className="font-semibold text-slate-900">{t('workerDash.momentumScore', 'Momentum Score')}</h2>
              </div>
              <button
                onClick={() => setShowTipsModal(true)}
                className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1"
              >
                <Info className="w-4 h-4" />
                {t('workerDash.howCalculated', 'How is this calculated?')}
              </button>
            </div>
            <div className="card-body">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Ring */}
                <div className="relative shrink-0">
                  <svg className="w-44 h-44" viewBox="0 0 160 160">
                    <defs>
                      <linearGradient id="momentumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF6B35" />
                        <stop offset="100%" stopColor="#FF8C5A" />
                      </linearGradient>
                    </defs>
                    <circle cx="80" cy="80" r={RING_RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle
                      cx="80" cy="80" r={RING_RADIUS}
                      fill="none"
                      stroke="url(#momentumGradient)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={scoreAnimated ? ringOffset : RING_CIRCUMFERENCE}
                      transform="rotate(-90 80 80)"
                      style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-slate-900">{momentumScore}</span>
                    <span className="text-xs text-slate-500">{t('workerDash.outOf100', 'out of 100')}</span>
                  </div>
                </div>

                {/* Component Breakdown */}
                <div className="flex-1 w-full space-y-3">
                  {momentumComponents.map((comp, i) => (
                    <div key={comp.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">{comp.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{comp.weight}% {t('workerDash.weight', 'weight')}</span>
                          <span className="text-sm font-semibold text-slate-900">{comp.value}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colorBarClasses[i]} transition-all duration-1000`}
                          style={{ width: scoreAnimated ? `${comp.value}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Trend */}
                  <div className="flex items-center gap-2 pt-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">
                      {t('workerDash.trendUp', '3 points from last month')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* ANNOUNCEMENTS */}
          {/* ------------------------------------------------ */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-slate-900">{t('workerDash.announcements', 'Announcements')}</h2>
              </div>
              <Link to="/announcements" className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1">
                {t('common.viewMore', 'View all')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="card-body space-y-3">
              {announcements.map((ann) => {
                const borderColors = { blue: 'border-blue-400', amber: 'border-amber-400', green: 'border-green-400' };
                const bgColors = { blue: 'bg-blue-50', amber: 'bg-amber-50', green: 'bg-green-50' };
                return (
                  <div key={ann.id} className={`p-4 rounded-lg border-l-4 ${borderColors[ann.color]} ${bgColors[ann.color]}`}>
                    <p className="text-sm font-medium text-slate-900">{ann.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{ann.body}</p>
                    <p className="text-xs text-slate-400 mt-2">{ann.date}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* MY GOALS PROGRESS */}
          {/* ------------------------------------------------ */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-momentum-500" />
                <h2 className="font-semibold text-slate-900">{t('workerDash.myGoals', 'My Goals Progress')}</h2>
              </div>
              <Link to="/career" className="text-sm text-momentum-500 hover:text-momentum-600 flex items-center gap-1">
                {t('workerDash.viewAllGoals', 'View all goals')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="card-body space-y-5">
              {goals.map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-slate-700">{goal.label}</p>
                    <span className="text-sm font-semibold text-momentum-600">{goal.percent}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-momentum-400 to-momentum-600 rounded-full transition-all duration-1000"
                      style={{ width: scoreAnimated ? `${goal.percent}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* ------------------------------------------------ */}
          {/* ACHIEVEMENT BADGES */}
          {/* ------------------------------------------------ */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-momentum-500" />
                <h2 className="font-semibold text-slate-900">{t('workerDash.achievements', 'Achievement Badges')}</h2>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {badges.map((badge) => {
                  const BadgeIcon = badge.icon;
                  if (badge.earned) {
                    return (
                      <div
                        key={badge.name}
                        className="flex flex-col items-center p-3 bg-gradient-to-b from-momentum-50 to-momentum-100 rounded-xl border border-momentum-200"
                      >
                        <div className="w-12 h-12 rounded-full bg-momentum-500 flex items-center justify-center mb-2">
                          <BadgeIcon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-momentum-700 text-center">{badge.name}</span>
                        <span className="text-[10px] text-momentum-500 text-center mt-0.5">{badge.desc}</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={badge.name}
                      className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-slate-200 group relative"
                      title={badge.unlockHint}
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-2 relative">
                        <BadgeIcon className="w-6 h-6 text-slate-400" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center">
                          <Lock className="w-3 h-3 text-slate-500" />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 text-center">{badge.name}</span>
                      <span className="text-[10px] text-slate-400 text-center mt-0.5">{badge.desc}</span>
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                        {badge.unlockHint}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* MY STATS (2x2 grid) */}
          {/* ------------------------------------------------ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-slate-900">{t('workerDash.stat.leaveDays', '18 days')}</p>
              <p className="text-xs text-slate-500">{t('workerDash.stat.leaveRemaining', 'Leave remaining')}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-slate-900">{t('workerDash.stat.coursesDue', '2 courses')}</p>
              <p className="text-xs text-slate-500">{t('workerDash.stat.trainingDue', 'Training due')}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-slate-900">{t('workerDash.stat.expenseAmount', '\u00A3145.50')}</p>
              <p className="text-xs text-slate-500">{t('workerDash.stat.expensePending', 'Expenses pending')}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-slate-900">{t('workerDash.stat.goalsProgress', '3 of 5')}</p>
              <p className="text-xs text-slate-500">{t('workerDash.stat.goalsCompleted', 'Goals completed')}</p>
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* RECOGNITION FEED */}
          {/* ------------------------------------------------ */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <h2 className="font-semibold text-slate-900">{t('workerDash.recognitionFeed', 'Recognition')}</h2>
              </div>
              <Link to="/recognition" className="text-sm text-momentum-500 hover:text-momentum-600">
                {t('common.viewMore', 'View all')}
              </Link>
            </div>
            <div className="card-body space-y-3">
              {recognitionFeed.map((rec) => (
                <div key={rec.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs shrink-0">
                    {rec.fromInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">{rec.from}</span>
                      {rec.received
                        ? ` ${t('workerDash.recognition.gaveYou', 'gave you')}`
                        : ` ${t('workerDash.recognition.youGave', 'you gave')} ${rec.to}`
                      }
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-medium text-amber-700">{rec.category}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{rec.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{rec.time}</p>
                  </div>
                </div>
              ))}
              <Link
                to="/recognition"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-momentum-50 text-momentum-600 rounded-lg hover:bg-momentum-100 transition-colors text-sm font-medium"
              >
                <Heart className="w-4 h-4" />
                {t('workerDash.giveRecognition', 'Give Recognition')}
              </Link>
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* TEAM CELEBRATIONS */}
          {/* ------------------------------------------------ */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Gift className="w-5 h-5 text-momentum-500" />
              <h2 className="font-semibold text-slate-900">{t('workerDash.teamCelebrations', 'Team Celebrations')}</h2>
            </div>
            <div className="card-body space-y-3">
              {celebrations.map((item) => {
                const CelebIcon = item.icon;
                return (
                  <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg ${item.bg}`}>
                    <CelebIcon className={`w-5 h-5 ${item.iconColor} shrink-0`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. TIPS MODAL */}
      {/* ============================================================ */}
      {showTipsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTipsModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-momentum-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-momentum-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-momentum-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{t('workerDash.tips.title', 'How Your Momentum Score Works')}</h2>
                  <p className="text-sm text-slate-500">{t('workerDash.tips.subtitle', 'Understand each component and how to improve')}</p>
                </div>
              </div>
              <button onClick={() => setShowTipsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
              {/* Attendance */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{t('workerDash.tips.attendance', 'Attendance')} (30%)</h3>
                    <p className="text-xs text-slate-500">{t('workerDash.tips.attendanceDesc', 'Measures punctuality and shift completion')}</p>
                  </div>
                </div>
                <ul className="ml-10 space-y-1.5">
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.attendance1', 'Clock in on time consistently to maintain a high attendance score')}
                  </li>
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.attendance2', 'Request time off in advance instead of calling in sick')}
                  </li>
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.attendance3', 'Picking up extra shifts positively impacts this score')}
                  </li>
                </ul>
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{t('workerDash.tips.skills', 'Skills')} (25%)</h3>
                    <p className="text-xs text-slate-500">{t('workerDash.tips.skillsDesc', 'Training completion and certifications')}</p>
                  </div>
                </div>
                <ul className="ml-10 space-y-1.5">
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.skills1', 'Complete required training courses before their deadlines')}
                  </li>
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.skills2', 'Renew expiring certifications at least 2 weeks early')}
                  </li>
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.skills3', 'Taking optional courses earns bonus points')}
                  </li>
                </ul>
              </div>

              {/* Performance */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-momentum-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-momentum-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{t('workerDash.tips.performance', 'Performance')} (25%)</h3>
                    <p className="text-xs text-slate-500">{t('workerDash.tips.performanceDesc', 'Guest feedback and manager reviews')}</p>
                  </div>
                </div>
                <ul className="ml-10 space-y-1.5">
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-momentum-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.performance1', 'Positive guest feedback directly boosts your performance score')}
                  </li>
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-momentum-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.performance2', 'Completing goals on time shows strong performance')}
                  </li>
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-momentum-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.performance3', 'Ask your manager for regular feedback to stay on track')}
                  </li>
                </ul>
              </div>

              {/* Engagement */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{t('workerDash.tips.engagement', 'Engagement')} (20%)</h3>
                    <p className="text-xs text-slate-500">{t('workerDash.tips.engagementDesc', 'Team participation and recognition')}</p>
                  </div>
                </div>
                <ul className="ml-10 space-y-1.5">
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.engagement1', 'Give recognition to colleagues to boost your engagement score')}
                  </li>
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.engagement2', 'Participate in team events and company activities')}
                  </li>
                  <li className="text-sm text-slate-600 flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    {t('workerDash.tips.engagement3', 'Help onboard new team members to show leadership')}
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-slate-50">
              <button onClick={() => setShowTipsModal(false)} className="btn btn-primary w-full">
                {t('workerDash.tips.gotIt', 'Got it, thanks!')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PERSONAL DASHBOARD — "My View" for Admins and Managers
// Same personal employee experience as Workers
// ============================================================

function PersonalDashboard({ t, user, showTipsModal, setShowTipsModal }) {
  const [scoreAnimated, setScoreAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setScoreAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const firstName = user?.firstName || 'Sarah';

  // Demo personal data
  const momentumScore = 85;
  const leaveBalance = 22;
  const nextShift = user?.role === 'admin' ? null : 'Tomorrow, 09:00 - 17:00'; // Admins typically don't have shifts
  const trainingCompleted = 8;
  const trainingTotal = 10;
  const trainingCompliancePercent = Math.round((trainingCompleted / trainingTotal) * 100);

  // Personal action items
  const personalActions = [
    { id: 1, type: 'expense', label: t('personal.pendingExpenses', 'Pending expense claims'), count: 2, amount: '£245.00', href: '/expenses' },
    { id: 2, type: 'training', label: t('personal.overdueTraining', 'Overdue training courses'), count: 1, urgency: 'warning', href: '/learning' },
    { id: 3, type: 'review', label: t('personal.upcomingReview', 'Upcoming performance review'), date: '15 Feb 2026', with: 'James Chen', href: '/performance' },
    { id: 4, type: 'recognition', label: t('personal.unreadRecognition', 'Unread recognition'), count: 3, href: '/recognition' },
  ];

  // Personal activity feed
  const activityFeed = [
    { id: 1, type: 'recognition', message: t('personal.activity.recognition', 'You received recognition from Emma Watson'), time: '2 hours ago', icon: Heart },
    { id: 2, type: 'training', message: t('personal.activity.trainingCompleted', 'Completed GDPR Refresher Course'), time: 'Yesterday', icon: GraduationCap },
    { id: 3, type: 'payslip', message: t('personal.activity.payslipAvailable', 'January 2026 payslip is available'), time: '3 days ago', icon: FileText },
    { id: 4, type: 'document', message: t('personal.activity.documentUploaded', 'HR uploaded updated employment contract'), time: '1 week ago', icon: FileText },
  ];

  // SVG ring calculations
  const RING_RADIUS = 54;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const ringOffset = RING_CIRCUMFERENCE - (momentumScore / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t('personal.welcome', 'Welcome')}, {firstName}
        </h1>
        <p className="text-slate-600">
          {t('personal.subtitle', 'Your personal dashboard and employee self-service')}
        </p>
      </div>

      {/* Top row — personal status cards (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Momentum Score Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">{t('personal.myMomentum', 'My Momentum')}</p>
              <p className="text-3xl font-bold text-momentum-500">{momentumScore}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">{t('personal.top15', 'Top 15% in your team')}</span>
              </div>
            </div>
            <div className="relative">
              <svg className="w-16 h-16" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r={RING_RADIUS}
                  fill="none"
                  stroke="#F26522"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={scoreAnimated ? ringOffset : RING_CIRCUMFERENCE}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <Zap className="w-6 h-6 text-momentum-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Leave Balance Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Palmtree className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t('personal.leaveBalance', 'Leave Balance')}</p>
              <p className="text-2xl font-bold text-slate-900">{leaveBalance} {t('personal.days', 'days')}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t('personal.nextLeave', 'Next booked')}: 20-24 Mar</p>
        </div>

        {/* Next Shift Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t('personal.nextShift', 'Next Shift')}</p>
              {nextShift ? (
                <p className="text-lg font-semibold text-slate-900">{nextShift}</p>
              ) : (
                <p className="text-sm text-slate-400">{t('personal.noShiftsScheduled', 'No shifts scheduled')}</p>
              )}
            </div>
          </div>
          {nextShift && (
            <Link to="/schedule" className="text-xs text-momentum-500 hover:text-momentum-600">
              {t('personal.viewSchedule', 'View full schedule')}
            </Link>
          )}
        </div>

        {/* Training Status Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t('personal.myTraining', 'My Training')}</p>
              <p className="text-lg font-semibold text-slate-900">{trainingCompleted}/{trainingTotal} {t('personal.complete', 'complete')}</p>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-1000"
              style={{ width: scoreAnimated ? `${trainingCompliancePercent}%` : '0%' }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{t('personal.nextDue', 'Next due')}: Fire Safety (7 days)</p>
        </div>
      </div>

      {/* Second row — personal action items */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">{t('personal.actionItems', 'Action Items')}</h2>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {personalActions.map((action) => (
              <Link
                key={action.id}
                to={action.href}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  action.type === 'expense' ? 'bg-purple-100 text-purple-600' :
                  action.type === 'training' ? 'bg-amber-100 text-amber-600' :
                  action.type === 'review' ? 'bg-blue-100 text-blue-600' :
                  'bg-pink-100 text-pink-600'
                }`}>
                  {action.type === 'expense' && <Receipt className="w-5 h-5" />}
                  {action.type === 'training' && <GraduationCap className="w-5 h-5" />}
                  {action.type === 'review' && <Target className="w-5 h-5" />}
                  {action.type === 'recognition' && <Heart className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{action.label}</p>
                  {action.count && (
                    <p className="text-xs text-slate-500">{action.count} {action.amount ? `(${action.amount})` : ''}</p>
                  )}
                  {action.date && (
                    <p className="text-xs text-slate-500">{action.date} {action.with ? `with ${action.with}` : ''}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Third row — Two columns: Quick links + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Links */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">{t('personal.quickLinks', 'Quick Links')}</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/career" className="flex flex-col items-center gap-2 p-4 bg-momentum-50 rounded-xl hover:bg-momentum-100 transition-colors">
                <TrendingUp className="w-6 h-6 text-momentum-600" />
                <span className="text-sm font-medium text-momentum-700">{t('personal.myCareer', 'My Career')}</span>
              </Link>
              <Link to="/compensation" className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                <Wallet className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium text-green-700">{t('personal.myPayslips', 'My Payslips')}</span>
              </Link>
              <Link to="/documents" className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <FileText className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{t('personal.myDocuments', 'My Documents')}</span>
              </Link>
              <Link to="/momentum" className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
                <Gauge className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">{t('personal.momentumBreakdown', 'Momentum Breakdown')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-momentum-500" />
              <h2 className="font-semibold text-slate-900">{t('personal.recentActivity', 'Recent Activity')}</h2>
            </div>
          </div>
          <div className="card-body space-y-3">
            {activityFeed.map((activity) => {
              const ActivityIcon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    activity.type === 'recognition' ? 'bg-pink-100 text-pink-600' :
                    activity.type === 'training' ? 'bg-green-100 text-green-600' :
                    activity.type === 'payslip' ? 'bg-blue-100 text-blue-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    <ActivityIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{activity.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHARED SUB-COMPONENTS
// ============================================================

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
    momentum: 'bg-momentum-50 text-momentum-600',
    red: 'bg-red-50 text-red-600',
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
