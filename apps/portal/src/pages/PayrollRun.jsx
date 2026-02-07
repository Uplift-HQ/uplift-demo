// ============================================================
// PAYROLL RUN PAGE
// Payroll run detail and management - draft, calculate, review,
// approve, process, complete workflow
// Fully internationalized - all strings use t() for translation
// ============================================================

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Calculator,
  CheckCircle,
  Clock,
  CreditCard,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  PoundSterling,
  Flag,
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Send,
  Eye,
  Download,
  Filter,
  Search,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================

const PAYROLL_STEPS = [
  { id: 'draft', labelKey: 'payrollRun.steps.draft', icon: FileText },
  { id: 'calculating', labelKey: 'payrollRun.steps.calculating', icon: Calculator },
  { id: 'review', labelKey: 'payrollRun.steps.review', icon: Eye },
  { id: 'approved', labelKey: 'payrollRun.steps.approved', icon: CheckCircle },
  { id: 'processing', labelKey: 'payrollRun.steps.processing', icon: CreditCard },
  { id: 'completed', labelKey: 'payrollRun.steps.completed', icon: Check },
];

const STEP_ORDER = ['draft', 'calculating', 'review', 'approved', 'processing', 'completed'];

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  calculating: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  processing: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

// ============================================================
// UK PAYSLIP CALCULATION HELPERS
// ============================================================

// UK Tax Bands 2024/25
const calculatePAYE = (annualGross) => {
  const taxFreeAllowance = 12570;
  const basicRateLimit = 50270;
  const higherRateLimit = 125140;

  if (annualGross <= taxFreeAllowance) return 0;

  let tax = 0;
  const taxableIncome = annualGross - taxFreeAllowance;

  if (annualGross <= basicRateLimit) {
    tax = taxableIncome * 0.20;
  } else if (annualGross <= higherRateLimit) {
    tax = (basicRateLimit - taxFreeAllowance) * 0.20;
    tax += (annualGross - basicRateLimit) * 0.40;
  } else {
    tax = (basicRateLimit - taxFreeAllowance) * 0.20;
    tax += (higherRateLimit - basicRateLimit) * 0.40;
    tax += (annualGross - higherRateLimit) * 0.45;
  }

  return Math.round(tax / 12);
};

// UK National Insurance Class 1
const calculateNI = (monthlyGross) => {
  const weeklyGross = (monthlyGross * 12) / 52;
  const primaryThreshold = 242; // Weekly
  const upperEarningsLimit = 967; // Weekly

  if (weeklyGross <= primaryThreshold) return 0;

  let ni = 0;
  if (weeklyGross <= upperEarningsLimit) {
    ni = (weeklyGross - primaryThreshold) * 0.12;
  } else {
    ni = (upperEarningsLimit - primaryThreshold) * 0.12;
    ni += (weeklyGross - upperEarningsLimit) * 0.02;
  }

  return Math.round(ni * 52 / 12);
};

// Employer NI
const calculateEmployerNI = (monthlyGross) => {
  const weeklyGross = (monthlyGross * 12) / 52;
  const secondaryThreshold = 175; // Weekly

  if (weeklyGross <= secondaryThreshold) return 0;

  const ni = (weeklyGross - secondaryThreshold) * 0.138;
  return Math.round(ni * 52 / 12);
};

// ============================================================
// DEMO DATA - UK February 2025 Payroll Run
// ============================================================

