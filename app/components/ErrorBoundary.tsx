import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, Icon, Text } from "react-native-paper";
import { spacing, useAppTheme } from "../lib/theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      <Icon source="alert-circle-outline" size={48} color={theme.colors.error} />
      <Text variant="titleMedium" style={{ letterSpacing: 2, marginTop: spacing.xl, marginBottom: spacing.md }}>
        SOMETHING WENT WRONG
      </Text>
      <Text variant="bodyMedium" style={{ textAlign: "center", marginBottom: spacing.xxl }}>
        {error?.message || "An unexpected error occurred"}
      </Text>
      <Button mode="outlined" onPress={onReset}>
        TRY AGAIN
      </Button>
    </View>
  );
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
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxxl,
  },
});
