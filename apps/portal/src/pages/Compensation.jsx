// ============================================================
// COMPENSATION PAGE
// Payslips, compensation records, and salary review cycles
// ============================================================
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  PoundSterling,
  Receipt,
  TrendingUp,
  Calendar,
  Download,
  Upload,
  Eye,
  X,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Users,
  ChevronRight,
  BarChart3,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  Award,
  MapPin,
} from 'lucide-react';
import api from '../lib/api';

// ---- Demo Data ----

const EMPLOYEES_DATA = [
  { id: 1, name: 'Sarah Mitchell', role: 'Senior Software Engineer', department: 'Engineering', salary: 72000, frequency: 'Annual', lastReview: '2025-09-15', nextReview: '2026-09-15' },
  { id: 2, name: 'James Chen', role: 'Product Manager', department: 'Product', salary: 68000, frequency: 'Annual', lastReview: '2025-10-01', nextReview: '2026-10-01' },
  { id: 3, name: 'Emily Watson', role: 'UX Designer', department: 'Design', salary: 55000, frequency: 'Annual', lastReview: '2025-08-20', nextReview: '2026-08-20' },
  { id: 4, name: 'Raj Patel', role: 'Operations Manager', department: 'Operations', salary: 62000, frequency: 'Annual', lastReview: '2025-11-10', nextReview: '2026-11-10' },
  { id: 5, name: 'Olivia Thompson', role: 'HR Coordinator', department: 'HR', salary: 38000, frequency: 'Annual', lastReview: '2025-07-05', nextReview: '2026-07-05' },
  { id: 6, name: 'Michael O\'Brien', role: 'Head of Engineering', department: 'Engineering', salary: 85000, frequency: 'Annual', lastReview: '2025-06-15', nextReview: '2026-06-15' },
  { id: 7, name: 'Fatima Al-Rashid', role: 'Marketing Executive', department: 'Marketing', salary: 42000, frequency: 'Annual', lastReview: '2025-12-01', nextReview: '2026-12-01' },
  { id: 8, name: 'David Kim', role: 'Junior Developer', department: 'Engineering', salary: 32000, frequency: 'Annual', lastReview: '2025-09-30', nextReview: '2026-09-30' },
  { id: 9, name: 'Lucy Harper', role: 'Finance Analyst', department: 'Finance', salary: 48000, frequency: 'Annual', lastReview: '2025-10-20', nextReview: '2026-10-20' },
  { id: 10, name: 'Tom Bradley', role: 'Customer Support Lead', department: 'Support', salary: 35000, frequency: 'Annual', lastReview: '2025-08-01', nextReview: '2026-08-01' },
];

const buildPayslip = (emp, month, year) => {
  const monthlyGross = Math.round(emp.salary / 12);
  const overtime = emp.salary > 60000 ? 0 : Math.round(Math.random() * 300);
  const holidayPay = 0;
  const bonus = month === 1 && emp.salary > 50000 ? Math.round(emp.salary * 0.05) : 0;
  const totalGross = monthlyGross + overtime + holidayPay + bonus;
  const incomeTax = Math.round(totalGross * 0.20);
  const nationalInsurance = Math.round(totalGross * 0.12);
  const pension = Math.round(totalGross * 0.05);
  const studentLoan = emp.salary > 40000 ? Math.round((totalGross - 2274) * 0.09) : 0;
  const totalDeductions = incomeTax + nationalInsurance + pension + studentLoan;
  const netPay = totalGross - totalDeductions;
  const monthStr = String(month).padStart(2, '0');
  return {
    employeeId: emp.id,
    employee: emp.name,
    payPeriod: `${monthStr}/${year}`,
    paymentDate: `${year}-${monthStr}-28`,
    gross: totalGross,
    net: netPay,
    status: month === 2 ? 'pending' : 'processed',
    breakdown: {
      earnings: { basicSalary: monthlyGross, overtime, holidayPay, bonus },
      deductions: { incomeTax, nationalInsurance, pension, studentLoan },
      totalGross,
      totalDeductions,
      netPay,
    },
  };
};

