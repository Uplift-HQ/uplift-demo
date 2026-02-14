import { create } from 'zustand';
import { api, User } from '../services/api';
import { appStorage } from '../services/secureStorage';

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
