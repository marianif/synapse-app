import { Text, StyleSheet } from 'react-native';

import { EntryAccent, FontSize, LetterSpacing, LineHeight } from '@/constants/theme';

import type { EntryType } from '@/components/atoms/entry-dot';

interface CounterDisplayProps {
  value: number;
  accentType: EntryType;
}

/**
 * 48pt hero counter — the heartbeat of each Bento card.
 * Color is derived from the entry type accent palette.
 * Per DESIGN.md: tracking set to -2% to feel confident and tight.
 */
export function CounterDisplay({ value, accentType }: CounterDisplayProps): React.ReactElement {
  return (
    <Text style={[styles.counter, { color: EntryAccent[accentType] }]}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  counter: {
    fontSize: FontSize.displayLg,
    lineHeight: LineHeight.displayLg,
    letterSpacing: LetterSpacing.displayLg,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
