import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export default function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: Props) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: "#e0e0e0",
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
