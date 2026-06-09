import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { useTheme, tokens } from '@/constants/theme';

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
  accentColor,
}: StreakBadgeProps): React.ReactElement {
  const { colors } = useTheme();
  const resolvedAccent = accentColor ?? colors.inkMuted;
  return (
    <View style={[styles.badge, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons name="lightning-bolt" size={20} color={resolvedAccent} />
      <ThemedText type="caption" style={[styles.label, { color: colors.inkMuted }]}>
        STREAK
      </ThemedText>
      <ThemedText type="headline" style={[styles.count, { color: resolvedAccent }]}>
        {String(count).padStart(2, '0')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    alignItems: 'center',
    gap: tokens.space.xs,
    minWidth: 80,
  },
  label: {
    letterSpacing: 0.8,
  },
  count: {
    lineHeight: 28,
  },
});
