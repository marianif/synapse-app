import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { IconPill } from "@/components/atoms/icon-pill";
import { ThemedText } from "@/components/atoms/themed-text";
import { DetailNoteBlock } from "@/components/molecules/detail-note-block";
import { tokens } from "@/constants/theme";

import type { DbEntry } from "@/lib/types";

type DetailViewMetaProps = {
  entry: DbEntry;
  accent: string;
  charged: boolean;
  whenText: string;
  recurrenceText: string | null;
  done: boolean;
  doneLabel: string;
  reduced: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onMarkDone: () => void;
};

// View-mode body of the sheet: WHEN row (with inline delete/edit/complete
// pills), REPEATS row when recurring, and inspiration/notes blocks.
export function DetailViewMeta({
  entry,
  accent,
  charged,
  whenText,
  recurrenceText,
  done,
  doneLabel,
  reduced,
  onDelete,
  onEdit,
  onMarkDone,
}: DetailViewMetaProps): React.ReactElement {
  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(180)}
      exiting={reduced ? undefined : FadeOut.duration(120)}
    >
      {/* ── Temporal metadata + inline actions ── */}
      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <ThemedText type="micro" muted style={styles.metaLabel}>
            WHEN
          </ThemedText>
          <ThemedText
            type="mono"
            style={[styles.metaValue, charged && { color: tokens.feedback.danger }]}
          >
            {whenText}
          </ThemedText>

          <View style={styles.inlineActions}>
            <IconPill
              icon="trash-can-outline"
              color={tokens.feedback.danger}
              onPress={onDelete}
              accessibilityLabel="Delete"
            />

            <IconPill
              icon="pencil-outline"
              color={accent}
              onPress={onEdit}
              accessibilityLabel="Edit"
            />

            {!done ? (
              <IconPill
                icon="check"
                color={tokens.feedback.success}
                onPress={onMarkDone}
                accessibilityLabel={doneLabel}
                label={doneLabel}
              />
            ) : null}
          </View>
        </View>

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

      {/* ── Notes ── */}
      {entry.inspiration ? (
        <DetailNoteBlock label="INSPIRATION" value={entry.inspiration} />
      ) : null}

      {entry.notes ? <DetailNoteBlock label="NOTES" value={entry.notes} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  meta: {
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  metaLabel: {
    width: 64,
  },
  metaValue: {
    flex: 1,
  },
  inlineActions: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: tokens.space.xs,
  },
});
