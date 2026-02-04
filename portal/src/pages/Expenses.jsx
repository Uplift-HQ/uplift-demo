// ============================================================
// EXPENSES PAGE
// Expense management, approvals, budgets, policy, and analytics
// Fully internationalized - all strings use t() for translation
// ============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  Receipt, CreditCard, CheckCircle, XCircle, Clock, AlertTriangle,
  Filter, Search, Plus, X, Eye, Download, Upload, Edit2, Save,
  ChevronRight, ChevronDown, FileText, DollarSign, TrendingUp,
  Users, Briefcase, Car, Utensils, Building2, Monitor, MapPin,
  BarChart3, PieChart, Calendar, ArrowUpRight, ArrowDownRight,
  Check, Shield, Settings, Trash2, MoreVertical, Star, Plane,
} from 'lucide-react';

// ============================================================
// DEMO DATA
// ============================================================

const DEMO_EXPENSES = [
  { id: 1, employee: 'Sarah Mitchell', title: 'Eurostar to Paris', category: 'travel', merchant: 'Eurostar', amount: 245.00, date: '2026-01-28', status: 'submitted', hasReceipt: true, report: 'Berlin Business Trip', notes: 'Client meeting at HQ', policyViolation: false },
  { id: 2, employee: 'James Cooper', title: 'Client dinner - Dishoom', category: 'meals', merchant: 'Dishoom', amount: 187.50, date: '2026-01-27', status: 'approved', hasReceipt: true, report: 'Q1 Client Entertainment', notes: '4 pax client dinner', policyViolation: true, violationReason: 'Over meals limit (£75)' },
  { id: 3, employee: 'Emily Watson', title: 'Hilton Manchester 2 nights', category: 'accommodation', merchant: 'Hilton Hotels', amount: 389.00, date: '2026-01-25', status: 'paid', hasReceipt: true, report: 'Manchester Training', notes: 'Training conference accommodation', policyViolation: false },
  { id: 4, employee: 'Oliver Barnes', title: 'MacBook Pro charger', category: 'equipment', merchant: 'Apple Store', amount: 79.00, date: '2026-01-24', status: 'approved', hasReceipt: true, report: 'Office Supplies Jan', notes: 'Replacement charger', policyViolation: false },
  { id: 5, employee: 'Sarah Mitchell', title: 'Mileage - Birmingham client visit', category: 'mileage', merchant: 'N/A', amount: 94.50, date: '2026-01-23', status: 'submitted', hasReceipt: false, report: null, notes: '210 miles @ £0.45/mile', policyViolation: false },
  { id: 6, employee: 'David Chen', title: 'Team lunch - Pizza Express', category: 'meals', merchant: 'Pizza Express', amount: 68.40, date: '2026-01-22', status: 'approved', hasReceipt: true, report: 'Q1 Client Entertainment', notes: 'Team building lunch', policyViolation: false },
  { id: 7, employee: 'Rachel Green', title: 'BA flight to Edinburgh', category: 'travel', merchant: 'British Airways', amount: 189.00, date: '2026-01-21', status: 'rejected', hasReceipt: true, report: null, notes: 'Quarterly review meeting', policyViolation: true, violationReason: 'Not pre-approved' },
  { id: 8, employee: 'Tom Hughes', title: 'Uber rides - London meetings', category: 'travel', merchant: 'Uber', amount: 47.80, date: '2026-01-20', status: 'draft', hasReceipt: true, report: null, notes: '3 rides between offices', policyViolation: false },
  { id: 9, employee: 'Laura Smith', title: 'Ergonomic keyboard', category: 'equipment', merchant: 'Amazon', amount: 129.99, date: '2026-01-19', status: 'submitted', hasReceipt: true, report: 'Office Supplies Jan', notes: 'DSE assessment recommendation', policyViolation: false },
  { id: 10, employee: 'James Cooper', title: 'Premier Inn Leeds', category: 'accommodation', merchant: 'Premier Inn', amount: 85.00, date: '2026-01-18', status: 'paid', hasReceipt: true, report: null, notes: 'Overnight for Leeds workshop', policyViolation: false },
  { id: 11, employee: 'Emily Watson', title: 'Mileage - Manchester return', category: 'mileage', merchant: 'N/A', amount: 135.00, date: '2026-01-17', status: 'submitted', hasReceipt: false, report: 'Manchester Training', notes: '300 miles @ £0.45/mile', policyViolation: false },
  { id: 12, employee: 'Oliver Barnes', title: 'Stationery supplies', category: 'other', merchant: 'Ryman', amount: 23.50, date: '2026-01-16', status: 'paid', hasReceipt: true, report: 'Office Supplies Jan', notes: 'Notebooks, pens, folders', policyViolation: false },
  { id: 13, employee: 'Sarah Mitchell', title: 'Berlin hotel 3 nights', category: 'accommodation', merchant: 'Motel One Berlin', amount: 420.00, date: '2026-01-15', status: 'approved', hasReceipt: true, report: 'Berlin Business Trip', notes: 'Annual partner conference', policyViolation: false },
  { id: 14, employee: 'David Chen', title: 'Train to Bristol', category: 'travel', merchant: 'GWR', amount: 56.20, date: '2026-01-14', status: 'submitted', hasReceipt: true, report: null, notes: 'Client site visit', policyViolation: false },
  { id: 15, employee: 'Rachel Green', title: 'Coffee meetings x5', category: 'meals', merchant: 'Various', amount: 32.75, date: '2026-01-13', status: 'submitted', hasReceipt: false, report: null, notes: 'Week of candidate interviews', policyViolation: true, violationReason: 'Missing receipts' },
];

