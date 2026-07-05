import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import { tokens } from "@/constants/theme";

const WAVEFORM_BARS = 9;

export function RecordingStage({
  transcript,
  onCancel,
  onStop,
  ink,
}: {
  transcript: string;
  onCancel: () => Promise<void>;
  onStop: () => Promise<void>;
  ink: string;
}): React.ReactElement {
  return (
    <View style={styles.recordingStage}>
      <Pressable
        onPress={() => void onCancel()}
        accessibilityRole="button"
        accessibilityLabel="Discard recording"
        style={styles.recordingButton}
      >
        <MaterialCommunityIcons name="close" size={20} color={ink} />
      </Pressable>
      <View style={styles.recordingCenter}>
        {transcript ? (
          <ThemedText
            type="item"
            numberOfLines={1}
            style={[styles.transcript, { color: ink }]}
          >
            {transcript}
          </ThemedText>
        ) : (
          <WaveformVisualizer barCount={WAVEFORM_BARS} color={ink} />
        )}
      </View>
      <Pressable
        onPress={() => void onStop()}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        style={styles.recordingButton}
      >
        <MaterialCommunityIcons name="arrow-right" size={20} color={ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recordingStage: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.sm,
    gap: tokens.space.sm,
  },
  recordingButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  transcript: {
    alignSelf: "stretch",
    textAlign: "center",
  },
});
