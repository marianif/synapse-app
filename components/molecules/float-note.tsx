import { useEffect } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useEntryKicker, useEntryTint, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A note's drift home and the geometry of its float — all deterministic. */
export interface FloatSlot {
  /** Resting top-left of the card inside the canvas. */
  x: number;
  y: number;
  /** Drift ellipse radii (px). Small so the card never leaves its neighborhood. */
  ax: number;
  ay: number;
  /** Radians/seconds offsets so no two notes drift in phase. */
  phase: number;
  /** Resting tilt (deg) — hand-pinned, never axis-aligned. */
  tilt: number;
}

interface FloatNoteProps {
  /** The named thing — project title or idea title, in the hand voice. */
  subject: string;
  /** Small mono tag under the subject: "project" / "idea". */
  tag: string;
  /** Which entry-type palette the card body + kicker borrow. */
  paletteType: EntryType;
  slot: FloatSlot;
  width: number;
  onPress: () => void;
  accessibilityLabel: string;
}

/** Seconds for one full drift loop — slow enough to read as a breath, not a spin. */
const LOOP_SECONDS = 14;

/**
 * One free-floating note in the agenda's Float Field. It drifts along a small
 * deterministic ellipse around its resting slot (UI-thread Lissajous: x on the
 * loop's cosine, y on its sine at a different beat). Press-in halts the drift
 * where it stands and lifts the card so a thumb can land on it cleanly; release
 * resumes. Reduced motion pins it at rest. Tap opens what it's about.
 */
export function FloatNote({
  subject,
  tag,
  paletteType,
  slot,
  width,
  onPress,
  accessibilityLabel,
}: FloatNoteProps): React.ReactElement {
  const { colors } = useTheme();
  const tint = useEntryTint(paletteType);
  const kicker = useEntryKicker(paletteType);
  const reduced = useReducedMotion();

  // Drift clock: 0→1 on repeat. Frozen (cancelled) while held so the card stops
  // where it is instead of snapping home — you read it mid-float, not after.
  const progress = useSharedValue(0);
  // 0 at rest, 1 while pressed — drives the settle (drift→0) and the lift.
  const held = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: LOOP_SECONDS * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [reduced, progress]);

  const cardStyle = useAnimatedStyle(() => {
    const angle = progress.value * Math.PI * 2 + slot.phase;
    // Held → ease drift to zero (settle in place); else full ellipse.
    const settle = 1 - held.value;
    const dx = Math.cos(angle) * slot.ax * settle;
    const dy = Math.sin(angle * 1.3) * slot.ay * settle;
    const lift = withSpring(held.value, tokens.motion.spring);
    return {
      transform: [
        { translateX: slot.x + dx },
        { translateY: slot.y + dy },
        { rotate: `${slot.tilt * settle}deg` },
        { scale: 1 + lift * 0.06 },
      ],
    };
  });

  const shadowStyle = Platform.OS === "android" ? styles.shadowAndroid : styles.shadowIos;
  const dynamic = {
    width,
    backgroundColor: tint,
    shadowColor: tokens.color.scrim.shadow,
  };

  return (
    <AnimatedPressable
      onPressIn={() => {
        held.value = 1;
        cancelAnimation(progress); // freeze the drift where it stands
      }}
      onPressOut={() => {
        held.value = 0;
        if (!reduced) {
          progress.value = withRepeat(
            withTiming(1, {
              duration: LOOP_SECONDS * 1000,
              easing: Easing.linear,
            }),
            -1,
            false,
          );
        }
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens what this note is about"
      style={[styles.card, shadowStyle, dynamic, cardStyle]}
    >
      <Animated.View style={[styles.edge, { backgroundColor: kicker }]} />
      <ThemedText
        type="hand"
        numberOfLines={2}
        style={[styles.subject, { color: colors.ink }]}
      >
        {subject}
      </ThemedText>
      <ThemedText type="micro" style={[styles.tag, { color: kicker }]}>
        {tag}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    minHeight: 56,
    paddingVertical: tokens.space.sm,
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.sm,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    justifyContent: "center",
    gap: 2,
  },
  // Accent edge-bar carries the type identity without a 1px border.
  edge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  subject: {
    fontFamily: tokens.type.fontHand.bold,
  },
  tag: {
    opacity: 0.9,
  },
  shadowIos: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  shadowAndroid: {
    elevation: 3,
  },
});
