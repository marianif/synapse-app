import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const WAVEFORM_BARS = 9;

export function Waveform({ tint }: { tint: string }): React.ReactElement {
  return (
    <View style={styles.waveform}>
      {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
        <WaveformBar key={i} index={i} tint={tint} />
      ))}
    </View>
  );
}

function WaveformBar({
  index,
  tint,
}: {
  index: number;
  tint: string;
}): React.ReactElement {
  const h = useSharedValue(6);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      h.value = 14;
      return;
    }
    // deterministic per-bar phase (no Math.random in render path)
    const a = 10 + (index % 4) * 4;
    const b = 6 + (index % 3) * 3;
    h.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 300 + a * 12 }),
        withTiming(b, { duration: 220 + b * 10 }),
        withTiming(16, { duration: 260 }),
        withTiming(6, { duration: 200 }),
      ),
      -1,
      false,
    );
  }, [h, index, reduced]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <Animated.View
      style={[styles.waveformBar, { backgroundColor: tint }, style]}
    />
  );
}

const styles = StyleSheet.create({
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    gap: 4,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
});
