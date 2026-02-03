// ============================================================
// UPLIFT REST API KEYS MANAGEMENT
// Generate and manage API keys for external access to Uplift API
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Key, Plus, Copy, Check, X, Eye, EyeOff, Trash2, RefreshCw,
  Clock, Activity, Shield, ChevronDown, ChevronRight, AlertTriangle,
  Code, Download, ExternalLink, Lock, Settings, Info
} from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

// -------------------- CONSTANTS --------------------

const getScopesWithTranslations = (t) => ({
  'employees:read': t('integrations.scopes.employeesRead', 'View employee information'),
  'employees:write': t('integrations.scopes.employeesWrite', 'Create and update employees'),
  'schedules:read': t('integrations.scopes.schedulesRead', 'View schedules and shifts'),
  'schedules:write': t('integrations.scopes.schedulesWrite', 'Create and modify schedules'),
  'time:read': t('integrations.scopes.timeRead', 'View time entries'),
  'time:write': t('integrations.scopes.timeWrite', 'Create and modify time entries'),
  'skills:read': t('integrations.scopes.skillsRead', 'View skills and certifications'),
  'skills:write': t('integrations.scopes.skillsWrite', 'Manage skills and verifications'),
  'locations:read': t('integrations.scopes.locationsRead', 'View location information'),
  'locations:write': t('integrations.scopes.locationsWrite', 'Manage locations'),
  'reports:read': t('integrations.scopes.reportsRead', 'Access reports data'),
  'webhooks:manage': t('integrations.scopes.webhooksManage', 'Configure webhooks'),
  'admin': t('integrations.scopes.admin', 'Full administrative access'),
});

const getRateTiersWithTranslations = (t) => [
  { id: 'basic', name: t('integrations.rateLimits.basic', 'Basic'), requests: '60/min', daily: '10,000/day' },
  { id: 'standard', name: t('integrations.rateLimits.standard', 'Standard'), requests: '120/min', daily: '50,000/day' },
  { id: 'premium', name: t('integrations.rateLimits.premium', 'Premium'), requests: '300/min', daily: '200,000/day' },
];

// -------------------- HELPER COMPONENTS --------------------

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', variants[variant])}>
      {children}
    </span>
  );
};

const CopyButton = ({ text, label, t }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
      title={copied ? t('integrations.copied', 'Copied!') : t('integrations.copy', 'Copy') + ' ' + label}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );
};

// -------------------- API KEY CARD --------------------

