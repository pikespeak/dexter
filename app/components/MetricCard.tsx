import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, spacing, radius } from "../lib/theme";

interface Props {
  label: string;
  value: string | number | null | undefined;
}

export default function MetricCard({ label, value }: Props) {
  const formatted =
    value == null ? "—"
    : typeof value === "number"
      ? Math.abs(value) >= 1e12 ? `$${(value / 1e12).toFixed(2)}T`
        : Math.abs(value) >= 1e9 ? `$${(value / 1e9).toFixed(2)}B`
        : Math.abs(value) >= 1e6 ? `$${(value / 1e6).toFixed(1)}M`
        : value.toFixed(2)
    : String(value);

  return (
    <View style={s.card}>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <Text style={s.value}>{formatted}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, padding: spacing.md, flex: 1, minWidth: "44%" as unknown as number, margin: 4 },
  label: { fontSize: 9, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 2, marginBottom: spacing.xs },
  value: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, fontFamily: fonts.mono },
});
