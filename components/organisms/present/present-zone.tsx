import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

import { PresentConstellation } from "./present-constellation";
import { PresentMosaic } from "./present-mosaic";

import type { PresentItem } from "@/lib/present";
import type { Href } from "expo-router";

interface PresentZoneProps {
  items: PresentItem[];
  itemHref: (item: PresentItem) => Href;
  zoneHref: Href;
  emptyHint: string;
  index?: number;
}

/**
 * The PRESENT zone, split by how each kind of thing behaves — not one form.
 * Ideas + somedays are formless thoughts with no shape or date, so they graze
 * as a freshness CLOUD (bright when caught, ghosting as they age, never gone).
 * Events have a date and a shape, so they get a MOSAIC of dated tiles. Same mono
 * header as Stakes (siblings), but the body is two sub-fields, never a list.
 */
export function PresentZone({
  items,
  itemHref,
  zoneHref,
  emptyHint,
  index = 0,
}: PresentZoneProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  // Cloud carries the formless thoughts; mosaic carries the dated events.
  const thoughts = items.filter(
    (i) => i.type === "idea" || i.type === "someday",
  );
  const events = items.filter((i) => i.type === "event");

  const entering = reduced
    ? undefined
    : FadeInDown.springify()
        .damping(tokens.motion.spring.damping)
        .stiffness(tokens.motion.spring.stiffness)
        .delay(index * 70);

  return (
    <Animated.View entering={entering} style={styles.zone}>
      <View style={styles.header}>
        <ThemedText type="label" style={{ color: colors.inkMuted }}>
          Present
        </ThemedText>
        <ThemedText type="mono" style={{ color: colors.ink }}>
          {`·${items.length}`}
        </ThemedText>
      </View>

      <ThemedText
        type="caption"
        style={[styles.caption, { color: colors.inkMuted }]}
      >
        Things to keep alive.
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
        <View style={styles.body}>
          {thoughts.length > 0 ? (
            <PresentConstellation items={thoughts} itemHref={itemHref} />
          ) : null}

          {events.length > 0 ? (
            <View style={styles.events}>
              <ThemedText
                type="label"
                style={[styles.subhead, { color: colors.inkMuted }]}
              >
                Coming up
              </ThemedText>
              <PresentMosaic items={events} itemHref={itemHref} />
            </View>
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
  body: {
    gap: tokens.space.lg,
  },
  events: {
    gap: tokens.space.sm,
  },
  subhead: {
    paddingHorizontal: tokens.space.md,
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
