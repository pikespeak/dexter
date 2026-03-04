import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import type { PriceBar } from "../lib/types";
import { useAppTheme, spacing } from "../lib/theme";

interface Props {
  data: PriceBar[];
  height?: number;
}

export default function PriceChart({ data, height = 160 }: Props) {
  const theme = useAppTheme();

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text variant="labelSmall" style={{ letterSpacing: 3, color: theme.colors.onSurfaceVariant }}>
          NO DATA
        </Text>
      </View>
    );
  }

  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const isPositive = closes[closes.length - 1] >= closes[0];
  const barColor = isPositive ? theme.finance.gain : theme.finance.loss;
  const barBgColor = isPositive ? theme.finance.gainBg : theme.finance.lossBg;

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <View style={styles.priceLabels}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>${max.toFixed(2)}</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>${min.toFixed(2)}</Text>
      </View>

      <View style={[styles.chartWrap, { height, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
        <View style={[styles.gridLine, { top: 0, backgroundColor: theme.colors.outlineVariant }]} />
        <View style={[styles.gridLine, { top: "25%", backgroundColor: theme.colors.outlineVariant }]} />
        <View style={[styles.gridLine, { top: "50%", backgroundColor: theme.colors.outlineVariant }]} />
        <View style={[styles.gridLine, { top: "75%", backgroundColor: theme.colors.outlineVariant }]} />
        <View style={[styles.gridLine, { bottom: 0, backgroundColor: theme.colors.outlineVariant }]} />

        <View style={styles.barContainer}>
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

      <View style={styles.dateRow}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{data[0]?.time?.slice(0, 10)}</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{data[data.length - 1]?.time?.slice(0, 10)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  priceLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  chartWrap: { borderWidth: 1, borderRadius: 8, overflow: "hidden", position: "relative" },
  gridLine: { position: "absolute", left: 0, right: 0, height: 1, opacity: 0.3 },
  barContainer: { flex: 1, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 2 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
});
