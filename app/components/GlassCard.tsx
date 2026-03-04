import { View, type ViewStyle, StyleSheet } from "react-native";
import { colors, radius } from "../lib/theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function GlassCard({ children, style }: Props) {
  return <View style={[s.card, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
  },
});
