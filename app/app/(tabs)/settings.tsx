import { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { TextInput, Button, Chip, Divider, List, Switch, SegmentedButtons, Text } from "react-native-paper";
import { useAppStore } from "../../lib/store";
import { getHealth } from "../../lib/api-client";
import i18n from "../../i18n";
import { useAppTheme, spacing } from "../../lib/theme";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const serverUrl = useAppStore((s) => s.serverUrl);
  const apiKey = useAppStore((s) => s.apiKey);
  const language = useAppStore((s) => s.language);
  const setServerUrl = useAppStore((s) => s.setServerUrl);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const useMockData = useAppStore((s) => s.useMockData);
  const setUseMockData = useAppStore((s) => s.setUseMockData);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);

  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "connected" | "failed">("idle");

  const testConnection = useCallback(async () => {
    setConnectionStatus("testing");
    try {
      await getHealth(true);
      setConnectionStatus("connected");
    } catch {
      setConnectionStatus("failed");
    }
  }, []);

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang as "en" | "de");
      i18n.changeLanguage(lang);
    },
    [setLanguage]
  );

  const handleResetOnboarding = useCallback(() => {
    resetOnboarding();
    router.replace("/onboarding");
  }, [resetOnboarding, router]);

  const statusColor = connectionStatus === "connected" ? theme.finance.gain : connectionStatus === "failed" ? theme.finance.loss : theme.colors.onSurfaceVariant;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", letterSpacing: 4 }}>CONFIG</Text>
          <Text variant="labelSmall" style={{ letterSpacing: 3, color: theme.colors.onSurfaceVariant }}>
            SYSTEM SETTINGS
          </Text>
        </View>

        {/* Server URL */}
        <TextInput
          mode="outlined"
          label={t("settings.server_url")}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder={t("settings.server_url_placeholder")}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.field}
        />

        {/* API Key */}
        <TextInput
          mode="outlined"
          label={t("settings.api_key")}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder={t("settings.api_key_placeholder")}
          secureTextEntry={!showKey}
          autoCapitalize="none"
          autoCorrect={false}
          right={
            <TextInput.Icon
              icon={showKey ? "eye-off" : "eye"}
              onPress={() => setShowKey((v) => !v)}
            />
          }
          style={styles.field}
        />

        {/* Test Connection */}
        <Button
          mode="outlined"
          onPress={testConnection}
          loading={connectionStatus === "testing"}
          disabled={connectionStatus === "testing"}
          style={styles.testBtn}
        >
          {t("settings.test_connection").toUpperCase()}
        </Button>
        {connectionStatus !== "idle" && connectionStatus !== "testing" && (
          <Chip
            icon={connectionStatus === "connected" ? "check-circle" : "close-circle"}
            style={[styles.statusChip, { borderColor: statusColor }]}
            textStyle={{ color: statusColor }}
          >
            {connectionStatus === "connected" ? t("settings.connected").toUpperCase() : t("settings.disconnected").toUpperCase()}
          </Chip>
        )}

        {/* Demo Mode */}
        <List.Item
          title={t("settings.demo_mode")}
          description={t("settings.demo_mode_desc")}
          right={() => <Switch value={useMockData} onValueChange={setUseMockData} />}
          style={styles.field}
        />

        <Divider style={styles.divider} />

        {/* Language */}
        <Text variant="labelSmall" style={{ letterSpacing: 3, color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
          {t("settings.language").toUpperCase()}
        </Text>
        <SegmentedButtons
          value={language}
          onValueChange={handleLanguageChange}
          buttons={[
            { value: "en", label: `EN · ${t("settings.english")}` },
            { value: "de", label: `DE · ${t("settings.german")}` },
          ]}
          style={styles.field}
        />

        {/* Onboarding Reset */}
        <Button mode="text" onPress={handleResetOnboarding} style={styles.linkBtn}>
          {t("settings.show_onboarding")} →
        </Button>

        {/* Version */}
        <View style={[styles.versionWrap, { borderTopColor: theme.colors.outlineVariant }]}>
          <Text variant="labelSmall" style={{ letterSpacing: 2, color: theme.colors.onSurfaceVariant }}>VERSION</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.md, marginBottom: spacing.xxl },
  field: { marginBottom: spacing.xl },
  testBtn: { marginBottom: spacing.md },
  statusChip: { alignSelf: "center", marginBottom: spacing.xl },
  divider: { marginVertical: spacing.xl },
  linkBtn: { alignSelf: "flex-start", marginVertical: spacing.lg },
  versionWrap: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md, borderTopWidth: 1, marginTop: spacing.lg },
});
