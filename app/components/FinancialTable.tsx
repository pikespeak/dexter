import { View, Text, ScrollView } from "react-native";

interface Props {
  data: Record<string, string | number | null>[];
  columns: { key: string; label: string }[];
}

function formatValue(val: string | number | null): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return val.toFixed(2);
  }
  return String(val);
}

export default function FinancialTable({ data, columns }: Props) {
  if (data.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-gray-400 text-center">No data available</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Header */}
        <View className="flex-row bg-gray-100 dark:bg-gray-800 py-2 px-3 rounded-t-lg">
          {columns.map((col) => (
            <Text
              key={col.key}
              className="text-xs font-bold text-gray-500 dark:text-gray-400 w-28 text-right"
            >
              {col.label}
            </Text>
          ))}
        </View>
        {/* Rows */}
        {data.map((row, i) => (
          <View
            key={i}
            className={`flex-row py-2 px-3 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-850"}`}
          >
            {columns.map((col) => (
              <Text
                key={col.key}
                className="text-sm text-gray-700 dark:text-gray-300 w-28 text-right"
              >
                {formatValue(row[col.key])}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
