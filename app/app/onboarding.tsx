import { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Animated, { SlideInRight, SlideOutLeft, FadeIn } from "react-native-reanimated";
import { TextInput, Button, Text, ActivityIndicator } from "react-native-paper";
import { useAppStore } from "../lib/store";
import { getHealth } from "../lib/api-client";
import { useAppTheme, spacing } from "../lib/theme";

const SLIDES = [
  { icon: "◆", titleKey: "onboarding.slide1_title", descKey: "onboarding.slide1_desc" },
  { icon: "⚡", titleKey: "onboarding.slide2_title", descKey: "onboarding.slide2_desc" },
  { icon: "▲", titleKey: "onboarding.slide3_title", descKey: "onboarding.slide3_desc" },
  { icon: "⚙", titleKey: "onboarding.slide4_title", descKey: "onboarding.slide4_desc", isSetup: true },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const serverUrl = useAppStore((s) => s.serverUrl);
  const apiKey = useAppStore((s) => s.apiKey);
  const setServerUrl = useAppStore((s) => s.setServerUrl);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  const finish = useCallback(() => {
    completeOnboarding();
    router.replace("/(tabs)");
  }, [completeOnboarding, router]);

  const next = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) setCurrentSlide((s) => s + 1);
    else finish();
  }, [currentSlide, finish]);

  const testConnection = useCallback(async () => {
    setTestStatus("testing");
    try {
      await getHealth(true);
      setTestStatus("ok");
    } catch {
      setTestStatus("fail");
    }
  }, []);

  const isLast = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Decorative grid lines */}
      <View style={[styles.gridLine, { left: "25%", backgroundColor: theme.colors.primaryContainer }]} />
      <View style={[styles.gridLine, { left: "50%", backgroundColor: theme.colors.primaryContainer }]} />
      <View style={[styles.gridLine, { left: "75%", backgroundColor: theme.colors.primaryContainer }]} />

      {/* Logo */}
      <Animated.View entering={FadeIn.delay(200)} style={styles.logoWrap}>
        <Text variant="titleSmall" style={{ color: theme.colors.primary, letterSpacing: 6 }}>DEXTER</Text>
        <View style={[styles.logoDivider, { backgroundColor: theme.colors.primary }]} />
      </Animated.View>

      {!isLast && (
        <View style={styles.skipBtn}>
          <Button mode="text" onPress={finish} compact>
            {t("onboarding.skip")} →
          </Button>
        </View>
      )}

      <Animated.View
        key={currentSlide}
        entering={SlideInRight.duration(350)}
        exiting={SlideOutLeft.duration(250)}
        style={styles.slideContent}
      >
        <Text style={{ fontSize: 48, color: theme.colors.primary, marginBottom: spacing.lg }}>{slide.icon}</Text>
        <Text variant="labelMedium" style={{ letterSpacing: 3, color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }}>
          0{currentSlide + 1} / 0{SLIDES.length}
        </Text>
        <Text variant="headlineMedium" style={{ fontWeight: "800", marginBottom: spacing.lg, lineHeight: 36 }}>
          {t(slide.titleKey)}
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 26 }}>
          {t(slide.descKey)}
        </Text>

        {/* Setup slide */}
        {slide.isSetup && (
          <View style={styles.setupWrap}>
            <TextInput
              mode="outlined"
              label={t("settings.server_url")}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://localhost:3000/api/v1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{ marginBottom: spacing.md }}
            />
            <TextInput
              mode="outlined"
              label={t("settings.api_key")}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t("settings.api_key_placeholder")}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={{ marginBottom: spacing.md }}
            />
            <Button
              mode="outlined"
              onPress={testConnection}
              loading={testStatus === "testing"}
              disabled={testStatus === "testing"}
            >
              {t("settings.test_connection").toUpperCase()}
            </Button>
            {testStatus === "ok" && (
              <Text style={{ textAlign: "center", marginTop: spacing.sm, color: theme.finance.gain, letterSpacing: 2, fontSize: 11 }}>
                {t("settings.connected").toUpperCase()}
              </Text>
            )}
            {testStatus === "fail" && (
              <Text style={{ textAlign: "center", marginTop: spacing.sm, color: theme.finance.loss, letterSpacing: 2, fontSize: 11 }}>
                {t("settings.disconnected").toUpperCase()}
              </Text>
            )}
          </View>
        )}
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentSlide ? theme.colors.primary : theme.colors.outlineVariant,
                  width: i === currentSlide ? 32 : 12,
                },
              ]}
            />
          ))}
        </View>

        <Button mode="contained" onPress={next} contentStyle={{ paddingVertical: 8 }}>
          {isLast ? t("onboarding.get_started").toUpperCase() : t("onboarding.next").toUpperCase()}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gridLine: { position: "absolute", top: 0, width: 1, height: "100%", opacity: 0.15 },
  logoWrap: { position: "absolute", top: 60, left: spacing.xl, zIndex: 10 },
  logoDivider: { width: 32, height: 2, marginTop: 6 },
  skipBtn: { position: "absolute", top: 56, right: spacing.lg, zIndex: 10 },
  slideContent: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xxxl },
  bottom: { paddingBottom: 52, paddingHorizontal: spacing.xxxl },
  dots: { flexDirection: "row", marginBottom: spacing.xl },
  dot: { height: 3, marginRight: spacing.sm, borderRadius: 2 },
  setupWrap: { marginTop: spacing.xl },
});
