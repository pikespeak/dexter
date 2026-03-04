import { Text, StyleSheet } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { colors, fonts, spacing } from "../lib/theme";

interface Props {
  icon: string;
  title: string;
  description: string;
}

export default function OnboardingSlide({ icon, title, description }: Props) {
  return (
    <Animated.View entering={FadeInRight.duration(500)} style={s.container}>
      <Text style={s.icon}>{icon}</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.desc}>{description}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxxl },
  icon: { fontSize: 48, color: colors.accent, marginBottom: spacing.xxl },
  title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, textAlign: "center", marginBottom: spacing.lg },
  desc: { fontSize: 16, color: colors.textSecondary, textAlign: "center", lineHeight: 26 },
});
