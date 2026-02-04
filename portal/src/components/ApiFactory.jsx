// ============================================================
// UPLIFT API FACTORY
// Build custom REST API integrations without code
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Code, Plus, Play, Save, Trash2, Copy, Check, X, ChevronDown, ChevronRight,
  Settings, Zap, Clock, AlertCircle, CheckCircle, RefreshCw, Eye, EyeOff,
  ArrowRight, ArrowLeftRight, Database, Globe, Key, Lock, Unlock,
  FileJson, List, Calendar, Search, Filter, Download, Upload, Edit2,
  TestTube, History, Webhook, Server, Activity, Link, Unlink, Info,
  PlusCircle, MinusCircle, GripVertical, MoreVertical, ExternalLink
} from 'lucide-react';
import { integrationsApi } from '../lib/api';
import { useTranslation } from 'react-i18next';

// -------------------- TYPES & CONSTANTS --------------------

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const getAuthTypes = (t) => [
  { id: 'none', label: t('integrations.api.authNone', 'No Authentication'), icon: Unlock },
  { id: 'api_key', label: t('integrations.api.authApiKey', 'API Key'), icon: Key },
  { id: 'bearer', label: t('integrations.api.authBearer', 'Bearer Token'), icon: Lock },
  { id: 'basic', label: t('integrations.api.authBasic', 'Basic Auth'), icon: Lock },
  { id: 'oauth2', label: t('integrations.api.authOAuth2', 'OAuth 2.0'), icon: Lock },
];

const getTriggerTypes = (t) => [
  { id: 'manual', label: t('integrations.api.triggerManual', 'Manual'), description: t('integrations.api.triggerManualDesc', 'Run on demand'), icon: Play },
  { id: 'schedule', label: t('integrations.api.triggerScheduled', 'Scheduled'), description: t('integrations.api.triggerScheduledDesc', 'Run on a schedule'), icon: Clock },
  { id: 'event', label: t('integrations.api.triggerEvent', 'Event-based'), description: t('integrations.api.triggerEventDesc', 'Triggered by Uplift events'), icon: Zap },
  { id: 'webhook', label: t('integrations.api.triggerWebhook', 'Incoming Webhook'), description: t('integrations.api.triggerWebhookDesc', 'Receive data from external systems'), icon: Webhook },
];

const getUpliftEvents = (t) => [
  { id: 'employee.created', label: t('integrations.events.employeeCreated', 'Employee Created'), category: t('integrations.events.categoryEmployees', 'Employees') },
  { id: 'employee.updated', label: t('integrations.events.employeeUpdated', 'Employee Updated'), category: t('integrations.events.categoryEmployees', 'Employees') },
  { id: 'employee.deactivated', label: t('integrations.events.employeeDeactivated', 'Employee Deactivated'), category: t('integrations.events.categoryEmployees', 'Employees') },
  { id: 'shift.created', label: t('integrations.events.shiftCreated', 'Shift Created'), category: t('integrations.events.categoryScheduling', 'Scheduling') },
  { id: 'shift.updated', label: t('integrations.events.shiftUpdated', 'Shift Updated'), category: t('integrations.events.categoryScheduling', 'Scheduling') },
  { id: 'shift.deleted', label: t('integrations.events.shiftDeleted', 'Shift Deleted'), category: t('integrations.events.categoryScheduling', 'Scheduling') },
  { id: 'shift.claimed', label: t('integrations.events.shiftClaimed', 'Shift Claimed'), category: t('integrations.events.categoryScheduling', 'Scheduling') },
  { id: 'timeentry.clockin', label: t('integrations.events.clockIn', 'Clock In'), category: t('integrations.events.categoryTimeTracking', 'Time Tracking') },
  { id: 'timeentry.clockout', label: t('integrations.events.clockOut', 'Clock Out'), category: t('integrations.events.categoryTimeTracking', 'Time Tracking') },
  { id: 'timeentry.approved', label: t('integrations.events.timeEntryApproved', 'Time Entry Approved'), category: t('integrations.events.categoryTimeTracking', 'Time Tracking') },
  { id: 'timeoff.requested', label: t('integrations.events.timeOffRequested', 'Time Off Requested'), category: t('integrations.events.categoryTimeOff', 'Time Off') },
  { id: 'timeoff.approved', label: t('integrations.events.timeOffApproved', 'Time Off Approved'), category: t('integrations.events.categoryTimeOff', 'Time Off') },
  { id: 'timeoff.rejected', label: t('integrations.events.timeOffRejected', 'Time Off Rejected'), category: t('integrations.events.categoryTimeOff', 'Time Off') },
  { id: 'skill.verified', label: t('integrations.events.skillVerified', 'Skill Verified'), category: t('integrations.events.categorySkills', 'Skills') },
  { id: 'job.applied', label: t('integrations.events.jobApplication', 'Job Application'), category: t('integrations.events.categoryCareer', 'Career') },
];

