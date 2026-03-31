import { View, StyleSheet } from 'react-native';

import { EntryDot } from '@/components/atoms/entry-dot';
import { ThemedText } from '@/components/atoms/themed-text';
import { Spacing } from '@/constants/theme';

import type { EntryType } from '@/components/atoms/entry-dot';

interface EntryRowProps {
  title: string;
  subtitle?: string;
  time?: string;
  entryType: EntryType;
}

/**
 * Agenda list item molecule.
 * Dot + title + subtitle on the left; time label pinned to the right.
 * No divider lines — vertical spacing handles separation (DESIGN.md rule).
 */
export function EntryRow({ title, subtitle, time, entryType }: EntryRowProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <View style={styles.dotWrapper}>
        <EntryDot type={entryType} size={8} />
      </View>
      <View style={styles.content}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="caption" muted numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {time ? (
        <ThemedText type="caption" muted style={styles.time}>
          {time}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dotWrapper: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  time: {
    minWidth: 52,
    textAlign: 'right',
  },
});
