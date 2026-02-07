import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, Activity, LogOut, AlertTriangle, CheckCircle, XCircle, Clock, Users, TrendingUp, DollarSign, Calendar, Search, Edit, Plus, RefreshCw, ExternalLink, Eye, Key, Copy, X, ChevronRight, Settings, Shield, Zap, Crown, ArrowLeft, MapPin, ToggleLeft } from 'lucide-react';
import { apiFetch } from './api.js';

// ==================== CURRENCY ====================

const CURRENCIES = {
  GBP: { symbol: '£', code: 'GBP', locale: 'en-GB' },
  USD: { symbol: '$', code: 'USD', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', locale: 'de-DE' },
  CAD: { symbol: 'CA$', code: 'CAD', locale: 'en-CA' },
  AUD: { symbol: 'A$', code: 'AUD', locale: 'en-AU' },
  JPY: { symbol: '¥', code: 'JPY', locale: 'ja-JP', decimals: 0 },
  CHF: { symbol: 'CHF', code: 'CHF', locale: 'de-CH' },
  SEK: { symbol: 'kr', code: 'SEK', locale: 'sv-SE' },
  NOK: { symbol: 'kr', code: 'NOK', locale: 'nb-NO' },
  DKK: { symbol: 'kr', code: 'DKK', locale: 'da-DK' },
  SGD: { symbol: 'S$', code: 'SGD', locale: 'en-SG' },
  NZD: { symbol: 'NZ$', code: 'NZD', locale: 'en-NZ' },
  BRL: { symbol: 'R$', code: 'BRL', locale: 'pt-BR' },
  INR: { symbol: '₹', code: 'INR', locale: 'en-IN' },
  ZAR: { symbol: 'R', code: 'ZAR', locale: 'en-ZA' },
  MXN: { symbol: 'MX$', code: 'MXN', locale: 'es-MX' },
  AED: { symbol: 'د.إ', code: 'AED', locale: 'ar-AE' },
  PLN: { symbol: 'zł', code: 'PLN', locale: 'pl-PL' },
  RON: { symbol: 'lei', code: 'RON', locale: 'ro-RO' },
};

const CurrencyContext = createContext({ currency: 'GBP', rates: {}, setCurrency: () => {} });
function useCurrency() { return useContext(CurrencyContext); }

function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem('ops_currency') || 'GBP');
  const [rates, setRates] = useState({});

  useEffect(() => {
    localStorage.setItem('ops_currency', currency);
  }, [currency]);

  useEffect(() => {
    apiFetch('/api/ops/fx-rates').then(data => setRates(data.rates || {})).catch(() => {});
  }, []);

  return <CurrencyContext.Provider value={{ currency, setCurrency, rates }}>{children}</CurrencyContext.Provider>;
}

