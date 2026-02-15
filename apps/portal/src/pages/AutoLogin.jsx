// ============================================================
// AUTO LOGIN PAGE
// Handles /auto-login?role=admin|manager|worker for demo sites
// Only works when VITE_DEMO_MODE=true
// ============================================================

import { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DEMO_MODE } from '../lib/api';

const DEMO_CREDENTIALS = {
  admin: { email: 'admin@demo.com', password: 'admin123' },
  manager: { email: 'manager@demo.com', password: 'manager123' },
  worker: { email: 'worker@demo.com', password: 'worker123' },
};

export default function AutoLogin() {
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState(null);
  const [attempting, setAttempting] = useState(false);

  const role = searchParams.get('role');

  useEffect(() => {
    // Only proceed if DEMO_MODE is enabled and we have a valid role
    if (!DEMO_MODE) {
      setError('Demo mode is not enabled');
      return;
    }

    if (!role || !DEMO_CREDENTIALS[role]) {
      setError(`Invalid role: ${role}. Use admin, manager, or worker.`);
      return;
    }

    // Already authenticated - redirect to dashboard
    if (isAuthenticated) {
      return;
    }

    // Prevent multiple login attempts
    if (attempting) {
      return;
    }

    const doLogin = async () => {
      setAttempting(true);
      try {
        const cred = DEMO_CREDENTIALS[role];
        await login(cred.email, cred.password);
        // login() handles redirect to dashboard
      } catch (err) {
        setError(err.message || 'Auto-login failed');
      }
    };

    doLogin();
  }, [role, login, isAuthenticated, attempting]);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If demo mode is disabled, redirect to login
  if (!DEMO_MODE) {
    return <Navigate to="/login" replace />;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">!</span>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/login" className="text-momentum-400 hover:underline">
            Go to login page
          </a>
        </div>
      </div>
    );
  }

  // Show loading state while authenticating
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 bg-momentum-500 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">U</span>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500 mx-auto mb-4" />
        <p className="text-slate-400">
          Signing in as {role}...
        </p>
      </div>
    </div>
  );
}
