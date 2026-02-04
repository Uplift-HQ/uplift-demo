// ============================================================
// DOCUMENTS PAGE
// Document management, templates, signatures, employee folders
// ============================================================
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Search,
  Plus,
  X,
  FolderOpen,
  Folder,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSignature,
  File,
  FileSpreadsheet,
  FileImage,
  ChevronRight,
  ChevronDown,
  Send,
  Bell,
  XCircle,
  Filter,
  Users,
} from 'lucide-react';

// ---- Demo Data ----

const EMPLOYEES = [
  { id: 1, name: 'Sarah Mitchell' },
  { id: 2, name: 'James Chen' },
  { id: 3, name: 'Emily Watson' },
  { id: 4, name: 'Raj Patel' },
  { id: 5, name: 'Olivia Thompson' },
  { id: 6, name: 'Michael O\'Brien' },
  { id: 7, name: 'Fatima Al-Rashid' },
  { id: 8, name: 'David Kim' },
  { id: 9, name: 'Lucy Harper' },
  { id: 10, name: 'Tom Bradley' },
];

const DEMO_DOCUMENTS = [
  { id: 1, title: 'Employment Contract', employee: 'Sarah Mitchell', employeeId: 1, category: 'contract', uploadDate: '2025-11-15', signatureStatus: 'signed', fileType: 'pdf' },
  { id: 2, title: 'Employment Contract', employee: 'James Chen', employeeId: 2, category: 'contract', uploadDate: '2025-10-20', signatureStatus: 'signed', fileType: 'pdf' },
  { id: 3, title: 'Employee Handbook Acknowledgement', employee: 'Emily Watson', employeeId: 3, category: 'policy', uploadDate: '2025-12-01', signatureStatus: 'pending', fileType: 'pdf' },
  { id: 4, title: 'First Aid Certificate', employee: 'Raj Patel', employeeId: 4, category: 'certificate', uploadDate: '2025-09-10', signatureStatus: 'none', fileType: 'pdf' },
  { id: 5, title: 'Passport Copy', employee: 'Olivia Thompson', employeeId: 5, category: 'id_document', uploadDate: '2025-08-22', signatureStatus: 'none', fileType: 'image' },
  { id: 6, title: 'Offer Letter', employee: 'Michael O\'Brien', employeeId: 6, category: 'letter', uploadDate: '2026-01-05', signatureStatus: 'signed', fileType: 'pdf' },
  { id: 7, title: 'GDPR Policy Acknowledgement', employee: 'Fatima Al-Rashid', employeeId: 7, category: 'policy', uploadDate: '2025-11-30', signatureStatus: 'signed', fileType: 'pdf' },
  { id: 8, title: 'NDA Agreement', employee: 'David Kim', employeeId: 8, category: 'contract', uploadDate: '2025-12-12', signatureStatus: 'pending', fileType: 'pdf' },
  { id: 9, title: 'Right to Work Visa', employee: 'Fatima Al-Rashid', employeeId: 7, category: 'id_document', uploadDate: '2025-07-15', signatureStatus: 'none', fileType: 'image' },
  { id: 10, title: 'Driving Licence', employee: 'Tom Bradley', employeeId: 10, category: 'id_document', uploadDate: '2025-06-03', signatureStatus: 'none', fileType: 'image' },
  { id: 11, title: 'Health & Safety Certificate', employee: 'Lucy Harper', employeeId: 9, category: 'certificate', uploadDate: '2025-10-18', signatureStatus: 'none', fileType: 'pdf' },
  { id: 12, title: 'Employment Contract', employee: 'Raj Patel', employeeId: 4, category: 'contract', uploadDate: '2025-06-01', signatureStatus: 'signed', fileType: 'pdf' },
  { id: 13, title: 'Probation Completion Letter', employee: 'Sarah Mitchell', employeeId: 1, category: 'letter', uploadDate: '2026-01-20', signatureStatus: 'none', fileType: 'docx' },
  { id: 14, title: 'Anti-Bribery Policy', employee: 'James Chen', employeeId: 2, category: 'policy', uploadDate: '2025-11-05', signatureStatus: 'pending', fileType: 'pdf' },
  { id: 15, title: 'Food Hygiene Certificate', employee: 'Emily Watson', employeeId: 3, category: 'certificate', uploadDate: '2025-09-25', signatureStatus: 'none', fileType: 'pdf' },
];

