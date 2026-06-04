import dayjs from "dayjs";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

import type { DbDiaryEntry } from "@/lib/types";

interface RelatedNotesProps {
  /** Diary notes linked to this entry, newest-first. */
  notes: DbDiaryEntry[];
}

/**
 * The reflections filed ON an idea — the reverse side of the diary's idea-link.
 * Read-only here (the diary is where notes are written/edited); the detail screen
 * just surfaces them so an idea reads with the thinking that gathered around it.
 * Renders nothing when there are no related notes.
 */
export function RelatedNotes({ notes }: RelatedNotesProps): React.ReactElement | null {
  const { colors } = useTheme();
  if (notes.length === 0) return null;

  return (
    <View style={styles.block}>
      <ThemedText type="label" muted style={styles.label}>
        RELATED NOTES · {notes.length}
      </ThemedText>
      <View style={styles.list}>
        {notes.map((n) => (
          <View
            key={n.id}
            style={[styles.note, { backgroundColor: colors.surfaceSubtle }]}
          >
            <ThemedText type="mono" style={{ color: colors.inkMuted }}>
              {dayjs.unix(n.created_at).format("D MMM · HH:mm")}
            </ThemedText>
            <ThemedText style={[styles.body, { color: colors.ink }]}>
              {n.body}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: tokens.space.xl,
    gap: tokens.space.sm,
  },
  label: {
    letterSpacing: 0.6,
    paddingHorizontal: tokens.space.xs,
  },
  list: {
    gap: tokens.space.sm,
  },
  note: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    gap: tokens.space.xs,
  },
  body: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
  },
});
