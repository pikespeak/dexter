import { View, Text, ScrollView, StyleSheet } from "react-native";

interface Props {
  data: Record<string, string | number | null>[];
  columns: { key: string; label: string }[];
}

function formatValue(val: string | number | null): string {
  if (val == null) return "—";
  if (typeof val === "number") {
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return val.toFixed(2);
  }
  return String(val);
}

export default function FinancialTable({ data, columns }: Props) {
  if (data.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>No data available</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={s.headerRow}>
          {columns.map((col) => (
            <Text key={col.key} style={s.headerCell}>{col.label}</Text>
          ))}
        </View>
        {data.map((row, i) => (
          <View key={i} style={[s.row, i % 2 === 0 ? s.rowEven : s.rowOdd]}>
            {columns.map((col) => (
              <Text key={col.key} style={s.cell}>{formatValue(row[col.key])}</Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  empty: { padding: 16 },
  emptyText: { color: "#9ca3af", textAlign: "center" },
  headerRow: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  headerCell: { fontSize: 12, fontWeight: "bold", color: "#6b7280", width: 112, textAlign: "right" },
  row: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12 },
  rowEven: { backgroundColor: "#fff" },
  rowOdd: { backgroundColor: "#f9fafb" },
  cell: { fontSize: 14, color: "#374151", width: 112, textAlign: "right" },
});
