import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAppStore } from "../lib/store";
import { colors } from "../lib/theme";
import { useConnectionMonitor } from "../hooks/useConnectionMonitor";
import ErrorBoundary from "../components/ErrorBoundary";
import ConnectionBanner from "../components/ConnectionBanner";
import "../i18n";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutInner() {
  const router = useRouter();
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
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <ConnectionBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="ticker/[symbol]"
          options={{
            headerShown: true,
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.accent,
            headerTitleStyle: {
              color: colors.textPrimary,
              fontWeight: "700",
              letterSpacing: 1,
            },
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutInner />
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
