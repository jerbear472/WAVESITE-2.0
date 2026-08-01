/**
 * WaveSight Unified Design System
 * A comprehensive, consolidated design language for premium mobile experiences
 *
 * This file consolidates theme.ts, theme.enhanced.ts, and the original designSystem.ts
 * into a single source of truth for all styling across the app.
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');
const fontScale = PixelRatio.getFontScale();

// =============================================================================
// RESPONSIVE HELPERS
// =============================================================================

/**
 * Scale a value based on screen width (for consistent sizing across devices)
 */
const scale = (size: number): number => (width / 375) * size;

/**
 * Scale font size with respect to accessibility settings
 */
const scaleFont = (size: number): number => {
  const scaledSize = scale(size);
  // Limit font scaling for very large accessibility settings
  return Math.round(scaledSize * Math.min(fontScale, 1.3));
};

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * WaveSight Brand Colors - matching the cyan/blue wave icon
 */
const palette = {
  // Primary Wave Blues (brand colors)
  wave: {
    50: '#e6f7ff',
    100: '#b3e6ff',
    200: '#80d4ff',
    300: '#4dc3ff',
    400: '#1ab2ff',
    500: '#00a0ff',  // PRIMARY - matches wave icon
    600: '#0080cc',
    700: '#006099',
    800: '#004066',
    900: '#002033',
    950: '#000d1a',  // Deep navy background
  },

  // Neutral/Gray scale
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Semantic colors
  success: {
    light: '#10ffc0',
    default: '#00FF88',  // Neon green
    dark: '#00CC66',
  },

  danger: {
    light: '#ff4d94',
    default: '#FF0080',  // Hot pink
    dark: '#cc0066',
  },

  warning: {
    light: '#ffb347',
    default: '#FF8800',  // Orange
    dark: '#cc6d00',
  },

  info: {
    light: '#66e5ff',
    default: '#00d4ff',  // Bright cyan
    dark: '#00a8cc',
  },

  // Platform-specific colors (CENTRALIZED - use these everywhere)
  platforms: {
    tiktok: '#FF0050',      // Hot pink (official TikTok)
    instagram: '#E1306C',   // Pink/magenta
    twitter: '#1DA1F2',     // Blue
    youtube: '#FF0000',     // Red
    reddit: '#FF4500',      // Orange-red
    facebook: '#1877F2',    // Blue
    linkedin: '#0A66C2',    // Blue
    threads: '#000000',     // Black
    snapchat: '#FFFC00',    // Yellow
    pinterest: '#E60023',   // Red
    twitch: '#9146FF',      // Purple
    discord: '#5865F2',     // Blurple
    other: '#4dc3ff',       // Cyan fallback
  },

  // Accent colors for special UI elements
  accent: {
    coral: '#FF6B6B',
    mint: '#4ECDC4',
    gold: '#FFD93D',
    purple: '#9B59B6',
    lime: '#CDDC39',
  },

  // XP/Gamification colors
  xp: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  },
};

// =============================================================================
// THEME DEFINITIONS (DARK & LIGHT)
// =============================================================================

const darkTheme = {
  dark: true,

  // Core colors
  background: palette.wave[950],           // #000d1a - Deep navy
  backgroundSecondary: '#001a33',          // Slightly lighter navy
  surface: '#001a33',                      // Card/surface background
  surfaceLight: '#002040',                 // Elevated surface
  surfaceElevated: '#002b4d',              // Highest elevation
  overlay: 'rgba(0, 13, 26, 0.9)',         // Modal overlays

  // Brand colors
  primary: palette.wave[500],              // #00a0ff
  primaryDark: palette.wave[600],          // #0080cc
  primaryLight: palette.wave[300],         // #4dc3ff
  secondary: palette.info.default,         // #00d4ff

  // Accent/Glow
  accent: palette.info.default,            // #00d4ff
  accentGlow: 'rgba(0, 212, 255, 0.3)',

  // Text colors
  text: {
    primary: palette.neutral[0],           // #ffffff
    secondary: palette.wave[300],          // #4dc3ff - cyan
    tertiary: '#6b8a9e',                   // Muted blue-gray
    disabled: '#3a5060',                   // Darker muted
    inverse: palette.wave[950],            // For light backgrounds
    placeholder: 'rgba(255, 255, 255, 0.4)',
  },

  // Status colors
  success: palette.success.default,
  danger: palette.danger.default,
  warning: palette.warning.default,
  info: palette.info.default,

  // Border colors
  border: 'rgba(0, 160, 255, 0.2)',
  borderLight: 'rgba(0, 160, 255, 0.1)',
  borderFocus: palette.wave[500],

  // Glass effects
  glass: 'rgba(0, 128, 255, 0.08)',
  glassBorder: 'rgba(0, 128, 255, 0.2)',
  glassLight: 'rgba(0, 128, 255, 0.05)',

  // Shadow color
  shadow: 'rgba(0, 0, 0, 0.5)',

  // Platform colors
  platforms: palette.platforms,
};

