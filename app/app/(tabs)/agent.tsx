import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AgentMessage, { type MessageType } from "../../components/AgentMessage";
import { queryAgent } from "../../lib/sse-client";

interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  toolName?: string;
}

export default function AgentScreen() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const addMessage = useCallback(
    (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      scrollToEnd();
    },
    [scrollToEnd]
  );

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || isStreaming) return;

    setInput("");
    addMessage({ id: Date.now().toString(), type: "user", content: query });

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of queryAgent(query, { signal: controller.signal })) {
        if (event.type === "ping") continue;
        if (event.type === "thinking") {
          addMessage({ id: `thinking-${Date.now()}`, type: "thinking", content: t("agent.thinking") });
        } else if (event.type === "tool_start") {
          addMessage({ id: `tool-${Date.now()}`, type: "tool", content: "", toolName: event.toolName || "Tool" });
        } else if (event.type === "tool_end") {
          const result = typeof event.data?.result === "string" ? event.data.result : JSON.stringify(event.data?.result ?? "");
          addMessage({ id: `tool-end-${Date.now()}`, type: "tool", content: String(result).slice(0, 500), toolName: event.toolName || "Result" });
        } else if (event.type === "done") {
          const answer = event.answer || (typeof event.data?.answer === "string" ? event.data.answer : "") || JSON.stringify(event.data ?? "");
          addMessage({ id: `answer-${Date.now()}`, type: "answer", content: answer });
        } else if (event.type === "error") {
          addMessage({ id: `error-${Date.now()}`, type: "error", content: event.error || t("agent.error") });
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        addMessage({ id: `error-${Date.now()}`, type: "error", content: t("agent.error") });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, addMessage, t]);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t("tabs.agent")}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
        keyboardVerticalOffset={90}
      >
        <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesContent} onContentSizeChange={scrollToEnd}>
          {messages.length === 0 && (
            <View style={s.welcome}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🤖</Text>
              <Text style={s.welcomeText}>{t("agent.welcome")}</Text>
            </View>
          )}
          {messages.map((msg) => (
            <AgentMessage key={msg.id} type={msg.type} content={msg.content} toolName={msg.toolName} />
          ))}
          {isStreaming && (
            <View style={s.typingWrap}>
              <View style={s.typingBubble}>
                <Text style={{ color: "#9ca3af", fontSize: 18 }}>● ● ●</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder={t("agent.placeholder")}
            placeholderTextColor="#9ca3af"
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
            <Text style={{ color: "#fff", fontSize: 18 }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  flex: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 4, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  messages: { flex: 1, paddingHorizontal: 16 },
  messagesContent: { paddingTop: 16, paddingBottom: 8 },
  welcome: { alignItems: "center", marginTop: 80 },
  welcomeText: { color: "#9ca3af", textAlign: "center", fontSize: 16, paddingHorizontal: 32 },
  typingWrap: { alignSelf: "flex-start", marginBottom: 8 },
  typingBubble: { backgroundColor: "#f3f4f6", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  input: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: "#111827", marginRight: 8, maxHeight: 96 },
  sendBtn: { borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  sendActive: { backgroundColor: "#2563eb" },
  sendDisabled: { backgroundColor: "#d1d5db" },
});
