// ============================================================
// MY PAYSLIPS PAGE
// Employee's personal payslip view with YTD summary and detail modal
// ============================================================
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Receipt,
  PoundSterling,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Eye,
  X,
  Filter,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  User,
  Briefcase,
} from 'lucide-react';

// ---- Demo Employee Data (Sarah Chen - the demo admin user) ----

const EMPLOYEE_INFO = {
  name: 'Sarah Chen',
  employeeNumber: 'EMP-001',
  department: 'Engineering',
  jobTitle: 'Senior Software Engineer',
  taxCode: '1257L',
  niCategory: 'A',
};

// ---- Demo Payslips Data (10 payslips from Jan 2025 back to April 2024) ----

const generatePayslipData = () => {
  const payslips = [];
  const baseGross = 3500; // Monthly gross

  // Generate payslips from January 2025 back to April 2024
  const periods = [
    { month: 1, year: 2025, label: 'January 2025', status: 'paid' },
    { month: 12, year: 2024, label: 'December 2024', status: 'paid' },
    { month: 11, year: 2024, label: 'November 2024', status: 'paid' },
    { month: 10, year: 2024, label: 'October 2024', status: 'paid' },
    { month: 9, year: 2024, label: 'September 2024', status: 'paid' },
    { month: 8, year: 2024, label: 'August 2024', status: 'paid' },
    { month: 7, year: 2024, label: 'July 2024', status: 'paid' },
    { month: 6, year: 2024, label: 'June 2024', status: 'paid' },
    { month: 5, year: 2024, label: 'May 2024', status: 'paid' },
    { month: 4, year: 2024, label: 'April 2024', status: 'paid' },
  ];

  let ytdGross = 0;
  let ytdTax = 0;
  let ytdNI = 0;
  let ytdPension = 0;
  let ytdNet = 0;

  periods.forEach((period, index) => {
    const monthStr = String(period.month).padStart(2, '0');
    const payDate = `${period.year}-${monthStr}-28`;

    // Add some variation - December has a bonus
    const bonus = period.month === 12 ? 2000 : 0;
    const overtime = index % 3 === 0 ? 150 : 0;

    const basicSalary = baseGross;
    const totalGross = basicSalary + bonus + overtime;

    // UK tax calculations (simplified)
    const incomeTax = Math.round(totalGross * 0.20 * (1 - (12570 / 12 / totalGross))); // Approximate PAYE
    const nationalInsurance = Math.round((totalGross - 1048) * 0.12); // NI after threshold
    const pensionEmployee = Math.round(totalGross * 0.05); // 5% employee contribution
    const studentLoan = Math.round((totalGross - 2274) * 0.09); // Plan 2 student loan

    const totalDeductions = incomeTax + nationalInsurance + pensionEmployee + studentLoan;
    const netPay = totalGross - totalDeductions;

    // Employer contributions (for display)
    const employerNI = Math.round((totalGross - 758) * 0.138);
    const pensionEmployer = Math.round(totalGross * 0.03); // 3% employer contribution

    // Update YTD for current tax year (April 2024 - March 2025)
    if ((period.year === 2024 && period.month >= 4) || (period.year === 2025 && period.month <= 3)) {
      ytdGross += totalGross;
      ytdTax += incomeTax;
      ytdNI += nationalInsurance;
      ytdPension += pensionEmployee;
      ytdNet += netPay;
    }

    payslips.push({
      id: index + 1,
      payDate,
      period: `${monthStr}/${period.year}`,
      periodLabel: period.label,
      taxYear: period.month >= 4 ? `${period.year}-${String(period.year + 1).slice(-2)}` : `${period.year - 1}-${String(period.year).slice(-2)}`,
      status: period.status,
      earnings: {
        basicSalary,
        overtime,
        bonus,
        totalGross,
      },
      deductions: {
        incomeTax,
        nationalInsurance,
        pensionEmployee,
        studentLoan,
        totalDeductions,
      },
      employerContributions: {
        employerNI,
        pensionEmployer,
      },
      netPay,
      ytd: {
        gross: ytdGross,
        tax: ytdTax,
        ni: ytdNI,
        pension: ytdPension,
        net: ytdNet,
      },
    });
  });

  return payslips;
};

const DEMO_PAYSLIPS = generatePayslipData();

// YTD Summary for the current tax year (2024-25)
const YTD_SUMMARY = {
  gross: 35000.00,
  tax: 4500.00,
  ni: 2800.00,
  net: 27700.00,
};

// ---- Component ----

