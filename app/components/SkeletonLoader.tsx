import { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from "react-native-reanimated";
import { useAppTheme } from "../lib/theme";

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export default function SkeletonLoader({ width = "100%", height = 20, borderRadius = 6, style }: Props) {
  const theme = useAppTheme();
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: theme.colors.surfaceVariant },
        animatedStyle,
        style,
      ]}
    />
  );
}
