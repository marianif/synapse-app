import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/molecules/empty-state';
import { BentoCardHeader } from '@/components/molecules/bento-card-header';
import { WeekdayRow } from '@/components/molecules/weekday-row';
import { EntryAccent, Radius, Spacing, Surface, TextColors } from '@/constants/theme';

interface DeadlineEntry {
  day: string;
  title?: string;
}

interface DeadlinesCardProps {
  totalCount: number;
  entries: DeadlineEntry[];
  isEmpty?: boolean;
  onAdd?: () => void;
}

/**
 * Bento card showing upcoming deadlines for the week.
 * Large coral counter + weekday rows with deadline-colored dots.
 */
export function DeadlinesCard({
  totalCount,
  entries,
  isEmpty = false,
  onAdd,
}: DeadlinesCardProps): React.ReactElement {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/list?entryType=deadline')}
      accessibilityRole="button"
      accessibilityLabel="Open deadlines list"
    >
      <View style={styles.card}>
        <BentoCardHeader
          count={totalCount}
          accentType="deadline"
          label="Deadlines"
          description={isEmpty ? 'Nothing due yet' : 'Critical milestones'}
          icon={
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color={TextColors.secondary}
            />
          }
        />
        {isEmpty ? (
          <EmptyState
            icon="calendar-alert"
            title="No deadlines ahead"
            description="Add deadlines to track critical milestones."
            ctaLabel="+ Add Deadline"
            onCta={onAdd ?? (() => router.push('/list?entryType=deadline'))}
            accentColor={EntryAccent.deadline}
          />
        ) : (
          <View style={styles.rows}>
            {entries.map((entry) => (
              <WeekdayRow
                key={entry.day}
                day={entry.day}
                title={entry.title}
                entryType="deadline"
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
