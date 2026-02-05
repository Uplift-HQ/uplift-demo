// ============================================================
// UPLIFT ADMIN PORTAL - INTEGRATION HUB
// Comprehensive integration management interface
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plug, Plus, Check, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw,
  Settings, Code, Activity, Search, Filter, ChevronRight, ChevronDown,
  ExternalLink, Trash2, Play, Pause, Eye, EyeOff, Copy, TestTube,
  ArrowLeftRight, ArrowRight, ArrowLeft, Calendar, Database, Shield,
  MessageSquare, DollarSign, Users, BarChart3, Building, Briefcase,
  Video, CreditCard, Zap, GraduationCap, LineChart, Workflow, Key,
  Globe, FileSpreadsheet, Heart, Phone, Calculator, Fingerprint,
  Timer, X, Info, Bell, Link, Unlink, RotateCcw, Download, Upload,
  AlertCircle, CheckCircle2, History, Webhook, Server, Lock
} from 'lucide-react';
import ApiFactory from './ApiFactory';
import RestApiKeys from './RestApiKeys';
import { integrationsApi } from '../lib/api';

// -------------------- TYPES --------------------

const getIntegrationCategories = (t) => ({
  hris: { label: t('integrations.categories.hris', 'HRIS'), description: t('integrations.categories.hrisDesc', 'Human Resource Information Systems'), icon: Users },
  payroll: { label: t('integrations.categories.payroll', 'Payroll'), description: t('integrations.categories.payrollDesc', 'Payroll & compensation'), icon: DollarSign },
  comms: { label: t('integrations.categories.comms', 'Communications'), description: t('integrations.categories.commsDesc', 'Team messaging & notifications'), icon: MessageSquare },
  identity: { label: t('integrations.categories.identity', 'Identity & SSO'), description: t('integrations.categories.identityDesc', 'Single sign-on & provisioning'), icon: Shield },
  time: { label: t('integrations.categories.time', 'Time & Attendance'), description: t('integrations.categories.timeDesc', 'Time tracking systems'), icon: Clock },
  pos: { label: t('integrations.categories.pos', 'Point of Sale'), description: t('integrations.categories.posDesc', 'POS & retail systems'), icon: CreditCard },
  scheduling: { label: t('integrations.categories.scheduling', 'Migration'), description: t('integrations.categories.schedulingDesc', 'Import from other tools'), icon: ArrowLeftRight },
  learning: { label: t('integrations.categories.learning', 'Learning'), description: t('integrations.categories.learningDesc', 'Training & certifications'), icon: GraduationCap },
  analytics: { label: t('integrations.categories.analytics', 'Analytics'), description: t('integrations.categories.analyticsDesc', 'BI & reporting tools'), icon: LineChart },
  custom: { label: t('integrations.categories.custom', 'Custom'), description: t('integrations.categories.customDesc', 'API & automation'), icon: Code },
});

