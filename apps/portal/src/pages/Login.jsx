// ============================================================
// LOGIN PAGE - TRANSLATED
// ============================================================

import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Eye, EyeOff, Loader2, ArrowLeft, Shield, Shield as ShieldIcon, Users as UsersIcon, User as UserIcon } from 'lucide-react';
import { UpliftLogo } from '../components/UpliftLogo';

// Demo credentials for auto-login
const DEMO_CREDENTIALS = {
  admin: { email: 'admin@demo.com', password: 'admin123' },
  manager: { email: 'manager@demo.com', password: 'manager123' },
  worker: { email: 'worker@demo.com', password: 'worker123' },
};

export default function Login() {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);
  
  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  
  // MFA state
  const [showMfa, setShowMfa] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // Auto-login from URL parameter (e.g., ?demo=admin)
  useEffect(() => {
    const demoRole = searchParams.get('demo');
    if (demoRole && DEMO_CREDENTIALS[demoRole] && !isAuthenticated && !autoLoggingIn) {
      setAutoLoggingIn(true);
      const creds = DEMO_CREDENTIALS[demoRole];
      login(creds.email, creds.password).catch((err) => {
        setError(err.message);
        setAutoLoggingIn(false);
      });
    }
  }, [searchParams, isAuthenticated, login, autoLoggingIn]);

  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Show loading screen during auto-login
  if (autoLoggingIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-momentum-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">U</span>
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-momentum-500 mx-auto mb-4" />
          <p className="text-slate-400">Signing in to demo...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // NC-1: Client-side validation before API call
    if (!email.trim()) {
      setError(t('errors.requiredField', 'Email is required'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('errors.invalidEmail', 'Please enter a valid email address'));
      return;
    }
    if (!password) {
      setError(t('errors.requiredField', 'Password is required'));
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.requiresMfa) {
        setMfaToken(result.mfaToken);
        setShowMfa(true);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || t('auth.loginFailed', 'Login failed'));
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/mfa/verify', { 
        mfaToken, 
        code: mfaCode 
      });
      // Refresh page to load authenticated state
      window.location.href = '/';
    } catch (err) {
      setError(err.message || t('auth.invalidCode', 'Invalid code'));
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch (err) {
      // Always show success to prevent email enumeration
      setForgotSent(true);
    } finally {
      setLoading(false);
    }
  };

  // MFA Screen
  if (showMfa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-momentum-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-momentum-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{t('auth.twoFactorAuth', 'Two-Factor Authentication')}</h1>
              <p className="text-slate-600 mt-2">{t('auth.enterMfaCode', 'Enter the code from your authenticator app')}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* NOTE: Consider adding custom validation beyond HTML5 required/type attributes */}
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <label className="label">{t('auth.verificationCode', 'Verification Code')}</label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="btn btn-primary w-full justify-center py-2.5"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.verify', 'Verify')}
              </button>

              <button
                type="button"
                onClick={() => { setShowMfa(false); setMfaCode(''); }}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                {t('auth.backToLogin', 'Back to login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Forgot Password Screen
  if (showForgot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.backToLogin', 'Back to login')}
            </button>

            {forgotSent ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{t('auth.checkYourEmail', 'Check your email')}</h2>
                <p className="text-slate-600">
                  {t('auth.resetLinkSent', `If an account exists for ${forgotEmail}, you'll receive a password reset link.`, { email: forgotEmail })}
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('auth.resetPassword', 'Reset password')}</h1>
                <p className="text-slate-600 mb-6">
                  {t('auth.resetPasswordDesc', "Enter your email address and we'll send you a link to reset your password.")}
                </p>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="label">{t('auth.email', 'Email')}</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="input"
                      placeholder={t('auth.placeholder.email', 'you@company.com')}
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full justify-center py-2.5"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.sendResetLink', 'Send reset link')}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Login Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3 mb-4">
            <UpliftLogo size={48} showWordmark={true} variant="white" />
          </div>
          <p className="text-slate-400">{t('auth.signInSubtitle', 'Welcome to the Grand Metropolitan Hotel Group')}</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('auth.signIn', 'Sign in')}</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email', 'Email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder={t('auth.placeholder.email', 'you@company.com')}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">{t('auth.password', 'Password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span className="text-slate-600">{t('auth.rememberMe', 'Remember me')}</span>
              </label>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                className="text-momentum-500 hover:text-momentum-600 font-medium"
              >
                {t('auth.forgotPassword', 'Forgot password?')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t('auth.signIn', 'Sign in')
              )}
            </button>
          </form>
        </div>

        {/* Demo Quick Access */}
        <div className="mt-6">
          <div className="text-center mb-4">
            <p className="text-slate-400 text-sm">{t('auth.demoAccess', 'Quick Demo Access')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { role: 'admin', email: 'admin@demo.com', password: 'admin123', name: 'Sarah Chen', title: t('auth.demoAdmin', 'HR Administrator'), desc: t('auth.demoAdminDesc', 'Full platform access — manage employees, configure settings, run reports'), icon: ShieldIcon, color: 'momentum' },
              { role: 'manager', email: 'manager@demo.com', password: 'manager123', name: 'James Williams', title: t('auth.demoManager', 'Department Manager'), desc: t('auth.demoManagerDesc', 'Team management — approve requests, run 1-on-1s, view team performance'), icon: UsersIcon, color: 'blue' },
              { role: 'worker', email: 'worker@demo.com', password: 'worker123', name: 'Maria Santos', title: t('auth.demoWorker', 'Employee'), desc: t('auth.demoWorkerDesc', 'Self-service — view your Momentum Score, book leave, complete training, give recognition'), icon: UserIcon, color: 'green' },
            ].map((persona) => (
              <button
                key={persona.role}
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    await login(persona.email, persona.password);
                  } catch (err) {
                    setError(err.message);
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className={`w-full p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-all text-left group hover:border-${persona.color === 'momentum' ? 'momentum' : persona.color}-500/50 hover:shadow-lg hover:shadow-${persona.color === 'momentum' ? 'momentum' : persona.color}-500/10`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    persona.color === 'momentum' ? 'bg-momentum-500/20 text-momentum-400' :
                    persona.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    <persona.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{persona.title}</span>
                      <span className="text-xs text-slate-500">({persona.name})</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{persona.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          © {new Date().getFullYear()} Uplift. {t('auth.allRightsReserved', 'All rights reserved.')}
        </p>
        <p className="text-center text-slate-400 text-xs mt-2">
          <a href="/terms" className="hover:text-slate-300">{t('auth.termsOfService', 'Terms of Service')}</a>
          {' · '}
          <a href="/privacy" className="hover:text-slate-300">{t('auth.privacyPolicy', 'Privacy Policy')}</a>
        </p>
      </div>
    </div>
  );
}
