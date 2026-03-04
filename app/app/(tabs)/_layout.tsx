import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";
import { useAppTheme } from "../../lib/theme";

const TAB_ICONS: Record<string, string> = {
  index: "magnify",
  agent: "robot-outline",
  settings: "cog-outline",
};

export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarIcon: ({ focused, color }) => {
          const iconName = TAB_ICONS[route.name] || "help-circle-outline";
          return (
            <View style={[styles.iconWrap, focused && { backgroundColor: theme.colors.secondaryContainer }]}>
              <Icon source={iconName} size={22} color={color} />
            </View>
          );
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500" as const,
          letterSpacing: 0.5,
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.search") }} />
      <Tabs.Screen name="agent" options={{ title: t("tabs.agent") }} />
      <Tabs.Screen name="settings" options={{ title: t("tabs.settings") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
