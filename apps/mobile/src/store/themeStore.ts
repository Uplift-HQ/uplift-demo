import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      isDark: false,

      setMode: (mode: ThemeMode) => {
        const isDark = mode === 'dark';
        set({ mode, isDark });
      },

      toggleDark: () => {
        const currentMode = get().mode;
        const newMode = currentMode === 'dark' ? 'light' : 'dark';
        set({ mode: newMode, isDark: newMode === 'dark' });
      },
    }),
    {
      name: 'uplift-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
