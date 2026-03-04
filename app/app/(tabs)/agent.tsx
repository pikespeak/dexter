import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: query,
    };
    addMessage(userMsg);

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of queryAgent(query, {
        signal: controller.signal,
      })) {
        if (event.type === "ping") continue;

        if (event.type === "thinking") {
          addMessage({
            id: `thinking-${Date.now()}`,
            type: "thinking",
            content: t("agent.thinking"),
          });
        } else if (event.type === "tool_start") {
          addMessage({
            id: `tool-${Date.now()}`,
            type: "tool",
            content: "",
            toolName: event.toolName || "Tool",
          });
        } else if (event.type === "tool_end") {
          const result =
            typeof event.data?.result === "string"
              ? event.data.result
              : JSON.stringify(event.data?.result ?? "");
          addMessage({
            id: `tool-end-${Date.now()}`,
            type: "tool",
            content: result.slice(0, 500),
            toolName: event.toolName || "Result",
          });
        } else if (event.type === "done") {
          const answer =
            event.answer ||
            (typeof event.data?.answer === "string" ? event.data.answer : "") ||
            JSON.stringify(event.data ?? "");
          addMessage({
            id: `answer-${Date.now()}`,
            type: "answer",
            content: answer,
          });
        } else if (event.type === "error") {
          addMessage({
            id: `error-${Date.now()}`,
            type: "error",
            content: event.error || t("agent.error"),
          });
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        addMessage({
          id: `error-${Date.now()}`,
          type: "error",
          content: t("agent.error"),
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, addMessage, t]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="pt-2 pb-1 px-4 border-b border-gray-100 dark:border-gray-800">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t("tabs.agent")}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-4"
          onContentSizeChange={scrollToEnd}
        >
          {messages.length === 0 && (
            <View className="items-center mt-20">
              <Text className="text-5xl mb-4">🤖</Text>
              <Text className="text-gray-400 text-center text-base px-8">
                {t("agent.welcome")}
              </Text>
            </View>
          )}
          {messages.map((msg) => (
            <AgentMessage
              key={msg.id}
              type={msg.type}
              content={msg.content}
              toolName={msg.toolName}
            />
          ))}
          {isStreaming && (
            <View className="self-start mb-2">
              <View className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                <Text className="text-gray-400 text-lg">● ● ●</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="flex-row items-end px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <TextInput
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 text-base text-gray-900 dark:text-white mr-2 max-h-24"
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
            className={`rounded-full w-10 h-10 items-center justify-center ${
              isStreaming || !input.trim() ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            <Text className="text-white text-lg">↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