const DEMO_TEMPLATES = [
  { id: 1, name: 'Employment Contract', category: 'contract', variables: ['employee_name', 'start_date', 'salary', 'job_title', 'department', 'manager_name'], createdDate: '2025-03-10' },
  { id: 2, name: 'Offer Letter', category: 'letter', variables: ['employee_name', 'job_title', 'salary', 'start_date', 'location'], createdDate: '2025-04-15' },
  { id: 3, name: 'Non-Disclosure Agreement', category: 'contract', variables: ['employee_name', 'company_name', 'effective_date', 'duration'], createdDate: '2025-05-20' },
  { id: 4, name: 'Policy Acknowledgement', category: 'policy', variables: ['employee_name', 'policy_name', 'acknowledgement_date'], createdDate: '2025-06-08' },
  { id: 5, name: 'Termination Letter', category: 'letter', variables: ['employee_name', 'termination_date', 'reason', 'notice_period', 'final_pay_date'], createdDate: '2025-07-01' },
];

const DEMO_PENDING_SIGNATURES = [
  { id: 1, document: 'Employee Handbook Acknowledgement', employee: 'Emily Watson', sentDate: '2025-12-01', status: 'awaiting', daysPending: 65 },
  { id: 2, document: 'NDA Agreement', employee: 'David Kim', sentDate: '2025-12-12', status: 'awaiting', daysPending: 54 },
  { id: 3, document: 'Anti-Bribery Policy', employee: 'James Chen', sentDate: '2025-11-05', status: 'reminded', daysPending: 91 },
  { id: 4, document: 'GDPR Data Processing Agreement', employee: 'Tom Bradley', sentDate: '2026-01-15', status: 'awaiting', daysPending: 20 },
];

const DOCUMENT_CHECKLIST_ITEMS = [
  { key: 'contract', label: 'Employment Contract' },
  { key: 'id_document', label: 'Photo ID' },
  { key: 'right_to_work', label: 'Right to Work' },
  { key: 'certificate', label: 'Required Certificates' },
  { key: 'policy', label: 'Policy Acknowledgements' },
];

// ---- Component ----

