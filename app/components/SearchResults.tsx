import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { SearchResult } from "../lib/types";
import { colors, fonts, spacing, radius, glassCard } from "../lib/theme";

interface Props {
  results: SearchResult[];
  loading: boolean;
  visible: boolean;
  onSelect: (ticker: string) => void;
}

export default function SearchResults({ results, loading, visible, onSelect }: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View style={s.container}>
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={s.loadingText}>{t("search.searching").toUpperCase()}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>{t("search.no_results")}</Text>
        </View>
      ) : (
        results.map((item, i) => (
          <Pressable
            key={`${item.ticker}-${i}`}
            onPress={() => onSelect(item.ticker)}
            style={({ pressed }) => [s.item, pressed && s.itemPressed]}
          >
            <View style={s.itemLeft}>
              <Text style={s.ticker}>{item.ticker}</Text>
              <Text style={s.exchange}>{item.exchange}</Text>
            </View>
            <View style={s.itemRight}>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              {item.sector ? <Text style={s.sector}>{item.sector}</Text> : null}
            </View>
            <Text style={s.arrow}>→</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    ...glassCard.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 10,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  emptyWrap: {
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemPressed: {
    backgroundColor: colors.glassHighlight,
  },
  itemLeft: {
    marginRight: spacing.md,
  },
  ticker: {
    fontSize: 14,
    fontFamily: fonts.mono,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1,
  },
  exchange: {
    fontSize: 9,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 1,
  },
  itemRight: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  sector: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  arrow: {
    color: colors.textMuted,
    fontSize: 14,
    marginLeft: spacing.sm,
  },
});
