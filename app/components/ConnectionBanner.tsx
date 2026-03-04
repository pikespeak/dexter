import { StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Banner, Text } from "react-native-paper";
import { useAppStore } from "../lib/store";
import { useAppTheme, spacing } from "../lib/theme";

export default function ConnectionBanner() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isOnline = useAppStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
      <Banner
        visible
        icon="wifi-off"
        style={{ backgroundColor: theme.colors.errorContainer }}
      >
        <Text style={{ color: theme.colors.onErrorContainer, letterSpacing: 2, fontWeight: "700", fontSize: 11 }}>
          {t("connection.offline").toUpperCase()}
        </Text>
      </Banner>
    </Animated.View>
  );
}
