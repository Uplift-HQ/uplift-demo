import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';

export type ViewMode = 'personal' | 'team';

interface ViewContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleView: () => void;
  isTeamView: boolean;
  isPersonalView: boolean;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

interface ViewProviderProps {
  children: ReactNode;
}

export const ViewProvider: React.FC<ViewProviderProps> = ({ children }) => {
  const { user } = useAuthStore();
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  // Default for managers: team view. Workers always use personal view.
  const [viewMode, setViewMode] = useState<ViewMode>(isManager ? 'team' : 'personal');

  const toggleView = () => {
    setViewMode(prev => prev === 'team' ? 'personal' : 'team');
  };

  const value: ViewContextType = {
    viewMode,
    setViewMode,
    toggleView,
    isTeamView: viewMode === 'team',
    isPersonalView: viewMode === 'personal',
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
};

export const useViewMode = (): ViewContextType => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewProvider');
  }
  return context;
};

// Hook that returns whether current user can toggle views (managers only)
export const useCanToggleView = (): boolean => {
  const { user } = useAuthStore();
  return user?.role === 'manager' || user?.role === 'admin';
};
