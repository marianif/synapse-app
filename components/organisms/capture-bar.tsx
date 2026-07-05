import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
import { tokens, useTheme } from "@/constants/theme";

const WAVEFORM_BARS = 9;

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
 * Lab is an instrument panel (mono readouts, sharp corners, saturated edge-bars
 * carrying structure), and this is where anything enters the board: a todo, a
 * deadline, an idea, a note. It belongs to no single type, so it wears the
 * NEUTRAL grammar (never a type tint) — dressing it in amber made it read as
 * "ideas only", the exact confusion we're undoing.
 *
 * This component is now FRAMELESS: the surrounding frame, fill, radius,
 * elevation, and entrance belong to `DockShell`. The bar renders only its row of
 * controls on a transparent ground, so the shell can morph the panel in place
 * (idle line ↔ recorder) without the bar popping between shapes. Idle it's a
 * live text line you FILL (a breathing capture-mark, an inline TextInput, a
 * first-class mic) on the shell's `surface` fill; recording, the shell flips to
 * the neutral slab and the bar renders on-slab inks with a live waveform and
 * inline discard / keep. Typing + ↵ (or the send key) hands the thought to the
 * capture resolver — no navigation, no type decided up front.
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

  // Neutral interface grammar: the mic glyph reads as an affordance, not a type.
  // inkMuted tracks the scheme and clears AA on the surface in both.
  const signal = colors.inkMuted;

  // Recording: the shell has flipped to the neutral action slab, so the bar
  // renders on-slab — the same interface object as the resolver, never a type
  // chrome. The "listening" life lives in the moving waveform as a SIGNAL,
  // tinted with the on-slab ink so it stays legible in both schemes.
  if (isRecording) {
    const onSlab = colors.accent.onClay;

    return (
      <View style={[styles.bar, styles.recording]}>
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Discard recording"
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="close" size={22} color={onSlab} />
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
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="check" size={24} color={onSlab} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.bar, styles.idle]}>
      <View style={[styles.edge, { backgroundColor: colors.inkMuted }]} />

      {/* The line you FILL: a pulsing capture-mark + inline TextInput. ↵ drops the
          thought onto the board; the mark hides once typing starts (the cursor
          takes over). */}
      <View style={styles.prompt}>
        {!hasText ? <CapturePulse tint={signal} /> : null}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          placeholder="Put something in"
          placeholderTextColor={colors.inkMuted}
          selectionColor={colors.ink}
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="Put something in"
          accessibilityHint="Type anything and submit; then choose what it is — a to-do, a deadline, an idea, or a note."
          style={[styles.input, { color: colors.ink }]}
        />
      </View>

      {/* With text: the send key drops it onto the board. Empty: the mic arms
          voice — both routes hand off to the resolver, neither leaves the board. */}
      {hasText ? (
        <Pressable
          onPress={submit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Put it in"
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: colors.accent.clay },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-up"
            size={22}
            color={colors.accent.onClay}
          />
        </Pressable>
      ) : (
        <Pressable
          onPress={onVoice}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Capture by voice"
          style={({ pressed }) => [styles.micBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="microphone" size={22} color={signal} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * The capture prompt — a neutral capture-mark (a plus) marking "fill this line."
 * Type-agnostic: the bar no longer belongs to ideas, so the mark is a plain
 * interface glyph, not a type glyph. It breathes rather than blinks: one long,
 * slow sine-eased opacity swell between 0.6 and 1, no snap or hold, so it reads
 * as a calm presence, not a compulsive pulse. The breath fades opacity, never
 * the hue — tinted with the passed-in neutral signal.
 */
function CapturePulse({ tint }: { tint: string }): React.ReactElement {
  const reduced = useReducedMotion();
  const breath = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      breath.value = 1;
      return;
    }
    // One slow, symmetric swell — withRepeat reverses it, so a single eased
    // timing gives a smooth in-out with no perceptible edges.
    breath.value = withRepeat(
      withTiming(0.6, {
        duration: 2200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [breath, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: breath.value }));

  return (
    <Animated.View style={style}>
      <MaterialCommunityIcons name="plus" size={22} color={tint} />
    </Animated.View>
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
        withTiming(6, { duration: 200 }),
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
  // Frameless: the DockShell owns radius, fill, clip, and elevation. The bar is
  // just the row of controls; it sizes the shell via its minHeight.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
  },
  // Idle: a command line — left edge-bar, prompt, mic.
  idle: {
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.xs,
  },
  // Recording: controls inline, symmetric — the same interface object as the
  // resolver. The slab fill is the shell's; the waveform carries the live signal.
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
  prompt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 56,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.size,
    fontFamily: tokens.type.fontInter.medium,
  },
  micBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // Send key: the one moment clay appears in the idle bar — a charged enter key.
  // hitSlop carries it to the 44pt target; the visual key stays a tight 36pt
  // square so it reads as a key inside the line, not a second slab.
  sendBtn: {
    width: 36,
    height: 36,
    marginHorizontal: tokens.space.xs,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
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
