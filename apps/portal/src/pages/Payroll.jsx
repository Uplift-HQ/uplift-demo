// ============================================================
// GLOBAL PAYROLL DASHBOARD
// Multi-country payroll overview with calendar and run history
// Supports isPersonalView for My View data isolation
// ============================================================
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { employeesApi, DEMO_MODE } from '../lib/api';
import { useView } from '../lib/viewContext';
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

// Grand Metropolitan Hotel Group operates in 8 countries with 150 total employees
const COUNTRIES = [
  { code: 'all', name: 'All Countries', flag: null },
  { code: 'GB', name: 'United Kingdom', flag: 'GB' },
  { code: 'DE', name: 'Germany', flag: 'DE' },
  { code: 'PL', name: 'Poland', flag: 'PL' },
  { code: 'US', name: 'USA', flag: 'US' },
  { code: 'FR', name: 'France', flag: 'FR' },
  { code: 'AE', name: 'Dubai (UAE)', flag: 'AE' },
  { code: 'ES', name: 'Spain', flag: 'ES' },
  { code: 'IT', name: 'Italy', flag: 'IT' },
];

const COUNTRY_FLAGS = {
  GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}',
  PL: '\u{1F1F5}\u{1F1F1}',
  US: '\u{1F1FA}\u{1F1F8}',
  FR: '\u{1F1EB}\u{1F1F7}',
  AE: '\u{1F1E6}\u{1F1EA}',
  ES: '\u{1F1EA}\u{1F1F8}',
  IT: '\u{1F1EE}\u{1F1F9}',
};

// Grand Metropolitan employee breakdown by country (150 total)
const COUNTRY_BREAKDOWN = [
  {
    country: 'GB',
    name: 'United Kingdom',
    employees: 45,  // London Mayfair (45)
    monthlyGross: 180000,
    monthlyEmployerCost: 208800,
    currency: 'GBP',
    nextRunDate: '2026-03-28',
    status: 'completed',
  },
  {
    country: 'FR',
    name: 'France',
    employees: 25,  // Paris Champs-Élysées
    monthlyGross: 145000,
    monthlyEmployerCost: 174000,
    currency: 'EUR',
    nextRunDate: '2026-03-28',
    status: 'in_review',
  },
  {
    country: 'PL',
    name: 'Poland',
    employees: 30,  // Wrocław Plant
    monthlyGross: 120000,
    monthlyEmployerCost: 144000,
    currency: 'PLN',
    nextRunDate: '2026-03-28',
    status: 'completed',
  },
  {
    country: 'US',
    name: 'USA',
    employees: 25,  // Pittsburgh Office
    monthlyGross: 175000,
    monthlyEmployerCost: 192500,
    currency: 'USD',
    nextRunDate: '2026-03-28',
    status: 'draft',
  },
  {
    country: 'FR',
    name: 'France',
    employees: 20,  // Lyon Office
    monthlyGross: 65000,
    monthlyEmployerCost: 84500,
    currency: 'EUR',
    nextRunDate: '2026-03-28',
    status: 'completed',
  },
  {
    country: 'AE',
    name: 'Dubai (UAE)',
    employees: 15,  // Dubai Office
    monthlyGross: 95000,
    monthlyEmployerCost: 99750,
    currency: 'AED',
    nextRunDate: '2026-03-28',
    status: 'completed',
  },
  {
    country: 'ES',
    name: 'Spain',
    employees: 15,  // Madrid Office
    monthlyGross: 52500,
    monthlyEmployerCost: 68250,
    currency: 'EUR',
    nextRunDate: '2026-03-28',
    status: 'completed',
  },
  {
    country: 'IT',
    name: 'Italy',
    employees: 16,  // Milan Office
    monthlyGross: 56000,
    monthlyEmployerCost: 72800,
    currency: 'EUR',
    nextRunDate: '2026-03-28',
    status: 'in_review',
  },
];

// Exchange rates to GBP (approximate)
const EXCHANGE_RATES = {
  GBP: 1,
  EUR: 0.86,
  PLN: 0.20,
  USD: 0.79,
  AED: 0.22,
};

