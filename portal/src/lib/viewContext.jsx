// ============================================================
// VIEW CONTEXT
// Manages "Management View" vs "My View" for Admins and Managers
// Workers are always in personal view - no switcher needed
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth';

const ViewContext = createContext(null);

// Session storage key for persisting view preference
const VIEW_MODE_KEY = 'uplift_view_mode';

export function ViewProvider({ children }) {
  const { user, isAdmin, isManager, isWorker } = useAuth();

  // Initialize from sessionStorage or default to management view
  const [viewMode, setViewModeState] = useState(() => {
    if (typeof window === 'undefined') return 'management';
    const stored = sessionStorage.getItem(VIEW_MODE_KEY);
    return stored === 'personal' ? 'personal' : 'management';
  });

  // Persist view mode to sessionStorage
  const setViewMode = (mode) => {
    setViewModeState(mode);
    sessionStorage.setItem(VIEW_MODE_KEY, mode);
  };

  // Toggle between views
  const toggleView = () => {
    const newMode = viewMode === 'management' ? 'personal' : 'management';
    setViewMode(newMode);
  };

  // Workers are always in personal view
  const effectiveViewMode = isWorker ? 'personal' : viewMode;

  // Only show switcher for admins and managers
  const showSwitcher = isAdmin || isManager;

  // Get the label for the management view based on role
  const managementViewLabel = isAdmin ? 'Admin View' : 'Manager View';
  const managementViewLabelShort = isAdmin ? 'Admin' : 'Team';

  const value = {
    viewMode: effectiveViewMode,
    setViewMode,
    toggleView,
    showSwitcher,
    isPersonalView: effectiveViewMode === 'personal',
    isManagementView: effectiveViewMode === 'management',
    managementViewLabel,
    managementViewLabelShort,
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
