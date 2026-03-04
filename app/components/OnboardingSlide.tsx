import { StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useAppTheme, spacing } from "../lib/theme";

interface Props {
  icon: string;
  title: string;
  description: string;
}

export default function OnboardingSlide({ icon, title, description }: Props) {
  const theme = useAppTheme();

  return (
    <Animated.View entering={FadeInRight.duration(500)} style={styles.container}>
      <Text style={{ fontSize: 48, color: theme.colors.primary, marginBottom: spacing.xxl }}>{icon}</Text>
      <Text variant="headlineMedium" style={{ fontWeight: "800", textAlign: "center", marginBottom: spacing.lg }}>
        {title}
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", lineHeight: 26 }}>
        {description}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxxl },
});
