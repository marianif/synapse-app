import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Pressable, StyleSheet, View } from "react-native";

import type { EntryType } from "@/components/atoms/entry-dot";
import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import {
  EntryAccent,
  FontSize,
  Radius,
  Spacing,
  Surface,
  TextColors,
} from "@/constants/theme";
import type { UpcomingEntry } from "@/hooks/use-calendar-data";

dayjs.extend(customParseFormat);

interface UpcomingPreviewCardProps {
  upcomingEntries: UpcomingEntry[];
  onAdd?: () => void;
}

function getDaysAway(dateStr: string): number {
  const d = dayjs(dateStr, "DD/MM/YYYY");
  if (!d.isValid()) return -1;
  return d.diff(dayjs(), "day");
}

function formatRelativeDate(dateStr: string): string {
  const d = dayjs(dateStr, "DD/MM/YYYY");
  if (!d.isValid()) return dateStr;
  const days = d.diff(dayjs(), "day");
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${d.format("DD/MM")} · ${d.format("dddd")}`;
}

function getNextEntryType(entries: UpcomingEntry[]): EntryType {
  if (entries.length === 0) return "task";
  return entries[0].type;
}

const TYPE_LABELS: Record<string, string> = {
  task: "Task",
  deadline: "Deadline",
  event: "Event",
  someday: "Someday",
};

export function UpcomingPreviewCard({
  upcomingEntries,
  onAdd,
}: UpcomingPreviewCardProps): React.ReactElement {
  const hasEntries = upcomingEntries.length > 0;
  const nextEntryType = getNextEntryType(upcomingEntries);
  const nextEntry = upcomingEntries[0];
  const daysAway = nextEntry ? getDaysAway(nextEntry.date) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.counter}>
          {hasEntries && daysAway >= 0 ? (
            <View style={styles.daysAwayContainer}>
              <ThemedText
                style={[
                  styles.daysAwayNumber,
                  { color: EntryAccent[nextEntryType] },
                ]}
              >
                {daysAway}
              </ThemedText>
              <ThemedText type="caption" muted>
                {daysAway === 0 ? "Today" : daysAway === 1 ? "day" : "days"}
              </ThemedText>
            </View>
          ) : (
            <ThemedText
              style={[styles.daysAwayNumber, { color: TextColors.tertiary }]}
            >
              —
            </ThemedText>
          )}
        </View>
        <View style={styles.headerMeta}>
          <ThemedText type="label" style={{ color: TextColors.secondary }}>
            Coming Up
          </ThemedText>
          <ThemedText type="caption" muted>
            {hasEntries
              ? `Next ${upcomingEntries.length} entries`
              : "No upcoming entries"}
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="calendar-clock"
          size={24}
          color={TextColors.tertiary}
          style={styles.icon}
        />
      </View>

      {hasEntries ? (
        <View style={styles.list}>
          {upcomingEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <EntryDot type={entry.type} size={6} />
              <View style={styles.entryContent}>
                <ThemedText type="caption" style={styles.entryType}>
                  {TYPE_LABELS[entry.type]}
                </ThemedText>
                <ThemedText
                  type="body"
                  numberOfLines={1}
                  style={styles.entryTitle}
                >
                  {entry.title}
                </ThemedText>
              </View>
              <ThemedText type="caption" muted style={styles.entryDate}>
                {formatRelativeDate(entry.date)}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : (
        <Pressable onPress={onAdd} style={styles.emptyState}>
          <MaterialCommunityIcons
            name="calendar-plus"
            size={20}
            color={TextColors.tertiary}
          />
          <ThemedText type="caption" muted>
            {"Add entries to see what's coming"}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  counter: {
    minWidth: 64,
  },
  daysAwayContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  daysAwayNumber: {
    fontSize: FontSize.displayLg,
    fontWeight: "700",
    lineHeight: 52,
    letterSpacing: -0.96,
  },
  headerMeta: {
    flex: 1,
    gap: 2,
  },
  icon: {
    opacity: 0.4,
  },
  list: {
    gap: Spacing.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  entryContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
  },
  entryType: {
    color: TextColors.tertiary,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  entryTitle: {
    flex: 1,
    fontSize: 13,
  },
  entryDate: {
    fontSize: 10,
    minWidth: 70,
    textAlign: "right",
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
});
