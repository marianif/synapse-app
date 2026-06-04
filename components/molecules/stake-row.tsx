import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";
import type { Href } from "expo-router";

/** One stake's data shape, derived from a DbEntry by the home screen. */
export interface RunwayItem {
  id: string;
  type: EntryType;
  title: string;
  /** Trailing mono when-label: "2d", "5h", "now", "2d over", or "" when undated. */
  readout: string;
  /** Past the edge — the countdown burns danger. */
  overdue: boolean;
  /** Has a due date at all. Undated stakes show no clock. */
  dated: boolean;
  /** Cleared this week — renders struck-through with a check, never pressing. */
  done: boolean;
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
 * One agenda line. The TITLE leads (you scan what, then when); the mono when-label
 * trails as quiet metadata, the way a printed schedule reads. State lives in TYPE,
 * not in a meter:
 *   · live      — ink title, muted countdown, a type-coloured dot.
 *   · overdue   — bold title, danger countdown, an OVER tag. Never struck: it
 *                 still demands attention.
 *   · done      — struck title + a calm check. Crossing a line off is the
 *                 activating moment; it reads as cleared, not pressing.
 * The old burndown bar is gone — a stake is a deadline bearing down, not a thing
 * you make progress on, so "progress" was the wrong vocabulary.
 */
export function StakeRow({ item, href }: StakeRowProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();

  const code = entryColor(item.type);

  // Trailing-meta colour carries the heat: danger when overdue, calm when done,
  // muted otherwise. The title stays `ink` (or struck-muted) — bulletproof AA.
  const metaColor = item.overdue
    ? colors.feedback.danger
    : item.done
      ? colors.feedback.success
      : colors.inkMuted;

  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityState={{ checked: item.done }}
      accessibilityLabel={`${item.title}${
        item.done
          ? ", done"
          : item.readout
            ? `, ${item.readout}`
            : ", no deadline"
      }`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      hitSlop={4}
    >
      <ThemedText
        type="item"
        numberOfLines={1}
        style={[
          styles.title,
          { color: item.done ? colors.inkMuted : colors.ink },
          item.overdue && styles.titleUrgent,
          item.done && styles.titleDone,
        ]}
      >
        {item.title}
      </ThemedText>

      {item.done ? (
        <ThemedText type="mono" style={[styles.check, { color: metaColor }]}>
          ✓
        </ThemedText>
      ) : item.overdue ? (
        <View style={[styles.overChip, { backgroundColor: colors.feedback.danger }]}>
          <ThemedText type="label" style={{ color: ON_SIGNAL }}>
            OVER
          </ThemedText>
        </View>
      ) : (
        <View style={styles.metaTail}>
          <ThemedText
            type="mono"
            numberOfLines={1}
            style={[styles.readout, { color: metaColor }]}
          >
            {item.dated ? item.readout : "—"}
          </ThemedText>
          <View style={[styles.dot, { backgroundColor: code }]} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    minHeight: 44,
  },
  title: {
    flex: 1,
  },
  titleUrgent: {
    fontWeight: "700",
  },
  titleDone: {
    textDecorationLine: "line-through",
  },
  metaTail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  readout: {
    textAlign: "right",
  },
  check: {
    minWidth: 18,
    textAlign: "right",
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
  pressed: {
    opacity: 0.7,
  },
});
