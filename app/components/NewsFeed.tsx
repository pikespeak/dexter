import { View, Linking, StyleSheet } from "react-native";
import { List, Divider, Text } from "react-native-paper";
import type { NewsArticle } from "../lib/types";
import { useAppTheme, spacing } from "../lib/theme";

interface Props {
  articles: NewsArticle[];
}

export default function NewsFeed({ articles }: Props) {
  const theme = useAppTheme();

  if (articles.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="labelSmall" style={{ letterSpacing: 2, color: theme.colors.onSurfaceVariant }}>
          NO NEWS AVAILABLE
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      {articles.map((article, i) => (
        <View key={i}>
          <List.Item
            title={article.title}
            titleNumberOfLines={2}
            titleStyle={{ fontSize: 15, fontWeight: "600", lineHeight: 22 }}
            description={`${article.source?.toUpperCase() || ""} · ${article.published_at?.slice(0, 10) || ""}`}
            descriptionStyle={{ color: theme.colors.primary, letterSpacing: 1, fontSize: 11 }}
            onPress={() => Linking.openURL(article.url)}
            style={{ paddingHorizontal: 0 }}
          />
          {i < articles.length - 1 && <Divider />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: spacing.xl, alignItems: "center" },
});
