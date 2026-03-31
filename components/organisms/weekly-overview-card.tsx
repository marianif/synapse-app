import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/molecules/empty-state';
import { BentoCardHeader } from '@/components/molecules/bento-card-header';
import { WeekdayRow } from '@/components/molecules/weekday-row';
import { EntryAccent, Radius, Spacing, Surface, TextColors } from '@/constants/theme';

import type { EntryType } from '@/components/atoms/entry-dot';

interface WeekdayEntry {
  day: string;
  title?: string;
  entryType?: EntryType;
}

interface WeeklyOverviewCardProps {
  totalCount: number;
  spanDays: number;
  entries: WeekdayEntry[];
  isEmpty?: boolean;
  onAdd?: () => void;
}

/**
 * Bento card showing the weekly task overview.
 * Large blue counter + weekday rows with task dots.
 */
export function WeeklyOverviewCard({
  totalCount,
  spanDays,
  entries,
  isEmpty = false,
  onAdd,
}: WeeklyOverviewCardProps): React.ReactElement {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/list?entryType=task')}
      accessibilityRole="button"
      accessibilityLabel="Open weekly tasks list"
    >
      <View style={styles.card}>
        <BentoCardHeader
          count={totalCount}
          accentType="task"
          label="Weekly Overview"
          description={isEmpty ? 'No tasks yet' : `Across ${spanDays} days`}
          icon={
            <MaterialCommunityIcons
              name="chart-bar"
              size={24}
              color={TextColors.secondary}
            />
          }
        />
        {isEmpty ? (
          <EmptyState
            icon="checkbox-marked-circle-plus-outline"
            title="No tasks this week"
            description="Schedule tasks to track your weekly momentum."
            ctaLabel="+ Add Task"
            onCta={onAdd ?? (() => router.push('/list?entryType=task'))}
            accentColor={EntryAccent.task}
          />
        ) : (
          <View style={styles.rows}>
            {entries.map((entry) => (
              <WeekdayRow
                key={entry.day}
                day={entry.day}
                title={entry.title}
                entryType={entry.entryType ?? 'task'}
              />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  rows: {
    gap: Spacing.sm,
  },
});
