import { Text, View, StyleSheet } from "react-native";
import { colors, fonts, spacing, radius } from "../lib/theme";

interface Props {
  content: string;
}

export default function SimpleMarkdown({ content }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bullet list items
    if (/^[\-\*]\s/.test(line)) {
      elements.push(
        <View key={i} style={s.listItem}>
          <Text style={s.bullet}>{"  \u2022  "}</Text>
          <Text style={s.text}>{renderInline(line.replace(/^[\-\*]\s/, ""))}</Text>
        </View>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1] || "";
      elements.push(
        <View key={i} style={s.listItem}>
          <Text style={s.bullet}>{`  ${num}.  `}</Text>
          <Text style={s.text}>{renderInline(line.replace(/^\d+\.\s/, ""))}</Text>
        </View>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === "") {
      elements.push(<View key={i} style={s.spacer} />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <Text key={i} style={s.text}>{renderInline(line)}</Text>
    );
  }

  return <View>{elements}</View>;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<Text key={match.index} style={s.bold}>{match[2]}</Text>);
    } else if (match[3]) {
      // *italic*
      parts.push(<Text key={match.index} style={s.italic}>{match[3]}</Text>);
    } else if (match[4]) {
      // `code`
      parts.push(<Text key={match.index} style={s.code}>{match[4]}</Text>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

const s = StyleSheet.create({
  text: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  bold: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  italic: {
    fontStyle: "italic",
    color: colors.textSecondary,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: 13,
    backgroundColor: colors.bgCard,
    color: colors.accent,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bullet: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  spacer: {
    height: spacing.sm,
  },
});
