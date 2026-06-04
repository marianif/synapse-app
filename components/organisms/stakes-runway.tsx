import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { StakeRow } from "@/components/molecules/stake-row";
import { tokens, useTheme } from "@/constants/theme";

import type { RunwayItem } from "@/components/molecules/stake-row";
import type { Href } from "expo-router";

/** At most this many LIVE rows on the board; the rest live behind "See all". */
const MAX_ROWS = 5;

interface StakesRunwayProps {
  /** Open stakes, hottest-first. The pressure list. */
  items: RunwayItem[];
  /** Stakes marked done recently, struck-through. Sits below the rule. */
  done?: RunwayItem[];
  /** Clear the whole recently-cleared run. Omit to hide the affordance. */
  onClearDone?: () => void;
  /** Route a single stake opens (detail by id). */
  itemHref: (item: RunwayItem) => Href;
  /** Route the header + "See all" opens (the full list). */
  zoneHref: Href;
  emptyHint: string;
  /** Stagger index for the entrance spring. */
  index?: number;
}

/**
 * The STAKES zone — an editorial agenda of what's bearing down, read top to
 * bottom like a printed schedule. Each line is title-first with a trailing mono
 * when-label; heat lives in COLOR and TYPE, never in a meter (the old burndown
 * bar implied "progress", which a deadline doesn't have). Below a tonal rule, a
 * quiet "Recently cleared" run shows what's been marked done lately (by recency
 * of the DONE action, not the due date — a year-out deadline finished early still
 * shows), struck-through — seeing crossed-off lines is the activating moment.
 *
 * The ·N header count and the five-row cap track LIVE stakes only, so the number
 * always means "how much is on the line" — done rows never inflate it or crowd
 * live ones behind "See all".
 *
 * Token policy: danger rides the overdue countdown + OVER fill; success (calm
 * sage) rides the done check; the rule is a tonal `surfaceSubtle` shift, not a
 * 1px border. No new token values.
 */
export function StakesRunway({
  items,
  done = [],
  onClearDone,
  itemHref,
  zoneHref,
  emptyHint,
  index = 0,
}: StakesRunwayProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  // Subtle look, destructive consequence — so a stray tap gets one soft confirm
  // before these completed entries are gone for good (history included).
  const confirmClearDone = (): void => {
    if (!onClearDone) return;
    Alert.alert(
      "Clear recently cleared?",
      `Remove ${done.length} cleared ${done.length === 1 ? "stake" : "stakes"} for good. This can't be undone.`,
      [
        { text: "Keep", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: onClearDone },
      ],
    );
  };

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

      {items.length === 0 && done.length === 0 ? (
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
              style={({ pressed }) => [
                styles.seeAll,
                pressed && styles.pressed,
              ]}
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

          {done.length > 0 ? (
            <>
              <View style={styles.ruleRow}>
                <ThemedText
                  type="micro"
                  style={[styles.doneKicker, { color: colors.inkMuted }]}
                >
                  Recently cleared
                </ThemedText>
                <View
                  style={[
                    styles.rule,
                    { backgroundColor: colors.surfaceSubtle },
                  ]}
                />
                {onClearDone ? (
                  <Pressable
                    onPress={confirmClearDone}
                    accessibilityRole="button"
                    accessibilityLabel={`Clear ${done.length} recently cleared stakes`}
                    hitSlop={10}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <ThemedText
                      type="micro"
                      style={[styles.clearAction, { color: colors.inkMuted }]}
                    >
                      Clear
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>

              {done.map((item) => (
                <StakeRow key={item.id} item={item} href={itemHref(item)} />
              ))}
            </>
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

  // "Done this week" divider — a tonal rule, not a border, with an inline kicker.
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.xs,
  },
  rule: {
    flex: 1,
    height: 2,
    borderRadius: tokens.radius.pill,
  },
  doneKicker: {},
  // Quiet, no icon, no danger colour — reads as tidying, not deleting. The
  // confirm carries the weight; the affordance stays calm.
  clearAction: {
    textDecorationLine: "underline",
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
