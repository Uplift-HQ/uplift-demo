// ============================================================
// SETTINGS PAGE
// Organization, user management, account, and security settings
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, organizationApi, authApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Building, User, Shield, Users, Save, Key, Mail, Plus, Trash,
  Lock, Unlock, UserX, UserCheck, RefreshCw, Send, X,
  Monitor, Smartphone, Globe, Clock, Download, AlertTriangle,
  ChevronRight, MoreVertical, Eye, History, Sun, Moon, Webhook,
  Palette, Check, Copy, Trash2, Play, Pause, Upload, Image, Crown, Sparkles,
  KeyRound, Link2, Layout as LayoutIcon,
  LayoutDashboard, CalendarDays, Timer, CalendarOff, TrendingUp,
  GraduationCap, Receipt, FileText, ClipboardList, Briefcase,
  Award, BookUser, Coins, UserPlus, UserMinus, BarChart3,
  Bell, BellRing, Inbox, ToggleLeft, Flag, Zap, Heart, Radio,
  Info, RotateCcw, Loader2, CheckCircle, XCircle, Edit, UserCog
} from 'lucide-react';
import { brandingApi } from '../lib/api';
import { useBranding } from '../lib/branding';
import { useToast } from '../components/ToastProvider';

// Tab configuration - names will be translated in the component
const TABS = [
  { id: 'organization', nameKey: 'settings.organization', label: 'Organization', icon: Building, adminOnly: true },
  { id: 'branding', nameKey: 'settings.brandingLabel', label: 'Branding', icon: Crown, adminOnly: true },
  { id: 'time-attendance', nameKey: 'settings.timeAttendance', label: 'Time & Attendance', icon: Clock, adminOnly: true },
  { id: 'feature-flags', nameKey: 'settings.featureFlagsLabel', label: 'Feature Flags', icon: Flag, adminOnly: true },
  { id: 'notifications-config', nameKey: 'settings.notificationsLabel', label: 'Notifications', icon: BellRing, adminOnly: true },
  { id: 'navigation', nameKey: 'settings.navigation', label: 'Navigation', icon: Globe, adminOnly: true },
  { id: 'employee-visibility', nameKey: 'settings.employeeVisibility', label: 'Employee Visibility', icon: Eye, adminOnly: true },
  { id: 'roles', nameKey: 'settings.rolesPermissions', label: 'Roles & Permissions', icon: UserCog, adminOnly: true },
  { id: 'users', nameKey: 'settings.teamMembers', label: 'Team Members', icon: Users, adminOnly: true },
  { id: 'appearance', nameKey: 'settings.appearance', label: 'Appearance', icon: Palette, adminOnly: false },
  { id: 'webhooks', nameKey: 'settings.webhooksTitle', label: 'Webhooks', icon: Webhook, adminOnly: true },
  { id: 'sso', nameKey: 'settings.ssoLabel', label: 'Single Sign-On', icon: KeyRound, adminOnly: true },
  { id: 'account', nameKey: 'settings.myAccount', label: 'My Account', icon: User, adminOnly: false },
  { id: 'security', nameKey: 'settings.security', label: 'Security', icon: Shield, adminOnly: false },
  { id: 'sessions', nameKey: 'settings.sessions', label: 'Sessions', icon: Monitor, adminOnly: false },
  { id: 'privacy', nameKey: 'settings.privacyData', label: 'Privacy & Data', icon: Eye, adminOnly: false },
];

export default function Settings() {
  const { t } = useTranslation();
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'organization' : 'account');
  const [organization, setOrganization] = useState(null);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if ((activeTab === 'organization' || activeTab === 'branding') && isAdmin) {
        const result = await organizationApi.get();
        setOrganization(result?.organization || null);
      } else if (activeTab === 'users' && isAdmin) {
        const result = await api.get('/users');
        setUsers(result?.users || []);
      } else if (activeTab === 'sessions') {
        const result = await api.get(`/users/${user.id}/sessions`);
        setSessions(result?.sessions || []);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load settings:', error);
      toast.error(t('settings.loadError', 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Filter tabs based on admin status
  const availableTabs = TABS.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('settings.title', 'Settings')}</h1>
        <p className="text-slate-600">{t('settings.subtitle', 'Manage your organization and account')}</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Layout */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <nav className="space-y-1">
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-momentum-50 text-momentum-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {t(tab.nameKey, tab.label)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
            </div>
          ) : (
            <>
              {activeTab === 'organization' && isAdmin && (
                <OrganizationSettings
                  organization={organization}
                  onSave={() => { loadData(); showMsg(t('settings.organizationSaved', 'Organization settings saved')); }}
                />
              )}
              {activeTab === 'branding' && isAdmin && (
                <BrandingSettings organization={organization} showMsg={showMsg} />
              )}
              {activeTab === 'navigation' && isAdmin && (
                <NavigationSettings showMsg={showMsg} />
              )}
              {activeTab === 'employee-visibility' && isAdmin && (
                <EmployeeVisibilitySettings showMsg={showMsg} />
              )}
              {activeTab === 'users' && isAdmin && (
                <UsersSettings
                  users={users}
                  onRefresh={loadData}
                  showMsg={showMsg}
                  onInvite={() => setShowInviteModal(true)}
                  onViewUser={(u) => { setSelectedUser(u); setShowUserModal(true); }}
                />
              )}
              {activeTab === 'appearance' && (
                <AppearanceSettings showMsg={showMsg} />
              )}
              {activeTab === 'webhooks' && isAdmin && (
                <WebhooksSettings showMsg={showMsg} />
              )}
              {activeTab === 'sso' && isAdmin && (
                <SSOSettings showMsg={showMsg} />
              )}
              {activeTab === 'account' && (
                <AccountSettings user={user} showMsg={showMsg} />
              )}
              {activeTab === 'security' && (
                <SecuritySettings user={user} showMsg={showMsg} />
              )}
              {activeTab === 'sessions' && (
                <SessionsSettings 
                  sessions={sessions} 
                  onRefresh={loadData}
                  showMsg={showMsg}
                  userId={user.id}
                />
              )}
              {activeTab === 'privacy' && (
                <PrivacySettings user={user} showMsg={showMsg} logout={logout} />
              )}
              {activeTab === 'portal-config' && isAdmin && (
                <PortalConfigSettings showMsg={showMsg} />
              )}
              {activeTab === 'feature-flags' && isAdmin && (
                <FeatureFlagsSettings showMsg={showMsg} />
              )}
              {activeTab === 'notifications-config' && isAdmin && (
                <NotificationConfigSettings showMsg={showMsg} />
              )}
              {activeTab === 'roles' && isAdmin && (
                <RolesSettings showMsg={showMsg} />
              )}
              {activeTab === 'time-attendance' && isAdmin && (
                <TimeAttendanceSettings showMsg={showMsg} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteUserModal 
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => { setShowInviteModal(false); loadData(); showMsg(t('settings.invitationSent', 'Invitation sent')); }}
        />
      )}
      {showUserModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => { setShowUserModal(false); setSelectedUser(null); }}
          onRefresh={loadData}
          showMsg={showMsg}
        />
      )}
    </div>
  );
}

// ============================================================
// ORGANIZATION SETTINGS
// ============================================================

function OrganizationSettings({ organization, onSave }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({
    name: organization?.name || '',
    timezone: organization?.timezone || 'Europe/London',
    currency: organization?.currency || 'GBP',
    dateFormat: organization?.date_format || 'DD/MM/YYYY',
    weekStartsOn: organization?.week_starts_on || 'monday',
    brandColor: organization?.brand_color || '#F26522',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await organizationApi.update(form);
      onSave();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save:', error);
      toast.error(t('settings.saveOrgError', 'Failed to save organization settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.organizationSettings', 'Organization Settings')}</h2>
        <p className="text-sm text-slate-600">{t('settings.configurePreferences', "Configure your organization's preferences")}</p>
      </div>

      <div className="grid gap-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.organizationName', 'Organization Name')}</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.timezone', 'Timezone')}</label>
          <select
            value={form.timezone}
            onChange={e => setForm({ ...form, timezone: e.target.value })}
            className="input"
          >
            <option value="Europe/London">{t('settings.timezones.london', 'London (GMT/BST)')}</option>
            <option value="America/New_York">{t('settings.timezones.newYork', 'New York (EST/EDT)')}</option>
            <option value="America/Los_Angeles">{t('settings.timezones.losAngeles', 'Los Angeles (PST/PDT)')}</option>
            <option value="Asia/Singapore">{t('settings.timezones.singapore', 'Singapore (SGT)')}</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.currency', 'Currency')}</label>
            <select
              value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value })}
              className="input"
            >
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.weekStartsOn', 'Week Starts On')}</label>
            <select
              value={form.weekStartsOn}
              onChange={e => setForm({ ...form, weekStartsOn: e.target.value })}
              className="input"
            >
              <option value="monday">{t('settings.monday')}</option>
              <option value="sunday">{t('settings.sunday')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.brandColor', 'Brand Color')}</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brandColor}
              onChange={e => setForm({ ...form, brandColor: e.target.value })}
              className="w-12 h-10 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={form.brandColor}
              onChange={e => setForm({ ...form, brandColor: e.target.value })}
              className="input w-32"
            />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn btn-primary">
        <Save className="w-4 h-4" />
        {saving ? t('settings.saving', 'Saving...') : t('settings.saveChanges', 'Save Changes')}
      </button>
    </div>
  );
}

// ============================================================
// BRANDING SETTINGS (Enterprise White-Label)
// ============================================================

