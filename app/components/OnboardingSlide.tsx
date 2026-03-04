import { Text, StyleSheet } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

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
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  icon: { fontSize: 72, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 16 },
  desc: { fontSize: 18, color: "#bfdbfe", textAlign: "center", lineHeight: 28 },
});
