import { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useAppStore } from "../../lib/store";
import { getHealth } from "../../lib/api-client";
import i18n from "../../i18n";
import { colors, fonts, spacing, radius } from "../../lib/theme";

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

  const statusColor = connectionStatus === "connected" ? colors.gain : connectionStatus === "failed" ? colors.loss : colors.textMuted;
  const statusText =
    connectionStatus === "testing" ? t("settings.testing")
    : connectionStatus === "connected" ? t("settings.connected")
    : connectionStatus === "failed" ? t("settings.disconnected")
    : "";

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>CONFIG</Text>
          <Text style={s.headerSub}>SYSTEM SETTINGS</Text>
        </View>

        {/* Server URL */}
        <View style={s.field}>
          <Text style={s.label}>{t("settings.server_url").toUpperCase()}</Text>
          <TextInput
            style={s.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder={t("settings.server_url_placeholder")}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {/* API Key */}
        <View style={s.field}>
          <Text style={s.label}>{t("settings.api_key").toUpperCase()}</Text>
          <View style={s.keyRow}>
            <TextInput
              style={s.keyInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t("settings.api_key_placeholder")}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowKey((v) => !v)} style={s.toggleBtn}>
              <Text style={s.toggleText}>{showKey ? "HIDE" : "SHOW"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Test Connection */}
        <Pressable onPress={testConnection} disabled={connectionStatus === "testing"} style={s.testBtn}>
          <Text style={s.testBtnText}>{t("settings.test_connection").toUpperCase()}</Text>
        </Pressable>
        {statusText !== "" && (
          <View style={[s.statusBadge, { borderColor: statusColor }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>{statusText.toUpperCase()}</Text>
          </View>
        )}

        {/* Divider */}
        <View style={s.divider} />

        {/* Language */}
        <View style={s.field}>
          <Text style={s.label}>{t("settings.language").toUpperCase()}</Text>
          <View style={s.langRow}>
            <Pressable onPress={() => handleLanguageChange("en")} style={[s.langBtn, language === "en" && s.langBtnActive]}>
              <Text style={[s.langText, language === "en" && s.langTextActive]}>EN</Text>
              <Text style={[s.langFull, language === "en" && s.langTextActive]}>{t("settings.english")}</Text>
            </Pressable>
            <Pressable onPress={() => handleLanguageChange("de")} style={[s.langBtn, language === "de" && s.langBtnActive]}>
              <Text style={[s.langText, language === "de" && s.langTextActive]}>DE</Text>
              <Text style={[s.langFull, language === "de" && s.langTextActive]}>{t("settings.german")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Onboarding Reset */}
        <Pressable onPress={handleResetOnboarding} style={s.linkBtn}>
          <Text style={s.linkText}>{t("settings.show_onboarding")} →</Text>
        </Pressable>

        {/* Version */}
        <View style={s.versionWrap}>
          <Text style={s.versionLabel}>VERSION</Text>
          <Text style={s.versionValue}>1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.md, marginBottom: spacing.xxl },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, letterSpacing: 4 },
  headerSub: { fontSize: 9, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 3, marginTop: 2 },
  field: { marginBottom: spacing.xl },
  label: { fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 3, marginBottom: spacing.sm },
  input: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.textPrimary, fontFamily: fonts.mono },
  keyRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm },
  keyInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.textPrimary, fontFamily: fonts.mono },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  toggleText: { fontSize: 10, fontFamily: fonts.mono, color: colors.accent, letterSpacing: 2 },
  testBtn: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.sm, paddingVertical: 16, alignItems: "center", marginBottom: spacing.md },
  testBtnText: { color: colors.accent, fontWeight: "700", fontSize: 12, letterSpacing: 3, fontFamily: fonts.mono },
  statusBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: radius.sm, paddingVertical: 8, marginBottom: spacing.xl },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statusText: { fontSize: 10, fontFamily: fonts.mono, letterSpacing: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl },
  langRow: { flexDirection: "row", gap: spacing.sm },
  langBtn: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, paddingVertical: 14, paddingHorizontal: 16 },
  langBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentSubtle },
  langText: { fontSize: 14, fontFamily: fonts.mono, fontWeight: "700", color: colors.textSecondary, marginRight: spacing.sm },
  langFull: { fontSize: 13, color: colors.textSecondary },
  langTextActive: { color: colors.accent },
  linkBtn: { paddingVertical: spacing.lg },
  linkText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
  versionWrap: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.lg },
  versionLabel: { fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 2 },
  versionValue: { fontSize: 12, fontFamily: fonts.mono, color: colors.textSecondary },
});
