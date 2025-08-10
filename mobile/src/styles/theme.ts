export const theme = {
  colors: {
    // Wave color palette from web app
    wave: {
      50: '#e6f2ff',
      100: '#b3d9ff',
      200: '#80c0ff',
      300: '#4da8ff',
      400: '#1a8fff',
      500: '#0080ff',
      600: '#0066cc',
      700: '#004d99',
      800: '#003366',
      900: '#001a33',
      950: '#000d1a',
    },
    
    // Primary colors matching web
    primary: '#0080ff',
    primaryDark: '#0066cc',
    primaryLight: '#4da8ff',
    
    // Clean, minimal backgrounds
    background: '#ffffff',
    backgroundDark: '#f9fafb',
    backgroundCard: '#ffffff',
    
    // Text colors for clean design
    text: '#111827',
    textLight: '#6b7280',
    textSecondary: '#0080ff',
    textMuted: '#9ca3af',
    
    // Dark mode colors
    dark: {
      background: '#0f0f0f',
      backgroundCard: '#1a1a1a',
      text: '#ffffff',
      textLight: '#e5e7eb',
      textMuted: '#9ca3af',
    },
    
    // Status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    
    // Border colors - subtle and clean
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    borderFocus: '#0080ff',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
    wave: 30,
  },
  
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '300' as const,
      letterSpacing: -0.5,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '400' as const,
      letterSpacing: -0.3,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '500' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '500' as const,
      letterSpacing: 0.2,
    },
  },
  
  shadows: {
    // Subtle shadows for clean design
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
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    glow: {
      shadowColor: '#0080ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};