import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { CapturePulse } from "@/components/atoms/capture-pulse";
import { ThemedText } from "@/components/atoms/themed-text";
import { Waveform } from "@/components/atoms/waveform";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

interface CaptureBarProps {
  /** Save a typed thought inline. The destination (todo / deadline / idea /
   *  diary note / note on an idea) is chosen after sending, via the capture
   *  resolver — the bar itself is type-agnostic. */
  onSubmit?: (text: string) => void;
  /** Tap the mic to arm voice capture (visible, first-class route). */
  onVoice?: () => void;
  isRecording?: boolean;
  transcript?: string;
  onStop?: () => void;
  onCancel?: () => void;
  /** Composer mode: focus the input (and raise the keyboard) on mount. */
  autoFocus?: boolean;
  /** Composer mode: the input lost focus with nothing typed — close the bar. */
  onDismissEmpty?: () => void;
}

/**
 * The board's command line — the capture readout inside the dock shell. Field
 * Lab is an instrument panel (mono readouts, sharp corners, tonal layering
 * carrying structure), and this is where anything enters the board: a todo, a
 * deadline, an idea, a note. It belongs to no single type, so it wears the
 * NEUTRAL grammar (never a type tint) — dressing it in amber made it read as
 * "ideas only", the exact confusion we're undoing.
 *
 * This component is now FRAMELESS: the surrounding frame, fill, radius,
 * elevation, and entrance belong to `DockShell`. The bar renders only its row of
 * controls on a transparent ground, so the shell can morph the panel in place
 * (idle line ↔ recorder) without the bar popping between shapes. It rides the
 * neutral clay slab in BOTH states — the same slab as the AddProjectBar, so the
 * two read as one instrument family — with all inks on-slab (`onClay`).
 *
 * Idle is now a SPLIT DOCK: the text line lives in one slab, voice capture in
 * its own slab. Voice was getting lost as a trailing 22×22 icon at the end of a
 * bar; giving it a dedicated tonal slab makes it the equal partner it is. When
 * text is entered, the voice slab swaps for the send slab using the same shape
 * and position. Recording keeps the two-slab grammar (discard | live readout |
 * keep), but the keep key is now the same prominent inverse slab as send.
 *
 * Typing + ↵ (or the send key) hands the thought to the capture resolver — no
 * navigation, no type decided up front.
 */
export function CaptureBar({
  onSubmit,
  onVoice,
  isRecording = false,
  transcript = "",
  onStop,
  onCancel,
  autoFocus = false,
  onDismissEmpty,
}: CaptureBarProps): React.ReactElement {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const hasText = draft.trim().length > 0;

  const handleBlur = (): void => {
    if (!hasText) onDismissEmpty?.();
  };

  const submit = (): void => {
    if (!hasText) return;
    onSubmit?.(draft.trim());
    setDraft("");
  };

  // The bar rides the neutral clay slab in every state, so all inks are on-slab
  // (onClay), never scheme ink — exactly like AddProjectBar. `onSlab` is the
  // primary on-slab ink; `signal` is the recessive on-slab voice (mark, mic,
  // placeholder) at reduced alpha, AA-safe on the slab in both schemes.
  const onSlab = colors.accent.onClay;
  const signal = `${onSlab}A6`; // ~65% — recessive on-slab affordance ink
  // Voice slab sits one tonal layer below/above the clay slab so it reads as a
  // distinct object, not a trailing icon. `clayPressed` is the neutral pressed
  // surface — darker in light mode, lighter in dark mode — so the split is
  // visible in both schemes without introducing a hue.
  const voiceSlabFill = colors.accent.clayPressed;

  // Recording: same neutral slab, controls on-slab — never a type chrome. The
  // "listening" life lives in the moving waveform as a SIGNAL, tinted with the
  // on-slab ink so it stays legible in both schemes.
  if (isRecording) {
    return (
      <View style={[styles.bar, styles.recording]}>
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Discard recording"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <IconSymbol name="X" size={22} color={onSlab} />
        </Pressable>

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
          onPress={onStop}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Save capture"
          style={({ pressed }) => [
            styles.actionSlab,
            styles.inverseSlab,
            { backgroundColor: onSlab },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="Check" size={24} color={colors.accent.clay} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.bar, styles.idle]}>
      {/* The line you FILL: a pulsing capture-mark + inline TextInput. ↵ drops the
          thought onto the board; the mark hides once typing starts (the cursor
          takes over). */}
      <View style={styles.textSlab}>
        {!hasText ? <CapturePulse tint={signal} /> : null}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          placeholder="Put something in"
          placeholderTextColor={signal}
          selectionColor={onSlab}
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="Put something in"
          accessibilityHint="Type anything and submit; then choose what it is — a to-do, a deadline, an idea, or a note."
          style={[styles.input, { color: onSlab }]}
        />
      </View>

      {/* With text: the send key drops it onto the board. Empty: the mic slab arms
          voice — both routes hand off to the resolver, neither leaves the board.
          The voice slab is a distinct tonal surface so it reads as a first-class
          capture instrument, not a trailing accessory. */}
      {hasText ? (
        <Pressable
          onPress={submit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Put it in"
          style={({ pressed }) => [
            styles.actionSlab,
            styles.inverseSlab,
            { backgroundColor: onSlab },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="ArrowUp" size={22} color={colors.accent.clay} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onVoice}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Capture by voice"
          style={({ pressed }) => [
            styles.actionSlab,
            { backgroundColor: voiceSlabFill },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="Microphone" size={22} color={onSlab} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Frameless: the DockShell owns radius, fill, clip, and elevation. The bar is
  // just the row of controls; it sizes the shell via its minHeight.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: tokens.radius.pill,
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.xs,
    gap: tokens.space.md,
    overflow: "hidden",
  },
  // Idle: split dock — text slab + voice slab. A small gap separates the two
  // so voice reads as its own instrument, not a trailing icon. Padding keeps
  // both slabs inset from the shell's clipped edge.
  idle: {
    padding: tokens.space.xs,
    gap: tokens.space.sm,
  },
  // Recording: controls inline, symmetric — the same interface object as the
  // resolver. The slab fill is the shell's; the waveform carries the live signal.
  recording: {
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  // The text slab carries the capture-mark + input. It stays transparent so the
  // DockShell's clay shows through; its left inset aligns with AddProjectBar.
  textSlab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 48,
    paddingLeft: tokens.space.md,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.size,
    fontFamily: tokens.type.fontInter.medium,
  },
  // Shared shape for the right-hand action slab (voice / send). 48×48 visual,
  // pill radius, 44pt touch target carried by hitSlop. The voice slab uses the
  // neutral pressed surface so it reads as a distinct slab; send uses the
  // inverse (onSlab fill, clay glyph).
  actionSlab: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  inverseSlab: {
    // backgroundColor applied at call-site.
  },
  pressed: {
    opacity: 0.6,
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
});
