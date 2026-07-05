import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import { DockShell } from "@/components/organisms/dock-shell";
import { tokens, useEntryKicker, useTheme } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";
import type { EntryType } from "@/lib/types";

// The four kinds the ProjectFab can arm. `note` is not an EntryType (it becomes
// a diary entry), so it lives alongside as its own literal.
export type ProjectComposerKind = EntryType | "note";

const KIND_LABELS: Record<ProjectComposerKind, string> = {
  idea: "IDEA",
  todo: "TODO",
  deadline: "DEADLINE",
  note: "NOTE",
};

const KIND_PLACEHOLDERS: Record<ProjectComposerKind, string> = {
  idea: "An idea for this project…",
  todo: "Something to do…",
  deadline: "Something due…",
  note: "A note about this project…",
};

interface ProjectComposerProps {
  kind: ProjectComposerKind | null;
  onClose: () => void;
  onSubmit: (kind: ProjectComposerKind, text: string) => void;
}

/**
 * A minimal capture surface armed by ProjectFab. Unlike the home dock's
 * CaptureFlow (four-stage: capture → classify → details → note-link), the
 * flavour is already chosen — the FAB item IS the classification — so this
 * composer stays a single line: text field + mic. Send commits directly.
 *
 * Type identity is carried by the ACCENTS only — send button fill, mic ring,
 * kicker label, waveform bars — while the shell keeps the scheme-aware neutral
 * surface. Note uses the neutral ink shade (no entry code exists for it).
 */
export function ProjectComposer({
  kind,
  onClose,
  onSubmit,
}: ProjectComposerProps): React.ReactElement | null {
  if (kind === null) return null;
  return (
    <DockShell register="surface" contentKey={`project-composer-${kind}`}>
      <ProjectComposerBody kind={kind} onClose={onClose} onSubmit={onSubmit} />
    </DockShell>
  );
}

function ProjectComposerBody({
  kind,
  onClose,
  onSubmit,
}: {
  kind: ProjectComposerKind;
  onClose: () => void;
  onSubmit: (kind: ProjectComposerKind, text: string) => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const {
    transcript,
    startRecording,
    stopRecording,
  } = useSpeechRecognizer();

  // Explicit focus after mount — `autoFocus` doesn't fire reliably inside
  // DockShell's opacity cross-fade. Small delay so the fade-in / layout have
  // committed before we ask the OS to raise the keyboard.
  useEffect(() => {
    if (isRecording) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isRecording]);

  // Type accent: use the AA-safe kicker shade so the ink reads on the neutral
  // surface fill in both schemes. Note falls back to the muted ink (no code).
  const typeAccent = useEntryKicker(kind === "note" ? "todo" : kind);
  const accent = kind === "note" ? colors.inkMuted : typeAccent;

  const hasText = draft.trim().length > 0;

  useEffect(() => {
    if (isRecording && transcript) setDraft(transcript);
  }, [transcript, isRecording]);

  const handleSubmit = (): void => {
    const text = draft.trim();
    if (!text) return;
    onSubmit(kind, text);
    setDraft("");
    onClose();
  };

  const handleStartRecording = (): void => {
    setIsRecording(true);
    void startRecording();
  };

  const handleStopRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      if (draft.trim()) handleSubmit();
    });
  };

  const handleCancelRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      setDraft("");
    });
  };

  if (isRecording) {
    return (
      <View style={styles.recordingStage}>
        <Pressable
          onPress={handleCancelRecording}
          accessibilityRole="button"
          accessibilityLabel="Discard recording"
          style={styles.roundButton}
        >
          <MaterialCommunityIcons name="close" size={20} color={colors.ink} />
        </Pressable>
        <View style={styles.recordingCenter}>
          {transcript ? (
            <ThemedText
              type="item"
              numberOfLines={1}
              style={[styles.transcript, { color: colors.ink }]}
            >
              {transcript}
            </ThemedText>
          ) : (
            <WaveformVisualizer barCount={9} color={accent} />
          )}
        </View>
        <Pressable
          onPress={handleStopRecording}
          accessibilityRole="button"
          accessibilityLabel="Save recording"
          style={[
            styles.primaryRound,
            { backgroundColor: accent },
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={colors.surface}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.inputStage}>
      <View style={styles.kickerSlot}>
        <ThemedText
          type="micro"
          style={[styles.kicker, { color: accent }]}
        >
          {KIND_LABELS[kind]}
        </ThemedText>
      </View>
      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={handleSubmit}
        placeholder={KIND_PLACEHOLDERS[kind]}
        placeholderTextColor={colors.inkMuted}
        selectionColor={accent}
        returnKeyType="done"
        submitBehavior="submit"
        accessibilityLabel={KIND_PLACEHOLDERS[kind]}
        multiline={kind === "note"}
        style={[styles.input, { color: colors.ink }]}
      />
      {hasText ? (
        <Pressable
          onPress={handleSubmit}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Save ${KIND_LABELS[kind].toLowerCase()}`}
          style={({ pressed }) => [
            styles.primaryRound,
            { backgroundColor: accent },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={colors.surface}
          />
        </Pressable>
      ) : (
        <Pressable
          onPress={handleStartRecording}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Capture by voice"
          style={({ pressed }) => [
            styles.secondaryRound,
            { borderColor: accent },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="microphone" size={20} color={accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputStage: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.xs,
    gap: tokens.space.sm,
  },
  kickerSlot: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  kicker: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
  },
  input: {
    flex: 1,
    paddingVertical: tokens.space.sm,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
    fontFamily: tokens.type.fontInter.medium,
  },
  primaryRound: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryRound: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  roundButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingStage: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.sm,
    gap: tokens.space.sm,
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
  pressed: {
    opacity: 0.62,
  },
});
