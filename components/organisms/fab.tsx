import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Brand, Radius, Shadow, Spacing } from "@/constants/theme";

const WAVEFORM_BARS = 10;

interface FabProps {
  onPress?: () => void;
  onLongPress?: () => void;
  isRecording?: boolean;
  transcript?: string;
  onStop?: () => void;
  onCancel?: () => void;
}

export function Fab({
  onPress,
  onLongPress,
  isRecording = false,
  transcript = "",
  onStop,
  onCancel,
}: FabProps): React.ReactElement {
  if (isRecording) {
    return (
      <View style={styles.wrapper} pointerEvents="box-none">
        <RecordingFab
          transcript={transcript}
          onStop={onStop}
          onCancel={onCancel}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <View style={styles.glow} />
        <MaterialCommunityIcons name="microphone" size={28} color="#1A1A2E" />
      </Pressable>
    </View>
  );
}

function WaveformBar({ index }: { index: number }): React.ReactElement {
  const height = useSharedValue(8);

  useEffect(() => {
    const baseHeight = 8;
    const maxHeight = 24;

    height.value = withRepeat(
      withSequence(
        withTiming(maxHeight, { duration: 300 + Math.random() * 200 }),
        withTiming(baseHeight + Math.random() * 8, {
          duration: 200 + Math.random() * 150,
        }),
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

  return <Animated.View style={[styles.waveformBar, animatedStyle]} />;
}

function RecordingFab({
  transcript,
  onStop,
  onCancel,
}: {
  transcript: string;
  onStop?: () => void;
  onCancel?: () => void;
}): React.ReactElement {
  return (
    <View style={styles.recordingContainer}>
      <View style={styles.waveformContainer}>
        {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
          <WaveformBar key={i} index={i} />
        ))}
      </View>
      <Pressable
        onPress={onStop}
        style={({ pressed }) => [
          styles.recordingButton,
          pressed && styles.buttonPressed,
        ]}
        accessibilityLabel="Stop recording"
        accessibilityRole="button"
      >
        <View style={styles.recordingGlow} />
        <MaterialCommunityIcons name="stop" size={20} color="#FAFAFA" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Brand.fabGlow,
    ...Shadow.fab,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.fab,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  wrapper: {
    position: "absolute",
    bottom: 28,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    gap: Spacing.md,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    gap: 4,
  },
  waveformBar: {
    width: 4,
    backgroundColor: "#FF6B6B",
    borderRadius: 2,
  },
  recordingGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    ...Shadow.fab,
  },
  recordingButton: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.fab,
  },

  cancelButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    marginLeft: 4,
  },
  transcriptText: {
    flex: 1,
    fontSize: 14,
    color: "#FAFAFA",
    fontWeight: "400",
    marginRight: 8,
  },
});
