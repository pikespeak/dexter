import { useState, useRef, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AgentMessage from "../../components/AgentMessage";
import { queryAgent } from "../../lib/sse-client";
import { useAppStore } from "../../lib/store";
import type { ChatMessage } from "../../lib/types";
import { colors, fonts, spacing, radius } from "../../lib/theme";

const SUGGESTIONS = [
  "What is Apple's P/E ratio?",
  "Compare MSFT vs GOOG revenue",
  "Summarize Tesla's latest filing",
  "Top dividend stocks in S&P 500",
];

export default function AgentScreen() {
  const { t } = useTranslation();
  const messages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const clearChat = useAppStore((s) => s.clearChat);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>("");

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const addMessage = useCallback(
    (msg: ChatMessage) => {
      addChatMessage(msg);
      scrollToEnd();
    },
    [addChatMessage, scrollToEnd]
  );

  const sendQuery = useCallback(async (query: string) => {
    if (!query || isStreaming) return;

    lastQueryRef.current = query;
    setInput("");
    addMessage({ id: Date.now().toString(), type: "user", content: query, timestamp: Date.now() });

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of queryAgent(query, { signal: controller.signal })) {
        if (event.type === "ping") continue;
        if (event.type === "thinking") {
          addMessage({ id: `thinking-${Date.now()}`, type: "thinking", content: t("agent.thinking"), timestamp: Date.now() });
        } else if (event.type === "tool_start") {
          addMessage({ id: `tool-${Date.now()}`, type: "tool", content: "", toolName: event.toolName || "Tool", timestamp: Date.now() });
        } else if (event.type === "tool_end") {
          const result = typeof event.data?.result === "string" ? event.data.result : JSON.stringify(event.data?.result ?? "");
          addMessage({ id: `tool-end-${Date.now()}`, type: "tool", content: String(result), toolName: event.toolName || "Result", timestamp: Date.now() });
        } else if (event.type === "done") {
          const answer = event.answer || (typeof event.data?.answer === "string" ? event.data.answer : "") || JSON.stringify(event.data ?? "");
          addMessage({ id: `answer-${Date.now()}`, type: "answer", content: answer, timestamp: Date.now() });
        } else if (event.type === "error") {
          addMessage({ id: `error-${Date.now()}`, type: "error", content: event.error || t("agent.error"), timestamp: Date.now() });
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        addMessage({ id: `error-${Date.now()}`, type: "error", content: t("agent.error"), timestamp: Date.now() });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, addMessage, t]);

  const handleSend = useCallback(() => {
    sendQuery(input.trim());
  }, [input, sendQuery]);

  const handleRetry = useCallback(() => {
    if (lastQueryRef.current) {
      sendQuery(lastQueryRef.current);
    }
  }, [sendQuery]);

  const handleSuggestion = useCallback((suggestion: string) => {
    sendQuery(suggestion);
  }, [sendQuery]);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>AI AGENT</Text>
          <Text style={s.headerSub}>RESEARCH ASSISTANT</Text>
        </View>
        <View style={s.headerRight}>
          {messages.length > 0 && !isStreaming && (
            <Pressable onPress={clearChat} style={s.clearBtn}>
              <Text style={s.clearText}>{t("agent.clear_chat").toUpperCase()}</Text>
            </Pressable>
          )}
          {isStreaming && (
            <View style={s.streamingBadge}>
              <View style={s.streamingDot} />
              <Text style={s.streamingText}>STREAMING</Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesContent} onContentSizeChange={scrollToEnd}>
          {messages.length === 0 && (
            <View style={s.welcome}>
              <Text style={s.welcomeIcon}>▲</Text>
              <Text style={s.welcomeTitle}>RESEARCH AGENT</Text>
              <View style={s.welcomeDivider} />
              <Text style={s.welcomeText}>{t("agent.welcome")}</Text>

              {/* Suggestion chips */}
              <View style={s.suggestionsWrap}>
                <Text style={s.suggestionsLabel}>{t("agent.suggestions").toUpperCase()}</Text>
                {SUGGESTIONS.map((s_text) => (
                  <Pressable key={s_text} onPress={() => handleSuggestion(s_text)} style={s.suggestionChip}>
                    <Text style={s.suggestionText}>{s_text}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {messages.map((msg) => (
            <AgentMessage
              key={msg.id}
              type={msg.type}
              content={msg.content}
              toolName={msg.toolName}
              onRetry={msg.type === "error" ? handleRetry : undefined}
            />
          ))}
          {isStreaming && (
            <View style={s.typingWrap}>
              <Text style={s.typingDots}>◆ ◆ ◆</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder={t("agent.placeholder")}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={handleSend}
            editable={!isStreaming}
          />
          <Pressable
            onPress={handleSend}
            disabled={isStreaming || !input.trim()}
            style={[s.sendBtn, (isStreaming || !input.trim()) ? s.sendDisabled : s.sendActive]}
          >
            <Text style={s.sendIcon}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary, letterSpacing: 3 },
  headerSub: { fontSize: 9, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 3, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  clearBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  clearText: { fontSize: 9, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 2 },
  streamingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: colors.accentSubtle, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  streamingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, marginRight: 6 },
  streamingText: { fontSize: 9, fontFamily: fonts.mono, color: colors.accent, letterSpacing: 2 },
  messages: { flex: 1, paddingHorizontal: spacing.lg },
  messagesContent: { paddingTop: spacing.xl, paddingBottom: spacing.sm },
  welcome: { alignItems: "center", marginTop: 60 },
  welcomeIcon: { fontSize: 36, color: colors.accent, marginBottom: spacing.lg },
  welcomeTitle: { fontSize: 14, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 4, marginBottom: spacing.md },
  welcomeDivider: { width: 40, height: 1, backgroundColor: colors.border, marginBottom: spacing.lg },
  welcomeText: { color: colors.textSecondary, textAlign: "center", fontSize: 15, lineHeight: 24, paddingHorizontal: spacing.xxl },
  suggestionsWrap: { marginTop: spacing.xxl, width: "100%", paddingHorizontal: spacing.lg },
  suggestionsLabel: { fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 2, marginBottom: spacing.md, textAlign: "center" },
  suggestionChip: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.sm },
  suggestionText: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
  typingWrap: { alignSelf: "flex-start", marginBottom: spacing.sm, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  typingDots: { color: colors.accent, fontSize: 10, letterSpacing: 4 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.tabBg, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.textPrimary, marginRight: spacing.sm, maxHeight: 96, fontFamily: fonts.body },
  sendBtn: { borderRadius: radius.md, width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  sendActive: { backgroundColor: colors.accent },
  sendDisabled: { backgroundColor: colors.border },
  sendIcon: { color: colors.textInverse, fontSize: 20, fontWeight: "700" },
});
