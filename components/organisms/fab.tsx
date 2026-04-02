import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Brand, Radius, Shadow, Spacing } from "@/constants/theme";

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

function RecordingFab({
  transcript,
  onStop,
  onCancel,
}: {
  transcript: string;
  onStop?: () => void;
  onCancel?: () => void;
}): React.ReactElement {
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, [dotOpacity]);

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <View style={styles.recordingContainer}>
      {transcript.length > 0 && (
        <View style={styles.transcriptToast}>
          <View style={styles.transcriptContent}>
            <Animated.View style={[styles.recordingDot, animatedDotStyle]} />
            <Text style={styles.transcriptText} numberOfLines={2}>
              {transcript}
            </Text>
          </View>
          <Pressable
            onPress={onCancel}
            hitSlop={12}
            style={styles.cancelButton}
            accessibilityLabel="Cancel recording"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={16} color="#A1A1AA" />
          </Pressable>
        </View>
      )}
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
  transcriptToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A2D",
    borderRadius: 24,
    maxWidth: 280,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,

    ...Shadow.card,
  },
  transcriptContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B6B",
    flexShrink: 0,
    marginRight: 8,
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
