import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { RunwayGauge } from "@/components/molecules/runway-gauge";
import { tokens, useTheme } from "@/constants/theme";

import type { RunwayItem } from "@/components/molecules/runway-gauge";
import type { Href } from "expo-router";

interface StakesRunwayProps {
  items: RunwayItem[];
  /** Route a single gauge opens (detail by id). */
  itemHref: (item: RunwayItem) => Href;
  /** Route the empty-state tap opens. */
  zoneHref: Href;
  emptyHint: string;
  /** Stagger index for the entrance spring. */
  index?: number;
}

/**
 * The STAKES zone, rendered as a runway of fuel gauges instead of a list. Same
 * mono header as the PRESENT zone (the two zones are siblings), but the body
 * diverges hard: Stakes races a clock, so each item is a time-to-edge gauge.
 * That divergence is the design — the eye sees "things burning down" vs "things
 * glowing," not two identical row-stacks.
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

  const entering = reduced
    ? undefined
    : FadeInDown.springify()
        .damping(tokens.motion.spring.damping)
        .stiffness(tokens.motion.spring.stiffness)
        .delay(index * 70);

  return (
    <Animated.View entering={entering} style={styles.zone}>
      <View style={styles.header}>
        <ThemedText
          type="label"
          style={[styles.kicker, { color: colors.inkMuted }]}
        >
          Stakes
        </ThemedText>
        <ThemedText type="mono" style={{ color: colors.ink }}>
          {`·${items.length}`}
        </ThemedText>
      </View>

      <ThemedText
        type="caption"
        style={[styles.caption, { color: colors.inkMuted }]}
      >
        Time to the edge.
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
        <View style={styles.gauges}>
          {items.map((item) => (
            <RunwayGauge key={item.id} item={item} href={itemHref(item)} />
          ))}
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
  kicker: {},
  caption: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.sm,
  },
  gauges: {
    gap: tokens.space.xs,
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
