import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  LinkSheet,
  type LinkSelection,
  type LinkableTarget,
} from "@/components/organisms/link-sheet";
import { tokens, useTheme } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

const WAVEFORM_BARS = 9;

interface DiaryComposerProps {
  /** Projects + ideas this note can be related to (newest-first). */
  targets: LinkableTarget[];
  /** Persist a kept note. The composer clears its draft + link on resolve. A
   *  note may point at one target (idea OR project) or be free. */
  onSave: (
    body: string,
    selection: LinkSelection,
  ) => Promise<void> | void;
}

/**
 * The notes tab's command line — a bottom-pinned single quiet line you FILL:
 * a neutral edge-bar, an inline TextInput, mic + send. Send opens the link
 * sheet so filing the note (onto a project, an idea, or free) IS the send.
 * Voice capture goes full-bleed with a waveform. The composer owns its draft,
 * link, and dictation state so the screen only wires persistence.
 */
export function DiaryComposer({
  targets,
  onSave,
}: DiaryComposerProps): React.ReactElement {
  const { colors } = useTheme();

  const [draft, setDraft] = useState("");
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);

  // Voice capture appends into the draft. We snapshot whatever was already typed
  // when a dictation session starts, then keep the draft = base + live transcript
  // so speech extends the note instead of clobbering it. (Diary is iOS-leaning;
  // the recognizer is a no-op web stub.)
  const { transcript, isRecording, toggleRecording } = useSpeechRecognizer();
  const dictationBase = useRef("");
  const wasRecording = useRef(false);

  useEffect(() => {
    if (isRecording && !wasRecording.current) {
      // session just began — anchor to the current draft (with a trailing space
      // so dictated words don't fuse onto the last typed word).
      const existing = draft.trim();
      dictationBase.current = existing ? existing + " " : "";
    }
    wasRecording.current = isRecording;
    if (isRecording && transcript) {
      setDraft(dictationBase.current + transcript);
    }
  }, [isRecording, transcript, draft]);

  const canSave = draft.trim().length > 0;

  const clear = (): void => {
    setDraft("");
  };

  // Send doesn't commit directly — it opens the link sheet so filing the note
  // (onto an idea, or free) IS the send. One action in the bar; the destination
  // is the last choice. The sheet's selection is the commit path (handleLink).
  const handleSend = (): void => {
    if (!canSave) return;
    setLinkSheetOpen(true);
  };

  // Picking in the sheet commits: a target files the note onto it, null files
  // it free. Either way the note sends and the bar clears.
  const handleLink = async (selection: LinkSelection): Promise<void> => {
    setLinkSheetOpen(false);
    await onSave(draft, selection);
    setDraft("");
  };

  // Recording is the one full-bleed moment. The bar wears the neutral action
  // slab so the color shift reads as "listening" without any type coding.
  const onSlab = colors.accent.onClay;
  if (isRecording) {
    return (
      <View
        style={[
          styles.bar,
          styles.recording,
          { backgroundColor: colors.accent.clay },
          tokens.elevation.capture,
        ]}
      >
        <View style={styles.center}>
          {transcript ? (
            <ThemedText
              type="item"
              numberOfLines={1}
              style={[styles.transcript, { color: onSlab }]}
            >
              {transcript}
            </ThemedText>
          ) : (
            <Waveform tint={onSlab} />
          )}
        </View>

        <Pressable
          onPress={toggleRecording}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="check" size={24} color={onSlab} />
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.bar,
          styles.idle,
          { backgroundColor: colors.surface },
          tokens.elevation.capture,
        ]}
      >
        <View style={[styles.edge, { backgroundColor: colors.inkMuted }]} />

        {/* Clear — appears only with content. A leading x wipes the draft so the
            writer can abandon a line without backspacing it out. */}
        {canSave ? (
          <Pressable
            onPress={clear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear note"
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={colors.inkMuted}
            />
          </Pressable>
        ) : null}

        {/* The line you FILL. Single-line at rest; grows up to a few lines as you
            write, but never back to a slab. */}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a note, capture a thought..."
          placeholderTextColor={colors.inkMuted}
          selectionColor={colors.ink}
          multiline
          accessibilityLabel="Write a diary note"
          style={[
            styles.input,
            { color: colors.ink, fontFamily: tokens.type.fontHand.medium },
          ]}
        />

        {/* Trailing cluster — mic and send are both always present (no longer
            alternatives). Mic arms voice anytime; send appears charged beside it
            once there's text and opens the link sheet (choosing there files the
            note, so linking and sending are one gesture). */}
        <View style={styles.controls}>
          <Pressable
            onPress={toggleRecording}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Record a note"
            style={({ pressed }) => [styles.micBtn, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
              name="microphone"
              size={22}
              color={colors.inkMuted}
            />
          </Pressable>

          <Pressable
            disabled={!canSave}
            onPress={handleSend}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Send note"
            accessibilityHint="Opens a sheet to file this note onto a project, an idea, or as a free note."
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.accent.clay },
              pressed && styles.pressed,
              !canSave && styles.disabled,
            ]}
          >
            <MaterialCommunityIcons
              name="arrow-up"
              size={22}
              color={colors.surface}
            />
          </Pressable>
        </View>
      </View>

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

function Waveform({ tint }: { tint: string }): React.ReactElement {
  return (
    <View style={styles.waveform}>
      {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
        <WaveformBar key={i} index={i} tint={tint} />
      ))}
    </View>
  );
}

function WaveformBar({
  index,
  tint,
}: {
  index: number;
  tint: string;
}): React.ReactElement {
  const h = useSharedValue(6);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      h.value = 14;
      return;
    }
    // deterministic per-bar phase (no Math.random in render path)
    const a = 10 + (index % 4) * 4;
    const b = 6 + (index % 3) * 3;
    h.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 300 + a * 12 }),
        withTiming(b, { duration: 220 + b * 10 }),
        withTiming(16, { duration: 260 }),
        withTiming(6, { duration: 200, easing: Easing.out(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [h, index, reduced]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <Animated.View
      style={[styles.waveformBar, { backgroundColor: tint }, style]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  // Idle: a command line — left edge-bar, prompt, trailing control cluster.
  idle: {
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.xs,
    gap: tokens.space.sm,
  },
  // Trailing cluster: mic + send grouped, both always rendered (send conditional
  // on content), so they read as a control set rather than a swapping affordance.
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  // Recording: the one full-bleed moment — waveform/transcript + inline keep.
  recording: {
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  edge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  // Clear key: a quiet leading x — recessed, smaller than the trailing key, so
  // it reads as "undo this line" without competing with send.
  clearBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
  },
  input: {
    flex: 1,
    paddingVertical: tokens.space.sm,
    fontSize: 18,
    lineHeight: 24,
    maxHeight: 96,
    textAlignVertical: "center",
  },
  micBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // Send key: the one moment the code appears charged in the idle bar — a tight
  // 36pt key (hitSlop carries it to 44pt), echoing the CaptureBar's enter key.
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  transcript: {
    alignSelf: "stretch",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    gap: 4,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
});
