import { View, Text, StyleSheet } from "react-native";

interface Props {
  label: string;
  value: string | number | null | undefined;
}

export default function MetricCard({ label, value }: Props) {
  const formatted =
    value == null ? "—"
    : typeof value === "number"
      ? Math.abs(value) >= 1e9 ? `$${(value / 1e9).toFixed(1)}B`
        : Math.abs(value) >= 1e6 ? `$${(value / 1e6).toFixed(1)}M`
        : value.toFixed(2)
    : String(value);

  return (
    <View style={s.card}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{formatted}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, flex: 1, minWidth: "45%" as unknown as number, margin: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  label: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  value: { fontSize: 18, fontWeight: "bold", color: "#111827", marginTop: 4 },
});
