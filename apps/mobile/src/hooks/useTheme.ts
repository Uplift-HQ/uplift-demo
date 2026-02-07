import { useThemeStore } from '../store/themeStore';
import { getTheme, lightColors, darkColors, shadows, darkShadows, typography, spacing, borderRadius } from '../theme';

export const useTheme = () => {
  const { isDark, mode, setMode, toggleDark } = useThemeStore();
  const theme = getTheme(isDark);

  return {
    // Theme values
    colors: theme.colors,
    typography: theme.typography,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,

    // Dark mode state
    isDark,
    mode,

    // Actions
    setMode,
    toggleDark,

    // Full theme object
    theme,
  };
};

// Re-export for convenience
export { lightColors, darkColors, shadows, darkShadows, typography, spacing, borderRadius };
