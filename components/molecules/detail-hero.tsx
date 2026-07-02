import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { chipInk, entryColor, tokens, useEntryKicker } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

const TYPE_LABELS: Record<EntryType, string> = {
  todo: "TODO",
  deadline: "DEADLINE",
  idea: "IDEA",
};

export interface TelemetryChip {
  /** Mono label, e.g. "SCHEDULED", "DUE IN 3 DAYS", "SOMEDAY". */
  label: string;
  /** Signal-dot color. Omit for neutral chips (e.g. SOMEDAY). */
  dotColor?: string;
  /** Neutral chips (SOMEDAY) sit on a quieter tone than status/urgency chips. */
  neutral?: boolean;
}

interface DetailHeroProps {
  entryType: EntryType;
  isRecurring?: boolean;
  title: string;
  /** Swaps the static title for an inline input at the same scale (edit mode). */
  titleSlot?: React.ReactNode;
  /** One glance-row of facts — status, date, time, countdown, someday. */
  chips?: TelemetryChip[];
}

/**
 * The detail screen's single hero unit — type identity, title, and telemetry
 * fused into one composed reading instead of a stack of separately-margined
 * fragments. Everything the user needs at a glance (what this is, what it's
 * called, where it stands) reads in one continuous block: edge-bar → tab →
 * title → a single row of inline chips. No fact gets its own isolated card.
 */
export function DetailHero({
  entryType,
  isRecurring = false,
  title,
  titleSlot,
  chips = [],
}: DetailHeroProps): React.ReactElement {
  const code = entryColor(entryType);
  const tabFill = useEntryKicker(entryType);

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

        {chips.length > 0 ? (
          <View style={styles.chipRow}>
            {chips.map((chip) => (
              <View
                key={chip.label}
                style={[
                  styles.chip,
                  { backgroundColor: chip.neutral ? "transparent" : tabFill + "14" },
                ]}
              >
                {chip.dotColor ? (
                  <View style={[styles.dot, { backgroundColor: chip.dotColor }]} />
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
  // One continuous glance-row — every fact at the same distance from the
  // title, read left to right, instead of a vertical stack of isolated cards.
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