const getProviders = (t) => [
  // HRIS
  { id: 'hibob', name: 'HiBob', category: 'hris', color: 'bg-pink-500', icon: Users, description: t('integrations.providers.hibobDesc', 'Modern HR platform for mid-size businesses'), tier: 'growth', status: 'ga' },
  { id: 'workday', name: 'Workday', category: 'hris', color: 'bg-blue-600', icon: BarChart3, description: t('integrations.providers.workdayDesc', 'Enterprise HCM and finance platform'), tier: 'enterprise', status: 'ga' },
  { id: 'sap-successfactors', name: 'SAP SuccessFactors', category: 'hris', color: 'bg-indigo-600', icon: Building, description: t('integrations.providers.sapSuccessfactorsDesc', 'Enterprise talent management'), tier: 'enterprise', status: 'ga' },
  { id: 'bamboohr', name: 'BambooHR', category: 'hris', color: 'bg-emerald-500', icon: Briefcase, description: t('integrations.providers.bamboohrDesc', 'HR software for SMBs'), tier: 'starter', status: 'ga' },
  { id: 'personio', name: 'Personio', category: 'hris', color: 'bg-violet-500', icon: Globe, description: t('integrations.providers.personioDesc', 'European HR platform'), tier: 'growth', status: 'ga' },
  { id: 'sage-hr', name: 'Sage HR', category: 'hris', color: 'bg-green-500', icon: FileSpreadsheet, description: t('integrations.providers.sageHrDesc', 'UK HR & people management'), tier: 'starter', status: 'ga' },

  // Payroll
  { id: 'adp', name: 'ADP', category: 'payroll', color: 'bg-red-600', icon: DollarSign, description: t('integrations.providers.adpDesc', 'Enterprise payroll & HR services'), tier: 'growth', status: 'ga' },
  { id: 'paychex', name: 'Paychex', category: 'payroll', color: 'bg-blue-700', icon: Calculator, description: t('integrations.providers.paychexDesc', 'Payroll & HR solutions'), tier: 'growth', status: 'ga' },
  { id: 'gusto', name: 'Gusto', category: 'payroll', color: 'bg-orange-500', icon: Heart, description: t('integrations.providers.gustoDesc', 'Modern payroll for small business'), tier: 'starter', status: 'ga' },
  { id: 'xero', name: 'Xero Payroll', category: 'payroll', color: 'bg-cyan-500', icon: FileSpreadsheet, description: t('integrations.providers.xeroDesc', 'Cloud accounting with payroll'), tier: 'starter', status: 'ga' },
  { id: 'sage-payroll', name: 'Sage Payroll', category: 'payroll', color: 'bg-green-500', icon: DollarSign, description: t('integrations.providers.sagePayrollDesc', 'UK payroll software'), tier: 'starter', status: 'ga' },

  // Communications
  { id: 'slack', name: 'Slack', category: 'comms', color: 'bg-purple-600', icon: MessageSquare, description: t('integrations.providers.slackDesc', 'Team collaboration & notifications'), tier: 'starter', status: 'ga' },
  { id: 'microsoft-teams', name: 'Microsoft Teams', category: 'comms', color: 'bg-violet-600', icon: Video, description: t('integrations.providers.microsoftTeamsDesc', 'Microsoft 365 collaboration'), tier: 'starter', status: 'ga' },
  { id: 'whatsapp-business', name: 'WhatsApp Business', category: 'comms', color: 'bg-green-500', icon: Phone, description: t('integrations.providers.whatsappBusinessDesc', 'Direct worker messaging'), tier: 'growth', status: 'beta' },

  // Identity
  { id: 'google-workspace', name: 'Google Workspace', category: 'identity', color: 'bg-blue-500', icon: Shield, description: t('integrations.providers.googleWorkspaceDesc', 'Google SSO & directory sync'), tier: 'starter', status: 'ga' },
  { id: 'microsoft-entra', name: 'Microsoft Entra ID', category: 'identity', color: 'bg-blue-600', icon: Key, description: t('integrations.providers.microsoftEntraDesc', 'Azure AD SSO & SCIM'), tier: 'growth', status: 'ga' },
  { id: 'okta', name: 'Okta', category: 'identity', color: 'bg-blue-700', icon: Fingerprint, description: t('integrations.providers.oktaDesc', 'Enterprise identity management'), tier: 'enterprise', status: 'ga' },

  // POS
  { id: 'square', name: 'Square', category: 'pos', color: 'bg-slate-800', icon: CreditCard, description: t('integrations.providers.squareDesc', 'POS & team management'), tier: 'starter', status: 'ga' },
  { id: 'lightspeed', name: 'Lightspeed', category: 'pos', color: 'bg-red-500', icon: Zap, description: t('integrations.providers.lightspeedDesc', 'Retail & hospitality POS'), tier: 'growth', status: 'beta' },

  // Migration
  { id: 'deputy', name: 'Deputy', category: 'scheduling', color: 'bg-cyan-500', icon: Clock, description: t('integrations.providers.deputyDesc', 'Import from Deputy'), tier: 'starter', status: 'ga' },
  { id: 'connecteam', name: 'Connecteam', category: 'scheduling', color: 'bg-violet-500', icon: Users, description: t('integrations.providers.connecteamDesc', 'Import from Connecteam'), tier: 'starter', status: 'ga' },
  { id: 'kronos', name: 'UKG/Kronos', category: 'time', color: 'bg-blue-700', icon: Timer, description: t('integrations.providers.kronosDesc', 'Enterprise workforce management'), tier: 'enterprise', status: 'ga' },

  // Learning
  { id: 'linkedin-learning', name: 'LinkedIn Learning', category: 'learning', color: 'bg-blue-600', icon: GraduationCap, description: t('integrations.providers.linkedinLearningDesc', 'Training completion sync'), tier: 'growth', status: 'beta' },

  // Analytics
  { id: 'power-bi', name: 'Power BI', category: 'analytics', color: 'bg-yellow-500', icon: LineChart, description: t('integrations.providers.powerBiDesc', 'Export to Power BI'), tier: 'growth', status: 'ga' },
  { id: 'looker', name: 'Looker', category: 'analytics', color: 'bg-blue-500', icon: BarChart3, description: t('integrations.providers.lookerDesc', 'BI data export'), tier: 'enterprise', status: 'beta' },

  // Custom
  { id: 'zapier', name: 'Zapier', category: 'custom', color: 'bg-orange-500', icon: Workflow, description: t('integrations.providers.zapierDesc', '5,000+ app connections'), tier: 'growth', status: 'ga' },
  { id: 'custom-api', name: 'Custom API', category: 'custom', color: 'bg-slate-600', icon: Code, description: t('integrations.providers.customApiDesc', 'Build your own integration'), tier: 'starter', status: 'ga' },
];
const INITIAL_CONNECTIONS = [
  {
    id: 'conn-1',
    providerId: 'adp',
    status: 'connected',
    connectedAt: '2025-11-15T10:00:00Z',
    lastSyncAt: '2026-01-09T06:00:00Z',
    nextSyncAt: '2026-01-10T06:00:00Z',
    syncFrequency: 'daily',
    config: { autoSync: true, syncEmployees: true, syncTimeEntries: true },
    stats: { syncs: 45, lastSyncRecords: 8, errors: 0 },
  },
  {
    id: 'conn-2',
    providerId: 'slack',
    status: 'connected',
    connectedAt: '2025-12-01T09:00:00Z',
    lastSyncAt: '2026-01-09T14:30:00Z',
    syncFrequency: 'realtime',
    config: { autoSync: true, channels: { shifts: '#shifts', recognition: '#kudos' } },
    stats: { messagesSent: 234, lastWeek: 42 },
  },
  {
    id: 'conn-3',
    providerId: 'google-workspace',
    status: 'connected',
    connectedAt: '2025-10-01T11:00:00Z',
    lastSyncAt: '2026-01-09T12:00:00Z',
    syncFrequency: 'realtime',
    config: { ssoEnabled: true, scimEnabled: true, domain: 'grandmetropolitan.uplift.work' },
    stats: { ssoLogins: 1247, usersProvisioned: 8 },
  },
];

const SYNC_HISTORY = [
  { id: 'sync-1', integrationId: 'conn-1', type: 'incremental', status: 'completed', startedAt: '2026-01-09T06:00:00Z', duration: 45, records: 8, created: 0, updated: 2, errors: 0 },
  { id: 'sync-2', integrationId: 'conn-1', type: 'incremental', status: 'completed', startedAt: '2026-01-08T06:00:00Z', duration: 52, records: 8, created: 1, updated: 3, errors: 0 },
  { id: 'sync-3', integrationId: 'conn-1', type: 'full', status: 'completed', startedAt: '2026-01-07T06:00:00Z', duration: 180, records: 8, created: 0, updated: 8, errors: 1 },
  { id: 'sync-4', integrationId: 'conn-1', type: 'incremental', status: 'failed', startedAt: '2026-01-06T06:00:00Z', duration: 12, records: 0, errors: 1, errorMessage: 'API rate limit exceeded' },
];

const WEBHOOKS = [
  { id: 'wh-1', integrationId: 'conn-1', event: 'employee.updated', url: 'https://api.adp.com/webhooks/uplift', enabled: true, lastTriggered: '2026-01-09T10:30:00Z', successRate: 98.5 },
  { id: 'wh-2', integrationId: 'conn-2', event: 'shift.clockin', url: 'https://hooks.slack.com/...', enabled: true, lastTriggered: '2026-01-09T09:02:00Z', successRate: 100 },
];

