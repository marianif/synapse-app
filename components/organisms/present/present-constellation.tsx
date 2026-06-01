import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, entryTint, tokens, useTheme } from "@/constants/theme";

import type { PresentItem } from "@/lib/present";
import type { Href } from "expo-router";

interface PresentVariantProps {
  items: PresentItem[];
  itemHref: (item: PresentItem) => Href;
}

/**
 * Constellation — a flowing field of chips, not rows. Freshness sets each chip's
 * brightness and how loud its type-edge reads: a just-caught idea glows, an old
 * one fades to a faint ghost but never disappears (neglect doesn't delete). The
 * wrap makes quantity visible texture — a head with three things looks calm, one
 * with twenty looks full. There is no order to read; you graze.
 */
export function PresentConstellation({
  items,
  itemHref,
}: PresentVariantProps): React.ReactElement {
  const router = useRouter();
  const { scheme, colors } = useTheme();

  return (
    <View style={styles.cloud}>
      {items.map((item) => {
        const code = entryColor(item.type);
        const tint = entryTint(item.type, scheme);
        // Freshness decays the CHIP BODY, not the label. The tint and type-dot
        // recede as an item ages (the ghosting signal) via a separate background
        // layer, while the title text holds a legible floor so even the oldest
        // visible chip clears WCAG AA in both schemes.
        const bgOpacity = 0.28 + item.freshness * 0.72;
        const dotOpacity = 0.45 + item.freshness * 0.55;
        const labelOpacity = 0.74 + item.freshness * 0.26;
        const big = item.bucket === "fresh";
        return (
          <Pressable
            key={item.id}
            onPress={() => router.push(itemHref(item))}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={({ pressed }) => [
              styles.chip,
              big && styles.chipBig,
              pressed && styles.pressed,
            ]}
            hitSlop={4}
          >
            <View
              style={[
                styles.fill,
                { backgroundColor: tint, opacity: bgOpacity },
              ]}
            />
            <View
              style={[styles.dot, { backgroundColor: code, opacity: dotOpacity }]}
            />
            <ThemedText
              type={big ? "item" : "body"}
              numberOfLines={1}
              style={[styles.label, { color: colors.ink, opacity: labelOpacity }]}
            >
              {item.title}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 44,
    paddingLeft: tokens.space.sm,
    paddingRight: tokens.space.md,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
    maxWidth: "100%",
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chipBig: {
    paddingVertical: tokens.space.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.pill,
  },
  label: {
    flexShrink: 1,
  },
});