const PAYROLL_DEADLINES = [
  { id: 1, country: 'GB', type: 'pay_date', label: 'UK Pay Date', date: '2026-03-28', urgent: false },
  { id: 2, country: 'GB', type: 'tax_filing', label: 'PAYE RTI Submission', date: '2026-04-05', urgent: false },
  { id: 3, country: 'DE', type: 'social_insurance', label: 'SV-Meldung Deadline', date: '2026-03-15', urgent: true },
  { id: 4, country: 'DE', type: 'pay_date', label: 'Germany Pay Date', date: '2026-03-28', urgent: false },
  { id: 5, country: 'PL', type: 'tax_filing', label: 'ZUS Declaration', date: '2026-03-15', urgent: true },
  { id: 6, country: 'PL', type: 'pay_date', label: 'Poland Pay Date', date: '2026-03-28', urgent: false },
  { id: 7, country: 'US', type: 'tax_filing', label: 'Federal 941 Filing', date: '2026-04-01', urgent: false },
  { id: 8, country: 'US', type: 'pay_date', label: 'USA Pay Date', date: '2026-03-28', urgent: false },
  { id: 9, country: 'FR', type: 'social_insurance', label: 'DSN Submission', date: '2026-03-15', urgent: false },
  { id: 10, country: 'FR', type: 'pay_date', label: 'France Pay Date', date: '2026-03-28', urgent: false },
  { id: 11, country: 'AE', type: 'pay_date', label: 'Dubai Pay Date', date: '2026-03-28', urgent: false },
  { id: 12, country: 'AE', type: 'wps', label: 'WPS Submission', date: '2026-04-01', urgent: false },
  { id: 13, country: 'ES', type: 'pay_date', label: 'Spain Pay Date', date: '2026-03-28', urgent: false },
  { id: 14, country: 'IT', type: 'pay_date', label: 'Italy Pay Date', date: '2026-03-27', urgent: false },
];

const RECENT_PAYROLL_RUNS = [
  { id: 1, country: 'GB', period: 'Feb 2026', employees: 290, totalGross: 580000, status: 'completed', preparedBy: 'Sarah Mitchell', date: '2026-02-28' },
  { id: 2, country: 'DE', period: 'Feb 2026', employees: 40, totalGross: 145000, status: 'completed', preparedBy: 'Anna Schmidt', date: '2026-02-28' },
  { id: 3, country: 'PL', period: 'Feb 2026', employees: 30, totalGross: 120000, status: 'completed', preparedBy: 'Marta Kowalska', date: '2026-02-28' },
  { id: 4, country: 'US', period: 'Feb 2026', employees: 25, totalGross: 175000, status: 'completed', preparedBy: 'John Anderson', date: '2026-02-28' },
  { id: 5, country: 'FR', period: 'Feb 2026', employees: 20, totalGross: 65000, status: 'completed', preparedBy: 'Marie Dupont', date: '2026-02-28' },
  { id: 6, country: 'AE', period: 'Feb 2026', employees: 15, totalGross: 95000, status: 'completed', preparedBy: 'Ahmed Hassan', date: '2026-02-28' },
  { id: 7, country: 'ES', period: 'Feb 2026', employees: 15, totalGross: 52500, status: 'completed', preparedBy: 'Carlos Garcia', date: '2026-02-28' },
  { id: 8, country: 'IT', period: 'Feb 2026', employees: 16, totalGross: 56000, status: 'completed', preparedBy: 'Marco Rossi', date: '2026-02-27' },
  { id: 9, country: 'GB', period: 'Jan 2026', employees: 288, totalGross: 575000, status: 'completed', preparedBy: 'Sarah Mitchell', date: '2026-01-28' },
  { id: 10, country: 'DE', period: 'Jan 2026', employees: 40, totalGross: 142000, status: 'completed', preparedBy: 'Anna Schmidt', date: '2026-01-28' },
];

// ============================================================
// COMPONENT
// ============================================================

