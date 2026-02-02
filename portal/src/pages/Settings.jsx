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
  Palette, Check, Copy, Trash2, Play, Pause, Upload, Image, Crown, Sparkles
} from 'lucide-react';
import { brandingApi } from '../lib/api';
import { useBranding } from '../lib/branding';

// Tab configuration - names will be translated in the component
const TABS = [
  { id: 'organization', nameKey: 'settings.organization', icon: Building, adminOnly: true },
  { id: 'branding', nameKey: 'settings.branding', icon: Crown, adminOnly: true },
  { id: 'navigation', nameKey: 'settings.navigation', icon: Globe, adminOnly: true },
  { id: 'employee-visibility', nameKey: 'settings.employeeVisibility', icon: Eye, adminOnly: true },
  { id: 'users', nameKey: 'settings.users', icon: Users, adminOnly: true },
  { id: 'appearance', nameKey: 'settings.appearance', icon: Palette, adminOnly: false },
  { id: 'webhooks', nameKey: 'settings.webhooks', icon: Webhook, adminOnly: true },
  { id: 'account', nameKey: 'settings.myAccount', icon: User, adminOnly: false },
  { id: 'security', nameKey: 'settings.security', icon: Shield, adminOnly: false },
  { id: 'sessions', nameKey: 'settings.sessions', icon: Monitor, adminOnly: false },
  { id: 'privacy', nameKey: 'settings.privacyData', icon: Eye, adminOnly: false },
];

