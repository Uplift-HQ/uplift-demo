import { create } from 'zustand';
import Constants from 'expo-constants';
import { api, User } from '../services/api';
import { appStorage } from '../services/secureStorage';

// Check for demo mode
const DEMO_MODE =
  Constants.expoConfig?.extra?.demoMode === true ||
  process.env.EXPO_PUBLIC_DEMO_MODE === 'true' ||
  (typeof window !== 'undefined' && window.location?.hostname?.includes('demo'));

// Check if this is the manager demo (by URL path)
const IS_MANAGER_DEMO =
  typeof window !== 'undefined' && window.location?.pathname?.includes('manager');

// Demo user for demo mode (with extended properties for UI)
const DEMO_USER: User & Record<string, any> = IS_MANAGER_DEMO ? {
  id: 'demo-manager-1',
  email: 'manager@grandhotel.com',
  firstName: 'James',
  lastName: 'Wilson',
  role: 'manager',
  organizationId: 'org-demo',
  employeeId: 'mgr-001',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  momentumScore: 94,
  level: 15,
  xp: 3200,
  companyName: 'The Grand Hotel',
  companyLogo: null,
  unreadMessages: 5,
} : {
  id: 'demo-worker-1',
  email: 'demo@grandhotel.com',
  firstName: 'Sarah',
  lastName: 'Johnson',
  role: 'worker',
  organizationId: 'org-demo',
  employeeId: 'emp-001',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  momentumScore: 87,
  level: 12,
  xp: 2450,
  companyName: 'The Grand Hotel',
  companyLogo: null,
  unreadMessages: 3,
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingComplete: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  checkOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  onboardingComplete: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    // In demo mode, auto-login with demo user
    if (DEMO_MODE) {
      set({
        user: DEMO_USER,
        isAuthenticated: true,
        isLoading: false
      });
      return;
    }

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

    // In demo mode, auto-login with demo user
    if (DEMO_MODE) {
      set({
        user: DEMO_USER,
        isAuthenticated: true,
        isLoading: false
      });
      return;
    }

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
