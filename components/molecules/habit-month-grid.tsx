import dayjs from "dayjs";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { toDisplayDate } from "@/lib/date-utils";
import { expandHabitCadence } from "@/lib/recurrence";

import type { DbHabit } from "@/lib/types";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// Non-done marks ride the muted ink at three strengths, so a missed scheduled
// day is clearly a slot while an off-cadence day stays almost silent. The old
// `surfaceSubtle` fill was invisible against the paper in dark mode.
const MISSED_OPACITY = 0.3;
const FUTURE_OPACITY = 0.16;
const OFF_OPACITY = 0.12;

interface HabitMonthGridProps {
  habit: DbHabit;
  /** "habitId::DD/MM/YYYY" keys of completed instances for this habit. */
  done: Set<string>;
  /** 0 = current month, -1 = previous, … */
  monthOffset: number;
  onChangeMonth: (next: number) => void;
}

/**
 * The month view of a habit's history: a Monday-first calendar where each day
 * is a mark. Filled mark = done, solid empty mark = a scheduled day that wasn't
 * marked, faint mark = a day the habit was never on. Today carries a ring.
 * Presence, not a scoreboard — no streak logic reads this grid.
 */
export function HabitMonthGrid({
  habit,
  done,
  monthOffset,
  onChangeMonth,
}: HabitMonthGridProps): React.ReactElement {
  const { colors } = useTheme();
  const today = useMemo(() => dayjs().startOf("day"), []);
  const monthStart = useMemo(
    () => today.add(monthOffset, "month").startOf("month"),
    [today, monthOffset],
  );

  // Monday-first leading blanks, then 42 days so every month fits six rows.
  const leading = (monthStart.day() + 6) % 7;
  const gridStart = useMemo(
    () => monthStart.subtract(leading, "day"),
    [monthStart, leading],
  );
  const scheduled = useMemo(
    () =>
      new Set(
        expandHabitCadence(
          habit,
          gridStart.toDate(),
          gridStart.add(41, "day").toDate(),
        ),
      ),
    [habit, gridStart],
  );

  const weeks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => gridStart.add(w * 7 + d, "day")),
      ),
    [gridStart],
  );

  const atCurrentMonth = monthOffset >= 0;

  return (
    <View>
      <View style={styles.nav}>
        <Pressable
          onPress={() => onChangeMonth(monthOffset - 1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
        >
          <IconSymbol name="ChevronLeft" size={18} color={colors.inkMuted} />
        </Pressable>
        <ThemedText type="mono" style={{ color: colors.ink }}>
          {monthStart.format("MMMM YYYY")}
        </ThemedText>
        <Pressable
          onPress={() => onChangeMonth(monthOffset + 1)}
          disabled={atCurrentMonth}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: atCurrentMonth }}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
        >
          <IconSymbol
            name="ChevronRight"
            size={18}
            color={atCurrentMonth ? colors.surfaceSubtle : colors.inkMuted}
          />
        </Pressable>
      </View>

      <View style={styles.legendRow}>
        {DAY_LETTERS.map((letter, i) => (
          <ThemedText
            key={`${letter}-${i}`}
            type="micro"
            muted
            style={styles.legendLetter}
          >
            {letter}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((day) => {
              const inMonth = day.month() === monthStart.month();
              if (!inMonth) return <View key={day.valueOf()} style={styles.cell} />;
              const key = toDisplayDate(day.toDate());
              const isDone = done.has(key);
              const isScheduled = scheduled.has(key);
              const isFuture = day.isAfter(today, "day");
              const isToday = day.isSame(today, "day");
              const opacity = isDone
                ? 1
                : !isScheduled
                  ? OFF_OPACITY
                  : isFuture
                    ? FUTURE_OPACITY
                    : MISSED_OPACITY;
              return (
                <View key={key} style={styles.cell}>
                  <View
                    style={[
                      styles.markOuter,
                      isToday && { borderColor: colors.inkMuted },
                    ]}
                  >
                    <View
                      style={[
                        styles.mark,
                        {
                          backgroundColor: isDone
                            ? colors.feedback.success
                            : colors.inkMuted,
                          opacity,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
    minHeight: 44,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  legendRow: {
    flexDirection: "row",
    marginTop: tokens.space.xs,
  },
  legendLetter: {
    flex: 1,
    textAlign: "center",
  },
  grid: {
    marginTop: tokens.space.xs,
    gap: tokens.space.xs,
  },
  week: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  cell: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  markOuter: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.sm,
  },
});
