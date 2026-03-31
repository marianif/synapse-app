import { View, StyleSheet } from 'react-native';

import { StreakBadge } from '@/components/atoms/streak-badge';
import { ThemedText } from '@/components/atoms/themed-text';
import { EntryAccent, FontSize, LetterSpacing, LineHeight, Spacing, TextColors } from '@/constants/theme';

import type { EntryType } from '@/components/atoms/entry-dot';

interface ListProgressProps {
  completed: number;
  total: number;
  streak: number;
  entryType: EntryType;
}

/**
 * Weekly progress header block for the list screen.
 * Displays "WEEKLY PROGRESS" label, a large "completed / total" counter,
 * and a StreakBadge chip side-by-side.
 */
export function ListProgress({
  completed,
  total,
  streak,
  entryType,
}: ListProgressProps): React.ReactElement {
  const accentColor = EntryAccent[entryType] ?? EntryAccent.task;

  return (
    <View style={styles.container}>
      <View style={styles.counterBlock}>
        <ThemedText type="caption" style={styles.progressLabel}>
          WEEKLY PROGRESS
        </ThemedText>
        <View style={styles.counterRow}>
          <ThemedText
            style={[styles.completedNum, { color: accentColor }]}
            numberOfLines={1}
          >
            {completed}
          </ThemedText>
          <ThemedText style={styles.totalNum} numberOfLines={1}>
            {'/ '}
            {total}
          </ThemedText>
        </View>
      </View>

      <StreakBadge count={streak} accentColor={accentColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  counterBlock: {
    gap: Spacing.xs,
  },
  progressLabel: {
    letterSpacing: 0.8,
    color: TextColors.tertiary,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  completedNum: {
    fontSize: FontSize.displayLg,
    lineHeight: LineHeight.displayLg,
    letterSpacing: LetterSpacing.displayLg,
    fontFamily: 'Inter_700Bold',
  },
  totalNum: {
    fontSize: FontSize.headlineSm,
    lineHeight: LineHeight.headlineSm,
    fontFamily: 'Inter_400Regular',
    color: TextColors.tertiary,
    paddingBottom: 4,
  },
});
