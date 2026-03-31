import { View, StyleSheet } from 'react-native';

import { EntryAccent } from '@/constants/theme';

export type EntryType = 'task' | 'deadline' | 'event' | 'someday';

interface EntryDotProps {
  type: EntryType;
  size?: number;
}

/**
 * 6px colored dot representing an entry type.
 * Color = categorization, not urgency (DESIGN.md principle).
 */
export function EntryDot({ type, size = 6 }: EntryDotProps): React.ReactElement {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: EntryAccent[type],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    flexShrink: 0,
  },
});