const UPLIFT_FIELDS = {
  employee: [
    { id: 'id', label: 'Employee ID', type: 'string' },
    { id: 'employee_number', label: 'Employee Number', type: 'string' },
    { id: 'first_name', label: 'First Name', type: 'string' },
    { id: 'last_name', label: 'Last Name', type: 'string' },
    { id: 'email', label: 'Email', type: 'string' },
    { id: 'phone', label: 'Phone', type: 'string' },
    { id: 'hire_date', label: 'Hire Date', type: 'date' },
    { id: 'department_id', label: 'Department ID', type: 'string' },
    { id: 'department_name', label: 'Department Name', type: 'string' },
    { id: 'location_id', label: 'Location ID', type: 'string' },
    { id: 'location_name', label: 'Location Name', type: 'string' },
    { id: 'role_id', label: 'Role ID', type: 'string' },
    { id: 'role_name', label: 'Role Name', type: 'string' },
    { id: 'hourly_rate', label: 'Hourly Rate', type: 'number' },
    { id: 'status', label: 'Status', type: 'string' },
  ],
  shift: [
    { id: 'id', label: 'Shift ID', type: 'string' },
    { id: 'employee_id', label: 'Employee ID', type: 'string' },
    { id: 'location_id', label: 'Location ID', type: 'string' },
    { id: 'date', label: 'Date', type: 'date' },
    { id: 'start_time', label: 'Start Time', type: 'time' },
    { id: 'end_time', label: 'End Time', type: 'time' },
    { id: 'break_minutes', label: 'Break (mins)', type: 'number' },
    { id: 'status', label: 'Status', type: 'string' },
  ],
  timeentry: [
    { id: 'id', label: 'Entry ID', type: 'string' },
    { id: 'employee_id', label: 'Employee ID', type: 'string' },
    { id: 'shift_id', label: 'Shift ID', type: 'string' },
    { id: 'clock_in', label: 'Clock In', type: 'datetime' },
    { id: 'clock_out', label: 'Clock Out', type: 'datetime' },
    { id: 'hours_worked', label: 'Hours Worked', type: 'number' },
    { id: 'status', label: 'Status', type: 'string' },
  ],
};

const SCHEDULE_OPTIONS = [
  { id: 'every_5_min', label: 'Every 5 minutes', cron: '*/5 * * * *' },
  { id: 'every_15_min', label: 'Every 15 minutes', cron: '*/15 * * * *' },
  { id: 'every_hour', label: 'Every hour', cron: '0 * * * *' },
  { id: 'every_6_hours', label: 'Every 6 hours', cron: '0 */6 * * *' },
  { id: 'daily_midnight', label: 'Daily at midnight', cron: '0 0 * * *' },
  { id: 'daily_6am', label: 'Daily at 6 AM', cron: '0 6 * * *' },
  { id: 'weekly_monday', label: 'Weekly on Monday', cron: '0 0 * * 1' },
  { id: 'custom', label: 'Custom CRON', cron: '' },
];
const INITIAL_CUSTOM_APIS = [
  {
    id: 'api-1',
    name: 'Sync to Legacy HR System',
    description: 'Push employee updates to the old HR database',
    method: 'POST',
    url: 'https://legacy-hr.company.com/api/v1/employees',
    authType: 'api_key',
    triggerType: 'event',
    triggerEvents: ['employee.created', 'employee.updated'],
    enabled: true,
    lastRun: '2026-01-09T14:30:00Z',
    lastStatus: 'success',
    runCount: 156,
    errorCount: 2,
  },
  {
    id: 'api-2',
    name: 'Daily Timesheet Export',
    description: 'Send approved timesheets to payroll system',
    method: 'POST',
    url: 'https://payroll.company.com/api/timesheets/import',
    authType: 'bearer',
    triggerType: 'schedule',
    schedule: 'daily_6am',
    enabled: true,
    lastRun: '2026-01-09T06:00:00Z',
    lastStatus: 'success',
    runCount: 45,
    errorCount: 0,
  },
  {
    id: 'api-3',
    name: 'Slack Shift Notification',
    description: 'Post to Slack when shifts are published (configure your webhook URL)',
    method: 'POST',
    url: 'https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN',
    authType: 'none',
    triggerType: 'event',
    triggerEvents: ['shift.created'],
    enabled: false,
    lastRun: null,
    lastStatus: 'not_configured',
    runCount: 0,
    errorCount: 0,
  },
];

