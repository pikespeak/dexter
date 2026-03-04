import { Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../lib/store";
import { colors, fonts, spacing } from "../lib/theme";

export default function ConnectionBanner() {
  const { t } = useTranslation();
  const isOnline = useAppStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={s.banner}>
      <Text style={s.text}>{t("connection.offline").toUpperCase()}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: colors.lossBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lossBorder,
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  text: {
    fontSize: 10,
    fontFamily: fonts.mono,
    color: colors.loss,
    letterSpacing: 3,
    fontWeight: "700",
  },
});
