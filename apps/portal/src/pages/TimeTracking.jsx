// ============================================================
// TIME TRACKING PAGE - REAL API
// ============================================================
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { timeApi, locationsApi, reportsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Clock, Check, X, Filter, Download, AlertCircle, CheckCircle, XCircle, MapPin, Navigation, Wifi, WifiOff, Play, Square, Coffee, Timer, User } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500 text-white' : type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : type === 'error' ? <XCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span>{message}</span>
    </div>
  );
}

const safeNum = (val) => {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(num) ? 0 : num;
};

export default function TimeTracking() {
  const { user, isManagerOrAbove } = useAuth();
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(isManagerOrAbove ? 'pending' : 'clock');
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ locationId: '', startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') });
  const [currentEntry, setCurrentEntry] = useState(null);
  const [clockTime, setClockTime] = useState(new Date());
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [clockingLoading, setClockingLoading] = useState(false); // NM-14: Double-click protection

  useEffect(() => { loadData(); const interval = setInterval(() => setClockTime(new Date()), 1000); return () => clearInterval(interval); }, []);

  const loadData = async () => {
    setError(null);
    try {
      const [entriesRes, locationsRes] = await Promise.all([
        timeApi.getEntries(filters),
        locationsApi.list()
      ]);
      setEntries(entriesRes.entries || []);
      setLocations(locationsRes.locations || []);
      if (isManagerOrAbove) {
        const pendingRes = await timeApi.getPending();
        setPendingEntries(pendingRes.entries || []);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load time tracking data:', err);
      setError(t('timeTracking.loadError', 'Failed to load time tracking data. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ids) => {
    try {
      await Promise.all(ids.map(id => timeApi.approve(id)));
      setToast({ type: 'success', message: t('timeTracking.entriesApproved', `${ids.length} entries approved`) });
      setPendingEntries(prev => prev.filter(e => !ids.includes(e.id)));
      setSelectedEntries([]);
    } catch (err) {
      setToast({ type: 'error', message: t('timeTracking.approveError', 'Failed to approve entries. Please try again.') });
    }
  };

  const handleReject = async (ids) => {
    try {
      await Promise.all(ids.map(id => timeApi.reject(id)));
      setToast({ type: 'success', message: t('timeTracking.entriesRejected', `${ids.length} entries rejected`) });
      setPendingEntries(prev => prev.filter(e => !ids.includes(e.id)));
      setSelectedEntries([]);
    } catch (err) {
      setToast({ type: 'error', message: t('timeTracking.rejectError', 'Failed to reject entries. Please try again.') });
    }
  };

  const handleClockIn = async () => {
    if (clockingLoading) return; // NM-14: Prevent double-click
    setClockingLoading(true);
    try {
      const result = await timeApi.clockIn({ locationId: locations[0]?.id });
      setCurrentEntry(result.entry);
      setToast({ type: 'success', message: t('timeTracking.clockedIn', 'Clocked in successfully') });
    } catch (err) {
      setToast({ type: 'error', message: t('timeTracking.clockInError', 'Failed to clock in. Please try again.') });
    } finally {
      setClockingLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry || clockingLoading) return; // NM-14: Prevent double-click
    setClockingLoading(true);
    try {
      await timeApi.clockOut(currentEntry.id);
      setCurrentEntry(null);
      setIsOnBreak(false);
      setToast({ type: 'success', message: t('timeTracking.clockedOut', 'Clocked out successfully') });
    } catch (err) {
      setToast({ type: 'error', message: t('timeTracking.clockOutError', 'Failed to clock out. Please try again.') });
    } finally {
      setClockingLoading(false);
    }
  };

  const handleBreak = async () => {
    if (!currentEntry || clockingLoading) return; // NM-14: Prevent double-click
    setClockingLoading(true);
    try {
      if (isOnBreak) {
        await timeApi.endBreak(currentEntry.id);
        setIsOnBreak(false);
        setToast({ type: 'info', message: t('timeTracking.breakEnded', 'Break ended') });
      } else {
        await timeApi.startBreak(currentEntry.id);
        setIsOnBreak(true);
        setToast({ type: 'info', message: t('timeTracking.breakStarted', 'Break started') });
      }
    } catch (err) {
      setToast({ type: 'error', message: t('timeTracking.breakError', 'Failed to update break status. Please try again.') });
    } finally {
      setClockingLoading(false);
    }
  };

  const handleExport = () => {
    const url = reportsApi.exportTimesheets({ startDate: filters.startDate, endDate: filters.endDate, locationId: filters.locationId });
    window.open(url, '_blank');
  };

  const formatTime = (dateStr) => { try { if (!dateStr) return '--:--'; const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr); return format(date, 'HH:mm'); } catch { return '--:--'; } };
  const formatDate = (dateStr) => { try { if (!dateStr) return 'N/A'; const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr); return format(date, 'dd MMM yyyy'); } catch { return 'N/A'; } };
  const getWorkingTime = () => { if (!currentEntry?.clock_in) return '0:00:00'; const start = typeof currentEntry.clock_in === 'string' ? parseISO(currentEntry.clock_in) : new Date(currentEntry.clock_in); const mins = differenceInMinutes(clockTime, start); const hours = Math.floor(mins / 60); const minutes = mins % 60; const seconds = clockTime.getSeconds(); return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; };

  if (loading) { return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>); }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('common.retry', 'Retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('timeTracking.title', 'Time Tracking')}</h1>
          <p className="text-gray-600">{isManagerOrAbove ? t('timeTracking.managerSubtitle', 'Review and approve timesheets') : t('timeTracking.employeeSubtitle', 'Track your working hours')}</p>
        </div>
        {isManagerOrAbove && (
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" />
            {t('settings.dataExport', 'Export')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {!isManagerOrAbove && <button onClick={() => setTab('clock')} className={`px-4 py-2 font-medium border-b-2 transition-colors ${tab === 'clock' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{t('timeTracking.clockIn', 'Clock In/Out')}</button>}
        {isManagerOrAbove && <button onClick={() => setTab('pending')} className={`px-4 py-2 font-medium border-b-2 transition-colors ${tab === 'pending' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{t('common.pending', 'Pending')} ({pendingEntries.length})</button>}
        <button onClick={() => setTab('history')} className={`px-4 py-2 font-medium border-b-2 transition-colors ${tab === 'history' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{t('timeTracking.history', 'History')}</button>
      </div>

      {/* Clock In/Out Tab */}
      {tab === 'clock' && (
        <div className="bg-white rounded-lg p-8 border shadow-sm">
          <div className="text-center">
            <p className="text-6xl font-mono font-bold text-gray-900 mb-2">{format(clockTime, 'HH:mm:ss')}</p>
            <p className="text-gray-500 mb-8">{format(clockTime, 'EEEE, dd MMMM yyyy')}</p>
            {currentEntry ? (
              <div className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4 inline-block"><p className="text-sm text-green-600">{t('timeTracking.workingTime', 'Working Time')}</p><p className="text-3xl font-bold text-green-700">{getWorkingTime()}</p></div>
                <div className="flex justify-center gap-4">
                  <button onClick={handleBreak} disabled={clockingLoading} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${isOnBreak ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}><Coffee className="h-5 w-5" />{isOnBreak ? t('timeTracking.endBreak', 'End Break') : t('timeTracking.startBreak', 'Start Break')}</button>
                  <button onClick={handleClockOut} disabled={clockingLoading} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"><Square className="h-5 w-5" />{t('timeTracking.clockOut', 'Clock Out')}</button>
                </div>
              </div>
            ) : (
              <button onClick={handleClockIn} disabled={clockingLoading} className="flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-lg font-medium text-lg hover:bg-green-700 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"><Play className="h-6 w-6" />{t('timeTracking.clockIn', 'Clock In')}</button>
            )}
          </div>
        </div>
      )}

      {/* Pending Approvals Tab */}
      {tab === 'pending' && isManagerOrAbove && (
        <div className="space-y-4">
          {selectedEntries.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-blue-700">{selectedEntries.length} {t('common.selected', 'selected')}</span>
              <button onClick={() => handleApprove(selectedEntries)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">{t('common.approveSelected', 'Approve Selected')}</button>
              <button onClick={() => handleReject(selectedEntries)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">{t('common.rejectSelected', 'Reject Selected')}</button>
              <button onClick={() => setSelectedEntries([])} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">{t('common.clearSelection', 'Clear')}</button>
            </div>
          )}
          {pendingEntries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border"><CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" /><p className="text-gray-500">{t('timeTracking.noPending', 'No pending entries to review')}</p></div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectedEntries.length === pendingEntries.length} onChange={(e) => setSelectedEntries(e.target.checked ? pendingEntries.map(e => e.id) : [])} className="h-4 w-4 text-blue-600 rounded" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('profile.title', 'Employee')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date', 'Date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('timeTracking.clockIn', 'Clock In')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('timeTracking.clockOut', 'Clock Out')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('timeTracking.totalHours', 'Total Hours')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('schedule.location', 'Location')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedEntries.includes(entry.id)} onChange={(e) => setSelectedEntries(e.target.checked ? [...selectedEntries, entry.id] : selectedEntries.filter(id => id !== entry.id))} className="h-4 w-4 text-blue-600 rounded" /></td>
                      <td className="px-4 py-3 font-medium">{entry.employee_name}</td>
                      <td className="px-4 py-3">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3">{formatTime(entry.clock_in)}</td>
                      <td className="px-4 py-3">{formatTime(entry.clock_out)}</td>
                      <td className="px-4 py-3 font-medium">{safeNum(entry.total_hours).toFixed(1)}h</td>
                      <td className="px-4 py-3">{entry.location_name || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove([entry.id])} className="p-1 text-green-600 hover:bg-green-50 rounded" title={t('common.approve', 'Approve')}><Check className="h-4 w-4" /></button>
                          <button onClick={() => handleReject([entry.id])} className="p-1 text-red-600 hover:bg-red-50 rounded" title={t('common.reject', 'Reject')}><X className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('timeOff.startDate', 'Start Date')}</label><input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('timeOff.endDate', 'End Date')}</label><input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('schedule.location', 'Location')}</label><select value={filters.locationId} onChange={(e) => setFilters({ ...filters, locationId: e.target.value })} className="px-3 py-2 border rounded-lg"><option value="">{t('schedule.allLocations', 'All Locations')}</option>{locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}</select></div>
          </div>
          {entries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-slate-700 font-medium mb-2">{t('timeTracking.noEntries', 'No time entries recorded')}</p>
              <p className="text-slate-500 text-sm">{t('timeTracking.entriesWillAppear', 'Time entries will appear here once employees clock in.')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date', 'Date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('timeTracking.clockIn', 'Clock In')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('timeTracking.clockOut', 'Clock Out')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('timeTracking.totalHours', 'Total Hours')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map(entry => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3">{formatTime(entry.clock_in)}</td>
                      <td className="px-4 py-3">{formatTime(entry.clock_out)}</td>
                      <td className="px-4 py-3 font-medium">{safeNum(entry.total_hours).toFixed(1)}h</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${entry.status === 'approved' ? 'bg-green-100 text-green-800' : entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{entry.status === 'approved' ? t('common.approved', 'Approved') : entry.status === 'pending' ? t('common.pending', 'Pending') : entry.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
