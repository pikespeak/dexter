import { useEffect } from "react";
import { View, useColorScheme, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PaperProvider, ActivityIndicator } from "react-native-paper";
import { useAppStore } from "../lib/store";
import { lightTheme, darkTheme, useAppTheme } from "../lib/theme";
import type { AppTheme } from "../lib/theme";
import { useConnectionMonitor } from "../hooks/useConnectionMonitor";
import ErrorBoundary from "../components/ErrorBoundary";
import ConnectionBanner from "../components/ConnectionBanner";
import "../i18n";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutInner() {
  const router = useRouter();
  const theme = useAppTheme();
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const language = useAppStore((s) => s.language);

  useConnectionMonitor();

  useEffect(() => {
    if (hasHydrated) {
      import("i18next").then((i18n) => {
        i18n.default.changeLanguage(language);
      });
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hasHydrated, language]);

  useEffect(() => {
    if (hasHydrated && !hasCompletedOnboarding) {
      router.replace("/onboarding");
    }
  }, [hasHydrated, hasCompletedOnboarding, router]);

  if (!hasHydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ConnectionBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="ticker/[symbol]"
          options={{
            headerShown: true,
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.primary,
            headerTitleStyle: {
              color: theme.colors.onSurface,
              fontWeight: "700",
            },
          }}
        />
      </Stack>
    </>
  );
}

function ThemedRoot() {
  const colorScheme = useColorScheme();
  const theme: AppTheme = colorScheme === "dark" ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <RootLayoutInner />
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemedRoot />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
