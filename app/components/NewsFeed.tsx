import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import type { NewsArticle } from "../lib/types";

interface Props {
  articles: NewsArticle[];
}

export default function NewsFeed({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>No news available</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {articles.map((article, i) => (
        <Pressable key={i} onPress={() => Linking.openURL(article.url)} style={s.item}>
          <Text style={s.title}>{article.title}</Text>
          {article.description && (
            <Text style={s.desc} numberOfLines={2}>{article.description}</Text>
          )}
          <Text style={s.meta}>{article.source} · {article.published_at?.slice(0, 10)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  empty: { padding: 16 },
  emptyText: { color: "#9ca3af", textAlign: "center" },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 16, fontWeight: "600", color: "#111827" },
  desc: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  meta: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
});
