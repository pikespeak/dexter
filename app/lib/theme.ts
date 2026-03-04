import { MD3LightTheme, MD3DarkTheme, useTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

// ── Finance extension ──────────────────────────────────────────────
interface FinanceColors {
  gain: string;
  gainBg: string;
  loss: string;
  lossBg: string;
  info: string;
  infoBg: string;
  warning: string;
  userBubble: string;
  botBubble: string;
  toolBg: string;
}

export interface AppTheme extends MD3Theme {
  finance: FinanceColors;
}

// ── Light Theme ────────────────────────────────────────────────────
export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#00897B",
    onPrimary: "#FFFFFF",
    primaryContainer: "#A7F3EC",
    onPrimaryContainer: "#002019",
    secondary: "#4A635F",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#CCE8E2",
    onSecondaryContainer: "#06201C",
    tertiary: "#456179",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#CCE5FF",
    onTertiaryContainer: "#001E31",
    error: "#BA1A1A",
    onError: "#FFFFFF",
    errorContainer: "#FFDAD6",
    onErrorContainer: "#410002",
    background: "#F5FBF8",
    onBackground: "#171D1B",
    surface: "#F5FBF8",
    onSurface: "#171D1B",
    surfaceVariant: "#DAE5E1",
    onSurfaceVariant: "#3F4946",
    outline: "#6F7976",
    outlineVariant: "#BEC9C5",
    inverseSurface: "#2B3230",
    inverseOnSurface: "#ECF2EF",
    inversePrimary: "#4DB6AC",
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: "transparent",
      level1: "#EEF6F3",
      level2: "#E6F1ED",
      level3: "#DFECE8",
      level4: "#DDE9E6",
      level5: "#D8E6E2",
    },
    surfaceDisabled: "rgba(23, 29, 27, 0.12)",
    onSurfaceDisabled: "rgba(23, 29, 27, 0.38)",
    backdrop: "rgba(0, 0, 0, 0.4)",
  },
  finance: {
    gain: "#2E7D32",
    gainBg: "rgba(46, 125, 50, 0.08)",
    loss: "#C62828",
    lossBg: "rgba(198, 40, 40, 0.08)",
    info: "#0277BD",
    infoBg: "rgba(2, 119, 189, 0.08)",
    warning: "#F9A825",
    userBubble: "#00897B",
    botBubble: "#EEF6F3",
    toolBg: "rgba(2, 119, 189, 0.06)",
  },
};

// ── Dark Theme ─────────────────────────────────────────────────────
export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#4DB6AC",
    onPrimary: "#003731",
    primaryContainer: "#005048",
    onPrimaryContainer: "#A7F3EC",
    secondary: "#B1CCC7",
    onSecondary: "#1C3531",
    secondaryContainer: "#334B47",
    onSecondaryContainer: "#CCE8E2",
    tertiary: "#ADC9E5",
    onTertiary: "#153349",
    tertiaryContainer: "#2D4961",
    onTertiaryContainer: "#CCE5FF",
    error: "#FFB4AB",
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6",
    background: "#0F1512",
    onBackground: "#DEE4E1",
    surface: "#0F1512",
    onSurface: "#DEE4E1",
    surfaceVariant: "#3F4946",
    onSurfaceVariant: "#BEC9C5",
    outline: "#899390",
    outlineVariant: "#3F4946",
    inverseSurface: "#DEE4E1",
    inverseOnSurface: "#2B3230",
    inversePrimary: "#00897B",
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: "transparent",
      level1: "#1A2421",
      level2: "#1F2D29",
      level3: "#253531",
      level4: "#273833",
      level5: "#2B3D38",
    },
    surfaceDisabled: "rgba(222, 228, 225, 0.12)",
    onSurfaceDisabled: "rgba(222, 228, 225, 0.38)",
    backdrop: "rgba(0, 0, 0, 0.4)",
  },
  finance: {
    gain: "#00E676",
    gainBg: "rgba(0, 230, 118, 0.10)",
    loss: "#FF5252",
    lossBg: "rgba(255, 82, 82, 0.10)",
    info: "#40C4FF",
    infoBg: "rgba(64, 196, 255, 0.08)",
    warning: "#FFCA28",
    userBubble: "#4DB6AC",
    botBubble: "#1A2421",
    toolBg: "rgba(64, 196, 255, 0.06)",
  },
};

// ── Typed hook ─────────────────────────────────────────────────────
export function useAppTheme() {
  return useTheme<AppTheme>();
}

// ── Spacing (unchanged) ────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};
