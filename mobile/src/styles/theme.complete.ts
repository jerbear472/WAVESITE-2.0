import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const completeTheme = {
  // Screen dimensions
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  // Colors
  colors: {
    // Primary brand colors
    primary: '#0080ff',
    primaryLight: '#4da8ff',
    primaryDark: '#0066cc',
    
    // Backgrounds
    background: '#000814',
    backgroundSecondary: '#001d3d',
    backgroundTertiary: '#003566',
    
    // Surface colors
    surface: 'rgba(255, 255, 255, 0.05)',
    surfaceLight: 'rgba(255, 255, 255, 0.08)',
    surfaceHover: 'rgba(255, 255, 255, 0.1)',
    
    // Text colors
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    
    // Status colors
    success: '#00d4ff',
    warning: '#ff9500',
    error: '#ff3b30',
    info: '#5ac8fa',
    
    // UI elements
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.2)',
    glassBorder: 'rgba(0, 128, 255, 0.2)',
    
    // Shadows
    shadowColor: '#000000',
    shadowColorPrimary: '#0080ff',
  },
  
  // Gradients
  gradients: {
    primary: ['#0080ff', '#00d4ff'],
    primaryReverse: ['#00d4ff', '#0080ff'],
    secondary: ['#0066cc', '#0080ff'],
    accent: ['#4da8ff', '#0080ff'],
    success: ['#00d4ff', '#00ffff'],
    warning: ['#ff9500', '#ff6b30'],
    error: ['#ff3b30', '#ff1744'],
    dark: ['#000814', '#001d3d'],
    glass: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'],
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  // Border radius
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    round: 9999,
  },
  
  // Typography
  typography: {
    // Font families
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    
    // Font sizes
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
      '5xl': 36,
      '6xl': 42,
      '7xl': 48,
    },
    
    // Font weights
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
    
    // Line heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
    
    // Letter spacing
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
      widest: 2,
    },
  },
  
  // Shadows
  shadows: {
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 16,
    },
    primary: {
      shadowColor: '#0080ff',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  
  // Component specific styles
  components: {
    button: {
      height: {
        sm: 40,
        md: 48,
        lg: 56,
      },
      paddingHorizontal: {
        sm: 16,
        md: 24,
        lg: 32,
      },
      fontSize: {
        sm: 14,
        md: 16,
        lg: 18,
      },
    },
    input: {
      height: 56,
      paddingHorizontal: 20,
      fontSize: 16,
    },
    tabBar: {
      height: 80,
      iconSize: 24,
      labelSize: 11,
    },
  },
  
  // Animations
  animations: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
};