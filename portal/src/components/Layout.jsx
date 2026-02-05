// ============================================================
// LAYOUT COMPONENT
// Main app layout with sidebar navigation
// ============================================================

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useBranding } from '../lib/branding';
import { useEntity } from '../lib/entityContext';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage } from '../i18n';
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
  Umbrella,
  Award,
  Briefcase,
  TrendingUp,
  Copy,
  UserPlus,
  UserMinus,
  Upload,
  ClipboardCheck,
  Plug,
  Globe,
  Target,
  GraduationCap,
  Wallet,
  Receipt,
  MessageSquare,
  FileText,
  Building2,
  Heart,
  Zap,
  Home,
  DollarSign,
  UserCircle,
  FolderOpen,
  Check,
} from 'lucide-react';

// Small coloured dot/square component for location indicators (no emoji flags)
function LocationDot({ color, size = 10 }) {
  return (
    <span
      className="inline-block rounded-sm flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    />
  );
}

// Sectioned navigation with 3-tier role-based visibility
const getNavSections = (role, t) => {
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isManager = role === 'manager';

  // WORKER: Personal self-service navigation
  if (!isAdmin && !isManager) {
    return [
      {
        label: t('nav.section.myUplift', 'MY UPLIFT'),
        items: [
          { name: t('nav.home', 'Home'), href: '/', icon: Home },
          { name: t('nav.myMomentum', 'My Momentum'), href: '/momentum', icon: Zap },
        ],
      },
      {
        label: t('nav.section.myWork', 'MY WORK'),
        items: [
          { name: t('nav.mySchedule', 'My Schedule'), href: '/schedule', icon: Calendar },
          { name: t('nav.timeTracking', 'Time Tracking'), href: '/time-tracking', icon: Clock },
          { name: t('nav.timeOff', 'Time Off'), href: '/time-off', icon: Umbrella },
        ],
      },
      {
        label: t('nav.section.myGrowth', 'MY GROWTH'),
        items: [
          { name: t('nav.myPerformance', 'My Performance'), href: '/performance', icon: Target },
          { name: t('nav.myLearning', 'My Learning'), href: '/learning', icon: GraduationCap },
          { name: t('nav.mySkillsCareer', 'My Skills & Career'), href: '/career', icon: Award },
          { name: t('nav.opportunities', 'Opportunities'), href: '/jobs', icon: Briefcase },
        ],
      },
      {
        label: t('nav.section.myMoney', 'MY MONEY'),
        items: [
          { name: t('nav.myPayslips', 'My Payslips'), href: '/compensation', icon: Wallet },
          { name: t('nav.myExpenses', 'My Expenses'), href: '/expenses', icon: Receipt },
        ],
      },
      {
        label: t('nav.section.myStuff', 'MY STUFF'),
        items: [
          { name: t('nav.directory', 'Company Directory'), href: '/directory', icon: Users },
          { name: t('nav.recognition', 'Recognition Wall'), href: '/recognition', icon: Heart },
          { name: t('nav.myDocuments', 'My Documents'), href: '/documents', icon: FileText },
          { name: t('nav.settings', 'Settings'), href: '/settings', icon: Settings },
        ],
      },
    ];
  }

  // MANAGER: Team-scoped navigation
  if (isManager) {
    return [
      {
        label: t('nav.section.overview', 'OVERVIEW'),
        items: [
          { name: t('nav.dashboard', 'Dashboard'), href: '/', icon: LayoutDashboard },
        ],
      },
      {
        label: t('nav.section.myTeam', 'MY TEAM'),
        items: [
          { name: t('nav.teamMembers', 'Team Members'), href: '/employees', icon: Users },
          { name: t('nav.onboarding', 'Onboarding'), href: '/onboarding', icon: UserPlus },
          { name: t('nav.offboarding', 'Offboarding'), href: '/offboarding', icon: UserMinus },
        ],
      },
      {
        label: t('nav.section.workforce', 'WORKFORCE'),
        items: [
          { name: t('nav.schedule', 'Schedule'), href: '/schedule', icon: Calendar },
          { name: t('nav.timeTracking', 'Time Tracking'), href: '/time-tracking', icon: Clock },
          { name: t('nav.timeOff', 'Time Off'), href: '/time-off', icon: Umbrella },
        ],
      },
      {
        label: t('nav.section.talent', 'TALENT'),
        items: [
          { name: t('nav.performance', 'Performance'), href: '/performance', icon: Target },
          { name: t('nav.learning', 'Learning'), href: '/learning', icon: GraduationCap },
        ],
      },
      {
        label: t('nav.section.compensation', 'COMPENSATION'),
        items: [
          { name: t('nav.expenses', 'Expenses'), href: '/expenses', icon: Receipt },
        ],
      },
      {
        label: t('nav.section.engagement', 'ENGAGEMENT'),
        items: [
          { name: t('nav.recognition', 'Recognition Wall'), href: '/recognition', icon: Heart },
          { name: t('nav.directory', 'Directory'), href: '/directory', icon: Users },
        ],
      },
      {
        label: t('nav.section.admin', 'ADMIN'),
        items: [
          { name: t('nav.settings', 'Settings'), href: '/settings', icon: Settings },
        ],
      },
    ];
  }

  // ADMIN: Full platform access
  return [
    {
      label: t('nav.section.overview', 'OVERVIEW'),
      items: [
        { name: t('nav.dashboard', 'Dashboard'), href: '/', icon: LayoutDashboard },
      ],
    },
    {
      label: t('nav.section.people', 'PEOPLE'),
      items: [
        { name: t('nav.employees', 'Employees'), href: '/employees', icon: Users },
        { name: t('nav.onboarding', 'Onboarding'), href: '/onboarding', icon: UserPlus },
        { name: t('nav.offboarding', 'Offboarding'), href: '/offboarding', icon: UserMinus },
      ],
    },
    {
      label: t('nav.section.workforce', 'WORKFORCE'),
      items: [
        { name: t('nav.schedule', 'Schedule'), href: '/schedule', icon: Calendar },
        { name: t('nav.templates', 'Templates'), href: '/shift-templates', icon: Copy },
        { name: t('nav.timeTracking', 'Time Tracking'), href: '/time-tracking', icon: Clock },
        { name: t('nav.timeOff', 'Time Off'), href: '/time-off', icon: Umbrella },
      ],
    },
    {
      label: t('nav.section.talent', 'TALENT'),
      items: [
        { name: t('nav.performance', 'Performance'), href: '/performance', icon: Target },
        { name: t('nav.skills', 'Skills'), href: '/skills', icon: Award },
        { name: t('nav.learning', 'Learning'), href: '/learning', icon: GraduationCap },
        { name: t('nav.opportunities', 'Opportunities'), href: '/jobs', icon: Briefcase },
      ],
    },
    {
      label: t('nav.section.compensation', 'COMPENSATION'),
      items: [
        { name: t('nav.payslips', 'Payslips & Pay'), href: '/compensation', icon: Wallet },
        { name: t('nav.expenses', 'Expenses'), href: '/expenses', icon: Receipt },
      ],
    },
    {
      label: t('nav.section.engagement', 'ENGAGEMENT'),
      items: [
        { name: t('nav.surveys', 'Surveys'), href: '/surveys', icon: MessageSquare },
        { name: t('nav.recognition', 'Recognition Wall'), href: '/recognition', icon: Heart },
        { name: t('nav.directory', 'Directory'), href: '/directory', icon: Users },
      ],
    },
    {
      label: t('nav.section.documents', 'DOCUMENTS'),
      items: [
        { name: t('nav.documents', 'Documents'), href: '/documents', icon: FileText },
      ],
    },
    {
      label: t('nav.section.analytics', 'ANALYTICS'),
      items: [
        { name: t('nav.reports', 'Reports'), href: '/reports', icon: BarChart3 },
        { name: t('nav.activity', 'Activity'), href: '/activity', icon: ClipboardCheck },
      ],
    },
    {
      label: t('nav.section.admin', 'ADMIN'),
      items: [
        { name: t('nav.settings', 'Settings'), href: '/settings', icon: Settings },
        { name: t('nav.integrations', 'Integrations'), href: '/integrations', icon: Plug },
        { name: t('nav.locations', 'Locations'), href: '/locations', icon: MapPin },
        { name: t('nav.bulkImport', 'Bulk Import'), href: '/bulk-import', icon: Upload },
      ],
    },
  ];
};

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { branding } = useBranding();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [entityMenuOpen, setEntityMenuOpen] = useState(false);
  const { selectedLocation, setSelectedLocation, locations } = useEntity();
  const navSections = getNavSections(user?.role, t);

  // Determine if user can switch locations (admin/superadmin only)
  const canSwitchLocation = user?.role === 'admin' || user?.role === 'superadmin';

  // For non-admin users, show their assigned location (default: London Mayfair)
  const userLocation = canSwitchLocation
    ? selectedLocation
    : (locations.find((l) => l.id === 'london') || locations[1]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform duration-200
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.brand_name || 'Logo'} className="h-8 w-auto max-w-[140px] object-contain" />
            ) : (
              <img src="/logo.svg" alt="Uplift" className="w-8 h-8" />
            )}
            <span className="text-white font-semibold text-sm leading-tight">{branding.brand_name || t('brand.grandMetropolitan', 'Grand Metropolitan')}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-momentum-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1" />

          {/* Entity / Location Selector */}
          <div className="relative mr-1">
            {canSwitchLocation ? (
              <>
                {/* Admin: clickable dropdown */}
                <button
                  onClick={() => setEntityMenuOpen(!entityMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                >
                  <LocationDot color={selectedLocation.color} size={10} />
                  <span className="hidden md:block font-medium truncate max-w-[180px]">
                    {selectedLocation.name}
                    {selectedLocation.code !== 'ALL' && (
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
                        <p className="text-xs font-semibold text-slate-500 uppercase">{t('entity.selectLocation', 'Select Location')}</p>
                      </div>
                      {locations.map((location) => (
                        <button
                          key={location.id}
                          onClick={() => {
                            setSelectedLocation(location.id);
                            setEntityMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${
                            selectedLocation.id === location.id ? 'bg-momentum-50' : ''
                          }`}
                        >
                          <LocationDot color={location.color} size={12} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${selectedLocation.id === location.id ? 'text-momentum-600' : 'text-slate-700'}`}>
                              {location.name}
                              {location.code !== 'ALL' && (
                                <span className="text-slate-400 font-normal ml-1">({location.code})</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {location.tag && (
                                <span className="inline-block mr-1.5 px-1.5 py-0 bg-momentum-100 text-momentum-600 rounded text-[10px] font-semibold uppercase">{location.tag}</span>
                              )}
                              {location.country
                                ? t('entity.locationCountry', '{{country}} -- {{count}} employees', { country: location.country, count: location.employees })
                                : t('entity.employeeCount', '{{count}} employees', { count: location.employees })
                              }
                            </p>
                          </div>
                          {selectedLocation.id === location.id && (
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
                <LocationDot color={userLocation.color} size={10} />
                <span className="hidden md:block font-medium truncate max-w-[180px]">
                  {userLocation.name}
                </span>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Globe className="w-5 h-5" />
              <span className="hidden sm:block text-xs font-medium uppercase">{currentLang.code || 'EN'}</span>
            </button>

            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 max-h-80 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase">{t('settings.language', 'Language')}</p>
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
                        currentLang.code === lang.code ? 'bg-momentum-50 text-momentum-600' : 'text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-mono w-6 text-center uppercase text-slate-400">{lang.code}</span>
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
                {user?.firstName?.[0]}{user?.lastName?.[0]}
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
                    <p className="text-sm font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
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

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