export default function MyPayslips() {
  const { t } = useTranslation();
  const [selectedTaxYear, setSelectedTaxYear] = useState('2024-25');
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // ---- Helpers ----

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  // Filter payslips by tax year
  const filteredPayslips = DEMO_PAYSLIPS.filter((ps) => {
    if (selectedTaxYear === '2024-25') {
      return ps.taxYear === '2024-25';
    } else if (selectedTaxYear === '2025-26') {
      return ps.taxYear === '2025-26';
    }
    return true;
  });

  // Get YTD based on selected tax year
  const getYTDSummary = () => {
    if (selectedTaxYear === '2025-26') {
      // Only January 2025 is in 2025-26 tax year based on our data
      return {
        gross: 3500.00,
        tax: 450.00,
        ni: 280.00,
        net: 2595.00,
      };
    }
    return YTD_SUMMARY;
  };

  const ytdSummary = getYTDSummary();

  const handleDownloadPDF = (payslip) => {
    // Demo - would trigger PDF download
    console.log('Downloading PDF for payslip:', payslip.period);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('myPayslips.title', 'My Payslips')}</h1>
          <p className="text-slate-600">{t('myPayslips.subtitle', 'View and download your payslips')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedTaxYear}
            onChange={(e) => setSelectedTaxYear(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="2025-26">{t('myPayslips.taxYear', 'Tax Year')} 2025-26</option>
            <option value="2024-25">{t('myPayslips.taxYear', 'Tax Year')} 2024-25</option>
          </select>
        </div>
      </div>

      {/* YTD Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-slate-600">
            <PoundSterling className="h-5 w-5" />
            <span className="text-sm">{t('myPayslips.ytdGross', 'YTD Gross')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(ytdSummary.gross)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('myPayslips.totalEarnings', 'Total earnings')}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-red-600">
            <TrendingDown className="h-5 w-5" />
            <span className="text-sm">{t('myPayslips.ytdTax', 'YTD Tax Paid')}</span>
          </div>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(ytdSummary.tax)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('myPayslips.incomeTaxPAYE', 'Income Tax (PAYE)')}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-amber-600">
            <TrendingDown className="h-5 w-5" />
            <span className="text-sm">{t('myPayslips.ytdNI', 'YTD NI Paid')}</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(ytdSummary.ni)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('myPayslips.nationalInsurance', 'National Insurance')}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm">{t('myPayslips.ytdNet', 'YTD Net')}</span>
          </div>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(ytdSummary.net)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('myPayslips.takeHomePay', 'Take-home pay')}</p>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('myPayslips.columns.payDate', 'Pay Date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('myPayslips.columns.period', 'Period')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('myPayslips.columns.gross', 'Gross')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('myPayslips.columns.deductions', 'Deductions')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('myPayslips.columns.net', 'Net')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('myPayslips.columns.status', 'Status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('myPayslips.columns.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredPayslips.map((ps) => (
                <tr
                  key={ps.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                    {formatDate(ps.payDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {ps.periodLabel}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 text-right font-medium">
                    {formatCurrency(ps.earnings.totalGross)}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 text-right font-medium">
                    -{formatCurrency(ps.deductions.totalDeductions)}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-700 text-right font-semibold">
                    {formatCurrency(ps.netPay)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        ps.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ps.status === 'paid' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {ps.status === 'paid'
                        ? t('myPayslips.paid', 'Paid')
                        : t('myPayslips.processing', 'Processing')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedPayslip(ps)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        title={t('myPayslips.viewPayslip', 'View Payslip')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t('myPayslips.view', 'View')}
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(ps)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-momentum-50 text-momentum-700 text-xs font-medium rounded-lg hover:bg-momentum-100 transition-colors"
                        title={t('myPayslips.downloadPdf', 'Download PDF')}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t('myPayslips.downloadPdf', 'Download PDF')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPayslips.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('myPayslips.noPayslips', 'No payslips found for this tax year')}</p>
          </div>
        )}
      </div>

      {/* ============ Payslip Detail Modal ============ */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t('myPayslips.payslipDetail', 'Payslip Detail')}
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedPayslip.periodLabel}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
              {/* Employee Header Section */}
              <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">{t('myPayslips.employeeName', 'Employee Name')}</p>
                    <p className="text-sm font-medium text-slate-900">{EMPLOYEE_INFO.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">{t('myPayslips.employeeNumber', 'Employee Number')}</p>
                    <p className="text-sm font-medium text-slate-900">{EMPLOYEE_INFO.employeeNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">{t('myPayslips.department', 'Department')}</p>
                    <p className="text-sm font-medium text-slate-900">{EMPLOYEE_INFO.department}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('myPayslips.payPeriod', 'Pay Period')}</p>
                  <p className="text-sm font-medium text-slate-900">{selectedPayslip.periodLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('myPayslips.payDate', 'Pay Date')}</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(selectedPayslip.payDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('myPayslips.taxCode', 'Tax Code')}</p>
                  <p className="text-sm font-medium text-slate-900">{EMPLOYEE_INFO.taxCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('myPayslips.niCategory', 'NI Category')}</p>
                  <p className="text-sm font-medium text-slate-900">{EMPLOYEE_INFO.niCategory}</p>
                </div>
              </div>

              {/* Earnings Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  {t('myPayslips.earnings', 'Earnings')}
                </h3>
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-600">{t('myPayslips.basicSalary', 'Basic Salary')}</span>
                    <span className="text-sm font-medium text-slate-900">{formatCurrency(selectedPayslip.earnings.basicSalary)}</span>
                  </div>
                  {selectedPayslip.earnings.overtime > 0 && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-600">{t('myPayslips.overtime', 'Overtime')}</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(selectedPayslip.earnings.overtime)}</span>
                    </div>
                  )}
                  {selectedPayslip.earnings.bonus > 0 && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-600">{t('myPayslips.bonus', 'Bonus')}</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(selectedPayslip.earnings.bonus)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 bg-slate-50 font-semibold">
                    <span className="text-sm text-slate-800">{t('myPayslips.totalGross', 'Total Gross')}</span>
                    <span className="text-sm text-slate-900">{formatCurrency(selectedPayslip.earnings.totalGross)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                  {t('myPayslips.deductions', 'Deductions')}
                </h3>
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-600">{t('myPayslips.incomeTaxPAYE', 'Income Tax (PAYE)')}</span>
                    <span className="text-sm font-medium text-red-700">-{formatCurrency(selectedPayslip.deductions.incomeTax)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-600">{t('myPayslips.nationalInsurance', 'National Insurance')}</span>
                    <span className="text-sm font-medium text-red-700">-{formatCurrency(selectedPayslip.deductions.nationalInsurance)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-600">{t('myPayslips.pensionEmployee', 'Pension (Employee 5%)')}</span>
                    <span className="text-sm font-medium text-red-700">-{formatCurrency(selectedPayslip.deductions.pensionEmployee)}</span>
                  </div>
                  {selectedPayslip.deductions.studentLoan > 0 && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-600">{t('myPayslips.studentLoan', 'Student Loan')}</span>
                      <span className="text-sm font-medium text-red-700">-{formatCurrency(selectedPayslip.deductions.studentLoan)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 bg-red-50 font-semibold">
                    <span className="text-sm text-red-800">{t('myPayslips.totalDeductions', 'Total Deductions')}</span>
                    <span className="text-sm text-red-700">-{formatCurrency(selectedPayslip.deductions.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Employer Contributions Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {t('myPayslips.employerContributions', 'Employer Contributions')}
                  <span className="text-xs font-normal text-slate-400">({t('myPayslips.forInfo', 'for information')})</span>
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg divide-y divide-blue-100">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-blue-700">{t('myPayslips.employerNI', 'Employer NI')}</span>
                    <span className="text-sm font-medium text-blue-800">{formatCurrency(selectedPayslip.employerContributions.employerNI)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-blue-700">{t('myPayslips.pensionEmployer', 'Pension (Employer 3%)')}</span>
                    <span className="text-sm font-medium text-blue-800">{formatCurrency(selectedPayslip.employerContributions.pensionEmployer)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-3">{t('myPayslips.summary', 'Summary')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">{t('myPayslips.grossPay', 'Gross Pay')}</span>
                    <span className="text-sm font-medium text-green-800">{formatCurrency(selectedPayslip.earnings.totalGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">{t('myPayslips.totalDeductions', 'Total Deductions')}</span>
                    <span className="text-sm font-medium text-red-600">-{formatCurrency(selectedPayslip.deductions.totalDeductions)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <span className="text-base font-semibold text-green-800">{t('myPayslips.netPay', 'Net Pay')}</span>
                    <span className="text-xl font-bold text-green-700">{formatCurrency(selectedPayslip.netPay)}</span>
                  </div>
                </div>
              </div>

              {/* YTD Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  {t('myPayslips.yearToDate', 'Year To Date')} ({selectedPayslip.taxYear})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">{t('myPayslips.ytdGross', 'YTD Gross')}</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(selectedPayslip.ytd.gross)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">{t('myPayslips.ytdTax', 'YTD Tax')}</p>
                    <p className="text-sm font-bold text-red-700 mt-1">{formatCurrency(selectedPayslip.ytd.tax)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">{t('myPayslips.ytdNI', 'YTD NI')}</p>
                    <p className="text-sm font-bold text-amber-700 mt-1">{formatCurrency(selectedPayslip.ytd.ni)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">{t('myPayslips.ytdPension', 'YTD Pension')}</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{formatCurrency(selectedPayslip.ytd.pension)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600">{t('myPayslips.ytdNet', 'YTD Net')}</p>
                    <p className="text-sm font-bold text-green-700 mt-1">{formatCurrency(selectedPayslip.ytd.net)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => handleDownloadPDF(selectedPayslip)}
                className="flex-1 flex items-center justify-center gap-2 bg-momentum-500 text-white py-2.5 rounded-lg hover:bg-momentum-600 text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                {t('myPayslips.downloadPdf', 'Download PDF')}
              </button>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-6 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
