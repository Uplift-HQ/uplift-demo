import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, Activity, LogOut, ChevronDown, AlertTriangle, CheckCircle, XCircle, Clock, Users, TrendingUp, DollarSign, Calendar, Mail, Phone, Globe, Settings, Search, Filter, MoreVertical, Edit, Trash, Plus, RefreshCw, Download, ExternalLink, Eye, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Auth Context
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ops_token');
    if (token) {
      fetch('/api/ops/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('ops_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/ops/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    localStorage.setItem('ops_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('ops_token');
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Layout
function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customers', label: 'Customers', icon: Building2 },
    { path: '/billing', label: 'Billing', icon: CreditCard },
    { path: '/activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-orange-500">Uplift Ops</h1>
            <nav className="flex gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      location.pathname === item.path
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={logout}
              className="text-sm text-slate-400 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

// Login Page
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Uplift Ops Portal</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

// Dashboard Page
function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ops_token');
    fetch('/api/ops/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Monthly Recurring Revenue"
          value={`£${((metrics.mrr || 0) / 100).toLocaleString()}`}
          color="green"
        />
        <MetricCard
          label="Active Customers"
          value={metrics.active_subscriptions || 0}
          color="blue"
        />
        <MetricCard
          label="Total Seats"
          value={metrics.total_seats || 0}
          color="purple"
        />
        <MetricCard
          label="Trials"
          value={metrics.trials || 0}
          color="orange"
        />
      </div>

      {/* Alerts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Attention Needed</h3>
          <div className="space-y-3">
            {metrics.past_due > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-red-700">Past Due Subscriptions</span>
                <span className="font-bold text-red-700">{metrics.past_due}</span>
              </div>
            )}
            {metrics.pending_cancellations > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <span className="text-amber-700">Pending Cancellations</span>
                <span className="font-bold text-amber-700">{metrics.pending_cancellations}</span>
              </div>
            )}
            {!metrics.past_due && !metrics.pending_cancellations && (
              <p className="text-slate-500">All clear! No issues requiring attention.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">📋 Failed Payments</h3>
          <div className="space-y-2">
            {(data?.failedPayments || []).map((payment, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-700">{payment.org_name}</span>
                <span className="font-medium text-red-600">
                  £{(payment.total / 100).toFixed(2)}
                </span>
              </div>
            ))}
            {(!data?.failedPayments || data.failedPayments.length === 0) && (
              <p className="text-slate-500">No failed payments</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">🔄 Recent Activity</h3>
        <div className="space-y-2">
          {(data?.recentActivity || []).map((activity, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <span className="text-slate-700">{activity.org_name}</span>
                <span className="text-slate-400 ml-2 text-sm">{activity.type}</span>
              </div>
              <span className="text-sm text-slate-500">
                {new Date(activity.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className={`rounded-xl p-6 ${colors[color]}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

// Customers Page
function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('ops_token');
    const params = new URLSearchParams({ search, limit: 50 });
    fetch(`/api/ops/customers?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
        <input
          type="search"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg w-64"
        />
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
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{customer.name}</p>
                    <p className="text-sm text-slate-500">{customer.slug}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {customer.plan_name || 'No plan'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-700">
                  {customer.core_seats || 0} core / {customer.flex_seats || 0} flex
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={customer.subscription_status} />
                </td>
                <td className="px-6 py-4">
                  <HealthBadge score={customer.health_score} risk={customer.risk_level} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-red-100 text-red-800',
    canceled: 'bg-slate-100 text-slate-600',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.canceled}`}>
      {status || 'none'}
    </span>
  );
}

function HealthBadge({ score, risk }) {
  if (!score) return <span className="text-slate-400">-</span>;

  const colors = {
    low: 'text-green-600',
    medium: 'text-amber-600',
    high: 'text-red-600',
  };

  return (
    <span className={colors[risk] || 'text-slate-600'}>
      {score}/100
    </span>
  );
}

// Customer Detail Page
function CustomerDetailPage() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const id = location.pathname.split('/').pop();

  useEffect(() => {
    const token = localStorage.getItem('ops_token');
    fetch(`/api/ops/customers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setCustomer)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!customer?.customer) return <div>Customer not found</div>;

  const { customer: c, usage, admins, invoices, notes, health } = customer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/customers" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to Customers
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">{c.name}</h2>
          <p className="text-slate-500">{c.slug}</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            onClick={() => alert(`Impersonating ${c.name}...\n\nIn production, this would log you into the customer's portal as an admin.`)}
          >
            Impersonate
          </button>
          <button 
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            onClick={() => setShowEditModal(true)}
          >
            Edit
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Subscription */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Subscription</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan</span>
              <span className="font-medium">{c.plan_name || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Core Seats</span>
              <span>{c.core_seats || 0} ({usage?.core || 0} used)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Flex Seats</span>
              <span>{c.flex_seats || 0} ({usage?.flex || 0} used)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Period End</span>
              <span>{c.current_period_end ? new Date(c.current_period_end).toLocaleDateString() : '-'}</span>
            </div>
          </div>
        </div>

        {/* Health */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Health Score</h3>
          {health ? (
            <div className="space-y-3">
              <div className="text-center">
                <span className="text-4xl font-bold text-slate-900">{health.overall_score}</span>
                <span className="text-slate-500">/100</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Engagement</span>
                  <span>{health.engagement_score || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Adoption</span>
                  <span>{health.adoption_score || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Growth</span>
                  <span>{health.growth_score || '-'}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400">No health data</p>
          )}
        </div>

        {/* Admins */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Admins</h3>
          <div className="space-y-3">
            {admins?.map((admin) => (
              <div key={admin.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700">
                    {admin.first_name} {admin.last_name}
                  </p>
                  <p className="text-sm text-slate-500">{admin.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices & Notes */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Invoices</h3>
          <div className="space-y-2">
            {invoices?.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-slate-700">{invoice.stripe_invoice_number}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{(invoice.total / 100).toFixed(2)}</p>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Notes</h3>
          <div className="space-y-3">
            {notes?.map((note) => (
              <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-700">{note.note}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {note.author_first_name} {note.author_last_name} • {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {(!notes || notes.length === 0) && (
              <p className="text-slate-400">No notes yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Billing Page
function BillingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ops_token');
    fetch('/api/ops/billing/overview', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Billing Overview</h2>

      {/* MRR by Plan */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">MRR by Plan</h3>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-medium text-slate-600">Plan</th>
              <th className="text-right px-4 py-2 text-sm font-medium text-slate-600">Customers</th>
              <th className="text-right px-4 py-2 text-sm font-medium text-slate-600">Core Seats</th>
              <th className="text-right px-4 py-2 text-sm font-medium text-slate-600">Flex Seats</th>
              <th className="text-right px-4 py-2 text-sm font-medium text-slate-600">MRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.mrrByPlan || []).map((plan) => (
              <tr key={plan.plan_slug}>
                <td className="px-4 py-3 font-medium">{plan.plan_name}</td>
                <td className="px-4 py-3 text-right">{plan.customer_count}</td>
                <td className="px-4 py-3 text-right">{plan.total_core_seats}</td>
                <td className="px-4 py-3 text-right">{plan.total_flex_seats}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">
                  £{(plan.mrr / 100).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Failed Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Failed Payments</h3>
          <div className="space-y-3">
            {(data?.failedPayments || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{p.org_name}</p>
                  <p className="text-sm text-slate-500">Due: {new Date(p.due_date).toLocaleDateString()}</p>
                </div>
                <span className="font-bold text-red-600">£{(p.total / 100).toFixed(2)}</span>
              </div>
            ))}
            {(!data?.failedPayments || data.failedPayments.length === 0) && (
              <p className="text-slate-500">No failed payments</p>
            )}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Upcoming Renewals (7 days)</h3>
          <div className="space-y-3">
            {(data?.upcomingRenewals || []).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-900">{r.org_name}</p>
                  <p className="text-sm text-slate-500">{r.plan_name} • {r.core_seats} seats</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{(r.amount / 100).toFixed(2)}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(r.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {(!data?.upcomingRenewals || data.upcomingRenewals.length === 0) && (
              <p className="text-slate-500">No renewals in the next 7 days</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Page
function ActivityPage() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ops_token');
    fetch('/api/ops/activity', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setActivity(data.activity || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Action</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">User</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Entity</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activity.map((a, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{a.action}</td>
                <td className="px-6 py-4 text-slate-600">
                  {a.first_name} {a.last_name}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {a.entity_type} / {a.entity_id?.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(a.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// Main App
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
