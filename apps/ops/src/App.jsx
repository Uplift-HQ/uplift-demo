import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Building2, CreditCard, Activity, LogOut, Key, Sliders,
  UserPlus, Search, AlertTriangle, CheckCircle, XCircle, Clock, Users,
  TrendingUp, DollarSign, Calendar, Mail, Phone, Globe, Settings, Filter,
  MoreVertical, Edit, Trash, Plus, RefreshCw, Download, ExternalLink, Eye,
  ChevronRight, ArrowUpRight, ArrowDownRight, Copy, Check, X, Pause, Play,
  MapPin, Building, FileText, CreditCard as CardIcon, AlertCircle, Info,
  Shield, ShieldCheck, Lock, Unlock, User, UserCog, History, Smartphone
} from 'lucide-react';

// ============================================================
// API Helper
// ============================================================
const API_BASE = '/api/ops';

async function api(method, path, body = null) {
  const token = localStorage.getItem('ops_token');
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

// ============================================================
// Auth Context
// ============================================================
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authChecked = React.useRef(false);

  useEffect(() => {
    // Prevent React StrictMode double-execution
    if (authChecked.current) return;
    authChecked.current = true;

    const token = localStorage.getItem('ops_token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Check auth - try new endpoint, fall back to legacy
    const checkAuth = async () => {
      try {
        const data = await api('GET', '/users/auth/me');
        setUser(data.user);
      } catch {
        try {
          const data = await api('GET', '/auth/me');
          setUser(data.user);
        } catch {
          localStorage.removeItem('ops_token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password, mfaCode = null) => {
    // Try new endpoint first
    try {
      const data = await api('POST', '/users/auth/login', { email, password, mfaCode });
      if (data.requiresMfa) {
        return { requiresMfa: true };
      }
      localStorage.setItem('ops_token', data.token);
      setUser(data.user);
      return { success: true, forcePasswordChange: data.user?.forcePasswordChange };
    } catch (newErr) {
      // Fall back to legacy endpoint
      try {
        const data = await api('POST', '/auth/login', { email, password });
        localStorage.setItem('ops_token', data.token);
        setUser(data.user);
        return { success: true };
      } catch {
        throw newErr;
      }
    }
  };

  const logout = async () => {
    try {
      await api('POST', '/users/auth/logout');
    } catch {
      // Ignore - might be using legacy auth
    }
    localStorage.removeItem('ops_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api('GET', '/users/auth/me');
      setUser(data.user);
    } catch {
      const data = await api('GET', '/auth/me');
      setUser(data.user);
    }
  };

  // Permission helpers - default to true if no permissions object
  const can = (permission) => user?.permissions?.[permission] ?? true;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, can }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// Layout
// ============================================================
function Layout({ children }) {
  const { user, logout, can } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/onboarding', label: 'Onboarding', icon: UserPlus, permission: 'canOnboardCustomers' },
    { path: '/customers', label: 'Customers', icon: Building2, permission: 'canViewCustomers' },
    { path: '/licenses', label: 'Licenses', icon: Key, permission: 'canManageLicenses' },
    { path: '/features', label: 'Features', icon: Sliders, permission: 'canManageFeatures' },
    { path: '/billing', label: 'Billing', icon: CreditCard, permission: 'canViewBilling' },
    { path: '/activity', label: 'Activity', icon: Activity, permission: 'canViewActivity' },
    { path: '/audit', label: 'Audit', icon: Shield, permission: 'canViewAuditLog' },
    { path: '/users', label: 'Users', icon: Users, permission: 'canManageUsers' },
  ];

  // Filter nav items by permission
  const visibleNavItems = navItems.filter(item => !item.permission || can(item.permission));

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-orange-500">Uplift Ops</h1>
            <nav className="flex gap-1">
              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                      isActive
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
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="text-sm text-slate-300">
                {user?.firstName} {user?.lastName}
              </span>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-20">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    <p className="text-xs text-orange-600 mt-1">{user?.roleDisplayName || user?.role}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <Settings className="w-4 h-4" />
                    My Account
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

// ============================================================
// Common Components
// ============================================================
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Button({ children, variant = 'primary', size = 'md', disabled, onClick, className = '', type = 'button' }) {
  const variants = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

function Input({ label, error, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
          error ? 'border-red-300' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

function Select({ label, options, error, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
          error ? 'border-red-300' : 'border-slate-300'
        }`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl ${sizes[size]} w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
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
    suspended: 'bg-amber-100 text-amber-800',
    revoked: 'bg-red-100 text-red-800',
    expired: 'bg-slate-100 text-slate-600',
    paid: 'bg-green-100 text-green-800',
    open: 'bg-blue-100 text-blue-800',
    draft: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status || 'none'}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-slate-400" />
      <h3 className="mt-2 text-sm font-medium text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function MetricCard({ label, value, trend, trendUp, color = 'blue' }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-xl p-6 ${colors[color]}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {trend && (
        <p className={`text-sm mt-2 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trend}
        </p>
      )}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 hover:bg-slate-100 rounded">
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
    </button>
  );
}

// ============================================================
// Login Page
// ============================================================
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password, requiresMfa ? mfaCode : null);
      if (result.requiresMfa) {
        setRequiresMfa(true);
        setLoading(false);
        return;
      }
      if (result.forcePasswordChange) {
        navigate('/settings?changePassword=true');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Card className="p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Uplift Ops Portal</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {!requiresMfa ? (
            <>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@uplifthq.co.uk"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <ShieldCheck className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                <p className="text-slate-600">Enter the code from your authenticator app</p>
              </div>
              <Input
                label="6-digit code"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
              <button
                type="button"
                onClick={() => { setRequiresMfa(false); setMfaCode(''); setError(''); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Back to login
              </button>
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Verifying...' : requiresMfa ? 'Verify' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ============================================================
// Dashboard Page
// ============================================================
function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('GET', '/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>

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

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Attention Needed
          </h3>
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
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-500" />
            Failed Payments
          </h3>
          <div className="space-y-2">
            {(data?.failedPayments || []).slice(0, 5).map((payment, i) => (
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
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Recent Activity
        </h3>
        <div className="space-y-2">
          {(data?.recentActivity || []).slice(0, 10).map((activity, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <span className="text-slate-700">{activity.org_name || 'System'}</span>
                <span className="text-slate-400 ml-2 text-sm">{activity.action || activity.type}</span>
              </div>
              <span className="text-sm text-slate-500">
                {new Date(activity.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Onboarding Wizard
// ============================================================
function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [formData, setFormData] = useState({
    // Step 1: Company
    companyName: '',
    tradingName: '',
    companyNumber: '',
    industry: 'other',
    primaryContactName: '',
    primaryContactEmail: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: 'United Kingdom',
    // Step 2: Subscription
    planType: 'growth',
    coreSeats: 50,
    flexEnabled: true,
    flexSeatsLimit: 25,
    contractMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    trialEnabled: true,
    trialDays: 30,
    setupFee: 250000,
    setupFeeCredited: true,
    // Step 3: Locations
    locations: [{ name: 'Head Office', city: '', country: 'United Kingdom', timezone: 'Europe/London', headcount: 50, isPrimary: true }],
    // Step 4: Admin
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    sendWelcomeEmail: true,
  });

  const updateForm = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-calculate flex limit
      if (field === 'coreSeats') {
        updated.flexSeatsLimit = Math.floor(value * 0.5);
      }
      // Auto-calculate setup fee
      if (field === 'planType') {
        updated.setupFee = value === 'growth' ? 250000 : value === 'scale' ? 500000 : 1000000;
      }
      return updated;
    });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateForm('adminPassword', password);
  };

  useEffect(() => {
    if (!formData.adminPassword) generatePassword();
  }, []);

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.companyName) return 'Company name is required';
        if (!formData.primaryContactName) return 'Primary contact name is required';
        if (!formData.primaryContactEmail) return 'Primary contact email is required';
        break;
      case 2:
        if (formData.coreSeats < 1) return 'At least 1 seat is required';
        break;
      case 3:
        if (formData.locations.length === 0) return 'At least one location is required';
        if (!formData.locations.some(l => l.isPrimary)) return 'One location must be primary';
        break;
      case 4:
        if (!formData.adminFirstName) return 'Admin first name is required';
        if (!formData.adminLastName) return 'Admin last name is required';
        if (!formData.adminEmail) return 'Admin email is required';
        break;
    }
    return null;
  };

  const nextStep = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(s => s - 1);
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Create organization
      const orgResult = await api('POST', '/onboard/organization', {
        name: formData.companyName,
        tradingName: formData.tradingName,
        companyNumber: formData.companyNumber,
        industry: formData.industry,
        primaryContactName: formData.primaryContactName,
        primaryContactEmail: formData.primaryContactEmail,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
      });

      const orgId = orgResult.organization.id;

      // Step 2: Create subscription
      await api('POST', '/onboard/subscription', {
        organizationId: orgId,
        planType: formData.planType,
        coreSeats: formData.coreSeats,
        flexSeatsLimit: formData.flexEnabled ? formData.flexSeatsLimit : 0,
        contractMonths: formData.contractMonths,
        startDate: formData.startDate,
        trialEnabled: formData.trialEnabled,
        trialDays: formData.trialDays,
        setupFee: formData.setupFee,
        setupFeeCredited: formData.setupFeeCredited,
      });

      // Step 3: Create locations
      for (const loc of formData.locations) {
        await api('POST', '/onboard/location', {
          organizationId: orgId,
          name: loc.name,
          city: loc.city,
          country: loc.country,
          timezone: loc.timezone,
          headcount: loc.headcount,
          isPrimary: loc.isPrimary,
        });
      }

      // Step 4: Create admin user
      const userResult = await api('POST', '/onboard/user', {
        organizationId: orgId,
        firstName: formData.adminFirstName,
        lastName: formData.adminLastName,
        email: formData.adminEmail,
        password: formData.adminPassword,
        role: 'admin',
        sendWelcomeEmail: formData.sendWelcomeEmail,
      });

      // Step 5: Generate license
      const licenseResult = await api('POST', '/licenses', {
        organizationId: orgId,
        keyType: formData.trialEnabled ? 'trial' : 'annual',
        planType: formData.planType,
        maxSeats: formData.coreSeats,
        flexSeatsLimit: formData.flexSeatsLimit,
      });

      setResult({
        organization: orgResult.organization,
        user: userResult.user,
        license: licenseResult.license,
        password: formData.adminPassword,
      });
      setStep(6);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const industries = [
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'retail', label: 'Retail' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'construction', label: 'Construction' },
    { value: 'other', label: 'Other' },
  ];

  const plans = [
    { value: 'growth', label: 'Growth - £10/user/mo', fee: '£2,500' },
    { value: 'scale', label: 'Scale - £8/user/mo', fee: '£5,000' },
    { value: 'enterprise', label: 'Enterprise - POA', fee: 'Custom' },
  ];

  const timezones = [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  ];

  const addLocation = () => {
    setFormData(prev => ({
      ...prev,
      locations: [...prev.locations, { name: '', city: '', country: 'United Kingdom', timezone: 'Europe/London', headcount: 0, isPrimary: false }]
    }));
  };

  const removeLocation = (index) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index)
    }));
  };

  const updateLocation = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, i) => {
        if (i === index) {
          const updated = { ...loc, [field]: value };
          if (field === 'isPrimary' && value) {
            // Unset other primaries
            prev.locations.forEach((l, j) => { if (j !== i) l.isPrimary = false; });
          }
          return updated;
        }
        if (field === 'isPrimary' && value) {
          return { ...loc, isPrimary: false };
        }
        return loc;
      })
    }));
  };

  const steps = ['Company', 'Subscription', 'Locations', 'Admin', 'Review', 'Complete'];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Customer Onboarding</h2>

      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step > i + 1 ? 'bg-green-500 text-white' :
              step === i + 1 ? 'bg-orange-500 text-white' :
              'bg-slate-200 text-slate-500'
            }`}>
              {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-1 ${step > i + 1 ? 'bg-green-500' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Step 1: Company Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Company Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company Name *"
                value={formData.companyName}
                onChange={e => updateForm('companyName', e.target.value)}
              />
              <Input
                label="Trading Name"
                value={formData.tradingName}
                onChange={e => updateForm('tradingName', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company Number"
                value={formData.companyNumber}
                onChange={e => updateForm('companyNumber', e.target.value)}
              />
              <Select
                label="Industry"
                value={formData.industry}
                onChange={e => updateForm('industry', e.target.value)}
                options={industries}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Primary Contact Name *"
                value={formData.primaryContactName}
                onChange={e => updateForm('primaryContactName', e.target.value)}
              />
              <Input
                label="Primary Contact Email *"
                type="email"
                value={formData.primaryContactEmail}
                onChange={e => updateForm('primaryContactEmail', e.target.value)}
              />
            </div>
            <Input
              label="Address Line 1"
              value={formData.addressLine1}
              onChange={e => updateForm('addressLine1', e.target.value)}
            />
            <Input
              label="Address Line 2"
              value={formData.addressLine2}
              onChange={e => updateForm('addressLine2', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={e => updateForm('city', e.target.value)}
              />
              <Input
                label="Postal Code"
                value={formData.postalCode}
                onChange={e => updateForm('postalCode', e.target.value)}
              />
              <Input
                label="Country"
                value={formData.country}
                onChange={e => updateForm('country', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Subscription */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
            <Select
              label="Plan"
              value={formData.planType}
              onChange={e => updateForm('planType', e.target.value)}
              options={plans.map(p => ({ value: p.value, label: p.label }))}
            />
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                Setup Fee: <span className="font-semibold">{plans.find(p => p.value === formData.planType)?.fee}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Contracted Seats"
                type="number"
                min="1"
                value={formData.coreSeats}
                onChange={e => updateForm('coreSeats', parseInt(e.target.value) || 0)}
              />
              <Select
                label="Contract Duration"
                value={formData.contractMonths}
                onChange={e => updateForm('contractMonths', parseInt(e.target.value))}
                options={[
                  { value: 12, label: '12 months' },
                  { value: 24, label: '24 months' },
                  { value: 36, label: '36 months' },
                  { value: 60, label: '60 months' },
                ]}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.flexEnabled}
                  onChange={e => updateForm('flexEnabled', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Enable Flex Pricing (+£2/seat)</span>
              </label>
            </div>
            {formData.flexEnabled && (
              <Input
                label="Flex Seat Limit (50% default)"
                type="number"
                value={formData.flexSeatsLimit}
                onChange={e => updateForm('flexSeatsLimit', parseInt(e.target.value) || 0)}
              />
            )}
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={e => updateForm('startDate', e.target.value)}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.trialEnabled}
                  onChange={e => updateForm('trialEnabled', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">30-day trial period</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.setupFeeCredited}
                  onChange={e => updateForm('setupFeeCredited', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Credit setup fee to contract</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Locations */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Locations</h3>
              <Button variant="secondary" size="sm" onClick={addLocation}>
                <Plus className="w-4 h-4 mr-1" /> Add Location
              </Button>
            </div>
            {formData.locations.map((loc, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Location {i + 1}</span>
                    {loc.isPrimary && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Primary</span>}
                  </div>
                  {formData.locations.length > 1 && (
                    <button onClick={() => removeLocation(i)} className="text-red-500 hover:text-red-700">
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Location Name"
                    value={loc.name}
                    onChange={e => updateLocation(i, 'name', e.target.value)}
                  />
                  <Input
                    label="City"
                    value={loc.city}
                    onChange={e => updateLocation(i, 'city', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Country"
                    value={loc.country}
                    onChange={e => updateLocation(i, 'country', e.target.value)}
                  />
                  <Select
                    label="Timezone"
                    value={loc.timezone}
                    onChange={e => updateLocation(i, 'timezone', e.target.value)}
                    options={timezones}
                  />
                  <Input
                    label="Headcount"
                    type="number"
                    value={loc.headcount}
                    onChange={e => updateLocation(i, 'headcount', parseInt(e.target.value) || 0)}
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={loc.isPrimary}
                    onChange={e => updateLocation(i, 'isPrimary', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Primary location</span>
                </label>
              </div>
            ))}
            <p className="text-sm text-slate-500">
              Total headcount: {formData.locations.reduce((sum, l) => sum + (l.headcount || 0), 0)} / {formData.coreSeats} seats
            </p>
          </div>
        )}

        {/* Step 4: Admin User */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Admin User</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name *"
                value={formData.adminFirstName}
                onChange={e => updateForm('adminFirstName', e.target.value)}
              />
              <Input
                label="Last Name *"
                value={formData.adminLastName}
                onChange={e => updateForm('adminLastName', e.target.value)}
              />
            </div>
            <Input
              label="Email *"
              type="email"
              value={formData.adminEmail}
              onChange={e => updateForm('adminEmail', e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.adminPassword}
                  readOnly
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                />
                <Button variant="secondary" onClick={generatePassword}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <CopyButton text={formData.adminPassword} />
              </div>
              <p className="text-sm text-slate-500 mt-1">User will be required to change this on first login.</p>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sendWelcomeEmail}
                onChange={e => updateForm('sendWelcomeEmail', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Send welcome email with login credentials</span>
            </label>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Review & Confirm</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4" /> Company
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-500">Name:</span> {formData.companyName}</p>
                  <p><span className="text-slate-500">Industry:</span> {formData.industry}</p>
                  <p><span className="text-slate-500">Contact:</span> {formData.primaryContactName}</p>
                  <p><span className="text-slate-500">Email:</span> {formData.primaryContactEmail}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <CardIcon className="w-4 h-4" /> Subscription
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-500">Plan:</span> {formData.planType}</p>
                  <p><span className="text-slate-500">Seats:</span> {formData.coreSeats} core + {formData.flexSeatsLimit} flex</p>
                  <p><span className="text-slate-500">Contract:</span> {formData.contractMonths} months</p>
                  <p><span className="text-slate-500">Trial:</span> {formData.trialEnabled ? '30 days' : 'No'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Locations
                </h4>
                <div className="text-sm space-y-1">
                  {formData.locations.map((loc, i) => (
                    <p key={i}>
                      {loc.name} ({loc.headcount} staff)
                      {loc.isPrimary && <span className="text-orange-500 ml-1">★</span>}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Admin User
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-500">Name:</span> {formData.adminFirstName} {formData.adminLastName}</p>
                  <p><span className="text-slate-500">Email:</span> {formData.adminEmail}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-700">
                <strong>Monthly cost:</strong> {formData.coreSeats} × £{formData.planType === 'growth' ? '10' : formData.planType === 'scale' ? '8' : 'POA'} = <strong>£{formData.planType !== 'enterprise' ? (formData.coreSeats * (formData.planType === 'growth' ? 10 : 8)).toLocaleString() : 'POA'}/month</strong>
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {step === 6 && result && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Customer Created Successfully!</h3>
              <p className="text-slate-500 mt-1">{result.organization.name} is now set up and ready to go.</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <h4 className="font-medium mb-3">License Key</h4>
              <div className="flex items-center gap-2 font-mono bg-white p-3 rounded border">
                <Key className="w-5 h-5 text-orange-500" />
                <span className="flex-1">{result.license.license_key}</span>
                <CopyButton text={result.license.license_key} />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <h4 className="font-medium mb-3">Admin Credentials</h4>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Email:</span> {result.user.email}</p>
                <p><span className="text-slate-500">Password:</span> <code className="bg-white px-2 py-1 rounded">{result.password}</code> <CopyButton text={result.password} /></p>
                <p><span className="text-slate-500">Login URL:</span> <a href="#" className="text-orange-600">https://app.uplift.hr/login</a></p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => navigate(`/customers/${result.organization.id}`)}>
                View Customer
              </Button>
              <Button onClick={() => { setStep(1); setResult(null); setFormData(prev => ({ ...prev, companyName: '', adminEmail: '' })); }}>
                Onboard Another
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 6 && (
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
              Back
            </Button>
            {step < 5 ? (
              <Button onClick={nextStep}>Continue</Button>
            ) : (
              <Button onClick={submit} disabled={loading}>
                {loading ? 'Creating...' : 'Create Customer'}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// Customers Page
// ============================================================
function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams({ search, limit: 50 });
    api('GET', `/customers?${params}`)
      .then(data => setCustomers(data.customers || []))
      .finally(() => setLoading(false));
  }, [search]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-64"
            />
          </div>
          <Button onClick={() => navigate('/onboarding')}>
            <Plus className="w-4 h-4 mr-1" /> New Customer
          </Button>
        </div>
      </div>

      <Card>
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
                  {customer.health_score ? (
                    <span className={customer.risk_level === 'high' ? 'text-red-600' : customer.risk_level === 'medium' ? 'text-amber-600' : 'text-green-600'}>
                      {customer.health_score}/100
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${customer.id}`)}>
                    View <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No customers found"
            description={search ? 'Try a different search term' : 'Get started by onboarding your first customer'}
            action={!search && <Button onClick={() => navigate('/onboarding')}>Onboard Customer</Button>}
          />
        )}
      </Card>
    </div>
  );
}

