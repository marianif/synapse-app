import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { chipInk, tokens, useEntryKicker } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

const TYPE_LABELS: Record<EntryType, string> = {
  todo: "TODO",
  deadline: "DEADLINE",
  idea: "IDEA",
};

export interface TelemetryChip {
  /** Mono label, e.g. "12 JUN 2026", "ENDS 30 JUN 2026". */
  label: string;
  /** Signal-dot color. Omit for neutral chips (e.g. SOMEDAY). */
  dotColor?: string;
  /** Neutral chips (SOMEDAY) sit on a quieter tone than status/urgency chips. */
  neutral?: boolean;
}

/**
 * The one fact that defines where this entry stands — the reason the user
 * opened it. A deadline's time-remaining, a task's status. Rendered LOUD (the
 * value at display scale, a mono caption beneath), so the standing hits before
 * anything else. Ideas have none: their standing isn't time, so they lead with
 * the title alone.
 */
export interface HeroReadout {
  /** The big value — "10", "DUE TODAY", "SCHEDULED". */
  value: string;
  /** The mono caption under the value — "DAYS LEFT", "12 JUN 2026". */
  caption?: string;
  /** Signal color for the value + the leading dot. Defaults to the type code. */
  tone?: string;
}

interface DetailHeroProps {
  entryType: EntryType;
  isRecurring?: boolean;
  title: string;
  /** Swaps the static title for an inline input at the same scale (edit mode). */
  titleSlot?: React.ReactNode;
  /** The defining fact — where this entry stands. Omitted for ideas / edit. */
  readout?: HeroReadout;
  /** Secondary facts — date, time, recurrence, ends. Context under the readout. */
  chips?: TelemetryChip[];
}

/**
 * The detail screen's hero — type identity, title, and the entry's STANDING,
 * fused into one reading. The redesign leads with the fact that defines the
 * type: a deadline opens on its countdown, a task on its status. That defining
 * fact (`readout`) owns the block at display scale — it's the reason the user
 * tapped in (PRODUCT.md: the board states facts about time). Secondary facts
 * (`chips`) trail beneath as a quiet mono row. An idea has no time-standing, so
 * it leads with the title alone and keeps its equal volume through the tab code,
 * never a downgrade.
 *
 * Reading order: edge-bar → type tab → title → readout (the standing) → chips.
 */
export function DetailHero({
  entryType,
  isRecurring = false,
  title,
  titleSlot,
  readout,
  chips = [],
}: DetailHeroProps): React.ReactElement {
  // `code` (edge-bar, readout tone) and `tabFill` (kicker chip fill) both use
  // the scheme-aware kicker shade — one hue per scheme, AA-safe on paper and
  // graphite alike.
  const code = useEntryKicker(entryType);
  const tabFill = code;
  const readoutTone = readout?.tone ?? code;

  return (
    <View style={styles.row}>
      <View style={[styles.edge, { backgroundColor: code }]} />

      <View style={styles.body}>
        <View style={[styles.tab, { backgroundColor: tabFill }]}>
          <ThemedText type="label" style={{ color: chipInk() }}>
            {TYPE_LABELS[entryType]}
            {isRecurring ? "  ↻" : ""}
          </ThemedText>
        </View>

        {titleSlot ?? (
          <ThemedText type="display" style={styles.title}>
            {title}
          </ThemedText>
        )}

        {/* The standing — the defining fact, loud. The value reads at display
            scale in the type's tone; the caption is the mono context under it.
            This is the one thing that should hit before the eye moves on. A
            leading signal-dot threads the type color into the readout so the
            number reads as an instrument reading, not a label. */}
        {readout ? (
          <View style={styles.readout}>
            <View style={styles.readoutLine}>
              <View
                style={[styles.readoutDot, { backgroundColor: readoutTone }]}
              />
              <ThemedText
                type="display"
                style={[styles.readoutValue, { color: readoutTone }]}
              >
                {readout.value}
              </ThemedText>
            </View>
            {readout.caption ? (
              <ThemedText
                type="mono"
                style={[styles.readoutCaption, { color: readoutTone }]}
              >
                {readout.caption}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        {/* Secondary facts — context, not the decision. A quiet mono row that
            trails the standing. */}
        {chips.length > 0 ? (
          <View style={styles.chipRow}>
            {chips.map((chip) => (
              <View
                key={chip.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: chip.neutral
                      ? "transparent"
                      : tabFill + "14",
                  },
                ]}
              >
                {chip.dotColor ? (
                  <View
                    style={[styles.dot, { backgroundColor: chip.dotColor }]}
                  />
                ) : null}
                <ThemedText type="mono" muted={chip.neutral}>
                  {chip.label}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: tokens.space.md,
  },
  edge: {
    width: 3,
    borderRadius: tokens.radius.pill,
    alignSelf: "stretch",
  },
  body: {
    flex: 1,
  },
  tab: {
    alignSelf: "flex-start",
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  title: {
    marginTop: tokens.space.xs,
  },
  // The standing — its own zone, one real breath below the title so it reads as
  // the second beat (title, then where it stands), not a subtitle glued on.
  readout: {
    marginTop: tokens.space.xl,
    gap: tokens.space.xs,
  },
  readoutLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  // A leading signal-dot — threads the type color into the reading so the value
  // reads as an instrument readout, not a label. Sits at the value's optical mid.
  readoutDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // The value at display scale, tabular so a changing countdown doesn't jitter.
  readoutValue: {
    fontFamily: tokens.type.fontMono.bold,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  readoutCaption: {
    letterSpacing: tokens.type.kicker.tracking,
  },
  // Secondary facts — every one at the same distance, read left to right, well
  // below the loud standing so the hierarchy is unmistakable.
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
    marginTop: tokens.space.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