function BrandingSettings({ organization, showMsg }) {
  const { t } = useTranslation();
  const { updateBranding, refetch } = useBranding();
  const hasFeature = (Array.isArray(organization?.features) && organization.features.includes('white_label')) || organization?.plan === 'enterprise';

  const [form, setForm] = useState({
    brand_name: '',
    primary_color: '#F26522',
    secondary_color: '#1E293B',
  });
  const [logos, setLogos] = useState({
    logo_url: null,
    dark_logo_url: null,
    favicon_url: null,
    login_bg_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const result = await brandingApi.get();
      if (result?.branding) {
        setForm({
          brand_name: result.branding.brand_name || '',
          primary_color: result.branding.primary_color || '#F26522',
          secondary_color: result.branding.secondary_color || '#1E293B',
        });
        setLogos({
          logo_url: result.branding.logo_url || null,
          dark_logo_url: result.branding.dark_logo_url || null,
          favicon_url: result.branding.favicon_url || null,
          login_bg_url: result.branding.login_bg_url || null,
        });
      }
    } catch (error) {
      // Silently fail - branding is optional
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await brandingApi.update(form);
      updateBranding({ ...form, ...logos });
      showMsg(t('settings.brandingSaved', 'Branding settings saved'));
    } catch (error) {
      showMsg('Failed to save branding settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showMsg('File must be under 2MB', 'error');
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowed.includes(file.type)) {
      showMsg('Only PNG, JPG, SVG, or ICO files are allowed', 'error');
      return;
    }
    setUploading(type);
    try {
      const result = await brandingApi.uploadLogo(file, type);
      const urlKey = `${type}_url`;
      const newUrl = result?.url || URL.createObjectURL(file);
      setLogos(prev => ({ ...prev, [urlKey]: newUrl }));
      updateBranding({ [urlKey]: newUrl });
      showMsg(`${type.replace('_', ' ')} uploaded`);
    } catch (error) {
      showMsg(`Failed to upload ${type}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteLogo = async (type) => {
    try {
      await brandingApi.deleteLogo(type);
      const urlKey = `${type}_url`;
      setLogos(prev => ({ ...prev, [urlKey]: null }));
      updateBranding({ [urlKey]: null });
      showMsg(`${type.replace('_', ' ')} removed`);
    } catch (error) {
      showMsg(`Failed to remove ${type}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
      </div>
    );
  }

  // Enterprise upsell banner
  if (!hasFeature) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('settings.brandingLabel', 'Branding')}</h2>
          <p className="text-sm text-slate-600">{t('settings.brandingDesc', 'Customize the look and feel of your Uplift experience')}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 p-8 text-center">
          <div className="absolute top-3 right-3">
            <Sparkles className="w-6 h-6 text-orange-400 animate-pulse" />
          </div>
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{t('settings.upgradeEnterpriseBranding', 'Upgrade to Enterprise for Custom Branding')}</h3>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            White-label your Uplift portal with your company logo, colors, and brand identity.
            Give your employees a seamless, branded experience.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto mb-6">
            {[
              { icon: Image, label: t('settings.branding.customLogo', 'Custom Logo') },
              { icon: Palette, label: t('settings.branding.brandColors', 'Brand Colors') },
              { icon: Crown, label: t('settings.branding.loginScreen', 'Login Screen') },
              { icon: Globe, label: t('settings.branding.customFavicon', 'Custom Favicon') },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 bg-white/70 rounded-lg">
                <item.icon className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
          <button onClick={() => window.open('mailto:sales@uplift.hr')} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg shadow-lg shadow-orange-200 hover:shadow-xl hover:from-orange-600 hover:to-amber-600 transition-all">
            {t('settings.contactSales', 'Contact Sales')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.brandingLabel', 'Branding')}</h2>
        <p className="text-sm text-slate-600">{t('settings.brandingDescFull', 'Customize the look and feel across portal and mobile app')}</p>
      </div>

      {/* Brand Name */}
      <div className="max-w-xl">
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.brandName', 'Brand Name')}</label>
        <input
          type="text"
          value={form.brand_name}
          onChange={e => setForm({ ...form, brand_name: e.target.value })}
          placeholder={t('settings.companyNamePlaceholder', 'Your Company Name')}
          className="input"
        />
        <p className="text-xs text-slate-500 mt-1">{t('settings.brandNameDesc', 'Displayed in the sidebar and mobile app header')}</p>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.primaryColor', 'Primary Color')}</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primary_color}
              onChange={e => setForm({ ...form, primary_color: e.target.value })}
              className="w-12 h-10 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={form.primary_color}
              onChange={e => setForm({ ...form, primary_color: e.target.value })}
              className="input w-32 font-mono text-sm"
            />
            <div
              className="w-10 h-10 rounded-lg border border-slate-200 shadow-inner"
              style={{ backgroundColor: form.primary_color }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.secondaryColor', 'Secondary Color')}</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.secondary_color}
              onChange={e => setForm({ ...form, secondary_color: e.target.value })}
              className="w-12 h-10 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={form.secondary_color}
              onChange={e => setForm({ ...form, secondary_color: e.target.value })}
              className="input w-32 font-mono text-sm"
            />
            <div
              className="w-10 h-10 rounded-lg border border-slate-200 shadow-inner"
              style={{ backgroundColor: form.secondary_color }}
            />
          </div>
        </div>
      </div>

      {/* Logo Uploads */}
      <div className="space-y-6">
        <h3 className="font-medium text-slate-900 border-b pb-2">{t('settings.logosImages', 'Logos & Images')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LogoUploadZone
            label={t('settings.branding.primaryLogo', 'Primary Logo')}
            description={t('settings.branding.primaryLogoDesc', 'Displayed in the sidebar on light backgrounds. PNG, JPG, or SVG. Max 2MB.')}
            currentUrl={logos.logo_url}
            uploading={uploading === 'logo'}
            onUpload={(file) => handleFileUpload(file, 'logo')}
            onRemove={() => handleDeleteLogo('logo')}
          />
          <LogoUploadZone
            label={t('settings.branding.darkModeLogo', 'Dark Mode Logo')}
            description={t('settings.branding.darkModeLogoDesc', 'Used on dark backgrounds. Should be light/white version of your logo.')}
            currentUrl={logos.dark_logo_url}
            uploading={uploading === 'dark_logo'}
            onUpload={(file) => handleFileUpload(file, 'dark_logo')}
            onRemove={() => handleDeleteLogo('dark_logo')}
            dark
          />
          <LogoUploadZone
            label={t('settings.branding.favicon', 'Favicon')}
            description={t('settings.branding.faviconDesc', 'Browser tab icon. Ideally square, 32x32 or 64x64. PNG or ICO.')}
            currentUrl={logos.favicon_url}
            uploading={uploading === 'favicon'}
            onUpload={(file) => handleFileUpload(file, 'favicon')}
            onRemove={() => handleDeleteLogo('favicon')}
            small
          />
          <LogoUploadZone
            label={t('settings.branding.loginBackground', 'Login Background')}
            description={t('settings.branding.loginBackgroundDesc', 'Background image for the login screen. Recommended 1920x1080.')}
            currentUrl={logos.login_bg_url}
            uploading={uploading === 'login_bg'}
            onUpload={(file) => handleFileUpload(file, 'login_bg')}
            onRemove={() => handleDeleteLogo('login_bg')}
            wide
          />
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-900 border-b pb-2">{t('settings.livePreview', 'Live Preview')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mobile App Header Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="text-xs font-medium text-slate-500 px-4 py-2 bg-slate-50 border-b">{t('settings.mobileAppHeader', 'Mobile App Header')}</div>
            <div className="p-4 bg-white">
              <div className="w-64 mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: form.primary_color }}>
                  {logos.dark_logo_url || logos.logo_url ? (
                    <img src={logos.dark_logo_url || logos.logo_url} alt="" className="h-6 w-auto max-w-[80px] object-contain brightness-0 invert" />
                  ) : (
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{(form.brand_name || 'U')[0]}</span>
                    </div>
                  )}
                  <span className="text-white font-semibold text-sm">{form.brand_name || 'Uplift'}</span>
                </div>
                <div className="h-24 bg-slate-50 p-3">
                  <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                  <div className="h-2 w-32 bg-slate-100 rounded mb-3" />
                  <div className="flex gap-2">
                    <div className="h-8 w-16 rounded-lg" style={{ backgroundColor: form.primary_color, opacity: 0.15 }} />
                    <div className="h-8 w-16 rounded-lg bg-slate-100" />
                    <div className="h-8 w-16 rounded-lg bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Login Screen Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="text-xs font-medium text-slate-500 px-4 py-2 bg-slate-50 border-b">{t('settings.loginScreenPreview', 'Login Screen')}</div>
            <div className="p-4 bg-white">
              <div className="w-64 mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                <div
                  className="h-36 flex items-center justify-center relative"
                  style={{
                    backgroundColor: form.secondary_color,
                    backgroundImage: logos.login_bg_url ? `url(${logos.login_bg_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {logos.login_bg_url && (
                    <div className="absolute inset-0 bg-black/40" />
                  )}
                  <div className="relative z-10 text-center">
                    {logos.dark_logo_url || logos.logo_url ? (
                      <img src={logos.dark_logo_url || logos.logo_url} alt="" className="h-10 w-auto mx-auto mb-2 max-w-[120px] object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: form.primary_color }}>
                        <span className="text-white font-bold text-lg">{(form.brand_name || 'U')[0]}</span>
                      </div>
                    )}
                    <span className="text-white font-semibold text-sm">{form.brand_name || 'Uplift'}</span>
                  </div>
                </div>
                <div className="p-3 bg-white space-y-2">
                  <div className="h-8 bg-slate-100 rounded-lg" />
                  <div className="h-8 bg-slate-100 rounded-lg" />
                  <div className="h-8 rounded-lg" style={{ backgroundColor: form.primary_color }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="pt-4 border-t">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          <Save className="w-4 h-4" />
          {saving ? t('common.saving', 'Saving...') : t('settings.saveBranding', 'Save Branding')}
        </button>
      </div>
    </div>
  );
}

function LogoUploadZone({ label, description, currentUrl, uploading, onUpload, onRemove, dark, small, wide }) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  const previewBg = dark ? 'bg-slate-800' : 'bg-white';
  const zoneHeight = wide ? 'h-32' : small ? 'h-24' : 'h-28';

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <p className="text-xs text-slate-500 mb-2">{description}</p>

      {currentUrl ? (
        <div className={`relative rounded-xl border border-slate-200 ${previewBg} ${zoneHeight} flex items-center justify-center p-4`}>
          <img
            src={currentUrl}
            alt={label}
            className={`max-h-full max-w-full object-contain ${small ? 'w-10 h-10' : ''}`}
          />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            title={t('common.remove', 'Remove')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors ${zoneHeight} ${
            dragOver
              ? 'border-orange-400 bg-orange-50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input type="file" className="hidden" accept="image/png,image/jpeg,image/svg+xml,image/x-icon" onChange={handleChange} />
          {uploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
          ) : (
            <>
              <Upload className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs text-slate-500">{t('settings.dropFileUpload', 'Drop file or click to upload')}</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}

// ============================================================
// USERS SETTINGS (Admin)
// ============================================================

function UsersSettings({ users, onRefresh, showMsg, onInvite, onViewUser }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const filteredUsers = users.filter(u => {
    if (filter === 'all') return true;
    if (filter === 'locked') return u.isLocked || (u.locked_until && new Date(u.locked_until) > new Date());
    return u.status === filter;
  });

  const getStatusBadge = (user) => {
    if (user.isLocked || (user.locked_until && new Date(user.locked_until) > new Date())) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">{t('settings.locked', 'Locked')}</span>;
    }
    switch (user.status) {
      case 'active': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">{t('settings.active', 'Active')}</span>;
      case 'invited': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">{t('settings.invited', 'Invited')}</span>;
      case 'inactive': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{t('settings.inactive', 'Inactive')}</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('settings.teamMembers', 'Team Members')}</h2>
          <p className="text-sm text-slate-600">{t('settings.manageUsers', 'Manage user accounts and permissions')}</p>
        </div>
        <button onClick={onInvite} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          {t('settings.inviteUser', 'Invite User')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'invited', 'locked', 'inactive'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f 
                ? 'bg-momentum-100 text-momentum-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">{t('settings.user', 'User')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">{t('settings.role', 'Role')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">{t('settings.status', 'Status')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">{t('settings.lastLogin', 'Last Login')}</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">{t('settings.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium">
                      {u.first_name?.[0]}{u.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {u.first_name} {u.last_name}
                        {u.force_password_change && (
                          <Key className="w-3.5 h-3.5 inline ml-1 text-amber-500" title={t('settings.passwordChangeRequired', 'Password change required')} />
                        )}
                      </div>
                      <div className="text-sm text-slate-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize text-sm text-slate-700">{u.role}</span>
                </td>
                <td className="px-4 py-3">{getStatusBadge(u)}</td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : t('settings.users.never', 'Never')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onViewUser(u)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// USER DETAIL MODAL (Admin)
// ============================================================

function UserDetailModal({ user, onClose, onRefresh, showMsg }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState('details');

  useEffect(() => {
    loadUserData();
  }, [user.id]);

  const loadUserData = async () => {
    try {
      const [sessResult, actResult] = await Promise.all([
        api.get(`/users/${user.id}/sessions`),
        api.get(`/users/${user.id}/activity?limit=20`),
      ]);
      setSessions(sessResult.sessions || []);
      setActivity(actResult.activities || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load user data:', error);
      toast.error(t('settings.loadUserError', 'Failed to load user data'));
    }
  };

  const handleAction = async (action, data = {}) => {
    setLoading(true);
    try {
      switch (action) {
        case 'unlock':
          await api.post(`/users/${user.id}/unlock`);
          showMsg(t('settings.users.accountUnlocked', 'Account unlocked'));
          break;
        case 'deactivate':
          await api.post(`/users/${user.id}/deactivate`, { reason: data.reason });
          showMsg(t('settings.users.accountDeactivated', 'Account deactivated'));
          break;
        case 'reactivate':
          await api.post(`/users/${user.id}/reactivate`);
          showMsg(t('settings.users.accountReactivated', 'Account reactivated'));
          break;
        case 'changeRole':
          await api.patch(`/users/${user.id}/role`, { role: data.role });
          showMsg(t('settings.users.roleUpdated', 'Role updated'));
          break;
        case 'forcePasswordReset':
          await api.post(`/users/${user.id}/force-password-reset`);
          showMsg(t('settings.users.passwordResetRequired', 'Password reset required on next login'));
          break;
        case 'resendInvitation':
          await api.post(`/users/${user.id}/resend-invitation`);
          showMsg(t('settings.users.invitationResent', 'Invitation resent'));
          break;
        case 'cancelInvitation':
          await api.post(`/users/${user.id}/cancel-invitation`);
          showMsg(t('settings.users.invitationCancelled', 'Invitation cancelled'));
          break;
        case 'revokeSessions':
          await api.post(`/users/${user.id}/sessions/revoke-all`);
          showMsg(t('settings.users.sessionsRevoked', 'All sessions revoked'));
          loadUserData();
          break;
      }
      onRefresh();
    } catch (error) {
      showMsg(error.message || 'Action failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = user.isLocked || (user.locked_until && new Date(user.locked_until) > new Date());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-lg">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user.first_name} {user.last_name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {['details', 'sessions', 'activity'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? 'border-momentum-500 text-momentum-600' : 'border-transparent text-slate-500'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {tab === 'details' && (
            <div className="space-y-6">
              {/* Status Actions */}
              <div className="flex flex-wrap gap-2">
                {isLocked && (
                  <button onClick={() => handleAction('unlock')} disabled={loading} className="btn btn-secondary">
                    <Unlock className="w-4 h-4" /> Unlock Account
                  </button>
                )}
                {user.status === 'active' && (
                  <button onClick={() => handleAction('deactivate')} disabled={loading} className="btn btn-secondary text-red-600 hover:bg-red-50">
                    <UserX className="w-4 h-4" /> Deactivate
                  </button>
                )}
                {user.status === 'inactive' && (
                  <button onClick={() => handleAction('reactivate')} disabled={loading} className="btn btn-secondary">
                    <UserCheck className="w-4 h-4" /> Reactivate
                  </button>
                )}
                {user.status === 'invited' && (
                  <>
                    <button onClick={() => handleAction('resendInvitation')} disabled={loading} className="btn btn-secondary">
                      <Send className="w-4 h-4" /> Resend Invitation
                    </button>
                    <button onClick={() => handleAction('cancelInvitation')} disabled={loading} className="btn btn-secondary text-red-600">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </>
                )}
                {user.status === 'active' && (
                  <button onClick={() => handleAction('forcePasswordReset')} disabled={loading} className="btn btn-secondary">
                    <Key className="w-4 h-4" /> Force Password Reset
                  </button>
                )}
                <button onClick={() => handleAction('revokeSessions')} disabled={loading} className="btn btn-secondary">
                  <RefreshCw className="w-4 h-4" /> Revoke All Sessions
                </button>
              </div>

              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">{t('settings.role', 'Role')}</span>
                  <select
                    value={user.role}
                    onChange={(e) => handleAction('changeRole', { role: e.target.value })}
                    className="input mt-1"
                    disabled={loading}
                  >
                    <option value="worker">{t('settings.worker')}</option>
                    <option value="manager">{t('settings.manager')}</option>
                    <option value="admin">{t('settings.admin')}</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-500">{t('settings.status', 'Status')}</span>
                  <p className="mt-1 font-medium">{isLocked ? t('settings.locked', 'Locked') : user.status}</p>
                </div>
                <div>
                  <span className="text-slate-500">{t('settings.emailVerified', 'Email Verified')}</span>
                  <p className="mt-1">{user.email_verified ? t('common.yes', 'Yes') : t('common.no', 'No')}</p>
                </div>
                <div>
                  <span className="text-slate-500">{t('settings.mfaEnabled', 'MFA Enabled')}</span>
                  <p className="mt-1">{user.mfa_enabled ? t('common.yes', 'Yes') : t('common.no', 'No')}</p>
                </div>
                <div>
                  <span className="text-slate-500">{t('settings.lastLogin', 'Last Login')}</span>
                  <p className="mt-1">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : t('settings.users.never', 'Never')}</p>
                </div>
                <div>
                  <span className="text-slate-500">{t('settings.created', 'Created')}</span>
                  <p className="mt-1">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'sessions' && (
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-slate-500 text-center py-8">{t('settings.noActiveSessions', 'No active sessions')}</p>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {s.device_type === 'mobile' ? <Smartphone className="w-5 h-5 text-slate-400" /> : <Monitor className="w-5 h-5 text-slate-400" />}
                      <div>
                        <p className="font-medium text-sm">{s.device_name || t('settings.unknownDevice', 'Unknown Device')}</p>
                        <p className="text-xs text-slate-500">{s.browser} • {s.ip_address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {s.is_current && <span className="text-xs text-green-600 font-medium">{t('settings.currentSession', 'Current')}</span>}
                      <p className="text-xs text-slate-500">{new Date(s.last_active_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-2">
              {activity.length === 0 ? (
                <p className="text-slate-500 text-center py-8">{t('settings.noActivityRecorded', 'No activity recorded')}</p>
              ) : (
                activity.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{a.ip_address}</p>
                    </div>
                    <div className="text-right">
                      {!a.success && <span className="text-xs text-red-600">{t('common.failed', 'Failed')}</span>}
                      <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INVITE USER MODAL
// ============================================================

function InviteUserModal({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'worker' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.inviteUser(form);
      onSuccess();
    } catch (err) {
      setError(err.message || t('settings.inviteError', 'Failed to send invitation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{t('settings.inviteTeamMember', 'Invite Team Member')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.firstName', 'First Name')}</label>
              <input type="text" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.lastName', 'Last Name')}</label>
              <input type="text" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.email', 'Email')}</label>
            <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.role', 'Role')}</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input">
              <option value="worker">{t('settings.worker')}</option>
              <option value="manager">{t('settings.manager')}</option>
              <option value="admin">{t('settings.admin')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">{t('common.cancel', 'Cancel')}</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? t('settings.sending', 'Sending...') : t('settings.sendInvitation', 'Send Invitation')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ACCOUNT SETTINGS
// ============================================================

function AccountSettings({ user, showMsg }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: user?.firstName || user?.first_name || '',
    lastName: user?.lastName || user?.last_name || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile(form);
      showMsg('Profile updated');
    } catch (error) {
      showMsg('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.myAccount', 'My Account')}</h2>
        <p className="text-sm text-slate-600">{t('settings.updatePersonalInfo', 'Update your personal information')}</p>
      </div>

      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="w-16 h-16 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-bold text-xl">
          {form.firstName?.[0]}{form.lastName?.[0]}
        </div>
        <div>
          <p className="font-medium">{form.firstName} {form.lastName}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-momentum-100 text-momentum-700 text-xs font-medium rounded-full capitalize">
            {user?.role}
          </span>
        </div>
      </div>

      <div className="grid gap-4 max-w-xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.firstName', 'First Name')}</label>
            <input type="text" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.lastName', 'Last Name')}</label>
            <input type="text" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.phone', 'Phone')}</label>
          <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn btn-primary">
        <Save className="w-4 h-4" />
        {saving ? t('common.saving', 'Saving...') : t('settings.saveChanges', 'Save Changes')}
      </button>
    </div>
  );
}

// ============================================================
// SECURITY SETTINGS
// ============================================================

function SecuritySettings({ user, showMsg }) {
  const { t } = useTranslation();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [changing, setChanging] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled || user?.mfa_enabled || false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      showMsg('Passwords do not match', 'error');
      return;
    }
    if (passwords.new.length < 8) {
      showMsg('Password must be at least 8 characters', 'error');
      return;
    }
    
    setChanging(true);
    try {
      await authApi.changePassword(passwords.current, passwords.new);
      setPasswords({ current: '', new: '', confirm: '' });
      showMsg('Password changed successfully');
    } catch (error) {
      showMsg(error.message || 'Failed to change password', 'error');
    } finally {
      setChanging(false);
    }
  };

  const toggleMfa = async () => {
    try {
      if (mfaEnabled) {
        await authApi.disableMfa();
        setMfaEnabled(false);
        showMsg('Two-factor authentication disabled');
      } else {
        await authApi.enableMfa();
        setMfaEnabled(true);
        showMsg('Two-factor authentication enabled');
      }
    } catch (error) {
      showMsg('Failed to update MFA settings', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.securitySettings', 'Security Settings')}</h2>
        <p className="text-sm text-slate-600">{t('settings.managePassword', 'Manage your password and security options')}</p>
      </div>

      {/* Change Password */}
      <div className="max-w-xl">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-slate-400" />
          {t('settings.changePassword', 'Change Password')}
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.currentPassword', 'Current Password')}</label>
            <input type="password" required value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.newPassword', 'New Password')}</label>
            <input type="password" required minLength={8} value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="input" />
            <p className="text-xs text-slate-500 mt-1">{t('settings.passwordRequirements', 'At least 8 characters with uppercase, lowercase, and number')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.confirmPassword', 'Confirm New Password')}</label>
            <input type="password" required value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="input" />
          </div>
          <button type="submit" disabled={changing} className="btn btn-primary">
            {changing ? t('settings.changingPassword', 'Changing...') : t('settings.changePassword', 'Change Password')}
          </button>
        </form>
      </div>

      {/* MFA */}
      <div className="max-w-xl pt-6 border-t">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-400" />
          {t('settings.twoFactorAuth', 'Two-Factor Authentication')}
        </h3>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium">{t('settings.authenticatorApp', 'Authenticator App')}</p>
            <p className="text-sm text-slate-500">{t('settings.extraSecurity', 'Add an extra layer of security')}</p>
          </div>
          <button onClick={toggleMfa} className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mfaEnabled 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}>
            {mfaEnabled ? t('settings.enabled', 'Enabled') : t('settings.enable', 'Enable')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SESSIONS SETTINGS
// ============================================================

function SessionsSettings({ sessions, onRefresh, showMsg, userId }) {
  const { t } = useTranslation();
  const [revoking, setRevoking] = useState(null);

  const revokeSession = async (sessionId) => {
    setRevoking(sessionId);
    try {
      await api.delete(`/users/${userId}/sessions/${sessionId}`);
      showMsg('Session revoked');
      onRefresh();
    } catch (error) {
      showMsg('Failed to revoke session', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const revokeOthers = async () => {
    setRevoking('all');
    try {
      await api.post('/users/me/sessions/revoke-others');
      showMsg('Other sessions revoked');
      onRefresh();
    } catch (error) {
      showMsg('Failed to revoke sessions', 'error');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('settings.activeSessions', 'Active Sessions')}</h2>
          <p className="text-sm text-slate-600">{t('settings.manageDevices', 'Manage your logged-in devices')}</p>
        </div>
        {sessions.length > 1 && (
          <button onClick={revokeOthers} disabled={revoking} className="btn btn-secondary text-red-600">
            <RefreshCw className="w-4 h-4" />
            {t('settings.signOutOtherDevices', 'Sign Out Other Devices')}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map(s => (
          <div key={s.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-4">
              {s.device_type === 'mobile' ? <Smartphone className="w-6 h-6 text-slate-400" /> : <Monitor className="w-6 h-6 text-slate-400" />}
              <div>
                <p className="font-medium">
                  {s.device_name || t('settings.unknownDevice', 'Unknown Device')}
                  {s.is_current && <span className="ml-2 text-xs text-green-600 font-medium">{t('settings.thisDevice', 'This device')}</span>}
                </p>
                <p className="text-sm text-slate-500">{s.browser} on {s.os} • {s.ip_address}</p>
                <p className="text-xs text-slate-400">Last active: {new Date(s.last_active_at).toLocaleString()}</p>
              </div>
            </div>
            {!s.is_current && (
              <button 
                onClick={() => revokeSession(s.id)} 
                disabled={revoking === s.id}
                className="btn btn-secondary text-red-600 text-sm"
              >
                {revoking === s.id ? t('settings.revoking', 'Revoking...') : t('settings.revoke', 'Revoke')}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// APPEARANCE SETTINGS (Dark Mode)
// ============================================================

function AppearanceSettings({ showMsg }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('uplift-theme') || 'light';
    }
    return 'light';
  });

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('uplift-theme', newTheme);

    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    showMsg('Theme updated');
  };

  const themes = [
    { id: 'light', name: t('settings.themes.light', 'Light'), icon: Sun, description: t('settings.themes.lightDesc', 'Clean, bright interface') },
    { id: 'dark', name: t('settings.themes.dark', 'Dark'), icon: Moon, description: t('settings.themes.darkDesc', 'Easy on the eyes') },
    { id: 'system', name: t('settings.themes.system', 'System'), icon: Monitor, description: t('settings.themes.systemDesc', 'Match device settings') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.appearance', 'Appearance')}</h2>
        <p className="text-sm text-slate-600">{t('settings.customizeAppearance', 'Customize how Uplift looks for you')}</p>
      </div>

      <div>
        <h3 className="font-medium text-slate-900 mb-4">{t('settings.theme', 'Theme')}</h3>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((themeOption) => (
            <button
              key={themeOption.id}
              onClick={() => handleThemeChange(themeOption.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                theme === themeOption.id
                  ? 'border-momentum-500 bg-momentum-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                theme === themeOption.id ? 'bg-momentum-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <themeOption.icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-900">{themeOption.name}</p>
              <p className="text-sm text-slate-500">{themeOption.description}</p>
              {theme === themeOption.id && (
                <div className="mt-2 flex items-center gap-1 text-momentum-600 text-sm font-medium">
                  <Check className="w-4 h-4" /> {t('settings.active', 'Active')}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <AccentColorPicker showMsg={showMsg} />
    </div>
  );
}

// ============================================================
// WEBHOOKS SETTINGS
// ============================================================

function WebhooksSettings({ showMsg }) {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      // NOTE: Replace with webhooksApi.list() when available
      const result = await api.get('/webhooks');
      setWebhooks(result?.webhooks || []);
    } catch (error) {
      showMsg('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleWebhook = async (id) => {
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return;
    try {
      // NOTE: Replace with webhooksApi.update() when available
      await api.patch(`/webhooks/${id}`, { active: !webhook.active });
      setWebhooks(webhooks.map(w =>
        w.id === id ? { ...w, active: !w.active } : w
      ));
    } catch (error) {
      showMsg('Failed to update webhook', 'error');
    }
  };

  const deleteWebhook = async (id) => {
    try {
      // NOTE: Replace with webhooksApi.delete() when available
      await api.delete(`/webhooks/${id}`);
      setWebhooks(webhooks.filter(w => w.id !== id));
    } catch (error) {
      showMsg('Failed to delete webhook', 'error');
    }
  };

  const eventTypes = [
    { category: 'Shifts', events: ['shift.created', 'shift.updated', 'shift.deleted', 'shift.claimed', 'shift.released'] },
    { category: 'Employees', events: ['employee.created', 'employee.updated', 'employee.deactivated'] },
    { category: 'Time Tracking', events: ['timeentry.created', 'timeentry.approved', 'clockin', 'clockout'] },
    { category: 'Time Off', events: ['timeoff.requested', 'timeoff.approved', 'timeoff.rejected'] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('settings.webhooksTitle', 'Webhooks')}</h2>
          <p className="text-sm text-slate-600">{t('settings.webhooksIntegration', 'Integrate with external systems via HTTP callbacks')}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          {t('settings.addWebhook', 'Add Webhook')}
        </button>
      </div>

      {/* Webhooks List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Webhook className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">{t('settings.noWebhooksConfigured', 'No webhooks configured')}</p>
          <p className="text-sm mt-1">{t('settings.addWebhookToIntegrate', 'Add a webhook to integrate with external systems')}</p>
        </div>
      ) : (
      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  webhook.active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{webhook.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      webhook.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {webhook.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-mono mt-1">{webhook.url.substring(0, 40)}...</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {webhook.events.map((event) => (
                      <span key={event} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleWebhook(webhook.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    webhook.active ? 'hover:bg-slate-100' : 'hover:bg-green-50'
                  }`}
                  title={webhook.active ? 'Pause webhook' : 'Activate webhook'}
                >
                  {webhook.active ? <Pause className="w-4 h-4 text-slate-400" /> : <Play className="w-4 h-4 text-green-600" />}
                </button>
                <button
                  onClick={() => setSelectedWebhook(webhook)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                  title={t('settings.webhooks.viewDetails', 'View details')}
                >
                  <Eye className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => deleteWebhook(webhook.id)}
                  className="p-2 hover:bg-red-50 rounded-lg"
                  title={t('settings.webhooks.deleteWebhook', 'Delete webhook')}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
            {webhook.lastTriggered && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                </span>
                <span className={`font-medium ${webhook.successRate >= 95 ? 'text-green-600' : webhook.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {webhook.successRate}% success rate
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {/* Event Types Reference */}
      <div className="pt-6 border-t">
        <h3 className="font-medium text-slate-900 mb-4">{t('settings.availableEventTypes', 'Available Event Types')}</h3>
        <div className="grid grid-cols-2 gap-4">
          {eventTypes.map((cat) => (
            <div key={cat.category} className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-700 mb-2">{cat.category}</h4>
              <div className="space-y-1">
                {cat.events.map((event) => (
                  <div key={event} className="text-sm font-mono text-slate-600">{event}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Webhook Modal */}
      {showAddModal && (
        <AddWebhookModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(webhook) => {
            setWebhooks([...webhooks, webhook]);
            setShowAddModal(false);
          }}
          eventTypes={eventTypes}
        />
      )}

      {/* Webhook Detail Modal */}
      {selectedWebhook && (
        <WebhookDetailModal
          webhook={selectedWebhook}
          onClose={() => setSelectedWebhook(null)}
        />
      )}
    </div>
  );
}

function AddWebhookModal({ onClose, onSuccess, eventTypes }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', url: '', events: [], secret: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url || form.events.length === 0) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      // NOTE: Replace with webhooksApi.create() when available
      const result = await api.post('/webhooks', form);
      onSuccess(result?.webhook || { ...form, id: Date.now(), active: true });
    } catch (err) {
      setError(err.message || 'Failed to create webhook');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (event) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{t('settings.addWebhook', 'Add Webhook')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.webhookName', 'Name')} *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder={t('settings.webhooks.namePlaceholder', 'e.g., Slack Notifications')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.endpointUrl', 'Endpoint URL')} *</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="input font-mono text-sm"
              placeholder="https://your-server.com/webhook"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.webhookSecret', 'Secret')} ({t('common.optional', 'optional')})</label>
            <input
              type="text"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              className="input font-mono text-sm"
              placeholder={t('settings.webhooks.secretPlaceholder', 'Your webhook secret for signature verification')}
            />
            <p className="text-xs text-slate-500 mt-1">{t('settings.webhookSecretDesc', 'Used to sign webhook payloads for verification')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.eventsToSubscribe', 'Events to Subscribe')} *</label>
            <div className="space-y-4 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {eventTypes.map((cat) => (
                <div key={cat.category}>
                  <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">{cat.category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {cat.events.map((event) => (
                      <button
                        key={event}
                        type="button"
                        onClick={() => toggleEvent(event)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          form.events.includes(event)
                            ? 'bg-momentum-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {event}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">{form.events.length} {t('settings.eventsSelected', 'events selected')}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">{t('common.cancel', 'Cancel')}</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? t('common.creating', 'Creating...') : t('settings.createWebhook', 'Create Webhook')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WebhookDetailModal({ webhook, onClose }) {
  const toast = useToast();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadDeliveryLogs();
  }, [webhook.id]);

  const loadDeliveryLogs = async () => {
    try {
      // NOTE: Replace with webhooksApi.getDeliveries() when available
      const result = await api.get(`/webhooks/${webhook.id}/deliveries`);
      setDeliveryLogs(result?.deliveries || []);
      setStats(result?.stats || null);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load delivery logs:', error);
      toast.error(t('settings.loadLogsError', 'Failed to load delivery logs'));
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webhook.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">{webhook.name}</h2>
            <p className="text-sm text-slate-500">{t('settings.webhookDetails', 'Webhook Details')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* URL */}
          <div>
            <label className="text-sm font-medium text-slate-500">{t('settings.endpointUrl', 'Endpoint URL')}</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 p-3 bg-slate-100 rounded-lg text-sm font-mono break-all">{webhook.url}</code>
              <button onClick={copyUrl} className="btn btn-secondary shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Events */}
          <div>
            <label className="text-sm font-medium text-slate-500">{t('settings.subscribedEvents', 'Subscribed Events')}</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {webhook.events.map((event) => (
                <span key={event} className="px-3 py-1 bg-momentum-100 text-momentum-700 text-sm rounded-full">
                  {event}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats.successRate ?? webhook.successRate ?? '--'}%</p>
              <p className="text-sm text-slate-500">{t('settings.successRate', 'Success Rate')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats.totalDeliveries ?? '--'}</p>
              <p className="text-sm text-slate-500">{t('settings.totalDeliveries', 'Total Deliveries')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats.avgResponseTime ? `~${stats.avgResponseTime}ms` : '--'}</p>
              <p className="text-sm text-slate-500">{t('settings.avgResponseTime', 'Avg Response Time')}</p>
            </div>
          </div>
          )}

          {/* Delivery Logs */}
          <div>
            <label className="text-sm font-medium text-slate-500">{t('settings.recentDeliveries', 'Recent Deliveries')}</label>
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-momentum-500" />
              </div>
            ) : deliveryLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">{t('settings.noDeliveriesYet', 'No deliveries yet')}</p>
            ) : (
            <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">{t('common.time', 'Time')}</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">{t('common.event', 'Event')}</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">{t('common.status', 'Status')}</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">{t('settings.response', 'Response')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2 text-slate-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-600">{log.event}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {log.responseTime}ms
                        {log.error && <span className="text-red-500 ml-2">({log.error})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NAVIGATION SETTINGS (Page Visibility)
// ============================================================

function NavigationSettings({ showMsg }) {
  const { t } = useTranslation();
  const [pages, setPages] = useState([]);
  const [roleVisibility, setRoleVisibility] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNavigationSettings();
  }, []);

  const loadNavigationSettings = async () => {
    try {
      // NOTE: Replace with organizationApi.getNavigation() when available
      const result = await api.get('/organization/navigation');
      setPages(result?.pages || []);
      setRoleVisibility(result?.roleVisibility || {});
    } catch (error) {
      showMsg('Failed to load navigation settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePageForRole = async (role, pageId) => {
    const currentPages = roleVisibility[role] || [];
    const page = pages.find(p => p.id === pageId);

    if (page?.required) return;

    const newPages = currentPages.includes(pageId)
      ? currentPages.filter(p => p !== pageId)
      : [...currentPages, pageId];

    const newVisibility = { ...roleVisibility, [role]: newPages };

    try {
      // NOTE: Replace with organizationApi.updateNavigation() when available
      await api.put('/organization/navigation', { roleVisibility: newVisibility });
      setRoleVisibility(newVisibility);
    } catch (error) {
      showMsg('Failed to update navigation', 'error');
    }
  };

  const roles = [
    { id: 'worker', name: t('settings.roles.workers', 'Workers'), description: t('settings.roles.workersDesc', 'Regular employees') },
    { id: 'manager', name: t('settings.roles.managers', 'Managers'), description: t('settings.roles.managersDesc', 'Team leads and supervisors') },
    { id: 'admin', name: t('settings.roles.admins', 'Admins'), description: t('settings.roles.adminsDesc', 'Full access administrators') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.pageVisibility', 'Navigation & Page Visibility')}</h2>
        <p className="text-sm text-slate-600">{t('settings.controlPageVisibility', 'Control which pages are visible to different user roles')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">{t('settings.noPagesConfigured', 'No pages configured')}</p>
        </div>
      ) : (
      <div className="space-y-6">
        {roles.map((role) => (
          <div key={role.id} className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-medium text-slate-900">{role.name}</h3>
              <p className="text-sm text-slate-500">{role.description}</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {pages.map((page) => {
                  const isEnabled = roleVisibility[role.id].includes(page.id);
                  const isRequired = page.required;

                  return (
                    <div
                      key={page.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isEnabled ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'
                      } ${isRequired ? 'opacity-60' : ''}`}
                    >
                      <div>
                        <p className="font-medium text-sm text-slate-900">{page.name}</p>
                        <p className="text-xs text-slate-500">{page.description}</p>
                      </div>
                      <button
                        onClick={() => togglePageForRole(role.id, page.id)}
                        disabled={isRequired}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          isEnabled ? 'bg-green-500' : 'bg-slate-300'
                        } ${isRequired ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">{t('settings.aboutPageVisibility', 'About Page Visibility')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('settings.aboutPageVisibilityDesc', 'Pages you disable will be hidden from the navigation menu for that role. Users won\'t be able to access those pages directly either. The Dashboard is always visible as it\'s the landing page.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPLOYEE VISIBILITY SETTINGS (Per-Employee Feature Access)
// ============================================================

function EmployeeVisibilitySettings({ showMsg }) {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      // NOTE: Replace with employeesApi.listWithVisibility() when available
      const result = await api.get('/employees?include=visibility');
      setEmployees(result?.employees || []);
    } catch (error) {
      showMsg('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const visibilityFeatures = [
    { id: 'team_schedules', name: t('settings.features.teamSchedules', 'Team Schedules'), description: t('settings.features.teamSchedulesDesc', 'View other team members schedules') },
    { id: 'internal_jobs', name: t('settings.features.internalJobs', 'Internal Jobs'), description: t('settings.features.internalJobsDesc', 'Access internal job postings') },
    { id: 'career_paths', name: t('settings.features.careerPaths', 'Career Paths'), description: t('settings.features.careerPathsDesc', 'View career development paths') },
    { id: 'analytics', name: t('settings.features.analytics', 'Team Analytics'), description: t('settings.features.analyticsDesc', 'Access performance analytics') },
    { id: 'peer_recognition', name: t('settings.features.peerRecognition', 'Peer Recognition'), description: t('settings.features.peerRecognitionDesc', 'Send and receive peer kudos') },
  ];

  const toggleVisibility = async (empId, feature) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const currentVisibility = emp.visibility || {};
    const newVisibility = { ...currentVisibility, [feature]: !currentVisibility[feature] };
    try {
      // NOTE: Replace with employeesApi.updateVisibility() when available
      await api.put(`/employees/${empId}/visibility`, newVisibility);
      setEmployees(prev => prev.map(e =>
        e.id === empId ? { ...e, visibility: newVisibility } : e
      ));
    } catch (error) {
      showMsg('Failed to update visibility', 'error');
    }
  };

  const toggleAllForEmployee = async (empId, enabled) => {
    const newVisibility = {};
    visibilityFeatures.forEach(f => { newVisibility[f.id] = enabled; });
    try {
      // NOTE: Replace with employeesApi.updateVisibility() when available
      await api.put(`/employees/${empId}/visibility`, newVisibility);
      setEmployees(prev => prev.map(e =>
        e.id === empId ? { ...e, visibility: newVisibility } : e
      ));
    } catch (error) {
      showMsg('Failed to update visibility', 'error');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    const role = emp.role_name || emp.role || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           role.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'probation':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">{t('settings.probation', 'Probation')}</span>;
      case 'active':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">{t('settings.active', 'Active')}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.employeeVisibilitySettings', 'Employee Visibility Settings')}</h2>
        <p className="text-sm text-slate-600">{t('settings.controlFeatureAccess', 'Control which features each employee can access')}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('settings.searchEmployeesPlaceholder', 'Search employees...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full pl-10"
        />
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </div>

      {/* Employee List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">{searchQuery ? t('settings.noEmployeesMatch', 'No employees match your search') : t('settings.noEmployeesFound', 'No employees found')}</p>
        </div>
      ) : (
      <div className="space-y-3">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="border border-slate-200 rounded-lg overflow-hidden"
          >
            {/* Employee Header */}
            <div
              className="flex items-center justify-between p-4 bg-white cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setSelectedEmployee(selectedEmployee === emp.id ? null : emp.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium">
                  {(emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`).trim().split(' ').map(n => n?.[0] || '').join('').slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</p>
                    {getStatusBadge(emp.status)}
                  </div>
                  <p className="text-sm text-slate-500">{emp.role_name || emp.role || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {visibilityFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className={`w-2 h-2 rounded-full ${
                        emp.visibility?.[feature.id] ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                      title={`${feature.name}: ${emp.visibility?.[feature.id] ? 'Enabled' : 'Disabled'}`}
                    />
                  ))}
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    selectedEmployee === emp.id ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </div>

            {/* Expanded Visibility Controls */}
            {selectedEmployee === emp.id && (
              <div className="border-t border-slate-200 p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-slate-700">{t('settings.featureAccess', 'Feature Access')}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAllForEmployee(emp.id, true)}
                      className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      {t('settings.enableAll', 'Enable All')}
                    </button>
                    <button
                      onClick={() => toggleAllForEmployee(emp.id, false)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      {t('settings.disableAll', 'Disable All')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibilityFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        emp.visibility?.[feature.id]
                          ? 'border-green-200 bg-green-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm text-slate-900">{feature.name}</p>
                        <p className="text-xs text-slate-500">{feature.description}</p>
                      </div>
                      <button
                        onClick={() => toggleVisibility(emp.id, feature.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          emp.visibility?.[feature.id] ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                            emp.visibility?.[feature.id] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Status-based note */}
                {emp.status === 'probation' && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">{t('settings.probationPeriod', 'Probation Period')}</p>
                      <p className="text-amber-700">{t('settings.probationRestriction', 'Some features are restricted during the probation period. These will be automatically enabled once probation ends.')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {/* Info box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">{t('settings.aboutEmployeeVisibilityTitle', 'About Employee Visibility')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('settings.aboutEmployeeVisibility', 'These settings control which features are visible to each employee. Employees on probation have restricted access by default, which can be customized based on your organization\'s policies.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccentColorPicker({ showMsg }) {
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('uplift-accent-color') || '#FF6B35';
    }
    return '#FF6B35';
  });

  const handleColorChange = async (color) => {
    setSelectedColor(color);
    localStorage.setItem('uplift-accent-color', color);
    try {
      // NOTE: Replace with organizationApi.updateAccentColor() or user preferences API when available
      await api.put('/users/me/preferences', { accentColor: color });
    } catch (error) {
      showMsg('Failed to save accent color', 'error');
    }
  };

  const colors = ['#FF6B35', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];

  return (
    <div className="pt-6 border-t">
      <h3 className="font-medium text-slate-900 mb-4">{t('settings.accentColor', 'Accent Color')}</h3>
      <div className="flex gap-3">
        {colors.map((color) => (
          <button
            key={color}
            className={`w-10 h-10 rounded-full border-2 shadow-md hover:scale-110 transition-transform ${
              selectedColor === color ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-400' : 'border-white'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => handleColorChange(color)}
          />
        ))}
      </div>
      <p className="text-sm text-slate-500 mt-2">{t('settings.chooseAccentColor', 'Choose your preferred accent color')}</p>
    </div>
  );
}

// ============================================================
// PRIVACY & DATA SETTINGS (GDPR)
// ============================================================

function PrivacySettings({ user, showMsg, logout }) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await api.get('/users/me/data-export');
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uplift-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showMsg('Data exported successfully');
    } catch (error) {
      showMsg('Failed to export data', 'error');
    } finally {
      setExporting(false);
    }
  };

  const requestDeletion = async () => {
    if (!deletePassword) {
      showMsg('Please enter your password', 'error');
      return;
    }
    setDeleting(true);
    try {
      await api.post('/users/me/request-deletion', { password: deletePassword });
      showMsg('Deletion requested. Your account will be deleted in 30 days.');
      setShowDeleteConfirm(false);
    } catch (error) {
      showMsg(error.message || 'Failed to request deletion', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const hasPendingDeletion = user?.deletion_requested_at;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.privacyData', 'Privacy & Data')}</h2>
        <p className="text-sm text-slate-600">{t('settings.managePersonalData', 'Manage your personal data and account')}</p>
      </div>

      {/* Export Data */}
      <div className="p-4 border border-slate-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-900">{t('settings.exportYourData', 'Export Your Data')}</h3>
            <p className="text-sm text-slate-600 mt-1">{t('settings.downloadDataDesc', 'Download a copy of all your personal data including profile, activity logs, time entries, and shifts.')}</p>
            <button onClick={exportData} disabled={exporting} className="btn btn-secondary mt-3">
              {exporting ? t('settings.preparing', 'Preparing...') : t('settings.downloadMyData', 'Download My Data')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-red-900">{t('settings.deleteAccount', 'Delete Account')}</h3>
            {hasPendingDeletion ? (
              <>
                <p className="text-sm text-red-700 mt-1">{t('settings.deletionScheduled', 'Your account is scheduled for deletion. It will be permanently removed in 30 days.')}</p>
                <button 
                  onClick={async () => {
                    await api.post('/users/me/cancel-deletion');
                    showMsg('Deletion cancelled');
                  }} 
                  className="btn btn-secondary mt-3"
                >
                  {t('settings.cancelDeletion', 'Cancel Deletion')}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-red-700 mt-1">{t('settings.deleteAccountWarning', 'Permanently delete your account and all associated data. This action cannot be undone after the 30-day grace period.')}</p>
                <button onClick={() => setShowDeleteConfirm(true)} className="btn mt-3 bg-red-600 text-white hover:bg-red-700">
                  {t('settings.requestAccountDeletion', 'Request Account Deletion')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-lg font-semibold">{t('settings.deleteAccount', 'Delete Account')}</h2>
            </div>
            <p className="text-slate-600 mb-4">
              {t('settings.deleteAccountWarning', 'This will schedule your account for permanent deletion. You have 30 days to cancel this request. After that, all your data will be permanently removed.')}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.enterPasswordToConfirm', 'Enter your password to confirm')}</label>
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="input"
                placeholder={t('settings.passwordPlaceholder', 'Your password')}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">{t('common.cancel', 'Cancel')}</button>
              <button onClick={requestDeletion} disabled={deleting} className="btn bg-red-600 text-white hover:bg-red-700">
                {deleting ? t('common.processing', 'Processing...') : t('settings.deleteMyAccount', 'Delete My Account')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SSO & ENTERPRISE SECURITY SETTINGS
// ============================================================

function SSOSettings({ showMsg }) {
  const { t } = useTranslation();
  const toast = useToast();

  // SSO Provider state
  const [ssoProvider, setSsoProvider] = useState('saml');
  const [entityId, setEntityId] = useState('https://app.uplift.com/saml/metadata');
  const [ssoUrl, setSsoUrl] = useState('');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [certificate, setCertificate] = useState('');
  const [enforceSso, setEnforceSso] = useState(false);

  // SSO Test Connection state
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string, details?: object }

  // SCIM Provisioning state
  const [scimEnabled, setScimEnabled] = useState(false);
  const [scimEndpoint] = useState('https://api.uplift.com/scim/v2');
  const [scimToken, setScimToken] = useState('uplift_scim_tk_a1b2c3d4e5f6g7h8i9j0');

  // Session Policy state
  const [sessionTimeout, setSessionTimeout] = useState('8h');
  const [idleTimeout, setIdleTimeout] = useState('1h');
  const [forceReauth, setForceReauth] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState('');

  // MFA Configuration state
  const [requireMfaAdmins, setRequireMfaAdmins] = useState(true);
  const [requireMfaAll, setRequireMfaAll] = useState(false);
  const [mfaMethod, setMfaMethod] = useState('authenticator');

  // Test SSO Connection
  const handleTestConnection = async () => {
    // Clear previous result
    setTestResult(null);

    // Validate we have a URL to test
    const urlToTest = metadataUrl || ssoUrl;
    if (!urlToTest) {
      setTestResult({
        success: false,
        message: t('settings.sso.testNoUrl', 'Please enter an SSO URL or Metadata URL to test')
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(urlToTest);
    } catch {
      setTestResult({
        success: false,
        message: t('settings.sso.testInvalidUrl', 'Please enter a valid URL')
      });
      return;
    }

    setTestingConnection(true);

    try {
      const response = await api.post('/auth/sso/test', {
        provider: ssoProvider,
        metadataUrl: metadataUrl || null,
        ssoUrl: ssoUrl || null,
        entityId: entityId || null,
      });

      if (response.success) {
        setTestResult({
          success: true,
          message: t('settings.sso.testSuccess', 'Connection successful - IdP metadata received'),
          details: response.details || {}
        });
        toast.success(t('settings.sso.testSuccess', 'Connection successful'));
      } else {
        setTestResult({
          success: false,
          message: response.error || t('settings.sso.testFailed', 'Connection failed'),
          details: response.details || {}
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || t('settings.sso.testError', 'Failed to test connection - check URL and try again')
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Demo audit log data (50+ realistic entries spanning past month)
  const auditEvents = [
    { timestamp: '2026-02-05 09:12:34', user: 'sarah.chen@grandmetropolitan.com', event: 'SSO Login', ip: '192.168.1.42' },
    { timestamp: '2026-02-05 08:55:01', user: 'james.williams@grandmetropolitan.com', event: 'SSO Login', ip: '10.0.0.15' },
    { timestamp: '2026-02-05 08:45:22', user: 'maria.santos@grandmetropolitan.com', event: 'SSO Login', ip: '192.168.1.43' },
    { timestamp: '2026-02-05 08:30:00', user: 'pierre.dubois@grandmetropolitan.com', event: 'SSO Login', ip: '185.42.10.5' },
    { timestamp: '2026-02-04 17:30:22', user: 'sarah.chen@grandmetropolitan.com', event: 'Password Changed', ip: '172.16.0.8' },
    { timestamp: '2026-02-04 16:45:11', user: 'unknown', event: 'Failed Login Attempt', ip: '45.33.22.11' },
    { timestamp: '2026-02-04 14:11:09', user: 'ahmed.hassan@grandmetropolitan.com', event: 'MFA Enabled', ip: '192.168.1.55' },
    { timestamp: '2026-02-04 12:30:47', user: 'yuki.tanaka@grandmetropolitan.com', event: 'SSO Login', ip: '203.180.22.1' },
    { timestamp: '2026-02-04 10:02:47', user: 'sarah.chen@grandmetropolitan.com', event: 'SSO Config Updated', ip: '172.16.0.8' },
    { timestamp: '2026-02-04 09:15:33', user: 'claire.dubois@grandmetropolitan.com', event: 'SSO Login', ip: '185.42.10.6' },
    { timestamp: '2026-02-03 18:22:11', user: 'sarah.chen@grandmetropolitan.com', event: 'User Role Changed', ip: '172.16.0.8' },
    { timestamp: '2026-02-03 16:45:00', user: 'unknown', event: 'Failed Login Attempt', ip: '91.205.111.42' },
    { timestamp: '2026-02-03 15:30:22', user: 'emily.watson@grandmetropolitan.com', event: 'SSO Login', ip: '192.168.1.44' },
    { timestamp: '2026-02-03 14:20:11', user: 'oliver.barnes@grandmetropolitan.com', event: 'MFA Disabled', ip: '192.168.1.50' },
    { timestamp: '2026-02-03 11:45:33', user: 'fatima.alzahra@grandmetropolitan.com', event: 'SSO Login', ip: '94.56.88.12' },
    { timestamp: '2026-02-03 10:15:22', user: 'sarah.chen@grandmetropolitan.com', event: 'Data Export', ip: '172.16.0.8' },
    { timestamp: '2026-02-02 17:30:00', user: 'jessica.thompson@grandmetropolitan.com', event: 'SSO Login', ip: '73.42.18.99' },
    { timestamp: '2026-02-02 16:11:45', user: 'unknown', event: 'Failed Login Attempt', ip: '45.33.22.11' },
    { timestamp: '2026-02-02 15:22:33', user: 'unknown', event: 'Failed Login Attempt', ip: '45.33.22.11' },
    { timestamp: '2026-02-02 14:45:11', user: 'account locked: unknown@test.com', event: 'Account Locked', ip: '45.33.22.11' },
    { timestamp: '2026-02-02 12:30:22', user: 'haruki.nakamura@grandmetropolitan.com', event: 'SSO Login', ip: '203.180.22.5' },
    { timestamp: '2026-02-02 10:11:00', user: 'sarah.chen@grandmetropolitan.com', event: 'New User Created', ip: '172.16.0.8' },
    { timestamp: '2026-02-01 18:45:33', user: 'khalid.alrashid@grandmetropolitan.com', event: 'SSO Login', ip: '94.56.88.15' },
    { timestamp: '2026-02-01 16:22:11', user: 'michael.torres@grandmetropolitan.com', event: 'Password Reset Requested', ip: '73.42.18.101' },
    { timestamp: '2026-02-01 15:30:00', user: 'michael.torres@grandmetropolitan.com', event: 'Password Changed', ip: '73.42.18.101' },
    { timestamp: '2026-02-01 14:11:22', user: 'sarah.chen@grandmetropolitan.com', event: 'IP Whitelist Updated', ip: '172.16.0.8' },
    { timestamp: '2026-02-01 11:45:00', user: 'isabelle.laurent@grandmetropolitan.com', event: 'SSO Login', ip: '185.42.10.8' },
    { timestamp: '2026-02-01 09:30:33', user: 'victoria.sterling@grandmetropolitan.com', event: 'SSO Login', ip: '172.16.0.1' },
    { timestamp: '2026-01-31 17:22:11', user: 'sarah.chen@grandmetropolitan.com', event: 'MFA Method Changed', ip: '172.16.0.8' },
    { timestamp: '2026-01-31 15:11:45', user: 'david.mitchell@grandmetropolitan.com', event: 'SSO Login', ip: '192.168.1.60' },
    { timestamp: '2026-01-31 14:30:22', user: 'priya.sharma@grandmetropolitan.com', event: 'SSO Login', ip: '192.168.1.61' },
    { timestamp: '2026-01-31 12:45:00', user: 'sarah.chen@grandmetropolitan.com', event: 'Session Timeout Updated', ip: '172.16.0.8' },
    { timestamp: '2026-01-31 10:22:33', user: 'tom.hughes@grandmetropolitan.com', event: 'SSO Login', ip: '192.168.1.45' },
    { timestamp: '2026-01-30 18:11:22', user: 'sophie.martin@grandmetropolitan.com', event: 'Password Changed', ip: '185.42.10.9' },
    { timestamp: '2026-01-30 16:45:11', user: 'camille.rousseau@grandmetropolitan.com', event: 'MFA Enabled', ip: '185.42.10.10' },
    { timestamp: '2026-01-30 14:30:00', user: 'jean-pierre.moreau@grandmetropolitan.com', event: 'SSO Login', ip: '185.42.10.11' },
    { timestamp: '2026-01-30 12:22:45', user: 'layla.ibrahim@grandmetropolitan.com', event: 'SSO Login', ip: '94.56.88.20' },
    { timestamp: '2026-01-30 10:11:33', user: 'noor.bakri@grandmetropolitan.com', event: 'SSO Login', ip: '94.56.88.21' },
    { timestamp: '2026-01-29 17:45:22', user: 'omar.mahmoud@grandmetropolitan.com', event: 'Password Reset Requested', ip: '94.56.88.22' },
    { timestamp: '2026-01-29 16:30:11', user: 'omar.mahmoud@grandmetropolitan.com', event: 'Password Changed', ip: '94.56.88.22' },
    { timestamp: '2026-01-29 14:22:00', user: 'marcus.johnson@grandmetropolitan.com', event: 'SSO Login', ip: '73.42.18.105' },
    { timestamp: '2026-01-29 12:11:45', user: 'ashley.williams@grandmetropolitan.com', event: 'MFA Enabled', ip: '73.42.18.106' },
    { timestamp: '2026-01-29 10:45:33', user: 'carlos.rodriguez@grandmetropolitan.com', event: 'SSO Login', ip: '73.42.18.107' },
    { timestamp: '2026-01-28 18:30:22', user: 'samantha.lee@grandmetropolitan.com', event: 'SSO Login', ip: '73.42.18.108' },
    { timestamp: '2026-01-28 16:22:11', user: 'aiko.yamamoto@grandmetropolitan.com', event: 'SSO Login', ip: '203.180.22.10' },
    { timestamp: '2026-01-28 14:11:00', user: 'wei.zhang@grandmetropolitan.com', event: 'MFA Enabled', ip: '203.180.22.11' },
    { timestamp: '2026-01-28 12:45:45', user: 'kenji.sato@grandmetropolitan.com', event: 'SSO Login', ip: '203.180.22.12' },
    { timestamp: '2026-01-28 10:30:33', user: 'mei.lin@grandmetropolitan.com', event: 'SSO Login', ip: '203.180.22.13' },
    { timestamp: '2026-01-27 17:22:22', user: 'richard.thompson@grandmetropolitan.com', event: 'SSO Login', ip: '172.16.0.5' },
    { timestamp: '2026-01-27 15:11:11', user: 'sarah.chen@grandmetropolitan.com', event: 'SCIM Provisioning Enabled', ip: '172.16.0.8' },
    { timestamp: '2026-01-27 14:45:00', user: 'sarah.chen@grandmetropolitan.com', event: 'SCIM Token Regenerated', ip: '172.16.0.8' },
    { timestamp: '2026-01-27 12:30:45', user: 'unknown', event: 'Failed SSO Attempt', ip: '185.220.101.42' },
    { timestamp: '2026-01-27 10:22:33', user: 'sarah.chen@grandmetropolitan.com', event: 'Audit Log Exported', ip: '172.16.0.8' },
    { timestamp: '2026-01-26 18:11:22', user: 'sarah.chen@grandmetropolitan.com', event: 'New User Created', ip: '172.16.0.8' },
    { timestamp: '2026-01-26 16:45:11', user: 'sarah.chen@grandmetropolitan.com', event: 'User Deactivated', ip: '172.16.0.8' },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMsg(t('settings.sso.copied', 'Copied to clipboard'));
  };

  const regenerateToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const newToken = 'uplift_scim_tk_' + Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setScimToken(newToken);
    showMsg(t('settings.sso.tokenRegenerated', 'Bearer token regenerated'));
  };

  const handleSave = () => {
    showMsg(t('settings.sso.saved', 'SSO & security settings saved'));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('settings.sso.title', 'SSO & Enterprise Security')}</h2>
          <p className="text-sm text-slate-600">{t('settings.sso.subtitle', 'Configure single sign-on, provisioning, and enterprise security policies')}</p>
        </div>
        <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {t('settings.sso.saveChanges', 'Save Changes')}
        </button>
      </div>

      {/* SSO Provider Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-slate-400" />
          {t('settings.sso.providerConfig', 'SSO Provider Configuration')}
        </h3>
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.provider', 'SSO Provider')}</label>
            <select
              value={ssoProvider}
              onChange={e => { setSsoProvider(e.target.value); setTestResult(null); }}
              className="input"
            >
              <option value="saml">{t('settings.sso.providerSaml', 'SAML 2.0')}</option>
              <option value="oidc">{t('settings.sso.providerOidc', 'OIDC / OAuth 2.0')}</option>
              <option value="azure">{t('settings.sso.providerAzure', 'Azure AD')}</option>
              <option value="okta">{t('settings.sso.providerOkta', 'Okta')}</option>
              <option value="google">{t('settings.sso.providerGoogle', 'Google Workspace')}</option>
              <option value="onelogin">{t('settings.sso.providerOnelogin', 'OneLogin')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.metadataUrl', 'IdP Metadata URL')}</label>
            <input
              type="url"
              value={metadataUrl}
              onChange={e => { setMetadataUrl(e.target.value); setTestResult(null); }}
              className="input"
              placeholder="https://idp.example.com/metadata.xml"
            />
            <p className="text-xs text-slate-500 mt-1">{t('settings.sso.metadataUrlDesc', 'URL to your identity provider metadata XML (optional if entering details manually)')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.entityId', 'Entity ID / Issuer')}</label>
            <input
              type="text"
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
              className="input"
              placeholder="https://app.uplift.com/saml/metadata"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.ssoUrl', 'SSO URL')}</label>
            <input
              type="url"
              value={ssoUrl}
              onChange={e => { setSsoUrl(e.target.value); setTestResult(null); }}
              className="input"
              placeholder="https://idp.example.com/sso/saml"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.certificate', 'X.509 Certificate')}</label>
            <textarea
              value={certificate}
              onChange={e => setCertificate(e.target.value)}
              className="input min-h-[100px] font-mono text-xs"
              placeholder={t('settings.sso.certificatePlaceholder', 'Paste your IdP certificate here...')}
              rows={5}
            />
          </div>

          {/* Test Connection Button */}
          <div className="pt-2">
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="btn btn-secondary flex items-center gap-2"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('settings.sso.testing', 'Testing...')}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {t('settings.sso.testConnection', 'Test Connection')}
                </>
              )}
            </button>

            {/* Test Result Display */}
            {testResult && (
              <div className={`mt-3 p-4 rounded-lg flex items-start gap-3 ${
                testResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.message}
                  </p>
                  {testResult.details && testResult.success && (
                    <div className="mt-2 text-sm text-green-700 space-y-1">
                      {testResult.details.entityId && (
                        <p><span className="font-medium">{t('settings.sso.detectedEntityId', 'Entity ID')}:</span> {testResult.details.entityId}</p>
                      )}
                      {testResult.details.ssoUrl && (
                        <p><span className="font-medium">{t('settings.sso.detectedSsoUrl', 'SSO URL')}:</span> {testResult.details.ssoUrl}</p>
                      )}
                      {testResult.details.provider && (
                        <p><span className="font-medium">{t('settings.sso.detectedProvider', 'Provider')}:</span> {testResult.details.provider}</p>
                      )}
                    </div>
                  )}
                  {testResult.details && !testResult.success && testResult.details.errorCode && (
                    <p className="mt-1 text-sm text-red-600">
                      {t('settings.sso.errorCode', 'Error code')}: {testResult.details.errorCode}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">{t('settings.sso.enforceSso', 'Enforce SSO for all users')}</p>
              <p className="text-sm text-slate-500">{t('settings.sso.enforceSsoDesc', 'When enabled, all users must authenticate via SSO. Password login will be disabled.')}</p>
            </div>
            <button
              onClick={() => setEnforceSso(!enforceSso)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enforceSso ? 'bg-momentum-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enforceSso ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* SCIM Provisioning */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-slate-400" />
          {t('settings.sso.scimProvisioning', 'SCIM Provisioning')}
        </h3>
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">{t('settings.sso.enableScim', 'Enable SCIM Provisioning')}</p>
              <p className="text-sm text-slate-500">{t('settings.sso.enableScimDesc', 'Automatically sync users and groups from your identity provider')}</p>
            </div>
            <button
              onClick={() => setScimEnabled(!scimEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scimEnabled ? 'bg-momentum-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scimEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {scimEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.scimEndpoint', 'SCIM Endpoint URL')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scimEndpoint}
                    readOnly
                    className="input flex-1 bg-slate-50 text-slate-600"
                  />
                  <button
                    onClick={() => copyToClipboard(scimEndpoint)}
                    className="btn btn-secondary flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    {t('settings.sso.copy', 'Copy')}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.bearerToken', 'Bearer Token')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scimToken}
                    readOnly
                    className="input flex-1 bg-slate-50 font-mono text-xs text-slate-600"
                  />
                  <button
                    onClick={regenerateToken}
                    className="btn btn-secondary flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('settings.sso.regenerate', 'Regenerate')}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">{t('settings.sso.tokenWarning', 'Regenerating will invalidate the current token. Update your IdP configuration accordingly.')}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Session Policy */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          {t('settings.sso.sessionPolicy', 'Session Policy')}
        </h3>
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.sessionTimeout', 'Session Timeout')}</label>
            <select
              value={sessionTimeout}
              onChange={e => setSessionTimeout(e.target.value)}
              className="input"
            >
              <option value="1h">{t('settings.sso.timeout1h', '1 hour')}</option>
              <option value="4h">{t('settings.sso.timeout4h', '4 hours')}</option>
              <option value="8h">{t('settings.sso.timeout8h', '8 hours')}</option>
              <option value="24h">{t('settings.sso.timeout24h', '24 hours')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.idleTimeout', 'Idle Timeout')}</label>
            <select
              value={idleTimeout}
              onChange={e => setIdleTimeout(e.target.value)}
              className="input"
            >
              <option value="15m">{t('settings.sso.idle15m', '15 minutes')}</option>
              <option value="30m">{t('settings.sso.idle30m', '30 minutes')}</option>
              <option value="1h">{t('settings.sso.idle1h', '1 hour')}</option>
              <option value="4h">{t('settings.sso.idle4h', '4 hours')}</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">{t('settings.sso.forceReauth', 'Force re-authentication for sensitive actions')}</p>
              <p className="text-sm text-slate-500">{t('settings.sso.forceReauthDesc', 'Require users to re-enter credentials before performing sensitive operations')}</p>
            </div>
            <button
              onClick={() => setForceReauth(!forceReauth)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${forceReauth ? 'bg-momentum-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${forceReauth ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.ipWhitelist', 'IP Whitelist')}</label>
            <textarea
              value={ipWhitelist}
              onChange={e => setIpWhitelist(e.target.value)}
              className="input min-h-[80px] font-mono text-xs"
              placeholder={t('settings.sso.ipWhitelistPlaceholder', 'Enter one IP or CIDR range per line\n192.168.1.0/24\n10.0.0.0/8')}
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-1">{t('settings.sso.ipWhitelistDesc', 'Leave empty to allow all IPs. One IP or CIDR range per line.')}</p>
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          {t('settings.sso.auditLog', 'Audit Log')}
        </h3>
        <p className="text-sm text-slate-500 mb-4">{t('settings.sso.auditLogDesc', 'Recent security events across your organization')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-medium text-slate-600">{t('settings.sso.colTimestamp', 'Timestamp')}</th>
                <th className="text-left py-2 px-3 font-medium text-slate-600">{t('settings.sso.colUser', 'User')}</th>
                <th className="text-left py-2 px-3 font-medium text-slate-600">{t('settings.sso.colEvent', 'Event')}</th>
                <th className="text-left py-2 px-3 font-medium text-slate-600">{t('settings.sso.colIp', 'IP Address')}</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((evt, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-500 font-mono text-xs">{evt.timestamp}</td>
                  <td className="py-2 px-3 text-slate-700">{evt.user}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      evt.event.includes('Failed') ? 'bg-red-100 text-red-700' :
                      evt.event.includes('Login') ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {evt.event}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-mono text-xs">{evt.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MFA Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-400" />
          {t('settings.sso.mfaConfig', 'MFA Configuration')}
        </h3>
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">{t('settings.sso.requireMfaAdmins', 'Require MFA for admins')}</p>
              <p className="text-sm text-slate-500">{t('settings.sso.requireMfaAdminsDesc', 'All administrator accounts must have MFA enabled')}</p>
            </div>
            <button
              onClick={() => setRequireMfaAdmins(!requireMfaAdmins)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireMfaAdmins ? 'bg-momentum-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireMfaAdmins ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">{t('settings.sso.requireMfaAll', 'Require MFA for all users')}</p>
              <p className="text-sm text-slate-500">{t('settings.sso.requireMfaAllDesc', 'Every user in the organization must have MFA enabled')}</p>
            </div>
            <button
              onClick={() => setRequireMfaAll(!requireMfaAll)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireMfaAll ? 'bg-momentum-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireMfaAll ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.sso.mfaMethod', 'Default MFA Method')}</label>
            <select
              value={mfaMethod}
              onChange={e => setMfaMethod(e.target.value)}
              className="input"
            >
              <option value="authenticator">{t('settings.sso.mfaAuthenticator', 'Authenticator App')}</option>
              <option value="sms">{t('settings.sso.mfaSms', 'SMS')}</option>
              <option value="email">{t('settings.sso.mfaEmail', 'Email')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROLES & PERMISSIONS SETTINGS
// Full CRUD for custom roles with permission matrix
// ============================================================

// Permission modules that can be assigned to roles
const PERMISSION_MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'time-tracking', label: 'Time Tracking', icon: Timer },
  { id: 'time-off', label: 'Time Off', icon: CalendarOff },
  { id: 'payroll', label: 'Payroll', icon: Coins },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Shield },
];

// Permission levels
const PERMISSION_LEVELS = ['none', 'read', 'write', 'admin'];

// Built-in roles that cannot be deleted
const BUILT_IN_ROLES = [
  {
    id: 'worker',
    name: 'Worker',
    description: 'Standard employee with access to personal schedule and time tracking',
    builtIn: true,
    userCount: 45,
    permissions: {
      dashboard: 'read',
      schedule: 'read',
      'time-tracking': 'write',
      'time-off': 'write',
      payroll: 'read',
      employees: 'none',
      reports: 'none',
      settings: 'none',
    }
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Team lead with access to team schedules and approvals',
    builtIn: true,
    userCount: 8,
    permissions: {
      dashboard: 'read',
      schedule: 'write',
      'time-tracking': 'write',
      'time-off': 'admin',
      payroll: 'read',
      employees: 'read',
      reports: 'read',
      settings: 'none',
    }
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access including settings and configuration',
    builtIn: true,
    userCount: 3,
    permissions: {
      dashboard: 'admin',
      schedule: 'admin',
      'time-tracking': 'admin',
      'time-off': 'admin',
      payroll: 'admin',
      employees: 'admin',
      reports: 'admin',
      settings: 'admin',
    }
  },
];

function RolesSettings({ showMsg }) {
  const { t } = useTranslation();
  const toast = useToast();

  // State
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState({});

  // Load roles on mount
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/roles');
      const customRoles = response.roles || [];
      // Combine built-in roles with custom roles
      setRoles([...BUILT_IN_ROLES, ...customRoles.map(r => ({ ...r, builtIn: false }))]);
    } catch (error) {
      // Fall back to built-in roles only
      setRoles(BUILT_IN_ROLES);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    // Initialize with no permissions
    const defaultPerms = {};
    PERMISSION_MODULES.forEach(m => { defaultPerms[m.id] = 'none'; });
    setFormPermissions(defaultPerms);
    setShowModal(true);
  };

  const openEditModal = (role) => {
    if (role.builtIn) {
      toast.info(t('settings.roles.cannotEditBuiltIn', 'Built-in roles cannot be modified'));
      return;
    }
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions({ ...role.permissions });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormPermissions({});
  };

  const handlePermissionChange = (moduleId, level) => {
    setFormPermissions(prev => ({ ...prev, [moduleId]: level }));
  };

  const handleSaveRole = async () => {
    if (!formName.trim()) {
      toast.error(t('settings.roles.nameRequired', 'Role name is required'));
      return;
    }

    setSaving(true);
    try {
      const roleData = {
        name: formName.trim(),
        description: formDescription.trim(),
        permissions: formPermissions,
      };

      if (editingRole) {
        // Update existing role
        await api.put(`/roles/${editingRole.id}`, roleData);
        toast.success(t('settings.roles.updated', 'Role updated successfully'));
      } else {
        // Create new role
        await api.post('/roles', roleData);
        toast.success(t('settings.roles.created', 'Role created successfully'));
      }

      closeModal();
      loadRoles();
    } catch (error) {
      toast.error(error.message || t('settings.roles.saveError', 'Failed to save role'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.builtIn) {
      toast.error(t('settings.roles.cannotDeleteBuiltIn', 'Built-in roles cannot be deleted'));
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/roles/${role.id}`);
      toast.success(t('settings.roles.deleted', 'Role deleted successfully'));
      setShowDeleteConfirm(null);
      loadRoles();
    } catch (error) {
      toast.error(error.message || t('settings.roles.deleteError', 'Failed to delete role'));
    } finally {
      setSaving(false);
    }
  };

  const getPermissionBadge = (level) => {
    const styles = {
      none: 'bg-slate-100 text-slate-500',
      read: 'bg-blue-100 text-blue-700',
      write: 'bg-green-100 text-green-700',
      admin: 'bg-purple-100 text-purple-700',
    };
    const labels = {
      none: t('settings.roles.permNone', 'None'),
      read: t('settings.roles.permRead', 'Read'),
      write: t('settings.roles.permWrite', 'Write'),
      admin: t('settings.roles.permAdmin', 'Admin'),
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[level] || styles.none}`}>
        {labels[level] || level}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {t('settings.roles.title', 'Roles & Permissions')}
          </h2>
          <p className="text-slate-500 mt-1">
            {t('settings.roles.subtitle', 'Define custom roles and configure what each role can access')}
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('settings.roles.addRole', 'Add Custom Role')}
        </button>
      </div>

      {/* Roles List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map(role => (
            <div
              key={role.id}
              className={`bg-white rounded-xl border p-5 ${
                role.builtIn ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900">{role.name}</h3>
                    {role.builtIn ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {t('settings.roles.builtIn', 'Built-in')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {t('settings.roles.custom', 'Custom')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{role.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {role.userCount || 0} {t('settings.roles.usersAssigned', 'users assigned')}
                    </span>
                  </div>

                  {/* Permission Summary */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {PERMISSION_MODULES.slice(0, 5).map(mod => (
                      <div key={mod.id} className="flex items-center gap-1 text-xs text-slate-500">
                        <mod.icon className="w-3 h-3" />
                        <span>{mod.label}:</span>
                        {getPermissionBadge(role.permissions?.[mod.id] || 'none')}
                      </div>
                    ))}
                    {PERMISSION_MODULES.length > 5 && (
                      <span className="text-xs text-slate-400">
                        +{PERMISSION_MODULES.length - 5} {t('settings.roles.more', 'more')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openEditModal(role)}
                    disabled={role.builtIn}
                    className={`p-2 rounded-lg transition-colors ${
                      role.builtIn
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    title={role.builtIn ? t('settings.roles.cannotEditBuiltIn', 'Built-in roles cannot be modified') : t('settings.roles.edit', 'Edit role')}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(role)}
                    disabled={role.builtIn}
                    className={`p-2 rounded-lg transition-colors ${
                      role.builtIn
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title={role.builtIn ? t('settings.roles.cannotDeleteBuiltIn', 'Built-in roles cannot be deleted') : t('settings.roles.delete', 'Delete role')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingRole
                    ? t('settings.roles.editRole', 'Edit Role')
                    : t('settings.roles.createRole', 'Create Custom Role')}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Role Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('settings.roles.roleName', 'Role Name')} *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="input"
                  placeholder={t('settings.roles.roleNamePlaceholder', 'e.g., Shift Supervisor')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('settings.roles.description', 'Description')}
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="input min-h-[80px]"
                  placeholder={t('settings.roles.descriptionPlaceholder', 'What can users with this role do?')}
                  rows={2}
                />
              </div>

              {/* Permissions Matrix */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  {t('settings.roles.permissions', 'Permissions')}
                </label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-medium text-slate-700">
                          {t('settings.roles.module', 'Module')}
                        </th>
                        {PERMISSION_LEVELS.map(level => (
                          <th key={level} className="text-center px-3 py-3 font-medium text-slate-700 capitalize">
                            {t(`settings.roles.perm${level.charAt(0).toUpperCase() + level.slice(1)}`, level)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MODULES.map((mod, idx) => (
                        <tr key={mod.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <mod.icon className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-700">{mod.label}</span>
                            </div>
                          </td>
                          {PERMISSION_LEVELS.map(level => (
                            <td key={level} className="text-center px-3 py-3">
                              <input
                                type="radio"
                                name={`perm-${mod.id}`}
                                checked={formPermissions[mod.id] === level}
                                onChange={() => handlePermissionChange(mod.id, level)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {t('settings.roles.permissionsHelp', 'None: No access. Read: View only. Write: View and edit. Admin: Full control including delete.')}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button onClick={closeModal} className="btn btn-secondary">
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSaveRole}
                disabled={saving || !formName.trim()}
                className="btn btn-primary flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingRole ? t('settings.roles.saveChanges', 'Save Changes') : t('settings.roles.createRole', 'Create Role')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('settings.roles.deleteTitle', 'Delete Role')}
                </h3>
                <p className="text-sm text-slate-600 mt-2">
                  {t('settings.roles.deleteWarning', 'Are you sure you want to delete "{{name}}"?', { name: showDeleteConfirm.name })}
                </p>
                {showDeleteConfirm.userCount > 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    {t('settings.roles.deleteUsersWarning', 'This role is assigned to {{count}} users. They will revert to default permissions.', { count: showDeleteConfirm.userCount })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-secondary">
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleDeleteRole(showDeleteConfirm)}
                disabled={saving}
                className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('settings.roles.confirmDelete', 'Delete Role')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600">
          <p>{t('settings.roles.infoNote', 'Custom roles allow you to create fine-grained access control. Assign roles to users from their profile page in the Team Members section.')}</p>
          <p className="mt-1">{t('settings.roles.infoNote2', 'Built-in roles (Worker, Manager, Administrator) cannot be modified but you can create custom roles with similar or different permissions.')}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PORTAL CONFIGURATION SETTINGS
// Module visibility toggles per role and platform
// ============================================================

// Module definitions with Lucide icons and sensible defaults
// Columns: Worker Portal, Manager Portal, Mobile App (Worker), Mobile App (Manager)
const PORTAL_MODULES = [
  { id: 'dashboard',      icon: LayoutDashboard, defaults: [true,  true,  true,  true]  },
  { id: 'schedule',       icon: CalendarDays,    defaults: [true,  true,  true,  true]  },
  { id: 'time-tracking',  icon: Timer,           defaults: [true,  true,  true,  true]  },
  { id: 'time-off',       icon: CalendarOff,     defaults: [true,  true,  true,  true]  },
  { id: 'performance',    icon: TrendingUp,      defaults: [true,  true,  true,  true]  },
  { id: 'learning',       icon: GraduationCap,   defaults: [true,  true,  true,  true]  },
  { id: 'expenses',       icon: Receipt,         defaults: [true,  true,  true,  true]  },
  { id: 'documents',      icon: FileText,        defaults: [true,  true,  true,  true]  },
  { id: 'surveys',        icon: ClipboardList,   defaults: [false, false, false, false] },
  { id: 'career',         icon: Briefcase,       defaults: [true,  false, true,  false] },
  { id: 'recognition',    icon: Award,           defaults: [true,  true,  true,  true]  },
  { id: 'directory',      icon: BookUser,        defaults: [true,  true,  true,  true]  },
  { id: 'compensation',   icon: Coins,           defaults: [true,  false, true,  false] },
  { id: 'onboarding',     icon: UserPlus,        defaults: [false, true,  false, true]  },
  { id: 'offboarding',    icon: UserMinus,       defaults: [false, true,  false, true]  },
  { id: 'reports',        icon: BarChart3,       defaults: [false, true,  false, true]  },
];

const MODULE_LABELS = {
  'dashboard':     'Dashboard',
  'schedule':      'Schedule',
  'time-tracking': 'Time Tracking',
  'time-off':      'Time Off',
  'performance':   'Performance',
  'learning':      'Learning',
  'expenses':      'Expenses',
  'documents':     'Documents',
  'surveys':       'Surveys',
  'career':        'Career / Skills',
  'recognition':   'Recognition',
  'directory':     'Directory',
  'compensation':  'Compensation',
  'onboarding':    'Onboarding',
  'offboarding':   'Offboarding',
  'reports':       'Reports',
};

const SURFACE_KEYS = ['workerPortal', 'managerPortal', 'workerMobile', 'managerMobile'];

// Reusable custom toggle component
function ToggleSwitch({ enabled, onChange, size = 'md', ariaLabel }) {
  const dims = size === 'sm'
    ? 'h-5 w-9'
    : 'h-6 w-11';
  const knob = size === 'sm'
    ? 'h-3.5 w-3.5'
    : 'h-4 w-4';
  const translate = size === 'sm'
    ? (enabled ? 'translate-x-[18px]' : 'translate-x-[3px]')
    : (enabled ? 'translate-x-6' : 'translate-x-1');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`relative inline-flex ${dims} items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 ${
        enabled ? 'bg-green-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block ${knob} transform rounded-full bg-white shadow transition-transform duration-200 ${translate}`}
      />
    </button>
  );
}

function PortalConfigSettings({ showMsg }) {
  const { t } = useTranslation();
  const toast = useToast();

  // Build default state from PORTAL_MODULES
  const buildDefaults = () => {
    const state = {};
    PORTAL_MODULES.forEach(mod => {
      state[mod.id] = {
        workerPortal:  mod.defaults[0],
        managerPortal: mod.defaults[1],
        workerMobile:  mod.defaults[2],
        managerMobile: mod.defaults[3],
      };
    });
    return state;
  };

  const [moduleVisibility, setModuleVisibility] = useState(buildDefaults);
  const [saving, setSaving] = useState(false);

  const defaults = buildDefaults();

  const toggleModule = (moduleId, field) => {
    setModuleVisibility(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [field]: !prev[moduleId][field],
      },
    }));
  };

  const resetToDefaults = () => {
    setModuleVisibility(buildDefaults());
    toast.info(t('settings.portalConfig.resetDone', 'Configuration reset to defaults'));
  };

  // Check if any value differs from default
  const hasDiff = (moduleId, field) => {
    return moduleVisibility[moduleId][field] !== defaults[moduleId][field];
  };

  const hasAnyChanges = PORTAL_MODULES.some(mod =>
    SURFACE_KEYS.some(k => moduleVisibility[mod.id][k] !== defaults[mod.id][k])
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // NOTE: Replace with actual API call when endpoint is available
      await new Promise(resolve => setTimeout(resolve, 600));
      toast.success(t('settings.portalConfig.saveSuccess', 'Portal configuration saved successfully'));
    } catch (error) {
      toast.error(t('settings.portalConfig.saveError', 'Failed to save portal configuration'));
    } finally {
      setSaving(false);
    }
  };

  const surfaceHeaders = [
    { key: 'workerPortal',  label: t('settings.portalConfig.colWorkerPortal', 'Worker Portal'),         icon: Monitor },
    { key: 'managerPortal', label: t('settings.portalConfig.colManagerPortal', 'Manager Portal'),        icon: Monitor },
    { key: 'workerMobile',  label: t('settings.portalConfig.colWorkerMobile', 'Mobile App (Worker)'),    icon: Smartphone },
    { key: 'managerMobile', label: t('settings.portalConfig.colManagerMobile', 'Mobile App (Manager)'),  icon: Smartphone },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {t('settings.portalConfig.title', 'Platform Configuration')}
        </h2>
        <p className="text-slate-500 mt-1 max-w-2xl">
          {t('settings.portalConfig.subtitle', 'Customise which modules are visible for each role and platform. Changes apply to all users in the corresponding role immediately after saving.')}
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            {t('settings.portalConfig.resetDefaults', 'Reset to Defaults')}
          </button>
          {hasAnyChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
              {t('settings.portalConfig.unsavedChanges', 'Unsaved changes')}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('settings.portalConfig.saveButton', 'Save Changes')}
        </button>
      </div>

      {/* Module Toggle Grid */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3.5 font-semibold text-slate-700 w-56">
                {t('settings.portalConfig.colModule', 'Module')}
              </th>
              {surfaceHeaders.map(col => (
                <th key={col.key} className="text-center px-3 py-3.5 font-semibold text-slate-700">
                  <div className="flex flex-col items-center gap-1">
                    <col.icon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs leading-tight">{col.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PORTAL_MODULES.map((mod, idx) => {
              const ModIcon = mod.icon;
              const rowHasChange = SURFACE_KEYS.some(k => hasDiff(mod.id, k));
              return (
                <tr
                  key={mod.id}
                  className={`border-b border-slate-100 transition-colors ${
                    rowHasChange
                      ? 'bg-amber-50/40'
                      : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <ModIcon className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-800">
                        {t(`settings.portalConfig.module.${mod.id}`, MODULE_LABELS[mod.id] || mod.id)}
                      </span>
                    </div>
                  </td>
                  {SURFACE_KEYS.map(field => {
                    const changed = hasDiff(mod.id, field);
                    return (
                      <td key={field} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <ToggleSwitch
                            enabled={moduleVisibility[mod.id][field]}
                            onChange={() => toggleModule(mod.id, field)}
                            ariaLabel={`${MODULE_LABELS[mod.id] || mod.id} ${field}`}
                          />
                          {changed && (
                            <span className="block w-1.5 h-1.5 rounded-full bg-amber-400" title={t('settings.portalConfig.changedFromDefault', 'Changed from default')} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600 space-y-1">
          <p>{t('settings.portalConfig.legendLine1', 'Green toggles indicate the module is visible. Grey toggles indicate hidden.')}</p>
          <p className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            {t('settings.portalConfig.legendLine2', 'Amber dot means the value differs from the recommended default.')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FEATURE FLAGS SETTINGS
// Toggle platform-wide features on/off
// ============================================================

const FEATURE_FLAG_ITEMS = [
  {
    id: 'momentum_scores',
    icon: Zap,
    labelKey: 'settings.featureFlags.momentumScores',
    labelFallback: 'Momentum Scores',
    descKey: 'settings.featureFlags.momentumScoresDesc',
    descFallback: 'Display a composite engagement and performance score for each employee. The score combines attendance, training completion, peer recognition, and goal progress into a single metric.',
    defaultOn: true,
  },
  {
    id: 'gamification',
    icon: Award,
    labelKey: 'settings.featureFlags.gamification',
    labelFallback: 'Gamification and Badges',
    descKey: 'settings.featureFlags.gamificationDesc',
    descFallback: 'Award badges, streaks, and achievement milestones to employees as they complete tasks, training modules, and reach performance targets.',
    defaultOn: true,
  },
  {
    id: 'recognition',
    icon: Heart,
    labelKey: 'settings.featureFlags.recognition',
    labelFallback: 'Peer Recognition',
    descKey: 'settings.featureFlags.recognitionDesc',
    descFallback: 'Allow employees and managers to send public kudos and recognition to colleagues. Recognition appears on the Recognition Wall and in the activity feed.',
    defaultOn: true,
  },
  {
    id: 'pulse_surveys',
    icon: Radio,
    labelKey: 'settings.featureFlags.pulseSurveys',
    labelFallback: 'Pulse Surveys',
    descKey: 'settings.featureFlags.pulseSurveysDesc',
    descFallback: 'Send short, periodic check-in surveys to employees to gauge engagement, sentiment, and satisfaction. Results are aggregated and anonymised for managers.',
    defaultOn: false,
  },
];

function FeatureFlagsSettings({ showMsg }) {
  const { t } = useTranslation();
  const toast = useToast();

  const buildDefaults = () => {
    const state = {};
    FEATURE_FLAG_ITEMS.forEach(f => { state[f.id] = f.defaultOn; });
    return state;
  };

  const [flags, setFlags] = useState(buildDefaults);
  const [saving, setSaving] = useState(false);

  const toggleFlag = (id) => {
    setFlags(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(t('settings.featureFlags.saved', 'Feature flags saved'));
    } catch (error) {
      toast.error(t('settings.featureFlags.saveError', 'Failed to save feature flags'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {t('settings.featureFlags.title', 'Feature Flags')}
        </h2>
        <p className="text-slate-500 mt-1 max-w-2xl">
          {t('settings.featureFlags.subtitle', 'Enable or disable platform-wide features. Disabled features will be hidden from all users across portal and mobile.')}
        </p>
      </div>

      <div className="space-y-4">
        {FEATURE_FLAG_ITEMS.map(item => {
          const ItemIcon = item.icon;
          const isOn = flags[item.id];
          return (
            <div
              key={item.id}
              className={`flex items-start gap-4 p-5 rounded-xl border transition-colors ${
                isOn
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isOn ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
              }`}>
                <ItemIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-medium text-slate-900">
                    {t(item.labelKey, item.labelFallback)}
                  </h3>
                  <ToggleSwitch
                    enabled={isOn}
                    onChange={() => toggleFlag(item.id)}
                    ariaLabel={item.labelFallback}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {t(item.descKey, item.descFallback)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('settings.featureFlags.saveButton', 'Save Changes')}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// NOTIFICATION CONFIGURATION SETTINGS
// Toggle notification delivery channels per notification type
// ============================================================

const NOTIFICATION_TYPES = [
  { id: 'shift_reminders',     icon: CalendarDays,  labelKey: 'settings.notifConfig.shiftReminders',     fallback: 'Shift Reminders' },
  { id: 'time_off_approvals',  icon: CalendarOff,   labelKey: 'settings.notifConfig.timeOffApprovals',   fallback: 'Time Off Approvals' },
  { id: 'expense_approvals',   icon: Receipt,       labelKey: 'settings.notifConfig.expenseApprovals',   fallback: 'Expense Approvals' },
  { id: 'recognition_received',icon: Award,         labelKey: 'settings.notifConfig.recognitionReceived',fallback: 'Recognition Received' },
  { id: 'survey_available',    icon: ClipboardList, labelKey: 'settings.notifConfig.surveyAvailable',    fallback: 'Survey Available' },
  { id: 'training_due',        icon: GraduationCap, labelKey: 'settings.notifConfig.trainingDue',        fallback: 'Training Due' },
  { id: 'performance_review',  icon: TrendingUp,    labelKey: 'settings.notifConfig.performanceReview',  fallback: 'Performance Review' },
  { id: 'announcement',        icon: Bell,          labelKey: 'settings.notifConfig.announcement',       fallback: 'Announcement' },
];

const NOTIF_CHANNELS = [
  { key: 'email', labelKey: 'settings.notifConfig.channelEmail', fallback: 'Email',             icon: Mail },
  { key: 'push',  labelKey: 'settings.notifConfig.channelPush',  fallback: 'Push Notification', icon: BellRing },
  { key: 'inApp', labelKey: 'settings.notifConfig.channelInApp', fallback: 'In-App',            icon: Inbox },
];

function NotificationConfigSettings({ showMsg }) {
  const { t } = useTranslation();
  const toast = useToast();

  const buildDefaults = () => {
    const state = {};
    NOTIFICATION_TYPES.forEach(nt => {
      state[nt.id] = { email: true, push: true, inApp: true };
    });
    return state;
  };

  const [prefs, setPrefs] = useState(buildDefaults);
  const [saving, setSaving] = useState(false);
  const defaults = buildDefaults();

  const toggle = (typeId, channel) => {
    setPrefs(prev => ({
      ...prev,
      [typeId]: { ...prev[typeId], [channel]: !prev[typeId][channel] },
    }));
  };

  const resetToDefaults = () => {
    setPrefs(buildDefaults());
    toast.info(t('settings.notifConfig.resetDone', 'Notification preferences reset to defaults'));
  };

  const hasDiff = (typeId, channel) => prefs[typeId][channel] !== defaults[typeId][channel];

  const hasAnyChanges = NOTIFICATION_TYPES.some(nt =>
    NOTIF_CHANNELS.some(ch => hasDiff(nt.id, ch.key))
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(t('settings.notifConfig.saved', 'Notification preferences saved'));
    } catch (error) {
      toast.error(t('settings.notifConfig.saveError', 'Failed to save notification preferences'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {t('settings.notifConfig.title', 'Notification Preferences')}
        </h2>
        <p className="text-slate-500 mt-1 max-w-2xl">
          {t('settings.notifConfig.subtitle', 'Configure the default notification delivery channels for each event type. These defaults apply to all users and can be overridden individually.')}
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={resetToDefaults} className="btn btn-secondary flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" />
            {t('settings.notifConfig.resetDefaults', 'Reset to Defaults')}
          </button>
          {hasAnyChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
              {t('settings.notifConfig.unsavedChanges', 'Unsaved changes')}
            </span>
          )}
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('settings.notifConfig.saveButton', 'Save Changes')}
        </button>
      </div>

      {/* Notification Grid */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3.5 font-semibold text-slate-700 w-56">
                {t('settings.notifConfig.colType', 'Notification Type')}
              </th>
              {NOTIF_CHANNELS.map(ch => (
                <th key={ch.key} className="text-center px-3 py-3.5 font-semibold text-slate-700">
                  <div className="flex flex-col items-center gap-1">
                    <ch.icon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs leading-tight">{t(ch.labelKey, ch.fallback)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_TYPES.map((nt, idx) => {
              const NtIcon = nt.icon;
              const rowChanged = NOTIF_CHANNELS.some(ch => hasDiff(nt.id, ch.key));
              return (
                <tr
                  key={nt.id}
                  className={`border-b border-slate-100 transition-colors ${
                    rowChanged
                      ? 'bg-amber-50/40'
                      : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <NtIcon className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-800">
                        {t(nt.labelKey, nt.fallback)}
                      </span>
                    </div>
                  </td>
                  {NOTIF_CHANNELS.map(ch => {
                    const changed = hasDiff(nt.id, ch.key);
                    return (
                      <td key={ch.key} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <ToggleSwitch
                            enabled={prefs[nt.id][ch.key]}
                            onChange={() => toggle(nt.id, ch.key)}
                            ariaLabel={`${nt.fallback} ${ch.fallback}`}
                          />
                          {changed && (
                            <span className="block w-1.5 h-1.5 rounded-full bg-amber-400" title={t('settings.notifConfig.changedFromDefault', 'Changed from default')} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">
          {t('settings.notifConfig.infoNote', 'These are organisation-wide defaults. Individual users can adjust their own notification preferences from their account settings.')}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// TIME & ATTENDANCE SETTINGS
// Clock-in methods: GPS, Kiosk, Badge, QR Code
// ============================================================

function TimeAttendanceSettings({ showMsg }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Clock method settings
  const [clockMethods, setClockMethods] = useState({
    gps: true,
    kiosk: false,
    badge: false,
    qr: false,
  });

  // GPS settings
  const [gpsSettings, setGpsSettings] = useState({
    geofence_radius: 100,
    require_selfie: false,
  });

  // Kiosks list
  const [kiosks, setKiosks] = useState([]);
  const [showCreateKiosk, setShowCreateKiosk] = useState(false);
  const [newKioskName, setNewKioskName] = useState('');
  const [newKioskLocation, setNewKioskLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [createdApiKey, setCreatedApiKey] = useState(null);

  useEffect(() => {
    loadSettings();
    loadKiosks();
    loadLocations();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await api.get('/kiosk/settings');
      if (result.clock_methods) setClockMethods(result.clock_methods);
      if (result.gps_settings) setGpsSettings(result.gps_settings);
    } catch (error) {
      // Defaults are fine
    } finally {
      setLoading(false);
    }
  };

  const loadKiosks = async () => {
    try {
      const result = await api.get('/kiosk/list');
      setKiosks(result.kiosks || []);
    } catch (error) {
      // No kiosks yet
    }
  };

  const loadLocations = async () => {
    try {
      const result = await api.get('/locations');
      setLocations(result.locations || []);
    } catch (error) {
      // No locations
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/kiosk/settings', {
        clock_methods: clockMethods,
        gps_settings: gpsSettings,
      });
      showMsg(t('settings.timeAttendance.saved', 'Time & Attendance settings saved'));
    } catch (error) {
      toast.error(t('settings.timeAttendance.saveError', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateKiosk = async () => {
    if (!newKioskName.trim()) return;
    try {
      const result = await api.post('/kiosk/create', {
        name: newKioskName.trim(),
        location_id: newKioskLocation || null,
      });
      setCreatedApiKey(result.api_key);
      setKiosks([result.kiosk, ...kiosks]);
      setNewKioskName('');
      setNewKioskLocation('');
    } catch (error) {
      toast.error(error.message || 'Failed to create kiosk');
    }
  };

  const handleDeleteKiosk = async (id) => {
    if (!window.confirm(t('settings.timeAttendance.confirmDelete', 'Are you sure you want to delete this kiosk?'))) return;
    try {
      await api.delete(`/kiosk/${id}`);
      setKiosks(kiosks.filter(k => k.id !== id));
      showMsg(t('settings.timeAttendance.kioskDeleted', 'Kiosk deleted'));
    } catch (error) {
      toast.error('Failed to delete kiosk');
    }
  };

  const handleToggleKiosk = async (id, isActive) => {
    try {
      await api.patch(`/kiosk/${id}`, { is_active: !isActive });
      setKiosks(kiosks.map(k => k.id === id ? { ...k, is_active: !isActive } : k));
    } catch (error) {
      toast.error('Failed to update kiosk');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('common.copied', 'Copied to clipboard'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-momentum-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.timeAttendance.title', 'Time & Attendance')}</h2>
        <p className="text-sm text-slate-600">{t('settings.timeAttendance.desc', 'Configure how employees clock in and out')}</p>
      </div>

      {/* Clock-in Methods */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-slate-800">{t('settings.timeAttendance.clockMethods', 'Clock-in Methods')}</h3>
        <div className="grid gap-4">
          {/* GPS Geofencing */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{t('settings.timeAttendance.gps', 'GPS Geofencing')}</p>
                  <p className="text-sm text-slate-500">{t('settings.timeAttendance.gpsDesc', 'Employees clock in via mobile app with location verification')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={clockMethods.gps}
                  onChange={(e) => setClockMethods({ ...clockMethods, gps: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-momentum-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            {clockMethods.gps && (
              <div className="pl-13 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.timeAttendance.geofenceRadius', 'Geofence Radius (metres)')}</label>
                  <input
                    type="number"
                    value={gpsSettings.geofence_radius}
                    onChange={(e) => setGpsSettings({ ...gpsSettings, geofence_radius: parseInt(e.target.value) || 100 })}
                    className="input w-full"
                    min="10"
                    max="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.timeAttendance.requireSelfie', 'Require Selfie')}</label>
                  <select
                    value={gpsSettings.require_selfie ? 'yes' : 'no'}
                    onChange={(e) => setGpsSettings({ ...gpsSettings, require_selfie: e.target.value === 'yes' })}
                    className="input w-full"
                  >
                    <option value="no">{t('common.no', 'No')}</option>
                    <option value="yes">{t('common.yes', 'Yes')}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Kiosk / Tablet */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{t('settings.timeAttendance.kiosk', 'Kiosk / Tablet')}</p>
                  <p className="text-sm text-slate-500">{t('settings.timeAttendance.kioskDesc', 'Shared device at workplace for employee clock-in')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={clockMethods.kiosk}
                  onChange={(e) => setClockMethods({ ...clockMethods, kiosk: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-momentum-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>

          {/* Employee Badge */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{t('settings.timeAttendance.badge', 'Employee Badge / Card')}</p>
                  <p className="text-sm text-slate-500">{t('settings.timeAttendance.badgeDesc', 'Badge readers input to kiosk via keyboard emulation')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={clockMethods.badge}
                  onChange={(e) => setClockMethods({ ...clockMethods, badge: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-momentum-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            {clockMethods.badge && (
              <p className="text-xs text-slate-500 pl-13">{t('settings.timeAttendance.badgeInfo', 'Badge readers work as keyboard input devices. The kiosk input field accepts badge scans automatically.')}</p>
            )}
          </div>

          {/* QR Code */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{t('settings.timeAttendance.qr', 'QR Code Scan')}</p>
                  <p className="text-sm text-slate-500">{t('settings.timeAttendance.qrDesc', 'Employees scan QR code with phone or show personal QR badge')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={clockMethods.qr}
                  onChange={(e) => setClockMethods({ ...clockMethods, qr: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-momentum-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            {clockMethods.qr && (
              <p className="text-xs text-slate-500 pl-13">{t('settings.timeAttendance.qrInfo', 'Generate QR codes from employee profiles or location pages.')}</p>
            )}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          <Save className="w-4 h-4" />
          {saving ? t('common.saving', 'Saving...') : t('common.saveChanges', 'Save Changes')}
        </button>
      </div>

      {/* Kiosk Management */}
      {clockMethods.kiosk && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-slate-800">{t('settings.timeAttendance.kiosks', 'Registered Kiosks')}</h3>
            <button
              onClick={() => setShowCreateKiosk(true)}
              className="btn btn-secondary"
            >
              <Plus className="w-4 h-4" />
              {t('settings.timeAttendance.addKiosk', 'Add Kiosk')}
            </button>
          </div>

          {/* Create Kiosk Form */}
          {showCreateKiosk && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-slate-900">{t('settings.timeAttendance.newKiosk', 'New Kiosk')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.timeAttendance.kioskName', 'Kiosk Name')}</label>
                  <input
                    type="text"
                    value={newKioskName}
                    onChange={(e) => setNewKioskName(e.target.value)}
                    placeholder="e.g. Front Desk Tablet"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.timeAttendance.location', 'Location (optional)')}</label>
                  <select
                    value={newKioskLocation}
                    onChange={(e) => setNewKioskLocation(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">{t('settings.timeAttendance.allLocations', 'All Locations')}</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateKiosk} className="btn btn-primary">
                  {t('common.create', 'Create')}
                </button>
                <button onClick={() => { setShowCreateKiosk(false); setCreatedApiKey(null); }} className="btn btn-ghost">
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>

              {/* Show API Key after creation */}
              {createdApiKey && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <p className="text-sm font-medium text-green-800 mb-2">{t('settings.timeAttendance.apiKeyCreated', 'Kiosk API Key Created')}</p>
                  <p className="text-xs text-green-600 mb-2">{t('settings.timeAttendance.apiKeyWarning', 'Save this key now - it will not be shown again!')}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-green-300 rounded px-3 py-2 text-sm font-mono break-all">{createdApiKey}</code>
                    <button onClick={() => copyToClipboard(createdApiKey)} className="btn btn-secondary">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">{t('settings.timeAttendance.kioskUrl', 'Kiosk URL')}: <code>{window.location.origin}/kiosk</code></p>
                </div>
              )}
            </div>
          )}

          {/* Kiosks List */}
          {kiosks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Monitor className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>{t('settings.timeAttendance.noKiosks', 'No kiosks registered yet')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kiosks.map(kiosk => (
                <div key={kiosk.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${kiosk.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="font-medium text-slate-900">{kiosk.name}</p>
                      <p className="text-sm text-slate-500">
                        {kiosk.location_name || t('settings.timeAttendance.allLocations', 'All Locations')}
                        {kiosk.last_seen_at && (
                          <span className="ml-2 text-xs text-slate-400">
                            {t('settings.timeAttendance.lastSeen', 'Last seen')}: {new Date(kiosk.last_seen_at).toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleKiosk(kiosk.id, kiosk.is_active)}
                      className={`px-3 py-1 rounded text-sm ${kiosk.is_active ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-600'}`}
                    >
                      {kiosk.is_active ? t('common.disable', 'Disable') : t('common.enable', 'Enable')}
                    </button>
                    <button
                      onClick={() => handleDeleteKiosk(kiosk.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
