import dayjs from "dayjs";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { DiaryNote } from "@/components/molecules/diary-note";
import { tokens, useTheme } from "@/constants/theme";

import type { DbDiaryEntry } from "@/lib/types";

interface DiaryFeedProps {
  /** Newest-first entries. The feed groups them by calendar day. */
  entries: DbDiaryEntry[];
  /** id → idea title, for notes filed ON an idea. */
  ideaTitles?: Record<string, string>;
  /** id → project title, for notes filed ON a project. */
  projectTitles?: Record<string, string>;
  /** id → project emoji, for notes filed ON a project. Shown on the relatedness
   *  chip in place of the folder glyph. */
  projectEmojis?: Record<string, string>;
  /** True when a filter is narrowing the feed — changes the empty-state copy so
   *  "nothing matches" never reads as "the notes tab is empty". */
  filtered?: boolean;
  /** Open the link sheet to re-relate a note (pull it into a project/idea).
   *  Omit to render notes with a static relatedness chip. */
  onRelate?: (entry: DbDiaryEntry) => void;
  /** Tap a note's body to edit it. Omit to render bodies as static text. */
  onEdit?: (entry: DbDiaryEntry) => void;
  onDelete: (id: string) => void;
}

/** Group entries by calendar day, preserving the newest-first order. */
function groupByDay(
  entries: DbDiaryEntry[],
): { key: string; label: string; items: DbDiaryEntry[] }[] {
  const out: { key: string; label: string; items: DbDiaryEntry[] }[] = [];
  for (const e of entries) {
    const d = dayjs.unix(e.created_at);
    const key = d.format("YYYY-MM-DD");
    const isToday = d.isSame(dayjs(), "day");
    const isYesterday = d.isSame(dayjs().subtract(1, "day"), "day");
    const label = isToday
      ? "Today"
      : isYesterday
        ? "Yesterday"
        : d.format("dddd, MMM D");
    const last = out[out.length - 1];
    if (last && last.key === key) last.items.push(e);
    else out.push({ key, label, items: [e] });
  }
  return out;
}

/**
 * Reverse-chronological diary feed, grouped by day with a dated rule per group.
 * Renders its own empty state, so the screen just hands it the entries.
 */
export function DiaryFeed({
  entries,
  ideaTitles,
  projectTitles,
  projectEmojis,
  filtered = false,
  onRelate,
  onEdit,
  onDelete,
}: DiaryFeedProps): React.ReactElement {
  const { colors } = useTheme();
  const grouped = groupByDay(entries);

  if (grouped.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="title" style={{ color: colors.ink }}>
          {filtered ? "No notes here" : "No notes yet"}
        </ThemedText>
        <ThemedText type="body" muted style={styles.emptyBody}>
          {filtered
            ? "Nothing matches this filter yet. Switch the view, or write a note that fits."
            : "Write a line above. Nothing here is a task — it is just for you, kept in order."}
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      {grouped.map((group) => (
        <View key={group.key} style={styles.dayGroup}>
          <View style={styles.dayHeader}>
            <ThemedText type="label" style={{ color: colors.ink }}>
              {group.label.toUpperCase()}
            </ThemedText>
            <View
              style={[styles.dayRule, { backgroundColor: colors.surfaceSubtle }]}
            />
          </View>

          {group.items.map((e) => {
            const projectTitle = e.linked_project_id
              ? projectTitles?.[e.linked_project_id]
              : undefined;
            const ideaTitle = e.linked_entry_id
              ? ideaTitles?.[e.linked_entry_id]
              : undefined;
            const title = projectTitle ?? ideaTitle;
            const kind = projectTitle
              ? ("project" as const)
              : ideaTitle
                ? ("idea" as const)
                : undefined;
            const projectEmoji = e.linked_project_id
              ? projectEmojis?.[e.linked_project_id]
              : undefined;
            return (
              <DiaryNote
                key={e.id}
                entry={e}
                linkedTitle={title}
                linkedKind={kind}
                linkedEmoji={projectEmoji}
                onEdit={onEdit ? () => onEdit(e) : undefined}
                onRelate={onRelate ? () => onRelate(e) : undefined}
                onDelete={() => onDelete(e.id)}
              />
            );
          })}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  dayGroup: {
    gap: tokens.space.md,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
  },
  dayRule: {
    flex: 1,
    height: 2,
    borderRadius: tokens.radius.pill,
  },
  empty: {
    paddingTop: tokens.space.xxxl,
    gap: tokens.space.sm,
    alignItems: "center",
  },
  emptyBody: {
    textAlign: "center",
    maxWidth: 280,
  },
});
