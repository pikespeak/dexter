import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "../../components/SearchBar";
import WatchlistCard from "../../components/WatchlistCard";
import GlassCard from "../../components/GlassCard";
import { useAppStore } from "../../lib/store";
import { getCryptoTickers, getCryptoSnapshot } from "../../lib/api-client";
import type { CryptoSnapshot } from "../../lib/types";
import { colors, fonts, spacing, radius } from "../../lib/theme";

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const watchlist = useAppStore((s) => s.watchlist);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const isOnline = useAppStore((s) => s.isOnline);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Crypto state
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
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.brand}>DEXTER</Text>
          <Text style={s.brandSub}>RESEARCH TERMINAL</Text>
        </View>
        <View style={s.liveDot}>
          <View style={[s.liveDotInner, !isOnline && s.liveDotOffline]} />
          <Text style={[s.liveText, !isOnline && s.liveTextOffline]}>
            {isOnline ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      <SearchBar onSearch={handleSearch} />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Crypto Section */}
        {cryptoTickers.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionLabelWrap}>
                <View style={s.sectionDot} />
                <Text style={s.sectionLabel}>{t("search.crypto").toUpperCase()}</Text>
              </View>
            </View>
            {cryptoLoading ? (
              <View style={s.cryptoLoading}>
                <ActivityIndicator size="small" color={colors.accent} />
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
                    <Pressable key={ticker} onPress={() => handleSearch(ticker)} style={s.cryptoCard}>
                      <Text style={s.cryptoTicker}>{ticker}</Text>
                      {snap ? (
                        <Text style={s.cryptoPrice}>${snap.price?.toFixed(2)}</Text>
                      ) : (
                        <Text style={s.cryptoLoading}>---</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Watchlist */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionLabelWrap}>
              <View style={s.sectionDot} />
              <Text style={s.sectionLabel}>{t("search.watchlist").toUpperCase()}</Text>
            </View>
            <Text style={s.sectionCount}>{watchlist.length}</Text>
          </View>

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
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>◇</Text>
              <Text style={s.emptyText}>{t("search.no_watchlist")}</Text>
              <Text style={s.emptyHint}>{t("search.add_first_stock")}</Text>
            </View>
          )}
        </View>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionLabelWrap}>
                <View style={s.sectionDot} />
                <Text style={s.sectionLabel}>{t("search.recent").toUpperCase()}</Text>
              </View>
              <Pressable onPress={clearRecentSearches}>
                <Text style={s.clearText}>{t("search.clear_recent").toUpperCase()}</Text>
              </Pressable>
            </View>
            <View style={s.chips}>
              {recentSearches.map((search) => (
                <Pressable key={search} onPress={() => handleSearch(search)} style={s.chip}>
                  <Text style={s.chipText}>{search}</Text>
                  <Text style={s.chipArrow}>→</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  brand: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, letterSpacing: 4 },
  brandSub: { fontSize: 9, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 3, marginTop: 2 },
  liveDot: { flexDirection: "row", alignItems: "center" },
  liveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gain, marginRight: 6 },
  liveDotOffline: { backgroundColor: colors.loss },
  liveText: { fontSize: 10, fontFamily: fonts.mono, color: colors.gain, letterSpacing: 2 },
  liveTextOffline: { color: colors.loss },
  scroll: { flex: 1, marginTop: spacing.md },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionLabelWrap: { flexDirection: "row", alignItems: "center" },
  sectionDot: { width: 3, height: 3, backgroundColor: colors.accent, marginRight: spacing.sm },
  sectionLabel: { fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 3 },
  sectionCount: { fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted },
  emptyWrap: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyIcon: { fontSize: 32, color: colors.border, marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
  emptyHint: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body, marginTop: spacing.xs, opacity: 0.7 },
  clearText: { fontSize: 10, fontFamily: fonts.mono, color: colors.accent, letterSpacing: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10, marginRight: spacing.sm, marginBottom: spacing.sm },
  chipText: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.mono, letterSpacing: 1 },
  chipArrow: { color: colors.textMuted, marginLeft: spacing.sm, fontSize: 12 },
  cryptoCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.md, padding: spacing.md, marginRight: spacing.sm, minWidth: 100, alignItems: "center" },
  cryptoTicker: { fontSize: 12, fontFamily: fonts.mono, fontWeight: "700", color: colors.accent, letterSpacing: 1, marginBottom: spacing.xs },
  cryptoPrice: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, fontFamily: fonts.mono },
  cryptoLoading: { fontSize: 13, fontFamily: fonts.mono, color: colors.textMuted, padding: spacing.lg, textAlign: "center" },
});
