/**
 * PiksPeak Design System — "Stadium Night"
 *
 * Inspired by floodlit stadiums, LED scoreboards,
 * and the electric green of a perfect pitch at night.
 */

export const colors = {
  // Backgrounds — deep midnight layering
  bg: {
    primary: '#050A14',        // Night sky
    surface: '#0C1220',        // Stadium stands
    elevated: '#131B2E',       // VIP lounge
    card: '#0F1728',           // Match card
    input: '#0D1525',          // Input field
    overlay: 'rgba(5,10,20,0.85)',
  },

  // The pitch — signature accent
  pitch: {
    green: '#00E676',          // Electric pitch green
    greenMuted: '#00E67640',   // Glow / tint
    greenFaint: '#00E67615',   // Subtle background
    dark: '#004D25',           // Dark green
  },

  // Trophy gold — premium elements
  gold: {
    primary: '#FFB800',
    muted: '#FFB80040',
    faint: '#FFB80015',
  },

  // Alert / Live — stadium red
  alert: {
    red: '#FF3B5C',
    redMuted: '#FF3B5C40',
    redFaint: '#FF3B5C15',
  },

  // Data — cyan accents for charts/stats
  data: {
    cyan: '#00BCD4',
    cyanMuted: '#00BCD440',
  },

  // Text
  text: {
    primary: '#ECEEF4',
    secondary: '#8B95AD',
    muted: '#4D5A75',
    inverse: '#050A14',
  },

  // Borders
  border: {
    subtle: '#1A2540',
    medium: '#253352',
    accent: '#00E67630',
  },

  // Gradients (as arrays for LinearGradient)
  gradient: {
    pitchGlow: ['#00E67600', '#00E67620', '#00E67600'],
    goldShine: ['#FFB80000', '#FFB80030', '#FFB80000'],
    cardSheen: ['#131B2E', '#0F1728'],
    nightSky: ['#050A14', '#0C1220', '#050A14'],
  },
} as const;

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

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
} as const;

/**
 * Typography — scoreboard-inspired hierarchy.
 *
 * Big bold numbers for probabilities. Condensed uppercase for labels.
 * Clean weights for readability.
 */
export const typography = {
  // Huge probability/score numbers
  display: {
    fontSize: 42,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    color: colors.text.primary,
  },
  // Large section scores
  score: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1,
    color: colors.text.primary,
  },
  // Page titles
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  // Section headings
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  // Card titles / team names
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: 0,
    color: colors.text.primary,
  },
  // Body text
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  // Small body text
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
    color: colors.text.secondary,
  },
  // League names, labels — uppercase scoreboard style
  overline: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    color: colors.text.muted,
  },
  // Probability numbers
  prob: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    color: colors.pitch.green,
  },
  // Button text
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    color: colors.text.primary,
  },
  // Caption/footnote
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
    color: colors.text.muted,
  },
} as const;

/**
 * Shadow presets — soft glow effects for stadium lighting feel
 */
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.pitch.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: colors.gold.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
