import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { FieldRow } from "@/components/molecules/field-row";
import { tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";
import type { Href } from "expo-router";

interface FieldZoneProps {
  /** Mono kicker: "STAKES" / "PRESENT". */
  label: string;
  /** One-line read of what this zone is for, shown muted under the label. */
  caption: string;
  items: FieldRowItem[];
  /** Route a single row opens (detail by id). */
  itemHref: (item: FieldRowItem) => Href;
  /** Route the empty-state tap opens (capture / list for the zone). */
  zoneHref: Href;
  emptyHint: string;
  /** Stagger index for the entrance spring. */
  index?: number;
}

/**
 * A band of the Field Lab board. Not a card — a labelled region of the
 * instrument panel. The mono kicker + tabular count read as a readout
 * ("PRESENT ·8"); the rows below glow by their own heat so the zone reads as a
 * charged field, not a list. STAKES and PRESENT use the same component at equal
 * visual volume — that equality is the whole point: nothing fades for lacking a
 * deadline.
 */
export function FieldZone({
  label,
  caption,
  items,
  itemHref,
  zoneHref,
  emptyHint,
  index = 0,
}: FieldZoneProps): React.ReactElement {
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
          {label}
        </ThemedText>
        <ThemedText type="mono" style={[styles.count, { color: colors.ink }]}>
          {`·${items.length}`}
        </ThemedText>
      </View>

      <ThemedText
        type="caption"
        style={[styles.caption, { color: colors.inkMuted }]}
      >
        {caption}
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
        <View style={styles.rows}>
          {items.map((item) => (
            <FieldRow key={item.id} item={item} href={itemHref(item)} />
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
  count: {},
  caption: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.sm,
  },
  rows: {
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