export default function Documents() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [activeTab, setActiveTab] = useState('all');
  const [documents, setDocuments] = useState(DEMO_DOCUMENTS);
  const [templates] = useState(DEMO_TEMPLATES);
  const [pendingSignatures] = useState(DEMO_PENDING_SIGNATURES);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters for All Documents tab
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [signatureFilter, setSignatureFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Employee Documents tab state
  const [selectedEmployee, setSelectedEmployee] = useState(EMPLOYEES[0]);
  const [expandedFolders, setExpandedFolders] = useState({ contract: true });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '', category: 'contract', employeeId: '', fileName: '', requiresSignature: false,
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '', category: 'contract', variables: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const allTabs = [
    { key: 'all', label: t(isManager ? 'documents.allDocuments' : 'documents.myDocuments', isManager ? 'All Documents' : 'My Documents'), icon: FileText },
    { key: 'employee', label: t('documents.employeeDocuments', 'Employee Documents'), icon: Users, managerOnly: true },
    { key: 'templates', label: t('documents.templates', 'Templates'), icon: FolderOpen, managerOnly: true },
    { key: 'signatures', label: t('documents.pendingSignatures', 'Pending Signatures'), icon: FileSignature },
  ];
  const tabs = isManager ? allTabs : allTabs.filter(tab => !tab.managerOnly);

  // ---- Helpers ----

  const getCategoryBadge = (category) => {
    const styles = {
      contract: 'bg-blue-100 text-blue-800',
      policy: 'bg-purple-100 text-purple-800',
      certificate: 'bg-green-100 text-green-800',
      id_document: 'bg-amber-100 text-amber-800',
      letter: 'bg-slate-100 text-slate-800',
    };
    const labels = {
      contract: t('documents.categories.contract', 'Contract'),
      policy: t('documents.categories.policy', 'Policy'),
      certificate: t('documents.categories.certificate', 'Certificate'),
      id_document: t('documents.categories.idDocument', 'ID Document'),
      letter: t('documents.categories.letter', 'Letter'),
    };
    return { style: styles[category] || 'bg-slate-100 text-slate-800', label: labels[category] || category };
  };

  const getSignatureBadge = (status) => {
    if (status === 'signed') return { style: 'bg-green-100 text-green-800', label: t('documents.signed', 'Signed'), icon: CheckCircle };
    if (status === 'pending') return { style: 'bg-amber-100 text-amber-800', label: t('documents.pending', 'Pending'), icon: Clock };
    return { style: 'bg-slate-100 text-slate-500', label: t('documents.noSignature', 'N/A'), icon: null };
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'pdf') return <File className="h-4 w-4 text-red-500" />;
    if (fileType === 'docx') return <FileText className="h-4 w-4 text-blue-500" />;
    if (fileType === 'image') return <FileImage className="h-4 w-4 text-green-500" />;
    if (fileType === 'xlsx') return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
    return <File className="h-4 w-4 text-slate-400" />;
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
    if (employeeFilter !== 'all' && doc.employeeId !== Number(employeeFilter)) return false;
    if (signatureFilter !== 'all' && doc.signatureStatus !== signatureFilter) return false;
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase()) && !doc.employee.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Employee documents grouped by category
  const employeeDocs = documents.filter((d) => d.employeeId === selectedEmployee.id);
  const groupedEmployeeDocs = {
    contract: employeeDocs.filter((d) => d.category === 'contract'),
    certificate: employeeDocs.filter((d) => d.category === 'certificate'),
    id_document: employeeDocs.filter((d) => d.category === 'id_document'),
    letter: employeeDocs.filter((d) => d.category === 'letter'),
    policy: employeeDocs.filter((d) => d.category === 'policy'),
  };

  const folderLabels = {
    contract: t('documents.folders.contracts', 'Contracts'),
    certificate: t('documents.folders.certificates', 'Certificates'),
    id_document: t('documents.folders.idDocuments', 'ID Documents'),
    letter: t('documents.folders.letters', 'Letters'),
    policy: t('documents.folders.policies', 'Policies'),
  };

  const toggleFolder = (key) => {
    setExpandedFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasDocType = (empId, category) => documents.some((d) => d.employeeId === empId && d.category === category);
  const hasRightToWork = (empId) => documents.some((d) => d.employeeId === empId && d.category === 'id_document' && d.title.toLowerCase().includes('right to work'));

  // Upload handler
  const handleUpload = (e) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.employeeId) {
      showToast(t('documents.fillRequired', 'Please fill all required fields'), 'error');
      return;
    }
    const emp = EMPLOYEES.find((e) => e.id === Number(uploadForm.employeeId));
    const newDoc = {
      id: documents.length + 1,
      title: uploadForm.title,
      employee: emp?.name || 'Unknown',
      employeeId: Number(uploadForm.employeeId),
      category: uploadForm.category,
      uploadDate: new Date().toISOString().split('T')[0],
      signatureStatus: uploadForm.requiresSignature ? 'pending' : 'none',
      fileType: 'pdf',
    };
    setDocuments([newDoc, ...documents]);
    setShowUploadModal(false);
    setUploadForm({ title: '', category: 'contract', employeeId: '', fileName: '', requiresSignature: false });
    showToast(t('documents.uploadSuccess', 'Document uploaded successfully'));
  };

  // Template handler
  const handleCreateTemplate = (e) => {
    e.preventDefault();
    setShowTemplateModal(false);
    setTemplateForm({ name: '', category: 'contract', variables: '' });
    showToast(t('documents.templateCreated', 'Template created successfully'));
  };

  // Delete handler
  const handleDelete = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast(t('documents.deleteSuccess', 'Document deleted'));
  };

  // Stats
  const stats = {
    total: documents.length,
    signed: documents.filter((d) => d.signatureStatus === 'signed').length,
    pending: documents.filter((d) => d.signatureStatus === 'pending').length,
    templates: templates.length,
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('documents.title', 'Documents')}</h1>
          <p className="text-slate-600">{t('documents.subtitle', 'Manage employee documents, templates, and signatures')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-slate-600">
            <FileText className="h-5 w-5" />
            <span className="text-sm">{t('documents.totalDocuments', 'Total Documents')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">{t('documents.signedDocuments', 'Signed')}</span>
          </div>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.signed}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            <span className="text-sm">{t('documents.pendingSignatures', 'Pending Signatures')}</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-slate-600">
            <FolderOpen className="h-5 w-5" />
            <span className="text-sm">{t('documents.templatesCount', 'Templates')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.templates}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-momentum-600 border-b-2 border-momentum-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ TAB 1: All Documents ============ */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('documents.searchDocuments', 'Search documents...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
            >
              <option value="all">{t('documents.allCategories', 'All Categories')}</option>
              <option value="contract">{t('documents.categories.contract', 'Contract')}</option>
              <option value="policy">{t('documents.categories.policy', 'Policy')}</option>
              <option value="certificate">{t('documents.categories.certificate', 'Certificate')}</option>
              <option value="id_document">{t('documents.categories.idDocument', 'ID Document')}</option>
              <option value="letter">{t('documents.categories.letter', 'Letter')}</option>
            </select>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
            >
              <option value="all">{t('documents.allEmployees', 'All Employees')}</option>
              {EMPLOYEES.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <select
              value={signatureFilter}
              onChange={(e) => setSignatureFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
            >
              <option value="all">{t('documents.allStatuses', 'All Statuses')}</option>
              <option value="signed">{t('documents.signed', 'Signed')}</option>
              <option value="pending">{t('documents.pending', 'Pending')}</option>
              <option value="none">{t('documents.noSignature', 'No Signature')}</option>
            </select>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 bg-momentum-500 text-white px-4 py-2 rounded-lg hover:bg-momentum-600 text-sm font-medium"
            >
              <Upload className="h-4 w-4" />
              {t('documents.uploadDocument', 'Upload Document')}
            </button>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.title', 'Title')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.employee', 'Employee')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.category', 'Category')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.uploadDate', 'Upload Date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.signature', 'Signature')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.type', 'Type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => {
                    const catBadge = getCategoryBadge(doc.category);
                    const sigBadge = getSignatureBadge(doc.signatureStatus);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.fileType)}
                            <span className="text-sm font-medium text-slate-900">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{doc.employee}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${catBadge.style}`}>{catBadge.label}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{doc.uploadDate}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${sigBadge.style}`}>
                            {sigBadge.icon && <sigBadge.icon className="h-3 w-3" />}
                            {sigBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 uppercase">{doc.fileType}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 text-slate-400 hover:text-momentum-600 rounded" title={t('documents.view', 'View')}>
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title={t('documents.download', 'Download')}>
                              <Download className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title={t('documents.delete', 'Delete')}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{t('documents.noDocuments', 'No documents found')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB 2: Employee Documents ============ */}
      {activeTab === 'employee' && (
        <div className="flex gap-6">
          {/* Left sidebar - Employee list */}
          <div className="w-64 shrink-0">
            <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">{t('documents.employees', 'Employees')}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {EMPLOYEES.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selectedEmployee.id === emp.id
                        ? 'bg-momentum-50 text-momentum-700 font-medium border-l-2 border-momentum-500'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel - Folders */}
          <div className="flex-1 space-y-4">
            <div className="bg-white rounded-lg shadow border border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">{selectedEmployee.name}</h2>
              <p className="text-sm text-slate-500 mb-4">{t('documents.documentFolders', 'Document Folders')}</p>

              {/* Folders */}
              <div className="space-y-2">
                {Object.entries(groupedEmployeeDocs).map(([key, docs]) => (
                  <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleFolder(key)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedFolders[key] ? <FolderOpen className="h-5 w-5 text-momentum-500" /> : <Folder className="h-5 w-5 text-slate-400" />}
                        <span className="text-sm font-medium text-slate-800">{folderLabels[key]}</span>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{docs.length}</span>
                      </div>
                      {expandedFolders[key] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </button>
                    {expandedFolders[key] && (
                      <div className="divide-y divide-slate-100">
                        {docs.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-400 italic">{t('documents.noFilesInFolder', 'No documents in this folder')}</div>
                        ) : (
                          docs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                              <div className="flex items-center gap-2">
                                {getFileIcon(doc.fileType)}
                                <span className="text-sm text-slate-700">{doc.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{doc.uploadDate}</span>
                                <button className="p-1 text-slate-400 hover:text-blue-600"><Download className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Document Checklist */}
            <div className="bg-white rounded-lg shadow border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('documents.documentChecklist', 'Document Checklist')}</h3>
              <div className="space-y-2">
                {DOCUMENT_CHECKLIST_ITEMS.map((item) => {
                  let present = false;
                  if (item.key === 'right_to_work') {
                    present = hasRightToWork(selectedEmployee.id);
                  } else {
                    present = hasDocType(selectedEmployee.id, item.key);
                  }
                  return (
                    <div key={item.key} className="flex items-center gap-3 py-1.5">
                      {present ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      <span className={`text-sm ${present ? 'text-slate-700' : 'text-red-600 font-medium'}`}>
                        {t(`documents.checklist.${item.key}`, item.label)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB 3: Templates ============ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 bg-momentum-500 text-white px-4 py-2 rounded-lg hover:bg-momentum-600 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              {t('documents.createTemplate', 'Create Template')}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.templateName', 'Template Name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.category', 'Category')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.variables', 'Variables')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.createdDate', 'Created Date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {templates.map((tmpl) => {
                    const catBadge = getCategoryBadge(tmpl.category);
                    return (
                      <tr key={tmpl.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-momentum-500" />
                            <span className="text-sm font-medium text-slate-900">{tmpl.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${catBadge.style}`}>{catBadge.label}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {tmpl.variables.map((v) => (
                              <span key={v} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono">{`{{${v}}}`}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{tmpl.createdDate}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 text-slate-400 hover:text-momentum-600 rounded" title={t('documents.view', 'View')}>
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title={t('documents.duplicate', 'Duplicate')}>
                              <FileText className="h-4 w-4" />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-red-600 rounded" title={t('documents.delete', 'Delete')}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB 4: Pending Signatures ============ */}
      {activeTab === 'signatures' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.document', 'Document')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.employee', 'Employee')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.sentDate', 'Sent Date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.status', 'Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.daysPending', 'Days Pending')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {pendingSignatures.map((sig) => (
                    <tr key={sig.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileSignature className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium text-slate-900">{sig.document}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{sig.employee}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sig.sentDate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          sig.status === 'reminded' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sig.status === 'reminded'
                            ? t('documents.reminded', 'Reminded')
                            : t('documents.awaitingSignature', 'Awaiting Signature')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${sig.daysPending > 60 ? 'text-red-600' : sig.daysPending > 30 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {sig.daysPending} {t('documents.days', 'days')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                            title={t('documents.sendReminder', 'Send Reminder')}
                          >
                            <Bell className="h-3.5 w-3.5" />
                            {t('documents.remind', 'Remind')}
                          </button>
                          <button
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                            title={t('documents.cancelRequest', 'Cancel Request')}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {t('documents.cancel', 'Cancel')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingSignatures.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
                <p className="text-slate-500">{t('documents.allSigned', 'All documents have been signed')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ Upload Document Modal ============ */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{t('documents.uploadDocument', 'Upload Document')}</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('documents.documentTitle', 'Document Title')} *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  placeholder={t('documents.enterTitle', 'Enter document title')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('documents.columns.category', 'Category')} *</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                >
                  <option value="contract">{t('documents.categories.contract', 'Contract')}</option>
                  <option value="policy">{t('documents.categories.policy', 'Policy')}</option>
                  <option value="certificate">{t('documents.categories.certificate', 'Certificate')}</option>
                  <option value="id_document">{t('documents.categories.idDocument', 'ID Document')}</option>
                  <option value="letter">{t('documents.categories.letter', 'Letter')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('documents.columns.employee', 'Employee')} *</label>
                <select
                  value={uploadForm.employeeId}
                  onChange={(e) => setUploadForm({ ...uploadForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                >
                  <option value="">{t('documents.selectEmployee', 'Select employee')}</option>
                  {EMPLOYEES.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('documents.file', 'File')}</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-momentum-400 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">{t('documents.dragOrClick', 'Drag & drop or click to select file')}</p>
                  <p className="text-xs text-slate-400 mt-1">{t('documents.supportedFormats', 'PDF, DOCX, PNG, JPG up to 10MB')}</p>
                  {uploadForm.fileName && <p className="text-sm text-momentum-600 mt-2 font-medium">{uploadForm.fileName}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresSignature"
                  checked={uploadForm.requiresSignature}
                  onChange={(e) => setUploadForm({ ...uploadForm, requiresSignature: e.target.checked })}
                  className="h-4 w-4 text-momentum-500 rounded border-slate-300"
                />
                <label htmlFor="requiresSignature" className="text-sm text-slate-700">
                  {t('documents.requiresSignature', 'Requires signature from employee')}
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium">
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium">
                  {t('documents.upload', 'Upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ Create Template Modal ============ */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{t('documents.createTemplate', 'Create Template')}</h2>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('documents.templateName', 'Template Name')} *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  placeholder={t('documents.enterTemplateName', 'Enter template name')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('documents.columns.category', 'Category')} *</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                >
                  <option value="contract">{t('documents.categories.contract', 'Contract')}</option>
                  <option value="policy">{t('documents.categories.policy', 'Policy')}</option>
                  <option value="letter">{t('documents.categories.letter', 'Letter')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('documents.variablePlaceholders', 'Variable Placeholders')}</label>
                <textarea
                  value={templateForm.variables}
                  onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  rows={3}
                  placeholder={t('documents.variablesHint', 'employee_name, start_date, salary (comma-separated)')}
                />
                <p className="text-xs text-slate-400 mt-1">{t('documents.variablesHelp', 'These will be available as {{variable_name}} in the template')}</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium">
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium">
                  {t('documents.create', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
