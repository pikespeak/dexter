import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Surface, List, Divider, Text, ActivityIndicator } from "react-native-paper";
import type { SearchResult } from "../lib/types";
import { useAppTheme, spacing } from "../lib/theme";

interface Props {
  results: SearchResult[];
  loading: boolean;
  visible: boolean;
  onSelect: (ticker: string) => void;
}

export default function SearchResults({ results, loading, visible, onSelect }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  if (!visible) return null;

  return (
    <Surface style={[styles.container, { borderColor: theme.colors.outlineVariant }]} elevation={2}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
          <Text variant="labelSmall" style={{ marginTop: spacing.sm, letterSpacing: 2 }}>
            {t("search.searching").toUpperCase()}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("search.no_results")}
          </Text>
        </View>
      ) : (
        results.map((item, i) => (
          <View key={`${item.ticker}-${i}`}>
            <List.Item
              title={item.ticker}
              titleStyle={{ fontWeight: "700", color: theme.colors.primary, letterSpacing: 1 }}
              description={`${item.name}${item.sector ? ` · ${item.sector}` : ""}`}
              descriptionNumberOfLines={1}
              right={() => (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, alignSelf: "center" }}>
                  {item.exchange}
                </Text>
              )}
              onPress={() => onSelect(item.ticker)}
            />
            {i < results.length - 1 && <Divider />}
          </View>
        ))
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  center: {
    padding: spacing.lg,
    alignItems: "center",
  },
});
