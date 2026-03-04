import { View, ScrollView, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Chip, Text, Button, ActivityIndicator } from "react-native-paper";
import SearchBar from "../../components/SearchBar";
import WatchlistCard from "../../components/WatchlistCard";
import { useAppStore } from "../../lib/store";
import { getCryptoTickers, getCryptoSnapshot } from "../../lib/api-client";
import type { CryptoSnapshot } from "../../lib/types";
import { useAppTheme, spacing } from "../../lib/theme";

export default function SearchScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const watchlist = useAppStore((s) => s.watchlist);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const isOnline = useAppStore((s) => s.isOnline);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [cryptoTickers, setCryptoTickers] = useState<string[]>([]);
  const [cryptoSnapshots, setCryptoSnapshots] = useState<Record<string, CryptoSnapshot>>({});
  const [cryptoLoading, setCryptoLoading] = useState(false);

  const handleSearch = useCallback(
    (query: string) => {
      addRecentSearch(query);
      router.push(`/ticker/${query}`);
    },
    [addRecentSearch, router]
  );

  const loadCrypto = useCallback(async () => {
    setCryptoLoading(true);
    try {
      const res = await getCryptoTickers({ limit: 10 });
      const tickers = res.data;
      setCryptoTickers(tickers);

      const snaps: Record<string, CryptoSnapshot> = {};
      const results = await Promise.allSettled(
        tickers.slice(0, 6).map((t) => getCryptoSnapshot(t))
      );
      results.forEach((r, i) => {
        if (r.status === "fulfilled") snaps[tickers[i]] = r.value.data;
      });
      setCryptoSnapshots(snaps);
    } catch {
      // silently fail
    } finally {
      setCryptoLoading(false);
    }
  }, []);

  useEffect(() => { loadCrypto(); }, [loadCrypto]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    loadCrypto();
    setTimeout(() => setRefreshing(false), 1000);
  }, [loadCrypto]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={{ fontWeight: "800", letterSpacing: 4 }}>DEXTER</Text>
          <Text variant="labelSmall" style={{ letterSpacing: 3, color: theme.colors.onSurfaceVariant }}>
            RESEARCH TERMINAL
          </Text>
        </View>
        <View style={styles.liveDot}>
          <View style={[styles.liveDotInner, { backgroundColor: isOnline ? theme.finance.gain : theme.finance.loss }]} />
          <Text variant="labelSmall" style={{ color: isOnline ? theme.finance.gain : theme.finance.loss, letterSpacing: 2 }}>
            {isOnline ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      <SearchBar onSearch={handleSearch} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Crypto Section */}
        {cryptoTickers.length > 0 && (
          <View style={styles.section}>
            <SectionHeader theme={theme} label={t("search.crypto")} />
            {cryptoLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
              >
                {cryptoTickers.slice(0, 6).map((ticker) => {
                  const snap = cryptoSnapshots[ticker];
                  return (
                    <Card key={ticker} mode="elevated" onPress={() => handleSearch(ticker)} style={{ marginRight: spacing.sm, minWidth: 100 }}>
                      <Card.Content style={{ alignItems: "center" }}>
                        <Text variant="labelMedium" style={{ fontWeight: "700", color: theme.colors.primary, letterSpacing: 1, marginBottom: spacing.xs }}>
                          {ticker}
                        </Text>
                        {snap ? (
                          <Text variant="titleSmall" style={{ fontWeight: "700" }}>${snap.price?.toFixed(2)}</Text>
                        ) : (
                          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>---</Text>
                        )}
                      </Card.Content>
                    </Card>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Watchlist */}
        <View style={styles.section}>
          <SectionHeader theme={theme} label={t("search.watchlist")} right={<Text variant="labelSmall">{watchlist.length}</Text>} />
          {watchlist.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
            >
              {watchlist.map((ticker) => (
                <WatchlistCard key={`${ticker}-${refreshKey}`} ticker={ticker} onPress={handleSearch} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 32, color: theme.colors.outlineVariant, marginBottom: spacing.sm }}>◇</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t("search.no_watchlist")}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs, opacity: 0.7 }}>
                {t("search.add_first_stock")}
              </Text>
            </View>
          )}
        </View>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              theme={theme}
              label={t("search.recent")}
              right={
                <Button mode="text" onPress={clearRecentSearches} compact>
                  {t("search.clear_recent").toUpperCase()}
                </Button>
              }
            />
            <View style={styles.chips}>
              {recentSearches.map((search) => (
                <Chip
                  key={search}
                  mode="outlined"
                  onPress={() => handleSearch(search)}
                  style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}
                >
                  {search}
                </Chip>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ theme, label, right }: { theme: ReturnType<typeof useAppTheme>; label: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLabelWrap}>
        <View style={[styles.sectionDot, { backgroundColor: theme.colors.primary }]} />
        <Text variant="labelSmall" style={{ letterSpacing: 3, color: theme.colors.onSurfaceVariant }}>
          {label.toUpperCase()}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  liveDot: { flexDirection: "row", alignItems: "center" },
  liveDotInner: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  scroll: { flex: 1, marginTop: spacing.md },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionLabelWrap: { flexDirection: "row", alignItems: "center" },
  sectionDot: { width: 3, height: 3, marginRight: spacing.sm },
  emptyWrap: { alignItems: "center", paddingVertical: spacing.xxxl },
  chips: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg },
  loadingWrap: { padding: spacing.lg, alignItems: "center" },
});
