import { View, ScrollView, StyleSheet } from "react-native";
import { DataTable, Text } from "react-native-paper";
import { useAppTheme, spacing } from "../lib/theme";

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
  const theme = useAppTheme();

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="labelSmall" style={{ letterSpacing: 2, color: theme.colors.onSurfaceVariant }}>
          NO DATA AVAILABLE
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
      <DataTable>
        <DataTable.Header>
          {columns.map((col) => (
            <DataTable.Title key={col.key} numeric={col.key !== columns[0]?.key} style={styles.cell}>
              {col.label}
            </DataTable.Title>
          ))}
        </DataTable.Header>
        {data.map((row, i) => (
          <DataTable.Row key={i}>
            {columns.map((col) => (
              <DataTable.Cell key={col.key} numeric={col.key !== columns[0]?.key} style={styles.cell}>
                {formatValue(row[col.key])}
              </DataTable.Cell>
            ))}
          </DataTable.Row>
        ))}
      </DataTable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { padding: spacing.xl, alignItems: "center" },
  cell: { minWidth: 100 },
});
