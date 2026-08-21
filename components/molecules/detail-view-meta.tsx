import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { DetailNoteBlock } from "@/components/molecules/detail-note-block";
import { tokens, useTheme } from "@/constants/theme";

import type { DbEntry, DueRange, RecurrenceFrequency } from "@/lib/types";

// The when-cluster draft: date/time map to whichever pair the type uses,
// dueRange holds a deadline horizon (null = a precise day). Shared with the
// /detail edit screen, which owns the only UI that writes into this shape.
export interface WhenDraft {
  date: string;
  time: string;
  dueRange: DueRange | null;
  recurrenceFreq: RecurrenceFrequency | null;
  recurrenceDays: number[];
  recurrenceEndDate: string;
}

type DetailViewMetaProps = {
  entry: DbEntry;
  charged: boolean;
  whenText: string;
  recurrenceText: string | null;
  done: boolean;
};

// Read-only body of the sheet. Navigation and mutations belong to the action
// bar so the title and metadata never look like inline-edit controls.
export function DetailViewMeta({
  entry,
  charged,
  whenText,
  recurrenceText,
  done,
}: DetailViewMetaProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View>
      {/* ── Static identity ── */}
      <View style={styles.titleRow}>
        <ThemedText
          type="title"
          numberOfLines={3}
          style={[
            styles.title,
            {
              color: colors.ink,
              textDecorationLine: done ? "line-through" : "none",
            },
          ]}
        >
          {entry.title}
        </ThemedText>
      </View>

      {entry.subtitle ? (
        <ThemedText type="body" muted style={styles.subtitle}>
          {entry.subtitle}
        </ThemedText>
      ) : null}

      {/* ── WHEN readout ── */}
      <View style={[styles.meta, styles.metaStart]}>
        {recurrenceText ? (
          <View style={styles.metaRow}>
            <ThemedText type="micro" muted style={styles.metaLabel}>
              REPEATS
            </ThemedText>
            <ThemedText type="mono" style={styles.metaValue}>
              {recurrenceText}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* ── Notes (read-only here — full edit lives on the detail screen) ── */}
      {entry.inspiration ? (
        <DetailNoteBlock label="INSPIRATION" value={entry.inspiration} />
      ) : null}

      {entry.notes ? (
        <DetailNoteBlock label="NOTES" value={entry.notes} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Title ──
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm,
    marginBottom: tokens.space.xs,
  },
  title: {
    flex: 1,
  },
  subtitle: {
    marginBottom: tokens.space.sm,
  },

  // ── Meta / WHEN ──
  meta: {
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  metaStart: {
    marginTop: tokens.space.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
  },
  whenReadout: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.xs,
  },
  metaLabel: {
    letterSpacing: 0.5,
  },
  metaValue: {
    flex: 1,
    fontVariant: ["tabular-nums"],
  },
});
