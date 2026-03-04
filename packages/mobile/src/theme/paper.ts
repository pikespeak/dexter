/**
 * Theme Bridge — maps PiksPeak M3 tokens to react-native-paper MD3DarkTheme.
 *
 * `theme/index.ts` remains the single source of truth.
 * This file simply re-maps our tokens into Paper's expected format.
 */

import { MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { md3 } from './index';

export const piksPeakTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,

    // Primary
    primary: md3.primary,
    onPrimary: md3.onPrimary,
    primaryContainer: md3.primaryContainer,
    onPrimaryContainer: md3.onPrimaryContainer,

    // Secondary
    secondary: md3.secondary,
    onSecondary: md3.onSecondary,
    secondaryContainer: md3.secondaryContainer,
    onSecondaryContainer: md3.onSecondaryContainer,

    // Tertiary
    tertiary: md3.tertiary,
    onTertiary: md3.onTertiary,
    tertiaryContainer: md3.tertiaryContainer,
    onTertiaryContainer: md3.onTertiaryContainer,

    // Error
    error: md3.error,
    onError: md3.onError,
    errorContainer: md3.errorContainer,
    onErrorContainer: md3.onErrorContainer,

    // Surface hierarchy
    background: md3.surfaceContainerLowest,
    onBackground: md3.onSurface,
    surface: md3.surface,
    onSurface: md3.onSurface,
    surfaceVariant: md3.surfaceContainerHigh,
    onSurfaceVariant: md3.onSurfaceVariant,
    surfaceDisabled: md3.onSurface + '1F',

    // Elevation surfaces
    elevation: {
      level0: 'transparent',
      level1: md3.surfaceContainerLow,
      level2: md3.surfaceContainer,
      level3: md3.surfaceContainerHigh,
      level4: md3.surfaceContainerHigh,
      level5: md3.surfaceContainerHighest,
    },

    // Outline
    outline: md3.outline,
    outlineVariant: md3.outlineVariant,

    // Inverse
    inverseSurface: md3.inverseSurface,
    inverseOnSurface: md3.inverseOnSurface,
    inversePrimary: md3.inversePrimary,

    // Misc
    shadow: md3.shadow,
    scrim: md3.scrim,
    backdrop: 'rgba(0,0,0,0.4)',
  },
};

/** Typed useTheme hook that returns our custom theme. */
export const useAppTheme = () => useTheme<typeof piksPeakTheme>();
