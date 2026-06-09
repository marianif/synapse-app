import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Pressable, StyleSheet, View } from "react-native";

import type { EntryType } from "@/components/atoms/entry-dot";
import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, useTheme, tokens } from "@/constants/theme";
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
  if (entries.length === 0) return "todo";
  return entries[0].type;
}

const TYPE_LABELS: Record<string, string> = {
  todo: "Todo",
  deadline: "Deadline",
  event: "Event",
  someday: "Someday",
};

export function UpcomingPreviewCard({
  upcomingEntries,
  onAdd,
}: UpcomingPreviewCardProps): React.ReactElement {
  const { colors } = useTheme();
  const hasEntries = upcomingEntries.length > 0;
  const nextEntryType = getNextEntryType(upcomingEntries);
  const nextEntry = upcomingEntries[0];
  const daysAway = nextEntry ? getDaysAway(nextEntry.date) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSubtle }]}>
      <View style={styles.header}>
        <View style={styles.counter}>
          {hasEntries && daysAway >= 0 ? (
            <View style={styles.daysAwayContainer}>
              <ThemedText
                style={[
                  styles.daysAwayNumber,
                  { color: entryColor(nextEntryType) },
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
              style={[styles.daysAwayNumber, { color: colors.inkMuted }]}
            >
              —
            </ThemedText>
          )}
        </View>
        <View style={styles.headerMeta}>
          <ThemedText type="label" style={{ color: colors.inkMuted }}>
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
          color={colors.inkMuted}
          style={styles.icon}
        />
      </View>

      {hasEntries ? (
        <View style={styles.list}>
          {upcomingEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <EntryDot type={entry.type} size={6} />
              <View style={styles.entryContent}>
                <ThemedText
                  type="caption"
                  style={[styles.entryType, { color: colors.inkMuted }]}
                >
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
            color={colors.inkMuted}
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
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
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
    fontSize: tokens.type.display.size,
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
    gap: tokens.space.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  entryContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.xs,
  },
  entryType: {
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
    gap: tokens.space.sm,
    paddingVertical: tokens.space.md,
  },
});
