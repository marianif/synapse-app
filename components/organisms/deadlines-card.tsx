import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';

import { BentoCardHeader } from '@/components/molecules/bento-card-header';
import { WeekdayRow } from '@/components/molecules/weekday-row';
import { Radius, Spacing, Surface, TextColors } from '@/constants/theme';

interface DeadlineEntry {
  day: string;
  title?: string;
}

interface DeadlinesCardProps {
  totalCount: number;
  entries: DeadlineEntry[];
}

/**
 * Bento card showing upcoming deadlines for the week.
 * Large coral counter + weekday rows with deadline-colored dots.
 */
export function DeadlinesCard({
  totalCount,
  entries,
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
          description="Critical milestones"
          icon={
            <MaterialCommunityIcons
              name="bell-outline"
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
              entryType="deadline"
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
