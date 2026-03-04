import { View, StyleSheet } from "react-native";
import { useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { Surface, Chip, Button, Text } from "react-native-paper";
import SimpleMarkdown from "./SimpleMarkdown";
import { useAppTheme, spacing } from "../lib/theme";

export type MessageType = "user" | "thinking" | "tool" | "answer" | "error";

interface Props {
  type: MessageType;
  content: string;
  toolName?: string;
  onRetry?: () => void;
}

export default function AgentMessage({ type, content, toolName, onRetry }: Props) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  if (type === "user") {
    return (
      <Animated.View entering={FadeIn} style={styles.userWrap}>
        <Surface style={[styles.userBubble, { backgroundColor: theme.finance.userBubble }]} elevation={1}>
          <Text style={{ color: theme.colors.onPrimary, fontSize: 15, fontWeight: "500" }}>{content}</Text>
        </Surface>
      </Animated.View>
    );
  }

  if (type === "thinking") {
    return (
      <Animated.View entering={FadeIn} style={styles.botWrap}>
        <Surface style={styles.botBubble} elevation={1}>
          <Text variant="labelSmall" style={{ letterSpacing: 2, marginBottom: 4, color: theme.colors.onSurfaceVariant }}>
            PROCESSING
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, fontStyle: "italic" }}>
            {content || "Analyzing..."}
          </Text>
        </Surface>
      </Animated.View>
    );
  }

  if (type === "tool") {
    return (
      <Animated.View entering={FadeIn} style={styles.botWrap}>
        <Surface style={[styles.botBubble, { backgroundColor: theme.finance.toolBg }]} elevation={0}>
          <Chip
            icon="wrench-outline"
            onPress={() => setExpanded(!expanded)}
            mode="outlined"
            compact
          >
            {toolName || "TOOL"}
          </Chip>
          {expanded && content ? (
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: spacing.sm, lineHeight: 18 }}>
              {content}
            </Text>
          ) : null}
        </Surface>
      </Animated.View>
    );
  }

  if (type === "error") {
    return (
      <Animated.View entering={FadeIn} style={styles.botWrap}>
        <Surface style={[styles.botBubble, { backgroundColor: theme.colors.errorContainer }]} elevation={1}>
          <Text variant="labelSmall" style={{ letterSpacing: 2, marginBottom: 4, color: theme.colors.error }}>
            ERROR
          </Text>
          <Text style={{ color: theme.colors.error, fontSize: 15 }}>{content}</Text>
          {onRetry && (
            <Button mode="text" onPress={onRetry} compact style={{ alignSelf: "flex-start", marginTop: spacing.xs }}>
              RETRY
            </Button>
          )}
        </Surface>
      </Animated.View>
    );
  }

  // answer
  return (
    <Animated.View entering={FadeIn} style={styles.botWrap}>
      <Surface style={styles.botBubble} elevation={1}>
        <SimpleMarkdown content={content} />
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userWrap: { alignSelf: "flex-end", maxWidth: "80%", marginBottom: spacing.sm },
  userBubble: { borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  botWrap: { alignSelf: "flex-start", maxWidth: "85%", marginBottom: spacing.sm },
  botBubble: { borderRadius: 14, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
});
