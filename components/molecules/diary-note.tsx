import dayjs from "dayjs";
import { StyleSheet, View } from "react-native";

import { MoodGlyph } from "@/components/atoms/mood-glyph";
import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { tokens, useTheme } from "@/constants/theme";
import { moodCode } from "@/lib/diary-moods";

import type { DbDiaryEntry } from "@/lib/types";

interface DiaryNoteProps {
  entry: DbDiaryEntry;
  /**
   * Title of the idea this note is filed under, if linked. Resolved by the feed
   * (the note row only stores the id). Undefined → render as autonomous.
   */
  linkedTitle?: string;
  onDelete: () => void;
}

/**
 * A single kept diary line — timestamp, optional mood tag, an optional "on <idea>"
 * link chip, and the handwritten body — wrapped in a swipe-to-delete row.
 * Self-contained so any feed can render one without knowing the mood→color map.
 */
export function DiaryNote({
  entry,
  linkedTitle,
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

        {linkedTitle ? (
          <View
            style={[
              styles.linkTag,
              { backgroundColor: colors.type.ideas + "1F" },
            ]}
          >
            <SketchIcon type="idea" size={13} />
            <ThemedText
              type="micro"
              numberOfLines={1}
              style={[styles.linkLabel, { color: colors.inkMuted }]}
            >
              ON · {linkedTitle.toUpperCase()}
            </ThemedText>
          </View>
        ) : null}

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
  linkTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    gap: tokens.space.xs,
    paddingVertical: 3,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.sm,
  },
  linkLabel: {
    flexShrink: 1,
  },
  noteBody: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
  },
});
