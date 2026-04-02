import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Brand, Radius, Shadow, Spacing } from "@/constants/theme";
import { WaveformVisualizer } from "@/components/atoms/waveform-bar";

const WAVEFORM_BARS = 10;

interface FabProps {
  onPress?: () => void;
  onLongPress?: () => void;
  isRecording?: boolean;
  onStop?: () => void;
}

export function Fab({
  onPress,
  onLongPress,
  isRecording = false,
  onStop,
}: FabProps): React.ReactElement {
  if (isRecording) {
    return (
      <View style={styles.wrapper} pointerEvents="box-none">
        <RecordingFab onStop={onStop} />
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
  onStop,
}: {
  onStop?: () => void;
}): React.ReactElement {
  return (
    <View style={styles.recordingContainer}>
      <WaveformVisualizer barCount={WAVEFORM_BARS} />
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
});
