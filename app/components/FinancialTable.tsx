import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, fonts, spacing } from "../lib/theme";

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
        <Text style={s.emptyText}>NO DATA AVAILABLE</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
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
  empty: { padding: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: "center", fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.glassBorder, paddingVertical: 10 },
  headerCell: { fontSize: 10, fontFamily: fonts.mono, fontWeight: "700", color: colors.textMuted, width: 110, textAlign: "right", letterSpacing: 1 },
  row: { flexDirection: "row", paddingVertical: 10 },
  rowEven: { backgroundColor: "transparent" },
  rowOdd: { backgroundColor: colors.glassHighlight },
  cell: { fontSize: 13, fontFamily: fonts.mono, color: colors.textPrimary, width: 110, textAlign: "right" },
});
