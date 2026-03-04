import { View, Text } from "react-native";
import type { PriceBar } from "../lib/types";

interface Props {
  data: PriceBar[];
  height?: number;
}

export default function PriceChart({ data, height = 150 }: Props) {
  if (data.length === 0) {
    return (
      <View className="items-center justify-center" style={{ height }}>
        <Text className="text-gray-400">No chart data</Text>
      </View>
    );
  }

  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const isPositive = closes[closes.length - 1] >= closes[0];
  const color = isPositive ? "#22c55e" : "#ef4444";

  // Simple sparkline using blocks
  const barWidth = 100 / data.length;

  return (
    <View className="px-4">
      <View
        className="flex-row items-end bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden"
        style={{ height }}
      >
        {data.map((bar, i) => {
          const barHeight = ((bar.close - min) / range) * (height - 20) + 10;
          return (
            <View
              key={i}
              style={{
                width: `${barWidth}%`,
                height: barHeight,
                backgroundColor: color,
                opacity: 0.7,
              }}
            />
          );
        })}
      </View>
      <View className="flex-row justify-between mt-2 px-1">
        <Text className="text-xs text-gray-400">
          {data[0]?.time?.slice(0, 10)}
        </Text>
        <Text className="text-xs text-gray-400">
          {data[data.length - 1]?.time?.slice(0, 10)}
        </Text>
      </View>
    </View>
  );
}
