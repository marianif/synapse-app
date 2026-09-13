import {
  Canvas,
  Circle,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useHabitTone, useTheme } from "@/constants/theme";
import { HUE_STOPS, normalizeHue } from "@/lib/habit-color";

const SIZE = 212;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const THUMB = 13;
const PREVIEW = 92;
const STEP = 15; // degrees per accessibility adjust

interface HabitColorWheelProps {
  /** Current hue, or null for neutral. */
  hue: number | null;
  /** Committed on release / tap — the caller persists this. */
  onChange: (hue: number) => void;
  /** Clears back to neutral. */
  onClear: () => void;
  /**
   * Renders the glyph inside the preview, receiving the ink that reads on the
   * chosen color. The preview shows the actual pick (the vivid `mark`), not a
   * desaturated variant.
   */
  renderCenter?: (ink: string) => React.ReactNode;
}

/**
 * The free hue wheel: a Skia sweep-gradient ring the user drags to pick any
 * hue, with a live preview in the middle. The system derives every tone from
 * the hue (lib/habit-color.ts), so this control only ever emits a number —
 * never a hex — and readability is guaranteed downstream.
 *
 * The wheel is not screen-reader operable by itself, so the wrapper is an
 * accessible adjustable: increment / decrement step the hue 15° at a time.
 */
export function HabitColorWheel({
  hue,
  onChange,
  onClear,
  renderCenter,
}: HabitColorWheelProps): React.ReactElement {
  const { colors } = useTheme();
  const [displayHue, setDisplayHue] = useState<number | null>(hue);
  const angle = useSharedValue(((hue ?? 0) * Math.PI) / 180);
  const lastEmit = useSharedValue(0);

  // Re-seed when the parent value changes (open, neutral reset).
  useEffect(() => {
    setDisplayHue(hue);
    angle.value = ((hue ?? 0) * Math.PI) / 180;
  }, [hue, angle]);

  const tone = useHabitTone(displayHue);

  const thumbX = useDerivedValue(() => CENTER + RADIUS * Math.cos(angle.value));
  const thumbY = useDerivedValue(() => CENTER + RADIUS * Math.sin(angle.value));

  const commit = (a: number): void => {
    const next = normalizeHue((a * 180) / Math.PI);
    setDisplayHue(next);
    onChange(next);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      "worklet";
      const a = Math.atan2(e.y - CENTER, e.x - CENTER);
      angle.value = a;
      runOnJS(setDisplayHue)(((a * 180) / Math.PI + 360) % 360);
    })
    .onChange((e) => {
      "worklet";
      const a = Math.atan2(e.y - CENTER, e.x - CENTER);
      angle.value = a;
      const now = Date.now();
      if (now - lastEmit.value > 70) {
        lastEmit.value = now;
        runOnJS(setDisplayHue)(((a * 180) / Math.PI + 360) % 360);
      }
    })
    .onEnd(() => {
      "worklet";
      runOnJS(commit)(angle.value);
      runOnJS(Haptics.selectionAsync)();
    });

  const adjust = (delta: number): void => {
    const next = normalizeHue((displayHue ?? 0) + delta);
    setDisplayHue(next);
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={pan}>
        <View style={styles.wheel} accessibilityElementsHidden>
          <Canvas style={{ width: SIZE, height: SIZE }}>
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} style="stroke" strokeWidth={STROKE}>
              <SweepGradient c={vec(CENTER, CENTER)} colors={HUE_STOPS} />
            </Circle>
            {displayHue !== null ? (
              <>
                <Circle cx={thumbX} cy={thumbY} r={THUMB} color={colors.paper} />
                <Circle
                  cx={thumbX}
                  cy={thumbY}
                  r={THUMB}
                  style="stroke"
                  strokeWidth={2.5}
                  color={colors.ink}
                />
              </>
            ) : null}
          </Canvas>

          {/* Live preview: the exact chosen color with the habit's own glyph. */}
          <View
            pointerEvents="none"
            style={[
              styles.preview,
              {
                backgroundColor: tone?.mark ?? colors.surfaceSubtle,
              },
            ]}
          >
            {renderCenter?.(tone?.onMark ?? colors.inkMuted)}
          </View>
        </View>
      </GestureDetector>

      {/* The wheel is a custom control; expose it as an adjustable so
          VoiceOver / TalkBack can step the hue without a drag gesture. */}
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Habit color hue"
        accessibilityValue={{
          text:
            displayHue === null
              ? "Neutral"
              : `Hue ${Math.round(displayHue)} degrees`,
        }}
        accessibilityActions={[
          { name: "increment", label: "Warmer hue" },
          { name: "decrement", label: "Cooler hue" },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") adjust(STEP);
          if (event.nativeEvent.actionName === "decrement") adjust(-STEP);
        }}
        style={styles.accessibilityHost}
      />

      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel="Neutral habit color"
        accessibilityState={{ selected: hue === null }}
        style={({ pressed }) => [
          styles.neutralChip,
          {
            backgroundColor:
              hue === null ? `${colors.inkMuted}22` : colors.surfaceSubtle,
          },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.neutralDot,
            { backgroundColor: colors.inkMuted },
            hue !== null && styles.neutralDotIdle,
          ]}
        />
        <ThemedText
          type="caption"
          style={{
            color: hue === null ? colors.ink : colors.inkMuted,
            fontWeight: hue === null ? "700" : "400",
          }}
        >
          Neutral
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: tokens.space.md,
  },
  wheel: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    position: "absolute",
    width: PREVIEW,
    height: PREVIEW,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  accessibilityHost: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    left: -1000,
    top: 0,
  },
  neutralChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 32,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
  },
  neutralDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  neutralDotIdle: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
