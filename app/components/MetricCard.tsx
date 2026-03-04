import { View, Text } from "react-native";

interface Props {
  label: string;
  value: string | number | null | undefined;
}

export default function MetricCard({ label, value }: Props) {
  const formatted =
    value === null || value === undefined
      ? "—"
      : typeof value === "number"
        ? value >= 1e9
          ? `$${(value / 1e9).toFixed(1)}B`
          : value >= 1e6
            ? `$${(value / 1e6).toFixed(1)}M`
            : typeof value === "number" && !label.toLowerCase().includes("cap")
              ? value.toFixed(2)
              : `$${value.toLocaleString()}`
        : String(value);

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-3 flex-1 min-w-[45%] m-1 shadow-sm">
      <Text className="text-xs text-gray-500 dark:text-gray-400 uppercase">
        {label}
      </Text>
      <Text className="text-lg font-bold text-gray-900 dark:text-white mt-1">
        {formatted}
      </Text>
    </View>
  );
}
