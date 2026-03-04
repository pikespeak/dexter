import { View, Text, StyleSheet } from "react-native";
import type { PriceBar } from "../lib/types";

interface Props {
  data: PriceBar[];
  height?: number;
}

export default function PriceChart({ data, height = 150 }: Props) {
  if (data.length === 0) {
    return (
      <View style={[s.empty, { height }]}>
        <Text style={s.emptyText}>No chart data</Text>
      </View>
    );
  }

  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const isPositive = closes[closes.length - 1] >= closes[0];
  const color = isPositive ? "#22c55e" : "#ef4444";
  const barWidth = `${100 / data.length}%`;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={[s.chartContainer, { height }]}>
        {data.map((bar, i) => {
          const barHeight = ((bar.close - min) / range) * (height - 20) + 10;
          return (
            <View
              key={i}
              style={{ width: barWidth as unknown as number, height: barHeight, backgroundColor: color, opacity: 0.7 }}
            />
          );
        })}
      </View>
      <View style={s.labels}>
        <Text style={s.labelText}>{data[0]?.time?.slice(0, 10)}</Text>
        <Text style={s.labelText}>{data[data.length - 1]?.time?.slice(0, 10)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#9ca3af" },
  chartContainer: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#f9fafb", borderRadius: 12, overflow: "hidden" },
  labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 4 },
  labelText: { fontSize: 12, color: "#9ca3af" },
});