const DEMO_PAYSLIPS = [];
let payslipId = 1;
for (const emp of EMPLOYEES_DATA) {
  DEMO_PAYSLIPS.push({ id: payslipId++, ...buildPayslip(emp, 1, 2026) });
  DEMO_PAYSLIPS.push({ id: payslipId++, ...buildPayslip(emp, 2, 2026) });
}

const COMPENSATION_HISTORY = {
  1: [
    { date: '2025-09-15', salary: 72000, change: '+5.9%', reason: 'Annual Review' },
    { date: '2024-09-15', salary: 68000, change: '+6.3%', reason: 'Promotion' },
    { date: '2023-04-01', salary: 64000, change: null, reason: 'Starting Salary' },
  ],
  2: [
    { date: '2025-10-01', salary: 68000, change: '+4.6%', reason: 'Annual Review' },
    { date: '2024-10-01', salary: 65000, change: null, reason: 'Starting Salary' },
  ],
  6: [
    { date: '2025-06-15', salary: 85000, change: '+6.3%', reason: 'Promotion to Head' },
    { date: '2024-06-15', salary: 80000, change: '+5.3%', reason: 'Annual Review' },
    { date: '2023-06-15', salary: 76000, change: null, reason: 'Starting Salary' },
  ],
};

const DEMO_CYCLES = [
  {
    id: 1,
    name: 'Annual Salary Review 2026',
    status: 'active',
    budget: 120000,
    allocated: 87500,
    effectiveDate: '2026-04-01',
    participants: 10,
    description: 'Company-wide annual salary review for FY2026',
  },
  {
    id: 2,
    name: 'Q2 Bonus Allocation',
    status: 'draft',
    budget: 45000,
    allocated: 0,
    effectiveDate: '2026-07-01',
    participants: 8,
    description: 'Performance-based bonus allocation for Q2 2026',
  },
];

// ---- Component ----

