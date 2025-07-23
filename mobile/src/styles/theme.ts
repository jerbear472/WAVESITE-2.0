export const theme = {
  colors: {
    // Primary colors
    primary: '#0080ff',
    primaryDark: '#0066cc',
    primaryLight: '#4da8ff',
    
    // Background colors
    background: '#000d1a',
    backgroundLight: '#001a33',
    backgroundCard: '#001a33',
    
    // Text colors
    text: '#ffffff',
    textSecondary: '#4da8ff',
    textMuted: '#4da8ff80',
    
    // Status colors
    success: '#00ff88',
    error: '#ff3030',
    warning: '#ffaa00',
    
    // Border colors
    border: '#0080ff30',
    borderLight: '#0080ff20',
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
    xl: 20,
    round: 30,
  },
  
  typography: {
    h1: {
      fontSize: 36,
      fontWeight: 'bold' as const,
      letterSpacing: 0.5,
    },
    h2: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      letterSpacing: 0.3,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal' as const,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: 'normal' as const,
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal' as const,
    },
  },
  
  shadows: {
    glow: {
      shadowColor: '#0080ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};