import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  chipInk,
  entryColor,
  tokens,
  useEntryKicker,
  useEntryTint,
  useTheme,
} from "@/constants/theme";

import type { EntryType } from "@/lib/types";
import type { Href } from "expo-router";

/** How close in time an item is — drives its visual weight, not its position. */
export type Urgency = "looming" | "near" | "distant";

export interface FieldTileItem {
  id: string;
  title: string;
  /** Absolute when-label: "Tomorrow", "12 Jun", "Aug". */
  when?: string;
  urgency: Urgency;
}

interface FieldTileProps {
  type: EntryType;
  label: string;
  items: FieldTileItem[];
  href: Href;
  itemHref?: (item: FieldTileItem) => Href;
  emptyHint: string;
  /** Stagger index for the entrance spring. */
  index?: number;
}

const URGENCY_RANK: Record<Urgency, number> = { looming: 0, near: 1, distant: 2 };

/**
 * A category of The Field. Grouped by type, but the items inside are NOT a
 * uniform list — each entry's weight is set by how soon it matters, so the
 * group reads as a gradient of pressure: a due-tomorrow item physically
 * dominates, a distant maybe shrinks to a murmur. Urgency is pre-attentive;
 * you see what's pressing before you read a date. The soft type-tint + the
 * saturated edge-bar (no border) hold it together.
 */
export function FieldTile({
  type,
  label,
  items,
  href,
  itemHref,
  emptyHint,
  index = 0,
}: FieldTileProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const tint = useEntryTint(type);
  const code = entryColor(type);
  const kicker = useEntryKicker(type);
  const reduced = useReducedMotion();

  // Looming items lead; distant ones recede to the tail. Cap the murmur so a
  // huge backlog of somedays can't bury the pressing few — "+N more" carries it.
  const sorted = [...items].sort(
    (a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency],
  );
  const looming = sorted.filter((i) => i.urgency === "looming");
  const rest = sorted.filter((i) => i.urgency !== "looming");
  const restCap = looming.length > 0 ? 3 : 5;
  const shown = [...looming, ...rest.slice(0, restCap)];
  const remaining = items.length - shown.length;

  const entering = reduced
    ? undefined
    : FadeInDown.springify()
        .damping(tokens.motion.spring.damping)
        .stiffness(tokens.motion.spring.stiffness)
        .delay(index * 60);

  const press = (item: FieldTileItem) =>
    router.push(itemHref ? itemHref(item) : href);

  return (
    <Animated.View entering={entering}>
      <Pressable
        onPress={() => router.push(href)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${label}, ${items.length} ${
          items.length === 1 ? "item" : "items"
        }`}
        style={[styles.tile, { backgroundColor: tint }, tokens.elevation.tile]}
      >
        <View style={[styles.edge, { backgroundColor: code }]} />

        <ThemedText type="label" style={[styles.kicker, { color: kicker }]}>
          {label}
        </ThemedText>

        {shown.length === 0 ? (
          <ThemedText type="body" style={[styles.empty, { color: kicker }]}>
            {emptyHint}
          </ThemedText>
        ) : (
          <View style={styles.items}>
            {shown.map((item) =>
              item.urgency === "looming" ? (
                <Pressable
                  key={item.id}
                  onPress={() => press(item)}
                  style={styles.looming}
                  hitSlop={6}
                >
                  <View style={[styles.loomChip, { backgroundColor: kicker }]}>
                    <ThemedText
                      type="caption"
                      style={[styles.loomWhen, { color: chipInk() }]}
                    >
                      {item.when ?? "Now"}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="title"
                    numberOfLines={2}
                    style={{ color: colors.ink }}
                  >
                    {item.title}
                  </ThemedText>
                </Pressable>
              ) : item.urgency === "near" ? (
                <Pressable
                  key={item.id}
                  onPress={() => press(item)}
                  style={styles.near}
                  hitSlop={8}
                >
                  <View style={[styles.dot, { backgroundColor: code }]} />
                  <ThemedText
                    type="item"
                    numberOfLines={1}
                    style={[styles.nearTitle, { color: colors.ink }]}
                  >
                    {item.title}
                  </ThemedText>
                  {item.when ? (
                    <ThemedText
                      type="caption"
                      style={[styles.when, { color: kicker }]}
                    >
                      {item.when}
                    </ThemedText>
                  ) : null}
                </Pressable>
              ) : (
                <Pressable
                  key={item.id}
                  onPress={() => press(item)}
                  style={styles.distant}
                  hitSlop={12}
                >
                  <ThemedText
                    type="body"
                    numberOfLines={1}
                    style={[styles.distantTitle, { color: colors.inkMuted }]}
                  >
                    {item.title}
                  </ThemedText>
                  {item.when ? (
                    <ThemedText
                      type="caption"
                      style={[styles.when, { color: colors.inkMuted }]}
                    >
                      {item.when}
                    </ThemedText>
                  ) : null}
                </Pressable>
              ),
            )}
            {remaining > 0 ? (
              <ThemedText type="caption" style={[styles.more, { color: kicker }]}>
                +{remaining} more
              </ThemedText>
            ) : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.space.lg,
    paddingLeft: tokens.space.xl,
    paddingRight: tokens.space.lg,
    gap: tokens.space.md,
    overflow: "hidden",
  },
  // saturated edge-bar replaces a 1px border (DESIGN.md)
  edge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  kicker: {},
  empty: {
    opacity: 0.75,
  },
  items: {
    gap: tokens.space.md,
  },

  // looming — owns the group. solid code chip + large serif title.
  looming: {
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
    minHeight: 44,
  },
  loomChip: {
    alignSelf: "flex-start",
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  loomWhen: {
    // kicker on the solid code — paper text clears contrast on the saturated fill
  },

  // near — normal presence. dot + medium item title + when.
  near: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: tokens.radius.pill,
  },
  nearTitle: {
    flex: 1,
  },

  // distant — a murmur. muted body, no dot, tight.
  distant: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 32,
  },
  distantTitle: {
    flex: 1,
  },

  when: {
    textAlign: "right",
  },
  more: {
    paddingTop: tokens.space.xs,
  },
});