const DEMO_REPORTS = [
  { id: 1, name: 'Berlin Business Trip', employee: 'Sarah Mitchell', expenseCount: 3, total: 665.00, status: 'submitted', submittedDate: '2026-01-29', expenses: [1, 5, 13] },
  { id: 2, name: 'Q1 Client Entertainment', employee: 'James Cooper', expenseCount: 2, total: 255.90, status: 'approved', submittedDate: '2026-01-28', expenses: [2, 6] },
  { id: 3, name: 'Office Supplies Jan', employee: 'Oliver Barnes', expenseCount: 3, total: 232.49, status: 'paid', submittedDate: '2026-01-25', expenses: [4, 9, 12] },
  { id: 4, name: 'Manchester Training', employee: 'Emily Watson', expenseCount: 2, total: 524.00, status: 'submitted', submittedDate: '2026-01-27', expenses: [3, 11] },
];

const DEMO_BUDGETS = [
  { department: 'Engineering', budget: 15000, actual: 11250, utilisation: 75 },
  { department: 'Sales', budget: 20000, actual: 18400, utilisation: 92 },
  { department: 'Marketing', budget: 10000, actual: 6800, utilisation: 68 },
  { department: 'HR', budget: 5000, actual: 4100, utilisation: 82 },
  { department: 'Operations', budget: 8000, actual: 3200, utilisation: 40 },
];

const POLICY_LIMITS = [
  { category: 'Travel', limit: 1000 },
  { category: 'Meals', limit: 75 },
  { category: 'Accommodation', limit: 200 },
  { category: 'Equipment', limit: 500 },
  { category: 'Other', limit: 100 },
];

const PER_DIEM_RATES = [
  { country: 'UK', rate: 50 },
  { country: 'Germany', rate: 65 },
  { country: 'UAE', rate: 80 },
  { country: 'China', rate: 40 },
  { country: 'USA', rate: 60 },
];

const APPROVAL_CHAIN = [
  { level: 1, role: 'Line Manager', limit: 500 },
  { level: 2, role: 'Department Head', limit: 2000 },
  { level: 3, role: 'Finance', limit: null },
];

const CATEGORY_ICONS = {
  travel: Plane,
  meals: Utensils,
  accommodation: Building2,
  equipment: Monitor,
  mileage: Car,
  other: FileText,
};

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-purple-100 text-purple-700',
};