// JSP Safety Employees - UK Safety Services Company
const generateEmployeePayslips = () => {
  const employees = [
    { id: 1, name: 'John Peterson', role: 'Managing Director', annualSalary: 95000, isNewStarter: false, isLeaver: false, lastMonthGross: 7917 },
    { id: 2, name: 'Sarah Williams', role: 'Operations Manager', annualSalary: 62000, isNewStarter: false, isLeaver: false, lastMonthGross: 5167 },
    { id: 3, name: 'Marcus Thompson', role: 'Senior Safety Consultant', annualSalary: 58000, isNewStarter: false, isLeaver: false, lastMonthGross: 4833 },
    { id: 4, name: 'Emma Richardson', role: 'HR Manager', annualSalary: 52000, isNewStarter: false, isLeaver: false, lastMonthGross: 4333 },
    { id: 5, name: 'David Chen', role: 'Safety Training Lead', annualSalary: 48000, isNewStarter: false, isLeaver: false, lastMonthGross: 4000 },
    { id: 6, name: 'Rachel Green', role: 'Compliance Officer', annualSalary: 55000, isNewStarter: false, isLeaver: false, lastMonthGross: 4583 },
    { id: 7, name: 'James Murphy', role: 'Field Safety Inspector', annualSalary: 42000, isNewStarter: false, isLeaver: false, lastMonthGross: 3500, hasOvertime: true, overtime: 650 },
    { id: 8, name: 'Lisa Anderson', role: 'Finance Controller', annualSalary: 65000, isNewStarter: false, isLeaver: false, lastMonthGross: 5417 },
    { id: 9, name: 'Michael Brown', role: 'Safety Consultant', annualSalary: 45000, isNewStarter: false, isLeaver: false, lastMonthGross: 3750 },
    { id: 10, name: 'Sophie Taylor', role: 'Client Relations Manager', annualSalary: 48000, isNewStarter: false, isLeaver: false, lastMonthGross: 4000, hasCommission: true, commission: 800 },
    { id: 11, name: 'Robert Wilson', role: 'Senior Field Inspector', annualSalary: 46000, isNewStarter: false, isLeaver: false, lastMonthGross: 3833, hasOvertime: true, overtime: 720 },
    { id: 12, name: 'Emily Harris', role: 'Training Coordinator', annualSalary: 38000, isNewStarter: false, isLeaver: false, lastMonthGross: 3167 },
    { id: 13, name: 'Daniel Martinez', role: 'Safety Auditor', annualSalary: 44000, isNewStarter: true, isLeaver: false, lastMonthGross: 0, startDate: '2025-02-10' },
    { id: 14, name: 'Amy Foster', role: 'Office Administrator', annualSalary: 32000, isNewStarter: false, isLeaver: false, lastMonthGross: 2667 },
    { id: 15, name: 'Chris Davies', role: 'IT Support Specialist', annualSalary: 40000, isNewStarter: false, isLeaver: false, lastMonthGross: 3333 },
    { id: 16, name: 'Jennifer Scott', role: 'Marketing Coordinator', annualSalary: 36000, isNewStarter: false, isLeaver: true, lastMonthGross: 3000, leaveDate: '2025-02-21', finalPayAdjustment: -400 },
    { id: 17, name: 'Paul Hughes', role: 'Field Safety Inspector', annualSalary: 41000, isNewStarter: false, isLeaver: false, lastMonthGross: 3417, hasOvertime: true, overtime: 580 },
    { id: 18, name: 'Karen Mitchell', role: 'Accounts Assistant', annualSalary: 30000, isNewStarter: false, isLeaver: false, lastMonthGross: 2500 },
  ];

  return employees.map((emp) => {
    let monthlyGross = Math.round(emp.annualSalary / 12);

    // Adjustments
    if (emp.hasCommission) monthlyGross += emp.commission;
    if (emp.hasOvertime) monthlyGross += emp.overtime;
    if (emp.isNewStarter) monthlyGross = Math.round(monthlyGross * 0.8); // Pro-rata for partial month
    if (emp.isLeaver && emp.finalPayAdjustment) monthlyGross += emp.finalPayAdjustment;

    const tax = calculatePAYE(emp.annualSalary);
    const ni = calculateNI(monthlyGross);
    const pension = Math.round(monthlyGross * 0.05); // 5% employee contribution
    const studentLoan = emp.annualSalary > 27295 ? Math.round((monthlyGross - 2274) * 0.09) : 0;
    const otherDeductions = emp.isLeaver ? 150 : 0; // Equipment deduction for leaver

    const totalDeductions = tax + ni + pension + studentLoan + otherDeductions;
    const netPay = monthlyGross - totalDeductions;

    const employerNI = calculateEmployerNI(monthlyGross);
    const employerPension = Math.round(monthlyGross * 0.03); // 3% employer contribution
    const employerCost = monthlyGross + employerNI + employerPension;

    // Calculate variance from last month
    const variance = emp.lastMonthGross > 0
      ? Math.round(((monthlyGross - emp.lastMonthGross) / emp.lastMonthGross) * 100)
      : null;

    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      gross: monthlyGross,
      tax,
      ni,
      pension,
      studentLoan,
      otherDeductions,
      net: netPay,
      employerNI,
      employerPension,
      employerCost,
      isNewStarter: emp.isNewStarter,
      isLeaver: emp.isLeaver,
      startDate: emp.startDate,
      leaveDate: emp.leaveDate,
      variance,
      hasAnomaly: Math.abs(variance || 0) > 10 || emp.isNewStarter || emp.isLeaver,
      anomalyType: emp.isNewStarter ? 'new_starter' : emp.isLeaver ? 'leaver' : Math.abs(variance || 0) > 10 ? 'variance' : null,
      breakdown: {
        basicPay: Math.round(emp.annualSalary / 12),
        overtime: emp.hasOvertime ? emp.overtime : 0,
        commission: emp.hasCommission ? emp.commission : 0,
        performanceBonus: emp.performanceBonus || 0,
        adjustments: emp.isLeaver && emp.finalPayAdjustment ? emp.finalPayAdjustment : 0,
      },
    };
  });
};

