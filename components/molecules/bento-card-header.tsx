import { View, StyleSheet } from 'react-native';

import { CounterDisplay } from '@/components/atoms/counter-display';
import { ThemedText } from '@/components/atoms/themed-text';
import { Spacing, TextColors } from '@/constants/theme';

import type { EntryType } from '@/components/atoms/entry-dot';

interface BentoCardHeaderProps {
  count: number;
  accentType: EntryType;
  label: string;
  description: string;
  icon: React.ReactElement;
}

/**
 * Header row for Bento cards: large counter on the left, category label +
 * description stacked in the center, icon anchored to the right.
 * Mirrors the layout seen in Weekly Overview and Deadlines cards.
 */
export function BentoCardHeader({
  count,
  accentType,
  label,
  description,
  icon,
}: BentoCardHeaderProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <CounterDisplay value={count} accentType={accentType} />
      <View style={styles.meta}>
        <ThemedText type="label" style={{ color: TextColors.secondary }}>
          {label}
        </ThemedText>
        <ThemedText type="caption" muted>
          {description}
        </ThemedText>
      </View>
      <View style={styles.iconSlot}>{icon}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  iconSlot: {
    opacity: 0.4,
  },
});