const ACTIVITY_LOG = [
  { id: 'log-1', type: 'sync', integration: 'ADP', message: 'Sync completed: 8 records processed', timestamp: '2026-01-09T06:00:45Z', level: 'info' },
  { id: 'log-2', type: 'webhook', integration: 'Slack', message: 'Shift reminder sent to #shifts', timestamp: '2026-01-09T08:00:00Z', level: 'info' },
  { id: 'log-3', type: 'auth', integration: 'Google Workspace', message: 'SSO login: sarah.chen@grandmetropolitan.uplift.work', timestamp: '2026-01-09T08:45:00Z', level: 'info' },
  { id: 'log-4', type: 'error', integration: 'ADP', message: 'Rate limit warning: 80% of quota used', timestamp: '2026-01-09T05:45:00Z', level: 'warn' },
];

// -------------------- HELPER FUNCTIONS --------------------

const cn = (...classes) => classes.filter(Boolean).join(' ');

const formatDate = (date) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const getProvider = (id, t) => getProviders(t).find(p => p.id === id);

const getTierBadge = (tier) => {
  const colors = {
    starter: 'bg-slate-100 text-slate-600',
    growth: 'bg-blue-100 text-blue-600',
    enterprise: 'bg-purple-100 text-purple-600',
  };
  return colors[tier] || colors.starter;
};

const getStatusColor = (status) => {
  const colors = {
    connected: 'bg-emerald-500',
    syncing: 'bg-blue-500',
    error: 'bg-red-500',
    paused: 'bg-amber-500',
    pending: 'bg-slate-400',
  };
  return colors[status] || colors.pending;
};

// -------------------- COMPONENTS --------------------

