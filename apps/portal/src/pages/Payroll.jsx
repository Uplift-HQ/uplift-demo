// ============================================================
// GLOBAL PAYROLL DASHBOARD
// Multi-country payroll overview with calendar and run history
// ============================================================
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { employeesApi } from '../lib/api';
import EmptyState from '../components/EmptyState';
import {
  Globe,
  PoundSterling,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  ChevronDown,
  Eye,
  Download,
  Building2,
  Settings,
  UserPlus,
} from 'lucide-react';

// ============================================================
// DEMO DATA
// ============================================================

const COUNTRIES = [
  { code: 'all', name: 'All Countries', flag: null },
  { code: 'GB', name: 'United Kingdom', flag: 'GB' },
  { code: 'DE', name: 'Germany', flag: 'DE' },
  { code: 'PL', name: 'Poland', flag: 'PL' },
  { code: 'US', name: 'USA', flag: 'US' },
  { code: 'CN', name: 'China', flag: 'CN' },
  { code: 'AE', name: 'Dubai (UAE)', flag: 'AE' },
];

const COUNTRY_FLAGS = {
  GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}',
  PL: '\u{1F1F5}\u{1F1F1}',
  US: '\u{1F1FA}\u{1F1F8}',
  CN: '\u{1F1E8}\u{1F1F3}',
  AE: '\u{1F1E6}\u{1F1EA}',
};

const COUNTRY_BREAKDOWN = [
  {
    country: 'GB',
    name: 'United Kingdom',
    employees: 245,
    monthlyGross: 412500,
    monthlyEmployerCost: 478650,
    currency: 'GBP',
    nextRunDate: '2025-02-28',
    status: 'completed',
  },
  {
    country: 'DE',
    name: 'Germany',
    employees: 189,
    monthlyGross: 485000,
    monthlyEmployerCost: 582000,
    currency: 'EUR',
    nextRunDate: '2025-02-28',
    status: 'in_review',
  },
  {
    country: 'PL',
    name: 'Poland',
    employees: 156,
    monthlyGross: 312000,
    monthlyEmployerCost: 374400,
    currency: 'PLN',
    nextRunDate: '2025-02-28',
    status: 'completed',
  },
  {
    country: 'US',
    name: 'USA',
    employees: 178,
    monthlyGross: 892000,
    monthlyEmployerCost: 980200,
    currency: 'USD',
    nextRunDate: '2025-02-28',
    status: 'draft',
  },
  {
    country: 'CN',
    name: 'China',
    employees: 92,
    monthlyGross: 245000,
    monthlyEmployerCost: 294000,
    currency: 'CNY',
    nextRunDate: '2025-02-28',
    status: 'completed',
  },
  {
    country: 'AE',
    name: 'Dubai (UAE)',
    employees: 32,
    monthlyGross: 186000,
    monthlyEmployerCost: 195300,
    currency: 'AED',
    nextRunDate: '2025-02-28',
    status: 'in_review',
  },
];

// Exchange rates to GBP (approximate)
const EXCHANGE_RATES = {
  GBP: 1,
  EUR: 0.86,
  PLN: 0.20,
  USD: 0.79,
  CNY: 0.11,
  AED: 0.22,
};

const PAYROLL_DEADLINES = [
  { id: 1, country: 'GB', type: 'pay_date', label: 'UK Pay Date', date: '2025-02-28', urgent: false },
  { id: 2, country: 'GB', type: 'tax_filing', label: 'PAYE RTI Submission', date: '2025-03-05', urgent: false },
  { id: 3, country: 'DE', type: 'social_insurance', label: 'SV-Meldung Deadline', date: '2025-02-15', urgent: true },
  { id: 4, country: 'DE', type: 'pay_date', label: 'Germany Pay Date', date: '2025-02-28', urgent: false },
  { id: 5, country: 'PL', type: 'tax_filing', label: 'ZUS Declaration', date: '2025-02-15', urgent: true },
  { id: 6, country: 'PL', type: 'pay_date', label: 'Poland Pay Date', date: '2025-02-28', urgent: false },
  { id: 7, country: 'US', type: 'tax_filing', label: 'Federal 941 Filing', date: '2025-03-01', urgent: false },
  { id: 8, country: 'US', type: 'pay_date', label: 'USA Pay Date', date: '2025-02-28', urgent: false },
  { id: 9, country: 'CN', type: 'social_insurance', label: 'Social Insurance Filing', date: '2025-02-20', urgent: false },
  { id: 10, country: 'CN', type: 'pay_date', label: 'China Pay Date', date: '2025-02-28', urgent: false },
  { id: 11, country: 'AE', type: 'pay_date', label: 'Dubai Pay Date', date: '2025-02-28', urgent: false },
  { id: 12, country: 'AE', type: 'wps', label: 'WPS Submission', date: '2025-03-01', urgent: false },
];

