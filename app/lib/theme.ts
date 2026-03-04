import { Platform, StyleSheet } from "react-native";

// Glassmorphism Dark — Premium Finance Aesthetic
export const colors = {
  // Core
  bg: "#0c0f1a",
  bgCard: "rgba(255,255,255,0.05)",
  bgCardHover: "rgba(255,255,255,0.08)",
  bgElevated: "rgba(255,255,255,0.07)",
  bgInput: "rgba(255,255,255,0.04)",

  // Borders
  border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.12)",
  borderAccent: "#00d4aa",

  // Glass
  glassBorder: "rgba(255,255,255,0.10)",
  glassHighlight: "rgba(255,255,255,0.04)",

  // Text
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textInverse: "#0c0f1a",

  // Accent — Cyan/Teal
  accent: "#00d4aa",
  accentLight: "#33e0be",
  accentDark: "#00b893",
  accentSubtle: "rgba(0, 212, 170, 0.12)",

  // Legacy alias
  gold: "#00d4aa",
  goldLight: "#33e0be",
  goldDark: "#00b893",
  goldSubtle: "rgba(0, 212, 170, 0.12)",

  // Market
  gain: "#00e676",
  gainBg: "rgba(0, 230, 118, 0.08)",
  gainBorder: "rgba(0, 230, 118, 0.2)",
  loss: "#ff1744",
  lossBg: "rgba(255, 23, 68, 0.08)",
  lossBorder: "rgba(255, 23, 68, 0.2)",

  // Semantic
  info: "#38bdf8",
  infoBg: "rgba(56, 189, 248, 0.08)",
  warning: "#fbbf24",
  error: "#ff1744",
  errorBg: "rgba(255, 23, 68, 0.08)",

  // Agent
  userBubble: "#00d4aa",
  botBubble: "rgba(255,255,255,0.05)",
  toolBg: "rgba(56, 189, 248, 0.06)",

  // Tab bar
  tabActive: "#00d4aa",
  tabInactive: "#475569",
  tabBg: "#0a0d16",
};

export const fonts = {
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  display: Platform.select({
    ios: "Avenir-Heavy",
    android: "sans-serif-condensed",
    default: "system-ui",
  }),
  body: Platform.select({
    ios: "Avenir-Medium",
    android: "sans-serif-medium",
    default: "system-ui",
  }),
  light: Platform.select({
    ios: "Avenir-Light",
    android: "sans-serif-light",
    default: "system-ui",
  }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 100,
};

// Reusable glass card style snippet
export const glassCard = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
  },
});
