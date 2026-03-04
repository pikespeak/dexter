import { Text, View, StyleSheet } from "react-native";
import { useAppTheme, spacing } from "../lib/theme";

interface Props {
  content: string;
}

export default function SimpleMarkdown({ content }: Props) {
  const theme = useAppTheme();

  const textStyle = { color: theme.colors.onSurface, fontSize: 15, lineHeight: 24 };
  const boldStyle = { fontWeight: "700" as const, color: theme.colors.onSurface };
  const italicStyle = { fontStyle: "italic" as const, color: theme.colors.onSurfaceVariant };
  const codeStyle = {
    fontFamily: "monospace",
    fontSize: 13,
    backgroundColor: theme.colors.surfaceVariant,
    color: theme.colors.primary,
    paddingHorizontal: 4,
    borderRadius: 3,
  };
  const bulletStyle = { color: theme.colors.onSurfaceVariant, fontSize: 15, lineHeight: 24 };

  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      if (match[2]) parts.push(<Text key={match.index} style={boldStyle}>{match[2]}</Text>);
      else if (match[3]) parts.push(<Text key={match.index} style={italicStyle}>{match[3]}</Text>);
      else if (match[4]) parts.push(<Text key={match.index} style={codeStyle}>{match[4]}</Text>);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length > 0 ? parts : [text];
  };

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^[\-\*]\s/.test(line)) {
      elements.push(
        <View key={i} style={styles.listItem}>
          <Text style={bulletStyle}>{"  \u2022  "}</Text>
          <Text style={textStyle}>{renderInline(line.replace(/^[\-\*]\s/, ""))}</Text>
        </View>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1] || "";
      elements.push(
        <View key={i} style={styles.listItem}>
          <Text style={bulletStyle}>{`  ${num}.  `}</Text>
          <Text style={textStyle}>{renderInline(line.replace(/^\d+\.\s/, ""))}</Text>
        </View>
      );
      continue;
    }

    if (line.trim() === "") {
      elements.push(<View key={i} style={styles.spacer} />);
      continue;
    }

    elements.push(<Text key={i} style={textStyle}>{renderInline(line)}</Text>);
  }

  return <View>{elements}</View>;
}

const styles = StyleSheet.create({
  listItem: { flexDirection: "row", marginBottom: 2 },
  spacer: { height: spacing.sm },
});
