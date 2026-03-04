import { View, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { Card, Text } from "react-native-paper";
import { getPriceSnapshot } from "../lib/api-client";
import { useAppTheme, spacing } from "../lib/theme";

interface Props {
  ticker: string;
  onPress: (ticker: string) => void;
}

export default function WatchlistCard({ ticker, onPress }: Props) {
  const theme = useAppTheme();
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    getPriceSnapshot(ticker)
      .then((res) => {
        setPrice(res.data.price ?? res.data.close);
        setChange(res.data.change_percent ?? null);
      })
      .catch(() => setError(true));
  }, [ticker]);

  const isPositive = (change ?? 0) >= 0;

  return (
    <Card mode="elevated" onPress={() => onPress(ticker)} style={[styles.card, { marginRight: spacing.md }]}>
      <Card.Content>
        <View style={styles.topRow}>
          <Text variant="titleSmall" style={{ fontWeight: "700", letterSpacing: 1 }}>{ticker}</Text>
          {change !== null && (
            <View style={[styles.badge, { backgroundColor: isPositive ? theme.finance.gainBg : theme.finance.lossBg }]}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: isPositive ? theme.finance.gain : theme.finance.loss }}>
                {isPositive ? "▲" : "▼"}
              </Text>
            </View>
          )}
        </View>
        {error ? (
          <Text style={{ color: theme.colors.error, fontWeight: "700" }}>!</Text>
        ) : price !== null ? (
          <>
            <Text variant="headlineSmall" style={{ fontWeight: "700" }}>${price.toFixed(2)}</Text>
            {change !== null && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: isPositive ? theme.finance.gain : theme.finance.loss, marginTop: 2 }}>
                {isPositive ? "+" : ""}{change.toFixed(2)}%
              </Text>
            )}
          </>
        ) : (
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>---</Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 140 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  badge: { width: 20, height: 20, borderRadius: 4, alignItems: "center", justifyContent: "center" },
});
