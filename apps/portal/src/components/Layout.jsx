// ============================================================
// LAYOUT COMPONENT
// Three completely distinct management navigation experiences:
// - Admin: The Control Tower (configure, analyse, plan)
// - Manager: The Operations Cockpit (schedule, approve, coach)
// - Worker: My Work Life (my schedule, my growth, my money)
// Plus: "My View" personal experience for Admins and Managers
// ============================================================

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useBranding } from '../lib/branding';
import { useEntity } from '../lib/entityContext';
import { useView } from '../lib/viewContext';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage } from '../i18n';
import RoleSwitcher from './RoleSwitcher';
import OfflineBanner from './OfflineBanner';
import AIChatWidget from './AIChatWidget';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  MapPin,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Award,
  Briefcase,
  TrendingUp,
  Copy,
  UserPlus,
  UserMinus,
  Upload,
  Plug,
  Globe,
  Target,
  GraduationCap,
  Wallet,
  Receipt,
  MessageSquare,
  FileText,
  Heart,
  Zap,
  Home,
  DollarSign,
  Check,
  Activity,
  BookOpen,
  Palmtree,
  User,
  Gauge,
  Banknote,
  CreditCard,
} from 'lucide-react';

// Small coloured dot for location indicators
function LocationDot({ color, size = 10 }) {
  return (
    <span
      className="inline-block rounded-sm flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

// ============================================================
// FOUR NAVIGATION STRUCTURES
// ============================================================

// ADMIN NAVIGATION — The Control Tower
// Configure, analyse, plan. Looks at the big picture.
// NOTE: Career removed from Talent section — it's personal, not org-wide
const getAdminNav = (t) => [
  {
    section: t('nav.section.overview', 'OVERVIEW'),
    items: [
      { path: '/', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    ],
  },
  {
    section: t('nav.section.people', 'PEOPLE'),
    items: [
      { path: '/employees', label: t('nav.employees', 'Employees'), icon: Users },
      { path: '/directory', label: t('nav.directory', 'Directory'), icon: BookOpen },
      { path: '/onboarding', label: t('nav.onboarding', 'Onboarding'), icon: UserPlus },
      { path: '/offboarding', label: t('nav.offboarding', 'Offboarding'), icon: UserMinus },
    ],
  },
  {
    section: t('nav.section.talent', 'TALENT'),
    items: [
      { path: '/performance', label: t('nav.performance', 'Performance'), icon: Target },
      { path: '/learning', label: t('nav.learning', 'Learning'), icon: GraduationCap },
      { path: '/skills', label: t('nav.skills', 'Skills Matrix'), icon: Award },
      { path: '/surveys', label: t('nav.surveys', 'Surveys'), icon: MessageSquare },
    ],
  },
  {
    section: t('nav.section.operations', 'OPERATIONS'),
    items: [
      { path: '/schedule', label: t('nav.schedule', 'Schedule'), icon: Calendar },
      { path: '/shift-templates', label: t('nav.shiftTemplates', 'Shift Templates'), icon: Copy },
      { path: '/time-tracking', label: t('nav.timeTracking', 'Time Tracking'), icon: Clock },
      { path: '/time-off', label: t('nav.timeOff', 'Time Off'), icon: Palmtree },
      { path: '/expenses', label: t('nav.expenses', 'Expenses'), icon: Receipt },
      { path: '/corporate-cards', label: t('nav.corporateCards', 'Corporate Cards'), icon: CreditCard },
      { path: '/documents', label: t('nav.documents', 'Documents'), icon: FileText },
      { path: '/compensation', label: t('nav.compensation', 'Compensation'), icon: DollarSign },
    ],
  },
  {
    section: t('nav.section.payroll', 'PAYROLL'),
    items: [
      { path: '/payroll/runs', label: t('nav.payrollRuns', 'Payroll Runs'), icon: Calendar },
      { path: '/payroll/config', label: t('nav.payrollConfig', 'Configuration'), icon: Settings },
    ],
  },
  {
    section: t('nav.section.analytics', 'ANALYTICS'),
    items: [
      { path: '/reports', label: t('nav.reports', 'Reports'), icon: BarChart3 },
      { path: '/activity', label: t('nav.activity', 'Activity Log'), icon: Activity },
    ],
  },
  {
    section: t('nav.section.settings', 'SETTINGS'),
    items: [
      { path: '/settings', label: t('nav.settings', 'Settings'), icon: Settings },
      { path: '/integrations', label: t('nav.integrations', 'Integrations'), icon: Plug },
      { path: '/locations', label: t('nav.locations', 'Locations'), icon: MapPin },
      { path: '/jobs', label: t('nav.jobs', 'Job Postings'), icon: Briefcase },
      { path: '/bulk-import', label: t('nav.bulkImport', 'Bulk Import'), icon: Upload },
    ],
  },
];

// MANAGER NAVIGATION — The Operations Cockpit
// Schedule, approve, coach, execute. Lives in the platform making real-time decisions.
const getManagerNav = (t) => [
  {
    section: t('nav.section.overview', 'OVERVIEW'),
    items: [
      { path: '/', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    ],
  },
  {
    section: t('nav.section.myTeam', 'MY TEAM'),
    items: [
      { path: '/employees', label: t('nav.teamRoster', 'Team Roster'), icon: Users },
      { path: '/schedule', label: t('nav.schedule', 'Schedule'), icon: Calendar },
      { path: '/shift-templates', label: t('nav.shiftTemplates', 'Shift Templates'), icon: Copy },
      { path: '/time-tracking', label: t('nav.timeApprovals', 'Time Approvals'), icon: Clock },
      { path: '/time-off', label: t('nav.leaveApprovals', 'Leave Approvals'), icon: Palmtree },
      { path: '/expenses', label: t('nav.expenseApprovals', 'Expense Approvals'), icon: Receipt },
      { path: '/corporate-cards', label: t('nav.corporateCards', 'Corporate Cards'), icon: CreditCard },
    ],
  },
  {
    section: t('nav.section.talent', 'TALENT'),
    items: [
      { path: '/performance', label: t('nav.teamPerformance', 'Team Performance'), icon: Target },
      { path: '/learning', label: t('nav.teamCompliance', 'Team Compliance'), icon: GraduationCap },
      { path: '/skills', label: t('nav.skillsMatrix', 'Skills Matrix'), icon: Award },
    ],
  },
  {
    section: t('nav.section.resources', 'RESOURCES'),
    items: [
      { path: '/documents', label: t('nav.documents', 'Documents'), icon: FileText },
      { path: '/directory', label: t('nav.directory', 'Directory'), icon: BookOpen },
      { path: '/reports', label: t('nav.teamReports', 'Team Reports'), icon: BarChart3 },
      { path: '/payroll/team', label: t('nav.teamPayroll', 'Team Payroll'), icon: Banknote },
    ],
  },
];

// WORKER NAVIGATION — My Work Life
// My schedule, my growth, my money. Personal and warm.
const getWorkerNav = (t) => [
  {
    section: t('nav.section.myUplift', 'MY UPLIFT'),
    items: [
      { path: '/', label: t('nav.home', 'Home'), icon: Home },
      { path: '/momentum', label: t('nav.momentumScore', 'Momentum Score'), icon: Zap },
      { path: '/recognition', label: t('nav.recognition', 'Recognition'), icon: Heart },
    ],
  },
  {
    section: t('nav.section.myWork', 'MY WORK'),
    items: [
      { path: '/schedule', label: t('nav.mySchedule', 'My Schedule'), icon: Calendar },
      { path: '/time-tracking', label: t('nav.myHours', 'My Hours'), icon: Clock },
      { path: '/time-off', label: t('nav.myTimeOff', 'My Time Off'), icon: Palmtree },
    ],
  },
  {
    section: t('nav.section.myGrowth', 'MY GROWTH'),
    items: [
      { path: '/performance', label: t('nav.myPerformance', 'My Performance'), icon: Target },
      { path: '/learning', label: t('nav.myCourses', 'My Courses'), icon: GraduationCap },
      { path: '/career', label: t('nav.careerPaths', 'Career Paths'), icon: TrendingUp },
    ],
  },
  {
    section: t('nav.section.myMoney', 'MY MONEY'),
    items: [
      { path: '/payroll/my-payslips', label: t('nav.myPayslips', 'My Payslips'), icon: FileText },
      { path: '/expenses', label: t('nav.myExpenses', 'My Expenses'), icon: Receipt },
      { path: '/corporate-cards', label: t('nav.myCards', 'My Cards'), icon: CreditCard },
    ],
  },
  {
    section: t('nav.section.myStuff', 'MY STUFF'),
    items: [
      { path: '/documents', label: t('nav.myDocuments', 'My Documents'), icon: FileText },
      { path: '/directory', label: t('nav.directory', 'Directory'), icon: BookOpen },
    ],
  },
];

// PERSONAL NAVIGATION — "My View" for Admins and Managers
// Same as Worker nav but with clearer personal labels
const getPersonalNav = (t) => [
  {
    section: t('nav.section.myView', 'MY VIEW'),
    items: [
      { path: '/', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    ],
  },
  {
    section: t('nav.section.myCareer', 'MY CAREER'),
    items: [
      { path: '/career', label: t('nav.myCareer', 'My Career'), icon: TrendingUp },
      { path: '/momentum', label: t('nav.myMomentum', 'My Momentum'), icon: Gauge },
      { path: '/recognition', label: t('nav.myRecognition', 'My Recognition'), icon: Award },
    ],
  },
  {
    section: t('nav.section.myWork', 'MY WORK'),
    items: [
      { path: '/schedule', label: t('nav.mySchedule', 'My Schedule'), icon: Calendar },
      { path: '/time-off', label: t('nav.myTimeOff', 'My Time Off'), icon: Palmtree },
    ],
  },
  {
    section: t('nav.section.myMoney', 'MY MONEY'),
    items: [
      { path: '/payroll/my-payslips', label: t('nav.myPayslips', 'My Payslips'), icon: FileText },
      { path: '/expenses', label: t('nav.myExpenses', 'My Expenses'), icon: Receipt },
      { path: '/corporate-cards', label: t('nav.myCards', 'My Cards'), icon: CreditCard },
    ],
  },
  {
    section: t('nav.section.myGrowth', 'MY GROWTH'),
    items: [
      { path: '/learning', label: t('nav.myTraining', 'My Training'), icon: GraduationCap },
      { path: '/performance', label: t('nav.myPerformance', 'My Performance'), icon: Target },
    ],
  },
  {
    section: t('nav.section.myStuff', 'MY STUFF'),
    items: [
      { path: '/documents', label: t('nav.myDocuments', 'My Documents'), icon: FileText },
      { path: '/settings/notifications', label: t('nav.myProfile', 'My Profile'), icon: User },
      { path: '/directory', label: t('nav.directory', 'Directory'), icon: BookOpen },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { branding = {} } = useBranding() || {};
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [entityMenuOpen, setEntityMenuOpen] = useState(false);
  const { selectedLocation, setSelectedLocation, locations } = useEntity();
  const { isPersonalView, showSwitcher } = useView();

  // ============================================================
  // ROLE DETECTION — bulletproof
  // ============================================================
  const role = user?.role || 'worker';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isManager = role === 'manager';
  const isWorker = !isAdmin && !isManager;

  // ============================================================
  // NAVIGATION SELECTION
  // When in "My View", show personal nav regardless of role
  // ============================================================
  let navSections;
  if (isPersonalView && !isWorker) {
    // Admin or Manager in "My View" — show personal navigation
    navSections = getPersonalNav(t);
  } else if (isAdmin) {
    navSections = getAdminNav(t);
  } else if (isManager) {
    navSections = getManagerNav(t);
  } else {
    // Worker — always personal view
    navSections = getWorkerNav(t);
  }

  // Entity selector: Admin can switch, others see their fixed location
  const canSwitchLocation = isAdmin && !isPersonalView;
  const userLocation = canSwitchLocation
    ? selectedLocation
    : locations.find((l) => l.id === 'london') || locations[1];

  // Sidebar header content changes based on view
  const sidebarTitle = isPersonalView && !isWorker
    ? `${user?.firstName}'s Portal`
    : branding?.brand_name || t('brand.defaultName', 'Your Company');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Offline banner */}
      <OfflineBanner />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform duration-200
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        {/* Logo / Personal header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            {isPersonalView && !isWorker ? (
              // Personal view: show user avatar
              <>
                <div className="w-8 h-8 bg-momentum-500 text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <span className="text-white font-semibold text-sm truncate">
                  {sidebarTitle}
                </span>
              </>
            ) : (
              // Management view: show company branding
              <>
                {branding?.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt={branding?.brand_name || 'Logo'}
                    className="h-8 w-auto max-w-[140px] object-contain"
                  />
                ) : (
                  <img src="/logo.svg" alt="Uplift" className="w-8 h-8" />
                )}
                <span className="text-white font-semibold text-sm leading-tight truncate">
                  {sidebarTitle}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation — with smooth transition */}
        <nav
          key={isPersonalView ? 'personal' : 'management'}
          className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)] animate-fade-in"
        >
          {navSections.map((section) => (
            <div key={section.section}>
              <p className="px-3 mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {section.section}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'bg-momentum-500 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t('auth.logout', 'Log Out')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header
          className={`
            h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6 transition-colors duration-150
            ${isPersonalView && showSwitcher ? 'border-momentum-500 border-b-2' : 'border-slate-200'}
          `}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1" />

          {/* Entity / Location Selector — only show in management view */}
          {!isPersonalView && (
            <div className="relative mr-1">
              {canSwitchLocation ? (
                <>
                  {/* Admin: clickable dropdown */}
                  <button
                    onClick={() => setEntityMenuOpen(!entityMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                  >
                    <LocationDot color={selectedLocation?.color || '#6366f1'} size={10} />
                    <span className="hidden md:block font-medium truncate max-w-[180px]">
                      {selectedLocation?.name || 'Location'}
                      {selectedLocation?.code && selectedLocation.code !== 'ALL' && (
                        <span className="text-slate-400 ml-1">[{selectedLocation.code}]</span>
                      )}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {entityMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setEntityMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                        <div className="px-3 py-2 border-b border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 uppercase">
                            {t('entity.selectLocation', 'Select Location')}
                          </p>
                        </div>
                        {locations.map((location) => (
                          <button
                            key={location?.id || Math.random()}
                            onClick={() => {
                              setSelectedLocation(location?.id);
                              setEntityMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${
                              selectedLocation?.id === location?.id ? 'bg-momentum-50' : ''
                            }`}
                          >
                            <LocationDot color={location?.color || '#6366f1'} size={12} />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-medium truncate ${
                                  selectedLocation?.id === location?.id
                                    ? 'text-momentum-600'
                                    : 'text-slate-700'
                                }`}
                              >
                                {location?.name || 'Location'}
                                {location?.code && location.code !== 'ALL' && (
                                  <span className="text-slate-400 font-normal ml-1">
                                    ({location.code})
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {location?.tag && (
                                  <span className="inline-block mr-1.5 px-1.5 py-0 bg-momentum-100 text-momentum-600 rounded text-[10px] font-semibold uppercase">
                                    {location.tag}
                                  </span>
                                )}
                                {location?.country
                                  ? t(
                                      'entity.locationCountry',
                                      '{{country}} — {{count}} employees',
                                      { country: location.country, count: location?.employees || 0 }
                                    )
                                  : t('entity.employeeCount', '{{count}} employees', {
                                      count: location?.employees || 0,
                                    })}
                              </p>
                            </div>
                            {selectedLocation?.id === location?.id && (
                              <Check className="w-4 h-4 text-momentum-500 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                        <div className="border-t border-slate-100 mt-1">
                          <button
                            onClick={() => {
                              setEntityMenuOpen(false);
                              navigate('/locations');
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-momentum-600 hover:bg-slate-50 font-medium flex items-center gap-2"
                          >
                            <Settings className="w-4 h-4" />
                            {t('entity.manageLocations', 'Manage Locations')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* Manager / Worker: static location label (no dropdown) */
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 rounded-lg border border-slate-100 bg-slate-50">
                  <LocationDot color={userLocation?.color || '#6366f1'} size={10} />
                  <span className="hidden md:block font-medium truncate max-w-[180px]">
                    {userLocation?.name || 'Location'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Role Switcher — between location and notifications */}
          <div className="mx-2">
            <RoleSwitcher />
          </div>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Globe className="w-5 h-5" />
              <span className="hidden sm:block text-xs font-medium uppercase">
                {currentLang.code || 'EN'}
              </span>
            </button>

            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 max-h-80 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      {t('settings.language', 'Language')}
                    </p>
                  </div>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setCurrentLang(getCurrentLanguage());
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 ${
                        currentLang.code === lang.code
                          ? 'bg-momentum-50 text-momentum-600'
                          : 'text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-mono w-6 text-center uppercase text-slate-400">
                        {lang.code}
                      </span>
                      <span className="flex-1">{lang.nativeName}</span>
                      {currentLang.code === lang.code && (
                        <Check className="w-4 h-4 text-momentum-500" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            onClick={() => navigate('/settings/notifications')}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-momentum-500 rounded-full" />
          </button>

          {/* User menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-momentum-100 text-momentum-600 rounded-full flex items-center justify-center font-medium">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <span className="hidden sm:block text-sm font-medium text-slate-700">
                {user?.firstName} {user?.lastName}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                      {role}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('auth.logout', 'Log Out')}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content — with fade transition */}
        <main
          key={isPersonalView ? 'personal-content' : 'management-content'}
          className="p-4 lg:p-6 animate-fade-in"
        >
          <Outlet />
        </main>
      </div>

      {/* AI Chat Widget — always visible */}
      <AIChatWidget />
    </div>
  );
}
