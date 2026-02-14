import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Building2, CreditCard, Activity, LogOut, Users, Key,
  Settings, Shield, FileText, ChevronDown, Menu, X, Loader2, AlertTriangle,
  TrendingUp, Calendar, Plus, Search, Edit, Copy, ExternalLink, ArrowLeft,
  CheckCircle, XCircle, Info, RefreshCw, Download, Filter, Trash2
} from 'lucide-react';
import { apiFetch } from './api.js';

// ==================== TOAST CONTEXT ====================

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const styles = {
    success: 'border-green-500/50 bg-green-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    warning: 'border-amber-500/50 bg-amber-500/10',
    info: 'border-blue-500/50 bg-blue-500/10',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm ${styles[toast.type] || styles.info}`}
        >
          {icons[toast.type] || icons.info}
          <span className="text-white text-sm flex-1">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ==================== AUTH CONTEXT ====================

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ops_token');
    if (!token) {
      setLoading(false);
      return;
    }

    apiFetch('/api/ops/auth/me')
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('ops_token');
        setLoading(false);
      });
  }, []);

  const login = async (email, password, mfaToken) => {
    const data = await apiFetch('/api/ops/auth/login', {
      method: 'POST',
      body: { email, password, mfaToken },
    });

    if (data.requireMfa) {
      return { requireMfa: true };
    }

    localStorage.setItem('ops_token', data.token);
    setUser(data.user);
    return { success: true, user: data.user };
  };

  const logout = async () => {
    try {
      await apiFetch('/api/ops/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore logout errors
    }
    localStorage.removeItem('ops_token');
    setUser(null);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions?.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

// ==================== LOGIN PAGE ====================

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, showMfa ? mfaToken : undefined);

      if (result.requireMfa) {
        setShowMfa(true);
        setLoading(false);
        return;
      }

      if (result.user?.forcePasswordChange) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Uplift Ops</h1>
            <p className="text-slate-400 mt-2">Internal Admin Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="you@uplifthq.co.uk"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            {showMfa && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">MFA Code</label>
                <input
                  type="text"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==================== SIDEBAR ====================

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { path: '/onboarding', label: 'Onboarding', icon: Settings, permission: 'onboard' },
  { path: '/customers', label: 'Customers', icon: Building2, permission: 'customers.view' },
  { path: '/licenses', label: 'Licenses', icon: Key, permission: 'licenses.view' },
  { path: '/features', label: 'Features', icon: Shield, permission: 'features.view' },
  { path: '/billing', label: 'Billing', icon: CreditCard, permission: 'billing.view' },
  { path: '/activity', label: 'Activity', icon: Activity, permission: 'activity.view' },
  { path: '/audit', label: 'Audit', icon: FileText, permission: 'audit.view', roles: ['super_admin', 'admin'] },
  { path: '/users', label: 'Users', icon: Users, permission: 'users.view', roles: ['super_admin'] },
];

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes(user?.role)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <div className={`bg-slate-800 border-r border-slate-700 flex flex-col h-screen ${collapsed ? 'w-16' : 'w-64'} transition-all duration-200`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && <span className="text-xl font-bold text-white">Uplift Ops</span>}
        <button onClick={onToggle} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Menu */}
      <div className="p-2 border-t border-slate-700 relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-medium">
            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white truncate">
                  {user?.name || user?.email}
                </div>
                <div className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-slate-700 rounded-lg shadow-lg border border-slate-600 py-1">
            <Link
              to="/account"
              onClick={() => setShowUserMenu(false)}
              className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-600 hover:text-white"
            >
              My Account
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== LAYOUT ====================

function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// ==================== PAGE COMPONENTS ====================

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="w-12 h-12 text-slate-500 mx-auto mb-4" />}
      <h3 className="text-lg font-medium text-slate-300">{title}</h3>
      {description && <p className="text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

// ==================== DASHBOARD ====================

function DashboardPage() {
  const [data, setData] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/ops/dashboard'),
      apiFetch('/api/ops/billing/overview').catch(() => null)
    ])
      .then(([dashData, billData]) => {
        setData(dashData);
        setBillingData(billData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>;

  const metrics = data?.metrics || {};

  const formatMoney = (amount, inPence = true) => {
    const value = inPence ? (amount || 0) / 100 : (amount || 0);
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-GB').format(num || 0);
  };

  const failedPaymentsCount = data?.failedPayments?.length || 0;
  const failedPaymentsTotal = data?.failedPayments?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your operations" />
      <div className="p-6 space-y-6">
        {/* TOP ROW - 4 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total MRR"
            value={formatMoney(metrics.mrr, false)}
            icon={CreditCard}
            color="text-green-500"
          />
          <MetricCard
            title="Active Subscriptions"
            value={formatNumber(metrics.active_subscriptions)}
            icon={Building2}
            color="text-blue-500"
          />
          <MetricCard
            title="Total Seats"
            value={formatNumber(metrics.total_seats)}
            subtitle="core + flex"
            icon={Users}
            color="text-purple-500"
          />
          <MetricCard
            title="Active Trials"
            value={formatNumber(metrics.trials)}
            icon={Calendar}
            color="text-amber-500"
          />
        </div>

        {/* SECOND ROW - Failed Payments Alert + Revenue by Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Failed Payments Alert */}
          <div className={`rounded-lg border p-4 ${failedPaymentsCount > 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-6 h-6 ${failedPaymentsCount > 0 ? 'text-red-500' : 'text-slate-500'}`} />
              <div>
                <h3 className={`font-medium ${failedPaymentsCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  Failed Payments
                </h3>
                {failedPaymentsCount > 0 ? (
                  <p className="text-sm text-red-300">
                    {failedPaymentsCount} payment{failedPaymentsCount !== 1 ? 's' : ''} failed totalling {formatMoney(failedPaymentsTotal)}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No failed payments</p>
                )}
              </div>
            </div>
          </div>

          {/* Revenue by Plan */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="font-medium text-white mb-3">Revenue by Plan</h3>
            {billingData?.mrrByPlan?.length > 0 ? (
              <div className="space-y-2">
                {billingData.mrrByPlan.map((plan, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{plan.plan_name}</span>
                    <span className="text-white font-medium">{formatMoney(plan.mrr, false)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No subscription revenue yet</p>
            )}
          </div>
        </div>

        {/* THIRD ROW - Recent Activity */}
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="font-medium text-white">Recent Activity</h3>
          </div>
          <div className="p-4">
            {data?.recentActivity?.length > 0 ? (
              <div className="space-y-3">
                {data.recentActivity.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-slate-700/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-slate-300">{item.org_name}</span>
                      <span className="text-slate-500 text-xs">{item.type?.replace('_', ' ')}</span>
                    </div>
                    <span className="text-slate-500 text-xs">
                      {new Date(item.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No recent activity" description="Activity will appear here as customers are onboarded" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color = 'text-orange-500' }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <Icon className={`w-8 h-8 ${color}`} />}
      </div>
    </div>
  );
}

// ==================== CUSTOMERS PAGE ====================

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      apiFetch('/api/ops/customers'),
      apiFetch('/api/ops/plans').catch(() => ({ plans: [] }))
    ])
      .then(([custData, planData]) => {
        setCustomers(custData.customers || []);
        setPlans(planData.plans || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = !planFilter || c.plan_name === planFilter;
    const matchesStatus = !statusFilter || c.subscription_status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} total customers`}>
        <Link to="/onboarding" className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Onboard Customer
        </Link>
      </PageHeader>
      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Plans</option>
            {plans.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>

        {loading ? <LoadingSpinner /> : error ? (
          <div className="text-red-400">Error: {error}</div>
        ) : filteredCustomers.length === 0 ? (
          <EmptyState icon={Building2} title="No customers found" description={search || planFilter || statusFilter ? "Try adjusting your filters" : "Onboard your first customer to get started"} />
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Plan</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Seats</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredCustomers.map(customer => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="hover:bg-slate-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{customer.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {customer.plan_name ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          {customer.plan_name}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={customer.subscription_status} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {customer.core_seats || 0}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {new Date(customer.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-500/20 text-green-400',
    trialing: 'bg-amber-500/20 text-amber-400',
    past_due: 'bg-red-500/20 text-red-400',
    canceled: 'bg-slate-500/20 text-slate-400',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.canceled}`}>
      {status || 'none'}
    </span>
  );
}

// ==================== PLACEHOLDER PAGES ====================

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({
    // Step 1: Company
    name: '',
    billingEmail: '',
    billingName: '',
    taxId: '',
    // Step 2: Plan
    planSlug: 'growth',
    // Step 3: Seats
    coreSeats: 10,
    flexSeats: 0,
    trialDays: 14,
    // Step 4: Admin
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminPassword: '',
  });
  const [createdOrg, setCreatedOrg] = useState(null);

  useEffect(() => {
    apiFetch('/api/ops/plans')
      .then(data => setPlans(data.plans || []))
      .catch(() => {});
  }, []);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    let pw = '';
    for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    updateField('adminPassword', pw);
  };

  const handleNext = async () => {
    setError('');

    if (step === 1) {
      if (!formData.name || !formData.billingEmail) {
        setError('Company name and billing email are required');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.planSlug) {
        setError('Please select a plan');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (formData.coreSeats < 1) {
        setError('At least 1 core seat is required');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!formData.adminEmail || !formData.adminPassword) {
        setError('Admin email and password are required');
        return;
      }
      if (formData.adminPassword.length < 12) {
        setError('Password must be at least 12 characters');
        return;
      }
      setStep(5);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Create organization
      const orgResult = await apiFetch('/api/ops/onboard/organization', {
        method: 'POST',
        body: {
          name: formData.name,
          billingEmail: formData.billingEmail,
          billingName: formData.billingName || formData.name,
          taxId: formData.taxId || null,
        },
      });

      const orgId = orgResult.organization.id;
      setCreatedOrg(orgResult.organization);

      // Step 2: Create subscription
      await apiFetch('/api/ops/onboard/subscription', {
        method: 'POST',
        body: {
          organizationId: orgId,
          planSlug: formData.planSlug,
          coreSeats: formData.coreSeats,
          flexSeats: formData.flexSeats,
          trialDays: formData.trialDays,
        },
      });

      // Step 3: Create admin user
      await apiFetch('/api/ops/onboard/user', {
        method: 'POST',
        body: {
          organizationId: orgId,
          email: formData.adminEmail,
          firstName: formData.adminFirstName,
          lastName: formData.adminLastName,
          password: formData.adminPassword,
        },
      });

      setStep(6); // Success step
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding');
    }
    setLoading(false);
  };

  const selectedPlan = plans.find(p => p.slug === formData.planSlug);

  return (
    <div>
      <PageHeader title="Customer Onboarding" subtitle={`Step ${Math.min(step, 5)} of 5`} />
      <div className="p-6 max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="flex items-center mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 5 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-orange-600' : 'bg-slate-700'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          {/* Step 1: Company Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Company Details</h2>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="Acme Ltd"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Billing Email *</label>
                <input
                  type="email"
                  value={formData.billingEmail}
                  onChange={(e) => updateField('billingEmail', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="billing@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Billing Contact Name</label>
                <input
                  type="text"
                  value={formData.billingName}
                  onChange={(e) => updateField('billingName', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">VAT/Tax ID</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => updateField('taxId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="GB123456789"
                />
              </div>
            </div>
          )}

          {/* Step 2: Plan Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Select Plan</h2>
              <div className="grid gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => updateField('planSlug', plan.slug)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      formData.planSlug === plan.slug
                        ? 'bg-orange-600/20 border-orange-500'
                        : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{plan.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          £{(plan.core_price_per_seat / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400">per seat/month</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Seat Configuration */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Configure Seats</h2>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Core Seats *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.coreSeats}
                  onChange={(e) => updateField('coreSeats', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Guaranteed seats with fixed monthly cost</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Flex Seats Limit</label>
                <input
                  type="number"
                  min="0"
                  value={formData.flexSeats}
                  onChange={(e) => updateField('flexSeats', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Pay-as-you-go seats above core allocation</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Trial Days</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={formData.trialDays}
                  onChange={(e) => updateField('trialDays', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 for no trial</p>
              </div>
              {selectedPlan && (
                <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400">Estimated Monthly Cost:</p>
                  <p className="text-2xl font-bold text-white">
                    £{((formData.coreSeats * (selectedPlan.core_price_per_seat || 0)) / 100).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Admin User */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Create Admin User</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.adminFirstName}
                    onChange={(e) => updateField('adminFirstName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.adminLastName}
                    onChange={(e) => updateField('adminLastName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => updateField('adminEmail', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="admin@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.adminPassword}
                    onChange={(e) => updateField('adminPassword', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                    placeholder="Min 12 characters"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Must be 12+ chars with uppercase, lowercase, number, special char</p>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Review & Confirm</h2>
              <div className="space-y-3">
                <ReviewRow label="Company" value={formData.name} />
                <ReviewRow label="Billing Email" value={formData.billingEmail} />
                <ReviewRow label="Plan" value={selectedPlan?.name || formData.planSlug} />
                <ReviewRow label="Core Seats" value={formData.coreSeats} />
                <ReviewRow label="Flex Seats" value={formData.flexSeats} />
                <ReviewRow label="Trial Days" value={formData.trialDays} />
                <ReviewRow label="Admin Email" value={formData.adminEmail} />
                <ReviewRow label="Admin Password" value={formData.adminPassword} mono />
              </div>
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg">
                <p className="text-amber-400 text-sm">
                  Please double-check the password above. You will need to share it with the customer.
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Success */}
          {step === 6 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Customer Created!</h2>
              <p className="text-slate-400 mb-6">
                {formData.name} has been successfully onboarded.
              </p>
              <div className="bg-slate-700/50 rounded-lg p-4 text-left max-w-sm mx-auto mb-6">
                <p className="text-sm text-slate-400">Login Credentials:</p>
                <p className="text-white font-medium">{formData.adminEmail}</p>
                <p className="text-white font-mono text-sm">{formData.adminPassword}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate(`/customers/${createdOrg?.id}`)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                >
                  View Customer
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setFormData({
                      name: '', billingEmail: '', billingName: '', taxId: '',
                      planSlug: 'growth', coreSeats: 10, flexSeats: 0, trialDays: 14,
                      adminEmail: '', adminFirstName: '', adminLastName: '', adminPassword: '',
                    });
                    setCreatedOrg(null);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Onboard Another
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          {step < 6 && (
            <div className="flex justify-between mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg"
              >
                Back
              </button>
              {step < 5 ? (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Creating...' : 'Create Customer'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, mono }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-700/50">
      <span className="text-slate-400">{label}</span>
      <span className={`text-white ${mono ? 'font-mono text-sm' : ''}`}>{value}</span>
    </div>
  );
}

function LicensesPage() {
  const toast = useToast();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLicense, setSelectedLicense] = useState(null);
  const navigate = useNavigate();

  const loadLicenses = () => {
    apiFetch('/api/ops/licenses')
      .then(data => setLicenses(data.licenses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLicenses(); }, []);

  const filtered = licenses.filter(l => {
    const matchesSearch = !search ||
      l.license_key?.toLowerCase().includes(search.toLowerCase()) ||
      l.org_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
  };

  return (
    <div>
      <PageHeader title="Licenses" subtitle={`${licenses.length} license keys`} />
      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by key or organization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={Key} title="No licenses found" description={search || statusFilter ? "Try adjusting your filters" : "License keys will appear here once customers are onboarded"} />
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">License Key</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Organization</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Plan</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Seats</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Valid Until</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map(license => (
                  <tr key={license.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-green-400">
                          {license.license_key}
                        </code>
                        <button onClick={() => copyKey(license.license_key)} className="text-slate-400 hover:text-white">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/customers/${license.organization_id}`)}
                        className="text-white hover:text-orange-400"
                      >
                        {license.org_name || 'Unknown'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                        {license.plan_type || 'growth'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {license.activated_seats || 0} / {license.max_seats || 0}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={license.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {license.valid_until
                        ? new Date(license.valid_until).toLocaleDateString('en-GB')
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLicense(license)}
                        className="text-slate-400 hover:text-white text-sm"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit License Modal */}
        {selectedLicense && (
          <EditLicenseModal
            license={selectedLicense}
            onClose={() => setSelectedLicense(null)}
            onSave={async (data) => {
              try {
                await apiFetch(`/api/ops/licenses/${selectedLicense.id}`, { method: 'PATCH', body: data });
                setSelectedLicense(null);
                loadLicenses();
                toast.success('License updated');
              } catch (err) {
                toast.error('Failed to update license: ' + err.message);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function EditLicenseModal({ license, onClose, onSave }) {
  const [formData, setFormData] = useState({
    max_seats: license.max_seats || 0,
    flex_limit: license.flex_limit || 0,
    valid_until: license.valid_until ? license.valid_until.split('T')[0] : '',
    status: license.status || 'active',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <Modal title="Edit License" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">License Key</label>
          <code className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-green-400">
            {license.license_key}
          </code>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Organization</label>
          <p className="text-white">{license.org_name}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Max Seats</label>
            <input
              type="number"
              value={formData.max_seats}
              onChange={(e) => setFormData({ ...formData, max_seats: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Flex Limit</label>
            <input
              type="number"
              value={formData.flex_limit}
              onChange={(e) => setFormData({ ...formData, flex_limit: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              min="0"
            />
            <p className="text-xs text-slate-500 mt-1">Extra seats allowed above max</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Valid Until</label>
          <input
            type="date"
            value={formData.valid_until}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-lg">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FeaturesPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Available feature flags
  const availableFeatures = [
    { key: 'ai_summaries', label: 'AI Summaries', description: 'AI-powered shift and performance summaries' },
    { key: 'advanced_scheduling', label: 'Advanced Scheduling', description: 'Multi-location and complex scheduling' },
    { key: 'custom_reports', label: 'Custom Reports', description: 'Build and export custom reports' },
    { key: 'api_access', label: 'API Access', description: 'REST API access for integrations' },
    { key: 'sso', label: 'SSO/SAML', description: 'Single sign-on integration' },
    { key: 'white_label', label: 'White Label', description: 'Custom branding and domain' },
    { key: 'multi_location', label: 'Multi-Location', description: 'Manage multiple locations' },
    { key: 'payroll_integration', label: 'Payroll Integration', description: 'Connect to payroll providers' },
  ];

  useEffect(() => {
    apiFetch('/api/ops/customers?limit=200')
      .then(data => setCustomers(data.customers || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      setLoading(true);
      apiFetch(`/api/ops/features/${selectedOrg}`)
        .then(data => setFeatures(data.features || []))
        .catch(() => setFeatures([]))
        .finally(() => setLoading(false));
    }
  }, [selectedOrg]);

  const toggleFeature = async (featureKey, currentlyEnabled) => {
    try {
      await apiFetch(`/api/ops/features/${selectedOrg}`, {
        method: 'POST',
        body: {
          featureKey,
          enabled: !currentlyEnabled,
          reason: 'Manual toggle from ops portal',
        },
      });
      // Reload features
      const data = await apiFetch(`/api/ops/features/${selectedOrg}`);
      setFeatures(data.features || []);
      toast.success('Feature flag updated');
    } catch (err) {
      toast.error('Failed to toggle feature: ' + err.message);
    }
  };

  const isEnabled = (key) => features.find(f => f.feature_key === key)?.enabled ?? false;

  const filteredCustomers = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Feature Flags" subtitle="Enable or disable features per organization" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Organization Selector */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="font-medium text-white mb-3">Select Organization</h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedOrg(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedOrg === c.id
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="lg:col-span-2">
            {!selectedOrg ? (
              <EmptyState icon={Shield} title="Select an Organization" description="Choose an organization from the list to manage its features" />
            ) : loading ? (
              <LoadingSpinner />
            ) : (
              <div className="bg-slate-800 rounded-lg border border-slate-700">
                <div className="px-4 py-3 border-b border-slate-700">
                  <h3 className="font-medium text-white">
                    Features for {customers.find(c => c.id === selectedOrg)?.name}
                  </h3>
                </div>
                <div className="divide-y divide-slate-700">
                  {availableFeatures.map(feature => {
                    const enabled = isEnabled(feature.key);
                    const override = features.find(f => f.feature_key === feature.key);
                    return (
                      <div key={feature.key} className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{feature.label}</h4>
                          <p className="text-sm text-slate-400">{feature.description}</p>
                          {override?.expires_at && (
                            <p className="text-xs text-amber-400 mt-1">
                              Expires: {new Date(override.expires_at).toLocaleDateString('en-GB')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleFeature(feature.key, enabled)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            enabled ? 'bg-green-500' : 'bg-slate-600'
                          }`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                            enabled ? 'left-7' : 'left-1'
                          }`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingPage() {
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const navigate = useNavigate();

  const formatMoney = (amount) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((amount || 0) / 100);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/ops/billing/overview'),
      apiFetch('/api/ops/invoices?limit=50')
    ])
      .then(([billing, inv]) => {
        setData(billing);
        setInvoices(inv.invoices || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalMRR = data?.mrrByPlan?.reduce((sum, p) => sum + (p.mrr || 0), 0) || 0;

  return (
    <div>
      <PageHeader title="Billing" subtitle="Revenue and payment management" />
      <div className="p-6 space-y-6">
        {loading ? <LoadingSpinner /> : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Total MRR"
                value={formatMoney(totalMRR * 100)}
                icon={CreditCard}
                color="text-green-500"
              />
              <MetricCard
                title="Failed Payments"
                value={data?.failedPayments?.length || 0}
                icon={AlertTriangle}
                color={data?.failedPayments?.length > 0 ? 'text-red-500' : 'text-slate-500'}
              />
              <MetricCard
                title="Upcoming Renewals"
                value={data?.upcomingRenewals?.length || 0}
                subtitle="Next 7 days"
                icon={Calendar}
                color="text-amber-500"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-700">
              {['overview', 'invoices', 'failed', 'renewals'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === t ? 'border-orange-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* MRR by Plan */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                  <h3 className="font-medium text-white mb-4">MRR by Plan</h3>
                  {data?.mrrByPlan?.length > 0 ? (
                    <div className="space-y-3">
                      {data.mrrByPlan.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                              {p.plan_name}
                            </span>
                            <span className="text-slate-400 text-sm">{p.customer_count} customers</span>
                          </div>
                          <span className="text-white font-medium">{formatMoney((p.mrr || 0) * 100)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No subscription data</p>
                  )}
                </div>

                {/* Recent Changes */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                  <h3 className="font-medium text-white mb-4">Recent Seat Changes</h3>
                  {data?.recentChanges?.length > 0 ? (
                    <div className="space-y-3">
                      {data.recentChanges.slice(0, 8).map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{c.org_name}</span>
                          <span className="text-slate-400">
                            {c.previous_core_seats} → {c.new_core_seats} seats
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No recent changes</p>
                  )}
                </div>
              </div>
            )}

            {tab === 'invoices' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Invoice</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Organization</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Amount</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-white font-mono text-sm">
                          {inv.stripe_invoice_number || inv.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/customers/${inv.organization_id}`)}
                            className="text-white hover:text-orange-400"
                          >
                            {inv.org_name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-white">{formatMoney(inv.total)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inv.status === 'paid' ? 'active' : inv.status === 'open' ? 'past_due' : inv.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">
                          {new Date(inv.created_at).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'failed' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700">
                {data?.failedPayments?.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {data.failedPayments.map((fp, i) => (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{fp.org_name}</p>
                          <p className="text-slate-400 text-sm">
                            {formatMoney(fp.total)} - Due: {new Date(fp.due_date).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {fp.stripe_hosted_invoice_url && (
                            <a
                              href={fp.stripe_hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`/customers/${fp.org_id}`)}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">✓</span>
                    </div>
                    <p className="text-green-400">All payments successful!</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'renewals' && (
              <div className="bg-slate-800 rounded-lg border border-slate-700">
                {data?.upcomingRenewals?.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {data.upcomingRenewals.map((r, i) => (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{r.org_name}</p>
                          <p className="text-slate-400 text-sm">
                            {r.plan_name} - {r.core_seats} seats
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatMoney((r.amount || 0) * 100)}</p>
                          <p className="text-slate-500 text-sm">
                            {new Date(r.current_period_end).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Calendar} title="No upcoming renewals" description="No subscriptions renewing in the next 7 days" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActivityPage() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    apiFetch('/api/ops/activity')
      .then(data => setActivity(data.activity || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Get unique action types and users for filter dropdowns
  const actionTypes = [...new Set(activity.map(a => a.action).filter(Boolean))];
  const users = [...new Set(activity.map(a => a.user_name || a.user_email).filter(Boolean))];

  // Filter activity
  const filtered = activity.filter(item => {
    const matchesSearch = !search ||
      item.action?.toLowerCase().includes(search.toLowerCase()) ||
      item.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      item.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = !actionFilter || item.action === actionFilter;
    const matchesUser = !userFilter || item.user_name === userFilter || item.user_email === userFilter;
    const itemDate = new Date(item.created_at);
    const matchesDateFrom = !dateFrom || itemDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || itemDate <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesAction && matchesUser && matchesDateFrom && matchesDateTo;
  });

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = search || actionFilter || userFilter || dateFrom || dateTo;

  return (
    <div>
      <PageHeader title="Activity" subtitle="Ops team activity log" />
      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="">All Actions</option>
            {actionTypes.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          {users.length > 0 && (
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            title="To date"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={Activity} title="No activity found" description={hasFilters ? "Try adjusting your filters" : "Actions will be logged here"} />
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-2 bg-slate-700/30 text-sm text-slate-400">
              Showing {filtered.length} of {activity.length} entries
            </div>
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Action</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Entity</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">User</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                        {item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{item.entity_type}</td>
                    <td className="px-4 py-3 text-slate-300">{item.user_name || item.user_email || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm">
                      {new Date(item.created_at).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AuditPage() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    apiFetch('/api/ops/audit')
      .then(data => setEntries(data.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Get unique action types and users for filter dropdowns
  const actionTypes = [...new Set(entries.map(e => e.action).filter(Boolean))];
  const users = [...new Set(entries.map(e => e.user_name || e.ops_user_email).filter(Boolean))];

  // Filter entries
  const filtered = entries.filter(entry => {
    const matchesSearch = !search ||
      entry.action?.toLowerCase().includes(search.toLowerCase()) ||
      entry.target_name?.toLowerCase().includes(search.toLowerCase()) ||
      entry.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      entry.ip_address?.includes(search);
    const matchesAction = !actionFilter || entry.action === actionFilter;
    const matchesUser = !userFilter || entry.user_name === userFilter || entry.ops_user_email === userFilter;
    const entryDate = new Date(entry.created_at);
    const matchesDateFrom = !dateFrom || entryDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || entryDate <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesAction && matchesUser && matchesDateFrom && matchesDateTo;
  });

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = search || actionFilter || userFilter || dateFrom || dateTo;

  const exportCSV = () => {
    const headers = ['User', 'Action', 'Target', 'IP Address', 'Timestamp'];
    const rows = filtered.map(entry => [
      entry.user_name || entry.ops_user_email || '',
      entry.action || '',
      entry.target_name || '',
      entry.ip_address || '',
      new Date(entry.created_at).toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Audit log exported');
  };

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Security and access audit trail">
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </PageHeader>
      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="">All Actions</option>
            {actionTypes.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          {users.length > 0 && (
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            title="To date"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No audit entries found" description={hasFilters ? "Try adjusting your filters" : "Audit events will be logged here"} />
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-2 bg-slate-700/30 text-sm text-slate-400">
              Showing {filtered.length} of {entries.length} entries
            </div>
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">User</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Action</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Target</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">IP</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300">{entry.user_name || entry.ops_user_email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{entry.target_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm font-mono">{entry.ip_address}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm">
                      {new Date(entry.created_at).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/api/ops/users'),
      apiFetch('/api/ops/roles').catch(() => ({ roles: [] }))
    ])
      .then(([userData, roleData]) => {
        setUsers(userData.users || []);
        setRoles(roleData.roles || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (formData) => {
    try {
      const result = await apiFetch('/api/ops/users', {
        method: 'POST',
        body: formData,
      });
      setCreatedCreds({ email: formData.email, password: result.tempPassword });
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleResetPassword = async (userId) => {
    setConfirmAction({
      title: 'Reset Password',
      message: 'Are you sure you want to reset this user\'s password?',
      onConfirm: async () => {
        try {
          const result = await apiFetch(`/api/ops/users/${userId}/reset-password`, { method: 'POST' });
          setCreatedCreds({ tempPassword: result.tempPassword });
          toast.success('Password reset successfully');
        } catch (err) {
          toast.error('Failed to reset password: ' + err.message);
        }
        setConfirmAction(null);
      }
    });
  };

  const handleUnlock = async (userId) => {
    try {
      await apiFetch(`/api/ops/users/${userId}/unlock`, { method: 'POST' });
      loadData();
      toast.success('User unlocked');
    } catch (err) {
      toast.error('Failed to unlock: ' + err.message);
    }
  };

  const handleDelete = async (userId) => {
    setConfirmAction({
      title: 'Delete User',
      message: 'Delete this user? This action cannot be undone.',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/ops/users/${userId}`, { method: 'DELETE' });
          loadData();
          toast.success('User deleted');
        } catch (err) {
          toast.error('Failed to delete: ' + err.message);
        }
        setConfirmAction(null);
      }
    });
  };

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.length} ops users`}>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </PageHeader>
      <div className="p-6">
        {loading ? <LoadingSpinner /> : error ? (
          <div className="text-red-400">Error: {error}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users" description="Create the first ops user" />
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">User</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Sessions</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Last Login</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                        user.role === 'admin' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {(user.role || user.role_name)?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={user.status} />
                        {user.locked_until && new Date(user.locked_until) > new Date() && (
                          <span className="text-red-400 text-xs">Locked</span>
                        )}
                        {user.mfa_enabled && (
                          <span className="text-green-400 text-xs">MFA</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {user.active_sessions || 0}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-sm">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-GB') : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-slate-400 hover:text-white text-sm"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="text-slate-400 hover:text-amber-400 text-sm"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        {user.locked_until && (
                          <button
                            onClick={() => handleUnlock(user.id)}
                            className="text-amber-400 hover:text-amber-300 text-sm"
                            title="Unlock"
                          >
                            Unlock
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Created Credentials Modal */}
        {createdCreds && (
          <Modal title="User Created" onClose={() => setCreatedCreds(null)}>
            <div className="space-y-4">
              <p className="text-slate-300">Share these credentials with the new user:</p>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white font-medium">{createdCreds.email}</p>
                <p className="text-sm text-slate-400 mt-2">Temporary Password</p>
                <p className="text-white font-mono">{createdCreds.password}</p>
              </div>
              <p className="text-xs text-amber-400">User will be required to change password on first login.</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`);
                  setCreatedCreds(null);
                }}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
              >
                Copy & Close
              </button>
            </div>
          </Modal>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <CreateUserModal
            roles={roles}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreate}
          />
        )}

        {/* Edit User Modal */}
        {selectedUser && (
          <EditUserModal
            user={selectedUser}
            roles={roles}
            onClose={() => setSelectedUser(null)}
            onSave={async (data) => {
              await apiFetch(`/api/ops/users/${selectedUser.id}`, { method: 'PATCH', body: data });
              setSelectedUser(null);
              loadData();
              toast.success('User updated');
            }}
          />
        )}

        {/* Confirmation Modal */}
        {confirmAction && (
          <Modal title={confirmAction.title} onClose={() => setConfirmAction(null)}>
            <p className="text-slate-300 mb-6">{confirmAction.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
                Cancel
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className={`px-4 py-2 rounded-lg text-white ${confirmAction.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                Confirm
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function CreateUserModal({ roles, onClose, onCreate }) {
  const [formData, setFormData] = useState({ email: '', name: '', roleId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!formData.email || !formData.name || !formData.roleId) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    try {
      await onCreate(formData);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Modal title="Create User" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            placeholder="jane@uplifthq.co.uk"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
          <select
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="">Select role...</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-lg">
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, roles, onClose, onSave }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: user.name || '',
    roleId: user.role_id || '',
    status: user.status || 'active',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(formData);
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <Modal title="Edit User" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
          <select
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-lg">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [sessions, setSessions] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // MFA state
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaToken, setMfaToken] = useState('');

  useEffect(() => {
    if (tab === 'sessions') {
      apiFetch('/api/ops/sessions')
        .then(data => setSessions(data.sessions || []))
        .catch(() => {});
    } else if (tab === 'activity') {
      apiFetch('/api/ops/audit/my')
        .then(data => setAuditLog(data.entries || []))
        .catch(() => {});
    }
  }, [tab]);

  const handlePasswordChange = async () => {
    setPwError('');
    setPwSuccess(false);

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 12) {
      setPwError('Password must be at least 12 characters');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/api/ops/auth/change-password', {
        method: 'POST',
        body: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
      });
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.message);
    }
    setLoading(false);
  };

  const handleSetupMfa = async () => {
    try {
      const result = await apiFetch('/api/ops/auth/setup-mfa', { method: 'POST' });
      setMfaSetup(result);
    } catch (err) {
      toast.error('Failed to setup MFA: ' + err.message);
    }
  };

  const handleVerifyMfa = async () => {
    try {
      await apiFetch('/api/ops/auth/verify-mfa', { method: 'POST', body: { token: mfaToken } });
      setMfaSetup(null);
      setMfaToken('');
      toast.success('MFA enabled successfully!');
    } catch (err) {
      toast.error('Failed to verify: ' + err.message);
    }
  };

  const handleDisableMfa = async () => {
    setConfirmAction({
      title: 'Disable MFA',
      message: 'Enter your password to disable MFA',
      hasPasswordInput: true,
      onConfirm: async (password) => {
        if (!password) {
          toast.error('Password is required');
          return;
        }
        try {
          await apiFetch('/api/ops/auth/disable-mfa', { method: 'POST', body: { password } });
          toast.success('MFA disabled');
        } catch (err) {
          toast.error('Failed: ' + err.message);
        }
        setConfirmAction(null);
      }
    });
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await apiFetch(`/api/ops/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success('Session revoked');
    } catch (err) {
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    setConfirmAction({
      title: 'Revoke All Sessions',
      message: 'This will log you out of all other devices. Continue?',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiFetch('/api/ops/sessions', { method: 'DELETE' });
          setSessions(sessions.filter(s => s.isCurrent));
          toast.success('All other sessions revoked');
        } catch (err) {
          toast.error('Failed to revoke sessions');
        }
        setConfirmAction(null);
      }
    });
  };

  return (
    <div>
      <PageHeader title="My Account" subtitle="Manage your account and security settings" />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
          {['profile', 'security', 'sessions', 'activity'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-orange-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl">
            <h3 className="text-lg font-medium text-white mb-4">Profile Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-lg font-medium">{user?.name}</p>
                  <p className="text-slate-400">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-slate-400">Role</label>
                  <p className="text-white mt-1 capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400">MFA Status</label>
                  <p className={`mt-1 ${user?.mfaEnabled ? 'text-green-400' : 'text-amber-400'}`}>
                    {user?.mfaEnabled ? 'Enabled' : 'Not Enabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <div className="max-w-2xl space-y-6">
            {/* Change Password */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
                {pwSuccess && <p className="text-green-400 text-sm">Password changed successfully!</p>}
                <button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>

            {/* MFA Settings */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-medium text-white mb-4">Two-Factor Authentication</h3>
              {user?.mfaEnabled ? (
                <div>
                  <p className="text-green-400 mb-4">MFA is currently enabled on your account.</p>
                  <button
                    onClick={handleDisableMfa}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                  >
                    Disable MFA
                  </button>
                </div>
              ) : mfaSetup ? (
                <div className="space-y-4">
                  <p className="text-slate-300">Scan this QR code with your authenticator app:</p>
                  <img src={mfaSetup.qrCodeUrl} alt="MFA QR Code" className="w-48 h-48 bg-white rounded-lg" />
                  <p className="text-slate-400 text-sm">Or enter this secret manually: <code className="bg-slate-700 px-2 py-1 rounded">{mfaSetup.secret}</code></p>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Enter 6-digit code to verify</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mfaToken}
                        onChange={(e) => setMfaToken(e.target.value)}
                        maxLength={6}
                        className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center tracking-widest"
                        placeholder="000000"
                      />
                      <button onClick={handleVerifyMfa} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                        Verify & Enable
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 mb-4">Add an extra layer of security to your account.</p>
                  <button
                    onClick={handleSetupMfa}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                  >
                    Setup MFA
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          <div className="max-w-2xl">
            <div className="bg-slate-800 rounded-lg border border-slate-700">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-medium text-white">Active Sessions</h3>
                <button
                  onClick={handleRevokeAllSessions}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Revoke All Other Sessions
                </button>
              </div>
              {sessions.length > 0 ? (
                <div className="divide-y divide-slate-700">
                  {sessions.map(session => (
                    <div key={session.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">{session.ip_address}</p>
                        <p className="text-slate-500 text-xs truncate max-w-xs">{session.user_agent}</p>
                        <p className="text-slate-500 text-xs">
                          Last active: {new Date(session.last_active_at).toLocaleString('en-GB')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">No active sessions found</div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="max-w-4xl">
            <div className="bg-slate-800 rounded-lg border border-slate-700">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="font-medium text-white">Your Activity Log</h3>
              </div>
              {auditLog.length > 0 ? (
                <div className="divide-y divide-slate-700">
                  {auditLog.map((entry, i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">{entry.action}</p>
                        {entry.target_name && (
                          <p className="text-slate-400 text-xs">{entry.target_type}: {entry.target_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-xs">{entry.ip_address}</p>
                        <p className="text-slate-500 text-xs">
                          {new Date(entry.created_at).toLocaleString('en-GB')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">No activity recorded</div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmAction && (
          <ConfirmationModal
            title={confirmAction.title}
            message={confirmAction.message}
            destructive={confirmAction.destructive}
            hasPasswordInput={confirmAction.hasPasswordInput}
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    </div>
  );
}

function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    apiFetch(`/api/ops/customers/${id}`)
      .then(d => {
        setData(d);
        setNotes(d.notes || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/ops/customers/${id}/notes`, {
        method: 'POST',
        body: { note: newNote }
      });
      setNewNote('');
      loadData();
      toast.success('Note added successfully');
    } catch (e) {
      toast.error('Failed to add note: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>;
  if (!data?.customer) return <div className="p-6 text-red-400">Customer not found</div>;

  const customer = data.customer;
  const formatMoney = (amount) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((amount || 0) / 100);

  return (
    <div>
      {/* Header with back button */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => navigate('/customers')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
              {customer.plan_name && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                  {customer.plan_name}
                </span>
              )}
              <StatusBadge status={customer.subscription_status || customer.status} />
            </div>
            <p className="text-slate-400 mt-1">Customer since {new Date(customer.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <ActionButton label="Modify Seats" onClick={() => setActiveModal('seats')} />
          <ActionButton label="Extend Trial" onClick={() => setActiveModal('trial')} />
          <ActionButton label="Apply Credit" onClick={() => setActiveModal('credit')} />
          <ActionButton label="Change Plan" onClick={() => setActiveModal('plan')} />
          <ActionButton label="Cancel" onClick={() => setActiveModal('cancel')} variant="danger" />
          <ActionButton label="Impersonate" onClick={() => setActiveModal('impersonate')} icon={ExternalLink} />
          <ActionButton label="Edit" onClick={() => setActiveModal('edit')} icon={Edit} />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscription Details */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="font-medium text-white mb-4">Subscription</h3>
            <div className="space-y-3 text-sm">
              <InfoRow label="Plan" value={customer.plan_name || '-'} />
              <InfoRow label="Core Seats" value={customer.core_seats || 0} />
              <InfoRow label="Flex Seats" value={customer.flex_seats || 0} />
              <InfoRow label="Status" value={<StatusBadge status={customer.subscription_status} />} />
            </div>
          </div>

          {/* Usage */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="font-medium text-white mb-4">Usage</h3>
            <div className="space-y-3 text-sm">
              <InfoRow label="Core Used" value={`${data.usage?.core || 0} / ${customer.core_seats || 0}`} />
              <InfoRow label="Flex Used" value={`${data.usage?.flex || 0}`} />
              <InfoRow label="Total Employees" value={data.usage?.total || 0} />
            </div>
          </div>

          {/* License */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="font-medium text-white mb-4">License Key</h3>
            {data.license ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-slate-700 px-2 py-1 rounded text-green-400 flex-1 truncate">
                    {data.license.license_key}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(data.license.license_key)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">Status: {data.license.status}</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No license key assigned</p>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="font-medium text-white mb-4">Notes</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button
              onClick={handleAddNote}
              disabled={saving || !newNote.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note, i) => (
                <div key={note.id || i} className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-300 text-sm">{note.note}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(note.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No notes yet</p>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal && (
        <Modal title={getModalTitle(activeModal)} onClose={() => setActiveModal(null)}>
          <ModalContent
            type={activeModal}
            customer={customer}
            onClose={() => setActiveModal(null)}
            onSuccess={() => { setActiveModal(null); loadData(); }}
          />
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function ActionButton({ label, onClick, variant = 'default', icon: Icon }) {
  const styles = {
    default: 'bg-slate-700 hover:bg-slate-600 text-white',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${styles[variant]}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function getModalTitle(type) {
  const titles = {
    seats: 'Modify Seats',
    trial: 'Extend Trial',
    credit: 'Apply Credit',
    plan: 'Change Plan',
    cancel: 'Cancel Subscription',
    impersonate: 'Impersonate Customer',
    edit: 'Edit Customer',
  };
  return titles[type] || 'Action';
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-medium text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ConfirmationModal({ title, message, destructive, hasPasswordInput, onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(hasPasswordInput ? password : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-slate-300 mb-4">{message}</p>
      {hasPasswordInput && (
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white mb-4"
        />
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading || (hasPasswordInput && !password)}
          className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
          {loading ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}

function ModalContent({ type, customer, onClose, onSuccess }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [confirmed, setConfirmed] = useState(false);

  // Initialize form data based on modal type
  useEffect(() => {
    if (type === 'edit') {
      setFormData({
        name: customer.name || '',
        billingEmail: customer.billing_email || '',
        taxId: customer.tax_id || '',
      });
    } else if (type === 'trial') {
      const trialEnd = customer.trial_end ? new Date(customer.trial_end) : new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      setFormData({
        trialEndDate: trialEnd.toISOString().split('T')[0],
        reason: '',
      });
    } else if (type === 'plan') {
      setFormData({
        planSlug: customer.plan_slug || 'growth',
      });
    }
  }, [type, customer]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let endpoint = `/api/ops/customers/${customer.id}`;
      let method = 'POST';
      let body = formData;

      switch (type) {
        case 'seats':
          endpoint += '/seats';
          break;
        case 'trial':
          endpoint += '/extend-trial';
          body = { days: Math.ceil((new Date(formData.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24)), reason: formData.reason };
          break;
        case 'credit':
          endpoint += '/credit';
          break;
        case 'plan':
          endpoint = `/api/ops/manage/organizations/${customer.id}/subscription`;
          body = { planSlug: formData.planSlug };
          break;
        case 'cancel':
          endpoint = `/api/ops/manage/organizations/${customer.id}/subscription/cancel`;
          body = { immediate: formData.immediate || false, reason: formData.reason, details: formData.details };
          break;
        case 'impersonate':
          endpoint += '/impersonate';
          break;
        case 'edit':
          endpoint = `/api/ops/manage/organizations/${customer.id}`;
          method = 'PATCH';
          break;
      }

      const result = await apiFetch(endpoint, { method, body });

      if (type === 'impersonate' && result.url) {
        window.open(result.url, '_blank');
        toast.success('Opening customer portal...');
      } else {
        toast.success(`${getModalTitle(type)} completed successfully`);
      }

      onSuccess();
    } catch (e) {
      toast.error('Action failed: ' + e.message);
    }
    setLoading(false);
  };

  const planPrices = { growth: 8, scale: 12, enterprise: 18 };
  const currentMRR = (customer.core_seats || 0) * (planPrices[customer.plan_slug] || 8);
  const newMRR = type === 'plan' ? (customer.core_seats || 0) * (planPrices[formData.planSlug] || 8) : currentMRR;

  switch (type) {
    case 'seats':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">New Core Seats</label>
            <input
              type="number"
              min="1"
              value={formData.coreSeats ?? customer.core_seats ?? 0}
              onChange={(e) => setFormData({ ...formData, coreSeats: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Flex Seats</label>
            <input
              type="number"
              min="0"
              value={formData.flexSeats ?? customer.flex_seats ?? 0}
              onChange={(e) => setFormData({ ...formData, flexSeats: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Reason for change</label>
            <input
              type="text"
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition-colors">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      );

    case 'trial':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">New Trial End Date</label>
            <input
              type="date"
              value={formData.trialEndDate || ''}
              onChange={(e) => setFormData({ ...formData, trialEndDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Reason for extension</label>
            <textarea
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              rows="2"
              placeholder="Enter reason for trial extension..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading || !formData.trialEndDate} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition-colors">
              {loading ? 'Extending...' : 'Extend Trial'}
            </button>
          </div>
        </div>
      );

    case 'credit':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Amount (£)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="100.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Reason</label>
            <textarea
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              rows="2"
              placeholder="Describe reason for credit..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading || !formData.amount || formData.amount <= 0} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition-colors">
              {loading ? 'Applying...' : 'Apply Credit'}
            </button>
          </div>
        </div>
      );

    case 'plan':
      return (
        <div className="space-y-4">
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400">Current Plan</p>
            <p className="text-white font-medium">{customer.plan_name || 'Growth'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">New Plan</label>
            <select
              value={formData.planSlug || 'growth'}
              onChange={(e) => setFormData({ ...formData, planSlug: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="growth">Growth (£8/seat/month)</option>
              <option value="scale">Scale (£12/seat/month)</option>
              <option value="enterprise">Enterprise (£18/seat/month)</option>
            </select>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Current MRR</span>
              <span className="text-white">£{currentMRR.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-400">New MRR</span>
              <span className={newMRR > currentMRR ? 'text-green-400' : newMRR < currentMRR ? 'text-red-400' : 'text-white'}>
                £{newMRR.toLocaleString()}
              </span>
            </div>
            {newMRR !== currentMRR && (
              <div className="flex justify-between text-sm mt-1 pt-1 border-t border-slate-600">
                <span className="text-slate-400">Change</span>
                <span className={newMRR > currentMRR ? 'text-green-400' : 'text-red-400'}>
                  {newMRR > currentMRR ? '+' : ''}£{(newMRR - currentMRR).toLocaleString()}/mo
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading || formData.planSlug === customer.plan_slug} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition-colors">
              {loading ? 'Changing...' : 'Change Plan'}
            </button>
          </div>
        </div>
      );

    case 'cancel':
      return (
        <div className="space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">This will cancel the customer's subscription</span>
            </div>
            <p className="text-sm text-red-400/80 mt-1">Access will be revoked and billing will stop.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Reason</label>
            <select
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="">Select reason...</option>
              <option value="budget">Budget constraints</option>
              <option value="competitor">Switched to competitor</option>
              <option value="not_using">Not using the product</option>
              <option value="poor_fit">Poor product fit</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Additional Details</label>
            <textarea
              value={formData.details || ''}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              rows="2"
              placeholder="Any additional context..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Effective</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="immediate"
                  checked={!formData.immediate}
                  onChange={() => setFormData({ ...formData, immediate: false })}
                  className="text-orange-500"
                />
                <span className="text-slate-300 text-sm">End of billing period</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="immediate"
                  checked={formData.immediate}
                  onChange={() => setFormData({ ...formData, immediate: true })}
                  className="text-orange-500"
                />
                <span className="text-slate-300 text-sm">Immediate</span>
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-slate-300 text-sm">I understand this will revoke customer access</span>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Keep Subscription</button>
            <button onClick={handleSubmit} disabled={loading || !formData.reason || !confirmed} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg transition-colors">
              {loading ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          </div>
        </div>
      );

    case 'impersonate':
      return (
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Impersonate Customer</span>
            </div>
            <p className="text-sm text-amber-400/80 mt-1">You will be logged in as an admin for "{customer.name}". All actions will be audited.</p>
          </div>
          <div className="text-sm text-slate-400">
            <p>This will open the customer portal in a new tab where you can:</p>
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>View their dashboard and data</li>
              <li>Make changes on their behalf</li>
              <li>Troubleshoot issues</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
              {loading ? 'Opening...' : <><ExternalLink className="w-4 h-4" /> Open Portal</>}
            </button>
          </div>
        </div>
      );

    case 'edit':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Organization Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Billing Email</label>
            <input
              type="email"
              value={formData.billingEmail || ''}
              onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tax ID (VAT)</label>
            <input
              type="text"
              value={formData.taxId || ''}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="GB123456789"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading || !formData.name} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition-colors">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">This action is not yet implemented.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Close</button>
          </div>
        </div>
      );
  }
}

// ==================== PROTECTED ROUTE ====================

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// ==================== APP ====================

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
          <Route path="/licenses" element={<ProtectedRoute><LicensesPage /></ProtectedRoute>} />
          <Route path="/features" element={<ProtectedRoute><FeaturesPage /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
