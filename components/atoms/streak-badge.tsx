import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { Radius, Spacing, Surface, TextColors } from '@/constants/theme';

interface StreakBadgeProps {
  count: number;
  /** Accent color for the lightning bolt icon. Defaults to tertiary. */
  accentColor?: string;
}

/**
 * Compact streak counter badge.
 * Lightning icon + "STREAK" label + numeric count.
 * Used alongside the progress counter in the list screen header.
 */
export function StreakBadge({
  count,
  accentColor = TextColors.secondary,
}: StreakBadgeProps): React.ReactElement {
  return (
    <View style={styles.badge}>
      <MaterialCommunityIcons name="lightning-bolt" size={20} color={accentColor} />
      <ThemedText type="caption" style={styles.label}>
        STREAK
      </ThemedText>
      <ThemedText type="headline" style={[styles.count, { color: accentColor }]}>
        {String(count).padStart(2, '0')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Surface.containerHigh,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 80,
  },
  label: {
    letterSpacing: 0.8,
    color: TextColors.tertiary,
  },
  count: {
    lineHeight: 28,
  },
});