const DEMO_PAYSLIPS = generateEmployeePayslips();

const DEMO_RUN = {
  id: 'PR-2025-02-JSP',
  title: 'JSP Safety - UK Payroll February 2025',
  country: 'GB',
  countryName: 'United Kingdom',
  status: 'review',
  payPeriod: 'February 2025',
  payDate: '2025-02-28',
  cutoffDate: '2025-02-20',
  preparedBy: 'Lisa Anderson',
  preparedAt: '2025-02-15 09:30',
  reviewedBy: null,
  reviewedAt: null,
  approvedBy: null,
  approvedAt: null,
  totalEmployees: DEMO_PAYSLIPS.length,
  totalGross: DEMO_PAYSLIPS.reduce((sum, p) => sum + p.gross, 0),
  totalNet: DEMO_PAYSLIPS.reduce((sum, p) => sum + p.net, 0),
  totalEmployerCost: DEMO_PAYSLIPS.reduce((sum, p) => sum + p.employerCost, 0),
};

const DEMO_NOTES = [
  {
    id: 1,
    author: 'Lisa Anderson',
    timestamp: '2025-02-15 09:35',
    text: 'Payroll calculated. Please review the following items: Daniel Martinez (new starter pro-rata - Safety Auditor), Jennifer Scott (final pay with equipment deduction - Marketing Coordinator leaving 21st), Sophie Taylor (commission included for Q1 client wins).',
  },
  {
    id: 2,
    author: 'Emma Richardson',
    timestamp: '2025-02-15 14:20',
    text: 'Verified Daniel Martinez\'s start date (10th Feb) and pro-rata calculation. Looks correct. Also confirmed Jennifer Scott\'s leave date and final settlement.',
  },
  {
    id: 3,
    author: 'Sarah Williams',
    timestamp: '2025-02-15 16:45',
    text: 'Approved overtime for field inspectors James Murphy, Robert Wilson, and Paul Hughes. All overtime sheets verified against site visit logs.',
  },
];

// ============================================================
// PROGRESS STEPPER COMPONENT
// ============================================================

