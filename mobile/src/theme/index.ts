// Momentum Orange Brand System - From Brand Guidelines

// Base colors that don't change between themes
const baseColors = {
  // Primary Brand (From BRAND-GUIDELINES.md)
  momentum: '#FF6B35',       // Momentum Orange
  momentumDark: '#E55A2B',   // Momentum Orange 600
  momentumLight: '#FFF0EB',  // Momentum Orange 100

  // Semantic
  success: '#10B981',
  successDark: '#059669',
  warning: '#F59E0B',
  warningDark: '#D97706',
  error: '#EF4444',
  errorDark: '#DC2626',
  info: '#3B82F6',
  infoDark: '#2563EB',

  // Common aliases
  white: '#FFFFFF',
  black: '#000000',
};

// Light theme colors
export const lightColors = {
  ...baseColors,

  // Neutrals
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',

  // UI
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  // Card backgrounds
  cardBackground: '#FFFFFF',
  inputBackground: '#F8FAFC',
  modalBackground: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  headerBackground: '#FFFFFF',
};

// Dark theme colors
export const darkColors = {
  ...baseColors,

  // Neutrals (inverted for dark mode)
  slate900: '#F8FAFC',
  slate800: '#F1F5F9',
  slate700: '#E2E8F0',
  slate600: '#CBD5E1',
  slate500: '#94A3B8',
  slate400: '#64748B',
  slate300: '#475569',
  slate200: '#334155',
  slate100: '#1E293B',
  slate50: '#0F172A',

  // UI
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  border: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',

  // Card backgrounds
  cardBackground: '#1E293B',
  inputBackground: '#334155',
  modalBackground: '#1E293B',
  tabBarBackground: '#0F172A',
  headerBackground: '#0F172A',
};

// Default to light colors for backward compatibility
export const colors = lightColors;

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '900' as const, // Industrial strength
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '800' as const, // Bold presence
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Dark mode shadows (more subtle)
export const darkShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

// Helper to get theme based on dark mode
export const getTheme = (isDark: boolean) => ({
  colors: isDark ? darkColors : lightColors,
  typography,
  spacing,
  borderRadius,
  shadows: isDark ? darkShadows : shadows,
  isDark,
});

// Generate themed brand colors from a primary (and optional secondary) hex color
export const getThemedColors = (primaryColor?: string, secondaryColor?: string) => {
  if (!primaryColor) return {};

  // Parse hex to RGB
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };

  const rgb = hexToRgb(primaryColor);

  // Light variant: 10% opacity over white
  const lightR = Math.round(rgb.r + (255 - rgb.r) * 0.9);
  const lightG = Math.round(rgb.g + (255 - rgb.g) * 0.9);
  const lightB = Math.round(rgb.b + (255 - rgb.b) * 0.9);
  const lightHex = `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;

  // Dark variant: 20% darker
  const darkR = Math.round(rgb.r * 0.8);
  const darkG = Math.round(rgb.g * 0.8);
  const darkB = Math.round(rgb.b * 0.8);
  const darkHex = secondaryColor || `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;

  return {
    momentum: primaryColor,
    momentumDark: darkHex,
    momentumLight: lightHex,
  };
};

// Get theme with optional brand color overrides
export const getThemedTheme = (isDark: boolean, brandColors?: { primaryColor?: string; secondaryColor?: string }) => {
  const base = getTheme(isDark);
  if (!brandColors?.primaryColor) return base;

  const overrides = getThemedColors(brandColors.primaryColor, brandColors.secondaryColor);
  return {
    ...base,
    colors: { ...base.colors, ...overrides },
  };
};

export type Theme = typeof theme;
export type Colors = typeof lightColors;
