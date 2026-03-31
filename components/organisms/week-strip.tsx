import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { EntryDot } from '@/components/atoms/entry-dot';
import { EntryAccent, Radius, Spacing, Surface, TextColors } from '@/constants/theme';

import type { DayCount } from '@/hooks/use-calendar-data';

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeekStripProps {
  weekCounts: DayCount[];
  today: Date;
  onDayPress?: (date: Date) => void;
}

function parseDateKey(dateStr: string): Date {
  const parts = dateStr.split('/');
  return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
}

export function WeekStrip({ weekCounts, today, onDayPress }: WeekStripProps): React.ReactElement {
  const todayDow = today.getDay();
  const todayIndex = todayDow === 0 ? 6 : todayDow - 1;

  const handlePress = (dateStr: string) => {
    const date = parseDateKey(dateStr);
    if (onDayPress) {
      onDayPress(date);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.strip}>
        {weekCounts.map((day, index) => {
          const isToday = index === todayIndex;
          const hasEntries = day.count > 0;

          return (
            <Pressable
              key={day.date}
              onPress={() => handlePress(day.date)}
              style={[styles.dayItem, isToday && styles.dayItemToday]}
            >
              <ThemedText
                type="label"
                style={[styles.dayLabel, isToday && styles.dayLabelToday]}
              >
                {WEEKDAY_NAMES[index]}
              </ThemedText>

              <View style={styles.indicator}>
                {hasEntries ? (
                  <View style={[styles.dots, isToday && styles.dotsToday]}>
                    {day.types.slice(0, 3).map((type) => (
                      <EntryDot key={type} type={type} size={5} />
                    ))}
                    {day.count > 3 && (
                      <ThemedText type="caption" muted style={styles.count}>
                        +{day.count - 3}
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  <View style={[styles.emptyDot, isToday && styles.emptyDotToday]} />
                )}
              </View>

              {day.count > 0 && (
                <ThemedText type="caption" muted style={styles.countLabel}>
                  {day.count}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  dayItemToday: {
    backgroundColor: EntryAccent.today + '33', // 20% opacity
    borderRadius: Radius.md,
  },
  dayLabel: {
    color: TextColors.tertiary,
    fontSize: 10,
  },
  dayLabelToday: {
    color: EntryAccent.today,
  },
  indicator: {
    height: 16,
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dotsToday: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(144, 238, 144, 0.15)',
  },
  emptyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TextColors.disabled,
  },
  emptyDotToday: {
    backgroundColor: EntryAccent.today,
  },
  countLabel: {
    fontSize: 9,
  },
  count: {
    fontSize: 8,
    marginLeft: 1,
  },
});