const RECENT_PAYROLL_RUNS = [
  { id: 1, country: 'GB', period: 'Jan 2025', employees: 245, totalGross: 412500, status: 'completed', preparedBy: 'Sarah Mitchell', date: '2025-01-28' },
  { id: 2, country: 'DE', period: 'Jan 2025', employees: 189, totalGross: 485000, status: 'completed', preparedBy: 'Anna Schmidt', date: '2025-01-28' },
  { id: 3, country: 'PL', period: 'Jan 2025', employees: 156, totalGross: 312000, status: 'completed', preparedBy: 'Marta Kowalska', date: '2025-01-28' },
  { id: 4, country: 'US', period: 'Jan 2025', employees: 178, totalGross: 892000, status: 'completed', preparedBy: 'John Anderson', date: '2025-01-28' },
  { id: 5, country: 'CN', period: 'Jan 2025', employees: 92, totalGross: 245000, status: 'completed', preparedBy: 'Wei Chen', date: '2025-01-28' },
  { id: 6, country: 'AE', period: 'Jan 2025', employees: 32, totalGross: 186000, status: 'completed', preparedBy: 'Ahmed Hassan', date: '2025-01-28' },
  { id: 7, country: 'GB', period: 'Dec 2024', employees: 242, totalGross: 408000, status: 'completed', preparedBy: 'Sarah Mitchell', date: '2024-12-24' },
  { id: 8, country: 'DE', period: 'Dec 2024', employees: 186, totalGross: 478000, status: 'completed', preparedBy: 'Anna Schmidt', date: '2024-12-24' },
  { id: 9, country: 'PL', period: 'Dec 2024', employees: 152, totalGross: 305000, status: 'completed', preparedBy: 'Marta Kowalska', date: '2024-12-24' },
  { id: 10, country: 'US', period: 'Dec 2024', employees: 175, totalGross: 885000, status: 'completed', preparedBy: 'John Anderson', date: '2024-12-24' },
];

// ============================================================
// COMPONENT
// ============================================================