const ApiKeyCard = ({ apiKey, onRevoke, onRegenerate, onViewUsage }) => {
  const { t } = useTranslation();
  const [showKey, setShowKey] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();
  const scopes = typeof apiKey.scopes === 'string' ? JSON.parse(apiKey.scopes) : apiKey.scopes;

  return (
    <div className={cn(
      'bg-white dark:bg-slate-800 rounded-xl border p-4 transition-all',
      isExpired ? 'border-red-200 dark:border-red-800' : 'border-slate-200 dark:border-slate-700',
      !apiKey.isActive && 'opacity-60'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            apiKey.isActive ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-100 text-slate-400'
          )}>
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{apiKey.name}</h3>
            <p className="text-xs text-slate-500">{apiKey.description || t('restApiKeys.card.noDescription', 'No description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpired ? (
            <Badge variant="error">{t('restApiKeys.card.expired', 'Expired')}</Badge>
          ) : apiKey.isActive ? (
            <Badge variant="success">{t('restApiKeys.card.active', 'Active')}</Badge>
          ) : (
            <Badge variant="warning">{t('restApiKeys.card.inactive', 'Inactive')}</Badge>
          )}
        </div>
      </div>

      {/* Key ID */}
      <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
        <code className="text-sm font-mono text-slate-700 dark:text-slate-300 flex-1">
          {apiKey.maskedKeyId || apiKey.keyId?.substring(0, 20) + '...'}
        </code>
        <CopyButton text={apiKey.keyId} label={t('restApiKeys.card.keyId', 'Key ID')} t={t} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div>
          <span className="text-slate-500">{t('restApiKeys.card.requests', 'Requests')}</span>
          <p className="font-medium">{apiKey.requestCount?.toLocaleString() || 0}</p>
        </div>
        <div>
          <span className="text-slate-500">{t('restApiKeys.card.lastUsed', 'Last Used')}</span>
          <p className="font-medium">
            {apiKey.lastUsedAt
              ? new Date(apiKey.lastUsedAt).toLocaleDateString()
              : t('restApiKeys.card.never', 'Never')}
          </p>
        </div>
        <div>
          <span className="text-slate-500">{t('restApiKeys.card.rateLimit', 'Rate Limit')}</span>
          <p className="font-medium capitalize">{apiKey.rateLimitTier || t('restApiKeys.card.standard', 'Standard')}</p>
        </div>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-sm text-slate-500 hover:text-slate-700"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {expanded ? t('restApiKeys.card.hideDetails', 'Hide details') : t('restApiKeys.card.showDetails', 'Show details')}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
          {/* Scopes */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 mb-2">{t('restApiKeys.card.scopes', 'SCOPES')}</h4>
            <div className="flex flex-wrap gap-1">
              {scopes?.map(scope => (
                <span key={scope} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                  {scope}
                </span>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">{t('restApiKeys.card.created', 'Created')}</span>
              <p>{new Date(apiKey.createdAt).toLocaleDateString()}</p>
            </div>
            {apiKey.expiresAt && (
              <div>
                <span className="text-slate-500">{t('restApiKeys.card.expires', 'Expires')}</span>
                <p className={isExpired ? 'text-red-500' : ''}>
                  {new Date(apiKey.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onViewUsage(apiKey)}
              className="flex-1 px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-1"
            >
              <Activity className="w-4 h-4" /> {t('restApiKeys.card.usage', 'Usage')}
            </button>
            <button
              onClick={() => onRegenerate(apiKey)}
              className="flex-1 px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> {t('restApiKeys.card.regenerate', 'Regenerate')}
            </button>
            <button
              onClick={() => onRevoke(apiKey)}
              className="px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> {t('restApiKeys.card.revoke', 'Revoke')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------- CREATE KEY MODAL --------------------

const CreateKeyModal = ({ open, onClose, onCreate }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedScopes, setSelectedScopes] = useState(['employees:read', 'schedules:read']);
  const [rateTier, setRateTier] = useState('standard');
  const [expiresIn, setExpiresIn] = useState('never');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleCreate = async () => {
    if (!name) return;

    setCreating(true);
    setCreateError(null);
    try {
      // Calculate expiration
      let expiresAt = null;
      if (expiresIn !== 'never') {
        const days = parseInt(expiresIn);
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const result = await api.post('/integrations/api-keys', {
        name,
        description,
        scopes: selectedScopes,
        rateLimitTier: rateTier,
        expiresAt,
      });

      setCreatedKey(result);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to create API key:', error);
      setCreateError(error.message || t('restApiKeys.create.createError', 'Failed to create API key. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (createdKey) {
      onCreate?.(createdKey);
    }
    setName('');
    setDescription('');
    setSelectedScopes(['employees:read', 'schedules:read']);
    setCreatedKey(null);
    onClose();
  };

  const toggleScope = (scope) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {createdKey ? t('restApiKeys.create.keyCreatedTitle', 'API Key Created') : t('restApiKeys.create.createTitle', 'Create API Key')}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {createdKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">{t('restApiKeys.create.keyCreatedSuccess', 'API key created successfully')}</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                      {t('restApiKeys.create.copySecretWarning', "Copy your secret key now. You won't be able to see it again!")}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('restApiKeys.create.keyIdLabel', 'Key ID')}
                </label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <code className="text-sm font-mono flex-1 text-slate-600 dark:text-slate-400">
                    {createdKey.keyId}
                  </code>
                  <CopyButton text={createdKey.keyId} label={t('restApiKeys.create.keyIdLabel', 'Key ID')} t={t} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('restApiKeys.create.secretKeyLabel', 'Secret Key')}
                </label>
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <code className="text-sm font-mono flex-1 text-slate-600 dark:text-slate-400 break-all">
                    {showSecret ? createdKey.secretKey : '\u2022'.repeat(40)}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <CopyButton text={createdKey.secretKey} label={t('restApiKeys.create.secretKeyLabel', 'Secret Key')} t={t} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('restApiKeys.create.fullApiKeyLabel', 'Full API Key (for Authorization header)')}
                </label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <code className="text-sm font-mono flex-1 text-slate-600 dark:text-slate-400 break-all">
                    {showSecret ? createdKey.fullKey : createdKey.keyId + '.\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  </code>
                  <CopyButton text={createdKey.fullKey} label={t('restApiKeys.create.fullKeyLabel', 'Full Key')} t={t} />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {t('restApiKeys.create.authHeaderNote', 'Use this in your Authorization header')}: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Bearer {'{'}full_key{'}'}</code>
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600"
              >
                {t('restApiKeys.create.done', 'Done')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('restApiKeys.create.keyName', 'Key Name')} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('restApiKeys.create.keyNamePlaceholder', 'e.g., Production API Key')}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('restApiKeys.create.description', 'Description')}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('restApiKeys.create.descriptionPlaceholder', 'What will this key be used for?')}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('restApiKeys.create.permissions', 'Permissions')}
                </label>
                <div className="max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg space-y-2">
                  {Object.entries(getScopesWithTranslations(t)).map(([scope, desc]) => (
                    <label key={scope} className="flex items-start gap-3 cursor-pointer hover:bg-white dark:hover:bg-slate-800 p-2 rounded-lg">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="w-4 h-4 mt-0.5 rounded text-orange-500"
                      />
                      <div>
                        <span className="text-sm font-medium">{scope}</span>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('restApiKeys.create.rateLimit', 'Rate Limit')}
                  </label>
                  <select
                    value={rateTier}
                    onChange={e => setRateTier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  >
                    {getRateTiersWithTranslations(t).map(tier => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} ({tier.requests})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('restApiKeys.create.expiration', 'Expiration')}
                  </label>
                  <select
                    value={expiresIn}
                    onChange={e => setExpiresIn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  >
                    <option value="never">{t('restApiKeys.create.neverExpires', 'Never expires')}</option>
                    <option value="30">{t('restApiKeys.create.thirtyDays', '30 days')}</option>
                    <option value="90">{t('restApiKeys.create.ninetyDays', '90 days')}</option>
                    <option value="365">{t('restApiKeys.create.oneYear', '1 year')}</option>
                  </select>
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{createError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50"
                >
                  {t('restApiKeys.create.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!name || creating}
                  className="flex-1 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {t('restApiKeys.create.createKey', 'Create Key')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------- MAIN COMPONENT --------------------

const RestApiKeys = () => {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const result = await api.get('/integrations/api-keys');
      setApiKeys(result.keys || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load API keys:', error);
      setApiKeys([]);
      setLoadError(error.message || t('restApiKeys.loadError', 'Failed to load API keys.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (newKey) => {
    setApiKeys([...apiKeys, {
      ...newKey,
      id: newKey.keyId,
      maskedKeyId: newKey.keyId.substring(0, 15) + '...',
      isActive: true,
      requestCount: 0,
      createdAt: new Date().toISOString(),
    }]);
  };

  const handleRevoke = async (key) => {
    if (!window.confirm(t('restApiKeys.revokeConfirm', 'Revoke API key "{{name}}"? This action cannot be undone.', { name: key.name }))) return;

    try {
      await api.delete(`/integrations/api-keys/${key.keyId}`);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to revoke key:', error);
    }
    setApiKeys(apiKeys.filter(k => k.id !== key.id));
  };

  const handleRegenerate = async (key) => {
    if (!window.confirm(t('restApiKeys.regenerateConfirm', 'Regenerate secret for "{{name}}"? The old secret will stop working immediately.', { name: key.name }))) return;

    try {
      const result = await api.post(`/integrations/api-keys/${key.keyId}/regenerate`);
      alert(t('restApiKeys.regenerateSuccess', "New secret key: {{secret}}\n\nSave this now - you won't see it again!", { secret: result.secretKey }));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to regenerate:', error);
      alert(t('restApiKeys.regenerateError', 'Failed to regenerate secret: {{message}}', { message: error.message || 'Please try again.' }));
    }
  };

  const handleViewUsage = (key) => {
    alert(t('restApiKeys.usageStats', 'Usage stats for {{name}}:\n\nTotal requests: {{requests}}\nLast used: {{lastUsed}}', {
      name: key.name,
      requests: key.requestCount?.toLocaleString(),
      lastUsed: key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : t('restApiKeys.card.never', 'Never'),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-orange-500" />
            {t('restApiKeys.title', 'REST API Keys')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('restApiKeys.subtitle', 'Generate API keys to access Uplift data from your applications')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl font-medium flex items-center gap-2"
          >
            <Code className="w-4 h-4" /> {t('restApiKeys.apiDocs', 'API Docs')}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-orange-500/30"
          >
            <Plus className="w-4 h-4" /> {t('restApiKeys.createKey', 'Create Key')}
          </button>
        </div>
      </div>

      {/* API Docs Panel */}
      {showDocs && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-5 h-5" /> {t('restApiKeys.docs.quickStart', 'Quick Start')}
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">{t('restApiKeys.docs.authentication', 'Authentication')}</h4>
              <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded overflow-x-auto">
{`curl -X GET "https://api.uplift.hr/v1/employees" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
              </pre>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">{t('restApiKeys.docs.exampleResponse', 'Example Response')}</h4>
              <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded overflow-x-auto">
{`{
  "employees": [...],
  "total": 25,
  "page": 1
}`}
              </pre>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/api/integrations/api-docs"
              target="_blank"
              className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
            >
              {t('restApiKeys.docs.viewFullDocs', 'View Full Documentation')} <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/api/integrations/api-docs"
              target="_blank"
              className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
            >
              {t('restApiKeys.docs.downloadSpec', 'Download OpenAPI Spec')} <Download className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">{t('restApiKeys.securityBanner.title', 'API Key Security')}</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {t('restApiKeys.securityBanner.description', 'Keep your API keys secure. Never expose them in client-side code or public repositories. If a key is compromised, revoke it immediately and create a new one.')}
          </p>
        </div>
      </div>

      {/* Keys List */}
      {loadError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
          <button onClick={loadApiKeys} className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium">{t('restApiKeys.retry', 'Retry')}</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-spin" />
          <p className="text-slate-500">{t('restApiKeys.loadingKeys', 'Loading API keys...')}</p>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <Key className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {t('restApiKeys.noKeysYet', 'No API keys yet')}
          </h3>
          <p className="text-slate-500 mb-6">
            {t('restApiKeys.createFirstDesc', 'Create your first API key to start integrating with Uplift')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {t('restApiKeys.createApiKey', 'Create API Key')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map(key => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onRevoke={handleRevoke}
              onRegenerate={handleRegenerate}
              onViewUsage={handleViewUsage}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateKeyModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default RestApiKeys;
