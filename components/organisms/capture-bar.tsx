import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

const WAVEFORM_BARS = 9;

// The capture bar wears the ideas/amber code (it captures ideas). Amber is a
// bright code, so its text + glyphs must be a FIXED cool-near-black in BOTH
// schemes (10.4:1) — never a scheme-flipping ink, which would fail AA on amber
// in light (1.5:1). Reuses the dark-paper token value, not a new one.
const ON_AMBER = tokens.color.dark.paper;

interface CaptureBarProps {
  /** Save a typed idea inline (the bar is the quick idea line). */
  onSubmitIdea?: (text: string) => void;
  /** Tap the mic to arm voice capture (visible, first-class route). */
  onVoice?: () => void;
  isRecording?: boolean;
  transcript?: string;
  onStop?: () => void;
  onCancel?: () => void;
}

/**
 * The board's command line — the quick IDEA capture instrument. Field Lab is an
 * instrument panel (mono readouts, sharp corners, saturated edge-bars carrying
 * structure), and this is the one always-on input on it. It wears the ideas/
 * amber code because it captures ideas. Idle it's a live text line you FILL: an
 * amber edge-bar (the capture channel), a blinking mono caret, an inline
 * TextInput, and a first-class mic. Typing + ↵ (or the send key) saves the note
 * straight as an idea into the Present cloud — no navigation. The mic arms voice
 * (also an idea). Richer entries (bills, deadlines, events, dates) live in the
 * Add tab, not here. Recording it goes full amber — the one moment the code goes
 * full-bleed — with a live waveform, the streaming transcript, and inline
 * discard / keep. The color shift IS the "listening" signal.
 */
export function CaptureBar({
  onSubmitIdea,
  onVoice,
  isRecording = false,
  transcript = "",
  onStop,
  onCancel,
}: CaptureBarProps): React.ReactElement {
  const { scheme, colors } = useTheme();
  const [draft, setDraft] = useState("");
  const hasText = draft.trim().length > 0;

  const submit = (): void => {
    if (!hasText) return;
    onSubmitIdea?.(draft.trim());
    setDraft("");
  };

  // Bright amber clears AA on the dark surface (8.98:1) but fails on the light
  // one (1.6:1). The amber identity rides the always-on edge-bar (a solid bar,
  // not a contrast-bound glyph); the caret + mic glyph fall back to inkMuted in
  // light so the affordances stay legible. Edge-bar stays amber in both schemes.
  const signal = scheme === "dark" ? colors.type.ideas : colors.inkMuted;

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
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Discard recording"
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="close" size={22} color={ON_AMBER} />
        </Pressable>

        <View style={styles.center}>
          {transcript ? (
            <ThemedText
              type="item"
              numberOfLines={1}
              style={[styles.transcript, { color: ON_AMBER }]}
            >
              {transcript}
            </ThemedText>
          ) : (
            <Waveform tint={ON_AMBER} />
          )}
        </View>

        <Pressable
          onPress={onStop}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Save capture"
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="check" size={24} color={ON_AMBER} />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bar,
        styles.idle,
        { backgroundColor: colors.surface },
        tokens.elevation.capture,
      ]}
    >
      <View style={[styles.edge, { backgroundColor: colors.type.ideas }]} />

      {/* The line you FILL: a blinking caret + inline TextInput. ↵ saves the
          idea; the caret hides once typing starts (the cursor takes over). */}
      <View style={styles.prompt}>
        {!hasText ? <Caret color={signal} /> : null}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder="Quick capture an idea"
          placeholderTextColor={colors.inkMuted}
          selectionColor={colors.type.ideas}
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="Capture a thought"
          accessibilityHint="Type a note and submit to save it as an idea."
          style={[styles.input, { color: colors.ink }]}
        />
      </View>

      {/* With text: a send key saves the idea. Empty: the mic arms voice —
          both routes land an idea, neither leaves the board. */}
      {hasText ? (
        <Pressable
          onPress={submit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Save idea"
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: colors.type.ideas },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="arrow-up" size={22} color={ON_AMBER} />
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
 * The command-line caret — a blinking mono prompt that says "fill this line."
 * Color is the scheme-resolved signal (amber in dark, inkMuted in light); the
 * amber identity is carried by the always-visible edge-bar, not this glyph.
 */
function Caret({ color }: { color: string }): React.ReactElement {
  const reduced = useReducedMotion();
  const blink = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      blink.value = 1;
      return;
    }
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 540 }),
        withDelay(120, withTiming(0.15, { duration: 220 })),
      ),
      -1,
      true,
    );
  }, [blink, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <Animated.Text style={[styles.caret, { color }, style]}>
      {"›"}
    </Animated.Text>
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
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  // Idle: a command line — left edge-bar, prompt, mic. Sharp instrument corner.
  idle: {
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.xs,
  },
  // Recording: the one full-clay moment — symmetric, controls inline.
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
  caret: {
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.size,
    fontFamily: tokens.type.fontMono.bold,
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