const TABS = [
  { id: 'all', labelKey: 'expenses.tabs.allExpenses', icon: Receipt },
  { id: 'reports', labelKey: 'expenses.tabs.expenseReports', icon: FileText },
  { id: 'approvals', labelKey: 'expenses.tabs.approvals', icon: CheckCircle },
  { id: 'budgets', labelKey: 'expenses.tabs.budgets', icon: BarChart3 },
  { id: 'policy', labelKey: 'expenses.tabs.policy', icon: Shield },
  { id: 'dashboard', labelKey: 'expenses.tabs.dashboard', icon: PieChart },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Expenses() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [activeTab, setActiveTab] = useState('all');
  const [expenses, setExpenses] = useState(DEMO_EXPENSES);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingCount = expenses.filter(e => e.status === 'submitted').length;
  const violations = expenses.filter(e => e.policyViolation).length;

  // Filtered expenses
  const filteredExpenses = expenses.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (employeeFilter && !e.employee.toLowerCase().includes(employeeFilter.toLowerCase())) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase()) && !e.employee.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleApprove = (id) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' } : e));
    setSelectedExpense(null);
  };

  const handleReject = (id) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected' } : e));
    setSelectedExpense(null);
  };

  // ============================================================
  // TAB 1: ALL EXPENSES
  // ============================================================
  const renderAllExpenses = () => (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('expenses.stats.totalSpend', 'Total Spend This Month')}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">£12,450</p>
            </div>
            <div className="p-3 bg-momentum-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-momentum-500" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm text-green-600">
            <ArrowDownRight className="w-4 h-4 mr-1" />
            <span>{t('expenses.stats.downFromLast', '8% down from last month')}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('expenses.stats.pendingApprovals', 'Pending Approvals')}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('expenses.stats.avgProcessing', 'Avg Processing Time')}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{t('expenses.stats.days', '2.3 days')}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('expenses.stats.violations', 'Policy Violations')}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{violations}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('expenses.search', 'Search expenses...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
          >
            <option value="all">{t('expenses.filter.allStatuses', 'All Statuses')}</option>
            <option value="draft">{t('expenses.filter.draft', 'Draft')}</option>
            <option value="submitted">{t('expenses.filter.submitted', 'Submitted')}</option>
            <option value="approved">{t('expenses.filter.approved', 'Approved')}</option>
            <option value="rejected">{t('expenses.filter.rejected', 'Rejected')}</option>
            <option value="paid">{t('expenses.filter.paid', 'Paid')}</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
          >
            <option value="all">{t('expenses.filter.allCategories', 'All Categories')}</option>
            <option value="travel">{t('expenses.filter.travel', 'Travel')}</option>
            <option value="meals">{t('expenses.filter.meals', 'Meals')}</option>
            <option value="accommodation">{t('expenses.filter.accommodation', 'Accommodation')}</option>
            <option value="equipment">{t('expenses.filter.equipment', 'Equipment')}</option>
            <option value="mileage">{t('expenses.filter.mileage', 'Mileage')}</option>
            <option value="other">{t('expenses.filter.other', 'Other')}</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
            placeholder={t('expenses.filter.from', 'From')}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
            placeholder={t('expenses.filter.to', 'To')}
          />
          <input
            type="text"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            placeholder={t('expenses.filter.employee', 'Employee name...')}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500 min-w-[150px]"
          />
          <button
            onClick={() => setShowNewExpense(true)}
            className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('expenses.newExpense', 'New Expense')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.employee', 'Employee')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.title', 'Title')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.category', 'Category')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.merchant', 'Merchant')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.amount', 'Amount')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.date', 'Date')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.status', 'Status')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.receipt', 'Receipt')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => {
                const CategoryIcon = CATEGORY_ICONS[expense.category] || FileText;
                return (
                  <tr
                    key={expense.id}
                    onClick={() => setSelectedExpense(expense)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{expense.employee}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="w-4 h-4 text-slate-400" />
                        {expense.title}
                        {expense.policyViolation && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {t(`expenses.category.${expense.category}`, expense.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{expense.merchant}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                      {t('expenses.currency', '£')}{expense.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{expense.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[expense.status]}`}>
                        {t(`expenses.status.${expense.status}`, expense.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expense.hasReceipt ? (
                        <Receipt className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-xs text-slate-400">{t('expenses.noReceipt', 'None')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedExpense(expense); }}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
          {t('expenses.showing', 'Showing {{count}} expenses', { count: filteredExpenses.length })}
        </div>
      </div>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{t('expenses.detail.title', 'Expense Detail')}</h3>
              <button onClick={() => setSelectedExpense(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Header info */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">{selectedExpense.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{selectedExpense.employee} - {selectedExpense.date}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[selectedExpense.status]}`}>
                  {t(`expenses.status.${selectedExpense.status}`, selectedExpense.status)}
                </span>
              </div>

              {/* Amount */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{t('expenses.detail.amount', 'Amount')}</p>
                    <p className="text-2xl font-bold text-slate-900">£{selectedExpense.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('expenses.detail.category', 'Category')}</p>
                    <p className="text-lg font-medium text-slate-700 capitalize">{t(`expenses.category.${selectedExpense.category}`, selectedExpense.category)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('expenses.detail.merchant', 'Merchant')}</p>
                    <p className="text-sm font-medium text-slate-700">{selectedExpense.merchant}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('expenses.detail.report', 'Expense Report')}</p>
                    <p className="text-sm font-medium text-slate-700">{selectedExpense.report || t('expenses.detail.noReport', 'Not assigned')}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedExpense.notes && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">{t('expenses.detail.notes', 'Notes')}</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selectedExpense.notes}</p>
                </div>
              )}

              {/* Receipt viewer placeholder */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">{t('expenses.detail.receipt', 'Receipt')}</p>
                {selectedExpense.hasReceipt ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">{t('expenses.detail.receiptAttached', 'Receipt image attached')}</p>
                    <button className="mt-2 text-sm text-momentum-500 hover:text-momentum-600 font-medium">
                      {t('expenses.detail.viewReceipt', 'View Full Receipt')}
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-red-200 rounded-xl p-8 text-center bg-red-50">
                    <AlertTriangle className="w-10 h-10 text-red-300 mx-auto mb-2" />
                    <p className="text-sm text-red-600">{t('expenses.detail.noReceiptWarning', 'No receipt attached')}</p>
                  </div>
                )}
              </div>

              {/* Policy violation warning */}
              {selectedExpense.policyViolation && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">{t('expenses.detail.policyViolation', 'Policy Violation')}</p>
                    <p className="text-sm text-red-600 mt-1">{selectedExpense.violationReason}</p>
                  </div>
                </div>
              )}

              {/* Approval chain */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">{t('expenses.detail.approvalChain', 'Approval Chain')}</p>
                <div className="space-y-2">
                  {APPROVAL_CHAIN.map((step) => {
                    const isApplicable = step.limit === null || selectedExpense.amount <= step.limit;
                    const isPrevious = step.limit !== null && selectedExpense.amount > step.limit;
                    return (
                      <div key={step.level} className={`flex items-center gap-3 p-3 rounded-lg ${isApplicable && !isPrevious ? 'bg-momentum-50 border border-momentum-200' : 'bg-slate-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isApplicable && !isPrevious ? 'bg-momentum-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          {step.level}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{t(`expenses.approval.level${step.level}`, step.role)}</p>
                          <p className="text-xs text-slate-500">
                            {step.limit ? t('expenses.approval.upTo', 'Up to £{{limit}}', { limit: step.limit.toLocaleString() }) : t('expenses.approval.aboveThreshold', 'Above £2,000')}
                          </p>
                        </div>
                        {selectedExpense.status === 'approved' && isApplicable && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              {selectedExpense.status === 'submitted' && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleApprove(selectedExpense.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('expenses.action.approve', 'Approve')}
                  </button>
                  <button
                    onClick={() => handleReject(selectedExpense.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('expenses.action.reject', 'Reject')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  // TAB 2: EXPENSE REPORTS
  // ============================================================
  const renderExpenseReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{t('expenses.reports.title', 'Expense Reports')}</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium">
          <Plus className="w-4 h-4" />
          {t('expenses.reports.create', 'Create Report')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.reports.name', 'Report Name')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.reports.employee', 'Employee')}</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.reports.expenseCount', 'Expenses')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.reports.total', 'Total')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.reports.status', 'Status')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.reports.submitted', 'Submitted')}</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('expenses.reports.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_REPORTS.map((report) => (
              <tr
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-momentum-500" />
                    <span className="text-sm font-medium text-slate-900">{report.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{report.employee}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-center">{report.expenseCount}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">£{report.total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[report.status]}`}>
                    {t(`expenses.status.${report.status}`, report.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{report.submittedDate}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }} className="p-1 hover:bg-slate-100 rounded">
                    <Eye className="w-4 h-4 text-slate-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedReport.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedReport.employee} - {t('expenses.reports.submittedOn', 'Submitted on')} {selectedReport.submittedDate}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-sm text-slate-500">{t('expenses.reports.totalAmount', 'Total Amount')}</p>
                  <p className="text-2xl font-bold text-slate-900">£{selectedReport.total.toFixed(2)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[selectedReport.status]}`}>
                  {t(`expenses.status.${selectedReport.status}`, selectedReport.status)}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-700">{t('expenses.reports.includedExpenses', 'Included Expenses')}</h4>
              <div className="space-y-2">
                {expenses.filter(e => selectedReport.expenses.includes(e.id)).map((expense) => {
                  const CategoryIcon = CATEGORY_ICONS[expense.category] || FileText;
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{expense.title}</p>
                          <p className="text-xs text-slate-500">{expense.date} - {expense.merchant}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">£{expense.amount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  // TAB 3: APPROVALS
  // ============================================================
  const renderApprovals = () => {
    const pendingExpenses = expenses.filter(e => e.status === 'submitted');
    const inPolicyItems = pendingExpenses.filter(e => !e.policyViolation);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('expenses.approvals.title', 'Pending Approvals')}</h3>
            <p className="text-sm text-slate-500 mt-1">{t('expenses.approvals.count', '{{count}} expenses awaiting approval', { count: pendingExpenses.length })}</p>
          </div>
          {inPolicyItems.length > 0 && (
            <button
              onClick={() => inPolicyItems.forEach(e => handleApprove(e.id))}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              {t('expenses.approvals.approveAll', 'Approve All In-Policy ({{count}})', { count: inPolicyItems.length })}
            </button>
          )}
        </div>

        {pendingExpenses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-700">{t('expenses.approvals.allClear', 'All caught up!')}</p>
            <p className="text-sm text-slate-500 mt-1">{t('expenses.approvals.noPending', 'No expenses pending approval.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingExpenses.map((expense) => {
              const CategoryIcon = CATEGORY_ICONS[expense.category] || FileText;
              return (
                <div key={expense.id} className={`bg-white rounded-xl border ${expense.policyViolation ? 'border-red-200' : 'border-slate-200'} p-5`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${expense.policyViolation ? 'bg-red-50' : 'bg-momentum-50'}`}>
                        <CategoryIcon className={`w-5 h-5 ${expense.policyViolation ? 'text-red-500' : 'text-momentum-500'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{expense.title}</p>
                        <p className="text-xs text-slate-500">{expense.employee} - {expense.date}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-slate-900">£{expense.amount.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
                    <span className="capitalize">{t(`expenses.category.${expense.category}`, expense.category)}</span>
                    <span className="text-slate-300">|</span>
                    <span>{expense.merchant}</span>
                    {expense.hasReceipt && (
                      <>
                        <span className="text-slate-300">|</span>
                        <Receipt className="w-3.5 h-3.5 text-green-500" />
                      </>
                    )}
                  </div>

                  {expense.policyViolation && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-red-700">{expense.violationReason}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(expense.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      <Check className="w-4 h-4" />
                      {t('expenses.action.approve', 'Approve')}
                    </button>
                    <button
                      onClick={() => handleReject(expense.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium border border-red-200"
                    >
                      <XCircle className="w-4 h-4" />
                      {t('expenses.action.reject', 'Reject')}
                    </button>
                    <button
                      onClick={() => setSelectedExpense(expense)}
                      className="p-2 hover:bg-slate-100 rounded-lg border border-slate-200"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // TAB 4: BUDGETS
  // ============================================================
  const renderBudgets = () => {
    const [showSetBudget, setShowSetBudget] = useState(false);

    const getTrafficLight = (utilisation) => {
      if (utilisation > 90) return { color: 'bg-red-500', label: t('expenses.budgets.overBudget', 'Over Budget'), textColor: 'text-red-700', bgColor: 'bg-red-50' };
      if (utilisation > 75) return { color: 'bg-amber-500', label: t('expenses.budgets.caution', 'Caution'), textColor: 'text-amber-700', bgColor: 'bg-amber-50' };
      return { color: 'bg-green-500', label: t('expenses.budgets.onTrack', 'On Track'), textColor: 'text-green-700', bgColor: 'bg-green-50' };
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('expenses.budgets.title', 'Department Budgets')}</h3>
            <p className="text-sm text-slate-500 mt-1">{t('expenses.budgets.subtitle', 'Budget vs Actual spend by department')}</p>
          </div>
          <button
            onClick={() => setShowSetBudget(!showSetBudget)}
            className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            {t('expenses.budgets.setBudget', 'Set Budget')}
          </button>
        </div>

        <div className="space-y-4">
          {DEMO_BUDGETS.map((dept) => {
            const traffic = getTrafficLight(dept.utilisation);
            return (
              <div key={dept.department} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{dept.department}</h4>
                      <p className="text-xs text-slate-500">
                        £{dept.actual.toLocaleString()} {t('expenses.budgets.of', 'of')} £{dept.budget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${traffic.bgColor} ${traffic.textColor}`}>
                      <span className={`w-2 h-2 rounded-full ${traffic.color}`} />
                      {traffic.label}
                    </span>
                    <span className="text-lg font-bold text-slate-900">{dept.utilisation}%</span>
                  </div>
                </div>
                {/* Bar chart visualization */}
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dept.utilisation > 90 ? 'bg-red-500' : dept.utilisation > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(dept.utilisation, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>£0</span>
                  <span>£{(dept.budget * 0.5).toLocaleString()}</span>
                  <span>£{dept.budget.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">{t('expenses.budgets.summary', 'Budget Summary')}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">£{DEMO_BUDGETS.reduce((s, d) => s + d.budget, 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{t('expenses.budgets.totalBudget', 'Total Budget')}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">£{DEMO_BUDGETS.reduce((s, d) => s + d.actual, 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{t('expenses.budgets.totalSpent', 'Total Spent')}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">£{DEMO_BUDGETS.reduce((s, d) => s + (d.budget - d.actual), 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{t('expenses.budgets.remaining', 'Remaining')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // TAB 5: POLICY
  // ============================================================
  const renderPolicy = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{t('expenses.policy.title', 'Expense Policy')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t('expenses.policy.subtitle', 'Rules governing expense submissions and approvals')}</p>
        </div>
        <button
          onClick={() => setEditingPolicy(!editingPolicy)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${editingPolicy ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-momentum-500 text-white hover:bg-momentum-600'}`}
        >
          {editingPolicy ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          {editingPolicy ? t('expenses.policy.save', 'Save Changes') : t('expenses.policy.edit', 'Edit Policy')}
        </button>
      </div>

      {/* Category Limits */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900">{t('expenses.policy.categoryLimits', 'Category Limits')}</h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.policy.category', 'Category')}</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.policy.limit', 'Per-Transaction Limit')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {POLICY_LIMITS.map((rule) => (
              <tr key={rule.category}>
                <td className="px-5 py-3 text-sm font-medium text-slate-700">{t(`expenses.policy.cat.${rule.category.toLowerCase()}`, rule.category)}</td>
                <td className="px-5 py-3 text-sm text-right">
                  {editingPolicy ? (
                    <input type="number" defaultValue={rule.limit} className="w-24 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-momentum-500" />
                  ) : (
                    <span className="font-semibold text-slate-900">£{rule.limit.toLocaleString()}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* General Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('expenses.policy.generalRules', 'General Rules')}</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{t('expenses.policy.receiptRequired', 'Receipt Required Above')}</p>
                <p className="text-xs text-slate-500">{t('expenses.policy.receiptNote', 'All expenses above this amount require a receipt')}</p>
              </div>
              {editingPolicy ? (
                <input type="number" defaultValue={25} className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-momentum-500" />
              ) : (
                <span className="text-lg font-bold text-slate-900">£25</span>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{t('expenses.policy.autoApprove', 'Auto-Approve Below')}</p>
                <p className="text-xs text-slate-500">{t('expenses.policy.autoApproveNote', 'Expenses below this are auto-approved')}</p>
              </div>
              {editingPolicy ? (
                <input type="number" defaultValue={15} className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-momentum-500" />
              ) : (
                <span className="text-lg font-bold text-slate-900">£15</span>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{t('expenses.policy.mileageRate', 'Mileage Rate')}</p>
                <p className="text-xs text-slate-500">{t('expenses.policy.mileageRateNote', 'HMRC approved mileage rate')}</p>
              </div>
              {editingPolicy ? (
                <input type="number" defaultValue={0.45} step="0.01" className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-momentum-500" />
              ) : (
                <span className="text-lg font-bold text-slate-900">£0.45<span className="text-sm text-slate-500 font-normal">/mile</span></span>
              )}
            </div>
          </div>
        </div>

        {/* Approval Chain */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('expenses.policy.approvalChain', 'Approval Chain')}</h4>
          <div className="space-y-3">
            {APPROVAL_CHAIN.map((step, idx) => (
              <div key={step.level} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-momentum-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {step.level}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{t(`expenses.policy.role.${step.level}`, step.role)}</p>
                  <p className="text-xs text-slate-500">
                    {step.limit
                      ? t('expenses.policy.upTo', 'Up to £{{amount}}', { amount: step.limit.toLocaleString() })
                      : t('expenses.policy.above', 'Above £2,000')
                    }
                  </p>
                </div>
                {idx < APPROVAL_CHAIN.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per Diem Rates */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900">{t('expenses.policy.perDiem', 'Per Diem Rates by Country')}</h4>
          <p className="text-xs text-slate-500 mt-1">{t('expenses.policy.perDiemNote', 'Daily allowance for meals and incidentals while travelling')}</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.policy.country', 'Country')}</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.policy.dailyRate', 'Daily Rate')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PER_DIEM_RATES.map((rate) => (
              <tr key={rate.country}>
                <td className="px-5 py-3 text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {rate.country}
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-right">
                  {editingPolicy ? (
                    <input type="number" defaultValue={rate.rate} className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-momentum-500" />
                  ) : (
                    <span className="font-semibold text-slate-900">£{rate.rate}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================
  // TAB 6: DASHBOARD
  // ============================================================
  const renderDashboard = () => {
    const spendByCategory = [
      { category: 'Travel', amount: 4200, color: 'bg-blue-500', pct: 34 },
      { category: 'Meals', amount: 2100, color: 'bg-green-500', pct: 17 },
      { category: 'Accommodation', amount: 3200, color: 'bg-purple-500', pct: 26 },
      { category: 'Equipment', amount: 1500, color: 'bg-amber-500', pct: 12 },
      { category: 'Mileage', amount: 850, color: 'bg-pink-500', pct: 7 },
      { category: 'Other', amount: 600, color: 'bg-slate-400', pct: 4 },
    ];

    const spendByDept = [
      { department: 'Sales', amount: 5200 },
      { department: 'Engineering', amount: 3100 },
      { department: 'Marketing', amount: 2200 },
      { department: 'HR', amount: 1200 },
      { department: 'Operations', amount: 750 },
    ];
    const maxDeptSpend = Math.max(...spendByDept.map(d => d.amount));

    const topSpenders = [
      { name: 'Sarah Mitchell', department: 'Sales', total: 3420, count: 12 },
      { name: 'James Cooper', department: 'Sales', total: 2890, count: 8 },
      { name: 'Emily Watson', department: 'Engineering', total: 2150, count: 6 },
      { name: 'David Chen', department: 'Marketing', total: 1580, count: 9 },
      { name: 'Rachel Green', department: 'HR', total: 920, count: 4 },
    ];

    const monthlyTrend = [
      { month: 'Aug', amount: 9800 },
      { month: 'Sep', amount: 11200 },
      { month: 'Oct', amount: 10500 },
      { month: 'Nov', amount: 13800 },
      { month: 'Dec', amount: 8900 },
      { month: 'Jan', amount: 12450 },
    ];
    const maxMonthly = Math.max(...monthlyTrend.map(m => m.amount));

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('expenses.dashboard.totalSpend', 'Total Spend')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">£12,450</p>
              </div>
              <div className="p-3 bg-momentum-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-momentum-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('expenses.dashboard.pending', 'Pending')}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{pendingCount}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('expenses.dashboard.avgTime', 'Avg Time')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{t('expenses.dashboard.daysValue', '2.3 days')}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('expenses.dashboard.violations', 'Violations')}</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{violations}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spend by Category */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('expenses.dashboard.spendByCategory', 'Spend by Category')}</h4>
            <div className="space-y-3">
              {spendByCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{t(`expenses.dashboard.cat.${cat.category.toLowerCase()}`, cat.category)}</span>
                    <span className="text-sm font-semibold text-slate-900">£{cat.amount.toLocaleString()} ({cat.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`${cat.color} h-2.5 rounded-full`} style={{ width: `${cat.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spend by Department */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('expenses.dashboard.spendByDept', 'Spend by Department')}</h4>
            <div className="space-y-3">
              {spendByDept.map((dept) => (
                <div key={dept.department} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 w-24 flex-shrink-0">{dept.department}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-momentum-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(dept.amount / maxDeptSpend) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">£{dept.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Spenders */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900">{t('expenses.dashboard.topSpenders', 'Top Spenders')}</h4>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.dashboard.rank', '#')}</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.dashboard.employee', 'Employee')}</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.dashboard.department', 'Department')}</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.dashboard.claims', 'Claims')}</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('expenses.dashboard.total', 'Total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topSpenders.map((person, idx) => (
                <tr key={person.name} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-5 py-3 text-sm font-medium text-slate-900">{person.name}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{person.department}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 text-center">{person.count}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900 text-right">£{person.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('expenses.dashboard.monthlyTrend', 'Monthly Spend Trend')}</h4>
          <div className="flex items-end gap-3 h-48">
            {monthlyTrend.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs font-semibold text-slate-700 mb-1">£{(month.amount / 1000).toFixed(1)}k</span>
                <div
                  className="w-full bg-momentum-500 rounded-t-lg transition-all hover:bg-momentum-600"
                  style={{ height: `${(month.amount / maxMonthly) * 100}%` }}
                />
                <span className="text-xs text-slate-500 mt-2">{month.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('expenses.title', 'Expenses')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('expenses.subtitle', 'Manage expense claims, approvals, budgets and policy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
            <Download className="w-4 h-4" />
            {t('expenses.export', 'Export')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {(isManager ? TABS : TABS.filter(t => ['all', 'reports'].includes(t.id))).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-momentum-500 text-momentum-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey, tab.id)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && renderAllExpenses()}
      {activeTab === 'reports' && renderExpenseReports()}
      {activeTab === 'approvals' && renderApprovals()}
      {activeTab === 'budgets' && renderBudgets()}
      {activeTab === 'policy' && renderPolicy()}
      {activeTab === 'dashboard' && renderDashboard()}
    </div>
  );
}
