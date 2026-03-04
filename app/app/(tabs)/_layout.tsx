import { Text, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors, fonts } from "../../lib/theme";

function TabIcon({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={ti.wrap}>
      <Text style={[ti.label, active && ti.labelActive]}>{label}</Text>
      {active && <View style={ti.indicator} />}
    </View>
  );
}

const ti = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 4 },
  label: { fontSize: 10, fontFamily: fonts.mono, color: colors.tabInactive, letterSpacing: 2, textTransform: "uppercase" },
  labelActive: { color: colors.accent },
  indicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 4 },
});

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: { display: "none" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.search"),
          tabBarIcon: ({ focused }) => <TabIcon label="SEARCH" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: t("tabs.agent"),
          tabBarIcon: ({ focused }) => <TabIcon label="AGENT" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ focused }) => <TabIcon label="CONFIG" active={focused} />,
        }}
      />
    </Tabs>
  );
}
