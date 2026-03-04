import { type ViewStyle } from "react-native";
import { Card } from "react-native-paper";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function GlassCard({ children, style }: Props) {
  return (
    <Card mode="elevated" style={style}>
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}
