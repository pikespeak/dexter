import { StyleSheet } from "react-native";
import { Card, Text } from "react-native-paper";
import { spacing } from "../lib/theme";

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
    <Card mode="outlined" style={styles.card}>
      <Card.Content>
        <Text variant="labelSmall" style={{ letterSpacing: 2, marginBottom: spacing.xs }}>
          {label.toUpperCase()}
        </Text>
        <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
          {formatted}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: "44%" as unknown as number, margin: 4 },
});
