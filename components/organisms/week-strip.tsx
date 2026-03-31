import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { EntryDot } from '@/components/atoms/entry-dot';
import { Brand, Radius, Spacing, Surface, TextColors } from '@/constants/theme';

import type { DayCount } from '@/hooks/use-calendar-data';

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeekStripProps {
  weekCounts: DayCount[];
  today: Date;
}

export function WeekStrip({ weekCounts, today }: WeekStripProps): React.ReactElement {
  const todayDow = today.getDay();
  const todayIndex = todayDow === 0 ? 6 : todayDow - 1;

  return (
    <View style={styles.container}>
      <View style={styles.strip}>
        {weekCounts.map((day, index) => {
          const isToday = index === todayIndex;
          const hasEntries = day.count > 0;

          return (
            <View
              key={day.date}
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
                  <View style={styles.dots}>
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
                  <View style={styles.emptyDot} />
                )}
              </View>

              {day.count > 0 && (
                <ThemedText type="caption" muted style={styles.countLabel}>
                  {day.count}
                </ThemedText>
              )}
            </View>
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
    backgroundColor: Brand.fabGlow,
    borderRadius: Radius.md,
  },
  dayLabel: {
    color: TextColors.tertiary,
    fontSize: 10,
  },
  dayLabelToday: {
    color: Brand.primary,
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
  emptyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TextColors.disabled,
  },
  countLabel: {
    fontSize: 9,
  },
  count: {
    fontSize: 8,
    marginLeft: 1,
  },
});
