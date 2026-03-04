import { View, Text, Pressable, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getPriceSnapshot } from "../lib/api-client";

interface Props {
  ticker: string;
  onPress: (ticker: string) => void;
}

export default function WatchlistCard({ ticker, onPress }: Props) {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);

  useEffect(() => {
    getPriceSnapshot(ticker)
      .then((res) => {
        setPrice(res.data.price ?? res.data.close);
        setChange(res.data.change_percent ?? null);
      })
      .catch(() => {});
  }, [ticker]);

  return (
    <Pressable onPress={() => onPress(ticker)} style={s.card}>
      <Text style={s.ticker}>{ticker}</Text>
      {price !== null ? (
        <>
          <Text style={s.price}>${price.toFixed(2)}</Text>
          {change !== null && (
            <Text style={[s.change, { color: change >= 0 ? "#22c55e" : "#ef4444" }]}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </Text>
          )}
        </>
      ) : (
        <Text style={s.loading}>...</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginRight: 12, minWidth: 120, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  ticker: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  price: { fontSize: 18, fontWeight: "600", color: "#374151", marginTop: 4 },
  change: { fontSize: 14, fontWeight: "500", marginTop: 2 },
  loading: { fontSize: 14, color: "#9ca3af", marginTop: 4 },
});
