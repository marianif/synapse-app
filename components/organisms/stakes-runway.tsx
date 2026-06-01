import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
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

/** At most this many rows on the board; the rest live behind "See all". */
const MAX_ROWS = 5;

// The OVER chip sits on the bright danger code; like every bright-code slab its
// text must be a FIXED cool-near-black in both schemes (4.75:1) — a scheme-
// flipping ink would fail AA on danger in light (3.2:1). Reuses dark-paper.
const ON_SIGNAL = tokens.color.dark.paper;

interface StakesRunwayProps {
  items: RunwayItem[];
  /** Route a single stake opens (detail by id). */
  itemHref: (item: RunwayItem) => Href;
  /** Route the header + "See all" opens (the full list). */
  zoneHref: Href;
  emptyHint: string;
  /** Stagger index for the entrance spring. */
  index?: number;
}

/**
 * The STAKES zone — a uniform burndown list, sorted hottest-first. Every stake
 * is the same row: a mono countdown leading, the title, and a thin burndown bar
 * showing how much runway is left before the edge. Heat lives in COLOR, not size
 * — the bar and the countdown go danger-red when overdue, so the thing about to
 * bite reads first without making rows unequal. Capped at five; the rest sit
 * behind a "See all" CTA into the full list, so the board never becomes a wall.
 *
 * Token policy: the countdown stays `ink` (bulletproof AA); the danger signal
 * rides the bar + edge-dot (solid fills, not text), the same identity-on-fill /
 * legibility-on-ink split the capture bar uses. No new token values.
 */
export function StakesRunway({
  items,
  itemHref,
  zoneHref,
  emptyHint,
  index = 0,
}: StakesRunwayProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const shown = items.slice(0, MAX_ROWS);
  const overflow = items.length - shown.length;

  const entering = reduced
    ? undefined
    : FadeInDown.springify()
        .damping(tokens.motion.spring.damping)
        .stiffness(tokens.motion.spring.stiffness)
        .delay(index * 70);

  return (
    <Animated.View entering={entering} style={styles.zone}>
      <Pressable
        style={styles.header}
        onPress={() => router.push(zoneHref)}
        accessibilityRole="button"
        accessibilityLabel={`Stakes, ${items.length}. See all.`}
      >
        <ThemedText type="label" style={{ color: colors.inkMuted }}>
          Stakes
        </ThemedText>
        <ThemedText type="mono" style={{ color: colors.ink }}>
          {`·${items.length}`}
        </ThemedText>
      </Pressable>

      <ThemedText
        type="caption"
        style={[styles.caption, { color: colors.inkMuted }]}
      >
        What&apos;s burning down.
      </ThemedText>

      {items.length === 0 ? (
        <Pressable
          onPress={() => router.push(zoneHref)}
          style={[styles.empty, { backgroundColor: colors.surfaceSubtle }]}
          accessibilityRole="button"
          accessibilityLabel={emptyHint}
        >
          <ThemedText
            type="body"
            style={[styles.emptyText, { color: colors.inkMuted }]}
          >
            {emptyHint}
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.stack}>
          {shown.map((item) => (
            <StakeRow key={item.id} item={item} href={itemHref(item)} />
          ))}

          {overflow > 0 ? (
            <Pressable
              onPress={() => router.push(zoneHref)}
              accessibilityRole="button"
              accessibilityLabel={`See all ${items.length} stakes`}
              style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
              hitSlop={6}
            >
              <ThemedText
                type="label"
                style={[styles.seeAllText, { color: colors.inkMuted }]}
              >
                See all
              </ThemedText>
              <ThemedText
                type="mono"
                style={[styles.seeAllCount, { color: colors.inkMuted }]}
              >
                {`+${overflow} →`}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

interface StakeRowProps {
  item: RunwayItem;
  href: Href;
}

/** One uniform stake row: countdown, title, burndown bar. Heat is color-only. */
function StakeRow({ item, href }: StakeRowProps): React.ReactElement {
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
        <ThemedText
          type="mono"
          style={[styles.readout, { color: colors.ink }]}
        >
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
  zone: {
    gap: tokens.space.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.md,
  },
  caption: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.sm,
  },
  stack: {
    gap: tokens.space.xs,
  },

  // Uniform row.
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

  // Burndown track.
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

  // See-all CTA.
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: tokens.space.md,
  },
  seeAllText: {},
  seeAllCount: {},

  pressed: {
    opacity: 0.7,
  },
  empty: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  emptyText: {
    opacity: 0.85,
  },
});
