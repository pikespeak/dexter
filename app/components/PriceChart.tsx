import { View, Text, StyleSheet } from "react-native";
import type { PriceBar } from "../lib/types";
import { colors, fonts, spacing, radius } from "../lib/theme";

interface Props {
  data: PriceBar[];
  height?: number;
}

export default function PriceChart({ data, height = 160 }: Props) {
  if (data.length === 0) {
    return (
      <View style={[s.empty, { height }]}>
        <Text style={s.emptyText}>NO DATA</Text>
      </View>
    );
  }

  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const isPositive = closes[closes.length - 1] >= closes[0];
  const barColor = isPositive ? colors.gain : colors.loss;
  const barBgColor = isPositive ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 23, 68, 0.15)";

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <View style={s.priceLabels}>
        <Text style={s.priceLabel}>${max.toFixed(2)}</Text>
        <Text style={s.priceLabel}>${min.toFixed(2)}</Text>
      </View>

      <View style={[s.chartWrap, { height }]}>
        <View style={[s.gridLine, { top: 0 }]} />
        <View style={[s.gridLine, { top: "25%" }]} />
        <View style={[s.gridLine, { top: "50%" }]} />
        <View style={[s.gridLine, { top: "75%" }]} />
        <View style={[s.gridLine, { bottom: 0 }]} />

        <View style={s.barContainer}>
          {data.map((bar, i) => {
            const barHeight = ((bar.close - min) / range) * (height - 16) + 8;
            const w = Math.max(100 / data.length - 0.5, 1);
            return (
              <View key={i} style={{ width: `${w}%`, alignItems: "center" }}>
                <View
                  style={{
                    width: "70%",
                    height: barHeight,
                    backgroundColor: i === data.length - 1 ? barColor : barBgColor,
                    borderTopLeftRadius: 1,
                    borderTopRightRadius: 1,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={s.dateRow}>
        <Text style={s.dateText}>{data[0]?.time?.slice(0, 10)}</Text>
        <Text style={s.dateText}>{data[data.length - 1]?.time?.slice(0, 10)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 3 },
  priceLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  priceLabel: { fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted },
  chartWrap: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, overflow: "hidden", position: "relative" },
  gridLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.03)" },
  barContainer: { flex: 1, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 2 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  dateText: { fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted },
});
