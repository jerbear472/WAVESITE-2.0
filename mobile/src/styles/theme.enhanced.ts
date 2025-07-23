export const enhancedTheme = {
  colors: {
    // WaveSight Brand Colors
    primary: '#0080ff',
    primaryLight: '#4da8ff',
    primaryDark: '#0066cc',
    
    // Primary gradient
    primaryGradient: ['#0080ff', '#00d4ff'],
    secondaryGradient: ['#0066cc', '#0080ff'],
    successGradient: ['#00d4ff', '#00ffff'],
    
    // Dark backgrounds - WaveSight Dark Theme
    background: '#000d1a',
    backgroundSecondary: '#001a33',
    backgroundTertiary: '#002244',
    
    // Glass effects with blue tint
    glass: 'rgba(0, 128, 255, 0.05)',
    glassBorder: 'rgba(0, 128, 255, 0.15)',
    
    // Text
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    
    // Accent colors - WaveSight Blues
    accent: '#0080ff',
    accentLight: '#4da8ff',
    accentDark: '#0066cc',
    warning: '#ff9500',
    error: '#ff3b30',
    success: '#00d4ff',
    
    // UI elements
    surface: 'rgba(0, 128, 255, 0.08)',
    surfaceHover: 'rgba(0, 128, 255, 0.12)',
    border: 'rgba(0, 128, 255, 0.2)',
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  typography: {
    // Display
    displayLarge: {
      fontSize: 56,
      fontWeight: '800',
      letterSpacing: -1,
      lineHeight: 64,
    },
    displayMedium: {
      fontSize: 44,
      fontWeight: '700',
      letterSpacing: -0.5,
      lineHeight: 52,
    },
    displaySmall: {
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: 0,
      lineHeight: 44,
    },
    
    // Headings
    h1: {
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: 0,
      lineHeight: 40,
    },
    h2: {
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: 0,
      lineHeight: 36,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      letterSpacing: 0,
      lineHeight: 32,
    },
    
    // Body
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400',
      letterSpacing: 0,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      letterSpacing: 0,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      letterSpacing: 0,
      lineHeight: 20,
    },
    
    // Labels
    label: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      lineHeight: 16,
      textTransform: 'uppercase' as const,
    },
  },
  
  shadows: {
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
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 5,
    },
    glow: {
      shadowColor: '#0080ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 5,
    },
    glowStrong: {
      shadowColor: '#00d4ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 30,
      elevation: 8,
    },
  },
  
  animations: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
};