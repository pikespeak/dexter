import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import type { NewsArticle } from "../lib/types";
import { colors, fonts, spacing } from "../lib/theme";

interface Props {
  articles: NewsArticle[];
}

export default function NewsFeed({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>NO NEWS AVAILABLE</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      {articles.map((article, i) => (
        <Pressable key={i} onPress={() => Linking.openURL(article.url)} style={s.item}>
          <View style={s.itemHeader}>
            <Text style={s.source}>{article.source?.toUpperCase()}</Text>
            <Text style={s.date}>{article.published_at?.slice(0, 10)}</Text>
          </View>
          <Text style={s.title}>{article.title}</Text>
          {article.description && (
            <Text style={s.desc} numberOfLines={2}>{article.description}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  empty: { padding: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: "center", fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  source: { fontSize: 10, fontFamily: fonts.mono, color: colors.accent, letterSpacing: 1 },
  date: { fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted },
  title: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, lineHeight: 22 },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
});
