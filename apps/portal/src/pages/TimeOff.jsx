// ============================================================
// TIME OFF PAGE - REAL API
// Supports both Management View (all requests) and Personal View (my requests only)
// ============================================================
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { timeOffApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useView } from '../lib/viewContext';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Calendar, Clock, CheckCircle, XCircle, Eye, X, AlertCircle, Plus } from 'lucide-react';

export default function TimeOff() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPersonalView } = useView();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadRequests();
  }, [isPersonalView]);

  const loadRequests = async () => {
    setError(null);
    setLoading(true);
    try {
      // In personal view, filter to current user's requests only
      const params = isPersonalView && user?.employeeId ? { employee_id: user.employeeId } : {};
      const data = await timeOffApi.getRequests(params);
      const enriched = (data.requests || []).map(r => ({
        ...r,
        employee_name: r.employee_name || (r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : t('common.unknownEmployee', 'Unknown Employee'))
      }));
      setRequests(enriched);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load time-off requests:', err);
      setError(t('timeOff.loadError', 'Failed to load time-off requests. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (id) => {
    const request = requests.find(r => r.id === id);
    const previousRequests = [...requests];
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    setSelectedRequest(null);
    try {
      await timeOffApi.approve(id);
      showToast(t('timeOff.approvedFor', { name: request?.employee_name || t('common.employee', 'employee'), defaultValue: 'Time off approved for {{name}}' }), 'success');
    } catch (err) {
      // Revert optimistic update
      setRequests(previousRequests);
      showToast(t('timeOff.approveError', 'Failed to approve request. Please try again.'), 'error');
    }
  };

  const handleReject = async (id) => {
    const request = requests.find(r => r.id === id);
    const previousRequests = [...requests];
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    setSelectedRequest(null);
    try {
      await timeOffApi.reject(id);
      showToast(t('timeOff.rejectedFor', { name: request?.employee_name || t('common.employee', 'employee'), defaultValue: 'Time off rejected for {{name}}' }), 'success');
    } catch (err) {
      // Revert optimistic update
      setRequests(previousRequests);
      showToast(t('timeOff.rejectError', 'Failed to reject request. Please try again.'), 'error');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getTypeLabel = (type) => {
    const labels = {
      annual_leave: t('timeOff.types.annualLeave', 'Annual Leave'),
      sick_leave: t('timeOff.types.sickLeave', 'Sick Leave'),
      personal: t('timeOff.types.personal', 'Personal'),
      bereavement: t('timeOff.types.bereavement', 'Bereavement'),
      maternity: t('timeOff.types.maternity', 'Maternity'),
      paternity: t('timeOff.types.paternity', 'Paternity'),
      unpaid: t('timeOff.types.unpaid', 'Unpaid Leave')
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      annual_leave: 'bg-blue-100 text-blue-800',
      sick_leave: 'bg-red-100 text-red-800',
      personal: 'bg-purple-100 text-purple-800',
      bereavement: 'bg-gray-100 text-gray-800',
      maternity: 'bg-pink-100 text-pink-800',
      paternity: 'bg-cyan-100 text-cyan-800',
      unpaid: 'bg-amber-100 text-amber-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDateSafe = (dateStr) => {
    try {
      if (!dateStr) return t('common.notAvailable', 'N/A');
      const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      if (isNaN(date.getTime())) return t('common.notAvailable', 'N/A');
      return format(date, 'dd MMM yyyy');
    } catch {
      return t('common.notAvailable', 'N/A');
    }
  };

  const getDuration = (start, end) => {
    try {
      const startDate = typeof start === 'string' ? parseISO(start) : new Date(start);
      const endDate = typeof end === 'string' ? parseISO(end) : new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return t('timeOff.oneDay', '1 day');
      const days = differenceInDays(endDate, startDate) + 1;
      return days === 1 ? t('timeOff.oneDay', '1 day') : `${days} ${t('timeOff.days', 'days')}`;
    } catch {
      return t('timeOff.oneDay', '1 day');
    }
  };

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <button onClick={loadRequests} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('common.retry', 'Retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isPersonalView ? t('myTimeOff.title', 'My Time Off') : t('manager.timeOffRequests', 'Time Off Requests')}
          </h1>
          <p className="text-gray-600">
            {isPersonalView
              ? t('myTimeOff.subtitle', 'View your time off requests and balances')
              : t('timeOff.title', 'Manage employee leave requests')}
          </p>
        </div>
        {isPersonalView && (
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            {t('timeOff.requestTimeOff', 'Request Time Off')}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="text-yellow-800 font-medium">{t('common.pending', 'Pending')}</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">{t('common.approved', 'Approved')}</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">{t('common.rejected', 'Rejected')}</span>
          </div>
          <p className="text-2xl font-bold text-red-900 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'pending', label: t('common.pending', 'Pending') },
          { key: 'approved', label: t('common.approved', 'Approved') },
          { key: 'rejected', label: t('common.rejected', 'Rejected') },
          { key: 'all', label: t('common.all', 'All') }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 font-medium ${
              filter === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('timeOff.tabs.' + tab.key, tab.label)} {tab.key !== 'all' && `(${stats[tab.key] || 0})`}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('profile.title', 'Employee')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.type', 'Type')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('timeOff.dates', 'Dates')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('timeOff.duration', 'Duration')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRequests.map(request => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{request.employee_name}</div>
                  <div className="text-sm text-gray-500">{request.employee_email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(request.type)}`}>
                    {getTypeLabel(request.type)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDateSafe(request.start_date)} - {formatDateSafe(request.end_date)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {getDuration(request.start_date, request.end_date)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(request.status)}`}>
                    {request.status === 'pending' ? t('common.pending', 'Pending') :
                     request.status === 'approved' ? t('common.approved', 'Approved') :
                     t('common.rejected', 'Rejected')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title={t('common.viewDetails', 'View Details')}
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {/* Only show approve/reject in management view */}
                    {!isPersonalView && request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title={t('common.approve', 'Approve')}
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title={t('common.reject', 'Reject')}
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRequests.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-600 mb-2">
              {filter === 'pending'
                ? t('timeOff.noPendingRequests', 'No pending time-off requests')
                : t('timeOff.noRequests', 'No requests found')}
            </p>
            <p className="text-sm text-gray-400">
              {t('timeOff.requestsWillAppear', 'Time-off requests will appear here when employees submit them')}
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{t('timeOff.requestDetails', 'Time Off Request Details')}</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm text-gray-500">{t('profile.title', 'Employee')}</label>
                <p className="font-medium">{selectedRequest.employee_name}</p>
                <p className="text-sm text-gray-500">{selectedRequest.employee_email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">{t('common.type', 'Type')}</label>
                  <p className="font-medium">{getTypeLabel(selectedRequest.type)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('common.status', 'Status')}</label>
                  <p className={`inline-block px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(selectedRequest.status)}`}>
                    {selectedRequest.status === 'pending' ? t('common.pending', 'Pending') :
                     selectedRequest.status === 'approved' ? t('common.approved', 'Approved') :
                     t('common.rejected', 'Rejected')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">{t('timeOff.startDate', 'Start Date')}</label>
                  <p className="font-medium">{formatDateSafe(selectedRequest.start_date)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('timeOff.endDate', 'End Date')}</label>
                  <p className="font-medium">{formatDateSafe(selectedRequest.end_date)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('timeOff.duration', 'Duration')}</label>
                <p className="font-medium">{getDuration(selectedRequest.start_date, selectedRequest.end_date)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('timeOff.reason', 'Reason')}</label>
                <p className="font-medium bg-gray-50 p-3 rounded">{selectedRequest.reason || t('timeOff.noReason', 'No reason provided')}</p>
              </div>
              {selectedRequest.notes && (
                <div>
                  <label className="text-sm text-gray-500">{t('common.notes', 'Notes')}</label>
                  <p className="font-medium bg-gray-50 p-3 rounded">{selectedRequest.notes}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">{t('timeOff.submitted', 'Submitted')}</label>
                <p className="font-medium">{formatDateSafe(selectedRequest.submitted_at)}</p>
              </div>
            </div>
            {/* Only show approve/reject in management view */}
            {!isPersonalView && selectedRequest.status === 'pending' && (
              <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                >
                  {t('common.approve', 'Approve')}
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium"
                >
                  {t('common.reject', 'Reject')}
                </button>
              </div>
            )}
            {(isPersonalView || selectedRequest.status !== 'pending') && (
              <div className="px-6 py-4 border-t bg-gray-50">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                  {t('common.close', 'Close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
