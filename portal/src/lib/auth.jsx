// ============================================================
// AUTH CONTEXT & HOOKS
// Authentication state management with Bearer tokens
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { api, authApi } from './api';

const AuthContext = createContext(null);

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/terms', '/privacy', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Always allow public paths
    if (isPublicPath) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('uplift_token');

    // No token stored - user needs to log in
    if (!token) {
      localStorage.removeItem('uplift_user');
      localStorage.removeItem('uplift_token');
      setLoading(false);
      return;
    }

    try {
      // Verify token with backend
      api.setToken(token);
      const result = await authApi.me();
      const userData = result.user || result;
      setUser(userData);
      localStorage.setItem('uplift_user', JSON.stringify(userData));
    } catch {
      // Backend verification failed - clear credentials
      localStorage.removeItem('uplift_user');
      localStorage.removeItem('uplift_token');
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await authApi.login(email, password);

      if (result.token) {
        api.setToken(result.token);
      }

      const userData = result.user || result;
      setUser(userData);
      localStorage.setItem('uplift_user', JSON.stringify(userData));

      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });

      return result;
    } catch (error) {
      throw new Error(error.message || 'Invalid email or password');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      api.setToken(null);
      localStorage.removeItem('uplift_token');
      localStorage.removeItem('uplift_user');
      setUser(null);
      navigate('/login');
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isManager: user?.role === 'manager' || user?.role === 'admin' || user?.role === 'superadmin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-momentum-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">U</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login, saving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function RequireAdmin({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function RequireManager({ children }) {
  const { user, isManager, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user || !isManager) {
    return <Navigate to="/" replace />;
  }

  return children;
}
