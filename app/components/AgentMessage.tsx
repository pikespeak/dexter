import { View, Text, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";

export type MessageType = "user" | "thinking" | "tool" | "answer" | "error";

interface Props {
  type: MessageType;
  content: string;
  toolName?: string;
}

export default function AgentMessage({ type, content, toolName }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (type === "user") {
    return (
      <Animated.View entering={FadeIn} style={s.userWrap}>
        <View style={s.userBubble}>
          <Text style={s.userText}>{content}</Text>
        </View>
      </Animated.View>
    );
  }

  if (type === "thinking") {
    return (
      <Animated.View entering={FadeIn} style={s.botWrap}>
        <View style={s.thinkingBubble}>
          <Text style={s.thinkingText}>{content || "Thinking..."}</Text>
        </View>
      </Animated.View>
    );
  }

  if (type === "tool") {
    return (
      <Animated.View entering={FadeIn} style={s.botWrap}>
        <Pressable onPress={() => setExpanded(!expanded)} style={s.toolBubble}>
          <Text style={s.toolLabel}>🔧 {toolName || "Tool"}</Text>
          {expanded && content ? <Text style={s.toolContent}>{content}</Text> : null}
        </Pressable>
      </Animated.View>
    );
  }

  if (type === "error") {
    return (
      <Animated.View entering={FadeIn} style={s.botWrap}>
        <View style={s.errorBubble}>
          <Text style={s.errorText}>{content}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={s.botWrap}>
      <View style={s.answerBubble}>
        <Text style={s.answerText}>{content}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  userWrap: { alignSelf: "flex-end", maxWidth: "80%", marginBottom: 8 },
  userBubble: { backgroundColor: "#2563eb", borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  userText: { color: "#fff", fontSize: 16 },
  botWrap: { alignSelf: "flex-start", maxWidth: "80%", marginBottom: 8 },
  thinkingBubble: { backgroundColor: "#f3f4f6", borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  thinkingText: { color: "#6b7280", fontSize: 14, fontStyle: "italic" },
  toolBubble: { backgroundColor: "#eff6ff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  toolLabel: { fontSize: 12, fontWeight: "600", color: "#2563eb" },
  toolContent: { fontSize: 12, color: "#4b5563", marginTop: 4 },
  errorBubble: { backgroundColor: "#fef2f2", borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { color: "#dc2626", fontSize: 16 },
  answerBubble: { backgroundColor: "#f3f4f6", borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  answerText: { color: "#111827", fontSize: 16, lineHeight: 24 },
});
