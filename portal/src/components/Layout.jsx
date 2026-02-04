// ============================================================
// LAYOUT COMPONENT
// Main app layout with sidebar navigation
// ============================================================

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useBranding } from '../lib/branding';
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
} from 'lucide-react';

// Sectioned navigation with role-based visibility
const getNavSections = (role, t) => {
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;

  return [
    {
      label: t('nav.section.overview', 'OVERVIEW'),
      items: [
        { name: t('nav.dashboard', 'Dashboard'), href: '/', icon: LayoutDashboard, show: true },
      ],
    },
    {
      label: t('nav.section.people', 'PEOPLE'),
      items: [
        { name: t('nav.employees', 'Employees'), href: '/employees', icon: Users, show: isManager },
        { name: t('nav.onboarding', 'Onboarding'), href: '/onboarding', icon: UserPlus, show: isManager },
        { name: t('nav.offboarding', 'Offboarding'), href: '/offboarding', icon: UserMinus, show: isManager },
      ],
    },
    {
      label: t('nav.section.workforce', 'WORKFORCE'),
      items: [
        { name: t('nav.schedule', 'Schedule'), href: '/schedule', icon: Calendar, show: true },
        { name: t('nav.templates', 'Templates'), href: '/shift-templates', icon: Copy, show: isManager },
        { name: t('nav.timeTracking', 'Time Tracking'), href: '/time-tracking', icon: Clock, show: true },
        { name: t('nav.timeOff', 'Time Off'), href: '/time-off', icon: Umbrella, show: true },
      ],
    },
    {
      label: t('nav.section.talent', 'TALENT'),
      items: [
        { name: t('nav.performance', 'Performance'), href: '/performance', icon: Target, show: isManager },
        { name: t('nav.skills', 'Skills'), href: '/skills', icon: Award, show: isManager },
        { name: t('nav.learning', 'Learning'), href: '/learning', icon: GraduationCap, show: true },
        { name: t('nav.opportunities', 'Opportunities'), href: '/jobs', icon: Briefcase, show: true },
        { name: t('nav.myCareer', 'My Career'), href: '/career', icon: TrendingUp, show: !isManager },
      ],
    },
    {
      label: t('nav.section.compensation', 'COMPENSATION'),
      items: [
        { name: t('nav.payslips', 'Payslips & Pay'), href: '/compensation', icon: Wallet, show: isManager },
        { name: t('nav.expenses', 'Expenses'), href: '/expenses', icon: Receipt, show: true },
      ],
    },
    {
      label: t('nav.section.engagement', 'ENGAGEMENT'),
      items: [
        { name: t('nav.surveys', 'Surveys'), href: '/surveys', icon: MessageSquare, show: isManager },
      ],
    },
    {
      label: t('nav.section.documents', 'DOCUMENTS'),
      items: [
        { name: t('nav.documents', 'Documents'), href: '/documents', icon: FileText, show: isManager },
      ],
    },
    {
      label: t('nav.section.analytics', 'ANALYTICS'),
      items: [
        { name: t('nav.reports', 'Reports'), href: '/reports', icon: BarChart3, show: isManager },
        { name: t('nav.activity', 'Activity'), href: '/activity', icon: ClipboardCheck, show: isManager },
      ],
    },
    {
      label: t('nav.section.admin', 'ADMIN'),
      items: [
        { name: t('nav.settings', 'Settings'), href: '/settings', icon: Settings, show: true },
        { name: t('nav.integrations', 'Integrations'), href: '/integrations', icon: Plug, show: isManager },
        { name: t('nav.locations', 'Locations'), href: '/locations', icon: MapPin, show: isManager },
        { name: t('nav.bulkImport', 'Bulk Import'), href: '/bulk-import', icon: Upload, show: isManager },
      ],
    },
  ].map(section => ({
    ...section,
    items: section.items.filter(item => item.show),
  })).filter(section => section.items.length > 0);
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const navSections = getNavSections(user?.role, t);

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
            <span className="text-white font-semibold text-lg">{branding.brand_name || 'Uplift'}</span>
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

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Globe className="w-5 h-5" />
              <span className="hidden sm:block text-xs font-medium">{currentLang.flag || '🌐'}</span>
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
                      <span className="text-lg">{lang.flag}</span>
                      <span className="flex-1">{lang.nativeName}</span>
                      {currentLang.code === lang.code && (
                        <span className="text-momentum-500">✓</span>
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
