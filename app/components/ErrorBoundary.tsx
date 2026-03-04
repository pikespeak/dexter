import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, fonts, spacing, radius } from "../lib/theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.icon}>!</Text>
          <Text style={s.title}>SOMETHING WENT WRONG</Text>
          <Text style={s.message}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <Pressable onPress={this.handleReset} style={s.button}>
            <Text style={s.buttonText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxxl,
  },
  icon: {
    fontSize: 48,
    color: colors.error,
    fontWeight: "800",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
    letterSpacing: 3,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonText: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: fonts.mono,
    fontWeight: "700",
    letterSpacing: 2,
  },
});
