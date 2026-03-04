import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
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
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "connected" | "failed"
  >("idle");

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
    connectionStatus === "connected"
      ? "text-green-500"
      : connectionStatus === "failed"
        ? "text-red-500"
        : "text-gray-400";

  const statusText =
    connectionStatus === "testing"
      ? t("settings.testing")
      : connectionStatus === "connected"
        ? t("settings.connected")
        : connectionStatus === "failed"
          ? t("settings.disconnected")
          : "";

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t("settings.title")}
        </Text>

        {/* Server URL */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
            {t("settings.server_url")}
          </Text>
          <TextInput
            className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white"
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder={t("settings.server_url_placeholder")}
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {/* API Key */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
            {t("settings.api_key")}
          </Text>
          <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-4">
            <TextInput
              className="flex-1 py-3 text-base text-gray-900 dark:text-white"
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t("settings.api_key_placeholder")}
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowKey((s) => !s)}>
              <Text className="text-blue-500 text-sm font-medium">
                {showKey ? "🙈" : "👁"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Test Connection */}
        <Pressable
          onPress={testConnection}
          disabled={connectionStatus === "testing"}
          className="bg-blue-500 rounded-xl py-3 items-center mb-2"
        >
          <Text className="text-white font-semibold text-base">
            {t("settings.test_connection")}
          </Text>
        </Pressable>
        {statusText && (
          <Text className={`text-center text-sm font-medium mb-6 ${statusColor}`}>
            {statusText}
          </Text>
        )}

        {/* Language */}
        <View className="mb-6 mt-4">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
            {t("settings.language")}
          </Text>
          <View className="flex-row">
            <Pressable
              onPress={() => handleLanguageChange("en")}
              className={`flex-1 py-3 rounded-l-xl items-center ${
                language === "en"
                  ? "bg-blue-500"
                  : "bg-white dark:bg-gray-800"
              }`}
            >
              <Text
                className={`font-semibold ${
                  language === "en"
                    ? "text-white"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {t("settings.english")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleLanguageChange("de")}
              className={`flex-1 py-3 rounded-r-xl items-center ${
                language === "de"
                  ? "bg-blue-500"
                  : "bg-white dark:bg-gray-800"
              }`}
            >
              <Text
                className={`font-semibold ${
                  language === "de"
                    ? "text-white"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {t("settings.german")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Show Onboarding */}
        <Pressable
          onPress={handleResetOnboarding}
          className="py-3 items-center mb-6"
        >
          <Text className="text-blue-500 text-base">
            {t("settings.show_onboarding")}
          </Text>
        </Pressable>

        {/* App Version */}
        <Text className="text-center text-gray-400 text-sm mb-8">
          {t("settings.app_version")}: 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
