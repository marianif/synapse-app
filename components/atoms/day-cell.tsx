import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { Radius, Spacing, entryColor, useTheme } from '@/constants/theme';

import type { CalendarEntry } from '@/hooks/use-calendar-data';

interface DayCellProps {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
  onPress: (date: Date) => void;
}

export function DayCell({
  date,
  dayNumber,
  isCurrentMonth,
  isToday,
  entries,
  onPress,
}: DayCellProps): React.ReactElement {
  const { colors } = useTheme();
  const hasEntries = entries.length > 0;
  const overflow = entries.length > 3 ? entries.length - 3 : 0;

  const handlePress = () => {
    onPress(date);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.cell,
        { backgroundColor: colors.surface },
        pressed && [styles.cellPressed, { backgroundColor: colors.surface }],
        isToday && [styles.cellToday, { backgroundColor: colors.surface, borderColor: colors.accent.clay }],
        !isCurrentMonth && styles.cellOutside,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${hasEntries ? `, ${entries.length} entries` : ''}`}
    >
      <View style={styles.content}>
        <ThemedText
          type="body"
          style={[
            styles.dayNumber,
            { color: colors.ink },
            isToday && [styles.dayNumberToday, { color: colors.accent.clay }],
            !isCurrentMonth && [styles.dayNumberOutside, { color: colors.inkMuted }],
          ]}
        >
          {dayNumber}
        </ThemedText>

        {hasEntries && (
          <View style={styles.dots}>
            {entries.slice(0, 3).map((entry, i) => (
              <View
                key={entry.id}
                style={[
                  styles.dot,
                  { backgroundColor: entryColor(entry.type) },
                ]}
              />
            ))}
            {overflow > 0 && (
              <ThemedText type="caption" style={[styles.overflow, { color: colors.inkMuted }]}>
                +{overflow}
              </ThemedText>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 52,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPressed: {
    transform: [{ scale: 0.96 }],
  },
  cellToday: {
    borderWidth: 2,
  },
  cellOutside: {
    backgroundColor: 'transparent',
    opacity: 0.3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  dayNumberToday: {
    fontWeight: '700',
  },
  dayNumberOutside: {},
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  overflow: {
    fontSize: 8,
  },
});
