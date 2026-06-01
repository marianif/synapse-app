import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";
import type { Href } from "expo-router";

/** One stake's data shape, derived from a DbEntry by the home screen. */
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
  /** Has a due date at all. Undated stakes show no clock. */
  dated: boolean;
}

// The OVER chip sits on the bright danger code; like every bright-code slab its
// text must be a FIXED cool-near-black in both schemes (4.75:1) — a scheme-
// flipping ink would fail AA on danger in light (3.2:1). Reuses dark-paper.
const ON_SIGNAL = tokens.color.dark.paper;

interface StakeRowProps {
  item: RunwayItem;
  href: Href;
}

/**
 * One uniform stake row: a mono countdown, the title, an OVER chip (overdue) or
 * a type dot, and a thin burndown bar showing how much runway is left. Heat is
 * COLOR-only — the bar, dot, and chip go danger-red when overdue — so the thing
 * about to bite reads first without making rows unequal. The countdown stays
 * `ink` (bulletproof AA); the danger signal rides the solid fills, never text.
 */
export function StakeRow({ item, href }: StakeRowProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const code = entryColor(item.type);
  const signal = item.overdue ? colors.feedback.danger : code;

  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.readout ? `, ${item.readout}` : ", no deadline"}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      hitSlop={4}
    >
      <View style={styles.rowHead}>
        {/* Countdown leads — ink for bulletproof AA; heat rides the bar + dot. */}
        <ThemedText type="mono" style={[styles.readout, { color: colors.ink }]}>
          {item.dated ? item.readout : "—"}
        </ThemedText>

        <ThemedText
          type="item"
          numberOfLines={1}
          style={[styles.title, { color: colors.ink }]}
        >
          {item.title}
        </ThemedText>

        {item.overdue ? (
          <View style={[styles.overChip, { backgroundColor: signal }]}>
            <ThemedText type="label" style={{ color: ON_SIGNAL }}>
              OVER
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.dot, { backgroundColor: signal }]} />
        )}
      </View>

      {item.dated ? (
        <Burndown fill={item.fill} color={signal} reduced={reduced} />
      ) : null}
    </Pressable>
  );
}

/** The burndown bar — a track that fills toward the edge. scaleX from the left,
 *  transform-only (UI-thread safe). */
function Burndown({
  fill,
  color,
  reduced,
}: {
  fill: number;
  color: string;
  reduced: boolean;
}): React.ReactElement {
  const { colors } = useTheme();
  const progress = useSharedValue(reduced ? fill : 0);

  useEffect(() => {
    progress.value = reduced
      ? fill
      : withTiming(fill, { duration: tokens.motion.duration.slow });
  }, [fill, progress, reduced]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.0001, progress.value) }],
  }));

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceSubtle }]}>
      <Animated.View
        style={[styles.trackFill, { backgroundColor: color }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.xs,
    borderRadius: tokens.radius.md,
    minHeight: 44,
    justifyContent: "center",
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  readout: {
    minWidth: 56,
  },
  title: {
    flex: 1,
  },
  overChip: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: tokens.radius.pill,
  },
  track: {
    height: 4,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    width: "100%",
    borderRadius: tokens.radius.pill,
    transformOrigin: "left",
  },
  pressed: {
    opacity: 0.7,
  },
});
