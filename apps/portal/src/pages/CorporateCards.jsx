// ============================================================
// CORPORATE CARDS PAGE
// HSBC Integration via TrueLayer Open Banking
// Card transactions, expense claims, and payroll export
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  corporateCardsApi,
  cardTransactionsApi,
  expenseClaimsApi,
  payrollExpensesApi,
  expenseCategoriesApi,
  trueLayerApi,
} from '../lib/api';
import {
  CreditCard, Receipt, CheckCircle, XCircle, Clock, AlertTriangle,
  Search, Plus, X, Eye, Download, Upload, RefreshCw, Link2, Unlink,
  ChevronRight, FileText, DollarSign, Building2, Calendar,
  Check, Filter, MoreVertical, ExternalLink, Loader2, Banknote,
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-700',
  uncategorized: 'bg-amber-100 text-amber-700',
  categorized: 'bg-blue-100 text-blue-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-purple-100 text-purple-700',
};

const TABS = [
  { id: 'transactions', labelKey: 'corporateCards.tabs.transactions', icon: CreditCard },
  { id: 'claims', labelKey: 'corporateCards.tabs.claims', icon: FileText },
  { id: 'payroll', labelKey: 'corporateCards.tabs.payroll', icon: Banknote },
  { id: 'cards', labelKey: 'corporateCards.tabs.cards', icon: CreditCard },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CorporateCards() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const isFinance = user?.role === 'admin' || user?.permissions?.includes('finance');

  // Tab state
  const [activeTab, setActiveTab] = useState('transactions');

  // Data states
  const [transactions, setTransactions] = useState([]);
  const [claims, setClaims] = useState([]);
  const [payrollClaims, setPayrollClaims] = useState([]);
  const [payrollExports, setPayrollExports] = useState([]);
  const [cards, setCards] = useState([]);
  const [connections, setConnections] = useState([]);
  const [categories, setCategories] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Selection and modal states
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showSubmitClaim, setShowSubmitClaim] = useState(false);
  const [showClaimDetail, setShowClaimDetail] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ============================================================
  // DATA FETCHING
  // ============================================================

  const fetchTransactions = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const result = await cardTransactionsApi.list(params);
      setTransactions(result.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err.message);
    }
  }, [statusFilter, dateFrom, dateTo]);

  const fetchClaims = useCallback(async () => {
    try {
      const result = await expenseClaimsApi.list();
      setClaims(result.claims || []);
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    }
  }, []);

  const fetchPayrollData = useCallback(async () => {
    try {
      const [claimsResult, exportsResult] = await Promise.all([
        payrollExpensesApi.list({ status: 'approved' }),
        payrollExpensesApi.getExports(),
      ]);
      setPayrollClaims(claimsResult.claims || []);
      setPayrollExports(exportsResult.exports || []);
    } catch (err) {
      console.error('Failed to fetch payroll data:', err);
    }
  }, []);

  const fetchCards = useCallback(async () => {
    try {
      const [cardsResult, connectionsResult] = await Promise.all([
        corporateCardsApi.list(),
        trueLayerApi.getConnections(),
      ]);
      setCards(cardsResult.cards || []);
      setConnections(connectionsResult.connections || []);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await expenseCategoriesApi.list();
      setCategories(result.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchTransactions(),
          fetchClaims(),
          fetchCategories(),
          fetchCards(),
        ]);
        if (isFinance) {
          await fetchPayrollData();
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchTransactions, fetchClaims, fetchCategories, fetchCards, fetchPayrollData, isFinance]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleSyncTransactions = async (connectionId) => {
    setSyncing(true);
    try {
      await trueLayerApi.syncTransactions(connectionId);
      await fetchTransactions();
    } catch (err) {
      setError('Failed to sync transactions: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectBank = async () => {
    try {
      const result = await trueLayerApi.getConnectUrl(window.location.origin + '/integrations/truelayer/callback');
      window.location.href = result.authUrl;
    } catch (err) {
      setError('Failed to initiate bank connection: ' + err.message);
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!confirm(t('corporateCards.confirmDisconnect', 'Are you sure you want to disconnect this bank connection?'))) return;
    try {
      await trueLayerApi.disconnect(connectionId);
      await fetchCards();
    } catch (err) {
      setError('Failed to disconnect: ' + err.message);
    }
  };

  const handleSubmitClaim = async () => {
    if (selectedTransactions.length === 0) return;
    try {
      await expenseClaimsApi.submit({ transactionIds: selectedTransactions });
      setSelectedTransactions([]);
      setShowSubmitClaim(false);
      await Promise.all([fetchTransactions(), fetchClaims()]);
    } catch (err) {
      setError('Failed to submit claim: ' + err.message);
    }
  };

  const handleReviewClaim = async (claimId, action, notes = '') => {
    try {
      await expenseClaimsApi.review(claimId, { action, notes });
      await Promise.all([fetchClaims(), fetchPayrollData()]);
      setShowClaimDetail(false);
    } catch (err) {
      setError('Failed to review claim: ' + err.message);
    }
  };

  const handleExportToPayroll = async (claimIds) => {
    try {
      await payrollExpensesApi.export({ claimIds });
      await fetchPayrollData();
      setShowExportModal(false);
    } catch (err) {
      setError('Failed to export to payroll: ' + err.message);
    }
  };

  const handleUpdateTransaction = async (id, data) => {
    try {
      await cardTransactionsApi.update(id, data);
      await fetchTransactions();
    } catch (err) {
      setError('Failed to update transaction: ' + err.message);
    }
  };

  // ============================================================
  // FILTERING
  // ============================================================

  const filteredTransactions = transactions.filter(tx => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!tx.description?.toLowerCase().includes(query) &&
          !tx.merchant_name?.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  // ============================================================
  // TAB 1: TRANSACTIONS
  // ============================================================

  const renderTransactions = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('corporateCards.stats.totalTransactions', 'Total Transactions')}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{transactions.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('corporateCards.stats.pendingReview', 'Pending Review')}</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {transactions.filter(t => t.status === 'uncategorized').length}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('corporateCards.stats.totalAmount', 'Total Amount')}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                £{transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('corporateCards.stats.selected', 'Selected')}</p>
              <p className="text-2xl font-bold text-momentum-600 mt-1">{selectedTransactions.length}</p>
            </div>
            <div className="p-3 bg-momentum-50 rounded-lg">
              <Check className="w-5 h-5 text-momentum-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('corporateCards.searchTransactions', 'Search transactions...')}
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
            <option value="all">{t('corporateCards.filter.allStatuses', 'All Statuses')}</option>
            <option value="uncategorized">{t('corporateCards.filter.uncategorized', 'Uncategorized')}</option>
            <option value="categorized">{t('corporateCards.filter.categorized', 'Categorized')}</option>
            <option value="submitted">{t('corporateCards.filter.submitted', 'Submitted')}</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
          />
          {connections.length > 0 && (
            <button
              onClick={() => handleSyncTransactions(connections[0].id)}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {t('corporateCards.sync', 'Sync')}
            </button>
          )}
          {selectedTransactions.length > 0 && (
            <button
              onClick={() => setShowSubmitClaim(true)}
              className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium"
            >
              <Receipt className="w-4 h-4" />
              {t('corporateCards.submitClaim', 'Submit Claim')} ({selectedTransactions.length})
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.length === filteredTransactions.filter(t => t.status !== 'submitted').length && filteredTransactions.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTransactions(filteredTransactions.filter(t => t.status !== 'submitted').map(t => t.id));
                      } else {
                        setSelectedTransactions([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-momentum-500 focus:ring-momentum-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.table.date', 'Date')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.table.description', 'Description')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.table.merchant', 'Merchant')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.table.category', 'Category')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.table.amount', 'Amount')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.table.status', 'Status')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.table.receipt', 'Receipt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-momentum-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">{t('corporateCards.loading', 'Loading transactions...')}</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium mb-2">
                      {connections.length === 0
                        ? t('corporateCards.noConnection', 'No bank connected')
                        : t('corporateCards.noTransactions', 'No transactions found')}
                    </p>
                    <p className="text-slate-500 text-sm mb-4">
                      {connections.length === 0
                        ? t('corporateCards.connectBankHint', 'Connect your corporate card via TrueLayer to see transactions')
                        : t('corporateCards.syncHint', 'Try syncing or adjusting your filters')}
                    </p>
                    {connections.length === 0 && (
                      <button
                        onClick={handleConnectBank}
                        className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium mx-auto"
                      >
                        <Link2 className="w-4 h-4" />
                        {t('corporateCards.connectBank', 'Connect Bank')}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(tx.id)}
                        disabled={tx.status === 'submitted'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactions([...selectedTransactions, tx.id]);
                          } else {
                            setSelectedTransactions(selectedTransactions.filter(id => id !== tx.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-momentum-500 focus:ring-momentum-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(tx.transaction_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{tx.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{tx.merchant_name || '-'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={tx.category_id || ''}
                        onChange={(e) => handleUpdateTransaction(tx.id, { category_id: e.target.value || null })}
                        disabled={tx.status === 'submitted'}
                        className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-momentum-500 disabled:opacity-50"
                      >
                        <option value="">{t('corporateCards.selectCategory', 'Select category')}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                      £{Math.abs(parseFloat(tx.amount) || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[tx.status] || STATUS_STYLES.pending}`}>
                        {t(`corporateCards.status.${tx.status}`, tx.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.receipt_url ? (
                        <Receipt className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <button
                          className="text-xs text-momentum-500 hover:text-momentum-600"
                          onClick={() => {/* TODO: Upload receipt */}}
                        >
                          <Upload className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Claim Modal */}
      {showSubmitClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{t('corporateCards.submitClaimTitle', 'Submit Expense Claim')}</h3>
              <button onClick={() => setShowSubmitClaim(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                {t('corporateCards.submitClaimDesc', 'You are about to submit {{count}} transaction(s) as an expense claim.', { count: selectedTransactions.length })}
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('corporateCards.totalAmount', 'Total Amount')}</span>
                  <span className="font-semibold text-slate-900">
                    £{transactions
                      .filter(t => selectedTransactions.includes(t.id))
                      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowSubmitClaim(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSubmitClaim}
                className="flex-1 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium"
              >
                {t('corporateCards.submit', 'Submit Claim')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  // TAB 2: CLAIMS
  // ============================================================

  const renderClaims = () => (
    <div className="space-y-6">
      {/* Claims List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.claims.number', 'Claim #')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.claims.employee', 'Employee')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.claims.date', 'Date')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.claims.items', 'Items')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.claims.amount', 'Amount')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.claims.status', 'Status')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.claims.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium mb-2">{t('corporateCards.noClaims', 'No expense claims')}</p>
                    <p className="text-slate-500 text-sm">{t('corporateCards.noClaimsHint', 'Claims will appear here once you submit transactions')}</p>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-momentum-600">{claim.claim_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{claim.employee_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(claim.expense_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-center">{claim.transaction_count}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                      £{parseFloat(claim.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[claim.status]}`}>
                        {t(`corporateCards.status.${claim.status}`, claim.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setSelectedClaim(claim); setShowClaimDetail(true); }}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Detail Modal */}
      {showClaimDetail && selectedClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedClaim.claim_number}</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedClaim.employee_name}</p>
              </div>
              <button onClick={() => setShowClaimDetail(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-sm text-slate-500">{t('corporateCards.claims.totalAmount', 'Total Amount')}</p>
                  <p className="text-2xl font-bold text-slate-900">£{parseFloat(selectedClaim.total_amount).toFixed(2)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[selectedClaim.status]}`}>
                  {t(`corporateCards.status.${selectedClaim.status}`, selectedClaim.status)}
                </span>
              </div>

              {selectedClaim.description && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">{t('corporateCards.claims.description', 'Description')}</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selectedClaim.description}</p>
                </div>
              )}

              {/* Manager review actions */}
              {isManager && selectedClaim.status === 'submitted' && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleReviewClaim(selectedClaim.id, 'approve')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('corporateCards.approve', 'Approve')}
                  </button>
                  <button
                    onClick={() => handleReviewClaim(selectedClaim.id, 'reject')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('corporateCards.reject', 'Reject')}
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
  // TAB 3: PAYROLL
  // ============================================================

  const renderPayroll = () => (
    <div className="space-y-6">
      {/* Approved Claims Ready for Export */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('corporateCards.payroll.approved', 'Approved Claims')}</h3>
            <p className="text-sm text-slate-500">{t('corporateCards.payroll.approvedDesc', 'Claims ready to be exported to payroll')}</p>
          </div>
          {payrollClaims.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              {t('corporateCards.payroll.export', 'Export to Payroll')}
            </button>
          )}
        </div>

        {payrollClaims.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">{t('corporateCards.payroll.noPending', 'No claims pending export')}</p>
            <p className="text-slate-500 text-sm">{t('corporateCards.payroll.noPendingDesc', 'Approved claims will appear here')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payrollClaims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{claim.claim_number}</p>
                    <p className="text-xs text-slate-500">{claim.employee_name}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-900">£{parseFloat(claim.total_amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">{t('corporateCards.payroll.history', 'Export History')}</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.payroll.exportDate', 'Export Date')}</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.payroll.claims', 'Claims')}</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.payroll.total', 'Total')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.payroll.exportedBy', 'Exported By')}</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.payroll.download', 'Download')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payrollExports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                  {t('corporateCards.payroll.noExports', 'No exports yet')}
                </td>
              </tr>
            ) : (
              payrollExports.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm text-slate-900">
                    {new Date(exp.export_date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 text-center">{exp.claims_count}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900 text-right">
                    £{parseFloat(exp.total_amount).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{exp.exported_by_name}</td>
                  <td className="px-5 py-3 text-center">
                    <a
                      href={payrollExpensesApi.downloadExport(exp.id)}
                      className="inline-flex items-center gap-1 text-sm text-momentum-500 hover:text-momentum-600"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{t('corporateCards.payroll.exportTitle', 'Export to Payroll')}</h3>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                {t('corporateCards.payroll.exportDesc', 'This will export {{count}} approved claims totalling £{{total}} to payroll.', {
                  count: payrollClaims.length,
                  total: payrollClaims.reduce((sum, c) => sum + parseFloat(c.total_amount), 0).toFixed(2),
                })}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  {t('corporateCards.payroll.exportWarning', 'Claims will be marked as paid and cannot be modified after export.')}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleExportToPayroll(payrollClaims.map(c => c.id))}
                className="flex-1 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium"
              >
                {t('corporateCards.payroll.confirmExport', 'Export')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  // TAB 4: CARDS (Admin)
  // ============================================================

  const renderCards = () => (
    <div className="space-y-6">
      {/* Bank Connections */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('corporateCards.cards.connections', 'Bank Connections')}</h3>
            <p className="text-sm text-slate-500">{t('corporateCards.cards.connectionsDesc', 'Connect your corporate card accounts via TrueLayer')}</p>
          </div>
          <button
            onClick={handleConnectBank}
            className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium"
          >
            <Link2 className="w-4 h-4" />
            {t('corporateCards.cards.connect', 'Connect Bank')}
          </button>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">{t('corporateCards.cards.noConnections', 'No bank connections')}</p>
            <p className="text-slate-500 text-sm">{t('corporateCards.cards.noConnectionsDesc', 'Connect HSBC or other supported banks via TrueLayer')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <Building2 className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{conn.provider_name}</p>
                    <p className="text-xs text-slate-500">
                      {t('corporateCards.cards.connected', 'Connected')} {new Date(conn.connected_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    conn.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${conn.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    {conn.status === 'active' ? t('corporateCards.cards.active', 'Active') : t('corporateCards.cards.expired', 'Expired')}
                  </span>
                  <button
                    onClick={() => handleSyncTransactions(conn.id)}
                    disabled={syncing}
                    className="p-2 hover:bg-white rounded-lg border border-slate-200"
                    title={t('corporateCards.sync', 'Sync')}
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-500 ${syncing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    className="p-2 hover:bg-red-50 rounded-lg border border-slate-200"
                    title={t('corporateCards.cards.disconnect', 'Disconnect')}
                  >
                    <Unlink className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Corporate Cards List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">{t('corporateCards.cards.list', 'Corporate Cards')}</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.cards.cardNumber', 'Card')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.cards.holder', 'Card Holder')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.cards.type', 'Type')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.cards.status', 'Status')}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('corporateCards.cards.lastSync', 'Last Sync')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cards.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                  {t('corporateCards.cards.noCards', 'No cards found. Connect a bank to sync corporate cards.')}
                </td>
              </tr>
            ) : (
              cards.map((card) => (
                <tr key={card.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-medium text-slate-900">
                    •••• {card.last_four}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{card.cardholder_name}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 capitalize">{card.card_type}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      card.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {card.is_active ? t('corporateCards.cards.active', 'Active') : t('corporateCards.cards.inactive', 'Inactive')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {card.last_synced_at ? new Date(card.last_synced_at).toLocaleString('en-GB') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  // Determine visible tabs based on role
  const visibleTabs = isFinance
    ? TABS
    : TABS.filter(tab => tab.id !== 'payroll' && tab.id !== 'cards');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('corporateCards.title', 'Corporate Cards')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('corporateCards.subtitle', 'Manage corporate card transactions and expense claims')}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{t('common.error', 'Error')}</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {visibleTabs.map((tab) => {
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
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'claims' && renderClaims()}
      {activeTab === 'payroll' && isFinance && renderPayroll()}
      {activeTab === 'cards' && isFinance && renderCards()}
    </div>
  );
}