const lightTheme = {
  dark: false,

  // Core colors
  background: palette.neutral[0],          // #ffffff
  backgroundSecondary: palette.neutral[50], // #f9fafb
  surface: palette.neutral[0],             // #ffffff
  surfaceLight: palette.neutral[100],      // #f3f4f6
  surfaceElevated: palette.neutral[0],
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Brand colors
  primary: palette.wave[500],              // #00a0ff
  primaryDark: palette.wave[600],
  primaryLight: palette.wave[400],
  secondary: palette.wave[600],

  // Accent
  accent: palette.wave[500],
  accentGlow: 'rgba(0, 160, 255, 0.2)',

  // Text colors
  text: {
    primary: palette.neutral[900],         // #111827
    secondary: palette.neutral[500],       // #6b7280
    tertiary: palette.neutral[400],        // #9ca3af
    disabled: palette.neutral[300],        // #d1d5db
    inverse: palette.neutral[0],           // #ffffff
    placeholder: palette.neutral[400],
  },

  // Status colors
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: palette.wave[500],

  // Border colors
  border: palette.neutral[200],
  borderLight: palette.neutral[100],
  borderFocus: palette.wave[500],

  // Glass effects
  glass: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(0, 0, 0, 0.1)',
  glassLight: 'rgba(255, 255, 255, 0.5)',

  // Shadow color
  shadow: 'rgba(0, 0, 0, 0.1)',

  // Platform colors
  platforms: palette.platforms,
};

// =============================================================================
// GRADIENT PRESETS
// =============================================================================

const gradients = {
  // Brand gradients
  primary: ['#00a0ff', '#00d4ff'] as string[],
  brand: ['#0060a0', '#00a0ff', '#00d4ff'] as string[],
  wave: ['#0060a0', '#00a0ff', '#00d4ff'] as string[],

  // UI gradients
  accent: ['#00a0ff', '#00d4ff'] as string[],
  success: ['#00FF88', '#00CC66'] as string[],
  danger: ['#FF0080', '#FF0040'] as string[],
  warning: ['#FF8800', '#FFA500'] as string[],

  // Dark backgrounds
  dark: ['#001a33', '#000d1a'] as string[],
  darkDeep: ['#000d1a', '#000510'] as string[],
  shimmer: ['#001a33', '#002040', '#001a33'] as string[],

  // Special effects
  viral: ['#FF0080', '#00d4ff'] as string[],
  xp: ['#FFE500', '#FFA500'] as string[],
  premium: ['#FFD700', '#FFA500', '#FF8C00'] as string[],
  rainbow: ['#FF0080', '#FF8800', '#FFE500', '#00FF88', '#00d4ff', '#9B59B6'] as string[],

  // Platform gradients
  tiktok: ['#FF0050', '#00F2EA'] as string[],
  instagram: ['#833AB4', '#E1306C', '#F77737'] as string[],
  youtube: ['#FF0000', '#CC0000'] as string[],
  twitter: ['#1DA1F2', '#0C85D0'] as string[],

  // Depth gradients (for backgrounds)
  depth: ['#000d1a', '#001a33', '#002244', '#003366'] as string[],
  ocean: ['#003366', '#0066cc', '#0099ff', '#00ccff'] as string[],
};

// =============================================================================
// SPACING SYSTEM (8pt Grid)
// =============================================================================

const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Semantic spacing
  containerPadding: 20,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
  inlineGap: 8,
};

// =============================================================================
// TYPOGRAPHY SYSTEM
// =============================================================================

/**
 * Unified typography scale with consistent weights:
 * - 300: Light (display, elegant text)
 * - 400: Regular (body text)
 * - 500: Medium (emphasis)
 * - 600: Semibold (buttons, labels)
 * - 700: Bold (headings)
 */
