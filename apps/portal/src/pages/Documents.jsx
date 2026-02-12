// ============================================================
// DOCUMENTS PAGE
// Document management, templates, signatures, employee folders
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { useView } from '../lib/viewContext';
import { api, DEMO_MODE } from '../lib/api';
import SignatureCanvas from '../components/SignatureCanvas';
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
  PenTool,
  Calendar,
  Info,
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
  { id: 1, title: 'Employment Contract', employee: 'Sarah Mitchell', employeeId: 1, category: 'contract', uploadDate: '2025-11-15', signatureStatus: 'signed', fileType: 'pdf', signedAt: '2025-11-16T10:30:00Z', signatureText: 'Sarah Mitchell', signatureIp: '192.168.1.100' },
  { id: 2, title: 'Employment Contract', employee: 'James Chen', employeeId: 2, category: 'contract', uploadDate: '2025-10-20', signatureStatus: 'signed', fileType: 'pdf', signedAt: '2025-10-21T14:15:00Z', signatureText: 'James Chen', signatureIp: '192.168.1.105' },
  { id: 3, title: 'Employee Handbook Acknowledgement', employee: 'Emily Watson', employeeId: 3, category: 'policy', uploadDate: '2025-12-01', signatureStatus: 'pending', fileType: 'pdf' },
  { id: 4, title: 'First Aid Certificate', employee: 'Raj Patel', employeeId: 4, category: 'certificate', uploadDate: '2025-09-10', signatureStatus: 'none', fileType: 'pdf' },
  { id: 5, title: 'Passport Copy', employee: 'Olivia Thompson', employeeId: 5, category: 'id_document', uploadDate: '2025-08-22', signatureStatus: 'none', fileType: 'image' },
  { id: 6, title: 'Offer Letter', employee: 'Michael O\'Brien', employeeId: 6, category: 'letter', uploadDate: '2026-01-05', signatureStatus: 'signed', fileType: 'pdf', signedAt: '2026-01-06T09:00:00Z', signatureText: 'Michael O\'Brien', signatureIp: '192.168.1.110' },
  { id: 7, title: 'GDPR Policy Acknowledgement', employee: 'Fatima Al-Rashid', employeeId: 7, category: 'policy', uploadDate: '2025-11-30', signatureStatus: 'signed', fileType: 'pdf', signedAt: '2025-12-01T11:45:00Z', signatureText: 'Fatima Al-Rashid', signatureIp: '192.168.1.115' },
  { id: 8, title: 'NDA Agreement', employee: 'David Kim', employeeId: 8, category: 'contract', uploadDate: '2025-12-12', signatureStatus: 'pending', fileType: 'pdf' },
  { id: 9, title: 'Right to Work Visa', employee: 'Fatima Al-Rashid', employeeId: 7, category: 'id_document', uploadDate: '2025-07-15', signatureStatus: 'none', fileType: 'image' },
  { id: 10, title: 'Driving Licence', employee: 'Tom Bradley', employeeId: 10, category: 'id_document', uploadDate: '2025-06-03', signatureStatus: 'none', fileType: 'image' },
  { id: 11, title: 'Health & Safety Certificate', employee: 'Lucy Harper', employeeId: 9, category: 'certificate', uploadDate: '2025-10-18', signatureStatus: 'none', fileType: 'pdf' },
  { id: 12, title: 'Employment Contract', employee: 'Raj Patel', employeeId: 4, category: 'contract', uploadDate: '2025-06-01', signatureStatus: 'signed', fileType: 'pdf', signedAt: '2025-06-02T16:30:00Z', signatureText: 'Raj Patel', signatureIp: '192.168.1.120' },
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
  { id: 3, documentId: 3, document: 'Employee Handbook Acknowledgement', employee: 'Emily Watson', employeeId: 3, sentDate: '2025-12-01', status: 'awaiting', daysPending: 65 },
  { id: 8, documentId: 8, document: 'NDA Agreement', employee: 'David Kim', employeeId: 8, sentDate: '2025-12-12', status: 'awaiting', daysPending: 54 },
  { id: 14, documentId: 14, document: 'Anti-Bribery Policy', employee: 'James Chen', employeeId: 2, sentDate: '2025-11-05', status: 'reminded', daysPending: 91 },
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
  const { isPersonalView } = useView();
  const isManagerRole = user?.role === 'admin' || user?.role === 'manager';
  // Show management features only for managers NOT in personal view
  const showManagementFeatures = isManagerRole && !isPersonalView;
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('all');
  const [documents, setDocuments] = useState(DEMO_MODE ? DEMO_DOCUMENTS : []);
  const [templates, setTemplates] = useState(DEMO_MODE ? DEMO_TEMPLATES : []);
  const [pendingSignatures, setPendingSignatures] = useState(DEMO_MODE ? DEMO_PENDING_SIGNATURES : []);
  const [employees, setEmployees] = useState(DEMO_MODE ? EMPLOYEES : []);
  const [isLoading, setIsLoading] = useState(!DEMO_MODE);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showSignatureDetailsModal, setShowSignatureDetailsModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [toast, setToast] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Filters for All Documents tab
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [signatureFilter, setSignatureFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Employee Documents tab state
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({ contract: true });

  // Set initial selected employee when employees are loaded
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '', category: 'contract', employeeId: '', file: null, requiresSignature: false,
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '', category: 'contract', variables: '',
  });

  // Signature form state
  const [signatureForm, setSignatureForm] = useState({
    signature: '',
    signatureData: null, // Canvas base64 data URL
    signatureDate: new Date().toISOString().split('T')[0],
    agreed: false,
  });

  // Handle signature canvas change
  const handleSignatureChange = useCallback((dataUrl) => {
    setSignatureForm(prev => ({ ...prev, signatureData: dataUrl }));
  }, []);

  // Fetch data from API when not in demo mode
  useEffect(() => {
    if (DEMO_MODE) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch documents, pending signatures, templates, and employees in parallel
        const [docsRes, pendingRes, templatesRes, employeesRes] = await Promise.all([
          api.get('/documents').catch(() => ({ documents: [] })),
          isManagerRole ? api.get('/documents/signatures/pending').catch(() => ({ pendingSignatures: [] })) : Promise.resolve({ pendingSignatures: [] }),
          isManagerRole ? api.get('/documents/templates').catch(() => ({ templates: [] })) : Promise.resolve({ templates: [] }),
          isManagerRole ? api.get('/employees').catch(() => ({ employees: [] })) : Promise.resolve({ employees: [] }),
        ]);

        // Map API response to component expected format
        const mappedDocs = (docsRes.documents || []).map(doc => ({
          id: doc.id,
          title: doc.title,
          employee: doc.employee_name || 'Unknown',
          employeeId: doc.employee_id,
          category: doc.category,
          uploadDate: doc.created_at ? new Date(doc.created_at).toISOString().split('T')[0] : '',
          signatureStatus: doc.signature_status || 'none',
          fileType: doc.file_type,
          fileName: doc.file_name,
          signedAt: doc.signed_at,
          signatureText: doc.signature_text,
          signatureImage: doc.signature_image,
          signatureIp: doc.signature_ip,
        }));

        const mappedPending = (pendingRes.pendingSignatures || []).map(sig => ({
          id: sig.id,
          documentId: sig.id,
          document: sig.title,
          employee: sig.employee_name,
          employeeId: sig.employee_id,
          sentDate: sig.sent_date ? new Date(sig.sent_date).toISOString().split('T')[0] : '',
          status: 'awaiting',
          daysPending: sig.days_pending || 0,
        }));

        const mappedEmployees = (employeesRes.employees || []).map(emp => ({
          id: emp.id,
          name: emp.first_name + ' ' + emp.last_name,
        }));

        setDocuments(mappedDocs);
        setPendingSignatures(mappedPending);
        setTemplates(templatesRes.templates || []);
        setEmployees(mappedEmployees);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isManagerRole]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const allTabs = [
    { key: 'all', label: t(showManagementFeatures ? 'documents.allDocuments' : 'documents.myDocuments', showManagementFeatures ? 'All Documents' : 'My Documents'), icon: FileText },
    { key: 'employee', label: t('documents.employeeDocuments', 'Employee Documents'), icon: Users, managerOnly: true },
    { key: 'templates', label: t('documents.templates', 'Templates'), icon: FolderOpen, managerOnly: true },
    { key: 'signatures', label: t('documents.pendingSignatures', 'Pending Signatures'), icon: FileSignature },
  ];
  const tabs = showManagementFeatures ? allTabs : allTabs.filter(tab => !tab.managerOnly);

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

  const getSignatureBadge = (status, doc) => {
    if (status === 'signed') return {
      style: 'bg-green-100 text-green-800',
      label: t('documents.signed', 'Signed'),
      icon: CheckCircle,
      clickable: showManagementFeatures && !!doc?.signedAt
    };
    if (status === 'pending') return {
      style: 'bg-amber-100 text-amber-800',
      label: t('documents.pending', 'Pending'),
      icon: Clock,
      clickable: false
    };
    return { style: 'bg-slate-100 text-slate-500', label: t('documents.noSignature', 'N/A'), icon: null, clickable: false };
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'pdf') return <File className="h-4 w-4 text-red-500" />;
    if (fileType === 'docx') return <FileText className="h-4 w-4 text-blue-500" />;
    if (fileType === 'image' || fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg') return <FileImage className="h-4 w-4 text-green-500" />;
    if (fileType === 'xlsx') return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
    return <File className="h-4 w-4 text-slate-400" />;
  };

  const getFileTypeFromName = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    return ext;
  };

  // Filtered documents - in personal view, only show current user's documents
  const filteredDocuments = documents.filter((doc) => {
    // In personal view, only show documents belonging to the current user
    if (isPersonalView && user?.employeeId && doc.employeeId !== user.employeeId) return false;
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
    if (employeeFilter !== 'all' && doc.employeeId !== Number(employeeFilter)) return false;
    if (signatureFilter !== 'all' && doc.signatureStatus !== signatureFilter) return false;
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase()) && !doc.employee.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Employee documents grouped by category
  const employeeDocs = documents.filter((d) => selectedEmployee && d.employeeId === selectedEmployee.id);
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

  // File selection handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        showToast(t('documents.fileTooLarge', 'File size must be less than 10MB'), 'error');
        return;
      }
      setUploadForm({ ...uploadForm, file });
    }
  };

  // Upload handler with real file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.employeeId) {
      showToast(t('documents.fillRequired', 'Please fill all required fields'), 'error');
      return;
    }

    if (!uploadForm.file) {
      showToast(t('documents.selectFile', 'Please select a file to upload'), 'error');
      return;
    }

    setIsUploading(true);

    try {
      if (DEMO_MODE) {
        // Demo mode: simulate upload
        const emp = employees.find((e) => e.id === uploadForm.employeeId || e.id === Number(uploadForm.employeeId));
        const newDoc = {
          id: documents.length + 1,
          title: uploadForm.title,
          employee: emp?.name || 'Unknown',
          employeeId: Number(uploadForm.employeeId),
          category: uploadForm.category,
          uploadDate: new Date().toISOString().split('T')[0],
          signatureStatus: uploadForm.requiresSignature ? 'pending' : 'none',
          fileType: getFileTypeFromName(uploadForm.file.name),
          fileName: uploadForm.file.name,
        };
        setDocuments([newDoc, ...documents]);

        if (uploadForm.requiresSignature) {
          setPendingSignatures([{
            id: newDoc.id,
            documentId: newDoc.id,
            document: newDoc.title,
            employee: emp?.name,
            employeeId: Number(uploadForm.employeeId),
            sentDate: newDoc.uploadDate,
            status: 'awaiting',
            daysPending: 0,
          }, ...pendingSignatures]);
        }
      } else {
        // Real API upload
        const formData = new FormData();
        formData.append('file', uploadForm.file);
        formData.append('title', uploadForm.title);
        formData.append('category', uploadForm.category);
        formData.append('employeeId', uploadForm.employeeId);
        formData.append('requiresSignature', uploadForm.requiresSignature);

        const result = await api.upload('/documents/upload', formData);

        // Add the new document to the list
        const emp = employees.find((e) => e.id === uploadForm.employeeId || e.id === Number(uploadForm.employeeId));
        const newDoc = {
          ...result.document,
          employee: emp?.name || result.document.employee_name,
          employeeId: Number(uploadForm.employeeId),
          uploadDate: result.document.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          signatureStatus: result.document.signature_status,
          fileType: result.document.file_type,
        };
        setDocuments([newDoc, ...documents]);
      }

      setShowUploadModal(false);
      setUploadForm({ title: '', category: 'contract', employeeId: '', file: null, requiresSignature: false });
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast(t('documents.uploadSuccess', 'Document uploaded successfully'));
    } catch (error) {
      console.error('Upload failed:', error);
      showToast(t('documents.uploadFailed', 'Failed to upload document'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // View document handler
  const handleView = async (doc) => {
    if (DEMO_MODE) {
      // In demo mode, show a preview modal
      setSelectedDocument(doc);
      setShowViewModal(true);
    } else {
      // Open document in new tab for viewing
      try {
        window.open(`/api/documents/${doc.id}/download`, '_blank');
      } catch (error) {
        console.error('Failed to view document:', error);
        showToast(t('documents.viewFailed', 'Failed to open document'), 'error');
      }
    }
  };

  // Download document handler
  const handleDownload = async (doc) => {
    if (DEMO_MODE) {
      showToast(t('documents.demoDownload', 'Demo mode - download simulated'));
      return;
    }

    try {
      // Trigger download
      const link = document.createElement('a');
      link.href = `/api/documents/${doc.id}/download`;
      link.download = doc.fileName || doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      showToast(t('documents.downloadFailed', 'Failed to download document'), 'error');
    }
  };

  // Open signature modal
  const openSignatureModal = (doc) => {
    setSelectedDocument(doc);
    setSignatureForm({
      signature: '',
      signatureData: null,
      signatureDate: new Date().toISOString().split('T')[0],
      agreed: false,
    });
    setShowSignatureModal(true);
  };

  // Sign document handler
  const handleSign = async (e) => {
    e.preventDefault();

    if (!signatureForm.signatureData) {
      showToast(t('documents.enterSignature', 'Please provide your signature'), 'error');
      return;
    }

    if (!signatureForm.agreed) {
      showToast(t('documents.mustAgree', 'You must agree to the electronic signature terms'), 'error');
      return;
    }

    setIsSigning(true);

    try {
      if (DEMO_MODE) {
        // Demo mode: simulate signing
        const signedDoc = {
          ...selectedDocument,
          signatureStatus: 'signed',
          signedAt: new Date().toISOString(),
          signatureImage: signatureForm.signatureData,
          signatureIp: '192.168.1.100',
        };

        setDocuments(documents.map(d => d.id === selectedDocument.id ? signedDoc : d));
        setPendingSignatures(pendingSignatures.filter(p => p.documentId !== selectedDocument.id));
      } else {
        // Real API call with signature image data
        const result = await api.post(`/documents/${selectedDocument.id}/sign`, {
          signatureImage: signatureForm.signatureData,
          agreedAt: new Date().toISOString(),
        });

        // Update document in list
        setDocuments(documents.map(d =>
          d.id === selectedDocument.id
            ? { ...d, ...result.document, signatureStatus: 'signed' }
            : d
        ));
        setPendingSignatures(pendingSignatures.filter(p => p.documentId !== selectedDocument.id));
      }

      setShowSignatureModal(false);
      setSelectedDocument(null);
      showToast(t('documents.signedSuccess', 'Document signed successfully'));
    } catch (error) {
      console.error('Signing failed:', error);
      showToast(t('documents.signFailed', 'Failed to sign document'), 'error');
    } finally {
      setIsSigning(false);
    }
  };

  // Show signature details (for admins/managers, not in personal view)
  const handleShowSignatureDetails = (doc) => {
    if (doc.signatureStatus === 'signed' && showManagementFeatures) {
      setSelectedDocument(doc);
      setShowSignatureDetailsModal(true);
    }
  };

  // Template handler
  const handleCreateTemplate = (e) => {
    e.preventDefault();
    setShowTemplateModal(false);
    setTemplateForm({ name: '', category: 'contract', variables: '' });
    showToast(t('documents.templateCreated', 'Template created successfully'));
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (DEMO_MODE) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setPendingSignatures((prev) => prev.filter((p) => p.documentId !== id));
      showToast(t('documents.deleteSuccess', 'Document deleted'));
    } else {
      try {
        await api.delete(`/documents/${id}`);
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setPendingSignatures((prev) => prev.filter((p) => p.documentId !== id));
        showToast(t('documents.deleteSuccess', 'Document deleted'));
      } catch (error) {
        console.error('Delete failed:', error);
        showToast(t('documents.deleteFailed', 'Failed to delete document'), 'error');
      }
    }
  };

  // Send reminder handler
  const handleSendReminder = async (pendingSig) => {
    if (DEMO_MODE) {
      setPendingSignatures(pendingSignatures.map(p =>
        p.id === pendingSig.id ? { ...p, status: 'reminded' } : p
      ));
      showToast(t('documents.reminderSent', 'Reminder sent successfully'));
    } else {
      try {
        await api.post(`/documents/${pendingSig.documentId}/remind`);
        setPendingSignatures(pendingSignatures.map(p =>
          p.id === pendingSig.id ? { ...p, status: 'reminded' } : p
        ));
        showToast(t('documents.reminderSent', 'Reminder sent successfully'));
      } catch (error) {
        console.error('Failed to send reminder:', error);
        showToast(t('documents.reminderFailed', 'Failed to send reminder'), 'error');
      }
    }
  };

  // Stats
  const stats = {
    total: documents.length,
    signed: documents.filter((d) => d.signatureStatus === 'signed').length,
    pending: documents.filter((d) => d.signatureStatus === 'pending').length,
    templates: templates.length,
  };

  // Get documents pending current user's signature (for employees OR managers in personal view)
  const myPendingSignatures = !showManagementFeatures
    ? documents.filter(d => d.signatureStatus === 'pending' && d.employeeId === user?.employeeId)
    : [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 border-2 border-momentum-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-600">{t('common.loading', 'Loading...')}</span>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isPersonalView ? t('documents.myDocumentsTitle', 'My Documents') : t('documents.title', 'Documents')}
          </h1>
          <p className="text-slate-600">
            {isPersonalView
              ? t('documents.mySubtitle', 'View and manage your personal documents')
              : t('documents.subtitle', 'Manage employee documents, templates, and signatures')}
          </p>
        </div>
      </div>

      {/* Pending signatures alert for employees or managers in personal view */}
      {!showManagementFeatures && myPendingSignatures.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">
              {t('documents.documentsAwaitingSignature', 'You have documents awaiting your signature')}
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {myPendingSignatures.map(d => d.title).join(', ')}
            </p>
            <button
              onClick={() => setActiveTab('signatures')}
              className="text-sm font-medium text-amber-800 hover:text-amber-900 mt-2 underline"
            >
              {t('documents.viewPendingSignatures', 'View pending signatures')}
            </button>
          </div>
        </div>
      )}

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
            {tab.key === 'signatures' && stats.pending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                {stats.pending}
              </span>
            )}
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
            {showManagementFeatures && (
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
              >
                <option value="all">{t('documents.allEmployees', 'All Employees')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            )}
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
            {showManagementFeatures && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-momentum-500 text-white px-4 py-2 rounded-lg hover:bg-momentum-600 text-sm font-medium"
              >
                <Upload className="h-4 w-4" />
                {t('documents.uploadDocument', 'Upload Document')}
              </button>
            )}
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.title', 'Title')}</th>
                    {showManagementFeatures && <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('documents.columns.employee', 'Employee')}</th>}
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
                    const sigBadge = getSignatureBadge(doc.signatureStatus, doc);
                    // Can sign if in personal view (or employee) and document is pending their signature
                    const canSign = !showManagementFeatures && doc.signatureStatus === 'pending' && doc.employeeId === user?.employeeId;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.fileType)}
                            <span className="text-sm font-medium text-slate-900">{doc.title}</span>
                          </div>
                        </td>
                        {showManagementFeatures && <td className="px-6 py-4 text-sm text-slate-700">{doc.employee}</td>}
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${catBadge.style}`}>{catBadge.label}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{doc.uploadDate}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => sigBadge.clickable && handleShowSignatureDetails(doc)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${sigBadge.style} ${sigBadge.clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                            disabled={!sigBadge.clickable}
                          >
                            {sigBadge.icon && <sigBadge.icon className="h-3 w-3" />}
                            {sigBadge.label}
                            {sigBadge.clickable && <Info className="h-3 w-3 ml-1" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 uppercase">{doc.fileType}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleView(doc)}
                              className="p-1.5 text-slate-400 hover:text-momentum-600 rounded"
                              title={t('documents.view', 'View')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                              title={t('documents.download', 'Download')}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            {canSign && (
                              <button
                                onClick={() => openSignatureModal(doc)}
                                className="p-1.5 text-amber-500 hover:text-amber-600 rounded"
                                title={t('documents.signDocument', 'Sign Document')}
                              >
                                <PenTool className="h-4 w-4" />
                              </button>
                            )}
                            {showManagementFeatures && (
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                title={t('documents.delete', 'Delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredDocuments.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-700 font-medium mb-2">
                  {documents.length === 0
                    ? t('documents.noDocumentsYet', 'No documents uploaded')
                    : t('documents.noMatchingDocuments', 'No documents found')
                  }
                </p>
                <p className="text-slate-500 text-sm mb-4">
                  {documents.length === 0
                    ? t('documents.uploadFirstDocument', 'Upload your first document to start building your document library.')
                    : t('documents.tryDifferentFilters', 'Try adjusting your filters to find what you\'re looking for.')
                  }
                </p>
                {documents.length === 0 && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium mx-auto"
                  >
                    <Upload className="h-4 w-4" />
                    {t('documents.uploadDocument', 'Upload Document')}
                  </button>
                )}
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
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selectedEmployee?.id === emp.id
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
              <h2 className="text-lg font-semibold text-slate-900 mb-1">{selectedEmployee?.name || t('documents.selectEmployee', 'Select an employee')}</h2>
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
                                {doc.signatureStatus === 'signed' && (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                )}
                                {doc.signatureStatus === 'pending' && (
                                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{doc.uploadDate}</span>
                                <button
                                  onClick={() => handleView(doc)}
                                  className="p-1 text-slate-400 hover:text-momentum-600"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="p-1 text-slate-400 hover:text-blue-600"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
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
                  if (selectedEmployee) {
                    if (item.key === 'right_to_work') {
                      present = hasRightToWork(selectedEmployee.id);
                    } else {
                      present = hasDocType(selectedEmployee.id, item.key);
                    }
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
          {/* Employee view (or managers in personal view): Documents they need to sign */}
          {!showManagementFeatures && (
            <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">{t('documents.documentsToSign', 'Documents Requiring Your Signature')}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {myPendingSignatures.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
                    <p className="text-slate-500">{t('documents.noDocumentsToSign', 'No documents require your signature')}</p>
                  </div>
                ) : (
                  myPendingSignatures.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <FileSignature className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="font-medium text-slate-900">{doc.title}</p>
                          <p className="text-sm text-slate-500">{t('documents.uploadedOn', 'Uploaded on')} {doc.uploadDate}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => openSignatureModal(doc)}
                        className="flex items-center gap-2 bg-momentum-500 text-white px-4 py-2 rounded-lg hover:bg-momentum-600 text-sm font-medium"
                      >
                        <PenTool className="h-4 w-4" />
                        {t('documents.signNow', 'Sign Now')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Manager view: All pending signatures (not in personal view) */}
          {showManagementFeatures && (
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
                              onClick={() => handleSendReminder(sig)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                              title={t('documents.sendReminder', 'Send Reminder')}
                            >
                              <Bell className="h-3.5 w-3.5" />
                              {t('documents.remind', 'Remind')}
                            </button>
                            <button
                              onClick={() => handleDelete(sig.documentId)}
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
          )}
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
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('documents.file', 'File')} *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-momentum-400 transition-colors cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">{t('documents.dragOrClick', 'Drag & drop or click to select file')}</p>
                  <p className="text-xs text-slate-400 mt-1">{t('documents.supportedFormats', 'PDF, DOCX, PNG, JPG up to 10MB')}</p>
                  {uploadForm.file && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-momentum-600">
                      <File className="h-4 w-4" />
                      <span className="text-sm font-medium">{uploadForm.file.name}</span>
                    </div>
                  )}
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
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium"
                  disabled={isUploading}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? t('documents.uploading', 'Uploading...') : t('documents.upload', 'Upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ E-Signature Modal ============ */}
      {showSignatureModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t('documents.signDocument', 'Sign Document')}</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedDocument.title}</p>
              </div>
              <button onClick={() => setShowSignatureModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Document Preview */}
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 mb-4">
                {getFileIcon(selectedDocument.fileType)}
                <div>
                  <p className="font-medium text-slate-900">{selectedDocument.title}</p>
                  <p className="text-sm text-slate-500">{selectedDocument.fileType?.toUpperCase()} - {t('documents.uploadedOn', 'Uploaded on')} {selectedDocument.uploadDate}</p>
                </div>
                <button
                  onClick={() => handleView(selectedDocument)}
                  className="ml-auto flex items-center gap-2 text-sm text-momentum-600 hover:text-momentum-700"
                >
                  <Eye className="h-4 w-4" />
                  {t('documents.viewDocument', 'View Document')}
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                <FileText className="h-16 w-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{t('documents.documentPreviewPlaceholder', 'Document preview - Click "View Document" to open')}</p>
              </div>
            </div>

            {/* Signature Form */}
            <form onSubmit={handleSign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('documents.provideSignature', 'Provide Your Signature')} *
                </label>
                <SignatureCanvas
                  onSignatureChange={handleSignatureChange}
                  width={500}
                  height={180}
                  disabled={isSigning}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('documents.signatureDate', 'Date')}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={signatureForm.signatureDate}
                    onChange={(e) => setSignatureForm({ ...signatureForm, signatureDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreeSignature"
                    checked={signatureForm.agreed}
                    onChange={(e) => setSignatureForm({ ...signatureForm, agreed: e.target.checked })}
                    className="h-4 w-4 text-momentum-500 rounded border-slate-300 mt-0.5"
                  />
                  <label htmlFor="agreeSignature" className="text-sm text-amber-800">
                    {t('documents.signatureAgreement', 'I agree that my signature above constitutes my legal electronic signature. I have read and understood the document, and I am signing it voluntarily.')}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium"
                  disabled={isSigning}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                  disabled={isSigning || !signatureForm.signatureData || !signatureForm.agreed}
                >
                  <PenTool className="h-4 w-4" />
                  {isSigning ? t('documents.signing', 'Signing...') : t('documents.signAndSubmit', 'Sign & Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ Signature Details Modal (Admin) ============ */}
      {showSignatureDetailsModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{t('documents.signatureDetails', 'Signature Details')}</h2>
              <button onClick={() => setShowSignatureDetailsModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-800 font-medium">{t('documents.documentSigned', 'Document Signed')}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">{t('documents.documentTitle', 'Document')}</label>
                  <p className="text-slate-900 font-medium">{selectedDocument.title}</p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">{t('documents.signer', 'Signer')}</label>
                  <p className="text-slate-900 font-medium">{selectedDocument.employee}</p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">{t('documents.signature', 'Signature')}</label>
                  {selectedDocument.signatureImage ? (
                    <div className="mt-1 border border-slate-200 rounded-lg bg-white p-2 inline-block">
                      <img
                        src={selectedDocument.signatureImage}
                        alt="Signature"
                        className="max-h-24 w-auto"
                      />
                    </div>
                  ) : (
                    <p className="text-2xl font-serif italic text-slate-800">{selectedDocument.signatureText || '-'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide">{t('documents.signedAt', 'Signed At')}</label>
                    <p className="text-slate-900">
                      {selectedDocument.signedAt ? new Date(selectedDocument.signedAt).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide">{t('documents.ipAddress', 'IP Address')}</label>
                    <p className="text-slate-900 font-mono text-sm">{selectedDocument.signatureIp || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowSignatureDetailsModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                >
                  {t('common.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ View Document Modal (Demo) ============ */}
      {showViewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedDocument.fileType)}
                <div>
                  <h2 className="font-semibold text-slate-900">{selectedDocument.title}</h2>
                  <p className="text-sm text-slate-500">{selectedDocument.employee} - {selectedDocument.uploadDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                  title={t('documents.download', 'Download')}
                >
                  <Download className="h-5 w-5" />
                </button>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-8 bg-slate-50 min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-20 w-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">{t('documents.documentPreview', 'Document Preview')}</p>
                <p className="text-sm text-slate-400">{t('documents.demoPreviewNote', 'In production, the actual document would be displayed here')}</p>
                {selectedDocument.signatureStatus === 'signed' && (
                  <div className="mt-6">
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg mb-3">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t('documents.signedBy', 'Signed by')} {selectedDocument.employee}</span>
                    </div>
                    {selectedDocument.signatureImage && (
                      <div className="border border-slate-200 rounded-lg bg-white p-3 inline-block">
                        <img
                          src={selectedDocument.signatureImage}
                          alt="Signature"
                          className="max-h-16 w-auto"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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
        </>
      )}
    </div>
  );
}
