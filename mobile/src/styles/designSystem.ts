import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Golden ratio for harmonious proportions
const GOLDEN_RATIO = 1.618;

export const designSystem = {
  // Spacing system based on 8px grid
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  // Typography scale based on major third (1.25)
  typography: {
    hero: {
      fontSize: 48,
      lineHeight: 56,
      fontWeight: '300' as const,
      letterSpacing: -1.5,
    },
    h1: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '600' as const,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
      letterSpacing: -0.25,
    },
    h3: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
    },
    button: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
    },
  },

  // Color palette
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    secondary: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
    },
    neutral: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Gradients
  gradients: {
    primary: ['#667eea', '#764ba2'],
    secondary: ['#f093fb', '#f5576c'],
    accent: ['#4facfe', '#00f2fe'],
    warm: ['#fa709a', '#fee140'],
    cool: ['#a8edea', '#fed6e3'],
    sunset: ['#ffecd2', '#fcb69f'],
    ocean: ['#43e97b', '#38f9d7'],
    cosmic: ['#667eea', '#764ba2', '#f093fb'],
  },

  // Border radius system
  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
  },

  // Shadow system
  shadows: {
    none: {
      shadowOpacity: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
  },

  // Layout dimensions
  layout: {
    screenWidth: width,
    screenHeight: height,
    maxContentWidth: Math.min(width - 32, 400),
    headerHeight: Platform.select({ ios: 44, android: 56, default: 44 }),
    tabBarHeight: Platform.select({ ios: 83, android: 60, default: 60 }),
    containerPadding: 24,
    cardPadding: 20,
    buttonHeight: 48,
    inputHeight: 48,
  },

  // Animation timings
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
    spring: {
      tension: 100,
      friction: 8,
    },
  },

  // Breakpoints for responsive design
  breakpoints: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
  },
} as const;

// Helper functions
export const getResponsiveSpacing = (base: number) => {
  if (width > designSystem.breakpoints.lg) return base * 1.5;
  if (width > designSystem.breakpoints.md) return base * 1.25;
  return base;
};

export const getResponsiveFontSize = (size: number) => {
  if (width > designSystem.breakpoints.lg) return size * 1.2;
  if (width > designSystem.breakpoints.md) return size * 1.1;
  return size;
};

export const createShadow = (elevation: keyof typeof designSystem.shadows) => {
  return designSystem.shadows[elevation];
};

export const createGradient = (gradient: keyof typeof designSystem.gradients) => {
  return designSystem.gradients[gradient];
};

// Common component styles
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.neutral[0],
  },
  safeArea: {
    flex: 1,
    backgroundColor: designSystem.colors.neutral[0],
  },
  contentContainer: {
    paddingHorizontal: designSystem.layout.containerPadding,
    paddingVertical: designSystem.spacing.lg,
  },
  card: {
    backgroundColor: designSystem.colors.neutral[0],
    borderRadius: designSystem.borderRadius.lg,
    padding: designSystem.layout.cardPadding,
    ...designSystem.shadows.md,
  },
  button: {
    height: designSystem.layout.buttonHeight,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: designSystem.spacing.lg,
  },
  input: {
    height: designSystem.layout.inputHeight,
    borderRadius: designSystem.borderRadius.md,
    paddingHorizontal: designSystem.spacing.md,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral[200],
    backgroundColor: designSystem.colors.neutral[0],
  },
  centerContent: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  spaceBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
};