// -------------------- HELPER COMPONENTS --------------------

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Badge = ({ children, variant = 'default', size = 'sm' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={cn('rounded-full font-medium', variants[variant], sizes[size])}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'default', size = 'md', className, ...props }) => {
  const variants = {
    default: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200',
    primary: 'bg-orange-500 hover:bg-orange-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400',
    outline: 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5',
  };

  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        props.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, error, className, ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
    <input
      className={cn(
        'w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
        'focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-shadow',
        error ? 'border-red-300 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const Select = ({ label, options, className, ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
    <select
      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Toggle = ({ enabled, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className="flex items-center gap-3"
  >
    <div className={cn(
      'relative w-11 h-6 rounded-full transition-colors',
      enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'
    )}>
      <div className={cn(
        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
        enabled ? 'translate-x-6' : 'translate-x-1'
      )} />
    </div>
    {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
  </button>
);

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// -------------------- API LIST VIEW --------------------

const ApiListItem = ({ api, onEdit, onToggle, onDelete, onTest, onViewLogs }) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const getTriggerLabel = () => {
    switch (api.triggerType) {
      case 'event':
        return t('apiFactory.list.eventsCount', '{{count}} events', { count: api.triggerEvents?.length || 0 });
      case 'schedule':
        return SCHEDULE_OPTIONS.find(s => s.id === api.schedule)?.label || t('apiFactory.list.scheduled', 'Scheduled');
      case 'webhook':
        return t('apiFactory.list.incomingWebhook', 'Incoming webhook');
      default:
        return t('apiFactory.list.manual', 'Manual');
    }
  };

  return (
    <div className={cn(
      'bg-white dark:bg-slate-800 rounded-xl border p-4 transition-all',
      api.enabled
        ? 'border-slate-200 dark:border-slate-700'
        : 'border-slate-200 dark:border-slate-700 opacity-60'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{api.name}</h3>
            <Badge variant={api.method === 'GET' ? 'info' : api.method === 'POST' ? 'success' : 'warning'}>
              {api.method}
            </Badge>
            {!api.enabled && <Badge variant="default">{t('apiFactory.list.disabled', 'Disabled')}</Badge>}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mb-2">{api.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              {api.triggerType === 'event' && <Zap className="w-3 h-3" />}
              {api.triggerType === 'schedule' && <Clock className="w-3 h-3" />}
              {api.triggerType === 'manual' && <Play className="w-3 h-3" />}
              {api.triggerType === 'webhook' && <Webhook className="w-3 h-3" />}
              {getTriggerLabel()}
            </span>
            <span>•</span>
            <span>{t('apiFactory.list.runsCount', '{{count}} runs', { count: api.runCount })}</span>
            {api.errorCount > 0 && (
              <>
                <span>•</span>
                <span className="text-red-500">{t('apiFactory.list.errorsCount', '{{count}} errors', { count: api.errorCount })}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {api.lastStatus && (
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              api.lastStatus === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
            )}>
              {api.lastStatus === 'success'
                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                : <AlertCircle className="w-4 h-4 text-red-500" />
              }
            </div>
          )}

          <Toggle enabled={api.enabled} onChange={() => onToggle(api.id)} />

          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                  <button
                    onClick={() => { onEdit(api); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> {t('apiFactory.list.edit', 'Edit')}
                  </button>
                  <button
                    onClick={() => { onTest(api); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <TestTube className="w-4 h-4" /> {t('apiFactory.list.test', 'Test')}
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onViewLogs && onViewLogs(); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <History className="w-4 h-4" /> {t('apiFactory.list.viewLogs', 'View Logs')}
                  </button>
                  <hr className="my-1 border-slate-200 dark:border-slate-700" />
                  <button
                    onClick={() => { onDelete(api.id); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> {t('apiFactory.list.delete', 'Delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
        <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded truncate max-w-[60%]">
          {api.url}
        </code>
        <span>{t('apiFactory.list.lastRun', 'Last run')}: {formatDate(api.lastRun)}</span>
      </div>
    </div>
  );
};

// -------------------- API EDITOR --------------------

const ApiEditor = ({ api, onSave, onCancel, onTest }) => {
  const { t } = useTranslation();

  // Memoized translations for constants
  const AUTH_TYPES = useMemo(() => getAuthTypes(t), [t]);
  const TRIGGER_TYPES = useMemo(() => getTriggerTypes(t), [t]);
  const UPLIFT_EVENTS = useMemo(() => getUpliftEvents(t), [t]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    method: 'POST',
    url: '',
    authType: 'none',
    authConfig: {},
    headers: [{ key: '', value: '' }],
    triggerType: 'manual',
    triggerEvents: [],
    schedule: 'daily_6am',
    customCron: '',
    fieldMappings: [],
    transformations: [],
    requestBody: '{\n  \n}',
    enabled: true,
    ...api,
  });

  const [activeTab, setActiveTab] = useState('request');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAuthConfig = (field, value) => {
    setFormData(prev => ({
      ...prev,
      authConfig: { ...prev.authConfig, [field]: value }
    }));
  };

  const addHeader = () => {
    setFormData(prev => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '' }]
    }));
  };

  const updateHeader = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers.map((h, i) => i === index ? { ...h, [field]: value } : h)
    }));
  };

  const removeHeader = (index) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }));
  };

  const toggleEvent = (eventId) => {
    setFormData(prev => ({
      ...prev,
      triggerEvents: prev.triggerEvents.includes(eventId)
        ? prev.triggerEvents.filter(e => e !== eventId)
        : [...prev.triggerEvents, eventId]
    }));
  };

  const addFieldMapping = () => {
    setFormData(prev => ({
      ...prev,
      fieldMappings: [...prev.fieldMappings, { upliftField: '', externalField: '', transform: 'none' }]
    }));
  };

  const updateFieldMapping = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      fieldMappings: prev.fieldMappings.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }));
  };

  const removeFieldMapping = (index) => {
    setFormData(prev => ({
      ...prev,
      fieldMappings: prev.fieldMappings.filter((_, i) => i !== index)
    }));
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      if (formData.id) {
        const result = await integrationsApi.test(formData.id);
        setTestResult({
          success: result?.success ?? true,
          statusCode: result?.statusCode ?? 200,
          duration: result?.duration ?? 0,
          response: result?.response ?? result,
        });
      } else {
        // No saved ID yet, cannot test against backend
        setTestResult({
          success: false,
          statusCode: 0,
          duration: 0,
          response: { error: t('integrations.api.saveFirstBeforeTesting', 'Save the integration first before testing') },
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Test failed:', error);
      setTestResult({
        success: false,
        statusCode: error.status || 0,
        duration: 0,
        response: { error: error.message || t('integrations.api.testRequestFailed', 'Test request failed') },
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...formData,
      headers: formData.headers.filter(h => h.key),
    });
  };

  const tabs = [
    { id: 'request', label: t('apiFactory.editor.tabs.request', 'Request'), icon: Globe },
    { id: 'auth', label: t('apiFactory.editor.tabs.authentication', 'Authentication'), icon: Lock },
    { id: 'trigger', label: t('apiFactory.editor.tabs.trigger', 'Trigger'), icon: Zap },
    { id: 'mapping', label: t('apiFactory.editor.tabs.fieldMapping', 'Field Mapping'), icon: ArrowLeftRight },
    { id: 'test', label: t('apiFactory.editor.tabs.test', 'Test'), icon: TestTube },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {api ? t('apiFactory.editor.editTitle', 'Edit API Integration') : t('apiFactory.editor.createTitle', 'Create API Integration')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t('apiFactory.editor.subtitle', 'Configure your custom REST API connection')}</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Name & Description */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
          <Input
            label={t('apiFactory.editor.integrationName', 'Integration Name')}
            placeholder={t('apiFactory.editor.integrationNamePlaceholder', 'e.g., Sync to Payroll System')}
            value={formData.name}
            onChange={e => updateField('name', e.target.value)}
          />
          <Input
            label={t('apiFactory.editor.description', 'Description')}
            placeholder={t('apiFactory.editor.descriptionPlaceholder', 'What does this integration do?')}
            value={formData.description}
            onChange={e => updateField('description', e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Request Tab */}
          {activeTab === 'request' && (
            <div className="space-y-6">
              {/* Method & URL */}
              <div className="flex gap-3">
                <Select
                  label={t('apiFactory.editor.method', 'Method')}
                  value={formData.method}
                  onChange={e => updateField('method', e.target.value)}
                  options={HTTP_METHODS.map(m => ({ value: m, label: m }))}
                  className="w-32"
                />
                <Input
                  label={t('apiFactory.editor.url', 'URL')}
                  placeholder="https://api.example.com/endpoint"
                  value={formData.url}
                  onChange={e => updateField('url', e.target.value)}
                  className="flex-1"
                />
              </div>

              {/* Headers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('apiFactory.editor.headers', 'Headers')}</label>
                  <Button variant="ghost" size="sm" onClick={addHeader}>
                    <Plus className="w-4 h-4" /> {t('apiFactory.editor.addHeader', 'Add Header')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={t('apiFactory.editor.headerName', 'Header name')}
                        value={header.key}
                        onChange={e => updateHeader(index, 'key', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder={t('apiFactory.editor.headerValue', 'Value')}
                        value={header.value}
                        onChange={e => updateHeader(index, 'value', e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeHeader(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Body */}
              {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('apiFactory.editor.requestBodyJson', 'Request Body (JSON)')}
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.requestBody}
                      onChange={e => updateField('requestBody', e.target.value)}
                      className="w-full h-48 px-4 py-3 font-mono text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder='{"field": "{{employee.first_name}}"}'
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="info" size="xs">{t('apiFactory.editor.useVariables', 'Use {{field}} for variables')}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {t('apiFactory.editor.availableVariables', 'Available variables')}: {`{{employee.id}}`}, {`{{employee.first_name}}`}, {`{{employee.email}}`}, etc.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Auth Tab */}
          {activeTab === 'auth' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t('apiFactory.editor.authenticationType', 'Authentication Type')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AUTH_TYPES.map(auth => (
                    <button
                      key={auth.id}
                      onClick={() => updateField('authType', auth.id)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        formData.authType === auth.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      )}
                    >
                      <auth.icon className={cn(
                        'w-5 h-5 mb-2',
                        formData.authType === auth.id ? 'text-orange-500' : 'text-slate-400'
                      )} />
                      <p className="font-medium text-sm">{auth.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auth Config */}
              {formData.authType === 'api_key' && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <Select
                    label={t('apiFactory.editor.apiKeyLocation', 'API Key Location')}
                    value={formData.authConfig.location || 'header'}
                    onChange={e => updateAuthConfig('location', e.target.value)}
                    options={[
                      { value: 'header', label: t('apiFactory.editor.header', 'Header') },
                      { value: 'query', label: t('apiFactory.editor.queryParameter', 'Query Parameter') },
                    ]}
                  />
                  <Input
                    label={t('apiFactory.editor.keyName', 'Key Name')}
                    placeholder={t('apiFactory.editor.keyNamePlaceholder', 'e.g., X-API-Key')}
                    value={formData.authConfig.keyName || ''}
                    onChange={e => updateAuthConfig('keyName', e.target.value)}
                  />
                  <div className="relative">
                    <Input
                      label={t('apiFactory.editor.apiKey', 'API Key')}
                      type={showSecrets ? 'text' : 'password'}
                      placeholder={t('apiFactory.editor.enterApiKey', 'Enter your API key')}
                      value={formData.authConfig.apiKey || ''}
                      onChange={e => updateAuthConfig('apiKey', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {formData.authType === 'bearer' && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="relative">
                    <Input
                      label={t('apiFactory.editor.bearerToken', 'Bearer Token')}
                      type={showSecrets ? 'text' : 'password'}
                      placeholder={t('apiFactory.editor.enterToken', 'Enter your token')}
                      value={formData.authConfig.token || ''}
                      onChange={e => updateAuthConfig('token', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {formData.authType === 'basic' && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <Input
                    label={t('apiFactory.editor.username', 'Username')}
                    value={formData.authConfig.username || ''}
                    onChange={e => updateAuthConfig('username', e.target.value)}
                  />
                  <div className="relative">
                    <Input
                      label={t('apiFactory.editor.password', 'Password')}
                      type={showSecrets ? 'text' : 'password'}
                      value={formData.authConfig.password || ''}
                      onChange={e => updateAuthConfig('password', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {formData.authType === 'oauth2' && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <Input
                    label={t('apiFactory.editor.tokenUrl', 'Token URL')}
                    placeholder="https://auth.example.com/oauth/token"
                    value={formData.authConfig.tokenUrl || ''}
                    onChange={e => updateAuthConfig('tokenUrl', e.target.value)}
                  />
                  <Input
                    label={t('apiFactory.editor.clientId', 'Client ID')}
                    value={formData.authConfig.clientId || ''}
                    onChange={e => updateAuthConfig('clientId', e.target.value)}
                  />
                  <div className="relative">
                    <Input
                      label={t('apiFactory.editor.clientSecret', 'Client Secret')}
                      type={showSecrets ? 'text' : 'password'}
                      value={formData.authConfig.clientSecret || ''}
                      onChange={e => updateAuthConfig('clientSecret', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Input
                    label={t('apiFactory.editor.scopes', 'Scopes (comma-separated)')}
                    placeholder={t('integrations.api.scopePlaceholder', 'read,write')}
                    value={formData.authConfig.scopes || ''}
                    onChange={e => updateAuthConfig('scopes', e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Trigger Tab */}
          {activeTab === 'trigger' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t('apiFactory.editor.whenShouldRun', 'When should this integration run?')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TRIGGER_TYPES.map(trigger => (
                    <button
                      key={trigger.id}
                      onClick={() => updateField('triggerType', trigger.id)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        formData.triggerType === trigger.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      )}
                    >
                      <trigger.icon className={cn(
                        'w-5 h-5 mb-2',
                        formData.triggerType === trigger.id ? 'text-orange-500' : 'text-slate-400'
                      )} />
                      <p className="font-medium text-sm">{trigger.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{trigger.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Selection */}
              {formData.triggerType === 'event' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t('apiFactory.editor.selectEvents', 'Select Events')}
                  </label>
                  <div className="space-y-4">
                    {Object.entries(
                      UPLIFT_EVENTS.reduce((acc, event) => {
                        if (!acc[event.category]) acc[event.category] = [];
                        acc[event.category].push(event);
                        return acc;
                      }, {})
                    ).map(([category, events]) => (
                      <div key={category}>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {events.map(event => (
                            <button
                              key={event.id}
                              onClick={() => toggleEvent(event.id)}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                formData.triggerEvents.includes(event.id)
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                              )}
                            >
                              {event.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Selection */}
              {formData.triggerType === 'schedule' && (
                <div className="space-y-4">
                  <Select
                    label={t('apiFactory.editor.schedule', 'Schedule')}
                    value={formData.schedule}
                    onChange={e => updateField('schedule', e.target.value)}
                    options={SCHEDULE_OPTIONS.map(s => ({ value: s.id, label: s.label }))}
                  />
                  {formData.schedule === 'custom' && (
                    <Input
                      label={t('apiFactory.editor.cronExpression', 'CRON Expression')}
                      placeholder="0 6 * * *"
                      value={formData.customCron}
                      onChange={e => updateField('customCron', e.target.value)}
                    />
                  )}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <Info className="w-4 h-4 inline mr-1" />
                      {t('apiFactory.editor.scheduleUtcNote', 'Schedule uses UTC timezone. Current CRON')}: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
                        {SCHEDULE_OPTIONS.find(s => s.id === formData.schedule)?.cron || formData.customCron}
                      </code>
                    </p>
                  </div>
                </div>
              )}

              {/* Webhook Info */}
              {formData.triggerType === 'webhook' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('apiFactory.editor.yourWebhookUrl', 'Your Webhook URL')}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700">
                        https://api.uplift.hr/webhooks/custom/{formData.id || 'new'}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(`https://api.uplift.hr/webhooks/custom/${formData.id || 'new'}`); }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('apiFactory.editor.webhookPostNote', "Send POST requests to this URL. We'll process incoming data and map it to Uplift.")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mapping Tab */}
          {activeTab === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">{t('apiFactory.editor.fieldMappings', 'Field Mappings')}</h3>
                  <p className="text-sm text-slate-500">{t('apiFactory.editor.fieldMappingsDesc', 'Map Uplift fields to your external API fields')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={addFieldMapping}>
                  <Plus className="w-4 h-4" /> {t('apiFactory.editor.addMapping', 'Add Mapping')}
                </Button>
              </div>

              {formData.fieldMappings.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <ArrowLeftRight className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500">{t('apiFactory.editor.noFieldMappings', 'No field mappings yet')}</p>
                  <p className="text-sm text-slate-400 mt-1">{t('apiFactory.editor.addMappingsDesc', 'Add mappings to transform data between systems')}</p>
                  <Button variant="primary" size="sm" className="mt-4" onClick={addFieldMapping}>
                    <Plus className="w-4 h-4" /> {t('apiFactory.editor.addFirstMapping', 'Add First Mapping')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.fieldMappings.map((mapping, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />

                      <Select
                        value={mapping.upliftField}
                        onChange={e => updateFieldMapping(index, 'upliftField', e.target.value)}
                        options={[
                          { value: '', label: t('apiFactory.editor.selectUpliftField', 'Select Uplift field...') },
                          ...UPLIFT_FIELDS.employee.map(f => ({ value: `employee.${f.id}`, label: f.label })),
                        ]}
                        className="flex-1"
                      />

                      <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

                      <Input
                        placeholder={t('apiFactory.editor.externalFieldName', 'External field name')}
                        value={mapping.externalField}
                        onChange={e => updateFieldMapping(index, 'externalField', e.target.value)}
                        className="flex-1"
                      />

                      <Select
                        value={mapping.transform}
                        onChange={e => updateFieldMapping(index, 'transform', e.target.value)}
                        options={[
                          { value: 'none', label: t('apiFactory.editor.noTransform', 'No transform') },
                          { value: 'uppercase', label: 'UPPERCASE' },
                          { value: 'lowercase', label: 'lowercase' },
                          { value: 'date_iso', label: t('apiFactory.editor.dateIso', 'Date → ISO') },
                          { value: 'date_uk', label: t('apiFactory.editor.dateUk', 'Date → UK format') },
                          { value: 'bool_yn', label: t('apiFactory.editor.boolYn', 'Bool → Y/N') },
                        ]}
                        className="w-40"
                      />

                      <Button variant="ghost" size="sm" onClick={() => removeFieldMapping(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <Info className="w-4 h-4 inline mr-1" />
                  {t('apiFactory.editor.fieldMappingTip', 'Field mappings are used to build the request body automatically. You can also use {{field}} syntax in the Request tab for custom JSON structures.')}
                </p>
              </div>
            </div>
          )}

          {/* Test Tab */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">{t('apiFactory.editor.testConfiguration', 'Test Configuration')}</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {t('apiFactory.editor.testDescription', "Send a test request to verify your configuration. We'll use sample data.")}
                </p>

                <div className="flex items-center gap-3">
                  <Badge variant="info">{formData.method}</Badge>
                  <code className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1">
                    {formData.url || 'https://...'}
                  </code>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleTest}
                disabled={testing || !formData.url}
                className="w-full"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('apiFactory.editor.testing', 'Testing...')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {t('apiFactory.editor.sendTestRequest', 'Send Test Request')}
                  </>
                )}
              </Button>

              {testResult && (
                <div className={cn(
                  'rounded-xl border-2 overflow-hidden',
                  testResult.success
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : 'border-red-200 dark:border-red-800'
                )}>
                  <div className={cn(
                    'px-4 py-3 flex items-center justify-between',
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-900/30'
                      : 'bg-red-50 dark:bg-red-900/30'
                  )}>
                    <div className="flex items-center gap-3">
                      {testResult.success
                        ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                        : <AlertCircle className="w-5 h-5 text-red-500" />
                      }
                      <span className={cn(
                        'font-medium',
                        testResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                      )}>
                        {testResult.success ? t('apiFactory.editor.success', 'Success') : t('apiFactory.editor.failed', 'Failed')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-500">{t('apiFactory.editor.status', 'Status')}: <strong>{testResult.statusCode}</strong></span>
                      <span className="text-slate-500">{t('apiFactory.editor.time', 'Time')}: <strong>{testResult.duration}ms</strong></span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900">
                    <p className="text-xs text-slate-400 mb-2">{t('apiFactory.editor.response', 'Response')}</p>
                    <pre className="text-sm text-emerald-400 font-mono overflow-x-auto">
                      {JSON.stringify(testResult.response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
          <Toggle
            enabled={formData.enabled}
            onChange={v => updateField('enabled', v)}
            label={t('apiFactory.editor.enableIntegration', 'Enable integration')}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>{t('apiFactory.editor.cancel', 'Cancel')}</Button>
            <Button variant="primary" onClick={handleSave} disabled={!formData.name || !formData.url}>
              <Save className="w-4 h-4" />
              {api ? t('apiFactory.editor.saveChanges', 'Save Changes') : t('apiFactory.editor.createIntegration', 'Create Integration')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------- MAIN COMPONENT --------------------

const ApiFactory = () => {
  const { t } = useTranslation();
  const [customApis, setCustomApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingApi, setEditingApi] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'logs'

  // Load custom APIs from backend on mount
  useEffect(() => {
    const loadApis = async () => {
      try {
        setLoading(true);
        const data = await integrationsApi.getApiKeys();
        setCustomApis(Array.isArray(data) ? data : data?.apiKeys || data?.data || []);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to load custom APIs:', error);
        setCustomApis([]);
      } finally {
        setLoading(false);
      }
    };
    loadApis();
  }, []);

  const filteredApis = customApis.filter(api =>
    (api.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (api.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setEditingApi(null);
    setEditorOpen(true);
  };

  const handleEdit = (api) => {
    setEditingApi(api);
    setEditorOpen(true);
  };

  const handleSave = async (apiData) => {
    try {
      if (editingApi) {
        const updated = await integrationsApi.update(editingApi.id, apiData);
        setCustomApis(prev => prev.map(api =>
          api.id === editingApi.id ? { ...api, ...apiData, ...updated } : api
        ));
      } else {
        const created = await integrationsApi.createApiKey(apiData);
        setCustomApis(prev => [...prev, {
          ...apiData,
          id: created?.id || `api-${Date.now()}`,
          lastRun: null,
          lastStatus: null,
          runCount: 0,
          errorCount: 0,
          ...created,
        }]);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save API integration:', error);
    }
    setEditorOpen(false);
    setEditingApi(null);
  };

  const handleToggle = (apiId) => {
    setCustomApis(prev => prev.map(api =>
      api.id === apiId ? { ...api, enabled: !api.enabled } : api
    ));
    // Fire and forget the update
    const api = customApis.find(a => a.id === apiId);
    if (api) {
      integrationsApi.update(apiId, { enabled: !api.enabled }).catch(error => {
        if (import.meta.env.DEV) console.error('Failed to toggle API:', error);
      });
    }
  };

  const handleDelete = async (apiId) => {
    if (!confirm(t('apiFactory.deleteConfirm', 'Are you sure you want to delete this integration?'))) return;

    const backup = customApis.find(a => a.id === apiId);
    setCustomApis(prev => prev.filter(api => api.id !== apiId));

    try {
      await integrationsApi.revokeApiKey(apiId);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete API integration:', error);
      // Rollback
      if (backup) setCustomApis(prev => [...prev, backup]);
    }
  };

  const handleTest = (api) => {
    setEditingApi(api);
    setEditorOpen(true);
    // Will open to test tab
  };

  const stats = {
    total: customApis.length,
    active: customApis.filter(a => a.enabled).length,
    runsToday: customApis.reduce((sum, a) => sum + (a.runsToday || 0), 0),
    errors: customApis.reduce((sum, a) => sum + (a.errorCount || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-6 h-6 text-orange-500" />
            {t('apiFactory.title', 'API Factory')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('apiFactory.subtitle', 'Build custom REST API integrations without writing code')}
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          {t('apiFactory.newIntegration', 'New Integration')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('apiFactory.stats.totalIntegrations', 'Total Integrations')}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('apiFactory.stats.active', 'Active')}</p>
          <p className="text-2xl font-bold text-emerald-500">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('apiFactory.stats.runsToday', 'Runs Today')}</p>
          <p className="text-2xl font-bold text-blue-500">{stats.runsToday}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500">{t('apiFactory.stats.totalErrors', 'Total Errors')}</p>
          <p className="text-2xl font-bold text-red-500">{stats.errors}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('apiFactory.searchPlaceholder', 'Search integrations...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
          />
        </div>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'
            )}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('logs')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              viewMode === 'logs'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'
            )}
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {loading ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-slate-300 animate-spin" />
              <p className="text-slate-500">{t('apiFactory.loadingIntegrations', 'Loading integrations...')}</p>
            </div>
          ) : filteredApis.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <Code className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {searchQuery ? t('apiFactory.noIntegrationsFound', 'No integrations found') : t('apiFactory.noIntegrationsYet', 'No custom integrations yet')}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchQuery
                  ? t('apiFactory.tryDifferentSearch', 'Try a different search term')
                  : t('apiFactory.createFirstDesc', 'Create your first custom API integration to connect any REST API')
                }
              </p>
              {!searchQuery && (
                <Button variant="primary" onClick={handleCreate}>
                  <Plus className="w-4 h-4" />
                  {t('apiFactory.createIntegration', 'Create Integration')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApis.map(api => (
                <ApiListItem
                  key={api.id}
                  api={api}
                  onEdit={handleEdit}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onTest={handleTest}
                  onViewLogs={() => setViewMode('logs')}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Logs View */}
      {viewMode === 'logs' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold">{t('apiFactory.logs.executionLogs', 'Execution Logs')}</h3>
            <Button variant="ghost" size="sm" onClick={() => alert(t('common.exportComingSoon', 'Export coming soon'))}>
              <Download className="w-4 h-4" /> {t('apiFactory.logs.export', 'Export')}
            </Button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {customApis.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                {t('apiFactory.logs.noData', 'No data yet. Execution logs will appear here once integrations run.')}
              </div>
            ) : (
              customApis.filter(a => a.lastRun).map((api) => (
                <div key={api.id} className="px-4 py-3 flex items-center gap-4 text-sm">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    api.lastStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                  )} />
                  <span className="font-medium text-slate-900 dark:text-white w-48 truncate">
                    {api.name || t('apiFactory.logs.unknown', 'Unknown')}
                  </span>
                  <Badge variant={api.lastStatus === 'success' ? 'success' : 'error'} size="xs">
                    {api.lastStatus === 'success' ? '200 OK' : t('apiFactory.logs.error', 'Error')}
                  </Badge>
                  <span className="text-slate-500">{t('apiFactory.list.runsCount', '{{count}} runs', { count: api.runCount || 0 })}</span>
                  <span className="text-slate-400 ml-auto">
                    {api.lastRun ? formatDate(api.lastRun) : '-'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
            {t('apiFactory.helpBanner.title', 'Need help building an integration?')}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {t('apiFactory.helpBanner.description', 'Check our API documentation for examples, or contact support for complex use cases.')}
          </p>
        </div>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <ApiEditor
          api={editingApi}
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); setEditingApi(null); }}
          onTest={handleTest}
        />
      )}
    </div>
  );
};

export default ApiFactory;
