import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from "react-native";
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
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Dexter</Text>
      </View>

      <SearchBar onSearch={handleSearch} />

      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("search.watchlist")}</Text>
          {watchlist.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {watchlist.map((ticker) => (
                <WatchlistCard key={`${ticker}-${refreshKey}`} ticker={ticker} onPress={handleSearch} />
              ))}
            </ScrollView>
          ) : (
            <Text style={s.emptyText}>{t("search.no_watchlist")}</Text>
          )}
        </View>

        {recentSearches.length > 0 && (
          <View style={s.recentSection}>
            <View style={s.recentHeader}>
              <Text style={s.sectionTitle}>{t("search.recent")}</Text>
              <Pressable onPress={clearRecentSearches}>
                <Text style={s.clearText}>{t("search.clear_recent")}</Text>
              </Pressable>
            </View>
            <View style={s.chips}>
              {recentSearches.map((search) => (
                <Pressable key={search} onPress={() => handleSearch(search)} style={s.chip}>
                  <Text style={s.chipText}>{search}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { paddingTop: 8, paddingBottom: 4, paddingHorizontal: 16 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  scroll: { flex: 1, marginTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", paddingHorizontal: 16, marginBottom: 12 },
  emptyText: { color: "#9ca3af", paddingHorizontal: 16 },
  recentSection: { paddingHorizontal: 16 },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  clearText: { color: "#2563eb", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  chipText: { color: "#374151", fontSize: 14, fontWeight: "500" },
});
