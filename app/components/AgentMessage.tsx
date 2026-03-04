import { View, Text, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import SimpleMarkdown from "./SimpleMarkdown";
import { colors, fonts, spacing, radius } from "../lib/theme";

export type MessageType = "user" | "thinking" | "tool" | "answer" | "error";

interface Props {
  type: MessageType;
  content: string;
  toolName?: string;
  onRetry?: () => void;
}

export default function AgentMessage({ type, content, toolName, onRetry }: Props) {
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
          <Text style={s.thinkingLabel}>PROCESSING</Text>
          <Text style={s.thinkingText}>{content || "Analyzing..."}</Text>
        </View>
      </Animated.View>
    );
  }

  if (type === "tool") {
    return (
      <Animated.View entering={FadeIn} style={s.botWrap}>
        <Pressable onPress={() => setExpanded(!expanded)} style={s.toolBubble}>
          <View style={s.toolHeader}>
            <View style={s.toolDot} />
            <Text style={s.toolLabel}>{toolName || "TOOL"}</Text>
            <Text style={s.toolToggle}>{expanded ? "−" : "+"}</Text>
          </View>
          {expanded && content ? <Text style={s.toolContent}>{content}</Text> : null}
        </Pressable>
      </Animated.View>
    );
  }

  if (type === "error") {
    return (
      <Animated.View entering={FadeIn} style={s.botWrap}>
        <View style={s.errorBubble}>
          <Text style={s.errorLabel}>ERROR</Text>
          <Text style={s.errorText}>{content}</Text>
          {onRetry && (
            <Pressable onPress={onRetry} style={s.retryBtn}>
              <Text style={s.retryText}>RETRY</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }

  // answer — render with markdown
  return (
    <Animated.View entering={FadeIn} style={s.botWrap}>
      <View style={s.answerBubble}>
        <SimpleMarkdown content={content} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  userWrap: { alignSelf: "flex-end", maxWidth: "80%", marginBottom: spacing.sm },
  userBubble: { backgroundColor: colors.accent, borderRadius: radius.md, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  userText: { color: colors.textInverse, fontSize: 15, fontWeight: "500" },
  botWrap: { alignSelf: "flex-start", maxWidth: "85%", marginBottom: spacing.sm },
  thinkingBubble: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.md, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  thinkingLabel: { fontSize: 9, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 2, marginBottom: 4 },
  thinkingText: { color: colors.textSecondary, fontSize: 14, fontStyle: "italic" },
  toolBubble: { backgroundColor: colors.toolBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
  toolHeader: { flexDirection: "row", alignItems: "center" },
  toolDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.info, marginRight: 8 },
  toolLabel: { fontSize: 11, fontFamily: fonts.mono, fontWeight: "600", color: colors.info, letterSpacing: 1, flex: 1 },
  toolToggle: { color: colors.textMuted, fontFamily: fonts.mono },
  toolContent: { fontSize: 12, fontFamily: fonts.mono, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 18 },
  errorBubble: { backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.lossBorder, borderRadius: radius.md, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  errorLabel: { fontSize: 9, fontFamily: fonts.mono, color: colors.loss, letterSpacing: 2, marginBottom: 4 },
  errorText: { color: colors.loss, fontSize: 15 },
  retryBtn: { marginTop: spacing.sm, alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.accentSubtle, borderRadius: radius.sm },
  retryText: { fontSize: 10, fontFamily: fonts.mono, color: colors.accent, fontWeight: "700", letterSpacing: 1 },
  answerBubble: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.md, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
});
