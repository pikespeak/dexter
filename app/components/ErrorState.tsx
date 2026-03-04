import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, fonts, spacing, radius } from "../lib/theme";

interface Props {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export default function ErrorState({ message, onRetry, compact }: Props) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <View style={s.compactContainer}>
        <Text style={s.compactIcon}>!</Text>
        <Text style={s.compactMessage} numberOfLines={1}>
          {message || t("common.error")}
        </Text>
        {onRetry && (
          <Pressable onPress={onRetry} style={s.compactRetry}>
            <Text style={s.compactRetryText}>{t("common.retry").toUpperCase()}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.icon}>!</Text>
      <Text style={s.message}>{message || t("common.error")}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={s.retryBtn}>
          <Text style={s.retryText}>{t("common.retry").toUpperCase()}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    fontSize: 28,
    color: colors.error,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: fonts.mono,
    fontWeight: "700",
    letterSpacing: 2,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.lossBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  compactIcon: {
    fontSize: 14,
    color: colors.error,
    fontWeight: "800",
    marginRight: spacing.sm,
  },
  compactMessage: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  compactRetry: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  compactRetryText: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: fonts.mono,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
