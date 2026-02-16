// ============================================================
// PERFORMANCE BONUSES PAGE
// Admin UI for uploading site scores and managing bonus payouts
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { api, locationsApi } from '../lib/api';
import {
  TrendingUp,
  Upload,
  Calculator,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  Users,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Check,
  X,
  Download,
  RefreshCw,
} from 'lucide-react';

export default function PerformanceBonuses() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // State
  const [activeTab, setActiveTab] = useState('scores');
  const [locations, setLocations] = useState([]);
  const [scores, setScores] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    location_id: '',
    period: '',
    score_percentage: '',
    notes: '',
  });
  const [isUploading, setIsUploading] = useState(false);

  // Calculate preview state
  const [preview, setPreview] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Approval state
  const [selectedPayouts, setSelectedPayouts] = useState([]);
  const [isApproving, setIsApproving] = useState(false);

  const tabs = [
    { key: 'scores', label: t('bonus.uploadScores', 'Upload Scores'), icon: Upload },
    { key: 'view', label: t('bonus.viewScores', 'View Scores'), icon: Eye },
    { key: 'calculate', label: t('bonus.calculateBonuses', 'Calculate Bonuses'), icon: Calculator },
    { key: 'approve', label: t('bonus.approvePay', 'Approve & Pay'), icon: CheckCircle },
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [locsRes, periodsRes] = await Promise.all([
          locationsApi.list(),
          api.get('/payroll/performance-scores/periods'),
        ]);
        setLocations(locsRes.locations || []);
        setPeriods(periodsRes.periods || []);
        if (periodsRes.periods?.length > 0) {
          setSelectedPeriod(periodsRes.periods[0].period);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch scores when period changes
  useEffect(() => {
    if (selectedPeriod) {
      fetchScores();
      fetchPayouts();
    }
  }, [selectedPeriod]);

  const fetchScores = async () => {
    try {
      const res = await api.get(`/payroll/performance-scores?period=${selectedPeriod}`);
      setScores(res.scores || []);
    } catch (error) {
      console.error('Failed to fetch scores:', error);
    }
  };

  const fetchPayouts = async () => {
    try {
      const res = await api.get(`/payroll/bonus-payouts?period=${selectedPeriod}`);
      setPayouts(res.payouts || []);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    }
  };

  // Upload single score
  const handleUploadScore = async (e) => {
    e.preventDefault();
    if (!uploadForm.location_id || !uploadForm.period || uploadForm.score_percentage === '') {
      showToast(t('bonus.fillRequired', 'Please fill all required fields'), 'error');
      return;
    }

    setIsUploading(true);
    try {
      await api.post('/payroll/performance-scores', {
        location_id: uploadForm.location_id,
        period: uploadForm.period,
        score_percentage: parseFloat(uploadForm.score_percentage),
        notes: uploadForm.notes || undefined,
      });
      showToast(t('bonus.scoreUploaded', 'Score uploaded successfully'));
      setUploadForm({ location_id: '', period: uploadForm.period, score_percentage: '', notes: '' });
      if (uploadForm.period === selectedPeriod) {
        fetchScores();
      }
      // Refresh periods
      const periodsRes = await api.get('/payroll/performance-scores/periods');
      setPeriods(periodsRes.periods || []);
    } catch (error) {
      console.error('Upload failed:', error);
      showToast(error.message || t('bonus.uploadFailed', 'Failed to upload score'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload CSV
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadForm.period) {
      showToast(t('bonus.selectPeriod', 'Please enter a period first'), 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('period', uploadForm.period);

      const res = await api.upload('/payroll/performance-scores/csv', formData);
      showToast(t('bonus.csvUploaded', `Uploaded ${res.uploaded} scores`));
      if (res.errors > 0) {
        console.warn('CSV upload errors:', res.errorDetails);
      }
      fetchScores();
      const periodsRes = await api.get('/payroll/performance-scores/periods');
      setPeriods(periodsRes.periods || []);
    } catch (error) {
      console.error('CSV upload failed:', error);
      showToast(error.message || t('bonus.csvFailed', 'Failed to process CSV'), 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Calculate preview
  const handleCalculatePreview = async () => {
    if (!selectedPeriod) return;
    setIsCalculating(true);
    try {
      const res = await api.post('/payroll/performance-scores/calculate', {
        period: selectedPeriod,
        preview: true,
      });
      setPreview(res);
    } catch (error) {
      console.error('Calculate failed:', error);
      showToast(error.message || t('bonus.calculateFailed', 'Failed to calculate bonuses'), 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  // Execute calculation
  const handleExecuteCalculation = async () => {
    if (!selectedPeriod) return;
    setIsCalculating(true);
    try {
      const res = await api.post('/payroll/performance-scores/calculate', {
        period: selectedPeriod,
        preview: false,
      });
      showToast(t('bonus.calculated', `Calculated ${res.payouts?.length || 0} bonus payouts`));
      setPreview(null);
      fetchPayouts();
      setActiveTab('approve');
    } catch (error) {
      console.error('Calculate failed:', error);
      showToast(error.message || t('bonus.calculateFailed', 'Failed to calculate bonuses'), 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  // Approve payouts
  const handleApproveSelected = async () => {
    if (selectedPayouts.length === 0) return;
    setIsApproving(true);
    try {
      const res = await api.post('/payroll/bonus-payouts/approve', {
        payout_ids: selectedPayouts,
      });
      showToast(t('bonus.approved', `Approved ${res.approved_count} payouts`));
      setSelectedPayouts([]);
      fetchPayouts();
    } catch (error) {
      console.error('Approve failed:', error);
      showToast(error.message || t('bonus.approveFailed', 'Failed to approve payouts'), 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveAll = async () => {
    if (!selectedPeriod) return;
    setIsApproving(true);
    try {
      const res = await api.post('/payroll/bonus-payouts/approve', {
        period: selectedPeriod,
      });
      showToast(t('bonus.approved', `Approved ${res.approved_count} payouts`));
      fetchPayouts();
    } catch (error) {
      console.error('Approve failed:', error);
      showToast(error.message || t('bonus.approveFailed', 'Failed to approve payouts'), 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const togglePayoutSelection = (id) => {
    setSelectedPayouts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAllPending = () => {
    const pendingIds = payouts.filter(p => p.status === 'pending').map(p => p.id);
    setSelectedPayouts(pendingIds);
  };

  // Stats
  const stats = {
    locations_scored: scores.length,
    total_locations: locations.length,
    pending_payouts: payouts.filter(p => p.status === 'pending').length,
    approved_payouts: payouts.filter(p => p.status === 'approved').length,
    paid_payouts: payouts.filter(p => p.status === 'paid').length,
    total_payout_amount: payouts.reduce((sum, p) => sum + parseFloat(p.payout_amount || 0), 0),
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    if (score >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-slate-100 text-slate-800',
    };
    return styles[status] || styles.pending;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('bonus.title', 'Performance Bonuses')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('bonus.subtitle', 'Upload site scores and calculate employee bonus payouts')}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">{t('bonus.period', 'Period')}:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            {periods.length === 0 && <option value="">No periods yet</option>}
            {periods.map(p => (
              <option key={p.period} value={p.period}>{p.period} ({p.location_count} locations)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats.locations_scored}/{stats.total_locations}
              </p>
              <p className="text-sm text-slate-500">{t('bonus.locationsScored', 'Locations Scored')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pending_payouts}</p>
              <p className="text-sm text-slate-500">{t('bonus.pendingApproval', 'Pending Approval')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.approved_payouts + stats.paid_payouts}</p>
              <p className="text-sm text-slate-500">{t('bonus.approvedPaid', 'Approved/Paid')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total_payout_amount)}</p>
              <p className="text-sm text-slate-500">{t('bonus.totalPayouts', 'Total Payouts')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t('performanceBonuses.tabs.' + tab.key, tab.label)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {/* Upload Scores Tab */}
        {activeTab === 'scores' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('bonus.uploadScores', 'Upload Performance Scores')}</h2>

            {/* Single Upload Form */}
            <form onSubmit={handleUploadScore} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('bonus.location', 'Location')} *</label>
                <select
                  value={uploadForm.location_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('bonus.selectLocation', 'Select location')}</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('bonus.period', 'Period')} *</label>
                <input
                  type="text"
                  value={uploadForm.period}
                  onChange={(e) => setUploadForm({ ...uploadForm, period: e.target.value })}
                  placeholder="e.g., 2025-Q4"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('bonus.score', 'Score %')} *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={uploadForm.score_percentage}
                  onChange={(e) => setUploadForm({ ...uploadForm, score_percentage: e.target.value })}
                  placeholder="0-100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {t('bonus.upload', 'Upload')}
                </button>
              </div>
            </form>

            {/* CSV Upload */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-md font-medium text-slate-900 mb-3">{t('bonus.bulkUpload', 'Bulk Upload via CSV')}</h3>
              <p className="text-sm text-slate-500 mb-4">
                {t('bonus.csvFormat', 'CSV should have columns: location_code, score_percentage, notes (optional)')}
              </p>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !uploadForm.period}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {t('bonus.selectCsv', 'Select CSV File')}
                </button>
                {!uploadForm.period && (
                  <span className="text-sm text-amber-600">{t('bonus.enterPeriodFirst', 'Enter a period first')}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Scores Tab */}
        {activeTab === 'view' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('bonus.scoresFor', 'Scores for')} {selectedPeriod || 'N/A'}
              </h2>
              <button onClick={fetchScores} className="p-2 hover:bg-slate-100 rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {scores.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('bonus.noScores', 'No scores uploaded for this period')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.location', 'Location')}</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.score', 'Score')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.source', 'Source')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.uploadedBy', 'Uploaded By')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.date', 'Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map(score => (
                    <tr key={score.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{score.location_name}</div>
                        <div className="text-sm text-slate-500">{score.location_code}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score.score_percentage)}`}>
                          {score.score_percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 capitalize">{score.source}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{score.uploaded_by_name || 'System'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(score.uploaded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Calculate Tab */}
        {activeTab === 'calculate' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t('bonus.calculateBonuses', 'Calculate Bonuses')}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {t('bonus.calculateDesc', 'Formula: payout = employee bonus × (site score / 100)')}
                </p>
              </div>
              <button
                onClick={handleCalculatePreview}
                disabled={isCalculating || !selectedPeriod || scores.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isCalculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {t('bonus.preview', 'Preview Calculation')}
              </button>
            </div>

            {scores.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">{t('bonus.noScoresWarning', 'No scores uploaded')}</p>
                  <p className="text-sm text-amber-700">{t('bonus.uploadFirst', 'Upload performance scores before calculating bonuses.')}</p>
                </div>
              </div>
            )}

            {preview && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{t('bonus.employees', 'Employees')}</p>
                    <p className="text-xl font-bold text-slate-900">{preview.summary.employee_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('bonus.eligibleBonus', 'Eligible Bonus')}</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(preview.summary.total_eligible_bonus)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('bonus.totalPayout', 'Total Payout')}</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(preview.summary.total_payout)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('bonus.avgScore', 'Avg Score')}</p>
                    <p className="text-xl font-bold text-slate-900">{preview.summary.average_score}%</p>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-96 overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.employee', 'Employee')}</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.location', 'Location')}</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.bonusAmount', 'Bonus Amount')}</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.score', 'Score')}</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.payout', 'Payout')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.calculations.map((calc, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-3 px-4 font-medium text-slate-900">{calc.employee_name}</td>
                          <td className="py-3 px-4 text-slate-600">{calc.location_name}</td>
                          <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(calc.bonus_amount)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${getScoreColor(calc.score_percentage)}`}>
                              {calc.score_percentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-green-600">{formatCurrency(calc.payout_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Execute Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setPreview(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleExecuteCalculation}
                    disabled={isCalculating}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCalculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {t('bonus.createPayouts', 'Create Payout Records')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approve Tab */}
        {activeTab === 'approve' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('bonus.approvePayouts', 'Approve Payouts')} - {selectedPeriod}
              </h2>
              <div className="flex gap-2">
                {payouts.filter(p => p.status === 'pending').length > 0 && (
                  <>
                    <button
                      onClick={selectAllPending}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      {t('bonus.selectAll', 'Select All Pending')}
                    </button>
                    <button
                      onClick={handleApproveAll}
                      disabled={isApproving}
                      className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {t('bonus.approveAll', 'Approve All Pending')}
                    </button>
                  </>
                )}
                {selectedPayouts.length > 0 && (
                  <button
                    onClick={handleApproveSelected}
                    disabled={isApproving}
                    className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isApproving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t('bonus.approveSelected', `Approve ${selectedPayouts.length} Selected`)}
                  </button>
                )}
              </div>
            </div>

            {payouts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('bonus.noPayouts', 'No bonus payouts calculated for this period')}</p>
                <button
                  onClick={() => setActiveTab('calculate')}
                  className="mt-4 text-indigo-600 hover:underline"
                >
                  {t('bonus.goCalculate', 'Go to Calculate tab')}
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={selectedPayouts.length === payouts.filter(p => p.status === 'pending').length && selectedPayouts.length > 0}
                        onChange={(e) => e.target.checked ? selectAllPending() : setSelectedPayouts([])}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.employee', 'Employee')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.location', 'Location')}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.bonus', 'Bonus')}</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.score', 'Score')}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.payout', 'Payout')}</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">{t('bonus.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(payout => (
                    <tr key={payout.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedPayouts.includes(payout.id)}
                          onChange={() => togglePayoutSelection(payout.id)}
                          disabled={payout.status !== 'pending'}
                          className="rounded border-slate-300 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{payout.first_name} {payout.last_name}</div>
                        <div className="text-sm text-slate-500">{payout.employee_number}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{payout.location_name}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(payout.bonus_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${getScoreColor(payout.score_percentage)}`}>
                          {payout.score_percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">{formatCurrency(payout.payout_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(payout.status)}`}>
                          {t('common.' + payout.status, payout.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
