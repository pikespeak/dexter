import { View, Text, Pressable } from "react-native";
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

  const changeColor =
    change !== null && change >= 0 ? "text-green-500" : "text-red-500";

  return (
    <Pressable
      onPress={() => onPress(ticker)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mr-3 min-w-[120px] shadow-sm"
    >
      <Text className="text-base font-bold text-gray-900 dark:text-white">
        {ticker}
      </Text>
      {price !== null ? (
        <>
          <Text className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-1">
            ${price.toFixed(2)}
          </Text>
          {change !== null && (
            <Text className={`text-sm font-medium mt-0.5 ${changeColor}`}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </Text>
          )}
        </>
      ) : (
        <Text className="text-sm text-gray-400 mt-1">...</Text>
      )}
    </Pressable>
  );
}
