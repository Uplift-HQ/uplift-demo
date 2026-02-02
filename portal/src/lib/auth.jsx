// ============================================================
// AUTH CONTEXT & HOOKS
// Authentication state management (Bearer token based)
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, authApi } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is logged in on mount (token-based)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('uplift_token');
      if (!token) {
        setLoading(false);
        return;
      }

      api.setToken(token);

      try {
        const { user } = await authApi.me();
        setUser(user);
      } catch (error) {
        // Token invalid or expired
        setUser(null);
        api.setToken(null);
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    
    if (result.requiresMfa) {
      return { requiresMfa: true, mfaToken: result.mfaToken };
    }
    
    // Store the Bearer token
    api.setToken(result.token);
    setUser(result.user);
    
    // Redirect to intended page or dashboard
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
    
    return { success: true };
  }, [navigate, location]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors on logout
    }
    setUser(null);
    api.setToken(null);
    navigate('/login');
  }, [navigate]);

  const register = useCallback(async (data) => {
    const result = await authApi.register(data);
    return result;
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isManager: ['admin', 'manager', 'superadmin'].includes(user?.role),
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
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Protected route wrapper
export function RequireAuth({ children, roles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
    }
    
    if (!loading && isAuthenticated && roles.length > 0) {
      if (!roles.includes(user?.role)) {
        navigate('/', { replace: true });
      }
    }
  }, [loading, isAuthenticated, user, roles, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return null;
  }

  return children;
}

export default AuthContext;
