import { router, useLocalSearchParams } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  Brand,
  FontSize,
  LineHeight,
  Radius,
  Spacing,
  Surface,
  TextColors,
} from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

export default function VoiceInputScreen(): React.ReactElement {
  const { autoStart } = useLocalSearchParams<{ autoStart?: string }>();
  const { transcript, toggleRecording, isRecording } = useSpeechRecognizer({
    autoStart: autoStart === "true",
  });

  const handleCancel = (): void => {
    router.back();
  };

  const handleDone = (): void => {
    if (transcript.trim()) {
      router.replace({
        pathname: "/modal",
        params: { title: transcript.trim() },
      });
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleCancel} style={styles.headerButton} hitSlop={12}>
            <ThemedText type="body" muted>
              Cancel
            </ThemedText>
          </Pressable>
          <ThemedText type="headline">Voice Input</ThemedText>
          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [
              styles.headerDoneButton,
              pressed && styles.headerDoneButtonPressed,
            ]}
          >
            <ThemedText
              type="bodyBold"
              style={[styles.headerDoneButtonText, { color: Brand.primary }]}
            >
              Done
            </ThemedText>
          </Pressable>
        </View>

        {/* Transcript Display */}
        <View style={styles.transcriptContainer}>
          <Text
            style={[
              styles.transcript,
              transcript
                ? styles.transcriptActive
                : styles.transcriptPlaceholder,
            ]}
          >
            {transcript || "Tap the microphone to start recording..."}
          </Text>
        </View>

        {/* Recording Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={toggleRecording}
            style={({ pressed }) => [
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              pressed && styles.recordButtonPressed,
            ]}
          >
            <View
              style={[
                styles.recordButtonInner,
                isRecording && styles.recordButtonInnerActive,
              ]}
            />
          </Pressable>

          <ThemedText type="body" style={styles.hint}>
            {isRecording ? "Tap to stop" : "Hold to record"}
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Surface.outlineVariant,
  },
  headerButton: {
    minWidth: 60,
  },
  headerDoneButton: {
    minWidth: 50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Surface.outlineVariant,
  },
  headerDoneButtonPressed: {
    opacity: 0.7,
  },
  headerDoneButtonText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  transcriptContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
  },
  transcript: {
    fontSize: FontSize.displayMd,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: LineHeight.displayLg,
  },
  transcriptActive: {
    color: TextColors.primary,
  },
  transcriptPlaceholder: {
    color: TextColors.tertiary,
  },
  controls: {
    alignItems: "center",
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Surface.containerHigh,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Brand.primary,
  },
  recordButtonActive: {
    borderColor: "#FF6B6B",
  },
  recordButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  recordButtonInner: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Brand.primary,
  },
  recordButtonInnerActive: {
    backgroundColor: "#FF6B6B",
    borderRadius: Radius.sm,
    width: 24,
    height: 24,
  },
  hint: {
    color: TextColors.tertiary,
  },
});
