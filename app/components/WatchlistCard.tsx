import { View, Text, Pressable, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getPriceSnapshot } from "../lib/api-client";
import { colors, fonts, spacing, radius } from "../lib/theme";

interface Props {
  ticker: string;
  onPress: (ticker: string) => void;
}

export default function WatchlistCard({ ticker, onPress }: Props) {
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
    <Pressable onPress={() => onPress(ticker)} style={s.card}>
      <View style={s.topRow}>
        <Text style={s.ticker}>{ticker}</Text>
        {change !== null && (
          <View style={[s.badge, isPositive ? s.badgeGain : s.badgeLoss]}>
            <Text style={[s.badgeText, { color: isPositive ? colors.gain : colors.loss }]}>
              {isPositive ? "▲" : "▼"}
            </Text>
          </View>
        )}
      </View>
      {error ? (
        <Text style={s.errorText}>!</Text>
      ) : price !== null ? (
        <>
          <Text style={s.price}>${price.toFixed(2)}</Text>
          {change !== null && (
            <Text style={[s.change, { color: isPositive ? colors.gain : colors.loss }]}>
              {isPositive ? "+" : ""}{change.toFixed(2)}%
            </Text>
          )}
        </>
      ) : (
        <Text style={s.loading}>---</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.md, padding: spacing.lg, marginRight: spacing.md, minWidth: 140 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  ticker: { fontSize: 15, fontFamily: fonts.mono, fontWeight: "700", color: colors.textPrimary, letterSpacing: 1 },
  badge: { width: 20, height: 20, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  badgeGain: { backgroundColor: colors.gainBg },
  badgeLoss: { backgroundColor: colors.lossBg },
  badgeText: { fontSize: 9, fontWeight: "700" },
  price: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, fontFamily: fonts.mono },
  change: { fontSize: 12, fontFamily: fonts.mono, fontWeight: "600", marginTop: 2 },
  loading: { fontSize: 16, fontFamily: fonts.mono, color: colors.textMuted, marginTop: spacing.xs },
  errorText: { fontSize: 16, color: colors.error, fontWeight: "700" },
});
