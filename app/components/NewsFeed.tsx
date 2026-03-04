import { View, Text, Pressable, Linking } from "react-native";
import type { NewsArticle } from "../lib/types";

interface Props {
  articles: NewsArticle[];
}

export default function NewsFeed({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-gray-400 text-center">No news available</Text>
      </View>
    );
  }

  return (
    <View className="px-4">
      {articles.map((article, i) => (
        <Pressable
          key={i}
          onPress={() => Linking.openURL(article.url)}
          className="py-3 border-b border-gray-100 dark:border-gray-800"
        >
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {article.title}
          </Text>
          {article.description && (
            <Text
              className="text-sm text-gray-500 dark:text-gray-400 mt-1"
              numberOfLines={2}
            >
              {article.description}
            </Text>
          )}
          <View className="flex-row mt-1">
            <Text className="text-xs text-gray-400">
              {article.source} · {article.published_at?.slice(0, 10)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
