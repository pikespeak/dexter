import { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useAppStore } from "../../lib/store";
import { getHealth } from "../../lib/api-client";
import i18n from "../../i18n";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const serverUrl = useAppStore((s) => s.serverUrl);
  const apiKey = useAppStore((s) => s.apiKey);
  const language = useAppStore((s) => s.language);
  const setServerUrl = useAppStore((s) => s.setServerUrl);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const setLanguage = useAppStore((s) => s.setLanguage);
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
    (lang: "en" | "de") => {
      setLanguage(lang);
      i18n.changeLanguage(lang);
    },
    [setLanguage]
  );

  const handleResetOnboarding = useCallback(() => {
    resetOnboarding();
    router.replace("/onboarding");
  }, [resetOnboarding, router]);

  const statusColor =
    connectionStatus === "connected" ? "#22c55e" : connectionStatus === "failed" ? "#ef4444" : "#9ca3af";
  const statusText =
    connectionStatus === "testing" ? t("settings.testing")
    : connectionStatus === "connected" ? t("settings.connected")
    : connectionStatus === "failed" ? t("settings.disconnected")
    : "";

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll}>
        <Text style={s.title}>{t("settings.title")}</Text>

        <View style={s.field}>
          <Text style={s.label}>{t("settings.server_url")}</Text>
          <TextInput
            style={s.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder={t("settings.server_url_placeholder")}
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>{t("settings.api_key")}</Text>
          <View style={s.keyRow}>
            <TextInput
              style={s.keyInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t("settings.api_key_placeholder")}
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowKey((v) => !v)}>
              <Text style={{ fontSize: 18 }}>{showKey ? "🙈" : "👁"}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={testConnection} disabled={connectionStatus === "testing"} style={s.testBtn}>
          <Text style={s.testBtnText}>{t("settings.test_connection")}</Text>
        </Pressable>
        {statusText !== "" && (
          <Text style={[s.statusText, { color: statusColor }]}>{statusText}</Text>
        )}

        <View style={[s.field, { marginTop: 24 }]}>
          <Text style={s.label}>{t("settings.language")}</Text>
          <View style={s.langRow}>
            <Pressable onPress={() => handleLanguageChange("en")} style={[s.langBtn, s.langBtnLeft, language === "en" && s.langBtnActive]}>
              <Text style={[s.langText, language === "en" && s.langTextActive]}>{t("settings.english")}</Text>
            </Pressable>
            <Pressable onPress={() => handleLanguageChange("de")} style={[s.langBtn, s.langBtnRight, language === "de" && s.langBtnActive]}>
              <Text style={[s.langText, language === "de" && s.langTextActive]}>{t("settings.german")}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={handleResetOnboarding} style={s.linkBtn}>
          <Text style={s.linkText}>{t("settings.show_onboarding")}</Text>
        </Pressable>

        <Text style={s.version}>{t("settings.app_version")}: 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827", marginBottom: 24 },
  field: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 8, textTransform: "uppercase" },
  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: "#111827" },
  keyRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16 },
  keyInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: "#111827" },
  testBtn: { backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 8 },
  testBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  statusText: { textAlign: "center", fontSize: 14, fontWeight: "500", marginBottom: 24 },
  langRow: { flexDirection: "row" },
  langBtn: { flex: 1, paddingVertical: 14, alignItems: "center", backgroundColor: "#fff" },
  langBtnLeft: { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  langBtnRight: { borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  langBtnActive: { backgroundColor: "#2563eb" },
  langText: { fontWeight: "600", color: "#374151" },
  langTextActive: { color: "#fff" },
  linkBtn: { paddingVertical: 14, alignItems: "center", marginBottom: 24 },
  linkText: { color: "#2563eb", fontSize: 16 },
  version: { textAlign: "center", color: "#9ca3af", fontSize: 14, marginBottom: 32 },
});