const typography = {
  // Display (large headlines)
  displayLarge: {
    fontSize: scaleFont(48),
    lineHeight: scaleFont(56),
    fontWeight: '300' as const,
    letterSpacing: -1,
  },
  displayMedium: {
    fontSize: scaleFont(40),
    lineHeight: scaleFont(48),
    fontWeight: '300' as const,
    letterSpacing: -0.8,
  },
  displaySmall: {
    fontSize: scaleFont(32),
    lineHeight: scaleFont(40),
    fontWeight: '300' as const,
    letterSpacing: -0.5,
  },

  // Headings
  h1: {
    fontSize: scaleFont(28),
    lineHeight: scaleFont(36),
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: scaleFont(24),
    lineHeight: scaleFont(32),
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: scaleFont(20),
    lineHeight: scaleFont(28),
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  h4: {
    fontSize: scaleFont(18),
    lineHeight: scaleFont(24),
    fontWeight: '500' as const,
    letterSpacing: 0,
  },

  // Body text
  bodyLarge: {
    fontSize: scaleFont(18),
    lineHeight: scaleFont(28),
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(24),
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(24),
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    fontWeight: '400' as const,
    letterSpacing: 0,
  },

  // Captions & Labels
  caption: {
    fontSize: scaleFont(12),
    lineHeight: scaleFont(16),
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  captionMedium: {
    fontSize: scaleFont(12),
    lineHeight: scaleFont(16),
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: scaleFont(11),
    lineHeight: scaleFont(14),
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  micro: {
    fontSize: scaleFont(10),
    lineHeight: scaleFont(12),
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },

  // Button text
  buttonLarge: {
    fontSize: scaleFont(18),
    lineHeight: scaleFont(24),
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  button: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(22),
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  buttonSmall: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(18),
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  // Legacy aliases (for backward compatibility)
  title: {
    fontSize: scaleFont(32),
    lineHeight: scaleFont(40),
    fontWeight: '300' as const,
    letterSpacing: -0.5,
  },
  headline: {
    fontSize: scaleFont(24),
    lineHeight: scaleFont(32),
    fontWeight: '300' as const,
    letterSpacing: 0,
  },
};

// =============================================================================
// BORDER RADIUS
// =============================================================================

const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  round: 9999,  // Perfect circle
  full: 9999,   // Alias
};

// =============================================================================
// SHADOWS
// =============================================================================

const shadows = {
  none: {},

  // Standard shadows
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },

  // Glow effects
  glow: {
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 0,
  },
  glowStrong: {
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 0,
  },
  glowAccent: {
    shadowColor: '#FFE500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 0,
  },
  glowSuccess: {
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 0,
  },
  glowDanger: {
    shadowColor: '#FF0080',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 0,
  },
};

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

const animations = {
  // Timing durations (unified naming)
  timing: {
    instant: 0,
    micro: 100,       // Micro-interactions (button press feedback)
    fast: 200,        // Quick transitions
    normal: 300,      // Standard animations
    smooth: 400,      // Smooth transitions
    entrance: 500,    // Screen/component entrances
    complex: 600,     // Multi-step animations
    slow: 800,        // Deliberate, dramatic animations
  },

  // Spring configurations
  spring: {
    // Quick, snappy feedback
    snappy: {
      damping: 15,
      stiffness: 400,
      mass: 0.5,
    },
    // Responsive UI feedback
    responsive: {
      damping: 18,
      stiffness: 350,
      mass: 0.6,
    },
    // Smooth, natural motion
    smooth: {
      damping: 20,
      stiffness: 200,
      mass: 1,
    },
    // Gentle, subtle motion
    gentle: {
      damping: 25,
      stiffness: 100,
      mass: 1.2,
    },
    // Bouncy, playful motion
    bouncy: {
      damping: 10,
      stiffness: 200,
      mass: 0.8,
    },
  },

  // Easing curves (for non-spring animations)
  easing: {
    easeIn: [0.4, 0, 1, 1],
    easeOut: [0, 0, 0.2, 1],
    easeInOut: [0.4, 0, 0.2, 1],
    sharp: [0.4, 0, 0.6, 1],
    bounce: [0.34, 1.56, 0.64, 1],
  },
};

// =============================================================================
// LAYOUT SYSTEM
// =============================================================================

const layout = {
  // Screen dimensions
  screenWidth: width,
  screenHeight: height,

  // Container padding
  containerPadding: 20,

  // Safe area insets (approximate)
  safeArea: {
    top: Platform.select({ ios: 44, android: 0, default: 0 }),
    bottom: Platform.select({ ios: 34, android: 0, default: 0 }),
  },

  // Component heights
  heights: {
    tabBar: 64,
    tabBarCompact: 52,
    header: 56,
    headerLarge: 96,
    button: 52,
    buttonSmall: 44,
    buttonLarge: 60,
    input: 52,
    inputSmall: 44,
    card: 280,
    cardCompact: 200,
    cardSmall: 120,
    listItem: 64,
    avatar: 44,
    avatarLarge: 80,
    avatarSmall: 32,
    iconButton: 44,
  },

  // Max widths (for responsive layouts)
  maxWidths: {
    content: Math.min(width - 32, 600),
    narrow: Math.min(width - 32, 400),
    wide: Math.min(width - 32, 800),
  },

  // Grid
  grid: {
    columns: 12,
    gutter: 16,
    margin: 20,
  },
};

// =============================================================================
// INTERACTIVE STATES
// =============================================================================

const states = {
  // Opacity values
  opacity: {
    disabled: 0.4,
    pressed: 0.7,
    hover: 0.9,
    active: 1,
    translucent: 0.95,
    overlay: 0.8,
    dimmed: 0.6,
  },

  // Scale values for press states
  scale: {
    pressed: 0.96,
    pressedSubtle: 0.98,
    hover: 1.02,
    bounce: 1.08,
    shrink: 0.92,
  },
};

// =============================================================================
// Z-INDEX LAYERS
// =============================================================================

const zIndex = {
  base: 0,
  content: 1,
  card: 5,
  elevated: 10,
  sticky: 20,
  header: 50,
  dropdown: 60,
  modal: 100,
  popover: 200,
  overlay: 500,
  toast: 1000,
  tooltip: 1100,
  max: 9999,
};

// =============================================================================
// ACCESSIBILITY
// =============================================================================

const accessibility = {
  // Minimum touch target size (44x44 for iOS, 48x48 for Android)
  minTouchTarget: Platform.select({ ios: 44, android: 48, default: 44 }),

  // Focus ring styles
  focusRing: {
    borderWidth: 2,
    borderColor: palette.wave[500],
    borderRadius: borderRadius.md,
  },

  // High contrast colors (WCAG AA compliant)
  highContrast: {
    text: '#ffffff',
    textOnPrimary: '#ffffff',
    textOnSuccess: '#000000',
    textOnDanger: '#ffffff',
    textOnWarning: '#000000',
  },

  // Reduced motion preferences
  reducedMotion: {
    duration: 0,
    spring: { damping: 100, stiffness: 1000 },
  },
};

// =============================================================================
// MAIN DESIGN SYSTEM EXPORT
// =============================================================================

export const designSystem = {
  // Colors (defaults to dark theme)
  colors: darkTheme,

  // Theme variants
  themes: {
    dark: darkTheme,
    light: lightTheme,
  },

  // Color palette (for advanced usage)
  palette,

  // All other design tokens
  gradients,
  spacing,
  typography,
  borderRadius,
  shadows,
  animations,
  layout,
  states,
  zIndex,
  accessibility,

  // Platform colors shortcut
  platforms: palette.platforms,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get spacing value by multiplier
 */
export const getSpacing = (multiplier: number): number => {
  return spacing.sm * multiplier;
};

/**
 * Get font style by variant
 */
export const getFontStyle = (variant: keyof typeof typography) => {
  return typography[variant];
};

/**
 * Get color by path (e.g., 'text.primary')
 */
export const getColor = (path: string, theme: 'dark' | 'light' = 'dark'): string => {
  const keys = path.split('.');
  let value: any = designSystem.themes[theme];

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return '#FFFFFF';
  }

  return typeof value === 'string' ? value : '#FFFFFF';
};

/**
 * Get platform color by platform name
 */
export const getPlatformColor = (platform: string): string => {
  const normalizedPlatform = platform.toLowerCase().replace(/\s+/g, '');
  return palette.platforms[normalizedPlatform as keyof typeof palette.platforms] || palette.platforms.other;
};

/**
 * Get gradient by name
 */
export const getGradient = (name: keyof typeof gradients): string[] => {
  return gradients[name];
};

/**
 * Create a glow shadow with custom color
 */
export const createGlow = (color: string, intensity: number = 0.5, radius: number = 20) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: intensity,
  shadowRadius: radius,
  elevation: 0,
});

