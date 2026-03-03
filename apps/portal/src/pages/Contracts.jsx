// ============================================================
// CONTRACT TEMPLATES & DOCUMENT MANAGEMENT
// Create templates, issue contracts, chase unsigned documents
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Send,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Download,
  Bell,
  Users,
  FileSignature,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';

// Status colors and icons
const STATUS_CONFIG = {
  draft: { color: 'bg-slate-100 text-slate-700', icon: FileText, label: 'Draft' },
  sent: { color: 'bg-blue-100 text-blue-700', icon: Send, label: 'Sent' },
  viewed: { color: 'bg-amber-100 text-amber-700', icon: Eye, label: 'Viewed' },
  signed: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Signed' },
  expired: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Expired' },
  cancelled: { color: 'bg-slate-100 text-slate-500', icon: X, label: 'Cancelled' },
};

// Tabs for the page
const TABS = [
  { id: 'contracts', label: 'Contracts', icon: FileSignature },
  { id: 'templates', label: 'Templates', icon: FileText },
];

export default function Contracts() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('contracts');
  const [loading, setLoading] = useState(true);

  // Contracts state
  const [contracts, setContracts] = useState([]);
  const [contractFilter, setContractFilter] = useState('all');
  const [contractSearch, setContractSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Issue contract state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [issueData, setIssueData] = useState({ template_id: '', employee_id: '', name: '' });

  // Stats
  const [stats, setStats] = useState({ draft: 0, sent: 0, viewed: 0, signed: 0, expired: 0 });

  const API = import.meta.env.VITE_API_URL || '';

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/contracts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContracts(data);
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
    }
  }, [API, token]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/contracts/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, [API, token]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/contracts/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [API, token]);

  // Fetch employees for issue modal
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  }, [API, token]);

  useEffect(() => {
    Promise.all([fetchContracts(), fetchTemplates(), fetchStats(), fetchEmployees()])
      .finally(() => setLoading(false));
  }, [fetchContracts, fetchTemplates, fetchStats, fetchEmployees]);

  // Filter contracts
  const filteredContracts = contracts.filter(c => {
    if (contractFilter !== 'all' && c.status !== contractFilter) return false;
    if (contractSearch) {
      const search = contractSearch.toLowerCase();
      const name = `${c.employee?.first_name || ''} ${c.employee?.last_name || ''}`.toLowerCase();
      if (!c.name.toLowerCase().includes(search) && !name.includes(search)) return false;
    }
    return true;
  });

  // Template CRUD
  const saveTemplate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      name: formData.get('name'),
      content_html: formData.get('content_html'),
      variables: [],
    };

    try {
      const url = selectedTemplate
        ? `${API}/api/contracts/templates/${selectedTemplate.id}`
        : `${API}/api/contracts/templates`;
      const method = selectedTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchTemplates();
        setShowTemplateModal(false);
        setSelectedTemplate(null);
      }
    } catch (err) {
      console.error('Error saving template:', err);
    }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/api/contracts/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  // Issue contract
  const issueContract = async (e) => {
    e.preventDefault();
    if (!issueData.template_id || !issueData.employee_id) return;

    try {
      const res = await fetch(`${API}/api/contracts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      });

      if (res.ok) {
        fetchContracts();
        fetchStats();
        setShowIssueModal(false);
        setIssueData({ template_id: '', employee_id: '', name: '' });
      }
    } catch (err) {
      console.error('Error issuing contract:', err);
    }
  };

  // Send contract
  const sendContract = async (id) => {
    try {
      const res = await fetch(`${API}/api/contracts/${id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchContracts();
        fetchStats();
      }
    } catch (err) {
      console.error('Error sending contract:', err);
    }
  };

  // Chase contract
  const chaseContract = async (id) => {
    try {
      const res = await fetch(`${API}/api/contracts/chases/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message_type: 'email' }),
      });
      if (res.ok) {
        alert('Reminder sent successfully');
      }
    } catch (err) {
      console.error('Error chasing contract:', err);
    }
  };

  // Delete contract
  const deleteContract = async (id) => {
    if (!confirm('Delete this contract? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/api/contracts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchContracts();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting contract:', err);
    }
  };

  // View contract
  const viewContract = async (id) => {
    try {
      const res = await fetch(`${API}/api/contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedContract(data);
        setShowViewModal(true);
      }
    } catch (err) {
      console.error('Error viewing contract:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('contracts.title', 'Contracts')}</h1>
          <p className="text-slate-500 mt-1">{t('contracts.subtitle', 'Manage contract templates and employee contracts')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedTemplate(null); setShowTemplateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600"
          >
            <FileSignature className="w-4 h-4" />
            Issue Contract
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, config]) => {
          const Icon = config.icon;
          const count = stats[key] || 0;
          return (
            <div
              key={key}
              onClick={() => setContractFilter(contractFilter === key ? 'all' : key)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                contractFilter === key ? 'border-momentum-500 bg-momentum-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                <span className={`px-2 py-0.5 rounded-full text-xs ${config.color}`}>{config.label}</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <div className="bg-white rounded-xl border border-slate-200">
          {/* Search & Filter */}
          <div className="p-4 border-b border-slate-200 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contracts or employees..."
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Contracts List */}
          {filteredContracts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileSignature className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No contracts found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredContracts.map(contract => {
                const status = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
                const StatusIcon = status.icon;
                return (
                  <div key={contract.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.color}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{contract.name}</p>
                      <p className="text-sm text-slate-500">
                        {contract.employee?.first_name} {contract.employee?.last_name}
                        {contract.sent_at && ` • Sent ${new Date(contract.sent_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewContract(contract.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {contract.status === 'draft' && (
                        <button
                          onClick={() => sendContract(contract.id)}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                          title="Send"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {(contract.status === 'sent' || contract.status === 'viewed') && (
                        <button
                          onClick={() => chaseContract(contract.id)}
                          className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                          title="Send Reminder"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteContract(contract.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-xl border border-slate-200">
          {templates.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No templates yet</p>
              <button
                onClick={() => { setSelectedTemplate(null); setShowTemplateModal(true); }}
                className="mt-4 text-momentum-500 hover:text-momentum-600 font-medium"
              >
                Create your first template
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {templates.map(template => (
                <div key={template.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{template.name}</p>
                    <p className="text-sm text-slate-500">
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedTemplate(template); setShowTemplateModal(true); }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {selectedTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                <input
                  name="name"
                  defaultValue={selectedTemplate?.name || ''}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="e.g., Employment Contract"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content (HTML)</label>
                <p className="text-xs text-slate-500 mb-2">
                  Use variables: {'{{employee_name}}'}, {'{{employee_email}}'}, {'{{date}}'}, {'{{year}}'}
                </p>
                <TemplateEditor
                  name="content_html"
                  defaultValue={selectedTemplate?.content_html || ''}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600"
                >
                  {selectedTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Contract Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Issue Contract</h2>
              <button onClick={() => setShowIssueModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={issueContract} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template</label>
                <select
                  value={issueData.template_id}
                  onChange={(e) => setIssueData({ ...issueData, template_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                <select
                  value={issueData.employee_id}
                  onChange={(e) => setIssueData({ ...issueData, employee_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Name (optional)</label>
                <input
                  value={issueData.name}
                  onChange={(e) => setIssueData({ ...issueData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Leave blank to use template name"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600"
                >
                  Issue Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Contract Modal */}
      {showViewModal && selectedContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedContract.name}</h2>
                <p className="text-sm text-slate-500">
                  {selectedContract.employee?.first_name} {selectedContract.employee?.last_name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  STATUS_CONFIG[selectedContract.status]?.color || 'bg-slate-100'
                }`}>
                  {STATUS_CONFIG[selectedContract.status]?.label || selectedContract.status}
                </span>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedContract.content_html }}
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-500">
                {selectedContract.signed_at ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Signed on {new Date(selectedContract.signed_at).toLocaleDateString()}
                  </span>
                ) : selectedContract.sent_at ? (
                  <span>Sent on {new Date(selectedContract.sent_at).toLocaleDateString()}</span>
                ) : (
                  <span>Draft - not yet sent</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedContract.status === 'draft' && (
                  <button
                    onClick={() => { sendContract(selectedContract.id); setShowViewModal(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600"
                  >
                    <Send className="w-4 h-4" />
                    Send to Employee
                  </button>
                )}
                {(selectedContract.status === 'sent' || selectedContract.status === 'viewed') && (
                  <button
                    onClick={() => { chaseContract(selectedContract.id); }}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    <Bell className="w-4 h-4" />
                    Send Reminder
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple rich text editor for templates
function TemplateEditor({ name, defaultValue }) {
  const [content, setContent] = useState(defaultValue || '');
  const [mode, setMode] = useState('visual'); // 'visual' or 'code'

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setMode('visual')}
          className={`px-3 py-1 text-sm rounded ${mode === 'visual' ? 'bg-white shadow-sm' : ''}`}
        >
          Visual
        </button>
        <button
          type="button"
          onClick={() => setMode('code')}
          className={`px-3 py-1 text-sm rounded ${mode === 'code' ? 'bg-white shadow-sm' : ''}`}
        >
          HTML
        </button>
      </div>
      <input type="hidden" name={name} value={content} />
      {mode === 'visual' ? (
        <div
          contentEditable
          className="min-h-[300px] p-4 focus:outline-none prose max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
          onBlur={(e) => setContent(e.currentTarget.innerHTML)}
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[300px] p-4 font-mono text-sm focus:outline-none resize-none"
        />
      )}
    </div>
  );
}
