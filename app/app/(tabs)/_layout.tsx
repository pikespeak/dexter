import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#f3f4f6",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.search"),
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🔍" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: t("tabs.agent"),
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🤖" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color }) => (
            <TabIcon icon="⚙️" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

import { Text } from "react-native";

function TabIcon({ icon }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
