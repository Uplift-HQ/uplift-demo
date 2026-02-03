// ============================================================
// REPORTS PAGE
// Analytics, reporting, and custom report builder
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsApi, locationsApi } from '../lib/api';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  Plus,
  Settings,
  Trash2,
  Save,
  Play,
  PieChart,
  LineChart,
  Table,
  ChevronDown,
  ChevronRight,
  X,
  Copy,
  Share2,
  AlertCircle,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const REPORTS = [
  { id: 'hours', nameKey: 'reports.hoursWorked', icon: Clock, descKey: 'reports.hoursWorkedDesc' },
  { id: 'attendance', nameKey: 'reports.attendance', icon: Users, descKey: 'reports.attendanceDesc' },
  { id: 'labor-cost', nameKey: 'reports.laborCost', icon: DollarSign, descKey: 'reports.laborCostDesc' },
  { id: 'coverage', nameKey: 'reports.scheduleCoverage', icon: Calendar, descKey: 'reports.scheduleCoverageDesc' },
];

const CHART_TYPES = [
  { id: 'table', nameKey: 'reports.chartTypes.table', icon: Table },
  { id: 'bar', nameKey: 'reports.chartTypes.bar', icon: BarChart3 },
  { id: 'line', nameKey: 'reports.chartTypes.line', icon: LineChart },
  { id: 'pie', nameKey: 'reports.chartTypes.pie', icon: PieChart },
];

