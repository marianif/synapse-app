import dayjs from "dayjs";
import { useMemo, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { tokens, useTheme } from "@/constants/theme";
import { toDisplayDate } from "@/lib/date-utils";
import { expandHabitCadence } from "@/lib/recurrence";

import type { DbHabit } from "@/lib/types";

// Same mark strengths as the month grid: a missed scheduled day reads clearly,
// an off-cadence day stays almost silent.
const MISSED_OPACITY = 0.3;
const FUTURE_OPACITY = 0.16;
const OFF_OPACITY = 0.12;

interface HabitYearHeatmapProps {
  habit: DbHabit;
  /** "habitId::DD/MM/YYYY" keys of completed instances for this habit. */
  done: Set<string>;
}

/**
 * The year view: one column per week, one cell per day, the whole year laid
 * out left to right and scrolled to today on open. Same mark language as the
 * month grid (done / scheduled-missed / off-cadence), just denser — a year at a
 * glance, no streaks and no totals read off it.
 */
export function HabitYearHeatmap({
  habit,
  done,
}: HabitYearHeatmapProps): React.ReactElement {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const today = useMemo(() => dayjs().startOf("day"), []);
  const yearStart = useMemo(() => today.startOf("year"), [today]);
  const yearEnd = useMemo(() => today.endOf("year"), [today]);

  // Monday-first so the columns line up with the month grid.
  const firstMonday = useMemo(
    () => yearStart.subtract((yearStart.day() + 6) % 7, "day"),
    [yearStart],
  );

  const scheduled = useMemo(
    () =>
      new Set(
        expandHabitCadence(
          habit,
          firstMonday.toDate(),
          yearEnd.add(6, "day").toDate(),
        ),
      ),
    [habit, firstMonday, yearEnd],
  );

  const columns = useMemo(() => {
    const cols: { key: number; days: dayjs.Dayjs[] }[] = [];
    let cursor = firstMonday;
    while (cursor.isBefore(yearEnd, "day") || cursor.isSame(yearEnd, "day")) {
      cols.push({
        key: cursor.valueOf(),
        days: Array.from({ length: 7 }, (_, r) => cursor.add(r, "day")),
      });
      cursor = cursor.add(7, "day");
    }
    return cols;
  }, [firstMonday, yearEnd]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() =>
        scrollRef.current?.scrollToEnd({ animated: false })
      }
      contentContainerStyle={styles.content}
    >
      {columns.map((column) => (
        <View key={column.key} style={styles.column}>
          {column.days.map((day) => {
            if (day.year() !== yearStart.year()) {
              return <View key={day.valueOf()} style={styles.cell} />;
            }
            const key = toDisplayDate(day.toDate());
            const isDone = done.has(key);
            const isScheduled = scheduled.has(key);
            const isFuture = day.isAfter(today, "day");
            const opacity = isDone
              ? 1
              : !isScheduled
                ? OFF_OPACITY
                : isFuture
                  ? FUTURE_OPACITY
                  : MISSED_OPACITY;
            return (
              <View
                key={key}
                style={[
                  styles.cell,
                  {
                    backgroundColor: isDone
                      ? colors.feedback.success
                      : colors.inkMuted,
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    gap: 3,
    paddingVertical: tokens.space.xs,
  },
  column: {
    gap: 3,
  },
  cell: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