export default function Payroll() {
  const { t } = useTranslation();
  const [entityFilter, setEntityFilter] = useState('all');
  const [hasEmployees, setHasEmployees] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if org has employees for payroll
  useEffect(() => {
    const checkEmployees = async () => {
      try {
        const result = await employeesApi.list({ limit: 1 });
        setHasEmployees((result.employees || []).length > 0);
      } catch (err) {
        // If API fails, assume we're in demo mode or no employees
        setHasEmployees(false);
      } finally {
        setLoading(false);
      }
    };
    checkEmployees();
  }, []);

  // ---- Helpers ----

  const formatCurrency = (amount, currency = 'GBP') => {
    const locales = {
      GBP: 'en-GB',
      EUR: 'de-DE',
      PLN: 'pl-PL',
      USD: 'en-US',
      CNY: 'zh-CN',
      AED: 'ar-AE',
    };
    return new Intl.NumberFormat(locales[currency] || 'en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const convertToGBP = (amount, currency) => {
    return Math.round(amount * (EXCHANGE_RATES[currency] || 1));
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      in_review: 'bg-amber-100 text-amber-800',
      draft: 'bg-slate-100 text-slate-600',
    };
    const labels = {
      completed: t('payroll.status.completed', 'Completed'),
      in_review: t('payroll.status.inReview', 'In Review'),
      draft: t('payroll.status.draft', 'Draft'),
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDeadlineTypeBadge = (type) => {
    const styles = {
      pay_date: 'bg-blue-100 text-blue-800',
      tax_filing: 'bg-purple-100 text-purple-800',
      social_insurance: 'bg-cyan-100 text-cyan-800',
      wps: 'bg-emerald-100 text-emerald-800',
    };
    const labels = {
      pay_date: t('payroll.deadlineType.payDate', 'Pay Date'),
      tax_filing: t('payroll.deadlineType.taxFiling', 'Tax Filing'),
      social_insurance: t('payroll.deadlineType.socialInsurance', 'Social Insurance'),
      wps: t('payroll.deadlineType.wps', 'WPS'),
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[type] || 'bg-slate-100 text-slate-600'}`}>
        {labels[type] || type}
      </span>
    );
  };

  // ---- Computed Values ----

  const filteredBreakdown = entityFilter === 'all'
    ? COUNTRY_BREAKDOWN
    : COUNTRY_BREAKDOWN.filter(c => c.country === entityFilter);

  const filteredDeadlines = entityFilter === 'all'
    ? PAYROLL_DEADLINES
    : PAYROLL_DEADLINES.filter(d => d.country === entityFilter);

  const filteredRuns = entityFilter === 'all'
    ? RECENT_PAYROLL_RUNS
    : RECENT_PAYROLL_RUNS.filter(r => r.country === entityFilter);

  // Summary calculations
  const totalMonthlyCostGBP = COUNTRY_BREAKDOWN.reduce((sum, c) => {
    return sum + convertToGBP(c.monthlyEmployerCost, c.currency);
  }, 0);

  const totalEmployees = COUNTRY_BREAKDOWN.reduce((sum, c) => sum + c.employees, 0);

  const pendingApprovals = COUNTRY_BREAKDOWN.filter(c => c.status === 'in_review' || c.status === 'draft').length;

  // Sort deadlines by date and filter to next 30 days
  const today = new Date('2025-02-05'); // Demo date
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingDeadlines = filteredDeadlines
    .filter(d => {
      const deadlineDate = new Date(d.date);
      return deadlineDate >= today && deadlineDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Empty state for organizations with no employees
  if (!hasEmployees) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('payroll.title', 'Global Payroll')}</h1>
          <p className="text-slate-600">{t('payroll.subtitle', 'Multi-country payroll overview and management')}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <EmptyState
            icon={PoundSterling}
            title={t('payroll.noPayrollYet', 'No payroll runs yet')}
            description={t('payroll.noPayrollDescription', 'Before you can run payroll, you need to add employees to your organisation. Once you have employees set up with compensation details, you can run your first payroll.')}
            action={
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/onboarding"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                  {t('payroll.addEmployeesFirst', 'Add Employees First')}
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  {t('payroll.setupPayroll', 'Set Up Payroll')}
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Entity Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('payroll.title', 'Global Payroll')}</h1>
          <p className="text-slate-600">{t('payroll.subtitle', 'Multi-country payroll overview and management')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-slate-400" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 bg-white"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag ? `${COUNTRY_FLAGS[country.flag]} ` : ''}{t('countries.' + country.country, country.name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow border border-slate-200">
          <div className="flex items-center gap-2 text-slate-600">
            <PoundSterling className="h-5 w-5" />
            <span className="text-sm">{t('payroll.totalMonthlyCost', 'Total Monthly Cost')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalMonthlyCostGBP, 'GBP')}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('payroll.convertedToGBP', 'All countries, converted to GBP')}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow border border-slate-200">
          <div className="flex items-center gap-2 text-blue-600">
            <Users className="h-5 w-5" />
            <span className="text-sm">{t('payroll.employeesOnPayroll', 'Employees on Payroll')}</span>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-1">{totalEmployees.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('payroll.acrossAllEntities', 'Across all entities')}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow border border-slate-200">
          <div className="flex items-center gap-2 text-green-600">
            <Calendar className="h-5 w-5" />
            <span className="text-sm">{t('payroll.nextPayDate', 'Next Pay Date')}</span>
          </div>
          <p className="text-2xl font-bold text-green-700 mt-1">28 Feb 2025</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('payroll.standardPayDate', 'Standard monthly pay date')}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow border border-slate-200">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{t('payroll.outstandingActions', 'Outstanding Actions')}</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingApprovals}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('payroll.pendingApprovals', 'Pending approvals')}</p>
        </div>
      </div>

      {/* Country Breakdown Table */}
      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-500" />
            {t('payroll.countryBreakdown', 'Country Breakdown')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.country', 'Country')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.employees', 'Employees')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.monthlyGross', 'Monthly Gross')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.employerCost', 'Employer Cost')}</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.currency', 'Currency')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.nextRunDate', 'Next Run Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredBreakdown.map((row) => (
                <tr key={row.country} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{COUNTRY_FLAGS[row.country]}</span>
                      <span className="text-sm font-medium text-slate-900">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 text-right font-medium">{row.employees.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 text-right font-medium">{formatCurrency(row.monthlyGross, row.currency)}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 text-right font-semibold">{formatCurrency(row.monthlyEmployerCost, row.currency)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{row.currency}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(row.nextRunDate)}</td>
                  <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBreakdown.length === 0 && (
          <div className="text-center py-12">
            <Globe className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('payroll.noCountryData', 'No country data available')}</p>
          </div>
        )}
      </div>

      {/* Payroll Calendar Section */}
      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-500" />
            {t('payroll.payrollCalendar', 'Payroll Calendar')}
            <span className="text-sm font-normal text-slate-500">({t('payroll.next30Days', 'Next 30 days')})</span>
          </h2>
        </div>
        <div className="p-4">
          {upcomingDeadlines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingDeadlines.map((deadline) => {
                const deadlineDate = new Date(deadline.date);
                const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                const isUrgent = daysUntil <= 7;

                return (
                  <div
                    key={deadline.id}
                    className={`p-3 rounded-lg border ${
                      deadline.urgent || isUrgent
                        ? 'border-red-200 bg-red-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{COUNTRY_FLAGS[deadline.country]}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{deadline.labelKey ? t(deadline.labelKey, deadline.label) : deadline.label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getDeadlineTypeBadge(deadline.type)}
                          </div>
                        </div>
                      </div>
                      {(deadline.urgent || isUrgent) && (
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-slate-600">{formatDate(deadline.date)}</span>
                      <span className={`text-xs font-medium ${
                        isUrgent ? 'text-red-600' : 'text-slate-500'
                      }`}>
                        {daysUntil === 0
                          ? t('payroll.dueToday', 'Due today')
                          : daysUntil === 1
                          ? t('payroll.dueTomorrow', 'Due tomorrow')
                          : t('payroll.daysUntil', '{{days}} days', { days: daysUntil })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
              <p className="text-slate-500">{t('payroll.noUpcomingDeadlines', 'No upcoming deadlines in the next 30 days')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Payroll Runs Table */}
      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-500" />
            {t('payroll.recentPayrollRuns', 'Recent Payroll Runs')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.country', 'Country')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.period', 'Period')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.employees', 'Employees')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.totalGross', 'Total Gross')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.status', 'Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.preparedBy', 'Prepared By')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.date', 'Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('payroll.columns.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredRuns.map((run) => {
                const countryData = COUNTRY_BREAKDOWN.find(c => c.country === run.country);
                const currency = countryData?.currency || 'GBP';

                return (
                  <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{COUNTRY_FLAGS[run.country]}</span>
                        <span className="text-sm font-medium text-slate-700">{countryData?.name || run.country}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{run.period}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 text-right">{run.employees.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 text-right font-medium">{formatCurrency(run.totalGross, currency)}</td>
                    <td className="px-6 py-4">{getStatusBadge(run.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{run.preparedBy}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(run.date)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 text-slate-400 hover:text-momentum-600 rounded hover:bg-slate-100"
                          title={t('payroll.viewDetails', 'View Details')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 text-slate-400 hover:text-momentum-600 rounded hover:bg-slate-100"
                          title={t('payroll.download', 'Download')}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredRuns.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('payroll.noPayrollRuns', 'No payroll runs found')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
