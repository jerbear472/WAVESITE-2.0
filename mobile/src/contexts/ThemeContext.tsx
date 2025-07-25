import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolateColor,
  Easing 
} from 'react-native-reanimated';

const storage = new MMKV();

export interface Theme {
  dark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    // Gradient colors
    gradientStart: string;
    gradientEnd: string;
    // Special colors
    glass: string;
    glassBorder: string;
    shadow: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    h3: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    body: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
  };
  animation: {
    fast: number;
    normal: number;
    slow: number;
  };
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#6C6C70',
    border: '#E5E5EA',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#5AC8FA',
    gradientStart: '#007AFF',
    gradientEnd: '#5856D6',
    glass: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.1)',
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
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 22,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
  },
  animation: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
};

const darkTheme: Theme = {
  ...lightTheme,
  dark: true,
  colors: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
    info: '#64D2FF',
    gradientStart: '#0A84FF',
    gradientEnd: '#5E5CE6',
    glass: 'rgba(28, 28, 30, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    shadow: 'rgba(255, 255, 255, 0.05)',
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
  animatedTheme: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme);
  const themeProgress = useSharedValue(1); // 0 = light, 1 = dark

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = storage.getString('theme_mode');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeMode(savedTheme as 'light' | 'dark' | 'system');
    }
  }, []);

  useEffect(() => {
    let selectedTheme: Theme;
    
    if (themeMode === 'system') {
      selectedTheme = systemColorScheme === 'dark' ? darkTheme : lightTheme;
    } else {
      selectedTheme = themeMode === 'dark' ? darkTheme : lightTheme;
    }

    setCurrentTheme(selectedTheme);
    
    // Animate theme transition
    themeProgress.value = withTiming(selectedTheme.dark ? 1 : 0, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
  }, [themeMode, systemColorScheme]);

  const toggleTheme = () => {
    const newMode = currentTheme.dark ? 'light' : 'dark';
    setTheme(newMode);
  };

  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    storage.set('theme_mode', mode);
  };

  // Animated styles for smooth theme transitions
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        themeProgress.value,
        [0, 1],
        [lightTheme.colors.background, darkTheme.colors.background]
      ),
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        themeProgress.value,
        [0, 1],
        [lightTheme.colors.text, darkTheme.colors.text]
      ),
    };
  });

  const animatedSurfaceStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        themeProgress.value,
        [0, 1],
        [lightTheme.colors.surface, darkTheme.colors.surface]
      ),
    };
  });

  const animatedTheme = {
    backgroundStyle: animatedBackgroundStyle,
    textStyle: animatedTextStyle,
    surfaceStyle: animatedSurfaceStyle,
  };

  const value: ThemeContextType = {
    theme: currentTheme,
    isDark: currentTheme.dark,
    toggleTheme,
    setTheme,
    themeMode,
    animatedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility hook for themed styles
export const useThemedStyles = <T extends Record<string, any>>(
  styleFactory: (theme: Theme) => T
): T => {
  const { theme } = useTheme();
  return styleFactory(theme);
};

// Pre-built themed components
export const ThemedView = Animated.View;
export const ThemedText = Animated.Text;