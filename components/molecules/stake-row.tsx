import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
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
 * One agenda line. A sketched type-glyph LEADS on the left (you see what kind of
 * stake at a glance), the TITLE follows, and the mono when-label trails as quiet
 * metadata, the way a printed schedule reads. State lives in TYPE, not in a meter:
 *   · live      — type-coloured sketch glyph, ink title, muted countdown.
 *   · overdue   — bold title, danger countdown, an OVER tag. Never struck: it
 *                 still demands attention.
 *   · done      — muted glyph, struck title + a calm check. Crossing a line off
 *                 is the activating moment; it reads as cleared, not pressing.
 * The old burndown bar is gone — a stake is a deadline bearing down, not a thing
 * you make progress on, so "progress" was the wrong vocabulary. The trailing
 * type-dot is gone too: the left glyph now carries the type signal.
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
      {/* Left glyph — the sketched type-mark; reads the stake's type at a glance.
          Fades to muted when done so a cleared line recedes whole. */}
      <View style={styles.glyph}>
        <SketchIcon
          type={item.type}
          size={20}
          color={item.done ? colors.inkMuted : code}
        />
      </View>

      <ThemedText
        type={item.done ? "body" : "item"}
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
        <View style={styles.check}>
          <MaterialCommunityIcons name="check" size={16} color={metaColor} />
        </View>
      ) : item.overdue ? (
        <View
          style={[styles.overChip, { backgroundColor: colors.feedback.danger }]}
        >
          <ThemedText type="label" style={{ color: ON_SIGNAL }}>
            OVER
          </ThemedText>
        </View>
      ) : (
        <ThemedText
          type="mono"
          numberOfLines={1}
          style={[styles.readout, { color: metaColor }]}
        >
          {item.dated ? item.readout : "—"}
        </ThemedText>
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
  glyph: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
  readout: {
    textAlign: "right",
  },
  check: {
    minWidth: 18,
    alignItems: "flex-end",
  },
  overChip: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