// ============================================================
// Customer Detail Page
// ============================================================
function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCustomer = () => {
    api('GET', `/customers/${id}`)
      .then(setCustomer)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCustomer(); }, [id]);

  const handleAction = async (action, data = {}) => {
    setActionLoading(true);
    try {
      await api('POST', `/customers/${id}/${action}`, data);
      loadCustomer();
      setActiveModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleImpersonate = async () => {
    try {
      const result = await api('POST', `/impersonate/${customer.customer.id}`);
      // Open customer portal in new tab with impersonation token
      window.open(`https://app.uplift.hr/impersonate?token=${result.token}`, '_blank');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer?.customer) return <div>Customer not found</div>;

  const { customer: c, usage, admins, invoices, notes, health, licenses } = customer;
  const isTrialing = c.status === 'trialing';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/customers" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to Customers
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">{c.name}</h2>
          <p className="text-slate-500">{c.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleImpersonate}>
            <ExternalLink className="w-4 h-4 mr-1" /> Impersonate
          </Button>
          <Button variant="secondary" onClick={() => setActiveModal('edit')}>
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
          {c.status !== 'canceled' && (
            <Button variant="danger" onClick={() => setActiveModal('cancel')}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => setActiveModal('seats')}>
          Modify Seats
        </Button>
        {isTrialing && (
          <Button variant="secondary" size="sm" onClick={() => setActiveModal('extend-trial')}>
            Extend Trial
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setActiveModal('credit')}>
          Apply Credit
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setActiveModal('change-plan')}>
          Change Plan
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Subscription */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Subscription</h3>
          <div className="space-y-3 text-sm">
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
            {isTrialing && c.trial_end && (
              <div className="flex justify-between text-orange-600">
                <span>Trial Ends</span>
                <span>{new Date(c.trial_end).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Health */}
        <Card className="p-6">
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
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Level</span>
                  <span className={health.risk_level === 'high' ? 'text-red-600 font-medium' : health.risk_level === 'medium' ? 'text-amber-600' : 'text-green-600'}>
                    {health.risk_level}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-center">No health data</p>
          )}
        </Card>

        {/* Admins */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Admins</h3>
          <div className="space-y-3">
            {admins?.map((admin) => (
              <div key={admin.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700 text-sm">
                    {admin.first_name} {admin.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{admin.email}</p>
                </div>
              </div>
            ))}
            {(!admins || admins.length === 0) && (
              <p className="text-slate-400 text-sm">No admins</p>
            )}
          </div>
        </Card>
      </div>

      {/* Licenses */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">License Keys</h3>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/licenses?org=${c.id}`)}>
            View All
          </Button>
        </div>
        <div className="space-y-2">
          {(licenses || []).slice(0, 3).map((lic) => (
            <div key={lic.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                <code className="text-sm">{lic.license_key}</code>
              </div>
              <StatusBadge status={lic.status} />
            </div>
          ))}
        </div>
      </Card>

      {/* Invoices & Notes */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Invoices</h3>
          <div className="space-y-2">
            {invoices?.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-slate-700 text-sm">{invoice.stripe_invoice_number || invoice.number}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{(invoice.total / 100).toFixed(2)}</p>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            ))}
            {(!invoices || invoices.length === 0) && (
              <p className="text-slate-400 text-sm">No invoices</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Notes</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notes?.map((note) => (
              <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">{note.note}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {note.author_first_name} {note.author_last_name} • {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {(!notes || notes.length === 0) && (
              <p className="text-slate-400 text-sm">No notes yet</p>
            )}
          </div>
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setActiveModal('note')}>
            <Plus className="w-4 h-4 mr-1" /> Add Note
          </Button>
        </Card>
      </div>

      {/* Modals */}
      <ModifySeatsModal
        open={activeModal === 'seats'}
        onClose={() => setActiveModal(null)}
        customer={c}
        onSave={(data) => handleAction('seats', data)}
        loading={actionLoading}
      />
      <ExtendTrialModal
        open={activeModal === 'extend-trial'}
        onClose={() => setActiveModal(null)}
        customer={c}
        onSave={(data) => handleAction('extend-trial', data)}
        loading={actionLoading}
      />
      <ApplyCreditModal
        open={activeModal === 'credit'}
        onClose={() => setActiveModal(null)}
        onSave={(data) => handleAction('credit', data)}
        loading={actionLoading}
      />
      <CancelSubscriptionModal
        open={activeModal === 'cancel'}
        onClose={() => setActiveModal(null)}
        customer={c}
        onSave={(data) => handleAction('cancel', data)}
        loading={actionLoading}
      />
      <AddNoteModal
        open={activeModal === 'note'}
        onClose={() => setActiveModal(null)}
        onSave={async (data) => {
          await api('POST', `/customers/${id}/notes`, data);
          loadCustomer();
          setActiveModal(null);
        }}
      />
    </div>
  );
}

// Action Modals
function ModifySeatsModal({ open, onClose, customer, onSave, loading }) {
  const [coreSeats, setCoreSeats] = useState(customer?.core_seats || 0);
  const [flexLimit, setFlexLimit] = useState(customer?.flex_seats || 0);

  useEffect(() => {
    if (customer) {
      setCoreSeats(customer.core_seats || 0);
      setFlexLimit(customer.flex_seats || 0);
    }
  }, [customer]);

  return (
    <Modal open={open} onClose={onClose} title="Modify Seats">
      <div className="space-y-4">
        <Input
          label="Core Seats"
          type="number"
          min="1"
          value={coreSeats}
          onChange={e => setCoreSeats(parseInt(e.target.value) || 0)}
        />
        <Input
          label="Flex Seat Limit"
          type="number"
          min="0"
          value={flexLimit}
          onChange={e => setFlexLimit(parseInt(e.target.value) || 0)}
        />
        <div className="p-3 bg-slate-50 rounded-lg text-sm">
          <p>Current: {customer?.core_seats} core, {customer?.flex_seats} flex</p>
          <p>New: {coreSeats} core, {flexLimit} flex</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ coreSeats, flexSeats: flexLimit })} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ExtendTrialModal({ open, onClose, customer, onSave, loading }) {
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (customer?.trial_end) {
      const date = new Date(customer.trial_end);
      date.setDate(date.getDate() + 14);
      setEndDate(date.toISOString().split('T')[0]);
    }
  }, [customer]);

  return (
    <Modal open={open} onClose={onClose} title="Extend Trial">
      <div className="space-y-4">
        <Input
          label="New Trial End Date"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ trialEndDate: endDate })} disabled={loading}>
            {loading ? 'Saving...' : 'Extend Trial'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ApplyCreditModal({ open, onClose, onSave, loading }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Apply Credit">
      <div className="space-y-4">
        <Input
          label="Credit Amount (£)"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
          <textarea
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for credit..."
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ amount: parseFloat(amount) * 100, reason })} disabled={loading || !amount || !reason}>
            {loading ? 'Applying...' : 'Apply Credit'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CancelSubscriptionModal({ open, onClose, customer, onSave, loading }) {
  const [reasonCategory, setReasonCategory] = useState('other');
  const [reasonDetail, setReasonDetail] = useState('');
  const [effectiveType, setEffectiveType] = useState('period_end');

  const reasons = [
    { value: 'budget', label: 'Budget constraints' },
    { value: 'competitor', label: 'Switching to competitor' },
    { value: 'not_using', label: 'Not using the product' },
    { value: 'features', label: 'Missing features' },
    { value: 'support', label: 'Support issues' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Cancel Subscription">
      <div className="space-y-4">
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <strong>Warning:</strong> This will cancel the subscription for {customer?.name}.
        </div>
        <Select
          label="Reason"
          value={reasonCategory}
          onChange={e => setReasonCategory(e.target.value)}
          options={reasons}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Additional Details</label>
          <textarea
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            rows={3}
            value={reasonDetail}
            onChange={e => setReasonDetail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Effective</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="effective"
                value="period_end"
                checked={effectiveType === 'period_end'}
                onChange={e => setEffectiveType(e.target.value)}
              />
              <span className="text-sm">At end of current billing period</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="effective"
                value="immediate"
                checked={effectiveType === 'immediate'}
                onChange={e => setEffectiveType(e.target.value)}
              />
              <span className="text-sm">Immediately</span>
            </label>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Keep Subscription</Button>
          <Button variant="danger" onClick={() => onSave({ reasonCategory, reasonDetail, effectiveType })} disabled={loading}>
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddNoteModal({ open, onClose, onSave }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ note });
      setNote('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Note">
      <div className="space-y-4">
        <textarea
          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          rows={4}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Enter note..."
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !note}>
            {loading ? 'Saving...' : 'Add Note'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Licenses Page
// ============================================================
function LicensesPage() {
  const [licenses, setLicenses] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const navigate = useNavigate();

  const loadLicenses = () => {
    const params = new URLSearchParams({ search, status: statusFilter, limit: 100 });
    api('GET', `/licenses?${params}`)
      .then(data => {
        setLicenses(data.licenses || []);
        setCounts(data.counts || {});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLicenses(); }, [search, statusFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">License Keys</h2>
        <Button onClick={() => navigate('/onboarding')}>
          <Plus className="w-4 h-4 mr-1" /> Generate License
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Active" value={counts.active || 0} color="green" />
        <MetricCard label="Suspended" value={counts.suspended || 0} color="orange" />
        <MetricCard label="Expired" value={counts.expired || 0} color="purple" />
        <MetricCard label="Revoked" value={counts.revoked || 0} color="red" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by key or organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Organization</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">License Key</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Plan</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Seats</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Expires</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {licenses.map((lic) => (
              <tr key={lic.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link to={`/customers/${lic.organization_id}`} className="font-medium text-slate-900 hover:text-orange-600">
                    {lic.organization_name}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm">{lic.license_key}</code>
                    <CopyButton text={lic.license_key} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm capitalize">{lic.plan_type}</span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {lic.max_seats} / {lic.flex_seats_limit} flex
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={lic.status} />
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {lic.valid_until ? new Date(lic.valid_until).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLicense(lic)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {licenses.length === 0 && (
          <EmptyState
            icon={Key}
            title="No licenses found"
            description="Generate a license when onboarding a new customer"
          />
        )}
      </Card>

      {/* License Detail Modal */}
      <LicenseDetailModal
        license={selectedLicense}
        onClose={() => setSelectedLicense(null)}
        onUpdate={loadLicenses}
      />
    </div>
  );
}

function LicenseDetailModal({ license, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);

  if (!license) return null;

  const handleAction = async (action, data = {}) => {
    setLoading(true);
    try {
      if (action === 'suspend') {
        await api('POST', `/licenses/${license.id}/suspend`, data);
      } else if (action === 'reactivate') {
        await api('POST', `/licenses/${license.id}/reactivate`);
      } else if (action === 'revoke') {
        await api('DELETE', `/licenses/${license.id}`);
      } else if (action === 'update') {
        await api('PATCH', `/licenses/${license.id}`, data);
      }
      onUpdate();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={!!license} onClose={onClose} title="License Details" size="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">License Key</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-lg font-mono">{license.license_key}</code>
              <CopyButton text={license.license_key} />
            </div>
          </div>
          <StatusBadge status={license.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Organization</p>
            <p className="font-medium">{license.organization_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Plan Type</p>
            <p className="font-medium capitalize">{license.plan_type}</p>
          </div>
          <div>
            <p className="text-slate-500">Max Seats</p>
            <p className="font-medium">{license.max_seats}</p>
          </div>
          <div>
            <p className="text-slate-500">Flex Limit</p>
            <p className="font-medium">{license.flex_seats_limit}</p>
          </div>
          <div>
            <p className="text-slate-500">Created</p>
            <p className="font-medium">{new Date(license.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-slate-500">Expires</p>
            <p className="font-medium">{license.valid_until ? new Date(license.valid_until).toLocaleDateString() : 'Never'}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          {license.status === 'active' && (
            <Button variant="secondary" onClick={() => handleAction('suspend', { reason: 'Manual suspension' })} disabled={loading}>
              <Pause className="w-4 h-4 mr-1" /> Suspend
            </Button>
          )}
          {license.status === 'suspended' && (
            <Button variant="secondary" onClick={() => handleAction('reactivate')} disabled={loading}>
              <Play className="w-4 h-4 mr-1" /> Reactivate
            </Button>
          )}
          {license.status !== 'revoked' && (
            <Button variant="danger" onClick={() => { if (confirm('Revoke this license?')) handleAction('revoke'); }} disabled={loading}>
              <XCircle className="w-4 h-4 mr-1" /> Revoke
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Features Page
// ============================================================
function FeaturesPage() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [planFeatures, setPlanFeatures] = useState({});
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api('GET', '/customers?limit=100').then(data => {
      setOrganizations(data.customers || []);
    });
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      setLoading(true);
      api('GET', `/features/${selectedOrg}`)
        .then(data => {
          setPlanFeatures(data.planFeatures || {});
          setOverrides(data.overrides || {});
        })
        .finally(() => setLoading(false));
    }
  }, [selectedOrg]);

  const toggleFeature = async (featureKey, enabled) => {
    try {
      await api('POST', `/features/${selectedOrg}`, { featureKey, enabled });
      setOverrides(prev => ({ ...prev, [featureKey]: enabled }));
    } catch (err) {
      alert(err.message);
    }
  };

  const resetToDefaults = async () => {
    if (confirm('Reset all feature overrides to plan defaults?')) {
      try {
        await api('DELETE', `/features/${selectedOrg}`);
        setOverrides({});
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const featureList = [
    { key: 'mobile_app', label: 'Mobile App' },
    { key: 'scheduling', label: 'Scheduling' },
    { key: 'time_tracking', label: 'Time Tracking' },
    { key: 'skills_matrix', label: 'Skills Matrix' },
    { key: 'career_pathing', label: 'Career Pathing' },
    { key: 'gamification', label: 'Gamification' },
    { key: 'basic_analytics', label: 'Basic Analytics' },
    { key: 'advanced_analytics', label: 'Advanced Analytics' },
    { key: 'integrations', label: 'Integrations' },
    { key: 'custom_integrations', label: 'Custom Integrations' },
    { key: 'api_access', label: 'API Access' },
    { key: 'sso', label: 'Single Sign-On' },
    { key: 'custom_branding', label: 'Custom Branding' },
    { key: 'dedicated_support', label: 'Dedicated Support' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Feature Flags</h2>

      {/* Org Selector */}
      <Card className="p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Organization</label>
            <select
              value={selectedOrg}
              onChange={e => setSelectedOrg(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Choose an organization...</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          {selectedOrg && Object.keys(overrides).length > 0 && (
            <Button variant="secondary" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
          )}
        </div>
      </Card>

      {/* Features Grid */}
      {selectedOrg && (
        <Card className="p-6">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Feature Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                {featureList.map(feature => {
                  const hasOverride = feature.key in overrides;
                  const isEnabled = hasOverride ? overrides[feature.key] : planFeatures[feature.key];
                  return (
                    <div key={feature.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-slate-700">{feature.label}</p>
                        {hasOverride && (
                          <p className="text-xs text-orange-600">Overridden</p>
                        )}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={e => toggleFeature(feature.key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {!selectedOrg && (
        <Card className="p-12">
          <EmptyState
            icon={Sliders}
            title="Select an organization"
            description="Choose an organization to manage its feature flags"
          />
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Billing Page
// ============================================================
function BillingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('GET', '/billing/overview')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const totalMRR = (data?.mrrByPlan || []).reduce((sum, p) => sum + (p.mrr || 0), 0);
  const baseMRR = (data?.mrrByPlan || []).reduce((sum, p) => sum + ((p.total_core_seats || 0) * (p.core_price || 0)), 0);
  const flexMRR = totalMRR - baseMRR;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Billing Overview</h2>

      {/* MRR Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total MRR" value={`£${(totalMRR / 100).toLocaleString()}`} color="green" />
        <MetricCard label="Base MRR" value={`£${(baseMRR / 100).toLocaleString()}`} color="blue" />
        <MetricCard label="Flex MRR" value={`£${(flexMRR / 100).toLocaleString()}`} color="purple" />
        <MetricCard label="ARR (Projected)" value={`£${((totalMRR * 12) / 100).toLocaleString()}`} color="orange" />
      </div>

      {/* MRR by Plan */}
      <Card className="p-6">
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
                  £{((plan.mrr || 0) / 100).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Failed Payments */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Failed Payments
          </h3>
          <div className="space-y-3">
            {(data?.failedPayments || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{p.org_name}</p>
                  <p className="text-sm text-slate-500">Due: {p.due_date ? new Date(p.due_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <span className="font-bold text-red-600">£{((p.total || 0) / 100).toFixed(2)}</span>
              </div>
            ))}
            {(!data?.failedPayments || data.failedPayments.length === 0) && (
              <p className="text-slate-500 text-center py-4">No failed payments</p>
            )}
          </div>
        </Card>

        {/* Upcoming Renewals */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Upcoming Renewals (7 days)
          </h3>
          <div className="space-y-3">
            {(data?.upcomingRenewals || []).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-900">{r.org_name}</p>
                  <p className="text-sm text-slate-500">{r.plan_name} • {r.core_seats} seats</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{((r.amount || 0) / 100).toFixed(2)}</p>
                  <p className="text-sm text-slate-500">
                    {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
            {(!data?.upcomingRenewals || data.upcomingRenewals.length === 0) && (
              <p className="text-slate-500 text-center py-4">No renewals in the next 7 days</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Activity Page
// ============================================================
function ActivityPage() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('GET', '/activity')
      .then(data => setActivity(data.activity || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>

      <Card>
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
        {activity.length === 0 && (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Activity will appear here as you manage customers"
          />
        )}
      </Card>
    </div>
  );
}

// ============================================================
// Users Page (super_admin only)
// ============================================================
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        api('GET', '/users'),
        api('GET', '/users/roles')
      ]);
      setUsers(usersData.users || []);
      setRoles(rolesData.roles || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </div>

      <Card>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">User</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Role</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">MFA</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Last Login</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                      {u.first_name?.[0]}{u.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{u.first_name} {u.last_name}</p>
                      <p className="text-sm text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {u.role_display_name || u.role_name || u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {u.locked_until && new Date(u.locked_until) > new Date() ? (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <Lock className="w-4 h-4" /> Locked
                    </span>
                  ) : u.is_active ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <XCircle className="w-4 h-4" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {u.mfa_enabled ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUser(u)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <EmptyState icon={Users} title="No users" description="Add your first ops user" />
        )}
      </Card>

      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        roles={roles}
        onCreated={loadData}
      />

      <ManageUserModal
        user={selectedUser}
        roles={roles}
        onClose={() => setSelectedUser(null)}
        onUpdated={loadData}
      />
    </div>
  );
}

function CreateUserModal({ open, onClose, roles, onCreated }) {
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', roleId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api('POST', '/users', form);
      setResult(data);
      onCreated();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={() => { onClose(); setResult(null); setForm({ email: '', firstName: '', lastName: '', roleId: '', password: '' }); }} title="Create User">
      {result ? (
        <div className="space-y-4">
          <div className="bg-green-50 text-green-700 p-4 rounded-lg">
            <CheckCircle className="w-5 h-5 inline mr-2" />
            User created successfully!
          </div>
          {result.temporaryPassword && (
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="font-medium text-amber-800 mb-2">Temporary Password</p>
              <div className="flex items-center gap-2">
                <code className="bg-white px-2 py-1 rounded text-sm">{result.temporaryPassword}</code>
                <CopyButton text={result.temporaryPassword} />
              </div>
              <p className="text-sm text-amber-600 mt-2">User must change this on first login.</p>
            </div>
          )}
          <Button onClick={() => { onClose(); setResult(null); }} className="w-full">Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="user@uplifthq.co.uk"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <Select
            label="Role"
            value={form.roleId}
            onChange={e => setForm({ ...form, roleId: e.target.value })}
            options={[{ value: '', label: 'Select role...' }, ...roles.map(r => ({ value: r.id, label: r.display_name }))]}
            required
          />
          <Input
            label="Password (optional - will generate if empty)"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Min 12 chars, upper, lower, number, special"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ManageUserModal({ user, roles, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        isActive: user.is_active
      });
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await api('PATCH', `/users/${user.id}`, form);
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setLoading(true);
    try {
      await api('POST', `/users/${user.id}/unlock`);
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm('Reset password? User will need to change it on next login.')) return;
    setLoading(true);
    try {
      const result = await api('POST', `/users/${user.id}/reset-password`);
      alert(`Password reset. Temporary: ${result.temporaryPassword}`);
      onUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!confirm('Disable MFA for this user?')) return;
    setLoading(true);
    try {
      await api('POST', `/users/${user.id}/disable-mfa`);
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLocked = user.locked_until && new Date(user.locked_until) > new Date();

  return (
    <Modal open={!!user} onClose={onClose} title="Manage User" size="lg">
      <div className="space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-medium text-orange-600">
            {user.first_name?.[0]}{user.last_name?.[0]}
          </div>
          <div>
            <p className="text-lg font-medium">{user.first_name} {user.last_name}</p>
            <p className="text-slate-500">{user.email}</p>
            <div className="flex gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {user.role_display_name || user.role_name}
              </span>
              {user.mfa_enabled && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> MFA
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={form.firstName || ''}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
          />
          <Input
            label="Last Name"
            value={form.lastName || ''}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
          />
        </div>

        <Select
          label="Role"
          value={form.roleId || ''}
          onChange={e => setForm({ ...form, roleId: e.target.value })}
          options={roles.map(r => ({ value: r.id, label: r.display_name }))}
        />

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive ?? true}
            onChange={e => setForm({ ...form, isActive: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm text-slate-700">Account Active</label>
        </div>

        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium text-slate-900">Account Actions</h4>

          {isLocked && (
            <button
              onClick={handleUnlock}
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
              disabled={loading}
            >
              <Unlock className="w-4 h-4" /> Unlock Account
            </button>
          )}

          <button
            onClick={handleResetPassword}
            className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700"
            disabled={loading}
          >
            <Key className="w-4 h-4" /> Reset Password
          </button>

          {user.mfa_enabled && (
            <button
              onClick={handleDisableMfa}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
              disabled={loading}
            >
              <Shield className="w-4 h-4" /> Disable MFA
            </button>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Audit Log Page
// ============================================================
function AuditPage() {
  const [audit, setAudit] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', severity: '', limit: 100 });

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters });
      const [auditData, statsData] = await Promise.all([
        api('GET', `/users/audit?${params}`),
        api('GET', '/users/audit/stats')
      ]);
      setAudit(auditData.audit || []);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filters]);

  const severityColors = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-amber-100 text-amber-800',
    critical: 'bg-red-100 text-red-800'
  };

  const categoryIcons = {
    authentication: Lock,
    user_management: Users,
    customer: Building2,
    license: Key,
    billing: CreditCard,
    feature: Sliders,
    system: Settings
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Security Audit Log</h2>
        <Button variant="secondary" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {(stats.bySeverity || []).map(s => (
            <div
              key={s.severity}
              className={`rounded-lg p-4 ${severityColors[s.severity] || 'bg-slate-100 text-slate-700'}`}
            >
              <p className="text-sm capitalize">{s.severity}</p>
              <p className="text-2xl font-bold">{s.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value })}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">All Categories</option>
          <option value="authentication">Authentication</option>
          <option value="user_management">User Management</option>
          <option value="customer">Customer</option>
          <option value="license">License</option>
          <option value="billing">Billing</option>
          <option value="feature">Feature</option>
          <option value="system">System</option>
        </select>
        <select
          value={filters.severity}
          onChange={e => setFilters({ ...filters, severity: e.target.value })}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Audit Table */}
      <Card>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Action</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">User</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Category</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Severity</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">IP</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {audit.map((a, i) => {
              const CategoryIcon = categoryIcons[a.category] || Activity;
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{a.action}</p>
                    {a.description && (
                      <p className="text-sm text-slate-500 truncate max-w-xs">{a.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {a.user_name || a.user_email || 'System'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <CategoryIcon className="w-4 h-4" />
                      {a.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[a.severity]}`}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {a.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{a.ip_address || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {audit.length === 0 && (
          <EmptyState icon={Shield} title="No audit entries" description="Security events will appear here" />
        )}
      </Card>
    </div>
  );
}

// ============================================================
// Settings / My Account Page
// ============================================================
function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState('profile');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check for forced password change
  const searchParams = new URLSearchParams(location.search);
  const forcePasswordChange = searchParams.get('changePassword') === 'true';

  useEffect(() => {
    if (forcePasswordChange) setTab('security');
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api('GET', '/users/sessions');
      setSessions(data.sessions || []);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">My Account</h2>

      {forcePasswordChange && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          You must change your password before continuing.
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {['profile', 'security', 'mfa', 'sessions'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-orange-100 text-orange-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <Card className="p-6">
        {tab === 'profile' && <ProfileSettings user={user} onUpdate={refreshUser} />}
        {tab === 'security' && <SecuritySettings user={user} required={forcePasswordChange} />}
        {tab === 'mfa' && <MfaSettings user={user} onUpdate={refreshUser} />}
        {tab === 'sessions' && <SessionsSettings sessions={sessions} onUpdate={loadSessions} />}
      </Card>
    </div>
  );
}

function ProfileSettings({ user, onUpdate }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });

  return (
    <div className="space-y-6 max-w-md">
      <h3 className="font-semibold text-slate-900">Profile Information</h3>
      <Input
        label="Email"
        value={user?.email || ''}
        disabled
        className="bg-slate-50"
      />
      <Input
        label="First Name"
        value={form.firstName}
        onChange={e => setForm({ ...form, firstName: e.target.value })}
      />
      <Input
        label="Last Name"
        value={form.lastName}
        onChange={e => setForm({ ...form, lastName: e.target.value })}
      />
      <div className="text-sm text-slate-500">
        Role: <span className="font-medium text-slate-700">{user?.roleDisplayName || user?.role}</span>
      </div>
    </div>
  );
}

function SecuritySettings({ user, required }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api('POST', '/users/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (required) {
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <h3 className="font-semibold text-slate-900">Change Password</h3>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Password changed successfully!
        </div>
      )}

      <Input
        label="Current Password"
        type="password"
        value={form.currentPassword}
        onChange={e => setForm({ ...form, currentPassword: e.target.value })}
        required
      />
      <Input
        label="New Password"
        type="password"
        value={form.newPassword}
        onChange={e => setForm({ ...form, newPassword: e.target.value })}
        required
      />
      <Input
        label="Confirm New Password"
        type="password"
        value={form.confirmPassword}
        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
        required
      />

      <div className="text-sm text-slate-500">
        Password must be at least 12 characters with uppercase, lowercase, number, and special character.
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Changing...' : 'Change Password'}
      </Button>
    </form>
  );
}

function MfaSettings({ user, onUpdate }) {
  const [step, setStep] = useState(user?.mfaEnabled ? 'enabled' : 'setup');
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startSetup = async () => {
    setLoading(true);
    try {
      const data = await api('POST', '/users/mfa/setup');
      setSetupData(data);
      setStep('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async () => {
    setLoading(true);
    try {
      await api('POST', '/users/mfa/verify', { code });
      setStep('enabled');
      onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    setLoading(true);
    try {
      await api('DELETE', '/users/mfa', { password });
      setStep('setup');
      setPassword('');
      onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      <h3 className="font-semibold text-slate-900">Two-Factor Authentication</h3>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {step === 'setup' && (
        <div className="space-y-4">
          <p className="text-slate-600">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
          <Button onClick={startSetup} disabled={loading}>
            <ShieldCheck className="w-4 h-4 mr-1" />
            {loading ? 'Setting up...' : 'Enable MFA'}
          </Button>
        </div>
      )}

      {step === 'verify' && setupData && (
        <div className="space-y-4">
          <p className="text-slate-600">Scan this QR code with your authenticator app:</p>
          <div className="flex justify-center">
            <img src={setupData.qrCode} alt="QR Code" className="w-48 h-48" />
          </div>
          <p className="text-sm text-slate-500 text-center">
            Or enter this code manually: <code className="bg-slate-100 px-2 py-1 rounded">{setupData.secret}</code>
          </p>
          <div className="bg-amber-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-2">Backup Codes (save these!):</p>
            <div className="grid grid-cols-2 gap-1 text-sm font-mono">
              {setupData.backupCodes?.map((c, i) => (
                <span key={i} className="bg-white px-2 py-1 rounded">{c}</span>
              ))}
            </div>
          </div>
          <Input
            label="Enter code from authenticator"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
          />
          <Button onClick={verifyMfa} disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Verify & Enable'}
          </Button>
        </div>
      )}

      {step === 'enabled' && (
        <div className="space-y-4">
          <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Two-factor authentication is enabled
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-slate-600 mb-3">To disable MFA, enter your password:</p>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
            />
            <Button variant="danger" onClick={disableMfa} disabled={loading || !password} className="mt-3">
              {loading ? 'Disabling...' : 'Disable MFA'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionsSettings({ sessions, onUpdate }) {
  const [loading, setLoading] = useState(false);

  const terminateSession = async (id) => {
    setLoading(true);
    try {
      await api('DELETE', `/users/sessions/${id}`);
      onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const terminateAll = async () => {
    if (!confirm('Terminate all other sessions?')) return;
    setLoading(true);
    try {
      await api('DELETE', '/users/sessions');
      onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Active Sessions</h3>
        {sessions.length > 1 && (
          <Button variant="danger" size="sm" onClick={terminateAll} disabled={loading}>
            Terminate All Others
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map(s => (
          <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {s.browser} on {s.os}
                  {s.id === sessions.currentSession && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Current</span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {s.ip_address} • Last active: {new Date(s.last_activity_at).toLocaleString()}
                </p>
              </div>
            </div>
            {s.id !== sessions.currentSession && (
              <Button variant="ghost" size="sm" onClick={() => terminateSession(s.id)} disabled={loading}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Protected Route
// ============================================================
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// ============================================================
// Main App
// ============================================================
export default function App() {
  return (
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
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
