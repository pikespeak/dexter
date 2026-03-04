import { useState, useCallback } from "react";
import { View, Text, Pressable, Dimensions, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import OnboardingSlide from "../components/OnboardingSlide";
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
    <View className="flex-1 bg-blue-900">
      {/* Skip button */}
      {!isLast && (
        <Pressable onPress={finish} className="absolute top-14 right-6 z-10">
          <Text className="text-blue-200 text-base font-medium">
            {t("onboarding.skip")}
          </Text>
        </Pressable>
      )}

      {/* Slide content */}
      <Animated.View
        key={currentSlide}
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(300)}
        className="flex-1 items-center justify-center px-8"
      >
        <Text className="text-7xl mb-8">{slide.icon}</Text>
        <Text className="text-3xl font-bold text-white text-center mb-4">
          {t(slide.titleKey)}
        </Text>
        <Text className="text-lg text-blue-100 text-center leading-7">
          {t(slide.descKey)}
        </Text>
      </Animated.View>

      {/* Bottom section */}
      <View className="pb-12 px-8">
        {/* Dot indicators */}
        <View className="flex-row justify-center mb-8">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`w-2.5 h-2.5 rounded-full mx-1.5 ${
                i === currentSlide ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <Pressable
          onPress={next}
          className="bg-white rounded-2xl py-4 items-center"
        >
          <Text className="text-blue-900 text-lg font-bold">
            {isLast ? t("onboarding.get_started") : t("onboarding.next")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
