import { View, Text, Pressable } from "react-native";
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
      <Animated.View entering={FadeIn} className="self-end max-w-[80%] mb-2">
        <View className="bg-blue-500 rounded-2xl rounded-br-sm px-4 py-3">
          <Text className="text-white text-base">{content}</Text>
        </View>
      </Animated.View>
    );
  }

  if (type === "thinking") {
    return (
      <Animated.View entering={FadeIn} className="self-start max-w-[80%] mb-2">
        <View className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
          <Text className="text-gray-500 dark:text-gray-400 text-sm italic">
            {content || "Thinking..."}
          </Text>
        </View>
      </Animated.View>
    );
  }

  if (type === "tool") {
    return (
      <Animated.View entering={FadeIn} className="self-start max-w-[85%] mb-2">
        <Pressable
          onPress={() => setExpanded(!expanded)}
          className="bg-blue-50 dark:bg-blue-900/30 rounded-xl px-4 py-2"
        >
          <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            🔧 {toolName || "Tool"}
          </Text>
          {expanded && content && (
            <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {content}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  if (type === "error") {
    return (
      <Animated.View entering={FadeIn} className="self-start max-w-[80%] mb-2">
        <View className="bg-red-50 dark:bg-red-900/30 rounded-2xl rounded-bl-sm px-4 py-3">
          <Text className="text-red-600 dark:text-red-400 text-base">
            {content}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // answer
  return (
    <Animated.View entering={FadeIn} className="self-start max-w-[85%] mb-2">
      <View className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
        <Text className="text-gray-900 dark:text-white text-base leading-6">
          {content}
        </Text>
      </View>
    </Animated.View>
  );
}
