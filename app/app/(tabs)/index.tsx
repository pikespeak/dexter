import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "../../components/SearchBar";
import WatchlistCard from "../../components/WatchlistCard";
import { useAppStore } from "../../lib/store";

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const watchlist = useAppStore((s) => s.watchlist);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSearch = useCallback(
    (query: string) => {
      addRecentSearch(query);
      router.push(`/ticker/${query}`);
    },
    [addRecentSearch, router]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="pt-2 pb-1 px-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Dexter
        </Text>
      </View>

      <SearchBar onSearch={handleSearch} />

      <ScrollView
        className="flex-1 mt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Watchlist */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white px-4 mb-3">
            {t("search.watchlist")}
          </Text>
          {watchlist.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {watchlist.map((ticker) => (
                <WatchlistCard
                  key={`${ticker}-${refreshKey}`}
                  ticker={ticker}
                  onPress={handleSearch}
                />
              ))}
            </ScrollView>
          ) : (
            <Text className="text-gray-400 px-4">
              {t("search.no_watchlist")}
            </Text>
          )}
        </View>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <View className="px-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("search.recent")}
              </Text>
              <Pressable onPress={clearRecentSearches}>
                <Text className="text-blue-500 text-sm">
                  {t("search.clear_recent")}
                </Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap">
              {recentSearches.map((search) => (
                <Pressable
                  key={search}
                  onPress={() => handleSearch(search)}
                  className="bg-white dark:bg-gray-800 rounded-full px-4 py-2 mr-2 mb-2 shadow-sm"
                >
                  <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                    {search}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