/** Format amount in minor units (pence/cents) to display currency. sourceCurrency defaults to GBP (backend stores in pence). */
function formatMoney(amountMinor, { currency = 'GBP', rates = {}, sourceCurrency = 'GBP', decimals } = {}) {
  const cur = CURRENCIES[currency] || CURRENCIES.GBP;
  const dec = decimals ?? cur.decimals ?? 2;
  let amount = (amountMinor || 0) / (cur.decimals === 0 ? 1 : 100);

  // Convert if display currency differs from source
  if (currency !== sourceCurrency && rates[currency] && rates[sourceCurrency]) {
    amount = amount * (rates[currency] / rates[sourceCurrency]);
  } else if (currency !== sourceCurrency && rates[currency]) {
    // rates keyed relative to GBP
    amount = amount * rates[currency];
  }

  return new Intl.NumberFormat(cur.locale, {
    style: 'currency',
    currency: cur.code,
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(amount);
}

function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  return (
    <select value={currency} onChange={e => setCurrency(e.target.value)}
      className="bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1 text-sm focus:ring-orange-500">
      {Object.keys(CURRENCIES).map(c => (
        <option key={c} value={c}>{CURRENCIES[c].symbol} {c}</option>
      ))}
    </select>
  );
}

// ==================== AUTH ====================

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ops_token');
    if (token) {
      apiFetch('/api/ops/auth/me')
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('ops_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${API_BASE}/api/ops/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    localStorage.setItem('ops_token', data.token);
    setUser(data.user);
  };

  const logout = () => { localStorage.removeItem('ops_token'); setUser(null); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

// ==================== LAYOUT ====================

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/onboard', label: 'Onboarding', icon: Plus },
    { path: '/customers', label: 'Customers', icon: Building2 },
    { path: '/licenses', label: 'Licenses', icon: Key },
    { path: '/features', label: 'Features', icon: ToggleLeft },
    { path: '/billing', label: 'Billing', icon: CreditCard },
    { path: '/activity', label: 'Activity', icon: Activity },
  ];

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-orange-500">Uplift Ops</h1>
            <nav className="flex gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${isActive(item.path) ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                    <Icon className="w-4 h-4" />{item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <CurrencySelector />
            <span className="text-sm text-slate-400">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{user?.role}</span>
            <button onClick={logout} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

// ==================== SHARED COMPONENTS ====================

function MetricCard({ label, value, color, icon: Icon }) {
  const colors = { green: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700', orange: 'bg-orange-50 text-orange-700', red: 'bg-red-50 text-red-700' };
  return (
    <div className={`rounded-xl p-6 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm opacity-80">{label}</p>
        {Icon && <Icon className="w-5 h-5 opacity-60" />}
      </div>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = { active: 'bg-green-100 text-green-800', trialing: 'bg-blue-100 text-blue-800', past_due: 'bg-red-100 text-red-800', canceled: 'bg-slate-100 text-slate-600', paid: 'bg-green-100 text-green-800', open: 'bg-amber-100 text-amber-800', void: 'bg-slate-100 text-slate-500', expired: 'bg-red-100 text-red-800', suspended: 'bg-amber-100 text-amber-800', revoked: 'bg-red-100 text-red-800' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{status || 'none'}</span>;
}

function HealthBadge({ score, risk }) {
  if (!score) return <span className="text-slate-400">-</span>;
  const colors = { low: 'text-green-600', medium: 'text-amber-600', high: 'text-red-600' };
  return <span className={colors[risk] || 'text-slate-600'}>{score}/100</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'} w-full max-h-[90vh] overflow-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>{children}</div>;
}

const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm";
const btnPrimary = "px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm disabled:opacity-50";
const btnSecondary = "px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm";
const btnDanger = "px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm disabled:opacity-50";

// ==================== LOGIN ====================

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try { await login(email, password); navigate('/'); }
    catch { setError('Invalid credentials'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Uplift Ops Portal</h1>
        <p className="text-slate-500 mb-6">Internal operations dashboard</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
          <FormField label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
          </FormField>
          <FormField label="Password">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
          </FormField>
          <button type="submit" disabled={loading} className={`w-full ${btnPrimary}`}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==================== DASHBOARD ====================

function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currency, rates } = useCurrency();
  const fmt = (v) => formatMoney(v, { currency, rates });

  useEffect(() => {
    apiFetch('/api/ops/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard...</div>;

  const m = data?.metrics || {};

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Monthly Recurring Revenue" value={fmt(m.mrr)} color="green" icon={DollarSign} />
        <MetricCard label="Active Customers" value={m.active_subscriptions || 0} color="blue" icon={Building2} />
        <MetricCard label="Total Seats" value={m.total_seats || 0} color="purple" icon={Users} />
        <MetricCard label="Trials" value={m.trials || 0} color="orange" icon={Clock} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Attention Needed</h3>
          <div className="space-y-3">
            {m.past_due > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Past Due</span>
                <span className="font-bold text-red-700">{m.past_due}</span>
              </div>
            )}
            {m.pending_cancellations > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <span className="text-amber-700 flex items-center gap-2"><Clock className="w-4 h-4" /> Pending Cancellations</span>
                <span className="font-bold text-amber-700">{m.pending_cancellations}</span>
              </div>
            )}
            {!m.past_due && !m.pending_cancellations && <p className="text-slate-500">All clear!</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Failed Payments</h3>
          <div className="space-y-2">
            {(data?.failedPayments || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-700">{p.org_name}</span>
                <span className="font-medium text-red-600">{fmt(p.total)}</span>
              </div>
            ))}
            {(!data?.failedPayments?.length) && <p className="text-slate-500">No failed payments</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {(data?.recentActivity || []).map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <span className="text-slate-700">{a.org_name}</span>
                <span className="text-slate-400 ml-2 text-sm">{a.type}</span>
              </div>
              <span className="text-sm text-slate-500">{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== CUSTOMERS ====================

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ search, limit: '50' });
    apiFetch(`/api/ops/customers?${params}`).then(data => setCustomers(data.customers || [])).finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-64 text-sm" />
          </div>
          <Link to="/onboard" className={btnPrimary + " flex items-center gap-2"}>
            <Plus className="w-4 h-4" /> New Customer
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Customer</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Plan</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Seats</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Health</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No customers found</td></tr>
            ) : customers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.slug}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {c.plan_name || 'No plan'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-700 text-sm">{c.core_seats || 0} core / {c.flex_seats || 0} flex</td>
                <td className="px-6 py-4"><StatusBadge status={c.subscription_status} /></td>
                <td className="px-6 py-4"><HealthBadge score={c.health_score} risk={c.risk_level} /></td>
                <td className="px-6 py-4 text-right">
                  <button className="text-orange-600 hover:text-orange-700 font-medium text-sm">View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== CUSTOMER DETAIL ====================

function CustomerDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const { currency, rates } = useCurrency();
  const fmt = (v) => formatMoney(v, { currency, rates });
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [savingNote, setSavingNote] = useState(false);
  const navigate = useNavigate();

  const loadData = useCallback(() => {
    apiFetch(`/api/ops/customers/${id}`).then(setData).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleImpersonate = async () => {
    try {
      const result = await apiFetch(`/api/ops/impersonate/${id}`, { method: 'POST' });
      if (result.portalUrl) window.open(result.portalUrl, '_blank');
      else alert('Impersonation token generated. Portal URL not configured.');
    } catch (err) { alert(`Impersonation failed: ${err.message}`); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const result = await apiFetch(`/api/ops/customers/${id}/notes`, { method: 'POST', body: { note: noteText, noteType } });
      setData(prev => ({ ...prev, notes: [{ ...result.note, author_first_name: 'You', author_last_name: '' }, ...(prev.notes || [])] }));
      setNoteText('');
    } catch (err) { alert(err.message); }
    finally { setSavingNote(false); }
  };

  if (loading) return <div className="text-slate-500">Loading...</div>;
  if (!data?.customer) return <div className="text-slate-500">Customer not found</div>;

  const { customer: c, usage, admins, invoices, notes, health } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/customers" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">{c.name}</h2>
          <p className="text-slate-500">{c.slug} • {c.billing_email}</p>
        </div>
        <div className="flex gap-2">
          <button className={btnSecondary} onClick={handleImpersonate}>
            <ExternalLink className="w-4 h-4 inline mr-1" /> Impersonate
          </button>
          <button className={btnPrimary} onClick={() => setModal('edit')}>
            <Edit className="w-4 h-4 inline mr-1" /> Edit
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button className={btnSecondary} onClick={() => setModal('seats')}>Adjust Seats</button>
        <button className={btnSecondary} onClick={() => setModal('changePlan')}>Change Plan</button>
        {c.status === 'trialing' && <button className={btnSecondary} onClick={() => setModal('extendTrial')}>Extend Trial</button>}
        <button className={btnSecondary} onClick={() => setModal('credit')}>Apply Credit</button>
        <button className={btnSecondary} onClick={() => setModal('features')}>Feature Flags</button>
        {c.status !== 'canceled' && <button className={btnDanger} onClick={() => setModal('cancel')}>Cancel</button>}
      </div>

      {/* Info Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Subscription</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-medium">{c.plan_name || 'None'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={c.status} /></div>
            <div className="flex justify-between"><span className="text-slate-500">Core Seats</span><span>{c.core_seats || 0} ({usage?.core || 0} used)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Flex Seats</span><span>{c.flex_seats || 0} ({usage?.flex || 0} used)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Period End</span><span>{c.current_period_end ? new Date(c.current_period_end).toLocaleDateString() : '-'}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Health Score</h3>
          {health ? (
            <div className="space-y-3">
              <div className="text-center"><span className="text-4xl font-bold text-slate-900">{health.overall_score}</span><span className="text-slate-500">/100</span></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Engagement</span><span>{health.engagement_score || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Adoption</span><span>{health.adoption_score || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Growth</span><span>{health.growth_score || '-'}</span></div>
              </div>
            </div>
          ) : <p className="text-slate-400">No health data</p>}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Admins</h3>
          <div className="space-y-3">
            {admins?.map(a => (
              <div key={a.id}>
                <p className="font-medium text-slate-700 text-sm">{a.first_name} {a.last_name}</p>
                <p className="text-xs text-slate-500">{a.email}</p>
              </div>
            ))}
            {(!admins?.length) && <p className="text-slate-400 text-sm">No admins</p>}
          </div>
        </div>
      </div>

      {/* Invoices & Notes */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Invoices</h3>
          <div className="space-y-2">
            {invoices?.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-slate-700 text-sm">{inv.stripe_invoice_number}</p>
                  <p className="text-xs text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{fmt(inv.total)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
            {(!invoices?.length) && <p className="text-slate-400 text-sm">No invoices</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Notes</h3>
          <div className="space-y-3 mb-4">
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..."
              className={inputClass + " h-20 resize-none"} />
            <div className="flex gap-2">
              <select value={noteType} onChange={e => setNoteType(e.target.value)} className={inputClass + " w-auto"}>
                <option value="general">General</option>
                <option value="support">Support</option>
                <option value="sales">Sales</option>
                <option value="billing">Billing</option>
              </select>
              <button onClick={handleAddNote} disabled={savingNote || !noteText.trim()} className={btnPrimary}>
                {savingNote ? 'Saving...' : 'Add Note'}
              </button>
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-auto">
            {notes?.map(n => (
              <div key={n.id} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{n.note_type}</span>
                </div>
                <p className="text-sm text-slate-700">{n.note}</p>
                <p className="text-xs text-slate-500 mt-2">{n.author_first_name} {n.author_last_name} • {new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
            {(!notes?.length) && <p className="text-slate-400 text-sm">No notes yet</p>}
          </div>
        </div>
      </div>

      {/* License Keys Section */}
      <LicenseKeysSection orgId={id} />

      {/* Modals */}
      {modal === 'edit' && <EditCustomerModal customer={c} onClose={() => setModal(null)} onSaved={loadData} />}
      {modal === 'seats' && <AdjustSeatsModal orgId={id} current={{ core: c.core_seats, flex: c.flex_seats }} onClose={() => setModal(null)} onSaved={loadData} />}
      {modal === 'changePlan' && <ChangePlanModal orgId={id} currentPlan={c.plan_slug} coreSeats={c.core_seats || 50} onClose={() => setModal(null)} onSaved={loadData} />}
      {modal === 'extendTrial' && <ExtendTrialModal orgId={id} trialEnd={c.trial_end} onClose={() => setModal(null)} onSaved={loadData} />}
      {modal === 'credit' && <ApplyCreditModal orgId={id} onClose={() => setModal(null)} onSaved={loadData} />}
      {modal === 'cancel' && <CancelSubscriptionModal orgId={id} name={c.name} periodEnd={c.current_period_end} onClose={() => setModal(null)} onSaved={() => { loadData(); setModal(null); }} />}
      {modal === 'features' && <FeatureFlagsModal orgId={id} onClose={() => setModal(null)} />}
    </div>
  );
}

// ==================== LICENSE KEYS SECTION ====================

function LicenseKeysSection({ orgId }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);

  const load = useCallback(() => {
    apiFetch(`/api/ops/licenses/${orgId}`).then(d => setLicenses(d.licenses || [])).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const copyKey = (key) => { navigator.clipboard.writeText(key); };

  const handleRevoke = async (licId) => {
    if (!confirm('Revoke this license key?')) return;
    try { await apiFetch(`/api/ops/licenses/${licId}`, { method: 'DELETE' }); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">License Keys</h3>
        <button onClick={() => setShowGenerate(true)} className={btnPrimary + " flex items-center gap-1"}>
          <Plus className="w-4 h-4" /> Generate Key
        </button>
      </div>

      {loading ? <p className="text-slate-500 text-sm">Loading...</p> : licenses.length === 0 ? (
        <p className="text-slate-400 text-sm">No license keys generated</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Key</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Type</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Seats</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Expires</th>
              <th className="text-right px-4 py-2 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {licenses.map(l => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">{l.license_key}</code>
                  <button onClick={() => copyKey(l.license_key)} className="ml-2 text-slate-400 hover:text-slate-600">
                    <Copy className="w-3.5 h-3.5 inline" />
                  </button>
                </td>
                <td className="px-4 py-3"><StatusBadge status={l.key_type} /></td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-4 py-3">{l.activated_seats}/{l.max_seats}</td>
                <td className="px-4 py-3">{l.valid_until ? new Date(l.valid_until).toLocaleDateString() : 'Never'}</td>
                <td className="px-4 py-3 text-right">
                  {l.status === 'active' && (
                    <button onClick={() => handleRevoke(l.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Revoke</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showGenerate && <GenerateLicenseModal orgId={orgId} onClose={() => setShowGenerate(false)} onGenerated={load} />}
    </div>
  );
}

// ==================== MODALS ====================

function EditCustomerModal({ customer, onClose, onSaved }) {
  const [name, setName] = useState(customer.name || '');
  const [tradingName, setTradingName] = useState(customer.trading_name || '');
  const [billingEmail, setBillingEmail] = useState(customer.billing_email || '');
  const [taxId, setTaxId] = useState(customer.tax_id || '');
  const [industry, setIndustry] = useState(customer.industry || 'Retail');
  const [contactName, setContactName] = useState(customer.primary_contact_name || '');
  const [contactPhone, setContactPhone] = useState(customer.primary_contact_phone || '');
  const [addressLine1, setAddressLine1] = useState(customer.address_line1 || '');
  const [city, setCity] = useState(customer.city || '');
  const [postcode, setPostcode] = useState(customer.postcode || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await apiFetch(`/api/ops/manage/organizations/${customer.id}`, {
        method: 'PATCH',
        body: { name, tradingName, billingEmail, taxId, industry, primaryContactName: contactName, primaryContactPhone: contactPhone, addressLine1, city, postcode }
      });
      onSaved(); onClose();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Edit Customer" onClose={onClose} wide>
      <div className="space-y-4">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Company Name"><input value={name} onChange={e => setName(e.target.value)} className={inputClass} /></FormField>
          <FormField label="Trading Name"><input value={tradingName} onChange={e => setTradingName(e.target.value)} className={inputClass} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Industry">
            <select value={industry} onChange={e => setIndustry(e.target.value)} className={inputClass}>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="Hospitality">Hospitality</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Logistics">Logistics</option>
              <option value="Construction">Construction</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
          <FormField label="Tax ID (VAT)"><input value={taxId} onChange={e => setTaxId(e.target.value)} className={inputClass} placeholder="GB123456789" /></FormField>
        </div>
        <h4 className="font-medium text-slate-700 pt-2">Primary Contact</h4>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Name"><input value={contactName} onChange={e => setContactName(e.target.value)} className={inputClass} /></FormField>
          <FormField label="Email"><input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} className={inputClass} /></FormField>
          <FormField label="Phone"><input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={inputClass} /></FormField>
        </div>
        <h4 className="font-medium text-slate-700 pt-2">Address</h4>
        <FormField label="Address Line 1"><input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={inputClass} /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="City"><input value={city} onChange={e => setCity(e.target.value)} className={inputClass} /></FormField>
          <FormField label="Postcode"><input value={postcode} onChange={e => setPostcode(e.target.value)} className={inputClass} /></FormField>
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AdjustSeatsModal({ orgId, current, onClose, onSaved }) {
  const [core, setCore] = useState(current.core || 0);
  const [flex, setFlex] = useState(current.flex || 0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const { currency, rates } = useCurrency();
  const fmt = (v) => formatMoney(v, { currency, rates });

  const coreDiff = core - (current.core || 0);
  const flexDiff = flex - (current.flex || 0);
  // Estimate price impact (assuming £10/core, £12/flex)
  const priceImpact = (coreDiff * 1000) + (flexDiff * 1200);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/ops/customers/${orgId}/seats`, { method: 'POST', body: { coreSeats: core, flexSeats: flex, reason } });
      onSaved(); onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Adjust Seats" onClose={onClose}>
      <div className="space-y-4">
        {/* Before/After Comparison */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div><p className="text-slate-500 text-xs mb-1">Before</p></div>
            <div><p className="text-slate-500 text-xs mb-1">Change</p></div>
            <div><p className="text-slate-500 text-xs mb-1">After</p></div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center border-t border-slate-200 pt-2 mt-2">
            <div><p className="font-medium">{current.core || 0} core</p><p className="text-xs text-slate-500">{current.flex || 0} flex</p></div>
            <div>
              <p className={`font-medium ${coreDiff > 0 ? 'text-green-600' : coreDiff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {coreDiff > 0 ? '+' : ''}{coreDiff} core
              </p>
              <p className={`text-xs ${flexDiff > 0 ? 'text-green-600' : flexDiff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {flexDiff > 0 ? '+' : ''}{flexDiff} flex
              </p>
            </div>
            <div><p className="font-medium">{core} core</p><p className="text-xs text-slate-500">{flex} flex</p></div>
          </div>
          {priceImpact !== 0 && (
            <div className="border-t border-slate-200 mt-2 pt-2 text-center">
              <p className={`text-sm ${priceImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Est. MRR impact: {priceImpact > 0 ? '+' : ''}{fmt(priceImpact)}/mo
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Core Seats"><input type="number" min="0" value={core} onChange={e => setCore(parseInt(e.target.value) || 0)} className={inputClass} /></FormField>
          <FormField label="Flex Seats"><input type="number" min="0" value={flex} onChange={e => setFlex(parseInt(e.target.value) || 0)} className={inputClass} /></FormField>
        </div>
        <FormField label="Reason"><input value={reason} onChange={e => setReason(e.target.value)} className={inputClass} placeholder="e.g. Customer expansion" /></FormField>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving || (coreDiff === 0 && flexDiff === 0)} className={btnPrimary}>
            {saving ? 'Saving...' : 'Update Seats'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ChangePlanModal({ orgId, currentPlan, coreSeats = 50, onClose, onSaved }) {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(currentPlan || '');
  const [effectiveDate, setEffectiveDate] = useState('immediate');
  const [saving, setSaving] = useState(false);
  const { currency, rates } = useCurrency();
  const fmt = (v) => formatMoney(v, { currency, rates });

  useEffect(() => {
    apiFetch('/api/ops/plans').then(d => setPlans(d.plans || [])).catch(() => {});
  }, []);

  const currentPlanData = plans.find(p => p.slug === currentPlan);
  const selectedPlanData = plans.find(p => p.slug === selected);

  const currentMRR = currentPlanData ? (currentPlanData.core_price_per_seat || 0) * coreSeats * 100 : 0;
  const newMRR = selectedPlanData ? (selectedPlanData.core_price_per_seat || 0) * coreSeats * 100 : 0;
  const mrrDiff = newMRR - currentMRR;

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/ops/manage/organizations/${orgId}/subscription`, { method: 'POST', body: { planSlug: selected, effectiveDate } });
      onSaved(); onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Change Plan" onClose={onClose}>
      <div className="space-y-4">
        {/* Current Plan */}
        {currentPlanData && (
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Current Plan</p>
            <div className="flex justify-between items-center">
              <span className="font-medium">{currentPlanData.name}</span>
              <span className="text-sm text-slate-600">{fmt(currentMRR)}/mo</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {plans.map(p => (
            <label key={p.id} className={`block p-4 border rounded-lg cursor-pointer transition ${selected === p.slug ? 'border-orange-500 bg-orange-50' : p.slug === currentPlan ? 'border-slate-300 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" name="plan" value={p.slug} checked={selected === p.slug} onChange={() => setSelected(p.slug)} className="sr-only" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-sm text-slate-500">{p.description}</p>
                  </div>
                  {p.slug === currentPlan && <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">Current</span>}
                </div>
                <div className="text-right">
                  <p className="font-medium">{p.slug === 'enterprise' ? 'POA' : `${fmt((p.core_price_per_seat || 0) * 100)}/seat`}</p>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Price Impact */}
        {selected && selected !== currentPlan && mrrDiff !== 0 && (
          <div className={`rounded-lg p-3 ${mrrDiff > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="text-sm font-medium">
              {mrrDiff > 0 ? 'Upgrade' : 'Downgrade'}: {mrrDiff > 0 ? '+' : ''}{fmt(mrrDiff)}/mo
            </p>
            <p className="text-xs text-slate-500">Based on {coreSeats} seats</p>
          </div>
        )}

        <FormField label="Effective Date">
          <select value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className={inputClass}>
            <option value="immediate">Immediately</option>
            <option value="period_end">At current period end</option>
          </select>
        </FormField>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving || selected === currentPlan} className={btnPrimary}>
            {saving ? 'Changing...' : mrrDiff > 0 ? 'Upgrade Plan' : mrrDiff < 0 ? 'Downgrade Plan' : 'Change Plan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ExtendTrialModal({ orgId, trialEnd, onClose, onSaved }) {
  const [mode, setMode] = useState('days'); // 'days' or 'date'
  const [days, setDays] = useState(14);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const currentEnd = trialEnd ? new Date(trialEnd) : new Date();
  const newEnd = mode === 'days'
    ? new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000)
    : new Date(endDate);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'days') {
        await apiFetch(`/api/ops/customers/${orgId}/extend-trial`, { method: 'POST', body: { days, reason } });
      } else {
        const diffDays = Math.ceil((newEnd.getTime() - currentEnd.getTime()) / (24 * 60 * 60 * 1000));
        await apiFetch(`/api/ops/customers/${orgId}/extend-trial`, { method: 'POST', body: { days: diffDays, reason } });
      }
      onSaved(); onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Extend Trial" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Current trial end:</span>
            <span className="font-medium">{currentEnd.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500">New trial end:</span>
            <span className="font-medium text-orange-600">{newEnd.toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setMode('days')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${mode === 'days' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            Add Days
          </button>
          <button onClick={() => setMode('date')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${mode === 'date' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            Pick Date
          </button>
        </div>

        {mode === 'days' ? (
          <FormField label="Additional Days">
            <input type="number" min="1" max="90" value={days} onChange={e => setDays(parseInt(e.target.value) || 14)} className={inputClass} />
          </FormField>
        ) : (
          <FormField label="New End Date">
            <input type="date" value={endDate} min={new Date().toISOString().split('T')[0]} onChange={e => setEndDate(e.target.value)} className={inputClass} />
          </FormField>
        )}

        <FormField label="Reason">
          <select value={reason} onChange={e => setReason(e.target.value)} className={inputClass}>
            <option value="">Select a reason...</option>
            <option value="Needs more evaluation time">Needs more evaluation time</option>
            <option value="Waiting for stakeholder approval">Waiting for stakeholder approval</option>
            <option value="Technical integration delayed">Technical integration delayed</option>
            <option value="Sales negotiation ongoing">Sales negotiation ongoing</option>
            <option value="Other">Other</option>
          </select>
        </FormField>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !reason} className={btnPrimary}>
            {saving ? 'Extending...' : `Extend to ${newEnd.toLocaleDateString()}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ApplyCreditModal({ orgId, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const { currency } = useCurrency();
  const sym = (CURRENCIES[currency] || CURRENCIES.GBP).symbol;

  const handleSave = async () => {
    setSaving(true);
    try {
      const amountPence = Math.round(parseFloat(amount) * 100);
      await apiFetch(`/api/ops/customers/${orgId}/credit`, { method: 'POST', body: { amount: amountPence, reason } });
      onSaved(); onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Apply Credit" onClose={onClose}>
      <div className="space-y-4">
        <FormField label={`Amount (${sym})`}><input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} placeholder="e.g. 50.00" /></FormField>
        <FormField label="Reason"><input value={reason} onChange={e => setReason(e.target.value)} className={inputClass} placeholder="e.g. Service disruption compensation" /></FormField>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !amount} className={btnPrimary}>{saving ? 'Applying...' : `Apply ${sym}${amount || '0'} Credit`}</button>
        </div>
      </div>
    </Modal>
  );
}

function CancelSubscriptionModal({ orgId, name, periodEnd, onClose, onSaved }) {
  const [immediate, setImmediate] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState('');

  const CANCEL_REASONS = [
    { value: 'too_expensive', label: 'Too expensive' },
    { value: 'not_using', label: 'Not using the product' },
    { value: 'missing_features', label: 'Missing features' },
    { value: 'switching_competitor', label: 'Switching to competitor' },
    { value: 'business_closing', label: 'Business closing down' },
    { value: 'seasonal', label: 'Seasonal / temporary pause' },
    { value: 'customer_request', label: 'Customer requested' },
    { value: 'other', label: 'Other' },
  ];

  const handleCancel = async () => {
    setSaving(true);
    try {
      const reason = reasonDetail ? `${reasonCategory}: ${reasonDetail}` : reasonCategory;
      await apiFetch(`/api/ops/manage/organizations/${orgId}/subscription/cancel`, { method: 'POST', body: { immediate, reason } });
      onSaved();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Cancel Subscription" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">This will cancel the subscription for {name}.</p>
          <p className="text-red-600 text-sm mt-1">This action cannot be easily undone.</p>
        </div>

        <FormField label="Reason for cancellation">
          <select value={reasonCategory} onChange={e => setReasonCategory(e.target.value)} className={inputClass}>
            <option value="">Select a reason...</option>
            {CANCEL_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </FormField>

        {reasonCategory && (
          <FormField label="Additional details (optional)">
            <textarea value={reasonDetail} onChange={e => setReasonDetail(e.target.value)} className={inputClass + " h-20 resize-none"} placeholder="Any additional context..." />
          </FormField>
        )}

        <div className="border border-slate-200 rounded-lg p-3 space-y-3">
          <p className="text-sm font-medium text-slate-700">When should the cancellation take effect?</p>
          <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="timing" checked={!immediate} onChange={() => setImmediate(false)} className="mt-0.5" />
            <div>
              <p className="font-medium text-sm">At period end</p>
              <p className="text-xs text-slate-500">Customer keeps access until {periodEnd ? new Date(periodEnd).toLocaleDateString() : 'billing period ends'}</p>
            </div>
          </label>
          <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="timing" checked={immediate} onChange={() => setImmediate(true)} className="mt-0.5" />
            <div>
              <p className="font-medium text-sm text-red-600">Immediately</p>
              <p className="text-xs text-slate-500">Customer loses access right away (may require refund)</p>
            </div>
          </label>
        </div>

        <FormField label={`Type "${name}" to confirm`}>
          <input value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} placeholder={name} />
        </FormField>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className={btnSecondary}>Keep Subscription</button>
          <button onClick={handleCancel} disabled={saving || confirm !== name || !reasonCategory} className={btnDanger}>
            {saving ? 'Cancelling...' : immediate ? 'Cancel Now' : 'Cancel at Period End'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FeatureFlagsModal({ orgId, onClose }) {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const knownFeatures = [
    { key: 'ai_scheduling', label: 'AI Scheduling', icon: Zap },
    { key: 'shift_marketplace', label: 'Shift Marketplace', icon: Users },
    { key: 'payroll_export', label: 'Payroll Export', icon: DollarSign },
    { key: 'api_access', label: 'API Access', icon: Settings },
    { key: 'sso', label: 'Single Sign-On', icon: Shield },
    { key: 'custom_branding', label: 'Custom Branding', icon: Crown },
    { key: 'advanced_analytics', label: 'Advanced Analytics', icon: TrendingUp },
    { key: 'compliance_module', label: 'Compliance Module', icon: CheckCircle },
  ];

  useEffect(() => {
    apiFetch(`/api/ops/features/${orgId}`).then(d => setFeatures(d.features || [])).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  const isEnabled = (key) => features.find(f => f.feature_key === key)?.enabled ?? false;

  const toggle = async (key, enabled) => {
    setSaving(key);
    try {
      await apiFetch(`/api/ops/features/${orgId}`, { method: 'POST', body: { featureKey: key, enabled, reason: 'Toggled via ops portal' } });
      setFeatures(prev => {
        const existing = prev.find(f => f.feature_key === key);
        if (existing) return prev.map(f => f.feature_key === key ? { ...f, enabled } : f);
        return [...prev, { feature_key: key, enabled }];
      });
    } catch (err) { alert(err.message); }
    finally { setSaving(''); }
  };

  return (
    <Modal title="Feature Flags" onClose={onClose} wide>
      {loading ? <p className="text-slate-500">Loading...</p> : (
        <div className="space-y-2">
          {knownFeatures.map(f => {
            const Icon = f.icon;
            const enabled = isEnabled(f.key);
            return (
              <div key={f.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{f.label}</span>
                </div>
                <button
                  onClick={() => toggle(f.key, !enabled)}
                  disabled={saving === f.key}
                  className={`relative w-11 h-6 rounded-full transition ${enabled ? 'bg-orange-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function GenerateLicenseModal({ orgId, onClose, onGenerated }) {
  const [keyType, setKeyType] = useState('annual');
  const [maxSeats, setMaxSeats] = useState(10);
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const result = await apiFetch('/api/ops/licenses', { method: 'POST', body: { organizationId: orgId, keyType, maxSeats, validUntil: validUntil || null } });
      setGeneratedKey(result.license.license_key);
      onGenerated();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (generatedKey) {
    return (
      <Modal title="License Key Generated" onClose={onClose}>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium mb-2">License key created successfully</p>
            <div className="flex items-center gap-2">
              <code className="bg-white px-3 py-2 rounded border text-sm font-mono flex-1">{generatedKey}</code>
              <button onClick={() => navigator.clipboard.writeText(generatedKey)} className={btnSecondary + " flex items-center gap-1"}>
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
          </div>
          <button onClick={onClose} className={btnPrimary + " w-full"}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Generate License Key" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="License Type">
          <select value={keyType} onChange={e => setKeyType(e.target.value)} className={inputClass}>
            <option value="annual">Annual</option>
            <option value="flex">Flex</option>
            <option value="trial">Trial</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </FormField>
        <FormField label="Max Seats"><input type="number" min="1" value={maxSeats} onChange={e => setMaxSeats(parseInt(e.target.value) || 1)} className={inputClass} /></FormField>
        <FormField label="Valid Until (optional)"><input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputClass} /></FormField>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleGenerate} disabled={saving} className={btnPrimary}>{saving ? 'Generating...' : 'Generate Key'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== ONBOARDING WIZARD (6 Steps) ====================

const INDUSTRIES = ['Manufacturing', 'Retail', 'Hospitality', 'Healthcare', 'Logistics', 'Construction', 'Other'];
const CONTRACT_DURATIONS = [{ months: 12, label: '12 months' }, { months: 24, label: '24 months' }, { months: 36, label: '36 months' }, { months: 60, label: '60 months' }];
const SETUP_FEES = { growth: 250000, scale: 500000, enterprise: 1000000 }; // in pence

function OnboardPage() {
  const [step, setStep] = useState(1);
  const { currency, rates } = useCurrency();
  const fmt = (v) => formatMoney(v, { currency, rates });
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Step 1: Company data
  const [companyData, setCompanyData] = useState({
    name: '', tradingName: '', companyNumber: '', industry: 'Retail',
    primaryContactName: '', primaryContactEmail: '', primaryContactPhone: '',
    addressLine1: '', addressLine2: '', city: '', postcode: '', country: 'GB'
  });

  // Step 2: Subscription data
  const [subData, setSubData] = useState({
    planSlug: 'growth', coreSeats: 50, flexEnabled: true, flexLimit: 25,
    contractMonths: 12, startDate: new Date().toISOString().split('T')[0],
    isTrial: false, trialDays: 14, setupFee: 250000, setupFeeCredited: false
  });

  // Step 3: Locations
  const [locations, setLocations] = useState([{ name: '', addressLine1: '', city: '', country: 'GB', timezone: 'Europe/London', headcount: 0 }]);

  // Step 4: Admin user
  const [userData, setUserData] = useState({ email: '', firstName: '', lastName: '', password: '', sendWelcomeEmail: true });

  // Step 5: License key (generated)
  const [licenseKey, setLicenseKey] = useState('');

  // Step 6: Final result
  const [createdOrg, setCreatedOrg] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);

  useEffect(() => {
    apiFetch('/api/ops/plans').then(d => setPlans(d.plans || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userData.password) setUserData(prev => ({ ...prev, password: generatePassword() }));
  }, []);

  // Update setup fee when plan changes
  useEffect(() => {
    setSubData(prev => ({ ...prev, setupFee: SETUP_FEES[prev.planSlug] || 250000 }));
  }, [subData.planSlug]);

  // Update flex limit when seats change
  useEffect(() => {
    if (subData.flexEnabled) {
      setSubData(prev => ({ ...prev, flexLimit: Math.floor(prev.coreSeats * 0.5) }));
    }
  }, [subData.coreSeats, subData.flexEnabled]);

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  }

  function generateLicenseKey(planType) {
    const typeMap = { growth: 'GRO', scale: 'SCA', enterprise: 'ENT' };
    const prefix = typeMap[planType] || 'STD';
    const random = Array.from({ length: 16 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
    const check = random.slice(0, 4);
    return `UPL-${prefix}-${random}-${check}`;
  }

  const addLocation = () => setLocations([...locations, { name: '', addressLine1: '', city: '', country: 'GB', timezone: 'Europe/London', headcount: 0 }]);
  const removeLocation = (i) => setLocations(locations.filter((_, idx) => idx !== i));
  const updateLocation = (i, field, value) => setLocations(locations.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  // Navigate steps
  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  // Step 5: Generate license key
  const generateLicense = () => {
    const key = generateLicenseKey(subData.planSlug);
    setLicenseKey(key);
    nextStep();
  };

  // Step 6: Create everything
  const createCustomer = async () => {
    setSaving(true); setError('');
    try {
      // 1. Create organization
      const orgResult = await apiFetch('/api/ops/onboard/organization', {
        method: 'POST',
        body: {
          name: companyData.name,
          tradingName: companyData.tradingName,
          companyNumber: companyData.companyNumber,
          industry: companyData.industry,
          billingEmail: companyData.primaryContactEmail,
          billingName: companyData.name,
          primaryContactName: companyData.primaryContactName,
          primaryContactEmail: companyData.primaryContactEmail,
          primaryContactPhone: companyData.primaryContactPhone,
          addressLine1: companyData.addressLine1,
          addressLine2: companyData.addressLine2,
          city: companyData.city,
          postcode: companyData.postcode,
          country: companyData.country,
        }
      });
      const org = orgResult.organization;
      setCreatedOrg(org);

      // 2. Create subscription
      await apiFetch('/api/ops/onboard/subscription', {
        method: 'POST',
        body: {
          organizationId: org.id,
          planSlug: subData.planSlug,
          coreSeats: subData.coreSeats,
          flexSeats: subData.flexEnabled ? subData.flexLimit : 0,
          trialDays: subData.isTrial ? subData.trialDays : 0,
          contractMonths: subData.contractMonths,
          setupFee: subData.setupFee,
          setupFeeCredited: subData.setupFeeCredited,
          startDate: subData.startDate,
        }
      });

      // 3. Create locations
      for (const loc of locations.filter(l => l.name)) {
        await apiFetch('/api/ops/onboard/location', {
          method: 'POST',
          body: { organizationId: org.id, ...loc }
        }).catch(() => {}); // Don't fail if locations API not ready
      }

      // 4. Create admin user
      const userResult = await apiFetch('/api/ops/onboard/user', {
        method: 'POST',
        body: {
          organizationId: org.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: userData.password,
          sendWelcomeEmail: userData.sendWelcomeEmail,
        }
      });
      setCreatedUser(userResult.user);

      // 5. Create license key
      await apiFetch('/api/ops/licenses', {
        method: 'POST',
        body: {
          organizationId: org.id,
          keyType: subData.planSlug,
          maxSeats: subData.coreSeats + (subData.flexEnabled ? subData.flexLimit : 0),
          validUntil: null, // License linked to subscription
        }
      }).catch(() => {}); // Don't fail if license created differently

      nextStep(); // Go to success
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = ['Company', 'Subscription', 'Locations', 'Admin', 'License', 'Review', 'Done'];

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/customers" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
      </Link>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Onboard New Customer</h2>

      {/* Steps indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {stepLabels.slice(0, -1).map((label, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className={`flex-1 h-0.5 min-w-4 ${step > i ? 'bg-orange-500' : 'bg-slate-200'}`} />}
            <div className={`flex items-center gap-1 shrink-0 ${step > i + 1 ? 'text-orange-600' : step === i + 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step > i + 1 ? 'bg-orange-500 text-white' : step === i + 1 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {step > i + 1 ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden md:inline">{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

      <div className="bg-white rounded-xl p-6 shadow-sm">
        {/* Step 1: Company */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Company Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Company Name *"><input value={companyData.name} onChange={e => setCompanyData(d => ({ ...d, name: e.target.value }))} className={inputClass} /></FormField>
              <FormField label="Trading Name"><input value={companyData.tradingName} onChange={e => setCompanyData(d => ({ ...d, tradingName: e.target.value }))} className={inputClass} placeholder="If different" /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Company Number"><input value={companyData.companyNumber} onChange={e => setCompanyData(d => ({ ...d, companyNumber: e.target.value }))} className={inputClass} placeholder="e.g. 12345678" /></FormField>
              <FormField label="Industry">
                <select value={companyData.industry} onChange={e => setCompanyData(d => ({ ...d, industry: e.target.value }))} className={inputClass}>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </FormField>
            </div>
            <h4 className="font-medium text-slate-700 pt-2">Primary Contact</h4>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Name *"><input value={companyData.primaryContactName} onChange={e => setCompanyData(d => ({ ...d, primaryContactName: e.target.value }))} className={inputClass} /></FormField>
              <FormField label="Email *"><input type="email" value={companyData.primaryContactEmail} onChange={e => setCompanyData(d => ({ ...d, primaryContactEmail: e.target.value }))} className={inputClass} /></FormField>
              <FormField label="Phone"><input value={companyData.primaryContactPhone} onChange={e => setCompanyData(d => ({ ...d, primaryContactPhone: e.target.value }))} className={inputClass} /></FormField>
            </div>
            <h4 className="font-medium text-slate-700 pt-2">Registered Address</h4>
            <FormField label="Address Line 1"><input value={companyData.addressLine1} onChange={e => setCompanyData(d => ({ ...d, addressLine1: e.target.value }))} className={inputClass} /></FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="City"><input value={companyData.city} onChange={e => setCompanyData(d => ({ ...d, city: e.target.value }))} className={inputClass} /></FormField>
              <FormField label="Postcode"><input value={companyData.postcode} onChange={e => setCompanyData(d => ({ ...d, postcode: e.target.value }))} className={inputClass} /></FormField>
              <FormField label="Country">
                <select value={companyData.country} onChange={e => setCompanyData(d => ({ ...d, country: e.target.value }))} className={inputClass}>
                  <option value="GB">United Kingdom</option>
                  <option value="IE">Ireland</option>
                  <option value="US">United States</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                </select>
              </FormField>
            </div>
            <div className="flex justify-end pt-4">
              <button onClick={nextStep} disabled={!companyData.name || !companyData.primaryContactName || !companyData.primaryContactEmail} className={btnPrimary}>
                Continue to Subscription →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Subscription */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Subscription Details</h3>
            <div className="space-y-2">
              {plans.map(p => (
                <label key={p.id} className={`block p-4 border rounded-lg cursor-pointer transition ${subData.planSlug === p.slug ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="plan" value={p.slug} checked={subData.planSlug === p.slug} onChange={() => setSubData(d => ({ ...d, planSlug: p.slug }))} className="sr-only" />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-sm text-slate-500">{p.description}</p>
                    </div>
                    <p className="font-medium">{p.slug === 'enterprise' ? 'POA' : `${fmt(p.core_price_per_seat * 100)}/seat`}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Contracted Seats *"><input type="number" min="1" value={subData.coreSeats} onChange={e => setSubData(d => ({ ...d, coreSeats: parseInt(e.target.value) || 50 }))} className={inputClass} /></FormField>
              <FormField label="Contract Duration">
                <select value={subData.contractMonths} onChange={e => setSubData(d => ({ ...d, contractMonths: parseInt(e.target.value) }))} className={inputClass}>
                  {CONTRACT_DURATIONS.map(c => <option key={c.months} value={c.months}>{c.label}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date"><input type="date" value={subData.startDate} onChange={e => setSubData(d => ({ ...d, startDate: e.target.value }))} className={inputClass} /></FormField>
              <FormField label={`Setup Fee (${fmt(subData.setupFee)})`}>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={subData.setupFee / 100} onChange={e => setSubData(d => ({ ...d, setupFee: Math.round(parseFloat(e.target.value) * 100) || 0 }))} className={inputClass} />
                  <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                    <input type="checkbox" checked={subData.setupFeeCredited} onChange={e => setSubData(d => ({ ...d, setupFeeCredited: e.target.checked }))} className="rounded" />
                    Credit to contract
                  </label>
                </div>
              </FormField>
            </div>
            <div className="border-t border-slate-100 pt-4 mt-4">
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={subData.flexEnabled} onChange={e => setSubData(d => ({ ...d, flexEnabled: e.target.checked }))} className="rounded" />
                  <span className="text-sm font-medium">Enable Flex Seats</span>
                </label>
                {subData.flexEnabled && (
                  <FormField label="Flex Limit">
                    <input type="number" min="0" value={subData.flexLimit} onChange={e => setSubData(d => ({ ...d, flexLimit: parseInt(e.target.value) || 0 }))} className={inputClass + " w-24"} />
                  </FormField>
                )}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={subData.isTrial} onChange={e => setSubData(d => ({ ...d, isTrial: e.target.checked }))} className="rounded" />
                  <span className="text-sm font-medium">Start as Trial</span>
                </label>
                {subData.isTrial && (
                  <FormField label="Trial Days">
                    <input type="number" min="1" max="90" value={subData.trialDays} onChange={e => setSubData(d => ({ ...d, trialDays: parseInt(e.target.value) || 14 }))} className={inputClass + " w-24"} />
                  </FormField>
                )}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className={btnSecondary}>← Back</button>
              <button onClick={nextStep} className={btnPrimary}>Continue to Locations →</button>
            </div>
          </div>
        )}

        {/* Step 3: Locations */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Locations</h3>
              <button onClick={addLocation} className={btnSecondary + " flex items-center gap-1"}>
                <Plus className="w-4 h-4" /> Add Location
              </button>
            </div>
            <p className="text-sm text-slate-500">Add at least one location where employees will work.</p>
            {locations.map((loc, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-slate-700">Location {i + 1}</span>
                  {locations.length > 1 && (
                    <button onClick={() => removeLocation(i)} className="text-red-500 hover:text-red-600 text-sm">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Location Name *"><input value={loc.name} onChange={e => updateLocation(i, 'name', e.target.value)} className={inputClass} placeholder="e.g. Head Office" /></FormField>
                  <FormField label="Headcount"><input type="number" min="0" value={loc.headcount} onChange={e => updateLocation(i, 'headcount', parseInt(e.target.value) || 0)} className={inputClass} /></FormField>
                </div>
                <FormField label="Address"><input value={loc.addressLine1} onChange={e => updateLocation(i, 'addressLine1', e.target.value)} className={inputClass} /></FormField>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="City"><input value={loc.city} onChange={e => updateLocation(i, 'city', e.target.value)} className={inputClass} /></FormField>
                  <FormField label="Country">
                    <select value={loc.country} onChange={e => updateLocation(i, 'country', e.target.value)} className={inputClass}>
                      <option value="GB">United Kingdom</option>
                      <option value="IE">Ireland</option>
                      <option value="US">United States</option>
                      <option value="DE">Germany</option>
                    </select>
                  </FormField>
                  <FormField label="Timezone">
                    <select value={loc.timezone} onChange={e => updateLocation(i, 'timezone', e.target.value)} className={inputClass}>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Dublin">Europe/Dublin</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                    </select>
                  </FormField>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className={btnSecondary}>← Back</button>
              <button onClick={nextStep} disabled={!locations.some(l => l.name)} className={btnPrimary}>Continue to Admin User →</button>
            </div>
          </div>
        )}

        {/* Step 4: Admin User */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Admin User</h3>
            <p className="text-sm text-slate-500">Create the first administrator account for this customer.</p>
            <FormField label="Email *"><input type="email" value={userData.email} onChange={e => setUserData(d => ({ ...d, email: e.target.value }))} className={inputClass} placeholder="admin@company.com" /></FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name *"><input value={userData.firstName} onChange={e => setUserData(d => ({ ...d, firstName: e.target.value }))} className={inputClass} /></FormField>
              <FormField label="Last Name *"><input value={userData.lastName} onChange={e => setUserData(d => ({ ...d, lastName: e.target.value }))} className={inputClass} /></FormField>
            </div>
            <FormField label="Temporary Password">
              <div className="flex gap-2">
                <input value={userData.password} onChange={e => setUserData(d => ({ ...d, password: e.target.value }))} className={inputClass + " font-mono"} />
                <button onClick={() => setUserData(d => ({ ...d, password: generatePassword() }))} className={btnSecondary} title="Generate new password">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => navigator.clipboard.writeText(userData.password)} className={btnSecondary} title="Copy password">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </FormField>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600"><strong>Role:</strong> HR Administrator</p>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={userData.sendWelcomeEmail} onChange={e => setUserData(d => ({ ...d, sendWelcomeEmail: e.target.checked }))} className="rounded" />
              <span className="text-sm">Send welcome email with login instructions</span>
            </label>
            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className={btnSecondary}>← Back</button>
              <button onClick={generateLicense} disabled={!userData.email || !userData.firstName || !userData.lastName} className={btnPrimary}>
                Continue to License Key →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: License Key */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">License Key Generated</h3>
            <p className="text-sm text-slate-500">A unique license key has been generated for this customer.</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <code className="bg-white px-4 py-3 rounded border text-lg font-mono flex-1 text-center">{licenseKey}</code>
                <button onClick={() => navigator.clipboard.writeText(licenseKey)} className={btnSecondary + " flex items-center gap-1"}>
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Plan Type</span><span className="font-medium capitalize">{subData.planSlug}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Max Seats</span><span className="font-medium">{subData.coreSeats + (subData.flexEnabled ? subData.flexLimit : 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Flex Enabled</span><span className="font-medium">{subData.flexEnabled ? 'Yes' : 'No'}</span></div>
            </div>
            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className={btnSecondary}>← Back</button>
              <button onClick={nextStep} className={btnPrimary}>Review & Confirm →</button>
            </div>
          </div>
        )}

        {/* Step 6: Review & Confirm */}
        {step === 6 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Review & Confirm</h3>
            <p className="text-sm text-slate-500">Please review all details before creating the customer.</p>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
              <div className="p-4">
                <h4 className="font-medium text-slate-700 mb-2">Company</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">Name:</span> {companyData.name}</div>
                  <div><span className="text-slate-500">Industry:</span> {companyData.industry}</div>
                  <div><span className="text-slate-500">Contact:</span> {companyData.primaryContactName}</div>
                  <div><span className="text-slate-500">Email:</span> {companyData.primaryContactEmail}</div>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-medium text-slate-700 mb-2">Subscription</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">Plan:</span> <span className="capitalize">{subData.planSlug}</span></div>
                  <div><span className="text-slate-500">Seats:</span> {subData.coreSeats} core{subData.flexEnabled ? ` + ${subData.flexLimit} flex` : ''}</div>
                  <div><span className="text-slate-500">Contract:</span> {subData.contractMonths} months</div>
                  <div><span className="text-slate-500">Setup Fee:</span> {fmt(subData.setupFee)}{subData.setupFeeCredited ? ' (credited)' : ''}</div>
                  {subData.isTrial && <div><span className="text-slate-500">Trial:</span> {subData.trialDays} days</div>}
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-medium text-slate-700 mb-2">Locations ({locations.filter(l => l.name).length})</h4>
                <div className="text-sm space-y-1">
                  {locations.filter(l => l.name).map((l, i) => (
                    <div key={i}>{l.name}{l.headcount > 0 ? ` (${l.headcount} employees)` : ''}</div>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-medium text-slate-700 mb-2">Admin User</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">Name:</span> {userData.firstName} {userData.lastName}</div>
                  <div><span className="text-slate-500">Email:</span> {userData.email}</div>
                  <div><span className="text-slate-500">Role:</span> HR Administrator</div>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-medium text-slate-700 mb-2">License Key</h4>
                <code className="text-sm bg-slate-100 px-2 py-1 rounded">{licenseKey}</code>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className={btnSecondary}>← Back</button>
              <button onClick={createCustomer} disabled={saving} className={btnPrimary + " flex items-center gap-2"}>
                {saving ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Success */}
        {step === 7 && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Customer Onboarded!</h3>
              <p className="text-slate-500 mt-1">{companyData.name} is ready to go.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-left text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Organisation</span><span className="font-medium">{companyData.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-medium capitalize">{subData.planSlug}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Admin Email</span><span className="font-medium">{userData.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Temp Password</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border">{userData.password}</span>
                  <button onClick={() => navigator.clipboard.writeText(userData.password)} className="text-slate-400 hover:text-slate-600"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">License Key</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs bg-white px-2 py-0.5 rounded border">{licenseKey}</code>
                  <button onClick={() => navigator.clipboard.writeText(licenseKey)} className="text-slate-400 hover:text-slate-600"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate(createdOrg ? `/customers/${createdOrg.id}` : '/customers')} className={btnPrimary}>View Customer</button>
              <button onClick={() => { setStep(1); setCompanyData({ name: '', tradingName: '', companyNumber: '', industry: 'Retail', primaryContactName: '', primaryContactEmail: '', primaryContactPhone: '', addressLine1: '', addressLine2: '', city: '', postcode: '', country: 'GB' }); setSubData({ planSlug: 'growth', coreSeats: 50, flexEnabled: true, flexLimit: 25, contractMonths: 12, startDate: new Date().toISOString().split('T')[0], isTrial: false, trialDays: 14, setupFee: 250000, setupFeeCredited: false }); setLocations([{ name: '', addressLine1: '', city: '', country: 'GB', timezone: 'Europe/London', headcount: 0 }]); setUserData({ email: '', firstName: '', lastName: '', password: generatePassword(), sendWelcomeEmail: true }); setLicenseKey(''); setCreatedOrg(null); setCreatedUser(null); }} className={btnSecondary}>
                Onboard Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== LICENSES PAGE ====================

function LicensesPage() {
  const [licenses, setLicenses] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const navigate = useNavigate();

  const loadLicenses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    params.set('limit', '100');
    apiFetch(`/api/ops/licenses?${params}`).then(d => setLicenses(d.licenses || [])).catch(() => {}).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { loadLicenses(); }, [loadLicenses]);

  const handleAction = async (id, action) => {
    const actionMap = {
      suspend: { status: 'suspended', confirm: 'Suspend this license key?' },
      reactivate: { status: 'active', confirm: 'Reactivate this license key?' },
      revoke: { status: 'revoked', confirm: 'Revoke this license key? This cannot be undone.' },
    };
    const config = actionMap[action];
    if (!config || !confirm(config.confirm)) return;
    try {
      await apiFetch(`/api/ops/licenses/${id}`, { method: action === 'revoke' ? 'DELETE' : 'PATCH', body: { status: config.status } });
      setLicenses(prev => prev.map(l => l.id === id ? { ...l, status: config.status } : l));
      if (selectedLicense?.id === id) setSelectedLicense(prev => ({ ...prev, status: config.status }));
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">License Keys</h2>
        <div className="flex gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputClass + " w-auto"}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-64 text-sm" />
          </div>
          <button onClick={() => setShowGenerate(true)} className={btnPrimary + " flex items-center gap-1"}>
            <Plus className="w-4 h-4" /> Generate Key
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-slate-600">License Key</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Organisation</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Plan</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Seats</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Flex Limit</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Expires</th>
              <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
            ) : licenses.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-500">No license keys found</td></tr>
            ) : licenses.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedLicense(l)}>
                <td className="px-6 py-4">
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">{l.license_key}</code>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(l.license_key); }} className="ml-2 text-slate-400 hover:text-slate-600">
                    <Copy className="w-3.5 h-3.5 inline" />
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/customers/${l.organization_id}`); }} className="text-orange-600 hover:text-orange-700">
                    {l.organization_name || 'Unknown'}
                  </button>
                </td>
                <td className="px-6 py-4"><span className="capitalize">{l.plan_type || l.key_type}</span></td>
                <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                <td className="px-6 py-4">{l.activated_seats || 0}/{l.max_seats || 0}</td>
                <td className="px-6 py-4">{l.flex_seats_limit != null ? l.flex_seats_limit : Math.floor((l.max_seats || 0) * 0.5)}</td>
                <td className="px-6 py-4">{l.valid_until ? new Date(l.valid_until).toLocaleDateString() : 'Never'}</td>
                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2 justify-end">
                    {l.status === 'active' && (
                      <button onClick={() => handleAction(l.id, 'suspend')} className="text-amber-600 hover:text-amber-700 text-xs font-medium">Suspend</button>
                    )}
                    {l.status === 'suspended' && (
                      <button onClick={() => handleAction(l.id, 'reactivate')} className="text-green-600 hover:text-green-700 text-xs font-medium">Reactivate</button>
                    )}
                    {l.status !== 'revoked' && (
                      <button onClick={() => handleAction(l.id, 'revoke')} className="text-red-600 hover:text-red-700 text-xs font-medium">Revoke</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* License Detail Modal */}
      {selectedLicense && (
        <LicenseDetailModal license={selectedLicense} onClose={() => setSelectedLicense(null)} onUpdated={loadLicenses} />
      )}

      {/* Generate License Modal */}
      {showGenerate && (
        <GenerateLicenseGlobalModal onClose={() => setShowGenerate(false)} onGenerated={loadLicenses} />
      )}
    </div>
  );
}

function LicenseDetailModal({ license, onClose, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [maxSeats, setMaxSeats] = useState(license.max_seats || 0);
  const [flexLimit, setFlexLimit] = useState(license.flex_seats_limit ?? Math.floor((license.max_seats || 0) * 0.5));
  const [validUntil, setValidUntil] = useState(license.valid_until ? license.valid_until.split('T')[0] : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/ops/licenses/${license.id}`, {
        method: 'PATCH',
        body: { maxSeats, flexSeatsLimit: flexLimit, validUntil: validUntil || null }
      });
      onUpdated();
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleAction = async (action) => {
    const actionMap = {
      suspend: { status: 'suspended', confirm: 'Suspend this license?' },
      reactivate: { status: 'active', confirm: 'Reactivate this license?' },
      revoke: { status: 'revoked', confirm: 'Revoke this license? This cannot be undone.' },
    };
    const config = actionMap[action];
    if (!config || !confirm(config.confirm)) return;
    setSaving(true);
    try {
      await apiFetch(`/api/ops/licenses/${license.id}`, { method: action === 'revoke' ? 'DELETE' : 'PATCH', body: { status: config.status } });
      onUpdated();
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="License Details" onClose={onClose} wide>
      <div className="space-y-6">
        {/* License Key */}
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-500 mb-1">License Key</p>
          <div className="flex items-center gap-2">
            <code className="text-lg font-mono bg-white px-3 py-2 rounded border flex-1">{license.license_key}</code>
            <button onClick={() => navigator.clipboard.writeText(license.license_key)} className={btnSecondary}>
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Organisation</p>
            <p className="font-medium">{license.organization_name || 'Unknown'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Plan Type</p>
            <p className="font-medium capitalize">{license.plan_type || license.key_type}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Status</p>
            <StatusBadge status={license.status} />
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Created</p>
            <p className="font-medium">{new Date(license.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Usage */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-3">Seat Usage</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Activated Seats</span>
                <span className="font-medium">{license.activated_seats || 0} / {license.max_seats || 0}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${((license.activated_seats || 0) / (license.max_seats || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Edit Section */}
        {editing ? (
          <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-slate-900">Modify License</h4>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Max Seats">
                <input type="number" min="1" value={maxSeats} onChange={e => setMaxSeats(parseInt(e.target.value) || 0)} className={inputClass} />
              </FormField>
              <FormField label="Flex Limit">
                <input type="number" min="0" value={flexLimit} onChange={e => setFlexLimit(parseInt(e.target.value) || 0)} className={inputClass} />
              </FormField>
              <FormField label="Valid Until">
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputClass} />
              </FormField>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditing(true)} className={btnSecondary}>
              <Edit className="w-4 h-4 inline mr-1" /> Modify Seats/Expiry
            </button>
            {license.status === 'active' && (
              <button onClick={() => handleAction('suspend')} className={btnSecondary}>Suspend</button>
            )}
            {license.status === 'suspended' && (
              <button onClick={() => handleAction('reactivate')} className={btnPrimary}>Reactivate</button>
            )}
            {license.status !== 'revoked' && (
              <button onClick={() => handleAction('revoke')} className={btnDanger}>Revoke</button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function GenerateLicenseGlobalModal({ onClose, onGenerated }) {
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [planType, setPlanType] = useState('growth');
  const [maxSeats, setMaxSeats] = useState(50);
  const [flexLimit, setFlexLimit] = useState(25);
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    apiFetch('/api/ops/customers?limit=200').then(d => setOrgs(d.customers || [])).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!selectedOrg) return alert('Please select an organisation');
    setSaving(true);
    try {
      const result = await apiFetch('/api/ops/licenses', {
        method: 'POST',
        body: { organizationId: selectedOrg, keyType: planType, planType, maxSeats, flexSeatsLimit: flexLimit, validUntil: validUntil || null }
      });
      setGeneratedKey(result.license?.license_key || 'Generated');
      onGenerated();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (generatedKey) {
    return (
      <Modal title="License Generated" onClose={onClose}>
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium mb-2">License key generated</p>
            <div className="flex items-center gap-2">
              <code className="bg-white px-3 py-2 rounded border text-sm font-mono flex-1">{generatedKey}</code>
              <button onClick={() => navigator.clipboard.writeText(generatedKey)} className={btnSecondary}>
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button onClick={onClose} className={btnPrimary + " w-full"}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Generate License Key" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Organisation *">
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)} className={inputClass}>
            <option value="">Select organisation...</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </FormField>
        <FormField label="Plan Type">
          <select value={planType} onChange={e => setPlanType(e.target.value)} className={inputClass}>
            <option value="growth">Growth</option>
            <option value="scale">Scale</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Max Seats">
            <input type="number" min="1" value={maxSeats} onChange={e => setMaxSeats(parseInt(e.target.value) || 50)} className={inputClass} />
          </FormField>
          <FormField label="Flex Limit">
            <input type="number" min="0" value={flexLimit} onChange={e => setFlexLimit(parseInt(e.target.value) || 0)} className={inputClass} />
          </FormField>
        </div>
        <FormField label="Valid Until (optional)">
          <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputClass} />
        </FormField>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleGenerate} disabled={saving || !selectedOrg} className={btnPrimary}>
            {saving ? 'Generating...' : 'Generate Key'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== BILLING PAGE ====================

function BillingPage() {
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [flexUsage, setFlexUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const { currency, rates } = useCurrency();
  const fmt = (v) => formatMoney(v, { currency, rates });

  useEffect(() => {
    Promise.all([
      apiFetch('/api/ops/billing/overview').then(setData).catch(() => null),
      apiFetch('/api/ops/invoices?limit=50').then(d => setInvoices(d.invoices || [])).catch(() => []),
      apiFetch('/api/ops/billing/flex-usage').then(d => setFlexUsage(d.usage || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const retryPayment = async (invoiceId) => {
    setRetrying(invoiceId);
    try {
      await apiFetch('/api/ops/billing/retry-payment', { method: 'POST', body: { invoiceId } });
      setData(prev => prev ? { ...prev, failedPayments: prev.failedPayments.filter(p => p.id !== invoiceId) } : prev);
    } catch (err) { alert(`Retry failed: ${err.message}`); }
    finally { setRetrying(''); }
  };

  // Calculate totals
  const totalMRR = (data?.mrrByPlan || []).reduce((sum, p) => sum + parseFloat(p.mrr || 0), 0);
  const totalCoreSeats = (data?.mrrByPlan || []).reduce((sum, p) => sum + parseInt(p.total_core_seats || 0), 0);
  const totalFlexSeats = (data?.mrrByPlan || []).reduce((sum, p) => sum + parseInt(p.total_flex_seats || 0), 0);
  const totalCustomers = (data?.mrrByPlan || []).reduce((sum, p) => sum + parseInt(p.customer_count || 0), 0);
  // Estimate flex revenue (assume £2 premium per flex seat)
  const flexRevenue = totalFlexSeats * 200; // in pence
  const baseRevenue = totalMRR * 100 - flexRevenue;
  const arr = totalMRR * 12 * 100; // in pence

  if (loading) return <div className="text-slate-500">Loading billing...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {['overview', 'invoices', 'flex'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === tab ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}>
              {tab === 'overview' ? 'Overview' : tab === 'invoices' ? 'Invoices' : 'Flex Tracking'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Total MRR</p>
              <p className="text-2xl font-bold text-green-600">{fmt(totalMRR * 100)}</p>
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between"><span>Base:</span><span>{fmt(baseRevenue)}</span></div>
                <div className="flex justify-between"><span>Flex:</span><span>{fmt(flexRevenue)}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">ARR</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(arr)}</p>
              <p className="text-xs text-slate-500 mt-2">MRR x 12 months</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Total Seats</p>
              <p className="text-2xl font-bold text-slate-900">{totalCoreSeats + totalFlexSeats}</p>
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between"><span>Core:</span><span>{totalCoreSeats}</span></div>
                <div className="flex justify-between"><span>Flex:</span><span>{totalFlexSeats}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Customers</p>
              <p className="text-2xl font-bold text-slate-900">{totalCustomers}</p>
              <p className="text-xs text-slate-500 mt-2">Active subscriptions</p>
            </div>
          </div>

          {/* MRR by Plan */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Revenue by Plan</h3>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Plan</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Customers</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Core Seats</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Flex Seats</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Base MRR</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Flex MRR</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Total MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.mrrByPlan || []).map(p => {
                  const flexMrr = (p.total_flex_seats || 0) * 200;
                  const baseMrr = (p.mrr || 0) * 100 - flexMrr;
                  return (
                    <tr key={p.plan_slug}>
                      <td className="px-4 py-3 font-medium">{p.plan_name}</td>
                      <td className="px-4 py-3 text-right">{p.customer_count}</td>
                      <td className="px-4 py-3 text-right">{p.total_core_seats}</td>
                      <td className="px-4 py-3 text-right">{p.total_flex_seats}</td>
                      <td className="px-4 py-3 text-right">{fmt(baseMrr)}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{fmt(flexMrr)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(p.mrr * 100)}</td>
                    </tr>
                  );
                })}
                {(!data?.mrrByPlan?.length) && <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No active plans</td></tr>}
              </tbody>
              <tfoot className="bg-slate-50 font-medium">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{totalCustomers}</td>
                  <td className="px-4 py-3 text-right">{totalCoreSeats}</td>
                  <td className="px-4 py-3 text-right">{totalFlexSeats}</td>
                  <td className="px-4 py-3 text-right">{fmt(baseRevenue)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{fmt(flexRevenue)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(totalMRR * 100)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Failed Payments & Renewals */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Overdue Invoices</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">{(data?.failedPayments || []).length}</span>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(data?.failedPayments || []).map(p => (
                  <div key={p.org_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{p.org_name}</p>
                      <p className="text-xs text-slate-500">Due: {p.due_date ? new Date(p.due_date).toLocaleDateString() : '-'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-red-600">{fmt(p.total)}</span>
                      <button onClick={() => retryPayment(p.id)} disabled={retrying === p.id}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                        {retrying === p.id ? '...' : 'Retry'}
                      </button>
                    </div>
                  </div>
                ))}
                {(!data?.failedPayments?.length) && <p className="text-slate-500 text-sm">No overdue invoices</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Upcoming Renewals (7 days)</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(data?.upcomingRenewals || []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{r.org_name}</p>
                      <p className="text-xs text-slate-500">{r.plan_name} • {r.core_seats} seats</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{fmt(r.amount)}</p>
                      <p className="text-xs text-slate-500">{new Date(r.current_period_end).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {(!data?.upcomingRenewals?.length) && <p className="text-slate-500 text-sm">No renewals in the next 7 days</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Invoice History</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Invoice #</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Base</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Flex</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Total</th>
                <th className="text-center px-6 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-sm">{inv.stripe_invoice_number || inv.number || '-'}</td>
                  <td className="px-6 py-4">{inv.org_name || '-'}</td>
                  <td className="px-6 py-4">{new Date(inv.created_at || inv.invoice_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">{fmt(inv.base_amount || inv.subtotal || 0)}</td>
                  <td className="px-6 py-4 text-right text-orange-600">{fmt(inv.flex_amount || 0)}</td>
                  <td className="px-6 py-4 text-right font-medium">{fmt(inv.total || 0)}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
              {!invoices.length && (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500">No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'flex' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Orgs Using Flex</p>
              <p className="text-2xl font-bold text-slate-900">{flexUsage.length || totalFlexSeats > 0 ? '?' : 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Total Flex Seats</p>
              <p className="text-2xl font-bold text-orange-600">{totalFlexSeats}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Flex Revenue (Est.)</p>
              <p className="text-2xl font-bold text-green-600">{fmt(flexRevenue)}</p>
              <p className="text-xs text-slate-500 mt-1">£2 premium/seat</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Flex Seat Usage by Customer</h3>
              <p className="text-sm text-slate-500">Customers with flex seats enabled</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Customer</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Core Seats</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Flex Seats</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Flex Limit</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Flex Revenue</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flexUsage.length > 0 ? flexUsage.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{u.org_name}</td>
                    <td className="px-6 py-4 text-right">{u.core_seats}</td>
                    <td className="px-6 py-4 text-right text-orange-600">{u.flex_seats}</td>
                    <td className="px-6 py-4 text-right">{u.flex_limit || '-'}</td>
                    <td className="px-6 py-4 text-right">{fmt((u.flex_seats || 0) * 200)}</td>
                    <td className="px-6 py-4 text-right">{((u.flex_seats || 0) / Math.max(totalFlexSeats, 1) * 100).toFixed(1)}%</td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    Flex usage data coming soon. Currently showing {totalFlexSeats} flex seats across all plans.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== FEATURES PAGE ====================

const FEATURE_LIST = [
  { key: 'ai_scheduling', label: 'AI Scheduling', description: 'Automatic shift optimization', icon: Zap },
  { key: 'shift_marketplace', label: 'Shift Marketplace', description: 'Open shift bidding', icon: Users },
  { key: 'payroll_export', label: 'Payroll Export', description: 'Export to payroll systems', icon: DollarSign },
  { key: 'api_access', label: 'API Access', description: 'REST API integration', icon: Settings },
  { key: 'sso', label: 'Single Sign-On', description: 'SAML/OIDC authentication', icon: Shield },
  { key: 'custom_branding', label: 'Custom Branding', description: 'White-label portal', icon: Crown },
  { key: 'advanced_analytics', label: 'Advanced Analytics', description: 'Deep workforce insights', icon: TrendingUp },
  { key: 'compliance_module', label: 'Compliance Module', description: 'Right to work, certifications', icon: CheckCircle },
];

function FeaturesPage() {
  const [defaults, setDefaults] = useState({});
  const [overrides, setOverrides] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    // Load plan defaults
    apiFetch('/api/ops/feature-defaults').then(d => {
      const grouped = {};
      (d.defaults || []).forEach(f => {
        if (!grouped[f.plan_slug]) grouped[f.plan_slug] = {};
        grouped[f.plan_slug][f.feature_key] = f.enabled;
      });
      setDefaults(grouped);
    }).catch(() => {
      // Fallback defaults
      setDefaults({
        growth: { ai_scheduling: false, shift_marketplace: true, payroll_export: true, api_access: false, sso: false, custom_branding: false, advanced_analytics: false, compliance_module: true },
        scale: { ai_scheduling: true, shift_marketplace: true, payroll_export: true, api_access: true, sso: false, custom_branding: false, advanced_analytics: true, compliance_module: true },
        enterprise: { ai_scheduling: true, shift_marketplace: true, payroll_export: true, api_access: true, sso: true, custom_branding: true, advanced_analytics: true, compliance_module: true },
      });
    });

    // Load orgs for override selector
    apiFetch('/api/ops/customers?limit=100').then(d => setOrgs(d.customers || [])).catch(() => {});

    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      apiFetch(`/api/ops/features/${selectedOrg}`).then(d => setOverrides(d.features || [])).catch(() => setOverrides([]));
    } else {
      setOverrides([]);
    }
  }, [selectedOrg]);

  const isEnabled = (key, planSlug) => defaults[planSlug]?.[key] ?? false;
  const hasOverride = (key) => overrides.find(o => o.feature_key === key);
  const overrideValue = (key) => overrides.find(o => o.feature_key === key)?.enabled;

  const toggleOverride = async (key, enabled) => {
    if (!selectedOrg) return;
    setSaving(key);
    try {
      await apiFetch(`/api/ops/features/${selectedOrg}`, {
        method: 'POST',
        body: { featureKey: key, enabled, reason: 'Toggled via Features page' }
      });
      setOverrides(prev => {
        const existing = prev.find(o => o.feature_key === key);
        if (existing) return prev.map(o => o.feature_key === key ? { ...o, enabled } : o);
        return [...prev, { feature_key: key, enabled }];
      });
    } catch (err) { alert(err.message); }
    finally { setSaving(''); }
  };

  const resetOverride = async (key) => {
    if (!selectedOrg) return;
    setSaving(key);
    try {
      await apiFetch(`/api/ops/features/${selectedOrg}/${key}`, { method: 'DELETE' });
      setOverrides(prev => prev.filter(o => o.feature_key !== key));
    } catch (err) { /* ignore - might not have delete endpoint */ }
    finally { setSaving(''); }
  };

  if (loading) return <div className="text-slate-500">Loading features...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Feature Flags</h2>

      {/* Plan Defaults Matrix */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Plan Defaults</h3>
          <p className="text-sm text-slate-500">Default feature availability per plan</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Feature</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Growth</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Scale</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Enterprise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FEATURE_LIST.map(f => {
              const Icon = f.icon;
              return (
                <tr key={f.key} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">{f.label}</p>
                        <p className="text-xs text-slate-500">{f.description}</p>
                      </div>
                    </div>
                  </td>
                  {['growth', 'scale', 'enterprise'].map(plan => (
                    <td key={plan} className="px-4 py-3 text-center">
                      {isEnabled(f.key, plan) ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-Org Overrides */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Per-Organisation Overrides</h3>
          <p className="text-sm text-slate-500 mb-3">Override feature flags for specific customers</p>
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)} className={inputClass + " max-w-md"}>
            <option value="">Select an organisation...</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.name} ({o.plan_slug || 'no plan'})</option>
            ))}
          </select>
        </div>

        {selectedOrg && (
          <div className="p-4 space-y-2">
            {FEATURE_LIST.map(f => {
              const Icon = f.icon;
              const override = hasOverride(f.key);
              const enabled = override ? overrideValue(f.key) : false;
              return (
                <div key={f.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className="font-medium text-slate-700">{f.label}</span>
                      {override && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Override</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {override && (
                      <button onClick={() => resetOverride(f.key)} className="text-xs text-slate-500 hover:text-slate-700">Reset</button>
                    )}
                    <button
                      onClick={() => toggleOverride(f.key, !enabled)}
                      disabled={saving === f.key}
                      className={`relative w-11 h-6 rounded-full transition ${enabled ? 'bg-orange-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!selectedOrg && (
          <div className="p-8 text-center text-slate-500">
            Select an organisation to manage feature overrides
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== ACTIVITY PAGE ====================

function ActivityPage() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/ops/activity').then(d => setActivity(d.activity || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading activity...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Action</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">User</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Entity</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activity.map((a, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{a.action}</td>
                <td className="px-6 py-4 text-slate-600">{a.first_name} {a.last_name}</td>
                <td className="px-6 py-4 text-slate-500">{a.entity_type} / {a.entity_id?.slice(0, 8)}...</td>
                <td className="px-6 py-4 text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!activity.length && (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No activity recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== ROUTES ====================

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
    <CurrencyProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
        <Route path="/onboard" element={<ProtectedRoute><OnboardPage /></ProtectedRoute>} />
        <Route path="/licenses" element={<ProtectedRoute><LicensesPage /></ProtectedRoute>} />
        <Route path="/features" element={<ProtectedRoute><FeaturesPage /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
      </Routes>
    </CurrencyProvider>
    </AuthProvider>
  );
}