// =============================================================================
// COMMON COMPONENT STYLES
// =============================================================================

export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },

  safeArea: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },

  contentContainer: {
    paddingHorizontal: layout.containerPadding,
    paddingVertical: spacing.lg,
  },

  card: {
    backgroundColor: darkTheme.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: darkTheme.border,
  },

  glowCard: {
    backgroundColor: darkTheme.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: darkTheme.primary,
    ...shadows.glow,
  },

  glassCard: {
    backgroundColor: darkTheme.glass,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: darkTheme.glassBorder,
  },

  button: {
    height: layout.heights.button,
    borderRadius: borderRadius.xxl,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },

  input: {
    height: layout.heights.input,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: darkTheme.surfaceLight,
    color: darkTheme.text.primary,
    fontSize: typography.body.fontSize,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  inputFocused: {
    borderColor: darkTheme.primary,
    ...shadows.glow,
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

  absoluteFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Focus state for accessibility
  focusVisible: {
    ...accessibility.focusRing,
  },
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default designSystem;

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

// Re-export for components still using enhancedTheme
export const enhancedTheme = {
  colors: {
    primary: palette.wave,
    neutral: palette.neutral,
    primaryLight: darkTheme.primaryLight,
    primaryDark: darkTheme.primaryDark,
    primaryGradient: gradients.primary,
    secondaryGradient: gradients.brand,
    successGradient: gradients.success,
    waveSightGradient: gradients.wave,
    waveSightDarkGradient: gradients.dark,
    waveSightLightGradient: ['#4da8ff', '#80cfff', '#b3e5ff'] as string[],
    oceanGradient: gradients.ocean,
    depthGradient: gradients.depth,
    background: darkTheme.background,
    backgroundSecondary: darkTheme.backgroundSecondary,
    backgroundTertiary: darkTheme.surfaceLight,
    glass: {
      light: darkTheme.glass,
      border: darkTheme.glassBorder,
      dark: darkTheme.glassLight,
    },
    text: darkTheme.text.primary,
    textSecondary: `rgba(255, 255, 255, 0.8)`,
    textTertiary: `rgba(255, 255, 255, 0.6)`,
    accent: darkTheme.accent,
    accentLight: darkTheme.primaryLight,
    accentDark: darkTheme.primaryDark,
    warning: darkTheme.warning,
    error: darkTheme.danger,
    success: darkTheme.success,
    surface: darkTheme.glass,
    surfaceHover: 'rgba(0, 128, 255, 0.12)',
    border: darkTheme.border,
  },
  spacing,
  borderRadius,
  typography,
  shadows,
  animations,
  animation: animations, // Alias
  layout,
  accent: palette.accent,
  gradients,
};

// Re-export for components still using theme
export const theme = {
  colors: {
    wave: palette.wave,
    primary: darkTheme.primary,
    primaryDark: darkTheme.primaryDark,
    primaryLight: darkTheme.primaryLight,
    secondary: darkTheme.secondary,
    secondaryDark: palette.info.dark,
    secondaryLight: palette.info.light,
    accent: darkTheme.accent,
    accentGlow: darkTheme.accentGlow,
    background: lightTheme.background,
    backgroundDark: lightTheme.backgroundSecondary,
    backgroundCard: lightTheme.surface,
    backgroundSecondary: lightTheme.surfaceLight,
    surface: lightTheme.surface,
    card: lightTheme.surface,
    text: lightTheme.text.primary,
    textLight: lightTheme.text.secondary,
    textSecondary: darkTheme.primary,
    textMuted: lightTheme.text.tertiary,
    textInverse: darkTheme.text.primary,
    dark: {
      background: darkTheme.background,
      backgroundCard: darkTheme.surface,
      backgroundSecondary: darkTheme.surfaceLight,
      text: darkTheme.text.primary,
      textLight: '#e5e7eb',
      textMuted: '#9ca3af',
      accent: darkTheme.accent,
    },
    success: lightTheme.success,
    error: lightTheme.danger,
    warning: lightTheme.warning,
    info: lightTheme.info,
    border: lightTheme.border,
    borderLight: lightTheme.borderLight,
    borderFocus: lightTheme.borderFocus,
  },
  spacing,
  borderRadius: {
    ...borderRadius,
    wave: 30,
  },
  typography,
  shadows,
};
