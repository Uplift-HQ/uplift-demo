import { create } from 'zustand';
import { api, User } from '../services/api';
import { appStorage } from '../services/secureStorage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingComplete: boolean;
  isDemoMode: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginDemoUser: (role: 'worker' | 'manager') => void;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  checkOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

// Demo user data for website demo mode (no backend required)
const DEMO_USERS: Record<'worker' | 'manager', User> = {
  worker: {
    id: 'demo-worker-001',
    email: 'sarah.mitchell@demo.uplifthq.co.uk',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    role: 'worker',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    organizationId: 'demo-org',
    employeeId: 'EMP-001',
    momentumScore: 847,
    companyName: 'Grand Metro Hotels',
    locationName: 'Main Restaurant',
    unreadMessages: 7,
  },
  manager: {
    id: 'demo-manager-001',
    email: 'james.wilson@demo.uplifthq.co.uk',
    firstName: 'James',
    lastName: 'Wilson',
    role: 'manager',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    organizationId: 'demo-org',
    employeeId: 'EMP-002',
    momentumScore: 912,
    companyName: 'Grand Metro Hotels',
    locationName: 'Edinburgh City Centre',
    unreadMessages: 3,
  },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  onboardingComplete: false,
  isDemoMode: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const response = await api.login(email, password);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Demo mode login - sets user directly without API call (for website demo only)
  loginDemoUser: (role: 'worker' | 'manager') => {
    const demoUser = DEMO_USERS[role];
    set({
      user: demoUser,
      isAuthenticated: true,
      isLoading: false,
      isDemoMode: true,
      onboardingComplete: true,
    });
  },

  register: async (data: any) => {
    set({ isLoading: true });

    try {
      const response = await api.register(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getCurrentUser();
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
      get().logout();
    }
  },

  updateUser: async (data: any) => {
    try {
      const response = await api.updateProfile(data);
      set({ user: response.user });
    } catch (error) {
      throw error;
    }
  },

  checkOnboarding: async () => {
    const complete = await appStorage.isOnboardingComplete();
    set({ onboardingComplete: complete });
  },

  completeOnboarding: async () => {
    await appStorage.setOnboardingComplete(true);
    set({ onboardingComplete: true });
  },
}));
