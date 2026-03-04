import { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Animated, { SlideInRight, SlideOutLeft, FadeIn } from "react-native-reanimated";
import { useAppStore } from "../lib/store";
import { getHealth } from "../lib/api-client";
import { colors, fonts, spacing, radius } from "../lib/theme";

const SLIDES = [
  { icon: "◆", titleKey: "onboarding.slide1_title", descKey: "onboarding.slide1_desc" },
  { icon: "⚡", titleKey: "onboarding.slide2_title", descKey: "onboarding.slide2_desc" },
  { icon: "▲", titleKey: "onboarding.slide3_title", descKey: "onboarding.slide3_desc" },
  { icon: "⚙", titleKey: "onboarding.slide4_title", descKey: "onboarding.slide4_desc", isSetup: true },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
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
    <View style={s.container}>
      {/* Decorative grid lines */}
      <View style={s.gridLine1} />
      <View style={s.gridLine2} />
      <View style={s.gridLine3} />

      {/* Logo */}
      <Animated.View entering={FadeIn.delay(200)} style={s.logoWrap}>
        <Text style={s.logoText}>DEXTER</Text>
        <View style={s.logoDivider} />
      </Animated.View>

      {!isLast && (
        <Pressable onPress={finish} style={s.skipBtn}>
          <Text style={s.skipText}>{t("onboarding.skip")} →</Text>
        </Pressable>
      )}

      <Animated.View
        key={currentSlide}
        entering={SlideInRight.duration(350)}
        exiting={SlideOutLeft.duration(250)}
        style={s.slideContent}
      >
        <Text style={s.icon}>{slide.icon}</Text>
        <Text style={s.stepLabel}>0{currentSlide + 1} / 0{SLIDES.length}</Text>
        <Text style={s.title}>{t(slide.titleKey)}</Text>
        <Text style={s.desc}>{t(slide.descKey)}</Text>

        {/* Setup slide: Server URL + API Key */}
        {slide.isSetup && (
          <View style={s.setupWrap}>
            <Text style={s.setupLabel}>{t("settings.server_url").toUpperCase()}</Text>
            <TextInput
              style={s.setupInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://localhost:3000/api/v1"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={[s.setupLabel, { marginTop: spacing.md }]}>{t("settings.api_key").toUpperCase()}</Text>
            <TextInput
              style={s.setupInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t("settings.api_key_placeholder")}
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={testConnection} style={s.testBtn}>
              {testStatus === "testing" ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={s.testBtnText}>{t("settings.test_connection").toUpperCase()}</Text>
              )}
            </Pressable>
            {testStatus === "ok" && (
              <Text style={s.testOk}>{t("settings.connected").toUpperCase()}</Text>
            )}
            {testStatus === "fail" && (
              <Text style={s.testFail}>{t("settings.disconnected").toUpperCase()}</Text>
            )}
          </View>
        )}
      </Animated.View>

      <View style={s.bottom}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === currentSlide ? s.dotActive : s.dotInactive]} />
          ))}
        </View>

        <Pressable onPress={next} style={s.nextBtn}>
          <Text style={s.nextText}>
            {isLast ? t("onboarding.get_started").toUpperCase() : t("onboarding.next").toUpperCase()}
          </Text>
          <Text style={s.nextArrow}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  gridLine1: { position: "absolute", top: 0, left: "25%", width: 1, height: "100%", backgroundColor: "rgba(0, 212, 170, 0.04)" },
  gridLine2: { position: "absolute", top: 0, left: "50%", width: 1, height: "100%", backgroundColor: "rgba(0, 212, 170, 0.04)" },
  gridLine3: { position: "absolute", top: 0, left: "75%", width: 1, height: "100%", backgroundColor: "rgba(0, 212, 170, 0.04)" },
  logoWrap: { position: "absolute", top: 60, left: spacing.xl, zIndex: 10 },
  logoText: { fontSize: 16, fontFamily: fonts.mono, color: colors.accent, letterSpacing: 6 },
  logoDivider: { width: 32, height: 2, backgroundColor: colors.accent, marginTop: 6 },
  skipBtn: { position: "absolute", top: 60, right: spacing.xl, zIndex: 10 },
  skipText: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.body, letterSpacing: 1 },
  slideContent: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xxxl },
  icon: { fontSize: 48, color: colors.accent, marginBottom: spacing.lg },
  stepLabel: { fontSize: 12, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 3, marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.lg, lineHeight: 36, letterSpacing: -0.5 },
  desc: { fontSize: 16, color: colors.textSecondary, lineHeight: 26, fontFamily: fonts.body },
  bottom: { paddingBottom: 52, paddingHorizontal: spacing.xxxl },
  dots: { flexDirection: "row", marginBottom: spacing.xl },
  dot: { height: 3, marginRight: spacing.sm, borderRadius: 2 },
  dotActive: { backgroundColor: colors.accent, width: 32 },
  dotInactive: { backgroundColor: colors.border, width: 12 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 18 },
  nextText: { color: colors.textInverse, fontSize: 14, fontWeight: "700", letterSpacing: 3 },
  nextArrow: { color: colors.textInverse, fontSize: 18, marginLeft: spacing.sm },
  // Setup slide
  setupWrap: { marginTop: spacing.xl },
  setupLabel: { fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 3, marginBottom: spacing.xs },
  setupInput: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: colors.textPrimary, fontFamily: fonts.mono },
  testBtn: { marginTop: spacing.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center" },
  testBtnText: { color: colors.accent, fontWeight: "700", fontSize: 11, letterSpacing: 2, fontFamily: fonts.mono },
  testOk: { textAlign: "center", marginTop: spacing.sm, fontSize: 11, fontFamily: fonts.mono, color: colors.gain, letterSpacing: 2 },
  testFail: { textAlign: "center", marginTop: spacing.sm, fontSize: 11, fontFamily: fonts.mono, color: colors.loss, letterSpacing: 2 },
});
