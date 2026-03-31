import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { EntryAccent, FontSize, LetterSpacing, LineHeight, Radius, Spacing } from '@/constants/theme';

type CountdownState = 'pending' | 'overdue' | 'met';

interface CountdownChipProps {
  daysRemaining: number;
  /** Derived automatically from daysRemaining when not provided. */
  state?: CountdownState;
}

/**
 * Deadline urgency hero chip.
 * Displays "DUE IN N DAYS", "DUE TODAY", "OVERDUE", or "MET".
 * Color shifts from coral (pending) → red (overdue) → muted (met).
 */
export function CountdownChip({ daysRemaining, state }: CountdownChipProps): React.ReactElement {
  const resolvedState: CountdownState =
    state ?? (daysRemaining < 0 ? 'overdue' : 'met');

  const color =
    resolvedState === 'met'
      ? '#52C87A'                // soft green — met/done
      : resolvedState === 'overdue'
        ? '#FF4444'              // bright red — past due
        : EntryAccent.deadline;  // coral — still pending

  const bgColor = color + '18'; // 9% opacity tint

  const label =
    resolvedState === 'met'
      ? 'MET'
      : resolvedState === 'overdue'
        ? `OVERDUE BY ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'DAY' : 'DAYS'}`
        : daysRemaining === 0
          ? 'DUE TODAY'
          : `DUE IN ${daysRemaining} ${daysRemaining === 1 ? 'DAY' : 'DAYS'}`;

  return (
    <View style={[styles.chip, { backgroundColor: bgColor }]}>
      <ThemedText style={[styles.number, { color }]}>
        {resolvedState !== 'met'
          ? Math.abs(daysRemaining) === 0
            ? '0'
            : String(Math.abs(daysRemaining))
          : '✓'}
      </ThemedText>
      <ThemedText style={[styles.label, { color }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  number: {
    fontSize: FontSize.displayLg,
    lineHeight: LineHeight.displayLg,
    letterSpacing: LetterSpacing.displayLg,
    fontFamily: 'Inter_700Bold',
  },
  label: {
    fontSize: FontSize.labelSm,
    letterSpacing: LetterSpacing.labelSm,
    fontFamily: 'Inter_600SemiBold',
  },
});
