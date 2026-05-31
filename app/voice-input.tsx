// migrated to v2 tokens — phase 3
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  Brand,
  FontSize,
  LineHeight,
  Radius,
  Spacing,
  Surface,
  TextColors, tokens } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

export default function VoiceInputScreen(): React.ReactElement {
  const { autoStart } = useLocalSearchParams<{ autoStart?: string }>();
  const { transcript, toggleRecording, isRecording, error, permissionsGranted } =
    useSpeechRecognizer({ autoStart: autoStart === "true" });

  const isPermissionDenied = permissionsGranted === false;

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = withSpring(1);
    }
  }, [isRecording, pulse]);

  const animatedRingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: interpolate(pulse.value, [1, 1.2], [0.3, 0.1]),
    };
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
        {/* Header - No borders, just spacing and surface shifts */}
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
          {isPermissionDenied ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText}>
                Microphone access is off. Enable it in Settings to use voice
                input.
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                style={({ pressed }) => [
                  styles.settingsButton,
                  pressed && styles.settingsButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
              >
                <Text style={styles.settingsButtonText}>Open Settings</Text>
              </Pressable>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text
              style={[
                styles.transcript,
                transcript
                  ? styles.transcriptActive
                  : styles.transcriptPlaceholder,
              ]}
            >
              {transcript || "Speak to begin..."}
            </Text>
          )}
        </View>

        {/* Recording Controls */}
        <View style={styles.controls}>
          <View style={styles.recordButtonWrapper}>
            {/* Pulsing rings for recording state */}
            {isRecording && (
              <Animated.View style={[styles.pulseRing, animatedRingStyle]} />
            )}

            <Pressable
              onPress={toggleRecording}
              disabled={isPermissionDenied}
              style={({ pressed }) => [
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                isPermissionDenied && styles.recordButtonDisabled,
                pressed && !isPermissionDenied && styles.recordButtonPressed,
              ]}
            >
              <View
                style={[
                  styles.recordButtonInner,
                  isRecording && styles.recordButtonInnerActive,
                ]}
              />
            </Pressable>
          </View>

          <ThemedText type="body" style={styles.hint}>
            {isRecording ? "Listening..." : "Tap to start"}
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
    paddingVertical: Spacing.xl, // Increased padding to define section
  },
  headerButton: {
    minWidth: 60,
  },
  headerDoneButton: {
    minWidth: 60,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full, // Pill shape per DESIGN.md
    backgroundColor: Surface.containerHigh, // Surface shift instead of border
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
    opacity: 0.5,
  },
  controls: {
    alignItems: "center",
    paddingBottom: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  recordButtonWrapper: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: tokens.feedback.danger,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Surface.containerHigh,
    alignItems: "center",
    justifyContent: "center",
    // No hard borders, use subtle shadow or glow for elevation
    shadowColor: tokens.colors.unresolved.hex000,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  recordButtonActive: {
    backgroundColor: Surface.containerHighest,
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
    backgroundColor: tokens.feedback.danger,
    borderRadius: Radius.sm,
    width: 24,
    height: 24,
  },
  hint: {
    color: TextColors.tertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontSize: 10,
    fontWeight: "700",
  },
  errorBlock: {
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.bodyMd,
    lineHeight: LineHeight.bodyMd,
    color: TextColors.secondary,
    textAlign: "center",
  },
  settingsButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Surface.containerHigh,
  },
  settingsButtonPressed: {
    opacity: 0.7,
  },
  settingsButtonText: {
    fontSize: FontSize.bodyMd,
    fontWeight: "600",
    color: Brand.primary,
    textAlign: "center",
  },
  recordButtonDisabled: {
    opacity: 0.35,
  },
});
