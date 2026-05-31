import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";
import type { Href } from "expo-router";

export interface RunwayItem {
  id: string;
  type: EntryType;
  title: string;
  /** Big mono readout: "2d", "5h", "now", "2d over", or "" when undated. */
  readout: string;
  /** 0 = far edge of the horizon, 1 = at the edge (due now). */
  fill: number;
  /** Past the edge — the bar burns over. */
  overdue: boolean;
  /** Has a due date at all. Undated stakes show an open-ended track. */
  dated: boolean;
}

interface RunwayGaugeProps {
  item: RunwayItem;
  href: Href;
}

const TRACK_HEIGHT = 8;

/**
 * One stake as a fuel gauge, not a list row. The track shows how much runway is
 * left before the edge (a fixed 14-day horizon): a far-out bill barely registers,
 * a due-tomorrow one is nearly full, an overdue one burns past the end. The big
 * mono number is the headline — Stakes is about time-to-edge, and the gauge says
 * that pre-attentively, before the title is even read. Undated stakes show an
 * open dashed end: on the field, no clock running.
 */
export function RunwayGauge({ item, href }: RunwayGaugeProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const code = entryColor(item.type);
  // The bar runs its own hue until it nears the edge, where it goes hot — the
  // one place the brand's danger signal earns full intensity.
  const barColor = item.overdue
    ? colors.feedback.danger
    : item.fill >= 0.8
      ? colors.feedback.danger
      : item.fill >= 0.55
        ? colors.feedback.warning
        : code;

  const progress = useSharedValue(reduced ? item.fill : 0);

  useEffect(() => {
    progress.value = reduced
      ? item.fill
      : withTiming(item.fill, { duration: tokens.motion.duration.slow });
  }, [item.fill, progress, reduced]);

  // scaleX from the left — transform only, never animate width (UI-thread safe).
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.0001, progress.value) }],
  }));

  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.readout ? `, ${item.readout}` : ", no deadline"}`}
      style={({ pressed }) => [styles.gauge, pressed && styles.pressed]}
      hitSlop={6}
    >
      <View style={styles.headRow}>
        <ThemedText
          type="item"
          numberOfLines={1}
          style={[styles.title, { color: colors.ink }]}
        >
          {item.title}
        </ThemedText>
        <ThemedText
          type="mono"
          style={[
            styles.readout,
            {
              color: item.overdue
                ? colors.feedback.danger
                : item.dated
                  ? colors.ink
                  : colors.inkMuted,
            },
          ]}
        >
          {item.dated ? item.readout : "no edge"}
        </ThemedText>
      </View>

      <View style={styles.trackRow}>
        <View
          style={[styles.track, { backgroundColor: colors.surfaceSubtle }]}
        >
          {item.dated ? (
            <Animated.View
              style={[
                styles.fill,
                { backgroundColor: barColor },
                fillStyle,
              ]}
            />
          ) : null}
        </View>
        {/* edge marker: coral when burnt past, solid ink with a clock, open
            ring when undated (no edge to race) */}
        <View
          style={[
            styles.edgeCap,
            {
              backgroundColor: item.overdue
                ? colors.feedback.danger
                : item.dated
                  ? colors.ink
                  : "transparent",
              borderColor: colors.inkMuted,
              borderWidth: item.dated ? 0 : 1,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gauge: {
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.xs,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  title: {
    flex: 1,
  },
  readout: {
    textAlign: "right",
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  track: {
    flex: 1,
    height: TRACK_HEIGHT,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    width: "100%",
    borderRadius: tokens.radius.pill,
    // anchor the scaleX to the left edge so it grows from "now"
    transformOrigin: "left",
  },
  edgeCap: {
    width: TRACK_HEIGHT,
    height: TRACK_HEIGHT,
    borderRadius: tokens.radius.pill,
  },
});
