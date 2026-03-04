import { useEffect } from "react";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAppStore } from "../lib/store";
import "../i18n";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    if (hasHydrated) {
      // Update i18n language from persisted store
      import("i18next").then((i18n) => {
        i18n.default.changeLanguage(language);
      });
      SplashScreen.hideAsync();
    }
  }, [hasHydrated, language]);

  useEffect(() => {
    if (hasHydrated && !hasCompletedOnboarding) {
      router.replace("/onboarding");
    }
  }, [hasHydrated, hasCompletedOnboarding, router]);

  if (!hasHydrated) return null;

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
