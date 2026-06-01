import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { StakeRow } from "@/components/molecules/stake-row";
import { tokens, useTheme } from "@/constants/theme";

import type { RunwayItem } from "@/components/molecules/stake-row";
import type { Href } from "expo-router";

/** At most this many rows on the board; the rest live behind "See all". */
const MAX_ROWS = 5;

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
