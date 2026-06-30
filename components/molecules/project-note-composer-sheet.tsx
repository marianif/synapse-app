import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import { entryColor, tokens, useEntryTint, useTheme } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

/**
 * Lightweight note composer for the project surface.
 *
 * Why not the full DiaryComposer: that one is the diary tab's command line —
 * it carries voice capture, the "relate to idea" link sheet, butter coloring.
 * Here the user has already chosen the context (this project), so the only
 * thing left is the body. A quiet sheet with a TextInput is the right shape.
 *
 * Save commits via `onSave(body)`; the parent passes a closure that calls
 * `addDiaryEntry(body, null, null, projectId)`. Cancel discards. Empty body
 * disables Save.
 *
 * Voice: a small mic next to the input toggles dictation. When recording, the
 * live transcript appends into the draft (anchored to whatever was already
 * typed at session start), so speech extends the note rather than clobbering
 * it — the same pattern DiaryComposer uses on the diary tab. iOS-only in
 * practice; the recognizer is a no-op web stub.
 */
export function ProjectNoteComposerSheet({
  visible,
  projectTitle,
  onClose,
  onSave,
}: {
  visible: boolean;
  /** The project name — surfaced in the kicker so the user can confirm
   *  they're writing under the right surface. */
  projectTitle: string;
  onClose: () => void;
  onSave: (body: string) => void;
}): React.ReactElement {
  const { colors } = useTheme();
  // Listening tint — amber is the brand's "capture is active" code (matches
  // the home CaptureBar's amber-bleed during voice). Red is reserved for
  // destructive actions per the brand rules; using it for "listening" would
  // misread as "stop / dangerous."
  const ideaCode = entryColor("idea");
  const ideaTint = useEntryTint("idea");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Voice. We snapshot whatever is already typed when a session begins, then
  // keep draft = base + transcript so speech extends instead of replacing.
  // (Same shape as DiaryComposer on the diary tab.)
  const { transcript, isRecording, toggleRecording, stopRecording } =
    useSpeechRecognizer();
  const dictationBase = useRef("");
  const wasRecording = useRef(false);

  useEffect(() => {
    if (isRecording && !wasRecording.current) {
      // session just began — anchor to current draft (trailing space so
      // dictated words don't fuse onto the last typed word).
      const existing = draft.trim();
      dictationBase.current = existing ? existing + " " : "";
    }
    wasRecording.current = isRecording;
    if (isRecording && transcript) {
      setDraft(dictationBase.current + transcript);
    }
  }, [isRecording, transcript, draft]);

  // Reset draft and focus the input every time the sheet opens. Focus on a
  // tick so the modal's mount animation doesn't fight the keyboard rise.
  useEffect(() => {
    if (visible) {
      setDraft("");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    // On close, make sure a stray recording session doesn't outlive the sheet.
    if (!visible && wasRecording.current) {
      void stopRecording();
    }
  }, [visible, stopRecording]);

  const canSave = draft.trim().length > 0;

  const commit = (): void => {
    if (!canSave) return;
    // Stop any in-flight recording before committing; the transcript is
    // already streamed into the draft, so this is just hygiene.
    if (isRecording) void stopRecording();
    onSave(draft.trim());
    onClose();
  };

  const handleMicPress = (): void => {
    // While recording, the TextInput shouldn't steal focus from the mic press
    // (otherwise the keyboard pops up over the user's speech). Toggle handles
    // both directions: tap once to start, tap again to stop.
    void toggleRecording();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kbAvoid}
          // Without keyboardVerticalOffset = 0 the modal's own slide animation
          // can collide with the keyboard offset on iOS; leaving it default.
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <ThemedText
              type="label"
              style={[styles.kicker, { color: colors.inkMuted }]}
            >
              {`NOTE ON ${projectTitle.toUpperCase()}`}
            </ThemedText>

            {/* Input area. While recording, we drop a tinted band + waveform
                ABOVE the text so the "listening" state has spatial presence,
                not just a label. The TextInput stays mounted and editable —
                the user can still type while dictating, and the transcript
                lands in the same draft. */}
            {isRecording ? (
              <View
                style={[styles.listeningBand, { backgroundColor: ideaTint }]}
                accessibilityLiveRegion="polite"
                accessibilityLabel="Listening"
              >
                <WaveformVisualizer color={ideaCode} barCount={9} />
              </View>
            ) : null}

            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder="What about it…"
              placeholderTextColor={colors.inkMuted}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Note body"
              style={[
                styles.input,
                {
                  backgroundColor: isRecording ? ideaTint : colors.surfaceSubtle,
                  color: colors.ink,
                  // While listening, the band above and the input share a tint
                  // so they read as one surface — only the corner radii tell
                  // them apart, which is fine: the eye unifies them anyway.
                  borderTopLeftRadius: isRecording ? 0 : tokens.radius.md,
                  borderTopRightRadius: isRecording ? 0 : tokens.radius.md,
                },
              ]}
            />

            <View style={styles.actions}>
              {/* Mic — pinned to the left so it never collides with Save.
                  Tap to dictate; tap again to stop. While recording, the pill
                  flips to filled amber (the brand's "capture is active" code,
                  matching the home CaptureBar's amber-bleed) with a STOP
                  affordance — never red, because red is destructive. */}
              <Pressable
                onPress={handleMicPress}
                accessibilityRole="button"
                accessibilityLabel={
                  isRecording ? "Stop recording" : "Start voice recording"
                }
                accessibilityState={{ selected: isRecording }}
                style={({ pressed }) => [
                  styles.micBtn,
                  {
                    backgroundColor: isRecording
                      ? ideaCode
                      : colors.surfaceSubtle,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  // Stop-square is the iOS convention for "tap to end
                  // recording" — clearer than a filled-mic toggle that reads
                  // as "the mic is on" rather than "tap to stop."
                  name={isRecording ? "stop" : "microphone-outline"}
                  size={20}
                  // Amber tint runs AA-shy with bright ink; the brand uses
                  // tokens.color.dark.paper (the cool graphite) as on-amber.
                  color={isRecording ? tokens.color.dark.paper : colors.ink}
                />
                {isRecording ? (
                  <ThemedText
                    type="micro"
                    style={[
                      styles.micLabel,
                      { color: tokens.color.dark.paper },
                    ]}
                  >
                    STOP
                  </ThemedText>
                ) : null}
              </Pressable>

              {/* Spacer pushes the right-side actions to the trailing edge. */}
              <View style={styles.actionsSpacer} />

              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel note"
              >
                <ThemedText type="bodyBold" muted>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={commit}
                disabled={!canSave}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: canSave
                      ? colors.accent.clay
                      : colors.surfaceSubtle,
                  },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save note"
                accessibilityState={{ disabled: !canSave }}
              >
                <ThemedText
                  type="bodyBold"
                  style={{
                    color: canSave ? colors.accent.onClay : colors.inkMuted,
                  }}
                >
                  Save
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: tokens.color.scrim.strong,
    justifyContent: "flex-end",
  },
  kbAvoid: {
    width: "100%",
  },
  sheet: {
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  kicker: {
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 120,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.md,
    fontSize: tokens.type.body.size,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  actionsSpacer: {
    flex: 1,
  },
  micBtn: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  micLabel: {
    letterSpacing: tokens.type.micro.tracking,
  },
  // Listening band — sits flush above the input while recording. Tint matches
  // the input so the two read as one tall listening surface; the waveform is
  // the only motion, which is exactly what the brand allows ("expressive but
  // earns its place" — recording IS the moment that earns it).
  listeningBand: {
    borderTopLeftRadius: tokens.radius.md,
    borderTopRightRadius: tokens.radius.md,
    paddingVertical: tokens.space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  saveBtn: {
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  pressed: { opacity: 0.7 },
});
