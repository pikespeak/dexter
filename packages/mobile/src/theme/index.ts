/**
 * PiksPeak Design System — Material 3 Dark
 *
 * M3 tonal color system derived from pitch green (#00E676),
 * trophy gold tertiary, and cool blue-tinted neutral surfaces.
 * Cross-platform: iOS, Android, Web.
 */

// ─── M3 Color Scheme (Dark) ─────────────────────────────────────────

export const md3 = {
  // Primary — pitch green
  primary: '#00E676',
  onPrimary: '#003920',
  primaryContainer: '#005231',
  onPrimaryContainer: '#6EFFAA',

  // Secondary — muted teal
  secondary: '#B4CCC0',
  onSecondary: '#20352B',
  secondaryContainer: '#374B3E',
  onSecondaryContainer: '#D0E8D7',

  // Tertiary — trophy gold
  tertiary: '#FFB800',
  onTertiary: '#3D2E00',
  tertiaryContainer: '#584500',
  onTertiaryContainer: '#FFDE7A',

  // Error
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  // Surface hierarchy
  surface: '#0E1318',
  surfaceDim: '#0E1318',
  surfaceBright: '#353A41',
  surfaceContainerLowest: '#070C11',
  surfaceContainerLow: '#151B22',
  surfaceContainer: '#1A2028',
  surfaceContainerHigh: '#242B33',
  surfaceContainerHighest: '#2F363E',

  onSurface: '#E2E3E8',
  onSurfaceVariant: '#C1C7D0',
  outline: '#8B929B',
  outlineVariant: '#41484F',

  inverseSurface: '#E2E3E8',
  inverseOnSurface: '#2C3240',
  inversePrimary: '#006D3B',

  scrim: '#000000',
  shadow: '#000000',
} as const;

// ─── Backward-Compatible Aliases ────────────────────────────────────
// Maps old theme API to M3 tokens. Screens import this.

export const colors = {
  bg: {
    primary: md3.surfaceContainerLowest,
    surface: md3.surface,
    elevated: md3.surfaceContainerHigh,
    card: md3.surfaceContainer,
    input: md3.surfaceContainerHigh,
    overlay: 'rgba(0,0,0,0.70)',
  },

  pitch: {
    green: md3.primary,
    greenMuted: md3.primary + '40',
    greenFaint: md3.primary + '12',
    dark: md3.onPrimary,
  },

  gold: {
    primary: md3.tertiary,
    muted: md3.tertiary + '40',
    faint: md3.tertiary + '12',
  },

  alert: {
    red: md3.error,
    redMuted: md3.error + '40',
    redFaint: md3.error + '12',
  },

  data: {
    cyan: '#4DD0E1',
    cyanMuted: '#4DD0E140',
  },

  text: {
    primary: md3.onSurface,
    secondary: md3.onSurfaceVariant,
    muted: md3.outline,
    inverse: md3.onPrimary,
  },

  border: {
    subtle: md3.outlineVariant,
    medium: md3.outline,
    accent: md3.primary + '30',
  },

  gradient: {
    pitchGlow: [md3.primary + '00', md3.primary + '20', md3.primary + '00'],
    goldShine: [md3.tertiary + '00', md3.tertiary + '30', md3.tertiary + '00'],
    cardSheen: [md3.surfaceContainerHigh, md3.surfaceContainer],
    nightSky: [md3.surfaceContainerLowest, md3.surface, md3.surfaceContainerLowest],
  },
} as const;

// ─── M3 Typography Scale ────────────────────────────────────────────

export const typeScale = {
  displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: '400' as const, letterSpacing: -0.25 },
  displayMedium: { fontSize: 45, lineHeight: 52, fontWeight: '400' as const, letterSpacing: 0 },
  displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: '400' as const, letterSpacing: 0 },

  headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: '400' as const, letterSpacing: 0 },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '400' as const, letterSpacing: 0 },
  headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: '400' as const, letterSpacing: 0 },

  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '400' as const, letterSpacing: 0 },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const, letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const, letterSpacing: 0.1 },

  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0.4 },

  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.5 },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.5 },
} as const;

// Backward-compatible typography aliases
export const typography = {
  display: {
    fontSize: 42,
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: md3.onSurface,
  },
  score: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: md3.onSurface,
  },
  h1: {
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 36,
    color: md3.onSurface,
  },
  h2: {
    fontSize: 22,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 28,
    color: md3.onSurface,
  },
  h3: {
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
    color: md3.onSurface,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    color: md3.onSurfaceVariant,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    color: md3.onSurfaceVariant,
  },
  overline: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: md3.outline,
    lineHeight: 16,
  },
  prob: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: md3.primary,
  },
  button: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
    color: md3.onSurface,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    color: md3.outline,
    lineHeight: 16,
  },
} as const;

// ─── Spacing ────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

// ─── M3 Shape Scale ─────────────────────────────────────────────────

export const shape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
} as const;

// Backward-compatible radius aliases
export const radius = {
  sm: shape.small,
  md: shape.medium,
  lg: shape.large,
  xl: shape.extraLarge,
  full: shape.full,
} as const;

// ─── M3 Elevation ───────────────────────────────────────────────────
// In M3 dark theme, elevation is primarily tonal (surface tinting).
// Shadows are subtle complement.

export const elevation = {
  level0: {},
  level1: {
    shadowColor: md3.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  level2: {
    shadowColor: md3.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  level3: {
    shadowColor: md3.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  level4: {
    shadowColor: md3.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 10,
    elevation: 8,
  },
  level5: {
    shadowColor: md3.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 12,
  },
} as const;

// Backward-compatible shadow aliases
export const shadows = {
  card: elevation.level2,
  glow: {
    shadowColor: md3.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  goldGlow: {
    shadowColor: md3.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