function ProgressStepper({ currentStatus, t }) {
  const currentIndex = STEP_ORDER.indexOf(currentStatus);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        {PAYROLL_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isUpcoming = idx > currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-momentum-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium mt-2 text-center ${
                    isCurrent
                      ? 'text-momentum-600'
                      : isCompleted
                      ? 'text-green-600'
                      : 'text-slate-400'
                  }`}
                >
                  {t(step.labelKey, step.id.charAt(0).toUpperCase() + step.id.slice(1))}
                </span>
              </div>
              {idx < PAYROLL_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    idx < currentIndex ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// RUN HEADER COMPONENT
// ============================================================

function RunHeader({ run, t }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left: Title and metadata */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" role="img" aria-label={run.countryName}>
              {run.country === 'GB' ? '\uD83C\uDDEC\uD83C\uDDE7' : '\uD83C\uDFF3\uFE0F'}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{run.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[run.status]}`}>
              {t(`payrollRun.status.${run.status}`, run.status.charAt(0).toUpperCase() + run.status.slice(1))}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">{t('payrollRun.payPeriod', 'Pay Period')}</p>
              <p className="font-medium text-slate-900">{run.payPeriod}</p>
            </div>
            <div>
              <p className="text-slate-500">{t('payrollRun.payDate', 'Pay Date')}</p>
              <p className="font-medium text-slate-900">{run.payDate}</p>
            </div>
            <div>
              <p className="text-slate-500">{t('payrollRun.cutoffDate', 'Cutoff Date')}</p>
              <p className="font-medium text-slate-900">{run.cutoffDate}</p>
            </div>
            <div>
              <p className="text-slate-500">{t('payrollRun.runId', 'Run ID')}</p>
              <p className="font-medium text-slate-900 font-mono">{run.id}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500">{t('payrollRun.preparedBy', 'Prepared By')}</p>
              <p className="font-medium text-slate-900">
                {run.preparedBy}
                {run.preparedAt && <span className="text-slate-400 ml-2">{run.preparedAt}</span>}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t('payrollRun.reviewedBy', 'Reviewed By')}</p>
              <p className="font-medium text-slate-900">
                {run.reviewedBy || <span className="text-slate-400 italic">{t('payrollRun.pending', 'Pending')}</span>}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t('payrollRun.approvedBy', 'Approved By')}</p>
              <p className="font-medium text-slate-900">
                {run.approvedBy || <span className="text-slate-400 italic">{t('payrollRun.pending', 'Pending')}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Summary stats */}
        <div className="lg:w-80 bg-slate-50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            {t('payrollRun.summary', 'Summary')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">{t('payrollRun.totalEmployees', 'Total Employees')}</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{run.totalEmployees}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <PoundSterling className="w-4 h-4" />
                <span className="text-sm">{t('payrollRun.totalGross', 'Total Gross')}</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(run.totalGross)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">{t('payrollRun.totalNet', 'Total Net')}</span>
              </div>
              <span className="text-lg font-bold text-green-700">{formatCurrency(run.totalNet)}</span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">{t('payrollRun.employerCost', 'Employer Cost')}</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(run.totalEmployerCost)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ACTION BUTTONS COMPONENT
// ============================================================

function ActionButtons({ status, onAction, isProcessing, t }) {
  if (status === 'draft') {
    return (
      <button
        onClick={() => onAction('calculate')}
        disabled={isProcessing}
        className="flex items-center gap-2 px-5 py-2.5 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 font-medium transition-colors disabled:opacity-50"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Calculator className="w-4 h-4" />
        )}
        {t('payrollRun.actions.calculate', 'Calculate Payroll')}
      </button>
    );
  }

  if (status === 'calculating') {
    return (
      <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="font-medium">{t('payrollRun.actions.calculating', 'Calculating...')}</span>
      </div>
    );
  }

  if (status === 'review') {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => onAction('approve')}
          disabled={isProcessing}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {t('payrollRun.actions.approve', 'Approve')}
        </button>
        <button
          onClick={() => onAction('requestChanges')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('payrollRun.actions.requestChanges', 'Request Changes')}
        </button>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <button
        onClick={() => onAction('process')}
        disabled={isProcessing}
        className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium transition-colors disabled:opacity-50"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4" />
        )}
        {t('payrollRun.actions.processPayments', 'Process Payments')}
      </button>
    );
  }

  if (status === 'processing') {
    return (
      <div className="flex items-center gap-3 px-5 py-2.5 bg-purple-50 text-purple-700 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="font-medium">{t('payrollRun.actions.processingPayments', 'Processing Payments...')}</span>
        <span className="text-sm text-purple-500">12/18</span>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => onAction('viewSummary')}
          className="flex items-center gap-2 px-5 py-2.5 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 font-medium transition-colors"
        >
          <Eye className="w-4 h-4" />
          {t('payrollRun.actions.viewSummary', 'View Summary')}
        </button>
        <button
          onClick={() => onAction('download')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          {t('payrollRun.actions.download', 'Download Report')}
        </button>
      </div>
    );
  }

  return null;
}

// ============================================================
// VARIANCE ALERTS PANEL
// ============================================================

