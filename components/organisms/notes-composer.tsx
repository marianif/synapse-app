import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import { DockShell } from "@/components/organisms/dock-shell";
import {
  LinkSheet,
  type LinkSelection,
  type LinkableTarget,
} from "@/components/organisms/link-sheet";
import { tokens, useTheme } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

interface NotesComposerProps {
  targets: LinkableTarget[];
  onSave: (body: string, selection: LinkSelection) => Promise<void> | void;
}

/**
 * The notes tab's command bar — a minimal capture surface armed for the "note"
 * kind, styled after ProjectComposer. Unlike the home dock's multi-kind capture,
 * this composer always writes notes and presents the LinkSheet on commit so the
 * note can be filed onto a project, an idea, or left free.
 *
 * The shell (DockShell) carries the scheme-aware neutral surface; the accent is
 * inkMuted — notes have no entry-code color. The bar reads as a single
 * instrument: kicker label → text → send/mic, and swaps to a recording readout
 * (waveform → close / confirm) when the mic is armed.
 */
export function NotesComposer({
  targets,
  onSave,
}: NotesComposerProps): React.ReactElement {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const { transcript, startRecording, stopRecording } = useSpeechRecognizer();

  // Explicit focus after mount — `autoFocus` doesn't fire reliably inside
  // DockShell's opacity cross-fade.
  useEffect(() => {
    if (isRecording) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isRecording]);

  const accent = colors.inkMuted;
  const hasText = draft.trim().length > 0;

  // Voice: the live transcript streams into the draft while recording.
  useEffect(() => {
    if (isRecording && transcript) setDraft(transcript);
  }, [transcript, isRecording]);

  const handleStartRecording = (): void => {
    setIsRecording(true);
    void startRecording();
  };

  const handleStopRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      if (draft.trim()) setLinkSheetOpen(true);
    });
  };

  const handleCancelRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      setDraft("");
    });
  };

  const handleSend = (): void => {
    if (!hasText) return;
    setLinkSheetOpen(true);
  };

  const handleLink = async (selection: LinkSelection): Promise<void> => {
    setLinkSheetOpen(false);
    await onSave(draft, selection);
    setDraft("");
  };

  if (isRecording) {
    return (
      <DockShell register="slab" contentKey="notes-composer-recording">
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
            style={[styles.primaryRound, { backgroundColor: accent }]}
          >
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={colors.surface}
            />
          </Pressable>
        </View>
      </DockShell>
    );
  }

  return (
    <>
      <DockShell register="surface" contentKey="notes-composer">
        <View style={styles.inputStage}>
          <View style={styles.kickerSlot}>
            <ThemedText
              type="micro"
              style={[styles.kicker, { color: accent }]}
            >
              NOTE
            </ThemedText>
          </View>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
            placeholder="Write a note, capture a thought…"
            placeholderTextColor={colors.inkMuted}
            selectionColor={accent}
            returnKeyType="done"
            submitBehavior="submit"
            accessibilityLabel="Write a diary note"
            multiline
            style={[styles.input, { color: colors.ink }]}
          />
          {hasText ? (
            <Pressable
              onPress={handleSend}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Save note"
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
              <MaterialCommunityIcons
                name="microphone"
                size={20}
                color={accent}
              />
            </Pressable>
          )}
        </View>
      </DockShell>

      <LinkSheet
        visible={linkSheetOpen}
        selected={null}
        targets={targets}
        onSelect={handleLink}
        onClose={() => setLinkSheetOpen(false)}
      />
    </>
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