export default function Settings() {
  const { t } = useTranslation();
  const { user, isAdmin, logout } = useAuth();
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
      console.error('Failed to load settings:', error);
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
                {t(tab.nameKey)}
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
                  onSave={() => { loadData(); showMsg('Organization settings saved'); }}
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
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteUserModal 
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => { setShowInviteModal(false); loadData(); showMsg('Invitation sent'); }}
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
      console.error('Failed to save:', error);
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <select
            value={form.timezone}
            onChange={e => setForm({ ...form, timezone: e.target.value })}
            className="input"
          >
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="America/New_York">New York (EST/EDT)</option>
            <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
            <option value="Asia/Singapore">Singapore (SGT)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Week Starts On</label>
            <select
              value={form.weekStartsOn}
              onChange={e => setForm({ ...form, weekStartsOn: e.target.value })}
              className="input"
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Brand Color</label>
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
  const hasFeature = organization?.features?.includes('white_label') || organization?.plan === 'enterprise';

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
      console.debug('Failed to load branding');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await brandingApi.update(form);
      updateBranding({ ...form, ...logos });
      showMsg('Branding settings saved');
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
          <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
          <p className="text-sm text-slate-600">Customize the look and feel of your Uplift experience</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 p-8 text-center">
          <div className="absolute top-3 right-3">
            <Sparkles className="w-6 h-6 text-orange-400 animate-pulse" />
          </div>
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Upgrade to Enterprise for Custom Branding</h3>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            White-label your Uplift portal with your company logo, colors, and brand identity.
            Give your employees a seamless, branded experience.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto mb-6">
            {[
              { icon: Image, label: 'Custom Logo' },
              { icon: Palette, label: 'Brand Colors' },
              { icon: Crown, label: 'Login Screen' },
              { icon: Globe, label: 'Custom Favicon' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 bg-white/70 rounded-lg">
                <item.icon className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg shadow-lg shadow-orange-200 hover:shadow-xl hover:from-orange-600 hover:to-amber-600 transition-all">
            Contact Sales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
        <p className="text-sm text-slate-600">Customize the look and feel across portal and mobile app</p>
      </div>

      {/* Brand Name */}
      <div className="max-w-xl">
        <label className="block text-sm font-medium text-slate-700 mb-1">Brand Name</label>
        <input
          type="text"
          value={form.brand_name}
          onChange={e => setForm({ ...form, brand_name: e.target.value })}
          placeholder="Your Company Name"
          className="input"
        />
        <p className="text-xs text-slate-500 mt-1">Displayed in the sidebar and mobile app header</p>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Color</label>
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
        <h3 className="font-medium text-slate-900 border-b pb-2">Logos & Images</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LogoUploadZone
            label="Primary Logo"
            description="Displayed in the sidebar on light backgrounds. PNG, JPG, or SVG. Max 2MB."
            currentUrl={logos.logo_url}
            uploading={uploading === 'logo'}
            onUpload={(file) => handleFileUpload(file, 'logo')}
            onRemove={() => handleDeleteLogo('logo')}
          />
          <LogoUploadZone
            label="Dark Mode Logo"
            description="Used on dark backgrounds. Should be light/white version of your logo."
            currentUrl={logos.dark_logo_url}
            uploading={uploading === 'dark_logo'}
            onUpload={(file) => handleFileUpload(file, 'dark_logo')}
            onRemove={() => handleDeleteLogo('dark_logo')}
            dark
          />
          <LogoUploadZone
            label="Favicon"
            description="Browser tab icon. Ideally square, 32x32 or 64x64. PNG or ICO."
            currentUrl={logos.favicon_url}
            uploading={uploading === 'favicon'}
            onUpload={(file) => handleFileUpload(file, 'favicon')}
            onRemove={() => handleDeleteLogo('favicon')}
            small
          />
          <LogoUploadZone
            label="Login Background"
            description="Background image for the login screen. Recommended 1920x1080."
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
        <h3 className="font-medium text-slate-900 border-b pb-2">Live Preview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mobile App Header Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="text-xs font-medium text-slate-500 px-4 py-2 bg-slate-50 border-b">Mobile App Header</div>
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
            <div className="text-xs font-medium text-slate-500 px-4 py-2 bg-slate-50 border-b">Login Screen</div>
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
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}

function LogoUploadZone({ label, description, currentUrl, uploading, onUpload, onRemove, dark, small, wide }) {
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
            title="Remove"
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
              <span className="text-xs text-slate-500">Drop file or click to upload</span>
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
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Locked</span>;
    }
    switch (user.status) {
      case 'active': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Active</span>;
      case 'invited': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Invited</span>;
      case 'inactive': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">Inactive</span>;
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
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">User</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Role</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Last Login</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">Actions</th>
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
                          <Key className="w-3.5 h-3.5 inline ml-1 text-amber-500" title="Password change required" />
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
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
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
      console.error('Failed to load user data:', error);
    }
  };

  const handleAction = async (action, data = {}) => {
    setLoading(true);
    try {
      switch (action) {
        case 'unlock':
          await api.post(`/users/${user.id}/unlock`);
          showMsg('Account unlocked');
          break;
        case 'deactivate':
          await api.post(`/users/${user.id}/deactivate`, { reason: data.reason });
          showMsg('Account deactivated');
          break;
        case 'reactivate':
          await api.post(`/users/${user.id}/reactivate`);
          showMsg('Account reactivated');
          break;
        case 'changeRole':
          await api.patch(`/users/${user.id}/role`, { role: data.role });
          showMsg('Role updated');
          break;
        case 'forcePasswordReset':
          await api.post(`/users/${user.id}/force-password-reset`);
          showMsg('Password reset required on next login');
          break;
        case 'resendInvitation':
          await api.post(`/users/${user.id}/resend-invitation`);
          showMsg('Invitation resent');
          break;
        case 'cancelInvitation':
          await api.post(`/users/${user.id}/cancel-invitation`);
          showMsg('Invitation cancelled');
          break;
        case 'revokeSessions':
          await api.post(`/users/${user.id}/sessions/revoke-all`);
          showMsg('All sessions revoked');
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
                  <span className="text-slate-500">Role</span>
                  <select
                    value={user.role}
                    onChange={(e) => handleAction('changeRole', { role: e.target.value })}
                    className="input mt-1"
                    disabled={loading}
                  >
                    <option value="worker">Worker</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-500">Status</span>
                  <p className="mt-1 font-medium">{isLocked ? 'Locked' : user.status}</p>
                </div>
                <div>
                  <span className="text-slate-500">Email Verified</span>
                  <p className="mt-1">{user.email_verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <span className="text-slate-500">MFA Enabled</span>
                  <p className="mt-1">{user.mfa_enabled ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Last Login</span>
                  <p className="mt-1">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Created</span>
                  <p className="mt-1">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'sessions' && (
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No active sessions</p>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {s.device_type === 'mobile' ? <Smartphone className="w-5 h-5 text-slate-400" /> : <Monitor className="w-5 h-5 text-slate-400" />}
                      <div>
                        <p className="font-medium text-sm">{s.device_name || 'Unknown Device'}</p>
                        <p className="text-xs text-slate-500">{s.browser} • {s.ip_address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {s.is_current && <span className="text-xs text-green-600 font-medium">Current</span>}
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
                <p className="text-slate-500 text-center py-8">No activity recorded</p>
              ) : (
                activity.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{a.ip_address}</p>
                    </div>
                    <div className="text-right">
                      {!a.success && <span className="text-xs text-red-600">Failed</span>}
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
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Invite Team Member</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input type="text" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input type="text" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input">
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Sending...' : 'Send Invitation'}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input type="text" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input type="text" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn btn-primary">
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Changes'}
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
          Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input type="password" required value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input type="password" required minLength={8} value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="input" />
            <p className="text-xs text-slate-500 mt-1">At least 8 characters with uppercase, lowercase, and number</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <input type="password" required value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="input" />
          </div>
          <button type="submit" disabled={changing} className="btn btn-primary">
            {changing ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* MFA */}
      <div className="max-w-xl pt-6 border-t">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-400" />
          Two-Factor Authentication
        </h3>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium">Authenticator App</p>
            <p className="text-sm text-slate-500">Add an extra layer of security</p>
          </div>
          <button onClick={toggleMfa} className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mfaEnabled 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}>
            {mfaEnabled ? 'Enabled' : 'Enable'}
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
          <h2 className="text-lg font-semibold text-slate-900">Active Sessions</h2>
          <p className="text-sm text-slate-600">Manage your logged-in devices</p>
        </div>
        {sessions.length > 1 && (
          <button onClick={revokeOthers} disabled={revoking} className="btn btn-secondary text-red-600">
            <RefreshCw className="w-4 h-4" />
            Sign Out Other Devices
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
                  {s.device_name || 'Unknown Device'}
                  {s.is_current && <span className="ml-2 text-xs text-green-600 font-medium">This device</span>}
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
                {revoking === s.id ? 'Revoking...' : 'Revoke'}
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
    { id: 'light', name: 'Light', icon: Sun, description: 'Clean, bright interface' },
    { id: 'dark', name: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { id: 'system', name: 'System', icon: Monitor, description: 'Match device settings' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
        <p className="text-sm text-slate-600">Customize how Uplift looks for you</p>
      </div>

      <div>
        <h3 className="font-medium text-slate-900 mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                theme === t.id
                  ? 'border-momentum-500 bg-momentum-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                theme === t.id ? 'bg-momentum-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <t.icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-900">{t.name}</p>
              <p className="text-sm text-slate-500">{t.description}</p>
              {theme === t.id && (
                <div className="mt-2 flex items-center gap-1 text-momentum-600 text-sm font-medium">
                  <Check className="w-4 h-4" /> Active
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
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      // TODO: Replace with webhooksApi.list() when available
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
      // TODO: Replace with webhooksApi.update() when available
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
      // TODO: Replace with webhooksApi.delete() when available
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
          <h2 className="text-lg font-semibold text-slate-900">Webhooks</h2>
          <p className="text-sm text-slate-600">Integrate with external systems via HTTP callbacks</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Webhook
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
          <p className="font-medium text-slate-700">No webhooks configured</p>
          <p className="text-sm mt-1">Add a webhook to integrate with external systems</p>
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
                  title="View details"
                >
                  <Eye className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => deleteWebhook(webhook.id)}
                  className="p-2 hover:bg-red-50 rounded-lg"
                  title="Delete webhook"
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
        <h3 className="font-medium text-slate-900 mb-4">Available Event Types</h3>
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
      // TODO: Replace with webhooksApi.create() when available
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
          <h2 className="text-lg font-semibold">Add Webhook</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="e.g., Slack Notifications"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Endpoint URL *</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="input font-mono text-sm"
              placeholder="https://your-server.com/webhook"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Secret (optional)</label>
            <input
              type="text"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              className="input font-mono text-sm"
              placeholder="Your webhook secret for signature verification"
            />
            <p className="text-xs text-slate-500 mt-1">Used to sign webhook payloads for verification</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Events to Subscribe *</label>
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
            <p className="text-xs text-slate-500 mt-1">{form.events.length} events selected</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Creating...' : 'Create Webhook'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WebhookDetailModal({ webhook, onClose }) {
  const [copied, setCopied] = useState(false);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadDeliveryLogs();
  }, [webhook.id]);

  const loadDeliveryLogs = async () => {
    try {
      // TODO: Replace with webhooksApi.getDeliveries() when available
      const result = await api.get(`/webhooks/${webhook.id}/deliveries`);
      setDeliveryLogs(result?.deliveries || []);
      setStats(result?.stats || null);
    } catch (error) {
      console.error('Failed to load delivery logs:', error);
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
            <p className="text-sm text-slate-500">Webhook Details</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* URL */}
          <div>
            <label className="text-sm font-medium text-slate-500">Endpoint URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 p-3 bg-slate-100 rounded-lg text-sm font-mono break-all">{webhook.url}</code>
              <button onClick={copyUrl} className="btn btn-secondary shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Events */}
          <div>
            <label className="text-sm font-medium text-slate-500">Subscribed Events</label>
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
              <p className="text-sm text-slate-500">Success Rate</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats.totalDeliveries ?? '--'}</p>
              <p className="text-sm text-slate-500">Total Deliveries</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats.avgResponseTime ? `~${stats.avgResponseTime}ms` : '--'}</p>
              <p className="text-sm text-slate-500">Avg Response Time</p>
            </div>
          </div>
          )}

          {/* Delivery Logs */}
          <div>
            <label className="text-sm font-medium text-slate-500">Recent Deliveries</label>
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-momentum-500" />
              </div>
            ) : deliveryLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">No deliveries yet</p>
            ) : (
            <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Time</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Event</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Status</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">Response</th>
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
  const [pages, setPages] = useState([]);
  const [roleVisibility, setRoleVisibility] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNavigationSettings();
  }, []);

  const loadNavigationSettings = async () => {
    try {
      // TODO: Replace with organizationApi.getNavigation() when available
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
      // TODO: Replace with organizationApi.updateNavigation() when available
      await api.put('/organization/navigation', { roleVisibility: newVisibility });
      setRoleVisibility(newVisibility);
    } catch (error) {
      showMsg('Failed to update navigation', 'error');
    }
  };

  const roles = [
    { id: 'worker', name: 'Workers', description: 'Regular employees' },
    { id: 'manager', name: 'Managers', description: 'Team leads and supervisors' },
    { id: 'admin', name: 'Admins', description: 'Full access administrators' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Navigation & Page Visibility</h2>
        <p className="text-sm text-slate-600">Control which pages are visible to different user roles</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">No pages configured</p>
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
            <h4 className="font-medium text-blue-900">About Page Visibility</h4>
            <p className="text-sm text-blue-700 mt-1">
              Pages you disable will be hidden from the navigation menu for that role.
              Users won't be able to access those pages directly either.
              The Dashboard is always visible as it's the landing page.
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
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      // TODO: Replace with employeesApi.listWithVisibility() when available
      const result = await api.get('/employees?include=visibility');
      setEmployees(result?.employees || []);
    } catch (error) {
      showMsg('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const visibilityFeatures = [
    { id: 'team_schedules', name: 'Team Schedules', description: 'View other team members schedules' },
    { id: 'internal_jobs', name: 'Internal Jobs', description: 'Access internal job postings' },
    { id: 'career_paths', name: 'Career Paths', description: 'View career development paths' },
    { id: 'analytics', name: 'Team Analytics', description: 'Access performance analytics' },
    { id: 'peer_recognition', name: 'Peer Recognition', description: 'Send and receive peer kudos' },
  ];

  const toggleVisibility = async (empId, feature) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const newVisibility = { ...emp.visibility, [feature]: !emp.visibility[feature] };
    try {
      // TODO: Replace with employeesApi.updateVisibility() when available
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
      // TODO: Replace with employeesApi.updateVisibility() when available
      await api.put(`/employees/${empId}/visibility`, newVisibility);
      setEmployees(prev => prev.map(e =>
        e.id === empId ? { ...e, visibility: newVisibility } : e
      ));
    } catch (error) {
      showMsg('Failed to update visibility', 'error');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'probation':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Probation</span>;
      case 'active':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Active</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Employee Visibility Settings</h2>
        <p className="text-sm text-slate-600">Control which features each employee can access</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search employees..."
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
          <p className="font-medium text-slate-700">{searchQuery ? 'No employees match your search' : 'No employees found'}</p>
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
                  {emp.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{emp.name}</p>
                    {getStatusBadge(emp.status)}
                  </div>
                  <p className="text-sm text-slate-500">{emp.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {visibilityFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className={`w-2 h-2 rounded-full ${
                        emp.visibility[feature.id] ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                      title={`${feature.name}: ${emp.visibility[feature.id] ? 'Enabled' : 'Disabled'}`}
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
                  <h4 className="text-sm font-medium text-slate-700">Feature Access</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAllForEmployee(emp.id, true)}
                      className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      Enable All
                    </button>
                    <button
                      onClick={() => toggleAllForEmployee(emp.id, false)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Disable All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibilityFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        emp.visibility[feature.id]
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
                          emp.visibility[feature.id] ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                            emp.visibility[feature.id] ? 'translate-x-6' : 'translate-x-1'
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
                      <p className="font-medium">Probation Period</p>
                      <p className="text-amber-700">Some features are restricted during the probation period. These will be automatically enabled once probation ends.</p>
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
            <h4 className="font-medium text-blue-900">About Employee Visibility</h4>
            <p className="text-sm text-blue-700 mt-1">
              These settings control which features are visible to each employee.
              Employees on probation have restricted access by default, which can be
              customized based on your organization's policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccentColorPicker({ showMsg }) {
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
      // TODO: Replace with organizationApi.updateAccentColor() or user preferences API when available
      await api.put('/users/me/preferences', { accentColor: color });
    } catch (error) {
      showMsg('Failed to save accent color', 'error');
    }
  };

  const colors = ['#FF6B35', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];

  return (
    <div className="pt-6 border-t">
      <h3 className="font-medium text-slate-900 mb-4">Accent Color</h3>
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
      <p className="text-sm text-slate-500 mt-2">Choose your preferred accent color</p>
    </div>
  );
}

// ============================================================
// PRIVACY & DATA SETTINGS (GDPR)
// ============================================================

function PrivacySettings({ user, showMsg, logout }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/users/me/data-export', {
        credentials: 'include',
      });
      const blob = await response.blob();
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
        <h2 className="text-lg font-semibold text-slate-900">Privacy & Data</h2>
        <p className="text-sm text-slate-600">Manage your personal data and account</p>
      </div>

      {/* Export Data */}
      <div className="p-4 border border-slate-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-900">Export Your Data</h3>
            <p className="text-sm text-slate-600 mt-1">Download a copy of all your personal data including profile, activity logs, time entries, and shifts.</p>
            <button onClick={exportData} disabled={exporting} className="btn btn-secondary mt-3">
              {exporting ? 'Preparing...' : 'Download My Data'}
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
            <h3 className="font-medium text-red-900">Delete Account</h3>
            {hasPendingDeletion ? (
              <>
                <p className="text-sm text-red-700 mt-1">Your account is scheduled for deletion. It will be permanently removed in 30 days.</p>
                <button 
                  onClick={async () => {
                    await api.post('/users/me/cancel-deletion');
                    showMsg('Deletion cancelled');
                  }} 
                  className="btn btn-secondary mt-3"
                >
                  Cancel Deletion
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-red-700 mt-1">Permanently delete your account and all associated data. This action cannot be undone after the 30-day grace period.</p>
                <button onClick={() => setShowDeleteConfirm(true)} className="btn mt-3 bg-red-600 text-white hover:bg-red-700">
                  Request Account Deletion
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
              <h2 className="text-lg font-semibold">Delete Account</h2>
            </div>
            <p className="text-slate-600 mb-4">
              This will schedule your account for permanent deletion. You have 30 days to cancel this request. After that, all your data will be permanently removed.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Enter your password to confirm</label>
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="input"
                placeholder="Your password"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={requestDeletion} disabled={deleting} className="btn bg-red-600 text-white hover:bg-red-700">
                {deleting ? 'Processing...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
