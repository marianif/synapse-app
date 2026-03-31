import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';

import { BentoCardHeader } from '@/components/molecules/bento-card-header';
import { WeekdayRow } from '@/components/molecules/weekday-row';
import { Radius, Spacing, Surface, TextColors } from '@/constants/theme';

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
}

/**
 * Bento card showing the weekly task overview.
 * Large blue counter + weekday rows with task dots.
 */
export function WeeklyOverviewCard({
  totalCount,
  spanDays,
  entries,
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
          description={`Across ${spanDays} days`}
          icon={
            <MaterialCommunityIcons
              name="chart-bar"
              size={24}
              color={TextColors.secondary}
            />
          }
        />
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
