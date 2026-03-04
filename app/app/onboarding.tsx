import { useState, useCallback } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Animated, { SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { useAppStore } from "../lib/store";

const { width } = Dimensions.get("window");

const SLIDES = [
  { icon: "📊", titleKey: "onboarding.slide1_title", descKey: "onboarding.slide1_desc" },
  { icon: "⚡", titleKey: "onboarding.slide2_title", descKey: "onboarding.slide2_desc" },
  { icon: "🤖", titleKey: "onboarding.slide3_title", descKey: "onboarding.slide3_desc" },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [currentSlide, setCurrentSlide] = useState(0);

  const finish = useCallback(() => {
    completeOnboarding();
    router.replace("/(tabs)");
  }, [completeOnboarding, router]);

  const next = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      finish();
    }
  }, [currentSlide, finish]);

  const isLast = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      {!isLast && (
        <Pressable onPress={finish} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
        </Pressable>
      )}

      <Animated.View
        key={currentSlide}
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(300)}
        style={styles.slideContent}
      >
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{t(slide.titleKey)}</Text>
        <Text style={styles.desc}>{t(slide.descKey)}</Text>
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentSlide ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <Pressable onPress={next} style={styles.nextBtn}>
          <Text style={styles.nextText}>
            {isLast ? t("onboarding.get_started") : t("onboarding.next")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e3a8a" },
  skipBtn: { position: "absolute", top: 56, right: 24, zIndex: 10 },
  skipText: { color: "#93c5fd", fontSize: 16, fontWeight: "500" },
  slideContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  icon: { fontSize: 72, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 16 },
  desc: { fontSize: 18, color: "#bfdbfe", textAlign: "center", lineHeight: 28 },
  bottom: { paddingBottom: 48, paddingHorizontal: 32 },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 32 },
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 6 },
  dotActive: { backgroundColor: "#fff" },
  dotInactive: { backgroundColor: "rgba(255,255,255,0.3)" },
  nextBtn: { backgroundColor: "#fff", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  nextText: { color: "#1e3a8a", fontSize: 18, fontWeight: "bold" },
});