export default function Payroll() {
  const { t } = useTranslation();
  const { isPersonalView } = useView();

  // ============================================================
  // PERSONAL VIEW - Redirect to My Payslips
  // ============================================================
  if (isPersonalView && DEMO_MODE) {
    return <Navigate to="/my-payslips" replace />;
  }

  const [entityFilter, setEntityFilter] = useState('all');
  const [hasEmployees, setHasEmployees] = useState(null);
  const [loading, setLoading] = useState(true);

  // Run Payroll Modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [payrollRuns, setPayrollRuns] = useState(RECENT_PAYROLL_RUNS);
  const [runForm, setRunForm] = useState({
    country: 'GB',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processSuccess, setProcessSuccess] = useState(false);

  // Get employee count and gross for selected country
  const getCountryData = (countryCode) => {
    const data = COUNTRY_BREAKDOWN.find(c => c.country === countryCode);
    return data || { employees: 0, monthlyGross: 0, currency: 'GBP' };
  };

  const handleRunPayroll = () => {
    setIsProcessing(true);
    setProcessProgress(0);
    setProcessSuccess(false);

    // Simulate progress
    const interval = setInterval(() => {
      setProcessProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    // Complete after 2 seconds
    setTimeout(() => {
      clearInterval(interval);
      setProcessProgress(100);
      setIsProcessing(false);
      setProcessSuccess(true);

      // Add new run to list
      const countryData = getCountryData(runForm.country);
      const newRun = {
        id: payrollRuns.length + 100,
        country: runForm.country,
        period: 'Mar 2026',
        employees: countryData.employees,
        totalGross: countryData.monthlyGross,
        status: 'in_review',
        preparedBy: 'Current User',
        date: new Date().toISOString().split('T')[0],
      };
      setPayrollRuns(prev => [newRun, ...prev]);
    }, 2000);
  };

  const closeRunModal = () => {
    setShowRunModal(false);
    setIsProcessing(false);
    setProcessProgress(0);
    setProcessSuccess(false);
    setRunForm({ country: 'GB', startDate: '2026-03-01', endDate: '2026-03-31' });
  };

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
    ? payrollRuns
    : payrollRuns.filter(r => r.country === entityFilter);

  // Summary calculations
  const totalMonthlyCostGBP = COUNTRY_BREAKDOWN.reduce((sum, c) => {
    return sum + convertToGBP(c.monthlyEmployerCost, c.currency);
  }, 0);

  const totalEmployees = COUNTRY_BREAKDOWN.reduce((sum, c) => sum + c.employees, 0);

  const pendingApprovals = COUNTRY_BREAKDOWN.filter(c => c.status === 'in_review' || c.status === 'draft').length;

  // Sort deadlines by date and filter to next 30 days
  const today = new Date('2026-03-05'); // Demo date
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
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setShowRunModal(true)}
            style={{ backgroundColor: '#F26522', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <PoundSterling style={{ width: '16px', height: '16px' }} />
            {t('payroll.runPayroll', 'Run Payroll')}
          </button>
        </div>
      </div>

      {/* Run Payroll Modal */}
      {showRunModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '480px', margin: '16px' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                  {t('payroll.runPayrollTitle', 'Run Payroll')}
                </h3>
                <button onClick={closeRunModal} style={{ padding: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                  <span style={{ fontSize: '20px' }}>×</span>
                </button>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {processSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle style={{ width: '32px', height: '32px', color: '#16a34a' }} />
                  </div>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                    {t('payroll.payrollProcessed', 'Payroll Processed!')}
                  </h4>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>
                    {t('payroll.processedFor', 'Processed for {{count}} employees', { count: getCountryData(runForm.country).employees })}
                  </p>
                  <button
                    onClick={closeRunModal}
                    style={{ backgroundColor: '#F26522', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    {t('common.done', 'Done')}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Country Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      {t('payroll.country', 'Country')}
                    </label>
                    <select
                      value={runForm.country}
                      onChange={(e) => setRunForm(prev => ({ ...prev, country: e.target.value }))}
                      disabled={isProcessing}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    >
                      {COUNTRIES.filter(c => c.code !== 'all').map(c => (
                        <option key={c.code} value={c.code}>{COUNTRY_FLAGS[c.code]} {c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pay Period */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                        {t('payroll.startDate', 'Start Date')}
                      </label>
                      <input
                        type="date"
                        value={runForm.startDate}
                        onChange={(e) => setRunForm(prev => ({ ...prev, startDate: e.target.value }))}
                        disabled={isProcessing}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                        {t('payroll.endDate', 'End Date')}
                      </label>
                      <input
                        type="date"
                        value={runForm.endDate}
                        onChange={(e) => setRunForm(prev => ({ ...prev, endDate: e.target.value }))}
                        disabled={isProcessing}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: '#64748b', fontSize: '14px' }}>{t('payroll.employeeCount', 'Employee Count')}</span>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>{getCountryData(runForm.country).employees}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b', fontSize: '14px' }}>{t('payroll.grossEstimate', 'Gross Estimate')}</span>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>
                        {formatCurrency(getCountryData(runForm.country).monthlyGross, getCountryData(runForm.country).currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {isProcessing && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>{t('payroll.processing', 'Processing...')}</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{processProgress}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: '#F26522', borderRadius: '4px', transition: 'width 0.1s', width: `${processProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      onClick={closeRunModal}
                      disabled={isProcessing}
                      style={{ padding: '10px 20px', color: '#64748b', borderRadius: '8px', fontWeight: '500', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1 }}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={handleRunPayroll}
                      disabled={isProcessing}
                      style={{ backgroundColor: '#F26522', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: '500', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.7 : 1 }}
                    >
                      {isProcessing ? t('payroll.processing', 'Processing...') : t('payroll.processPayroll', 'Process Payroll')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          <p className="text-2xl font-bold text-green-700 mt-1">31 Mar 2026</p>
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