const Modal = ({ open, onClose, title, subtitle, children, size = 'md', actions }) => {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full overflow-hidden', sizes[size])}>
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
              {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        {actions && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
          active === tab.id
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', variants[variant])}>
      {children}
    </span>
  );
};

// -------------------- WEBHOOKS TAB --------------------

const WEBHOOK_EVENTS = [
  { id: 'employee.created', labelKey: 'integrations.events.employeeCreated', fallback: 'Employee Created' },
  { id: 'employee.updated', labelKey: 'integrations.events.employeeUpdated', fallback: 'Employee Updated' },
  { id: 'employee.deleted', labelKey: 'integrations.events.employeeDeactivated', fallback: 'Employee Deleted' },
  { id: 'shift.created', labelKey: 'integrations.events.shiftCreated', fallback: 'Shift Created' },
  { id: 'shift.updated', labelKey: 'integrations.events.shiftUpdated', fallback: 'Shift Updated' },
  { id: 'shift.deleted', labelKey: 'integrations.events.shiftDeleted', fallback: 'Shift Deleted' },
  { id: 'shift.claimed', labelKey: 'integrations.events.shiftClaimed', fallback: 'Shift Claimed' },
  { id: 'time.clock_in', labelKey: 'integrations.events.clockIn', fallback: 'Clock In' },
  { id: 'time.clock_out', labelKey: 'integrations.events.clockOut', fallback: 'Clock Out' },
  { id: 'timeoff.requested', labelKey: 'integrations.events.timeOffRequested', fallback: 'Time Off Requested' },
  { id: 'timeoff.approved', labelKey: 'integrations.events.timeOffApproved', fallback: 'Time Off Approved' },
  { id: 'timeoff.rejected', labelKey: 'integrations.events.timeOffRejected', fallback: 'Time Off Rejected' },
  { id: 'skill.verified', labelKey: 'integrations.events.skillVerified', fallback: 'Skill Verified' },
  { id: 'skill.expired', labelKey: 'integrationHub.webhooks.skillExpired', fallback: 'Skill Expired' },
];

const WebhooksTab = ({ provider, webhooks: initialWebhooks, connectionId }) => {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState(initialWebhooks || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testing, setTesting] = useState(null);
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [],
    enabled: true,
  });

  const handleAddWebhook = async () => {
    if (!newWebhook.url || !newWebhook.events.length) {
      alert(t('integrationHub.webhooks.validationError', 'Please enter a URL and select at least one event'));
      return;
    }

    // In production, call API
    const webhook = {
      id: `wh-${Date.now()}`,
      integrationId: connectionId,
      url: newWebhook.url,
      event: newWebhook.events.join(','),
      enabled: true,
      lastTriggered: null,
      successRate: 100,
    };

    setWebhooks([...webhooks, webhook]);
    setShowAddModal(false);
    setNewWebhook({ url: '', events: [], enabled: true });
    alert(t('integrationHub.webhooks.createdSuccess', 'Webhook created successfully!'));
  };

  const handleTestWebhook = async (webhook) => {
    setTesting(webhook.id);

    // Simulate test
    await new Promise(resolve => setTimeout(resolve, 1500));

    alert(`${t('integrationHub.webhooks.testSent', 'Test payload sent to')} ${webhook.url}\n${t('integrationHub.webhooks.testStatus', 'Status')}: 200 OK`);
    setTesting(null);
  };

  const handleToggleWebhook = (webhookId) => {
    setWebhooks(webhooks.map(w =>
      w.id === webhookId ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const handleDeleteWebhook = (webhookId) => {
    if (window.confirm(t('integrationHub.webhooks.deleteConfirm', 'Delete this webhook?'))) {
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{t('integrationHub.webhooks.description', 'Webhooks notify {{name}} when events occur in Uplift', { name: provider.name })}</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg flex items-center gap-1 hover:bg-orange-600"
        >
          <Plus className="w-3 h-3" /> {t('integrationHub.webhooks.addWebhook', 'Add Webhook')}
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Webhook className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{t('integrationHub.webhooks.noWebhooks', 'No webhooks configured')}</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            {t('integrationHub.webhooks.createFirst', 'Create your first webhook')}
          </button>
        </div>
      ) : (
        webhooks.map(webhook => (
          <div key={webhook.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <div className="flex items-start justify-between mb-2">
              <div>
                <code className="text-sm font-medium bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                  {webhook.event}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={webhook.enabled ? 'success' : 'default'}>
                  {webhook.enabled ? t('integrationHub.webhooks.active', 'Active') : t('integrationHub.webhooks.paused', 'Paused')}
                </Badge>
                <button
                  onClick={() => handleTestWebhook(webhook)}
                  disabled={testing === webhook.id}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                  title={t('integrationHub.webhooks.sendTestPayload', 'Send test payload')}
                >
                  {testing === webhook.id ? (
                    <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                <button
                  onClick={() => handleToggleWebhook(webhook.id)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                  title={webhook.enabled ? t('integrationHub.webhooks.pauseWebhook', 'Pause webhook') : t('integrationHub.webhooks.enableWebhook', 'Enable webhook')}
                >
                  {webhook.enabled ? (
                    <Pause className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Play className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                <button
                  onClick={() => handleDeleteWebhook(webhook.id)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  title={t('integrationHub.webhooks.deleteWebhook', 'Delete webhook')}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500 truncate mb-2">{webhook.url}</p>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{t('integrationHub.webhooks.lastTriggered', 'Last triggered')}: {webhook.lastTriggered ? formatDate(webhook.lastTriggered) : t('integrationHub.webhooks.never', 'Never')}</span>
              <span>{t('integrationHub.webhooks.successRate', 'Success rate')}: {webhook.successRate}%</span>
            </div>
          </div>
        ))
      )}

      {/* Add Webhook Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('integrationHub.webhooks.addWebhook', 'Add Webhook')}
        subtitle={t('integrationHub.webhooks.sendEventsTo', 'Send events to {{name}}', { name: provider.name })}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('integrationHub.webhooks.endpointUrl', 'Endpoint URL')}</label>
            <input
              type="url"
              value={newWebhook.url}
              onChange={e => setNewWebhook(w => ({ ...w, url: e.target.value }))}
              placeholder="https://your-service.com/webhook"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('integrationHub.webhooks.eventsToSend', 'Events to Send')}</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              {WEBHOOK_EVENTS.map(event => (
                <label key={event.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={newWebhook.events.includes(event.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setNewWebhook(w => ({ ...w, events: [...w.events, event.id] }));
                      } else {
                        setNewWebhook(w => ({ ...w, events: w.events.filter(id => id !== event.id) }));
                      }
                    }}
                    className="w-4 h-4 rounded text-orange-500"
                  />
                  {t(event.labelKey, event.fallback)}
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('integrationHub.webhooks.hmacInfo', "We'll sign all webhook payloads with HMAC-SHA256. You'll receive the signature in the")}
              <code className="bg-blue-100 dark:bg-blue-800 px-1 mx-1 rounded">X-Uplift-Signature</code>
              {t('integrationHub.webhooks.header', 'header.')}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50"
            >
              {t('integrationHub.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleAddWebhook}
              disabled={!newWebhook.url || !newWebhook.events.length}
              className="flex-1 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50"
            >
              {t('integrationHub.webhooks.createWebhook', 'Create Webhook')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, accent }) => (
  <div className={cn(
    'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4',
    accent && 'border-orange-500/30'
  )}>
    <div className="flex items-start justify-between mb-2">
      <div className={cn('p-2 rounded-lg', accent ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-500')}>
        <Icon className="w-4 h-4" />
      </div>
      {trend && (
        <span className={cn('text-xs font-semibold', trend > 0 ? 'text-emerald-500' : 'text-red-500')}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    <p className="text-sm text-slate-500">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

// -------------------- PROVIDER CARD --------------------

const ProviderCard = ({ provider, connected, onConnect, onConfigure }) => {
  const { t } = useTranslation();
  const Icon = provider.icon;

  return (
    <div className={cn(
      'bg-white dark:bg-slate-800 rounded-xl border p-4 transition-all',
      connected
        ? 'border-emerald-500/30'
        : 'border-slate-200 dark:border-slate-700 hover:border-orange-500/30 hover:shadow-lg'
    )}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', provider.color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{provider.name}</h3>
            {provider.status === 'beta' && <Badge variant="info">{t('integrationHub.status.beta', 'Beta')}</Badge>}
          </div>
          <p className="text-xs text-slate-500">{getIntegrationCategories(t)[provider.category]?.label}</p>
        </div>
        {connected && (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{provider.description}</p>

      <div className="flex items-center justify-between">
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium capitalize', getTierBadge(provider.tier))}>
          {provider.tier}
        </span>

        {connected ? (
          <button
            onClick={() => onConfigure(provider)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1"
          >
            <Settings className="w-3 h-3" /> {t('integrationHub.configure', 'Configure')}
          </button>
        ) : (
          <button
            onClick={() => onConnect(provider)}
            className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg flex items-center gap-1 hover:bg-orange-600"
          >
            <Plus className="w-3 h-3" /> {t('integrationHub.connect', 'Connect')}
          </button>
        )}
      </div>
    </div>
  );
};

// -------------------- CONNECTION CARD --------------------

const ConnectionCard = ({ connection, onConfigure, onSync, onDisconnect }) => {
  const { t } = useTranslation();
  const provider = getProvider(connection.providerId, t);
  if (!provider) return null;

  const Icon = provider.icon;
  const isSyncing = connection.status === 'syncing';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', provider.color)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{provider.name}</h3>
            <p className="text-sm text-slate-500">{getIntegrationCategories(t)[provider.category]?.label}</p>
          </div>
        </div>
        <div className={cn('px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1',
          connection.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' :
          connection.status === 'error' ? 'bg-red-500/10 text-red-500' :
          connection.status === 'syncing' ? 'bg-blue-500/10 text-blue-500' :
          'bg-amber-500/10 text-amber-500'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', getStatusColor(connection.status))} />
          {connection.status === 'syncing' ? t('integrationHub.status.syncing', 'Syncing...') : connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
        <div>
          <p className="text-xs text-slate-500">{t('integrationHub.connection.lastSync', 'Last Sync')}</p>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(connection.lastSyncAt)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t('integrationHub.connection.frequency', 'Frequency')}</p>
          <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{connection.syncFrequency}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t('integrationHub.connection.status', 'Status')}</p>
          <p className="text-sm font-medium text-emerald-500">{connection.stats?.errors === 0 ? t('integrationHub.connection.healthy', 'Healthy') : `${connection.stats?.errors} ${t('integrationHub.connection.errors', 'errors')}`}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSync(connection)}
          disabled={isSyncing}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2',
            isSyncing
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          {isSyncing ? t('integrationHub.status.syncing', 'Syncing...') : t('integrationHub.syncNow', 'Sync Now')}
        </button>
        <button
          onClick={() => onConfigure(connection)}
          className="px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDisconnect(connection)}
          className="px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg"
        >
          <Unlink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// -------------------- CONNECT MODAL --------------------

const ConnectModal = ({ provider, open, onClose, onConnect }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('info'); // info, auth, configure, complete
  const [config, setConfig] = useState({
    autoSync: true,
    syncFrequency: 'daily',
    syncEmployees: true,
    syncTimeEntries: true,
  });

  if (!provider) return null;
  const Icon = provider.icon;

  const handleConnect = () => {
    // Simulate OAuth flow
    setStep('auth');
    setTimeout(() => setStep('configure'), 1500);
  };

  const handleComplete = () => {
    onConnect(provider, config);
    setStep('complete');
    setTimeout(() => {
      onClose();
      setStep('info');
    }, 2000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('integrationHub.connectModal.title', 'Connect {{name}}', { name: provider.name })}
      subtitle={provider.description}
      size="md"
    >
      {step === 'info' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center', provider.color)}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{provider.name}</h3>
              <p className="text-sm text-slate-500">{getIntegrationCategories(t)[provider.category]?.label}</p>
              <div className="flex gap-2 mt-2">
                <Badge>{provider.tier}</Badge>
                {provider.status === 'beta' && <Badge variant="info">{t('integrationHub.status.beta', 'Beta')}</Badge>}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">{t('integrationHub.connectModal.whatItDoes', 'What this integration does:')}</h4>
            <ul className="space-y-2">
              {provider.category === 'hris' && (
                <>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.hris.syncEmployees', 'Sync employee records automatically')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.hris.importDepts', 'Import departments and locations')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.hris.syncTimeOff', 'Keep time-off balances in sync')}</li>
                </>
              )}
              {provider.category === 'payroll' && (
                <>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.payroll.exportTimesheets', 'Export approved timesheets')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.payroll.syncPayRates', 'Sync pay rates and overtime')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.payroll.autoReconciliation', 'Automatic payroll reconciliation')}</li>
                </>
              )}
              {provider.category === 'comms' && (
                <>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.comms.shiftReminders', 'Send shift reminders')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.comms.postRecognition', 'Post recognition to channels')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.comms.swapNotifications', 'Swap request notifications')}</li>
                </>
              )}
              {provider.category === 'identity' && (
                <>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.identity.sso', 'Single sign-on (SSO)')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.identity.autoProvisioning', 'Automatic user provisioning')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.identity.directorySync', 'Directory sync')}</li>
                </>
              )}
              {!['hris', 'payroll', 'comms', 'identity'].includes(provider.category) && (
                <>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.other.bidirectional', 'Bidirectional data sync')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.other.realtimeWebhooks', 'Real-time updates via webhooks')}</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {t('integrationHub.connectModal.other.auditTrail', 'Full audit trail')}</li>
                </>
              )}
            </ul>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">{t('integrationHub.connectModal.redirectNotice', "You'll be redirected to {{name}}", { name: provider.name })}</p>
              <p className="mt-1">{t('integrationHub.connectModal.authorizeMessage', 'Sign in and authorize Uplift to access your data. We only request the permissions we need.')}</p>
            </div>
          </div>

          <button
            onClick={handleConnect}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> {t('integrationHub.connectModal.connectWith', 'Connect with {{name}}', { name: provider.name })}
          </button>
        </div>
      )}

      {step === 'auth' && (
        <div className="py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-orange-500/10 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('integrationHub.connectModal.connecting', 'Connecting to {{name}}...', { name: provider.name })}</h3>
          <p className="text-sm text-slate-500">{t('integrationHub.connectModal.completeAuth', 'Please complete authorization in the popup window')}</p>
        </div>
      )}

      {step === 'configure' && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="text-sm text-emerald-700 dark:text-emerald-300">
              <p className="font-medium">{t('integrationHub.connectModal.successConnected', 'Successfully connected!')}</p>
              <p className="mt-1">{t('integrationHub.connectModal.configureSyncSettings', 'Configure your sync settings below.')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <div>
                <p className="font-medium">{t('integrationHub.settings.autoSync', 'Auto Sync')}</p>
                <p className="text-xs text-slate-500">{t('integrationHub.settings.autoSyncDesc', 'Automatically sync data on schedule')}</p>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, autoSync: !c.autoSync }))}
                className={cn('w-12 h-6 rounded-full transition-colors relative',
                  config.autoSync ? 'bg-orange-500' : 'bg-slate-300'
                )}
              >
                <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  config.autoSync ? 'left-7' : 'left-1'
                )} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('integrationHub.settings.syncFrequency', 'Sync Frequency')}</label>
              <select
                value={config.syncFrequency}
                onChange={e => setConfig(c => ({ ...c, syncFrequency: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="realtime">{t('integrationHub.settings.frequency.realtime', 'Real-time')}</option>
                <option value="hourly">{t('integrationHub.settings.frequency.hourly', 'Hourly')}</option>
                <option value="daily">{t('integrationHub.settings.frequency.daily', 'Daily')}</option>
                <option value="weekly">{t('integrationHub.settings.frequency.weekly', 'Weekly')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">{t('integrationHub.settings.dataToSync', 'Data to Sync')}</label>
              {[
                t('integrationHub.settings.data.employees', 'Employees'),
                t('integrationHub.settings.data.timeEntries', 'Time Entries'),
                t('integrationHub.settings.data.departments', 'Departments'),
                t('integrationHub.settings.data.locations', 'Locations'),
              ].map(item => (
                <label key={item} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-orange-500 rounded" />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('info')}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50"
            >
              {t('integrationHub.back', 'Back')}
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600"
            >
              {t('integrationHub.connectModal.completeSetup', 'Complete Setup')}
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('integrationHub.connectModal.connected', '{{name}} Connected!', { name: provider.name })}</h3>
          <p className="text-sm text-slate-500">{t('integrationHub.connectModal.firstSyncSoon', 'Your first sync will begin shortly')}</p>
        </div>
      )}
    </Modal>
  );
};

// -------------------- CONFIGURE MODAL --------------------

const ConfigureModal = ({ connection, open, onClose, onSave, onDisconnect }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('settings');
  const [config, setConfig] = useState(connection?.config || {});

  const provider = connection ? getProvider(connection.providerId) : null;
  if (!provider || !connection) return null;

  const Icon = provider.icon;
  const history = SYNC_HISTORY.filter(s => s.integrationId === connection.id);
  const webhooks = WEBHOOKS.filter(w => w.integrationId === connection.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('integrationHub.configureModal.title', '{{name}} Settings', { name: provider.name })}
      subtitle={t('integrationHub.configureModal.connectedSince', 'Connected {{date}}', { date: formatDate(connection.connectedAt) })}
      size="lg"
    >
      <Tabs
        tabs={[
          { id: 'settings', label: t('integrationHub.tabs.settings', 'Settings') },
          { id: 'mapping', label: t('integrationHub.tabs.fieldMapping', 'Field Mapping') },
          { id: 'history', label: t('integrationHub.tabs.syncHistory', 'Sync History') },
          { id: 'webhooks', label: t('integrationHub.tabs.webhooks', 'Webhooks') },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="mt-6">
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard title={t('integrationHub.stats.totalSyncs', 'Total Syncs')} value={connection.stats?.syncs || 0} icon={RefreshCw} />
              <StatCard title={t('integrationHub.stats.lastSync', 'Last Sync')} value={connection.stats?.lastSyncRecords || 0} subtitle={t('integrationHub.stats.records', 'records')} icon={Database} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <div>
                  <p className="font-medium">{t('integrationHub.settings.autoSync', 'Auto Sync')}</p>
                  <p className="text-xs text-slate-500">{t('integrationHub.settings.autoSyncScheduleDesc', 'Sync automatically on schedule')}</p>
                </div>
                <button
                  onClick={() => setConfig(c => ({ ...c, autoSync: !c.autoSync }))}
                  className={cn('w-12 h-6 rounded-full transition-colors relative',
                    config.autoSync ? 'bg-orange-500' : 'bg-slate-300'
                  )}
                >
                  <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    config.autoSync ? 'left-7' : 'left-1'
                  )} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('integrationHub.settings.syncFrequency', 'Sync Frequency')}</label>
                <select
                  value={connection.syncFrequency}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="realtime">{t('integrationHub.settings.frequency.realtime', 'Real-time')}</option>
                  <option value="hourly">{t('integrationHub.settings.frequency.hourly', 'Hourly')}</option>
                  <option value="daily">{t('integrationHub.settings.frequency.daily', 'Daily')}</option>
                  <option value="weekly">{t('integrationHub.settings.frequency.weekly', 'Weekly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('integrationHub.settings.nextScheduledSync', 'Next Scheduled Sync')}</label>
                <p className="text-sm text-slate-600">{formatDate(connection.nextSyncAt)}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => onDisconnect(connection)}
                className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-2"
              >
                <Unlink className="w-4 h-4" /> {t('integrationHub.disconnect', 'Disconnect {{name}}', { name: provider.name })}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'mapping' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('integrationHub.mapping.description', 'Field mapping controls how data from {{name}} maps to Uplift fields. Changes take effect on next sync.', { name: provider.name })}
              </p>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                <div className="col-span-4">{t('integrationHub.mapping.sourceField', '{{name}} Field', { name: provider.name })}</div>
                <div className="col-span-1 text-center">&rarr;</div>
                <div className="col-span-4">{t('integrationHub.mapping.upliftField', 'Uplift Field')}</div>
                <div className="col-span-3">{t('integrationHub.mapping.status', 'Status')}</div>
              </div>

              {[
                { source: 'employee_id', target: 'externalId', status: 'mapped' },
                { source: 'first_name', target: 'firstName', status: 'mapped' },
                { source: 'last_name', target: 'lastName', status: 'mapped' },
                { source: 'email', target: 'email', status: 'mapped' },
                { source: 'department', target: 'department', status: 'mapped' },
                { source: 'hire_date', target: 'startDate', status: 'mapped' },
                { source: 'hourly_rate', target: 'hourlyRate', status: 'mapped' },
                { source: 'custom_field_1', target: '', status: 'unmapped' },
              ].map((mapping, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-3 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg items-center">
                  <div className="col-span-4">
                    <code className="text-sm bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">{mapping.source}</code>
                  </div>
                  <div className="col-span-1 text-center">
                    <ArrowRight className="w-4 h-4 text-slate-400 mx-auto" />
                  </div>
                  <div className="col-span-4">
                    {mapping.target ? (
                      <code className="text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-2 py-0.5 rounded">{mapping.target}</code>
                    ) : (
                      <select className="w-full text-sm border rounded px-2 py-1">
                        <option>{t('integrationHub.mapping.selectField', 'Select field...')}</option>
                        <option value="customField1">{t('integrations.mapping.customField1', 'customField1')}</option>
                        <option value="customField2">{t('integrations.mapping.customField2', 'customField2')}</option>
                        <option value="notes">{t('integrations.mapping.notes', 'notes')}</option>
                      </select>
                    )}
                  </div>
                  <div className="col-span-3">
                    {mapping.status === 'mapped' ? (
                      <Badge variant="success">{t('integrationHub.mapping.mapped', 'Mapped')}</Badge>
                    ) : (
                      <Badge variant="warning">{t('integrationHub.mapping.unmapped', 'Unmapped')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('integrationHub.history.noHistory', 'No sync history yet')}</p>
              </div>
            ) : (
              history.map(sync => (
                <div key={sync.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {sync.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium capitalize">{sync.type} {t('integrationHub.history.sync', 'Sync')}</span>
                      <Badge variant={sync.status === 'completed' ? 'success' : 'error'}>
                        {sync.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(sync.startedAt)}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">{t('integrationHub.history.duration', 'Duration')}:</span>{' '}
                      <span className="font-medium">{formatDuration(sync.duration)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('integrationHub.history.records', 'Records')}:</span>{' '}
                      <span className="font-medium">{sync.records}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('integrationHub.history.created', 'Created')}:</span>{' '}
                      <span className="font-medium text-emerald-600">{sync.created}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('integrationHub.history.updated', 'Updated')}:</span>{' '}
                      <span className="font-medium text-blue-600">{sync.updated}</span>
                    </div>
                  </div>

                  {sync.errorMessage && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600">
                      {sync.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'webhooks' && (
          <WebhooksTab
            provider={provider}
            webhooks={webhooks}
            connectionId={connection.id}
          />
        )}
      </div>

      {activeTab === 'settings' && (
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
            {t('integrationHub.cancel', 'Cancel')}
          </button>
          <button onClick={() => onSave(connection.id, config)} className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            {t('integrationHub.saveChanges', 'Save Changes')}
          </button>
        </div>
      )}
    </Modal>
  );
};

// -------------------- MAIN COMPONENT --------------------

export const IntegrationHub = ({ showToast, addAudit }) => {
  const { t } = useTranslation();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('connected'); // connected, marketplace, activity

  // Modal state
  const [connectModal, setConnectModal] = useState({ open: false, provider: null });
  const [configureModal, setConfigureModal] = useState({ open: false, connection: null });

  // Load connections from API on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        setLoading(true);
        const data = await integrationsApi.list();
        setConnections(Array.isArray(data) ? data : data?.integrations || data?.data || []);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to load integrations:', error);
        // Fall back to empty list on error
        setConnections([]);
      } finally {
        setLoading(false);
      }
    };
    loadConnections();
  }, []);

  // Derived data
  const connectedProviderIds = connections.map(c => c.providerId);

  const PROVIDERS = useMemo(() => getProviders(t), [t]);
  const INTEGRATION_CATEGORIES = useMemo(() => getIntegrationCategories(t), [t]);

  const filteredProviders = useMemo(() => {
    return PROVIDERS.filter(p => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      return true;
    });
  }, [searchQuery, categoryFilter, PROVIDERS]);

  // Handlers
  const handleConnect = async (provider, config) => {
    // Optimistic UI
    const optimisticConnection = {
      id: `conn-${Date.now()}`,
      providerId: provider.id,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      syncFrequency: config.syncFrequency || 'daily',
      config,
      stats: { syncs: 0, lastSyncRecords: 0, errors: 0 },
    };

    setConnections(prev => [...prev, optimisticConnection]);

    try {
      const created = await integrationsApi.create({
        providerId: provider.id,
        syncFrequency: config.syncFrequency || 'daily',
        config,
      });
      // Replace optimistic entry with server response
      setConnections(prev => prev.map(c =>
        c.id === optimisticConnection.id ? { ...optimisticConnection, ...created } : c
      ));
      showToast?.(`${provider.name} connected successfully`, 'success');
      addAudit?.(`connected ${provider.name} integration`);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to create integration:', error);
      // Rollback optimistic update
      setConnections(prev => prev.filter(c => c.id !== optimisticConnection.id));
      showToast?.(`Failed to connect ${provider.name}: ${error.message}`, 'error');
    }
  };

  const handleDisconnect = async (connection) => {
    const provider = getProvider(connection.providerId, t);
    if (!window.confirm(t('integrationHub.disconnectConfirm', 'Disconnect {{name}}? This will stop all syncs.', { name: provider?.name }))) return;

    // Optimistic UI
    setConnections(prev => prev.filter(c => c.id !== connection.id));
    setConfigureModal({ open: false, connection: null });

    try {
      await integrationsApi.delete(connection.id);
      showToast?.(`${provider?.name} disconnected`, 'info');
      addAudit?.(`disconnected ${provider?.name} integration`);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to disconnect integration:', error);
      // Rollback
      setConnections(prev => [...prev, connection]);
      showToast?.(`Failed to disconnect ${provider?.name}: ${error.message}`, 'error');
    }
  };

  const handleSync = async (connection) => {
    const provider = getProvider(connection.providerId, t);

    // Optimistic: set status to syncing
    setConnections(prev => prev.map(c =>
      c.id === connection.id ? { ...c, status: 'syncing' } : c
    ));

    showToast?.(`Syncing ${provider?.name}...`, 'info');

    try {
      const result = await integrationsApi.sync(connection.id);
      setConnections(prev => prev.map(c =>
        c.id === connection.id ? {
          ...c,
          status: 'connected',
          lastSyncAt: new Date().toISOString(),
          stats: { ...c.stats, syncs: (c.stats?.syncs || 0) + 1, lastSyncRecords: result?.records || 0 },
          ...result,
        } : c
      ));
      showToast?.(`${provider?.name} sync completed`, 'success');
      addAudit?.(`manual sync completed for ${provider?.name}`);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to sync integration:', error);
      setConnections(prev => prev.map(c =>
        c.id === connection.id ? { ...c, status: 'error' } : c
      ));
      showToast?.(`Sync failed for ${provider?.name}: ${error.message}`, 'error');
    }
  };

  const handleSaveConfig = async (connectionId, config) => {
    // Optimistic UI
    setConnections(prev => prev.map(c =>
      c.id === connectionId ? { ...c, config: { ...c.config, ...config } } : c
    ));
    setConfigureModal({ open: false, connection: null });

    try {
      await integrationsApi.update(connectionId, { config });
      showToast?.(t('integrationHub.settingsSaved', 'Settings saved'), 'success');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save config:', error);
      showToast?.(`Failed to save settings: ${error.message}`, 'error');
    }
  };

  // Stats
  const stats = {
    connected: connections.length,
    available: PROVIDERS.length - connections.length,
    syncsToday: connections.reduce((acc, c) => acc + (c.stats?.syncs || 0), 0),
    errors: connections.filter(c => c.status === 'error').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('integrationHub.title', 'Integration Hub')}</h1>
          <p className="text-slate-500">{t('integrationHub.subtitle', 'Connect Uplift to your existing tools')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('api-factory')}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl font-medium flex items-center gap-2"
          >
            <Code className="w-4 h-4" /> {t('integrationHub.apiFactory', 'API Factory')}
          </button>
          <button
            onClick={() => setViewMode('marketplace')}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-orange-500/30"
          >
            <Plus className="w-4 h-4" /> {t('integrationHub.addIntegration', 'Add Integration')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('integrationHub.stats.connected', 'Connected')} value={stats.connected} icon={CheckCircle} accent />
        <StatCard title={t('integrationHub.stats.available', 'Available')} value={stats.available} icon={Plug} />
        <StatCard title={t('integrationHub.stats.syncsToday', 'Syncs Today')} value={stats.syncsToday} icon={RefreshCw} />
        <StatCard title={t('integrationHub.stats.errors', 'Errors')} value={stats.errors} icon={AlertTriangle} />
      </div>

      {/* View Tabs */}
      <Tabs
        tabs={[
          { id: 'connected', label: `${t('integrationHub.tabs.connected', 'Connected')} (${stats.connected})` },
          { id: 'marketplace', label: t('integrationHub.tabs.marketplace', 'Marketplace') },
          { id: 'api-keys', label: t('integrationHub.tabs.restApi', 'REST API') },
          { id: 'api-factory', label: t('integrationHub.tabs.apiFactory', 'API Factory') },
          { id: 'activity', label: t('integrationHub.tabs.activityLog', 'Activity Log') },
        ]}
        active={viewMode}
        onChange={setViewMode}
      />

      {/* Connected View */}
      {viewMode === 'connected' && (
        <div>
          {loading ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-slate-400 animate-spin" />
              <p className="text-slate-500">{t('integrationHub.loadingIntegrations', 'Loading integrations...')}</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <Plug className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold mb-2">{t('integrationHub.noIntegrations', 'No integrations connected')}</h3>
              <p className="text-slate-500 mb-4">{t('integrationHub.noIntegrationsDesc', 'Connect your first integration to start syncing data')}</p>
              <button
                onClick={() => setViewMode('marketplace')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium"
              >
                {t('integrationHub.browseMarketplace', 'Browse Marketplace')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {connections.map(connection => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onConfigure={(c) => setConfigureModal({ open: true, connection: c })}
                  onSync={handleSync}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Marketplace View */}
      {viewMode === 'marketplace' && (
        <div className="space-y-6">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('integrationHub.marketplace.searchPlaceholder', 'Search integrations...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 min-w-[180px]"
            >
              <option value="all">{t('integrationHub.marketplace.allCategories', 'All Categories')}</option>
              {Object.entries(INTEGRATION_CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">{t('integrationHub.marketplace.infoBannerTitle', 'Uplift works with your existing tools')}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {t('integrationHub.marketplace.infoBannerDesc', "Connect your HRIS, payroll, and comms systems. We sync data — we don't replace your stack.")}
              </p>
            </div>
          </div>

          {/* Providers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProviders.map(provider => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                connected={connectedProviderIds.includes(provider.id)}
                onConnect={(p) => setConnectModal({ open: true, provider: p })}
                onConfigure={(p) => {
                  const conn = connections.find(c => c.providerId === p.id);
                  if (conn) setConfigureModal({ open: true, connection: conn });
                }}
              />
            ))}
          </div>

          {filteredProviders.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-slate-500">{t('integrationHub.marketplace.noResults', 'No integrations match your search')}</p>
            </div>
          )}

          {/* Request Integration */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 text-center">
            <h3 className="font-semibold mb-2">{t('integrationHub.marketplace.dontSeeSystem', "Don't see your system?")}</h3>
            <p className="text-sm text-slate-500 mb-4">{t('integrationHub.marketplace.alwaysAdding', "We're always adding new integrations. Let us know what you need.")}</p>
            <button
              onClick={() => window.open('mailto:support@uplift.hr?subject=Integration%20Request', '_blank')}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-medium text-sm hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              {t('integrationHub.marketplace.requestIntegration', 'Request Integration')}
            </button>
          </div>
        </div>
      )}

      {/* Activity View */}
      {viewMode === 'activity' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{t('integrationHub.activity.recentActivity', 'Recent integration activity')}</p>
            <button
              onClick={() => {
                const csv = ACTIVITY_LOG.map(l => `${l.timestamp},${l.integration},${l.type},${l.level},"${l.message}"`).join('\n');
                const blob = new Blob([`Timestamp,Integration,Type,Level,Message\n${csv}`], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'integration-activity-log.csv';
                a.click();
              }}
              className="text-sm text-orange-500 font-medium hover:text-orange-600"
            >
              {t('integrationHub.activity.exportLog', 'Export Log')}
            </button>
          </div>

          <div className="space-y-2">
            {ACTIVITY_LOG.map(log => (
              <div key={log.id} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  log.level === 'error' ? 'bg-red-100 text-red-500' :
                  log.level === 'warn' ? 'bg-amber-100 text-amber-500' :
                  'bg-slate-100 text-slate-500'
                )}>
                  {log.type === 'sync' && <RefreshCw className="w-4 h-4" />}
                  {log.type === 'webhook' && <Webhook className="w-4 h-4" />}
                  {log.type === 'auth' && <Shield className="w-4 h-4" />}
                  {log.type === 'error' && <AlertCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{log.integration}</span>
                    <Badge variant={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'default'}>
                      {log.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{log.message}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Factory View */}
      {viewMode === 'api-factory' && (
        <ApiFactory />
      )}

      {/* REST API Keys View */}
      {viewMode === 'api-keys' && (
        <RestApiKeys />
      )}

      {/* Modals */}
      <ConnectModal
        provider={connectModal.provider}
        open={connectModal.open}
        onClose={() => setConnectModal({ open: false, provider: null })}
        onConnect={handleConnect}
      />

      <ConfigureModal
        connection={configureModal.connection}
        open={configureModal.open}
        onClose={() => setConfigureModal({ open: false, connection: null })}
        onSave={handleSaveConfig}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
};

export default IntegrationHub;
