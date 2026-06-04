import dayjs from "dayjs";
import { StyleSheet, View } from "react-native";

import { MoodGlyph } from "@/components/atoms/mood-glyph";
import { ThemedText } from "@/components/atoms/themed-text";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { tokens, useTheme } from "@/constants/theme";
import { moodCode } from "@/lib/diary-moods";

import type { DbDiaryEntry } from "@/lib/types";

interface DiaryNoteProps {
  entry: DbDiaryEntry;
  onDelete: () => void;
}

/**
 * A single kept diary line — timestamp, optional mood tag, and the handwritten
 * body — wrapped in a swipe-to-delete row. Self-contained so any feed can render
 * one without knowing the mood→color mapping.
 */
export function DiaryNote({
  entry,
  onDelete,
}: DiaryNoteProps): React.ReactElement {
  const { colors } = useTheme();
  const code = moodCode(entry.mood);

  return (
    <SwipeableRow onDelete={onDelete}>
      <View style={[styles.note, { backgroundColor: colors.surface }]}>
        <View style={styles.noteMeta}>
          <ThemedText type="mono" style={{ color: colors.inkMuted }}>
            {dayjs.unix(entry.created_at).format("HH:mm")}
          </ThemedText>
          {entry.mood && code ? (
            <View style={[styles.moodTag, { backgroundColor: code + "24" }]}>
              <MoodGlyph mood={entry.mood} color={code} size={14} />
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                {entry.mood}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={[styles.noteBody, { color: colors.ink }]}>
          {entry.body}
        </ThemedText>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  note: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  noteMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: 2,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.pill,
  },
  noteBody: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
  },
});
