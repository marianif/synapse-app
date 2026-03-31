import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { EntryDot } from '@/components/atoms/entry-dot';
import { CounterDisplay } from '@/components/atoms/counter-display';
import { Radius, Spacing, Surface, TextColors } from '@/constants/theme';

import type { UpcomingEntry } from '@/hooks/use-calendar-data';

const TYPE_LABELS: Record<string, string> = {
  task: 'Task',
  deadline: 'Deadline',
  event: 'Event',
  someday: 'Someday',
};

interface UpcomingPreviewCardProps {
  monthCount: number;
  upcomingEntries: UpcomingEntry[];
  onAdd?: () => void;
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const [dd, mm, yyyy] = parts;
  const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function UpcomingPreviewCard({
  monthCount,
  upcomingEntries,
  onAdd,
}: UpcomingPreviewCardProps): React.ReactElement {
  const hasEntries = upcomingEntries.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.counter}>
          <CounterDisplay value={monthCount} accentType="event" />
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
                <ThemedText type="body" numberOfLines={1} style={styles.entryTitle}>
                  {entry.title}
                </ThemedText>
              </View>
              <ThemedText type="caption" muted style={styles.entryDate}>
                {formatDate(entry.date)}
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
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counter: {
    minWidth: 64,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  entryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  entryType: {
    color: TextColors.tertiary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryTitle: {
    flex: 1,
    fontSize: 13,
  },
  entryDate: {
    fontSize: 10,
    minWidth: 70,
    textAlign: 'right',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
});
