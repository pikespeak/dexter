import { useState, useRef, useCallback } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TextInput, Button, Chip, Text, Surface } from "react-native-paper";
import AgentMessage from "../../components/AgentMessage";
import { queryAgent } from "../../lib/sse-client";
import { useAppStore } from "../../lib/store";
import type { ChatMessage } from "../../lib/types";
import { useAppTheme, spacing } from "../../lib/theme";

const SUGGESTIONS = [
  "What is Apple's P/E ratio?",
  "Compare MSFT vs GOOG revenue",
  "Summarize Tesla's latest filing",
  "Top dividend stocks in S&P 500",
];

export default function AgentScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
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
    if (lastQueryRef.current) sendQuery(lastQueryRef.current);
  }, [sendQuery]);

  const handleSuggestion = useCallback((suggestion: string) => {
    sendQuery(suggestion);
  }, [sendQuery]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
        <View>
          <Text variant="titleMedium" style={{ fontWeight: "800", letterSpacing: 3 }}>AI AGENT</Text>
          <Text variant="labelSmall" style={{ letterSpacing: 3, color: theme.colors.onSurfaceVariant }}>
            RESEARCH ASSISTANT
          </Text>
        </View>
        <View style={styles.headerRight}>
          {messages.length > 0 && !isStreaming && (
            <Button mode="outlined" onPress={clearChat} compact>
              {t("agent.clear_chat").toUpperCase()}
            </Button>
          )}
          {isStreaming && (
            <Chip icon="broadcast" compact>STREAMING</Chip>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} onContentSizeChange={scrollToEnd}>
          {messages.length === 0 && (
            <View style={styles.welcome}>
              <Text style={{ fontSize: 36, color: theme.colors.primary, marginBottom: spacing.lg }}>▲</Text>
              <Text variant="labelMedium" style={{ letterSpacing: 4, color: theme.colors.onSurfaceVariant, marginBottom: spacing.md }}>
                RESEARCH AGENT
              </Text>
              <View style={[styles.welcomeDivider, { backgroundColor: theme.colors.outlineVariant }]} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", paddingHorizontal: spacing.xxl }}>
                {t("agent.welcome")}
              </Text>

              <View style={styles.suggestionsWrap}>
                <Text variant="labelSmall" style={{ letterSpacing: 2, color: theme.colors.onSurfaceVariant, marginBottom: spacing.md, textAlign: "center" }}>
                  {t("agent.suggestions").toUpperCase()}
                </Text>
                {SUGGESTIONS.map((text) => (
                  <Chip
                    key={text}
                    mode="outlined"
                    onPress={() => handleSuggestion(text)}
                    style={{ marginBottom: spacing.sm }}
                  >
                    {text}
                  </Chip>
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
            <Surface style={[styles.typingWrap]} elevation={1}>
              <Text style={{ color: theme.colors.primary, fontSize: 10, letterSpacing: 4 }}>◆ ◆ ◆</Text>
            </Surface>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
          <TextInput
            mode="outlined"
            placeholder={t("agent.placeholder")}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={handleSend}
            disabled={isStreaming}
            style={{ flex: 1, marginRight: spacing.sm, maxHeight: 96 }}
            right={
              <TextInput.Icon
                icon="send"
                onPress={handleSend}
                disabled={isStreaming || !input.trim()}
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  messages: { flex: 1, paddingHorizontal: spacing.lg },
  messagesContent: { paddingTop: spacing.xl, paddingBottom: spacing.sm },
  welcome: { alignItems: "center", marginTop: 60 },
  welcomeDivider: { width: 40, height: 1, marginBottom: spacing.lg },
  suggestionsWrap: { marginTop: spacing.xxl, width: "100%", paddingHorizontal: spacing.lg },
  typingWrap: { alignSelf: "flex-start", marginBottom: spacing.sm, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1 },
});