export default function Reports() {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = useState('hours');
  const [data, setData] = useState(null);
  const [totals, setTotals] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('table');
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    locationId: '',
    groupBy: 'employee',
  });

  useEffect(() => {
    loadLocations();
    loadSavedReports();
  }, []);

  useEffect(() => {
    loadReport();
  }, [activeReport, filters]);

  const loadLocations = async () => {
    try {
      const result = await locationsApi.list();
      setLocations(result?.locations || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load locations:', err);
      setLocations([]);
    }
  };

  const loadSavedReports = async () => {
    // Saved reports endpoint not yet available
    setSavedReports([]);
  };

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      switch (activeReport) {
        case 'hours':
          result = await reportsApi.hours(filters);
          break;
        case 'attendance':
          result = await reportsApi.attendance(filters);
          break;
        case 'labor-cost':
          result = await reportsApi.laborCost(filters);
          break;
        case 'coverage':
          result = await reportsApi.coverage(filters);
          break;
      }

      setData(result?.data || []);
      setTotals(result?.totals || null);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load report:', err);
      setError(err.message || t('reports.loadError', 'Failed to load report data'));
      setData([]);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (exportFormat = 'csv') => {
    let url;
    if (activeReport === 'hours') {
      url = reportsApi.exportTimesheets(filters);
    } else {
      url = reportsApi.exportEmployees({ format: exportFormat });
    }
    window.open(url, '_blank');
  };

  const handleSaveReport = async (report) => {
    // Saved reports feature not yet available on the backend
    setSavedReports([...savedReports, { ...report, id: String(Date.now()) }]);
    setShowReportBuilder(false);
  };

  // Quick date range presets
  const datePresets = [
    { label: t('reports.thisMonth', 'This Month'), start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
    { label: t('reports.lastMonth', 'Last Month'), start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
    { label: t('reports.last7Days', 'Last 7 Days'), start: subDays(new Date(), 7), end: new Date() },
    { label: t('reports.last30Days', 'Last 30 Days'), start: subDays(new Date(), 30), end: new Date() },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('reports.title', 'Reports')}</h1>
          <p className="text-slate-600">{t('reports.subtitle', 'Analytics, insights, and custom reports')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReportBuilder(true)} className="btn btn-secondary">
            <Plus className="w-4 h-4" />
            {t('reports.buildReport', 'Build Report')}
          </button>
          <div className="relative group">
            <button className="btn btn-primary">
              <Download className="w-4 h-4" />
              {t('reports.export', 'Export')}
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => handleExport('csv')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 rounded-t-lg">
                {t('reports.exportCsv', 'Export as CSV')}
              </button>
              <button onClick={() => handleExport('xlsx')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50">
                {t('reports.exportExcel', 'Export as Excel')}
              </button>
              <button onClick={() => handleExport('pdf')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 rounded-b-lg">
                {t('reports.exportPdf', 'Export as PDF')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <button onClick={loadReport} className="ml-auto text-sm text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {/* Saved Reports */}
      {savedReports.length > 0 ? (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900">{t('reports.savedReports', 'Saved Reports')}</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {savedReports.map((report) => (
              <button
                key={report.id}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm whitespace-nowrap transition-colors"
                onClick={() => setActiveReport(report.type)}
              >
                <BarChart3 className="w-4 h-4 text-slate-500" />
                {report.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Saved reports are stored locally. Persistent saved reports coming soon.</p>
        </div>
      ) : null}

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORTS.map((report) => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`card p-4 text-left hover:shadow-md transition-all ${
              activeReport === report.id ? 'ring-2 ring-momentum-500 bg-momentum-50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeReport === report.id
                  ? 'bg-momentum-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <report.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{t(report.nameKey)}</p>
                <p className="text-xs text-slate-500">{t(report.descKey)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Presets */}
          <div className="flex gap-2">
            {datePresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setFilters({
                  ...filters,
                  startDate: format(preset.start, 'yyyy-MM-dd'),
                  endDate: format(preset.end, 'yyyy-MM-dd'),
                })}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filters.startDate === format(preset.start, 'yyyy-MM-dd')
                    ? 'bg-momentum-100 text-momentum-700 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <div>
            <label className="label">{t('reports.startDate', 'Start Date')}</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('reports.endDate', 'End Date')}</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('schedule.location', 'Location')}</label>
            <select
              value={filters.locationId}
              onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
              className="input"
            >
              <option value="">{t('reports.allLocations', t('reports.allLocations'))}</option>
              {(locations || []).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          {activeReport === 'hours' && (
            <div>
              <label className="label">{t('reports.groupBy', 'Group By')}</label>
              <select
                value={filters.groupBy}
                onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
                className="input"
              >
                <option value="employee">{t('reports.employee', 'Employee')}</option>
                <option value="location">{t('schedule.location', 'Location')}</option>
                <option value="day">{t('reports.day', 'Day')}</option>
                <option value="week">{t('reports.week', 'Week')}</option>
              </select>
            </div>
          )}

          <div className="ml-auto">
            <label className="label">{t('reports.visualization', 'Visualization')}</label>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {CHART_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  className={`p-2 rounded-md transition-colors ${
                    chartType === type.id ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                  }`}
                  title={t(type.nameKey)}
                >
                  <type.icon className={`w-4 h-4 ${chartType === type.id ? 'text-momentum-600' : 'text-slate-500'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {totals.total_hours !== undefined && (
            <div className="stat-card">
              <p className="stat-value">{parseFloat(totals.total_hours || 0).toFixed(1)}h</p>
              <p className="stat-label">{t('reports.totalHours', 'Total Hours')}</p>
            </div>
          )}
          {totals.regular_hours !== undefined && (
            <div className="stat-card">
              <p className="stat-value">{parseFloat(totals.regular_hours || 0).toFixed(1)}h</p>
              <p className="stat-label">{t('reports.regularHours', 'Regular Hours')}</p>
            </div>
          )}
          {totals.overtime_hours !== undefined && (
            <div className="stat-card">
              <p className="stat-value">{parseFloat(totals.overtime_hours || 0).toFixed(1)}h</p>
              <p className="stat-label">{t('reports.overtimeHours', 'Overtime Hours')}</p>
            </div>
          )}
          {totals.employee_count !== undefined && (
            <div className="stat-card">
              <p className="stat-value">{totals.employee_count}</p>
              <p className="stat-label">{t('reports.employees', 'Employees')}</p>
            </div>
          )}
        </div>
      )}

      {/* Report Data */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
          </div>
        ) : data?.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('reports.noData', 'No data for selected period')}</p>
          </div>
        ) : chartType === 'table' ? (
          <div className="overflow-x-auto">
            {activeReport === 'hours' && <HoursTable data={data} groupBy={filters.groupBy} />}
            {activeReport === 'attendance' && <AttendanceTable data={data} />}
            {activeReport === 'labor-cost' && <LaborCostTable data={data} />}
            {activeReport === 'coverage' && <CoverageTable data={data} />}
          </div>
        ) : (
          <div className="p-6">
            <ChartVisualization data={data} chartType={chartType} reportType={activeReport} />
          </div>
        )}
      </div>

      {/* Report Builder Modal */}
      {showReportBuilder && (
        <ReportBuilderModal
          onClose={() => setShowReportBuilder(false)}
          onSave={handleSaveReport}
          locations={locations}
        />
      )}
    </div>
  );
}

// ============================================================
// CHART VISUALIZATION COMPONENT
// ============================================================

function ChartVisualization({ data, chartType, reportType }) {
  // Ensure data is always an array
  const safeData = data || [];

  // Calculate chart dimensions
  const maxValue = useMemo(() => {
    if (safeData.length === 0) return 100;
    const max = Math.max(...safeData.map(d => parseFloat(d.total_hours || d.hours || d.worked_shifts || 0)));
    return max > 0 ? max : 100;
  }, [safeData]);

  if (chartType === 'bar') {
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-slate-700">Hours by {reportType === 'hours' ? 'Employee' : 'Category'}</h3>
        <div className="space-y-3">
          {safeData.slice(0, 10).map((row, i) => {
            const value = parseFloat(row.total_hours || row.hours || row.worked_shifts || 0);
            const percentage = (value / maxValue) * 100;
            const label = row.first_name ? `${row.first_name} ${row.last_name}` : row.location_name || row.employee || `Item ${i + 1}`;

            return (
              <div key={i} className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-600 truncate">{label}</div>
                <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-momentum-400 to-momentum-500 rounded-lg transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-sm font-medium text-slate-900 text-right">
                  {value.toFixed(1)}h
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (chartType === 'line') {
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-slate-700">Trend Over Time</h3>
        <div className="relative h-64 flex items-end gap-1">
          {safeData.slice(0, 20).map((row, i) => {
            const value = parseFloat(row.total_hours || row.hours || row.worked_shifts || 0);
            const percentage = (value / maxValue) * 100;

            return (
              <div key={i} className="flex-1 flex flex-col items-center group">
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-3 h-3 bg-momentum-500 rounded-full z-10 group-hover:scale-150 transition-transform"
                    style={{ marginBottom: `${percentage}%` }}
                  />
                  <div className="absolute bottom-0 w-0.5 bg-momentum-200" style={{ height: `${percentage}%` }} />
                </div>
                <div className="absolute -bottom-6 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {value.toFixed(1)}
                </div>
              </div>
            );
          })}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-slate-400 -ml-8">
            <span>{maxValue.toFixed(0)}</span>
            <span>{(maxValue / 2).toFixed(0)}</span>
            <span>0</span>
          </div>
        </div>
      </div>
    );
  }

  if (chartType === 'pie') {
    const total = safeData.reduce((sum, row) => sum + parseFloat(row.total_hours || row.hours || row.worked_shifts || 0), 0);
    const colors = ['#FF6B35', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#6366F1'];

    let cumulativePercentage = 0;

    return (
      <div className="flex items-center gap-8">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {safeData.slice(0, 8).map((row, i) => {
              const value = parseFloat(row.total_hours || row.hours || row.worked_shifts || 0);
              const percentage = (value / total) * 100;
              const startPercentage = cumulativePercentage;
              cumulativePercentage += percentage;

              const circumference = 2 * Math.PI * 40;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((startPercentage / 100) * circumference);

              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{total.toFixed(0)}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {safeData.slice(0, 8).map((row, i) => {
            const value = parseFloat(row.total_hours || row.hours || row.worked_shifts || 0);
            const label = row.first_name ? `${row.first_name} ${row.last_name}` : row.location_name || row.employee || `Item ${i + 1}`;

            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="text-sm text-slate-600">{label}</span>
                <span className="text-sm font-medium text-slate-900">{value.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================
// REPORT BUILDER MODAL
// ============================================================

function ReportBuilderModal({ onClose, onSave, locations }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [report, setReport] = useState({
    name: '',
    type: 'hours',
    columns: ['employee', 'total_hours', 'regular_hours', 'overtime_hours'],
    filters: {},
    groupBy: 'employee',
    sortBy: 'total_hours',
    sortOrder: 'desc',
  });

  const availableColumns = {
    hours: [
      { id: 'employee', nameKey: 'reports.columns.employeeName' },
      { id: 'total_hours', nameKey: 'reports.columns.totalHours' },
      { id: 'regular_hours', nameKey: 'reports.columns.regularHours' },
      { id: 'overtime_hours', nameKey: 'reports.columns.overtimeHours' },
      { id: 'labor_cost', nameKey: 'reports.columns.laborCost' },
      { id: 'location', nameKey: 'reports.columns.location' },
      { id: 'department', nameKey: 'reports.columns.department' },
    ],
    attendance: [
      { id: 'employee', nameKey: 'reports.columns.employeeName' },
      { id: 'scheduled_shifts', nameKey: 'reports.columns.scheduledShifts' },
      { id: 'worked_shifts', nameKey: 'reports.columns.workedShifts' },
      { id: 'missed_shifts', nameKey: 'reports.columns.missedShifts' },
      { id: 'late_arrivals', nameKey: 'reports.columns.lateArrivals' },
      { id: 'avg_arrival_diff', nameKey: 'reports.columns.avgArrivalDiff' },
    ],
    coverage: [
      { id: 'date', nameKey: 'reports.columns.date' },
      { id: 'location', nameKey: 'reports.columns.location' },
      { id: 'total_shifts', nameKey: 'reports.columns.totalShifts' },
      { id: 'filled_shifts', nameKey: 'reports.columns.filledShifts' },
      { id: 'open_shifts', nameKey: 'reports.columns.openShifts' },
      { id: 'fill_rate', nameKey: 'reports.columns.fillRate' },
    ],
  };

  const toggleColumn = (columnId) => {
    setReport(prev => ({
      ...prev,
      columns: prev.columns.includes(columnId)
        ? prev.columns.filter(c => c !== columnId)
        : [...prev.columns, columnId],
    }));
  };

  const handleSave = async () => {
    if (!report.name) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSave(report);
    } catch (err) {
      setSaveError(err.message || t('reports.saveError', 'Failed to save report'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">Build Custom Report</h2>
            <p className="text-sm text-slate-500">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{saveError}</div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Name</label>
                <input
                  type="text"
                  value={report.name}
                  onChange={(e) => setReport({ ...report, name: e.target.value })}
                  className="input"
                  placeholder={t('reports.namePlaceholder', 'e.g., Weekly Overtime Analysis')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['hours', 'attendance', 'coverage'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setReport({ ...report, type, columns: [] })}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        report.type === type
                          ? 'border-momentum-500 bg-momentum-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium capitalize">{type}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('reports.selectColumns', 'Select Columns')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(availableColumns[report.type] || []).map((col) => (
                    <button
                      key={col.id}
                      onClick={() => toggleColumn(col.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        report.columns.includes(col.id)
                          ? 'border-momentum-500 bg-momentum-50 text-momentum-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {t(col.nameKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Group By</label>
                  <select
                    value={report.groupBy}
                    onChange={(e) => setReport({ ...report, groupBy: e.target.value })}
                    className="input"
                  >
                    <option value="employee">{t('reports.groupByOptions.employee', 'Employee')}</option>
                    <option value="location">{t('reports.groupByOptions.location', 'Location')}</option>
                    <option value="department">{t('reports.groupByOptions.department', 'Department')}</option>
                    <option value="day">{t('reports.groupByOptions.day', 'Day')}</option>
                    <option value="week">{t('reports.groupByOptions.week', 'Week')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
                  <select
                    value={report.sortBy}
                    onChange={(e) => setReport({ ...report, sortBy: e.target.value })}
                    className="input"
                  >
                    {report.columns.map((col) => (
                      <option key={col} value={col}>{col.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Filters</label>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-600">Location</label>
                    <select className="input mt-1">
                      <option value="">{t('reports.allLocations', 'All Locations')}</option>
                      {(locations || []).map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-600">Date From</label>
                      <input type="date" className="input mt-1" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Date To</label>
                      <input type="date" className="input mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">{t('reports.summary.title', 'Report Summary')}</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>{t('reports.summary.name', 'Name')}: {report.name || t('reports.untitledReport', 'Untitled Report')}</li>
                  <li>{t('reports.summary.type', 'Type')}: {report.type}</li>
                  <li>{t('reports.summary.columns', 'Columns')}: {report.columns.length} {t('common.selected', 'selected')}</li>
                  <li>{t('reports.summary.groupBy', 'Group by')}: {report.groupBy}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-slate-50">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="btn btn-secondary"
          >
            {step === 1 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
          </button>
          <div className="flex gap-3">
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !report.name}
                className="btn btn-primary"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                <Save className="w-4 h-4" />
                {saving ? t('common.saving', 'Saving...') : t('reports.saveReport', 'Save Report')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TABLE COMPONENTS
// ============================================================

function HoursTable({ data, groupBy }) {
  const { t } = useTranslation();
  return (
    <table className="table">
      <thead>
        <tr>
          <th>{groupBy === 'employee' ? t('reports.columns.employee', 'Employee') : groupBy === 'location' ? t('reports.columns.location', 'Location') : t('reports.columns.date', 'Date')}</th>
          <th className="text-right">{t('reports.totalHours', 'Total Hours')}</th>
          <th className="text-right">{t('reports.regularHours', 'Regular')}</th>
          <th className="text-right">{t('reports.overtimeHours', 'Overtime')}</th>
          {groupBy === 'employee' && <th className="text-right">{t('reports.columns.laborCost', 'Labor Cost')}</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {(data || []).map((row, i) => (
          <tr key={i}>
            <td className="font-medium">
              {groupBy === 'employee'
                ? `${row.first_name || ''} ${row.last_name || ''}`
                : groupBy === 'location'
                ? row.location_name || t('common.unknown', 'Unknown')
                : row.date ? format(new Date(row.date), 'EEE, MMM d') : '-'}
            </td>
            <td className="text-right">{parseFloat(row.total_hours || 0).toFixed(1)}h</td>
            <td className="text-right">{parseFloat(row.regular_hours || 0).toFixed(1)}h</td>
            <td className="text-right">{parseFloat(row.overtime_hours || 0).toFixed(1)}h</td>
            {groupBy === 'employee' && (
              <td className="text-right font-medium">{parseFloat(row.labor_cost || 0).toFixed(2)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AttendanceTable({ data }) {
  const { t } = useTranslation();
  return (
    <table className="table">
      <thead>
        <tr>
          <th>{t('reports.columns.employee', 'Employee')}</th>
          <th className="text-right">{t('reports.columns.scheduledShifts', 'Scheduled')}</th>
          <th className="text-right">{t('reports.columns.workedShifts', 'Worked')}</th>
          <th className="text-right">{t('reports.columns.missedShifts', 'Missed')}</th>
          <th className="text-right">{t('reports.columns.lateArrivals', 'Late')}</th>
          <th className="text-right">{t('reports.columns.avgArrivalDiff', 'Avg Arrival')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {(data || []).map((row, i) => (
          <tr key={i}>
            <td className="font-medium">{row.first_name || ''} {row.last_name || ''}</td>
            <td className="text-right">{row.scheduled_shifts}</td>
            <td className="text-right">{row.worked_shifts}</td>
            <td className="text-right">
              <span className={row.missed_shifts > 0 ? 'text-red-600 font-medium' : ''}>
                {row.missed_shifts}
              </span>
            </td>
            <td className="text-right">
              <span className={row.late_arrivals > 0 ? 'text-orange-600' : ''}>
                {row.late_arrivals}
              </span>
            </td>
            <td className="text-right">
              {row.avg_arrival_diff_mins > 0 ? '+' : ''}{row.avg_arrival_diff_mins?.toFixed(0) || 0} min
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LaborCostTable({ data }) {
  const { t } = useTranslation();
  return (
    <table className="table">
      <thead>
        <tr>
          <th>{t('reports.columns.period', 'Period')}</th>
          <th className="text-right">{t('reports.employees', 'Employees')}</th>
          <th className="text-right">{t('common.hours', 'Hours')}</th>
          <th className="text-right">{t('reports.columns.regularCost', 'Regular Cost')}</th>
          <th className="text-right">{t('reports.columns.overtimeCost', 'Overtime Cost')}</th>
          <th className="text-right">{t('reports.columns.totalCost', 'Total Cost')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {(data || []).map((row, i) => (
          <tr key={i}>
            <td className="font-medium">{row.period ? format(new Date(row.period), 'MMM d, yyyy') : '-'}</td>
            <td className="text-right">{row.employee_count}</td>
            <td className="text-right">{parseFloat(row.total_hours || 0).toFixed(1)}h</td>
            <td className="text-right">{parseFloat(row.regular_cost || 0).toFixed(2)}</td>
            <td className="text-right">{parseFloat(row.overtime_cost || 0).toFixed(2)}</td>
            <td className="text-right font-medium">{parseFloat(row.total_cost || 0).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CoverageTable({ data }) {
  const { t } = useTranslation();
  return (
    <table className="table">
      <thead>
        <tr>
          <th>{t('reports.columns.date', 'Date')}</th>
          <th>{t('reports.columns.location', 'Location')}</th>
          <th className="text-right">{t('reports.columns.totalShifts', 'Total Shifts')}</th>
          <th className="text-right">{t('reports.columns.filledShifts', 'Filled')}</th>
          <th className="text-right">{t('reports.columns.openShifts', 'Open')}</th>
          <th className="text-right">{t('reports.columns.fillRate', 'Fill Rate')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {(data || []).map((row, i) => (
          <tr key={i}>
            <td className="font-medium">{row.date ? format(new Date(row.date), 'EEE, MMM d') : '-'}</td>
            <td>{row.location_name || t('common.unknown', 'Unknown')}</td>
            <td className="text-right">{row.total_shifts}</td>
            <td className="text-right">{row.filled_shifts}</td>
            <td className="text-right">
              <span className={row.open_shifts > 0 ? 'text-orange-600' : ''}>
                {row.open_shifts}
              </span>
            </td>
            <td className="text-right">
              <span className={`font-medium ${
                row.fill_rate >= 90 ? 'text-green-600' :
                row.fill_rate >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {row.fill_rate || 0}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
