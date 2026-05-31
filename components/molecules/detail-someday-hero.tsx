import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { entryColor, useTheme, tokens } from '@/constants/theme';

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
  const { colors } = useTheme();
  const amber = entryColor('someday');

  return (
    <View style={[styles.hero, { backgroundColor: colors.surfaceSubtle }]}>
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
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.space.xxl,
    paddingHorizontal: tokens.space.xl,
    alignItems: 'center',
    gap: tokens.space.md,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  oneDayLabel: {
    letterSpacing: 1,
  },
  quote: {
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: tokens.space.lg,
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
    marginTop: tokens.space.xs,
  },
});