export default function Compensation() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [activeTab, setActiveTab] = useState('payslips');
  const [toast, setToast] = useState(null);

  // Payslips state
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Compensation Records state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ employeeId: '', newSalary: '', reason: '', effectiveDate: '' });

  // Cycles state
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleForm, setCycleForm] = useState({ name: '', budget: '', effectiveDate: '', description: '' });

  // Bonus state
  const [bonusData, setBonusData] = useState(null);
  const [bonusLoading, setBonusLoading] = useState(false);

  // Fetch my bonus data
  useEffect(() => {
    const fetchBonusData = async () => {
      if (activeTab !== 'bonus') return;
      setBonusLoading(true);
      try {
        const response = await api.get('/payroll/my-bonus');
        setBonusData(response.data);
      } catch (error) {
        console.error('Failed to fetch bonus data:', error);
        // Set demo data as fallback
        setBonusData({
          employee: {
            bonus_amount: 5000,
            location_name: 'London Office'
          },
          payouts: [
            { id: 1, period: '2025-Q4', score_percentage: 92.5, payout_amount: 4625, status: 'paid', paid_at: '2026-01-28' },
            { id: 2, period: '2025-Q3', score_percentage: 88.0, payout_amount: 4400, status: 'paid', paid_at: '2025-10-28' },
          ],
          pendingPayouts: [],
          totalPaid: 9025,
          totalPending: 0
        });
      } finally {
        setBonusLoading(false);
      }
    };
    fetchBonusData();
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const allTabs = [
    { key: 'payslips', label: t(isManager ? 'compensation.payslips' : 'compensation.myPayslips', isManager ? 'Payslips' : 'My Payslips'), icon: Receipt },
    { key: 'bonus', label: t('compensation.myBonus', 'My Bonus'), icon: Award },
    { key: 'records', label: t('compensation.compensationRecords', 'Compensation Records'), icon: TrendingUp, managerOnly: true },
    { key: 'cycles', label: t('compensation.compensationCycles', 'Compensation Cycles'), icon: Calendar, managerOnly: true },
  ];
  const tabs = isManager ? allTabs : allTabs.filter(tab => !tab.managerOnly);

  // ---- Helpers ----

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const formatCurrencyFull = (amount) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  // Filtered payslips
  const filteredPayslips = DEMO_PAYSLIPS.filter((ps) => {
    if (employeeFilter !== 'all' && ps.employeeId !== Number(employeeFilter)) return false;
    if (periodFilter !== 'all' && ps.payPeriod !== periodFilter) return false;
    return true;
  });

  // Payslip stats
  const totalGrossPay = DEMO_PAYSLIPS.filter((p) => p.status === 'processed').reduce((s, p) => s + p.gross, 0);
  const totalNetPay = DEMO_PAYSLIPS.filter((p) => p.status === 'processed').reduce((s, p) => s + p.net, 0);
  const pendingCount = DEMO_PAYSLIPS.filter((p) => p.status === 'pending').length;

  // Handlers
  const handleUploadPayslip = (e) => {
    e.preventDefault();
    setShowUploadModal(false);
    showToast(t('compensation.payslipUploaded', 'Payslip uploaded successfully'));
  };

  const handleUpdateCompensation = (e) => {
    e.preventDefault();
    setShowUpdateModal(false);
    setUpdateForm({ employeeId: '', newSalary: '', reason: '', effectiveDate: '' });
    showToast(t('compensation.compensationUpdated', 'Compensation updated successfully'));
  };

  const handleCreateCycle = (e) => {
    e.preventDefault();
    setShowCycleModal(false);
    setCycleForm({ name: '', budget: '', effectiveDate: '', description: '' });
    showToast(t('compensation.cycleCreated', 'Compensation cycle created successfully'));
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
          <h1 className="text-2xl font-bold text-slate-900">{t('compensation.title', 'Compensation')}</h1>
          <p className="text-slate-600">{t('compensation.subtitle', 'Manage payslips, salary records, and compensation cycles')}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-slate-600">
            <PoundSterling className="h-5 w-5" />
            <span className="text-sm">{t('compensation.totalGrossPay', 'Total Gross Pay')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalGrossPay)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('compensation.processedPayslips', 'Processed payslips')}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm">{t('compensation.totalNetPay', 'Total Net Pay')}</span>
          </div>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalNetPay)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('compensation.afterDeductions', 'After deductions')}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            <span className="text-sm">{t('compensation.pendingPayslips', 'Pending Payslips')}</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('compensation.awaitingProcessing', 'Awaiting processing')}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="h-5 w-5" />
            <span className="text-sm">{t('compensation.employees', 'Employees')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{EMPLOYEES_DATA.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('compensation.onPayroll', 'On payroll')}</p>
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

      {/* ============ TAB 1: Payslips ============ */}
      {activeTab === 'payslips' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('compensation.filterEmployee', 'Employee')}</label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
              >
                <option value="all">{t('compensation.allEmployees', 'All Employees')}</option>
                {EMPLOYEES_DATA.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('compensation.filterPeriod', 'Pay Period')}</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
              >
                <option value="all">{t('compensation.allPeriods', 'All Periods')}</option>
                <option value="01/2026">{t('compensation.jan2026', 'January 2026')}</option>
                <option value="02/2026">{t('compensation.feb2026', 'February 2026')}</option>
              </select>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-momentum-500 text-white px-4 py-2 rounded-lg hover:bg-momentum-600 text-sm font-medium"
              >
                <Upload className="h-4 w-4" />
                {t('compensation.uploadPayslip', 'Upload Payslip')}
              </button>
            </div>
          </div>

          {/* Payslips Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.employee', 'Employee')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.payPeriod', 'Pay Period')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.paymentDate', 'Payment Date')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.grossPay', 'Gross Pay')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.netPay', 'Net Pay')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.status', 'Status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredPayslips.map((ps) => (
                    <tr
                      key={ps.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedPayslip(ps)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{ps.employee}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{ps.payPeriod}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ps.paymentDate}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 text-right font-medium">{formatCurrencyFull(ps.gross)}</td>
                      <td className="px-6 py-4 text-sm text-green-700 text-right font-medium">{formatCurrencyFull(ps.net)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          ps.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ps.status === 'processed'
                            ? t('compensation.processed', 'Processed')
                            : t('compensation.pending', 'Pending')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPayslip(ps); }}
                          className="p-1.5 text-slate-400 hover:text-momentum-600 rounded"
                          title={t('compensation.viewPayslip', 'View Payslip')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPayslips.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-700 font-medium mb-2">
                  {DEMO_PAYSLIPS.length === 0
                    ? t('compensation.noPayslipsYet', 'No payslips yet')
                    : t('compensation.noMatchingPayslips', 'No payslips found')
                  }
                </p>
                <p className="text-slate-500 text-sm">
                  {DEMO_PAYSLIPS.length === 0
                    ? t('compensation.payslipsWillAppear', 'Payslips will appear here once payroll has been processed.')
                    : t('compensation.tryDifferentFilters', 'Try adjusting your filters.')
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB: My Bonus ============ */}
      {activeTab === 'bonus' && (
        <div className="space-y-6">
          {bonusLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
            </div>
          ) : bonusData ? (
            <>
              {/* Bonus Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-6 shadow border">
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <Award className="h-5 w-5 text-momentum-500" />
                    <span className="text-sm">{t('compensation.eligibleBonus', 'Eligible Bonus')}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(bonusData.employee?.bonus_amount || 0)}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('compensation.annualBonusAmount', 'Annual bonus amount')}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow border">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">{t('compensation.totalPaid', 'Total Paid')}</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(bonusData.totalPaid || 0)}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('compensation.bonusesPaidOut', 'Bonuses paid out')}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow border">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Clock className="h-5 w-5" />
                    <span className="text-sm">{t('compensation.pendingBonus', 'Pending')}</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(bonusData.totalPending || 0)}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('compensation.awaitingApproval', 'Awaiting approval')}</p>
                </div>
              </div>

              {/* Location Info */}
              {bonusData.employee?.location_name && (
                <div className="bg-momentum-50 border border-momentum-200 rounded-lg p-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-momentum-600" />
                  <div>
                    <p className="text-sm font-medium text-momentum-700">{t('compensation.yourLocation', 'Your Location')}</p>
                    <p className="text-momentum-600">{bonusData.employee.location_name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-momentum-500">{t('compensation.bonusFormula', 'Performance Bonus Formula')}</p>
                    <p className="text-sm text-momentum-700 font-medium">{t('compensation.bonusTimesScore', 'Bonus × Location Score %')}</p>
                  </div>
                </div>
              )}

              {/* Bonus History */}
              <div className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">{t('compensation.bonusHistory', 'Bonus History')}</h3>
                </div>
                {bonusData.payouts && bonusData.payouts.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {bonusData.payouts.map((payout) => (
                      <div key={payout.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-900">{payout.period}</p>
                          <p className="text-sm text-slate-500">
                            {t('compensation.siteScore', 'Site Score')}: {payout.score_percentage}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-700">{formatCurrency(payout.payout_amount)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                            payout.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {payout.status === 'paid' ? t('compensation.paid', 'Paid') :
                             payout.status === 'approved' ? t('compensation.approved', 'Approved') :
                             t('compensation.pending', 'Pending')}
                          </span>
                          {payout.paid_at && (
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(payout.paid_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <Award className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p>{t('compensation.noBonusHistory', 'No bonus history yet')}</p>
                    <p className="text-sm text-slate-400 mt-1">{t('compensation.bonusWillAppear', 'Your performance bonuses will appear here once calculated.')}</p>
                  </div>
                )}
              </div>

              {/* Pending Payouts */}
              {bonusData.pendingPayouts && bonusData.pendingPayouts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="p-4 border-b border-amber-200">
                    <h3 className="font-semibold text-amber-800">{t('compensation.pendingPayouts', 'Pending Payouts')}</h3>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {bonusData.pendingPayouts.map((payout) => (
                      <div key={payout.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-amber-900">{payout.period}</p>
                          <p className="text-sm text-amber-700">
                            {t('compensation.siteScore', 'Site Score')}: {payout.score_percentage}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-800">{formatCurrency(payout.payout_amount)}</p>
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                            {t('compensation.awaitingPayment', 'Awaiting Payment')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow border p-8 text-center">
              <Award className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600">{t('compensation.noBonusConfigured', 'No performance bonus configured')}</p>
              <p className="text-sm text-slate-400 mt-1">{t('compensation.contactHr', 'Contact HR for more information about bonus eligibility.')}</p>
            </div>
          )}
        </div>
      )}

      {/* ============ TAB 2: Compensation Records ============ */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowUpdateModal(true)}
              className="flex items-center gap-2 bg-momentum-500 text-white px-4 py-2 rounded-lg hover:bg-momentum-600 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              {t('compensation.updateCompensation', 'Update Compensation')}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.employee', 'Employee')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.role', 'Role')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.department', 'Department')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.currentSalary', 'Current Salary')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.frequency', 'Frequency')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.lastReview', 'Last Review')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.nextReview', 'Next Review')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {EMPLOYEES_DATA.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedRecord(emp)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{emp.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{emp.role}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{emp.department}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 text-right font-semibold">{formatCurrency(emp.salary)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{emp.frequency}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{emp.lastReview}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{emp.nextReview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB 3: Compensation Cycles ============ */}
      {activeTab === 'cycles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCycleModal(true)}
              className="flex items-center gap-2 bg-momentum-500 text-white px-4 py-2 rounded-lg hover:bg-momentum-600 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              {t('compensation.createCycle', 'Create Cycle')}
            </button>
          </div>

          {/* Cycles Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.cycleName', 'Cycle Name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.status', 'Status')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.budget', 'Budget')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.effectiveDate', 'Effective Date')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('compensation.columns.participants', 'Participants')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {DEMO_CYCLES.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{cycle.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{cycle.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          cycle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {cycle.status === 'active'
                            ? t('compensation.active', 'Active')
                            : t('compensation.draft', 'Draft')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 text-right font-medium">{formatCurrency(cycle.budget)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cycle.effectiveDate}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-right">{cycle.participants}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Budget vs Allocated Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {DEMO_CYCLES.map((cycle) => {
              const pct = cycle.budget > 0 ? Math.round((cycle.allocated / cycle.budget) * 100) : 0;
              return (
                <div key={cycle.id} className="bg-white rounded-lg shadow border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">{cycle.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      cycle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {cycle.status === 'active' ? t('compensation.active', 'Active') : t('compensation.draft', 'Draft')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500">{t('compensation.totalBudget', 'Total Budget')}</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(cycle.budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t('compensation.allocated', 'Allocated')}</p>
                      <p className="text-lg font-bold text-momentum-600">{formatCurrency(cycle.allocated)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t('compensation.remaining', 'Remaining')}</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(cycle.budget - cycle.allocated)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-momentum-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{pct}% {t('compensation.ofBudgetAllocated', 'of budget allocated')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ Payslip Detail Modal ============ */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t('compensation.payslipDetail', 'Payslip Detail')}</h2>
                <p className="text-sm text-slate-500">{selectedPayslip.employee} - {selectedPayslip.payPeriod}</p>
              </div>
              <button onClick={() => setSelectedPayslip(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Earnings */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  {t('compensation.earnings', 'Earnings')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('compensation.basicSalary', 'Basic Salary')}</span>
                    <span className="text-slate-900 font-medium">{formatCurrencyFull(selectedPayslip.breakdown.earnings.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('compensation.overtime', 'Overtime')}</span>
                    <span className="text-slate-900 font-medium">{formatCurrencyFull(selectedPayslip.breakdown.earnings.overtime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('compensation.holidayPay', 'Holiday Pay')}</span>
                    <span className="text-slate-900 font-medium">{formatCurrencyFull(selectedPayslip.breakdown.earnings.holidayPay)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('compensation.bonus', 'Bonus')}</span>
                    <span className="text-slate-900 font-medium">{formatCurrencyFull(selectedPayslip.breakdown.earnings.bonus)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-200">
                    <span className="text-slate-800">{t('compensation.totalEarnings', 'Total Earnings')}</span>
                    <span className="text-slate-900">{formatCurrencyFull(selectedPayslip.breakdown.totalGross)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                  {t('compensation.deductions', 'Deductions')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('compensation.incomeTax', 'Income Tax')}</span>
                    <span className="text-red-700 font-medium">-{formatCurrencyFull(selectedPayslip.breakdown.deductions.incomeTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('compensation.nationalInsurance', 'National Insurance')}</span>
                    <span className="text-red-700 font-medium">-{formatCurrencyFull(selectedPayslip.breakdown.deductions.nationalInsurance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('compensation.pension', 'Pension')}</span>
                    <span className="text-red-700 font-medium">-{formatCurrencyFull(selectedPayslip.breakdown.deductions.pension)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('compensation.studentLoan', 'Student Loan')}</span>
                    <span className="text-red-700 font-medium">-{formatCurrencyFull(selectedPayslip.breakdown.deductions.studentLoan)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-200">
                    <span className="text-slate-800">{t('compensation.totalDeductions', 'Total Deductions')}</span>
                    <span className="text-red-700">-{formatCurrencyFull(selectedPayslip.breakdown.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-800 font-semibold">{t('compensation.netPay', 'Net Pay')}</span>
                  <span className="text-2xl font-bold text-green-700">{formatCurrencyFull(selectedPayslip.breakdown.netPay)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button className="flex-1 flex items-center justify-center gap-2 bg-momentum-500 text-white py-2.5 rounded-lg hover:bg-momentum-600 text-sm font-medium">
                <Download className="h-4 w-4" />
                {t('compensation.downloadPdf', 'Download PDF')}
              </button>
              <button onClick={() => setSelectedPayslip(null)} className="px-6 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Compensation History Modal ============ */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t('compensation.compensationHistory', 'Compensation History')}</h2>
                <p className="text-sm text-slate-500">{selectedRecord.name} - {selectedRecord.role}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current salary */}
              <div className="bg-momentum-50 border border-momentum-200 rounded-lg p-4">
                <p className="text-xs text-momentum-600 font-medium">{t('compensation.currentSalary', 'Current Salary')}</p>
                <p className="text-2xl font-bold text-momentum-700">{formatCurrency(selectedRecord.salary)}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedRecord.department} - {selectedRecord.frequency}</p>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('compensation.salaryTimeline', 'Salary Timeline')}</h3>
                {(COMPENSATION_HISTORY[selectedRecord.id] || []).length > 0 ? (
                  <div className="space-y-0">
                    {COMPENSATION_HISTORY[selectedRecord.id].map((entry, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-momentum-500' : 'bg-slate-300'}`} />
                          {idx < COMPENSATION_HISTORY[selectedRecord.id].length - 1 && (
                            <div className="w-0.5 h-12 bg-slate-200" />
                          )}
                        </div>
                        <div className="pb-6">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{formatCurrency(entry.salary)}</span>
                            {entry.change && (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{entry.change}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{entry.date} - {entry.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">{t('compensation.noHistory', 'No compensation history available')}</p>
                )}
              </div>

              {/* Review dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">{t('compensation.lastReviewDate', 'Last Review')}</p>
                  <p className="text-sm font-medium text-slate-900">{selectedRecord.lastReview}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">{t('compensation.nextReviewDate', 'Next Review')}</p>
                  <p className="text-sm font-medium text-slate-900">{selectedRecord.nextReview}</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <button onClick={() => setSelectedRecord(null)} className="w-full py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Upload Payslip Modal ============ */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{t('compensation.uploadPayslip', 'Upload Payslip')}</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUploadPayslip} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.columns.employee', 'Employee')} *</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500">
                  <option value="">{t('compensation.selectEmployee', 'Select employee')}</option>
                  {EMPLOYEES_DATA.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.columns.payPeriod', 'Pay Period')} *</label>
                <input
                  type="month"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.file', 'File')}</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-momentum-400 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">{t('compensation.dragOrClick', 'Drag & drop or click to select file')}</p>
                  <p className="text-xs text-slate-400 mt-1">{t('compensation.pdfOnly', 'PDF format only, up to 5MB')}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium">
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium">
                  {t('compensation.upload', 'Upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ Update Compensation Modal ============ */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{t('compensation.updateCompensation', 'Update Compensation')}</h2>
              <button onClick={() => setShowUpdateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpdateCompensation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.columns.employee', 'Employee')} *</label>
                <select
                  value={updateForm.employeeId}
                  onChange={(e) => setUpdateForm({ ...updateForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                >
                  <option value="">{t('compensation.selectEmployee', 'Select employee')}</option>
                  {EMPLOYEES_DATA.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {formatCurrency(emp.salary)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.newSalary', 'New Salary')} *</label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    value={updateForm.newSalary}
                    onChange={(e) => setUpdateForm({ ...updateForm, newSalary: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                    placeholder="e.g. 65000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.reason', 'Reason')}</label>
                <select
                  value={updateForm.reason}
                  onChange={(e) => setUpdateForm({ ...updateForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                >
                  <option value="">{t('compensation.selectReason', 'Select reason')}</option>
                  <option value="annual_review">{t('compensation.reasons.annualReview', 'Annual Review')}</option>
                  <option value="promotion">{t('compensation.reasons.promotion', 'Promotion')}</option>
                  <option value="market_adjustment">{t('compensation.reasons.marketAdjustment', 'Market Adjustment')}</option>
                  <option value="role_change">{t('compensation.reasons.roleChange', 'Role Change')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.effectiveDate', 'Effective Date')} *</label>
                <input
                  type="date"
                  value={updateForm.effectiveDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUpdateModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium">
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium">
                  {t('compensation.update', 'Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ Create Cycle Modal ============ */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{t('compensation.createCycle', 'Create Compensation Cycle')}</h2>
              <button onClick={() => setShowCycleModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateCycle} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.cycleName', 'Cycle Name')} *</label>
                <input
                  type="text"
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  placeholder={t('compensation.cycleNamePlaceholder', 'e.g. Annual Salary Review 2026')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.columns.budget', 'Budget')} *</label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    value={cycleForm.budget}
                    onChange={(e) => setCycleForm({ ...cycleForm, budget: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                    placeholder="e.g. 100000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.effectiveDate', 'Effective Date')} *</label>
                <input
                  type="date"
                  value={cycleForm.effectiveDate}
                  onChange={(e) => setCycleForm({ ...cycleForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('compensation.description', 'Description')}</label>
                <textarea
                  value={cycleForm.description}
                  onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  rows={3}
                  placeholder={t('compensation.descriptionPlaceholder', 'Describe the purpose of this compensation cycle')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCycleModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium">
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium">
                  {t('compensation.create', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
