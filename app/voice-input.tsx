import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";
import { splitCapture } from "@/lib/capture";

import type { EntryType } from "@/lib/types";

const TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "todo", label: "Todo" },
  { value: "deadline", label: "Deadline" },
  { value: "event", label: "Event" },
  { value: "someday", label: "Someday" },
];

export default function VoiceInputScreen(): React.ReactElement {
  const { colors } = useTheme();
  const { createEntry } = useDatabase();
  // Landing here is an intent to capture by voice, so recording auto-starts
  // unless the caller explicitly opts out with `?autoStart=false`.
  const { autoStart } = useLocalSearchParams<{ autoStart?: string }>();
  const { transcript, toggleRecording, isRecording, error, permissionsGranted } =
    useSpeechRecognizer({ autoStart: autoStart !== "false" });

  // Spoken captures default to an idea (the quick-capture type); once the user
  // has stopped recording they can retype it into any entry type before saving.
  const [type, setType] = useState<EntryType>("idea");

  const isPermissionDenied = permissionsGranted === false;
  // The type toggle only makes sense once there's a transcript to file and
  // we're no longer actively listening.
  const showTypeToggle = !isRecording && transcript.trim().length > 0;

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

  const handleDone = async (): Promise<void> => {
    const trimmed = transcript.trim();
    if (!trimmed) {
      router.back();
      return;
    }
    const { title, notes } = splitCapture(trimmed);
    try {
      await createEntry({ title, type, notes });
    } catch (e) {
      console.error("[VoiceInput] Failed to save entry:", e);
    }
    router.back();
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["top", "bottom"]}
    >
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
              { backgroundColor: colors.surface },
              pressed && styles.headerDoneButtonPressed,
            ]}
          >
            <ThemedText
              type="bodyBold"
              style={[styles.headerDoneButtonText, { color: colors.accent.clay }]}
            >
              Done
            </ThemedText>
          </Pressable>
        </View>

        {/* Transcript Display */}
        <View style={styles.transcriptContainer}>
          {isPermissionDenied ? (
            <View style={styles.errorBlock}>
              <Text style={[styles.errorText, { color: colors.inkMuted }]}>
                Microphone access is off. Enable it in Settings to use voice
                input.
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                style={({ pressed }) => [
                  styles.settingsButton,
                  { backgroundColor: colors.surface },
                  pressed && styles.settingsButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
              >
                <Text
                  style={[styles.settingsButtonText, { color: colors.accent.clay }]}
                >
                  Open Settings
                </Text>
              </Pressable>
            </View>
          ) : error ? (
            <Text style={[styles.errorText, { color: colors.inkMuted }]}>
              {error}
            </Text>
          ) : (
            <Text
              style={[
                styles.transcript,
                transcript
                  ? { color: colors.ink }
                  : [styles.transcriptPlaceholder, { color: colors.inkMuted }],
              ]}
            >
              {transcript || "Speak to begin..."}
            </Text>
          )}
        </View>

        {/* Type toggle — appears once a transcript is captured so the user can
            file the spoken note as any entry type before saving. */}
        {showTypeToggle && (
          <View style={styles.typeToggle}>
            {TYPE_OPTIONS.map((option) => {
              const isSelected = type === option.value;
              const optionAccent = entryColor(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.typeOption,
                    { backgroundColor: colors.surface },
                    isSelected && { backgroundColor: optionAccent + "22" },
                    pressed && !isSelected && { opacity: 0.7 },
                  ]}
                >
                  <SketchIcon
                    type={option.value}
                    size={20}
                    color={isSelected ? optionAccent : colors.inkMuted}
                  />
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={[
                      styles.typeOptionText,
                      { color: isSelected ? optionAccent : colors.inkMuted },
                      isSelected && { fontWeight: "600" },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

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
                { backgroundColor: colors.surface },
                isRecording && { backgroundColor: colors.surfaceSubtle },
                isPermissionDenied && styles.recordButtonDisabled,
                pressed && !isPermissionDenied && styles.recordButtonPressed,
              ]}
            >
              <View
                style={[
                  styles.recordButtonInner,
                  { backgroundColor: colors.accent.clay },
                  isRecording && styles.recordButtonInnerActive,
                ]}
              />
            </Pressable>
          </View>

          <ThemedText type="body" style={[styles.hint, { color: colors.inkMuted }]}>
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
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.xl, // Increased padding to define section
  },
  headerButton: {
    minWidth: 60,
  },
  headerDoneButton: {
    minWidth: 60,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill, // Pill shape per DESIGN.md
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
    paddingHorizontal: tokens.space.xxl,
  },
  transcript: {
    fontSize: tokens.type.title.size,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: tokens.type.display.lineHeight,
  },
  transcriptPlaceholder: {
    opacity: 0.5,
  },
  typeToggle: {
    flexDirection: "row",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  typeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
    minHeight: 64,
    gap: tokens.space.xs,
  },
  typeOptionText: {
    textAlign: "center",
  },
  controls: {
    alignItems: "center",
    paddingBottom: tokens.space.xxxl * 2,
    gap: tokens.space.md,
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
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    // No hard borders, use subtle shadow or glow for elevation
    shadowColor: tokens.color.scrim.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  recordButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  recordButtonInner: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.pill,
  },
  recordButtonInnerActive: {
    backgroundColor: tokens.feedback.danger,
    borderRadius: tokens.radius.sm,
    width: 24,
    height: 24,
  },
  hint: {
    letterSpacing: 1,
    textTransform: "uppercase",
    fontSize: 10,
    fontWeight: "700",
  },
  errorBlock: {
    alignItems: "center",
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  errorText: {
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
    textAlign: "center",
  },
  settingsButton: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.md,
  },
  settingsButtonPressed: {
    opacity: 0.7,
  },
  settingsButtonText: {
    fontSize: tokens.type.body.size,
    fontWeight: "600",
    textAlign: "center",
  },
  recordButtonDisabled: {
    opacity: 0.35,
  },
});
