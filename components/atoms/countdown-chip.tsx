import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { entryColor, useTheme, tokens } from '@/constants/theme';

type CountdownState = 'pending' | 'overdue' | 'met';

interface CountdownChipProps {
  daysRemaining: number;
  /** Derived automatically from daysRemaining when not provided. */
  state?: CountdownState;
}

/**
 * Deadline urgency chip — the loudest line of the deadline's telemetry, NOT a
 * hero. The screen's hero is the title above it; this is one fact (days left),
 * so it reads as a compact inline chip that hugs its text, not a centered slab.
 * Displays "DUE IN N DAYS", "DUE TODAY", "OVERDUE", or "MET".
 * Color shifts from coral (pending) → red (overdue) → muted (met) — urgency is
 * carried by hue, not by size.
 */
export function CountdownChip({ daysRemaining, state }: CountdownChipProps): React.ReactElement {
  const { colors } = useTheme();

  const resolvedState: CountdownState =
    state ?? (daysRemaining < 0 ? 'overdue' : 'met');

  const color =
    resolvedState === 'met'
      ? colors.feedback.success                // soft green — met/done
      : resolvedState === 'overdue'
        ? colors.feedback.danger              // bright red — past due
        : entryColor('deadline');  // coral — still pending

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
  // Inline chip that hugs its text — number + label on one row. Sharp corner
  // (Field Lab signal voice), not the soft card radius that read as standalone.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
    gap: tokens.space.sm,
  },
  // One step below the hero title (title scale, not display) — telemetry, not
  // a second hero. Tabular so the digit aligns with the mono readout beneath.
  number: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    fontFamily: 'HostGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: tokens.type.kicker.size,
    letterSpacing: tokens.type.kicker.tracking,
    fontFamily: 'HostGrotesk_600SemiBold',
  },
});
