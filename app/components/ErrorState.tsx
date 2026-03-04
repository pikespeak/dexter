import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Icon, Text } from "react-native-paper";
import { useAppTheme, spacing } from "../lib/theme";

interface Props {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export default function ErrorState({ message, onRetry, compact }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }]}>
        <Icon source="alert-circle" size={16} color={theme.colors.error} />
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ flex: 1, marginLeft: spacing.sm, color: theme.colors.onErrorContainer }}
        >
          {message || t("common.error")}
        </Text>
        {onRetry && (
          <Button mode="text" onPress={onRetry} compact>
            {t("common.retry").toUpperCase()}
          </Button>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Icon source="alert-circle-outline" size={32} color={theme.colors.error} />
      <Text variant="bodyMedium" style={{ textAlign: "center", marginVertical: spacing.md, color: theme.colors.onSurfaceVariant }}>
        {message || t("common.error")}
      </Text>
      {onRetry && (
        <Button mode="outlined" onPress={onRetry}>
          {t("common.retry").toUpperCase()}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
});
