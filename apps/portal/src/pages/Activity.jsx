// ============================================================
// ACTIVITY REVIEW PAGE
// Central hub for task completions, proof uploads, form submissions
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/ToastProvider';
import {
  CheckCircle, Clock, Image, FileText, MapPin, Camera, AlertCircle,
  ChevronRight, Filter, Search, Calendar, User, MessageSquare,
  ThumbsUp, ThumbsDown, Eye, Download, X, Check, MoreVertical,
  ClipboardCheck, Upload, Paperclip, Star, Flag
} from 'lucide-react';

// ============================================================
// DEMO ACTIVITY DATA - Grand Metropolitan
// ============================================================
const DEMO_ACTIVITY = [
  {
    id: 'act-001',
    type: 'task_completion',
    title: 'Daily Service Inspection - Restaurant Floor',
    description: 'Completed morning service checklist including table setup verification and dining area inspection.',
    status: 'pending',
    priority: 'high',
    employee: { name: 'Marcus Thompson', department: 'Server', avatar: 'MT' },
    location: 'London Mayfair',
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
    checklist: [
      { item: 'Table settings prepared', checked: true },
      { item: 'Emergency exits clear', checked: true },
      { item: 'Dining area clean and organized', checked: true },
      { item: 'Fire safety equipment accessible', checked: true },
    ],
  },
  {
    id: 'act-002',
    type: 'proof_upload',
    title: 'Kitchen Equipment Check Photo',
    description: 'Daily pre-service inspection photo showing kitchen equipment condition.',
    status: 'pending',
    employee: { name: 'David Rodriguez', department: 'Kitchen Staff', avatar: 'DR' },
    location: 'London Mayfair',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    attachments: [
      { id: 'file-1', name: 'kitchen_inspection_20260305.jpg', type: 'image' },
    ],
    metadata: { equipment: 'Oven #3', checkType: 'Pre-Service', condition: 'Good' },
  },
  {
    id: 'act-003',
    type: 'form_submission',
    title: 'Incident Report - Dining Area',
    description: 'Incident involving spill in dining area section 3.',
    status: 'pending',
    priority: 'high',
    employee: { name: 'Sophie Chen', department: 'Facilities Manager', avatar: 'SC' },
    location: 'London Mayfair',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    formData: {
      incidentType: 'Safety Incident',
      location: 'Dining Area Section 3',
      dateTime: '5 Mar 2026, 09:15',
      description: 'Water spill on dining floor during service',
      correctiveAction: 'Cleaned spill and placed caution signage',
    },
  },
  {
    id: 'act-004',
    type: 'clock_photo',
    title: 'Clock-in Verification',
    description: 'Shift start photo verification for evening service.',
    status: 'approved',
    employee: { name: 'James Wilson', department: 'Bartender', avatar: 'JW' },
    location: 'Dubai Marina',
    timestamp: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
    attachments: [
      { id: 'file-2', name: 'clockin_jwilson.jpg', type: 'image' },
    ],
  },
  {
    id: 'act-005',
    type: 'task_completion',
    title: 'Weekly Equipment Maintenance Log',
    description: 'Completed scheduled maintenance on kitchen appliances.',
    status: 'approved',
    employee: { name: 'Tom Bradley', department: 'Maintenance Staff', avatar: 'TB' },
    location: 'London Mayfair',
    timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    checklist: [
      { item: 'HVAC system serviced', checked: true },
      { item: 'Equipment calibration verified', checked: true },
      { item: 'Safety systems tested', checked: true },
      { item: 'Maintenance log updated', checked: true },
    ],
  },
  {
    id: 'act-006',
    type: 'proof_upload',
    title: 'Quality Inspection Photos - Evening Service',
    description: 'Food quality inspection and plating documentation.',
    status: 'pending',
    employee: { name: 'Emma Roberts', department: 'Chef', avatar: 'ER' },
    location: 'Paris Champs-Élysées',
    timestamp: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
    attachments: [
      { id: 'file-3', name: 'plating_sample1.jpg', type: 'image' },
      { id: 'file-4', name: 'plating_sample2.jpg', type: 'image' },
      { id: 'file-5', name: 'inspection_report.pdf', type: 'document' },
    ],
  },
  {
    id: 'act-007',
    type: 'form_submission',
    title: 'Holiday Request',
    description: 'Annual leave request for Easter period.',
    status: 'approved',
    employee: { name: 'Lisa Anderson', department: 'Receptionist', avatar: 'LA' },
    location: 'London Mayfair',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    formData: {
      leaveType: 'Annual Leave',
      startDate: '18 Apr 2026',
      endDate: '22 Apr 2026',
      totalDays: '3 days',
      coverArrangements: 'Mark Stevens covering',
    },
  },
  {
    id: 'act-008',
    type: 'task_completion',
    title: 'Emergency Safety Drill Documentation',
    description: 'Monthly emergency evacuation drill completed and logged.',
    status: 'approved',
    employee: { name: 'Robert Hughes', department: 'Facilities Manager', avatar: 'RH' },
    location: 'Dubai Marina',
    timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    checklist: [
      { item: 'All guests and staff evacuated', checked: true },
      { item: 'Assembly points checked', checked: true },
      { item: 'Evacuation time recorded (3:42)', checked: true },
      { item: 'Drill report submitted', checked: true },
    ],
  },
  {
    id: 'act-009',
    type: 'proof_upload',
    title: 'Delivery Receipt - Food Supplies',
    description: 'Signed delivery receipt for produce shipment.',
    status: 'pending',
    employee: { name: 'Mike Patterson', department: 'Warehouse Staff', avatar: 'MP' },
    location: 'London Mayfair',
    timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    attachments: [
      { id: 'file-6', name: 'delivery_receipt_DR2026030501.pdf', type: 'document' },
    ],
    metadata: { supplier: 'Fresh Produce Suppliers Ltd', poNumber: 'PO-2026-4521', weight: '50 kg' },
  },
  {
    id: 'act-010',
    type: 'form_submission',
    title: 'Training Completion - Food Safety',
    description: 'Completed mandatory food safety refresher course.',
    status: 'rejected',
    employee: { name: 'Sarah Mitchell', department: 'Server', avatar: 'SM' },
    location: 'London Mayfair',
    timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    formData: {
      courseName: 'Food Safety Refresher',
      completionDate: '2 Mar 2026',
      assessmentScore: '72%',
      certificateId: 'FS-2026-1842',
    },
  },
];

