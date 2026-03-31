import { StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { Spacing, TextColors } from "@/constants/theme";

import type { EntryType } from "@/components/atoms/entry-dot";
import type { ItemStatus } from "@/components/molecules/list-item";

interface WeekdayRowProps {
  day: string; // e.g. "Mon", "Tue"
  title?: string; // entry title — undefined = empty row (greyed day)
  entryType?: EntryType; // determines dot color
  status?: ItemStatus; // completed = strikethrough
}

/**
 * Single row in a Bento card's weekly breakdown.
 * Shows the abbreviated day on the left, a colored dot, and the entry title.
 * Rows without a title render as a faint empty row to preserve vertical rhythm.
 */
export function WeekdayRow({
  day,
  title,
  entryType = "todo",
  status,
}: WeekdayRowProps): React.ReactElement {
  const hasEntry = Boolean(title);
  const isCompleted = status === "completed";

  return (
    <View style={styles.row}>
      <ThemedText
        type="caption"
        style={[styles.day, !hasEntry && { color: TextColors.disabled }]}
      >
        {day}
      </ThemedText>
      {hasEntry ? (
        <>
          <EntryDot type={entryType} />
          <ThemedText
            type="body"
            style={[
              styles.title,
              isCompleted && {
                textDecorationLine: "line-through",
                color: TextColors.tertiary,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
        </>
      ) : (
        <View style={styles.emptyLine} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 22,
  },
  day: {
    width: 40,
    color: TextColors.secondary,
  },
  title: {
    flex: 1,
  },
  emptyLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 1,
  },
});
