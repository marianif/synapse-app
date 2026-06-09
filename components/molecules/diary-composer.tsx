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
  type LinkableIdea,
} from "@/components/organisms/link-sheet";
import { tokens, useTheme } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

const WAVEFORM_BARS = 9;

// Ink/icon color that sits ON the saturated send key + the full-bleed recording
// state — a fixed cool-near-black that clears AA on the butter/someday code in
// BOTH schemes (matches the home capture bar's ON_AMBER pairing).
const ON_CODE = tokens.color.dark.paper;

interface DiaryComposerProps {
  /** Ideas this note can be related to (newest-first). */
  ideas: LinkableIdea[];
  /** Persist a kept entry. The composer clears its draft + link on resolve. */
  onSave: (body: string, linkedEntryId: string | null) => Promise<void> | void;
}

/**
 * The diary's command line — the bottom-pinned twin of the home CaptureBar,
 * wearing the diary's butter/someday code instead of ideas/amber. At rest it's a
 * single quiet line you FILL: a someday edge-bar (the diary channel), an inline
 * TextInput, and one trailing affordance — a mic when empty, a charged send key
 * once there's text. Engaging the line reveals the diary's one distinguishing
 * gesture, RELATE (file the note onto an idea), as a leading inline chip. Voice
 * capture goes full butter-bleed with a waveform, exactly as the CaptureBar goes
 * full amber — the color shift IS the "listening" signal. Owns its own draft,
 * link, and dictation state so the screen only wires persistence. A note is
 * either related to an idea or free.
 */
export function DiaryComposer({
  ideas,
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

  // Picking in the sheet commits: an idea id files the note onto it, null files
  // it free. Either way the note sends and the bar clears.
  const handleLink = async (entryId: string | null): Promise<void> => {
    setLinkSheetOpen(false);
    await onSave(draft, entryId);
    setDraft("");
  };

  // Recording is the one full-bleed moment — the whole bar goes butter, mirroring
  // the CaptureBar's full-amber listening state. The color shift IS the signal.
  if (isRecording) {
    return (
      <View
        style={[
          styles.bar,
          styles.recording,
          { backgroundColor: colors.type.ideas },
          tokens.elevation.capture,
        ]}
      >
        <View style={styles.center}>
          {transcript ? (
            <ThemedText
              type="item"
              numberOfLines={1}
              style={[styles.transcript, { color: ON_CODE }]}
            >
              {transcript}
            </ThemedText>
          ) : (
            <Waveform tint={ON_CODE} />
          )}
        </View>

        <Pressable
          onPress={toggleRecording}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="check" size={24} color={ON_CODE} />
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
        <View style={[styles.edge, { backgroundColor: colors.type.ideas }]} />

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
          selectionColor={colors.type.ideas}
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
            accessibilityHint="Opens a sheet to file this note onto an idea, or as a free note."
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
        ideas={ideas}
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