function VarianceAlertsPanel({ payslips, activeFilter, onFilterChange, t }) {
  const varianceEmployees = payslips.filter((p) => p.anomalyType === 'variance');
  const newStarters = payslips.filter((p) => p.isNewStarter);
  const leavers = payslips.filter((p) => p.isLeaver);

  const alerts = [
    {
      id: 'variance',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50',
      activeColor: 'text-amber-700 bg-amber-100 ring-2 ring-amber-300',
      count: varianceEmployees.length,
      label: t('payrollRun.alerts.varianceAlert', '{{count}} employees with >10% variance', { count: varianceEmployees.length }),
    },
    {
      id: 'new_starter',
      icon: UserPlus,
      color: 'text-blue-600 bg-blue-50',
      activeColor: 'text-blue-700 bg-blue-100 ring-2 ring-blue-300',
      count: newStarters.length,
      label: t('payrollRun.alerts.newStarters', '{{count}} new starters this period', { count: newStarters.length }),
    },
    {
      id: 'leaver',
      icon: UserMinus,
      color: 'text-red-600 bg-red-50',
      activeColor: 'text-red-700 bg-red-100 ring-2 ring-red-300',
      count: leavers.length,
      label: t('payrollRun.alerts.leavers', '{{count}} leaver - final pay', { count: leavers.length }),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        {t('payrollRun.alerts.title', 'Variance Alerts')}
      </h3>
      <div className="flex flex-wrap gap-2">
        {alerts.filter((a) => a.count > 0).map((alert) => {
          const Icon = alert.icon;
          const isActive = activeFilter === alert.id;
          return (
            <button
              key={alert.id}
              onClick={() => onFilterChange(isActive ? null : alert.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? alert.activeColor : alert.color
              } hover:opacity-90`}
            >
              <Icon className="w-4 h-4" />
              {alert.label}
              {isActive && <X className="w-3 h-3 ml-1" />}
            </button>
          );
        })}
        {alerts.every((a) => a.count === 0) && (
          <div className="flex items-center gap-2 px-3 py-2 text-green-600 bg-green-50 rounded-lg text-sm">
            <CheckCircle className="w-4 h-4" />
            {t('payrollRun.alerts.noAlerts', 'No variance alerts')}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAYSLIPS TABLE
// ============================================================

function PayslipsTable({ payslips, expandedRow, onExpandRow, activeFilter, searchQuery, t }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyFull = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Apply filters
  const filteredPayslips = payslips.filter((p) => {
    if (activeFilter && p.anomalyType !== activeFilter) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.role.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getAnomalyIcon = (payslip) => {
    if (payslip.isNewStarter) {
      return <UserPlus className="w-4 h-4 text-blue-500" title={t('payrollRun.newStarter', 'New Starter')} />;
    }
    if (payslip.isLeaver) {
      return <UserMinus className="w-4 h-4 text-red-500" title={t('payrollRun.leaver', 'Leaver')} />;
    }
    if (payslip.variance && Math.abs(payslip.variance) > 10) {
      return payslip.variance > 0 ? (
        <TrendingUp className="w-4 h-4 text-amber-500" title={t('payrollRun.varianceUp', '+{{pct}}% from last month', { pct: payslip.variance })} />
      ) : (
        <TrendingDown className="w-4 h-4 text-amber-500" title={t('payrollRun.varianceDown', '{{pct}}% from last month', { pct: payslip.variance })} />
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.employee', 'Employee')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.role', 'Role')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.gross', 'Gross')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.tax', 'Tax')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.ni', 'NI')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.pension', 'Pension')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.other', 'Other')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.net', 'Net')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('payrollRun.table.employerCost', 'Employer Cost')}
              </th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPayslips.map((payslip) => {
              const isExpanded = expandedRow === payslip.id;
              const anomalyIcon = getAnomalyIcon(payslip);

              return (
                <React.Fragment key={payslip.id}>
                  <tr
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      payslip.hasAnomaly ? 'bg-amber-50/30' : ''
                    }`}
                    onClick={() => onExpandRow(isExpanded ? null : payslip.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{payslip.name}</span>
                        {anomalyIcon}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{payslip.role}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                      {formatCurrency(payslip.gross)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right">
                      -{formatCurrency(payslip.tax)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right">
                      -{formatCurrency(payslip.ni)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right">
                      -{formatCurrency(payslip.pension)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right">
                      {payslip.studentLoan + payslip.otherDeductions > 0
                        ? `-${formatCurrency(payslip.studentLoan + payslip.otherDeductions)}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700 text-right">
                      {formatCurrency(payslip.net)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">
                      {formatCurrency(payslip.employerCost)}
                    </td>
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="bg-slate-50 px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Earnings Breakdown */}
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                              {t('payrollRun.breakdown.earnings', 'Earnings')}
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('payrollRun.breakdown.basicPay', 'Basic Pay')}</span>
                                <span className="font-medium text-slate-900">{formatCurrencyFull(payslip.breakdown.basicPay)}</span>
                              </div>
                              {payslip.breakdown.overtime > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">{t('payrollRun.breakdown.overtime', 'Overtime')}</span>
                                  <span className="font-medium text-slate-900">{formatCurrencyFull(payslip.breakdown.overtime)}</span>
                                </div>
                              )}
                              {payslip.breakdown.commission > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">{t('payrollRun.breakdown.commission', 'Commission')}</span>
                                  <span className="font-medium text-slate-900">{formatCurrencyFull(payslip.breakdown.commission)}</span>
                                </div>
                              )}
                              {payslip.breakdown.performanceBonus > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">{t('payrollRun.breakdown.performanceBonus', 'Performance Bonus')}</span>
                                  <span className="font-medium text-green-600">{formatCurrencyFull(payslip.breakdown.performanceBonus)}</span>
                                </div>
                              )}
                              {payslip.breakdown.adjustments !== 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">{t('payrollRun.breakdown.adjustments', 'Adjustments')}</span>
                                  <span className={`font-medium ${payslip.breakdown.adjustments < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                    {formatCurrencyFull(payslip.breakdown.adjustments)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between pt-2 border-t border-slate-100">
                                <span className="font-medium text-slate-700">{t('payrollRun.breakdown.totalGross', 'Total Gross')}</span>
                                <span className="font-bold text-slate-900">{formatCurrencyFull(payslip.gross)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Deductions Breakdown */}
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                              {t('payrollRun.breakdown.deductions', 'Deductions')}
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('payrollRun.breakdown.paye', 'PAYE Tax')}</span>
                                <span className="font-medium text-red-600">-{formatCurrencyFull(payslip.tax)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('payrollRun.breakdown.nationalInsurance', 'National Insurance')}</span>
                                <span className="font-medium text-red-600">-{formatCurrencyFull(payslip.ni)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('payrollRun.breakdown.pensionContribution', 'Pension (5%)')}</span>
                                <span className="font-medium text-red-600">-{formatCurrencyFull(payslip.pension)}</span>
                              </div>
                              {payslip.studentLoan > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">{t('payrollRun.breakdown.studentLoan', 'Student Loan')}</span>
                                  <span className="font-medium text-red-600">-{formatCurrencyFull(payslip.studentLoan)}</span>
                                </div>
                              )}
                              {payslip.otherDeductions > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">{t('payrollRun.breakdown.otherDeductions', 'Other Deductions')}</span>
                                  <span className="font-medium text-red-600">-{formatCurrencyFull(payslip.otherDeductions)}</span>
                                </div>
                              )}
                              <div className="flex justify-between pt-2 border-t border-slate-100">
                                <span className="font-medium text-slate-700">{t('payrollRun.breakdown.netPay', 'Net Pay')}</span>
                                <span className="font-bold text-green-700">{formatCurrencyFull(payslip.net)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Employer Costs */}
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                              {t('payrollRun.breakdown.employerCosts', 'Employer Costs')}
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('payrollRun.breakdown.grossPay', 'Gross Pay')}</span>
                                <span className="font-medium text-slate-900">{formatCurrencyFull(payslip.gross)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('payrollRun.breakdown.employerNI', 'Employer NI (13.8%)')}</span>
                                <span className="font-medium text-slate-900">{formatCurrencyFull(payslip.employerNI)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">{t('payrollRun.breakdown.employerPension', 'Employer Pension (3%)')}</span>
                                <span className="font-medium text-slate-900">{formatCurrencyFull(payslip.employerPension)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-slate-100">
                                <span className="font-medium text-slate-700">{t('payrollRun.breakdown.totalCost', 'Total Cost')}</span>
                                <span className="font-bold text-slate-900">{formatCurrencyFull(payslip.employerCost)}</span>
                              </div>
                            </div>

                            {/* Status badges */}
                            <div className="mt-4 pt-3 border-t border-slate-100">
                              {payslip.isNewStarter && (
                                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                                  <UserPlus className="w-4 h-4" />
                                  <span>{t('payrollRun.breakdown.newStarterNote', 'New starter - started {{date}}', { date: payslip.startDate })}</span>
                                </div>
                              )}
                              {payslip.isLeaver && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                  <UserMinus className="w-4 h-4" />
                                  <span>{t('payrollRun.breakdown.leaverNote', 'Final pay - leaving {{date}}', { date: payslip.leaveDate })}</span>
                                </div>
                              )}
                              {payslip.variance && Math.abs(payslip.variance) > 10 && !payslip.isNewStarter && !payslip.isLeaver && (
                                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                  {payslip.variance > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                  <span>{t('payrollRun.breakdown.varianceNote', '{{pct}}% variance from last month', { pct: payslip.variance > 0 ? `+${payslip.variance}` : payslip.variance })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
        {t('payrollRun.table.showing', 'Showing {{count}} of {{total}} employees', {
          count: filteredPayslips.length,
          total: payslips.length,
        })}
      </div>
    </div>
  );
}

// ============================================================
// RUN NOTES SECTION
// ============================================================

function RunNotesSection({ notes, onAddNote, t }) {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        {t('payrollRun.notes.title', 'Run Notes & Comments')}
      </h3>

      {/* Add new note */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t('payrollRun.notes.placeholder', 'Add a note about this payroll run...')}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-transparent resize-none"
            rows={2}
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Notes history */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-4">
            {t('payrollRun.notes.empty', 'No notes yet')}
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900">{note.author}</span>
                <span className="text-xs text-slate-400">{note.timestamp}</span>
              </div>
              <p className="text-sm text-slate-600">{note.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PayrollRun() {
  const { t } = useTranslation();
  const [run, setRun] = useState(DEMO_RUN);
  const [payslips] = useState(DEMO_PAYSLIPS);
  const [notes, setNotes] = useState(DEMO_NOTES);
  const [expandedRow, setExpandedRow] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = (action) => {
    setIsProcessing(true);

    // Simulate async action
    setTimeout(() => {
      setIsProcessing(false);

      if (action === 'calculate') {
        setRun((prev) => ({ ...prev, status: 'review' }));
      } else if (action === 'approve') {
        setRun((prev) => ({
          ...prev,
          status: 'approved',
          reviewedBy: 'Current User',
          reviewedAt: new Date().toLocaleString(),
          approvedBy: 'Current User',
          approvedAt: new Date().toLocaleString(),
        }));
      } else if (action === 'requestChanges') {
        setRun((prev) => ({ ...prev, status: 'draft' }));
      } else if (action === 'process') {
        setRun((prev) => ({ ...prev, status: 'completed' }));
      }
    }, 1500);
  };

  const handleAddNote = (text) => {
    const newNote = {
      id: notes.length + 1,
      author: 'Current User',
      timestamp: new Date().toLocaleString(),
      text,
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('payrollRun.pageTitle', 'Payroll Run')}
          </h1>
          <p className="text-slate-600">
            {t('payrollRun.pageSubtitle', 'Review and manage payroll calculations')}
          </p>
        </div>
        <ActionButtons
          status={run.status}
          onAction={handleAction}
          isProcessing={isProcessing}
          t={t}
        />
      </div>

      {/* Progress Stepper */}
      <ProgressStepper currentStatus={run.status} t={t} />

      {/* Run Header */}
      <RunHeader run={run} t={t} />

      {/* Variance Alerts */}
      <VarianceAlertsPanel
        payslips={payslips}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        t={t}
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('payrollRun.search', 'Search employees...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-transparent"
          />
        </div>
        {(activeFilter || searchQuery) && (
          <button
            onClick={() => {
              setActiveFilter(null);
              setSearchQuery('');
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            {t('payrollRun.clearFilters', 'Clear filters')}
          </button>
        )}
      </div>

      {/* Payslips Table */}
      <PayslipsTable
        payslips={payslips}
        expandedRow={expandedRow}
        onExpandRow={setExpandedRow}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        t={t}
      />

      {/* Run Notes */}
      <RunNotesSection notes={notes} onAddNote={handleAddNote} t={t} />
    </div>
  );
}
