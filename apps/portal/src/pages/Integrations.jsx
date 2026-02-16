// ============================================================
// INTEGRATIONS PAGE - REAL API + TRANSLATIONS
// ============================================================
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { integrationsApi } from '../lib/api';
import {
  Database,
  Code,
  Zap,
  Check,
  Plus,
  Key,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Settings,
  ChevronRight,
  Search,
} from 'lucide-react';

export default function Integrations() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('hub');
  const [integrations, setIntegrations] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showKey, setShowKey] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [intResult, keyResult] = await Promise.all([
        integrationsApi.list(),
        integrationsApi.getApiKeys(),
      ]);
      setIntegrations(intResult?.integrations || intResult || []);
      setApiKeys(keyResult?.apiKeys || keyResult || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load integrations:', err);
      setError(err.message || t('integrations.loadError', 'Failed to load integrations'));
      setIntegrations([]);
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleConnectOrConfigure = async (integration) => {
    setActionLoading(integration.id);
    try {
      if (integration.status === 'connected') {
        // Navigate to configuration - for now fetch details
        const details = await integrationsApi.get(integration.id);
        // NOTE: Open configuration modal with details when implemented
        showToast(t('integrations.configLoaded', 'Configuration loaded'));
      } else {
        // Start connection
        const result = await integrationsApi.create({ name: integration.name, type: integration.type });
        showToast(t('integrations.connectionStarted', 'Connection initiated'));
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateApiKey = async (name) => {
    try {
      const result = await integrationsApi.createApiKey({ name });
      setApiKeys([...apiKeys, result.apiKey || result]);
      setShowCreateKeyModal(false);
      showToast(t('integrations.keyCreated', 'API key created'));
    } catch (err) {
      showToast(err.message || 'Failed to create API key', 'error');
    }
  };

  const handleCopyKey = async (key) => {
    try {
      const actualKey = key.key || key.secret || key.id;
      await navigator.clipboard.writeText(actualKey);
      const message = (key.key || key.secret)
        ? t('integrations.keyCopied', 'API key copied to clipboard')
        : t('integrations.keyIdCopied', 'Key ID copied to clipboard');
      showToast(message);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleRevokeKey = async (keyId) => {
    try {
      await integrationsApi.revokeApiKey(keyId);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      showToast(t('integrations.keyRevoked', 'API key revoked'));
    } catch (err) {
      showToast(err.message || 'Failed to revoke key', 'error');
    }
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const availableCount = integrations.filter(i => i.status === 'available').length;

  const stats = [
    { label: t('integrations.connected', 'Connected'), value: connectedCount, icon: Check, color: 'green' },
    { label: t('integrations.available', 'Available'), value: availableCount, icon: Database, color: 'blue' },
    { label: t('integrations.apiKeys', 'API Keys'), value: apiKeys.length, icon: Key, color: 'purple' },
    { label: t('integrations.errors', 'Errors'), value: integrations.filter(i => i.status === 'error').length, icon: AlertCircle, color: 'gray' },
  ];

  const tabs = [
    { id: 'hub', label: t('integrations.integrationHub', 'Integration Hub'), icon: Database },
    { id: 'api', label: t('integrations.apiFactory', 'API Factory'), icon: Code },
    { id: 'keys', label: t('integrations.apiKeys', 'API Keys'), icon: Key },
  ];

  const filteredIntegrations = integrations.filter(i =>
    i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-50 text-green-600 border-green-200',
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      gray: 'bg-gray-50 text-gray-600 border-gray-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
    };
    return colors[color] || colors.gray;
  };

  const getTypeIcon = (type) => {
    const icons = {
      hris: '\u{1F465}',
      communication: '\u{1F4AC}',
      calendar: '\u{1F4C5}',
      payroll: '\u{1F4B0}',
      scheduling: '\u{1F4CB}',
    };
    return icons[type] || '\u{1F50C}';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <button onClick={loadData} className="ml-auto text-sm text-red-600 hover:underline">{t('common.retry', 'Retry')}</button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('integrations.title', 'Integrations')}</h1>
        <p className="text-gray-600 mt-1">{t('integrations.subtitle', 'Connect Uplift to your existing HR systems and build custom integrations')}</p>
      </div>

      {/* Feature Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('hub')}
          className={`text-left rounded-xl p-5 border transition-all ${activeTab === 'hub' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
        >
          <Database className="w-8 h-8 text-blue-500 mb-3" />
          <h3 className="font-semibold text-gray-900">{t('integrations.hrisConnectors', 'HRIS Connectors')}</h3>
          <p className="text-sm text-gray-600 mt-1">{t('integrations.hrisDesc', 'Sync with ADP, Workday, BambooHR and more')}</p>
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`text-left rounded-xl p-5 border transition-all ${activeTab === 'api' ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-200' : 'bg-orange-50 border-orange-200 hover:border-orange-300'}`}
        >
          <Code className="w-8 h-8 text-orange-500 mb-3" />
          <h3 className="font-semibold text-gray-900">{t('integrations.apiFactory', 'API Factory')}</h3>
          <p className="text-sm text-gray-600 mt-1">{t('integrations.apiFactoryDesc', 'Build custom integrations with any system')}</p>
        </button>
        <button
          onClick={() => setActiveTab('keys')}
          className={`text-left rounded-xl p-5 border transition-all ${activeTab === 'keys' ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-200' : 'bg-amber-50 border-amber-200 hover:border-amber-300'}`}
        >
          <Zap className="w-8 h-8 text-amber-500 mb-3" />
          <h3 className="font-semibold text-gray-900">{t('integrations.realTimeSync', 'Real-time Sync')}</h3>
          <p className="text-sm text-gray-600 mt-1">{t('integrations.realtimeDesc', 'Webhooks and scheduled data transfers')}</p>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t('integrations.tabs.' + tab.key, tab.label)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">{t('integrations.connectTools', 'Connect Uplift to your existing tools')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('api')}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
              >
                <Code className="w-4 h-4" />
                {t('integrations.apiFactory', 'API Factory')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className={`rounded-xl p-5 border ${getColorClasses(stat.color)}`}>
                <stat.icon className="w-6 h-6 mb-2 opacity-60" />
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm opacity-80">{t('integrations.stats.' + stat.key, stat.label)}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('integrations.searchPlaceholder', 'Search integrations...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Integration List */}
          {filteredIntegrations.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">{t('integrations.noIntegrationsFound', 'No integrations found')}</h3>
              <p className="text-gray-500 mt-1">{t('integrations.noIntegrationsAvailable', 'No integrations are available yet.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations.map(integration => (
                <div
                  key={integration.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                        {getTypeIcon(integration.type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{integration.nameKey ? t(integration.nameKey, integration.name) : integration.name}</h4>
                        <p className="text-xs text-gray-500 capitalize">{t('integrations.types.' + integration.type, integration.type)}</p>
                      </div>
                    </div>
                    {integration.status === 'connected' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{t('integrations.connected', 'Connected')}</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{t('integrations.available', 'Available')}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-3">{integration.descriptionKey ? t(integration.descriptionKey, integration.description) : integration.description}</p>
                  {integration.lastSync && (
                    <p className="text-xs text-gray-400 mt-2">
                      {t('integrations.lastSync', 'Last sync')}: {new Date(integration.lastSync).toLocaleTimeString()}
                    </p>
                  )}
                  <button
                    onClick={() => handleConnectOrConfigure(integration)}
                    disabled={actionLoading === integration.id}
                    className="mt-4 w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading === integration.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                    ) : integration.status === 'connected' ? (
                      <>
                        <Settings className="w-4 h-4" />
                        {t('integrations.configure', 'Configure')}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {t('integrations.connect', 'Connect')}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* API Documentation */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('integrations.restApiDocs', 'REST API Documentation')}</h3>

            <div className="space-y-6">
              {/* Base URL */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('integrations.baseUrl', 'Base URL')}</h4>
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
                  https://api.uplifthq.co.uk/v1
                </div>
              </div>

              {/* Authentication */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('integrations.authentication', 'Authentication')}</h4>
                <p className="text-sm text-gray-600 mb-2">{t('integrations.authDesc', 'Include your API key in the Authorization header:')}</p>
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
                  Authorization: Bearer uplift_live_xxxxxxxxxxxxxxxx
                </div>
              </div>

              {/* Endpoints */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">{t('integrations.endpoints', 'Endpoints')}</h4>
                <div className="space-y-3">
                  {[
                    { method: 'GET', path: '/employees', desc: t('integrations.listEmployees', 'List all employees') },
                    { method: 'POST', path: '/employees', desc: t('integrations.createEmployee', 'Create an employee') },
                    { method: 'GET', path: '/employees/:id', desc: t('integrations.getEmployee', 'Get employee details') },
                    { method: 'PATCH', path: '/employees/:id', desc: t('integrations.updateEmployee', 'Update an employee') },
                    { method: 'GET', path: '/shifts', desc: t('integrations.listShifts', 'List shifts') },
                    { method: 'POST', path: '/shifts', desc: t('integrations.createShift', 'Create a shift') },
                    { method: 'GET', path: '/locations', desc: t('integrations.listLocations', 'List locations') },
                    { method: 'GET', path: '/departments', desc: t('integrations.listDepartments', 'List departments') },
                    { method: 'GET', path: '/time-entries', desc: t('integrations.listTimeEntries', 'List time entries') },
                    { method: 'POST', path: '/webhooks', desc: t('integrations.registerWebhook', 'Register a webhook') },
                  ].map((endpoint, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                        endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                      <span className="text-sm text-gray-500 ml-auto">{endpoint.desc}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Example */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('integrations.exampleRequest', 'Example Request')}</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <div className="text-gray-500"># {t('integrations.getAllEmployees', 'Get all employees')}</div>
                  <div className="text-green-400">curl -X GET https://api.uplifthq.co.uk/v1/employees \</div>
                  <div className="text-green-400 pl-4">-H "Authorization: Bearer uplift_live_xxx" \</div>
                  <div className="text-green-400 pl-4">-H "Content-Type: application/json"</div>
                </div>
              </div>

              {/* Response */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('integrations.exampleResponse', 'Example Response')}</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre className="text-green-400">{`{
  "employees": [
    {
      "id": "emp_abc123",
      "firstName": "Sarah",
      "lastName": "Mitchell",
      "email": "sarah.mitchell@company.com",
      "department": "Operations",
      "location": "London Office",
      "status": "active"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}`}</pre>
                </div>
              </div>

              {/* Webhooks */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('integrations.webhookEvents', 'Webhook Events')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'employee.created', 'employee.updated', 'employee.deleted',
                    'shift.created', 'shift.updated', 'shift.deleted',
                    'time_entry.created', 'time_off.requested', 'time_off.approved'
                  ].map((event, i) => (
                    <div key={i} className="px-3 py-2 bg-gray-100 rounded text-sm font-mono text-gray-700">
                      {event}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <a
                  href="https://docs.uplifthq.co.uk/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                >
                  {t('integrations.viewFullDocs', 'View Full Documentation')}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">{t('integrations.manageApiKeys', 'Manage your API keys for programmatic access')}</p>
            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('integrations.createApiKey', 'Create API Key')}
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">{t('integrations.noApiKeys', 'No API keys')}</h3>
              <p className="text-gray-500 mt-1">{t('integrations.createApiKeyToStart', 'Create an API key to get started with the API.')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('common.name', 'Name')}</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('integrations.key', 'Key')}</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('integrations.created', 'Created')}</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('integrations.lastUsed', 'Last Used')}</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {apiKeys.map(key => (
                    <tr key={key.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{key.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {showKey[key.id] ? `${key.prefix}xxxxxxxxxxxx` : `${key.prefix}\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022`}
                          </code>
                          <button
                            onClick={() => setShowKey({ ...showKey, [key.id]: !showKey[key.id] })}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showKey[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleCopyKey(key)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {key.created_at ? new Date(key.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {key.last_used ? new Date(key.last_used).toLocaleDateString() : t('integrations.never', 'Never')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          {t('integrations.revoke', 'Revoke')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">{t('integrations.securityReminder', 'Security Reminder')}</h4>
              <p className="text-sm text-amber-700 mt-1">
                {t('integrations.securityMsg', 'Keep your API keys secure and never share them in public repositories. Rotate keys regularly and revoke any that may have been compromised.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <CreateApiKeyModal
          onClose={() => setShowCreateKeyModal(false)}
          onCreate={handleCreateApiKey}
          t={t}
        />
      )}
    </div>
  );
}

function CreateApiKeyModal({ onClose, onCreate, t }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate(name);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">{t('integrations.createApiKey', 'Create API Key')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name', 'Name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder={t('integrations.apiKeyPlaceholder', 'e.g., Production API Key')}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
              {loading ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
