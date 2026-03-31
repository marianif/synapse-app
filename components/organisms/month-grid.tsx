import { View, StyleSheet, Pressable } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { DayCell } from '@/components/atoms/day-cell';
import { MonthNavigator } from '@/components/atoms/month-navigator';
import { Radius, Spacing, Surface, TextColors } from '@/constants/theme';

import type { CalendarEntry } from '@/hooks/use-calendar-data';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface MonthGridProps {
  currentMonth: Date;
  currentMonthLabel: string;
  isCurrentMonth: boolean;
  calendarDays: Date[];
  today: Date;
  getEntriesForDay: (date: Date) => CalendarEntry[];
  onMonthChange: (direction: 'prev' | 'next') => void;
  onDayPress: (date: Date) => void;
  onGoToToday: () => void;
}

export function MonthGrid({
  currentMonth,
  currentMonthLabel,
  isCurrentMonth,
  calendarDays,
  today,
  getEntriesForDay,
  onMonthChange,
  onDayPress,
  onGoToToday,
}: MonthGridProps): React.ReactElement {
  const handlePrevMonth = () => {
    onMonthChange('prev');
  };

  const handleNextMonth = () => {
    onMonthChange('next');
  };

  const rows: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    rows.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      <MonthNavigator
        label={currentMonthLabel}
        isCurrentMonth={isCurrentMonth}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
        onToday={isCurrentMonth ? undefined : onGoToToday}
      />

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={styles.weekdayCell}>
            <ThemedText type="label" style={styles.weekdayLabel}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <Pressable style={styles.gridWrapper}>
        {rows.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((date, dayIndex) => {
              const isCurrentMonthDay =
                date.getMonth() === currentMonth.getMonth();
              const isToday = isSameDay(date, today);
              const entries = getEntriesForDay(date);

              return (
                <DayCell
                  key={`${weekIndex}-${dayIndex}`}
                  date={date}
                  dayNumber={date.getDate()}
                  isCurrentMonth={isCurrentMonthDay}
                  isToday={isToday}
                  entries={entries}
                  onPress={onDayPress}
                />
              );
            })}
          </View>
        ))}
      </Pressable>
    </View>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    marginBottom: Spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  weekdayLabel: {
    color: TextColors.tertiary,
    fontSize: 11,
  },
  gridWrapper: {
    paddingHorizontal: 2,
  },
  weekRow: {
    flexDirection: 'row',
  },
});
