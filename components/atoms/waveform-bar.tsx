import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface WaveformBarProps {
  index: number;
  color?: string;
}

export function WaveformBar({
  index,
  color = "#FF6B6B",
}: WaveformBarProps): React.ReactElement {
  const height = useSharedValue(8);

  useEffect(() => {
    const baseHeight = 8;
    const maxHeight = 24;

    height.value = withRepeat(
      withSequence(
        withTiming(maxHeight, { duration: 300 + Math.random() * 200 }),
        withTiming(baseHeight + Math.random() * 8, { duration: 200 + Math.random() * 150 }),
        withTiming(maxHeight - 4, { duration: 250 + Math.random() * 100 }),
        withTiming(baseHeight, { duration: 180 + Math.random() * 120 }),
      ),
      -1,
      false,
    );
  }, [height, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
}

interface WaveformVisualizerProps {
  barCount?: number;
  color?: string;
}

export function WaveformVisualizer({
  barCount = 7,
  color = "#FF6B6B",
}: WaveformVisualizerProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {Array.from({ length: barCount }, (_, i) => (
        <WaveformBar key={i} index={i} color={color} />
      ))}
    </View>
  );
}

const styles = {
  container: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 40,
    gap: 4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
};