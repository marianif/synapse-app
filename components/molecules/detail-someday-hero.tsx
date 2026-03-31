import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EntryAccent, Radius, Spacing, Surface } from '@/constants/theme';

interface DetailSomedayHeroProps {
  inspiration?: string;
}

/**
 * Hero block for the Someday detail screen.
 * Replaces the date/time/status section that Task and Deadline use.
 * Shows an amber sparkle, "ONE DAY" label, and the inspiration quote.
 * When no inspiration is provided, renders a soft placeholder.
 */
export function DetailSomedayHero({
  inspiration,
}: DetailSomedayHeroProps): React.ReactElement {
  const amber = EntryAccent.someday;

  return (
    <View style={styles.hero}>
      <View style={styles.iconRow}>
        <IconSymbol name="star-four-points" size={24} color={amber} />
        <ThemedText type="label" style={[styles.oneDayLabel, { color: amber }]}>
          ONE DAY
        </ThemedText>
      </View>

      {inspiration ? (
        <ThemedText type="body" style={styles.quote}>
          {inspiration}
        </ThemedText>
      ) : (
        <ThemedText type="body" style={styles.placeholder}>
          No inspiration note yet.
        </ThemedText>
      )}

      <View style={[styles.divider, { backgroundColor: amber }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  oneDayLabel: {
    color: EntryAccent.someday,
    letterSpacing: 1,
  },
  quote: {
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  placeholder: {
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.4,
  },
  divider: {
    width: 40,
    height: 1.5,
    borderRadius: 1,
    marginTop: Spacing.xs,
  },
});