export default function Activity() {
  const { t } = useTranslation();
  const { user, isManagerOrAbove, isAdmin } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      // NOTE: Replace with dedicated activityApi.list() when endpoint is available
      const result = await api.get('/activity');
      const data = result?.submissions || result?.activities || [];
      // Use demo data if API returns empty
      setSubmissions(data.length > 0 ? data : DEMO_ACTIVITY);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load activity:', err);
      // Use demo data as fallback on error (for DEMO_MODE)
      setSubmissions(DEMO_ACTIVITY);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (activeTab === 'pending' && s.status !== 'pending') return false;
    if (activeTab === 'approved' && s.status !== 'approved') return false;
    if (activeTab === 'rejected' && s.status !== 'rejected') return false;
    if (filter !== 'all' && s.type !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        s.title?.toLowerCase().includes(query) ||
        s.employee?.name?.toLowerCase().includes(query) ||
        s.location?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleApprove = async (id) => {
    try {
      // NOTE: Replace with dedicated activityApi.approve() when endpoint is available
      await api.post(`/activity/${id}/approve`);
      setSubmissions(submissions.map(s =>
        s.id === id ? { ...s, status: 'approved' } : s
      ));
      setSelectedItem(null);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to approve:', err);
      toast.error(err.message || 'Failed to approve submission');
    }
  };

  const handleReject = async (id, reason) => {
    try {
      // NOTE: Replace with dedicated activityApi.reject() when endpoint is available
      await api.post(`/activity/${id}/reject`, { reason });
      setSubmissions(submissions.map(s =>
        s.id === id ? { ...s, status: 'rejected' } : s
      ));
      setSelectedItem(null);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to reject:', err);
      toast.error(err.message || 'Failed to reject submission');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'task_completion': return ClipboardCheck;
      case 'proof_upload': return Camera;
      case 'form_submission': return FileText;
      case 'clock_photo': return Clock;
      default: return CheckCircle;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'task_completion': return t('activity.taskCompletion', 'Task Completion');
      case 'proof_upload': return t('activity.proofUpload', 'Proof Upload');
      case 'form_submission': return t('activity.formSubmission', 'Form Submission');
      case 'clock_photo': return t('activity.clockVerification', 'Clock Verification');
      default: return t('activity.activity', 'Activity');
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('activity.title', 'Activity Review')}</h1>
          <p className="text-slate-600">{t('activity.subtitle', 'Review task completions, proof uploads, and form submissions')}</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-700 font-medium">{pendingCount} {t('activity.pendingReview', 'pending review')}</span>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <button onClick={loadActivity} className="ml-auto text-sm text-red-600 hover:underline">{t('common.retry', 'Retry')}</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {submissions.filter(s => s.status === 'pending').length}
              </p>
              <p className="text-sm text-slate-500">{t('activity.pendingReviewLabel', 'Pending Review')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {submissions.filter(s => s.status === 'approved').length}
              </p>
              <p className="text-sm text-slate-500">{t('activity.approvedToday', 'Approved Today')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {submissions.filter(s => s.type === 'proof_upload').length}
              </p>
              <p className="text-sm text-slate-500">{t('activity.proofUploads', 'Proof Uploads')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {submissions.filter(s => s.type === 'task_completion').length}
              </p>
              <p className="text-sm text-slate-500">{t('activity.tasksCompleted', 'Tasks Completed')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'pending', label: t('common.pending', 'Pending'), count: submissions.filter(s => s.status === 'pending').length },
            { id: 'approved', label: t('common.approved', 'Approved'), count: submissions.filter(s => s.status === 'approved').length },
            { id: 'rejected', label: t('common.rejected', 'Rejected'), count: submissions.filter(s => s.status === 'rejected').length },
            { id: 'all', label: t('common.all', 'All') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-momentum-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t('activity.tabs.' + tab.key, tab.label)}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('activity.searchSubmissions', 'Search submissions...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">{t('activity.allTypes', 'All Types')}</option>
            <option value="task_completion">{t('activity.taskCompletions', 'Task Completions')}</option>
            <option value="proof_upload">{t('activity.proofUploads', 'Proof Uploads')}</option>
            <option value="form_submission">{t('activity.formSubmissions', 'Form Submissions')}</option>
            <option value="clock_photo">{t('activity.clockVerifications', 'Clock Verifications')}</option>
          </select>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">{t('activity.noSubmissions', 'No submissions found')}</h3>
            <p className="text-slate-500 mt-1">
              {activeTab === 'pending' ? t('activity.allCaughtUp', 'All caught up!') : t('activity.noMatching', 'No matching submissions')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSubmissions.map((submission) => {
              const TypeIcon = getTypeIcon(submission.type);
              return (
                <div
                  key={submission.id}
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedItem(submission)}
                >
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className={`p-2.5 rounded-lg ${
                      submission.type === 'task_completion' ? 'bg-purple-100 text-purple-600' :
                      submission.type === 'proof_upload' ? 'bg-blue-100 text-blue-600' :
                      submission.type === 'form_submission' ? 'bg-amber-100 text-amber-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900">{submission.title}</h3>
                            {submission.priority === 'high' && (
                              <Flag className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">{submission.description}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          submission.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {submission.status?.charAt(0).toUpperCase() + submission.status?.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 text-xs font-medium">
                            {submission.employee?.avatar || submission.employee?.name?.split(' ').map(n => n[0]).join('') || '?'}
                          </div>
                          <span>{submission.employee?.name}</span>
                        </div>
                        {submission.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {submission.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTimeAgo(submission.timestamp)}
                        </div>
                        {submission.attachments?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="w-4 h-4" />
                            {submission.attachments.length} file{submission.attachments.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions for Pending */}
                    {submission.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(submission.id); }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title={t('common.approve', 'Approve')}
                        >
                          <ThumbsUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(submission.id); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('common.reject', 'Reject')}
                        >
                          <ThumbsDown className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <SubmissionDetailModal
          submission={selectedItem}
          onClose={() => setSelectedItem(null)}
          onApprove={() => handleApprove(selectedItem.id)}
          onReject={(reason) => handleReject(selectedItem.id, reason)}
          getTypeLabel={getTypeLabel}
        />
      )}
    </div>
  );
}

// ============================================================
// SUBMISSION DETAIL MODAL
// ============================================================

function SubmissionDetailModal({ submission, onClose, onApprove, onReject, getTypeLabel }) {
  const { t } = useTranslation();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              submission.type === 'task_completion' ? 'bg-purple-100 text-purple-700' :
              submission.type === 'proof_upload' ? 'bg-blue-100 text-blue-700' :
              submission.type === 'form_submission' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {getTypeLabel(submission.type)}
            </span>
            <h2 className="text-lg font-semibold mt-2">{submission.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Employee Info */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-lg">
              {submission.employee?.avatar || submission.employee?.name?.split(' ').map(n => n[0]).join('') || '?'}
            </div>
            <div>
              <p className="font-medium text-slate-900">{submission.employee?.name}</p>
              <p className="text-sm text-slate-500">{submission.employee?.department}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-slate-500">{formatTimeAgo(submission.timestamp)}</p>
              {submission.location && (
                <p className="text-sm text-slate-500 flex items-center gap-1 justify-end">
                  <MapPin className="w-3.5 h-3.5" />
                  {submission.location}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {submission.description && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">{t('common.description', 'Description')}</h3>
              <p className="text-slate-700">{submission.description}</p>
            </div>
          )}

          {/* Checklist (for task completions) */}
          {submission.checklist && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">{t('activity.checklist', 'Checklist')}</h3>
              <div className="space-y-2">
                {submission.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      item.checked ? 'bg-green-500 text-white' : 'bg-slate-200'
                    }`}>
                      {item.checked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={item.checked ? 'text-slate-700' : 'text-slate-400'}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Data (for form submissions) */}
          {submission.formData && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">{t('activity.formDetails', 'Form Details')}</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(submission.formData).map(([key, value]) => (
                  <div key={key} className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata (for proof uploads) */}
          {submission.metadata && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">{t('common.details', 'Details')}</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(submission.metadata).map(([key, value]) => (
                  <div key={key} className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {submission.attachments?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">
                Attachments ({submission.attachments.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {submission.attachments.map((file) => (
                  <div key={file.id} className="border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      file.type === 'image' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {file.type === 'image' ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{file.type === 'image' ? 'Image' : 'Document'}</p>
                    </div>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">{t('activity.rejectionReason', 'Rejection Reason')}</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('activity.rejectionReasonPlaceholder', 'Enter reason for rejection...')}
                rows={3}
                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { onReject(rejectReason); }}
                  className="btn bg-red-600 text-white hover:bg-red-700"
                >
                  {t('activity.confirmRejection', 'Confirm Rejection')}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="btn btn-secondary"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {submission.status === 'pending' && !showRejectForm && (
          <div className="flex justify-end gap-3 p-6 border-t bg-slate-50">
            <button
              onClick={() => setShowRejectForm(true)}
              className="btn btn-secondary text-red-600 hover:bg-red-50"
            >
              <ThumbsDown className="w-4 h-4" />
              {t('common.reject', 'Reject')}
            </button>
            <button onClick={onApprove} className="btn btn-primary">
              <ThumbsUp className="w-4 h-4" />
              {t('common.approve', 'Approve')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
