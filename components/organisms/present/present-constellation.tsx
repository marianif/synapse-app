import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryTint, tokens, useTheme } from "@/constants/theme";

import type { PresentItem } from "@/lib/present";
import type { Href } from "expo-router";

interface PresentVariantProps {
  items: PresentItem[];
  itemHref: (item: PresentItem) => Href;
}

/**
 * Constellation — a flowing field of chips, not rows. Freshness sets each chip's
 * brightness and how loud its sketched type-glyph reads: a just-caught idea glows,
 * an old one fades to a faint ghost but never disappears (neglect doesn't delete). The
 * chips graze across up to three rows that scroll sideways — a head with three
 * things looks calm, one with twenty trails off the edge. There is no order to
 * read; you graze.
 */
const ROWS = 3;

export function PresentConstellation({
  items,
  itemHref,
}: PresentVariantProps): React.ReactElement {
  const router = useRouter();
  const { scheme, colors } = useTheme();

  // Row-major fill across 3 rows of roughly equal length. Each row is a
  // contiguous run, so a row scrolls as one grazeable strip on its own.
  const perRow = Math.ceil(items.length / ROWS);
  const rows: PresentItem[][] = Array.from({ length: ROWS }, (_, r) =>
    items.slice(r * perRow, (r + 1) * perRow),
  ).filter((row) => row.length > 0);

  const renderChip = (item: PresentItem): React.ReactElement => {
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
          style={[styles.fill, { backgroundColor: tint, opacity: bgOpacity }]}
        />
        <View style={{ opacity: dotOpacity }}>
          <SketchIcon type={item.type} size={20} />
        </View>
        <ThemedText
          type={big ? "item" : "body"}
          numberOfLines={1}
          style={[styles.label, { color: colors.ink, opacity: labelOpacity }]}
        >
          {item.title}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <ScrollView
          key={rowIndex}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {row.map(renderChip)}
        </ScrollView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: tokens.space.sm,
  },
  row: {
    flexDirection: "row",
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
    maxWidth: 240,
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
  label: {
    flexShrink: 1,
  },
});
