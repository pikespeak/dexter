import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAppStore } from "../lib/store";
import "../i18n";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const language = useAppStore((s) => s.language);

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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="ticker/[symbol]"
        options={{ headerShown: true, headerBackTitle: "Back" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e3a5f",
  },
});
