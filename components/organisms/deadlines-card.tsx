import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/molecules/empty-state';
import { BentoCardHeader } from '@/components/molecules/bento-card-header';
import { WeekdayRow } from '@/components/molecules/weekday-row';
import { useEntryKicker, useTheme, tokens } from '@/constants/theme';

import type { ItemStatus } from '@/components/molecules/list-item';

interface DeadlineEntry {
  day: string;
  title?: string;
  status?: ItemStatus;
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
  const { colors } = useTheme();
  const deadlineAccent = useEntryKicker('deadline');

  return (
    <Pressable
      onPress={() => router.push('/list?entryType=deadline')}
      accessibilityRole="button"
      accessibilityLabel="Open deadlines list"
    >
      <View style={[styles.card, { backgroundColor: colors.surfaceSubtle }]}>
        <BentoCardHeader
          count={totalCount}
          accentType="deadline"
          label="Deadlines"
          description={isEmpty ? 'Nothing due yet' : 'Critical milestones'}
          icon={
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color={colors.inkMuted}
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
            accentColor={deadlineAccent}
          />
        ) : (
          <View style={styles.rows}>
            {entries.map((entry) => (
              <WeekdayRow
                key={entry.day}
                day={entry.day}
                title={entry.title}
                entryType="deadline"
                status={entry.status}
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
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xl,
    gap: tokens.space.lg,
  },
  rows: {
    gap: tokens.space.sm,
  },
});
