import dayjs from "dayjs";
import { StyleSheet, View } from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { tokens, useTheme } from "@/constants/theme";

import type { DbDiaryEntry } from "@/lib/types";

interface DiaryNoteProps {
  entry: DbDiaryEntry;
  /**
   * Title of the idea this note is related to, if linked. Resolved by the feed
   * (the note row only stores the id). A linked note shows an "ON · <idea>"
   * chip; an unlinked one shows a quiet "FREE" chip — so every note declares
   * its relatedness at a glance.
   */
  linkedTitle?: string;
  onDelete: () => void;
}

/**
 * A single kept diary line — timestamp, a relatedness chip (ON · <idea> when
 * linked, FREE otherwise), and the handwritten body — wrapped in a
 * swipe-to-delete row. Self-contained so any feed can render one.
 */
export function DiaryNote({
  entry,
  linkedTitle,
  onDelete,
}: DiaryNoteProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <SwipeableRow onDelete={onDelete}>
      <View style={[styles.note, { backgroundColor: colors.surface }]}>
        <View style={styles.noteMeta}>
          <ThemedText type="mono" style={{ color: colors.inkMuted }}>
            {dayjs.unix(entry.created_at).format("HH:mm")}
          </ThemedText>

          {linkedTitle ? (
            <View
              style={[
                styles.relTag,
                { backgroundColor: colors.type.ideas + "1F" },
              ]}
            >
              <SketchIcon type="idea" size={13} />
              <ThemedText
                type="micro"
                numberOfLines={1}
                style={[styles.relLabel, { color: colors.inkMuted }]}
              >
                {linkedTitle.toUpperCase()}
              </ThemedText>
            </View>
          ) : (
            <View
              style={[styles.relTag, { backgroundColor: colors.surfaceSubtle }]}
            >
              <View
                style={[styles.freeDot, { borderColor: colors.inkMuted }]}
              />
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                FREE
              </ThemedText>
            </View>
          )}
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
  relTag: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: tokens.space.xs,
    paddingVertical: 3,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.sm,
  },
  relLabel: {
    flexShrink: 1,
  },
  freeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.4,
    borderStyle: "dashed",
  },
  noteBody: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
  },
});
