import { View, Text } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

interface Props {
  icon: string;
  title: string;
  description: string;
}

export default function OnboardingSlide({ icon, title, description }: Props) {
  return (
    <Animated.View
      entering={FadeInRight.duration(500)}
      className="flex-1 items-center justify-center px-8"
    >
      <Text className="text-7xl mb-8">{icon}</Text>
      <Text className="text-3xl font-bold text-white text-center mb-4">
        {title}
      </Text>
      <Text className="text-lg text-blue-100 text-center leading-7">
        {description}
      </Text>
    </Animated.View>
  );
}
