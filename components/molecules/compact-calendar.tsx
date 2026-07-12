import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { isSameDayDate, MONTH_ABBRS } from "@/lib/date-utils";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

type CompactCalendarProps = {
  /** Currently selected day, or null. */
  value: Date | null;
  onSelect: (date: Date) => void;
  /** Entry-type tint used for the selected pill + month accents. */
  accentColor: string;
};

/**
 * A lean month grid built only for the Add-Entry "When" control — deliberately
 * NOT the full home `month-grid` (which carries entry dots, sheets, and density
 * this surface doesn't want). One job: pick one future-leaning day, in The
 * Field's pastel idiom, with no keyboard.
 */
export function CompactCalendar({
  value,
  onSelect,
  accentColor,
}: CompactCalendarProps): React.ReactElement {
  const { colors } = useTheme();
  // The visible month — seeds from the selection, else today.
  const [cursor, setCursor] = useState<Dayjs>(
    value ? dayjs(value) : dayjs(),
  );
  const today = dayjs();

  const monthStart = cursor.startOf("month");
  // Monday-first offset (dayjs day(): Sun=0 … Sat=6).
  const leadingBlanks = (monthStart.day() + 6) % 7;
  const daysInMonth = cursor.daysInMonth();

  const cells: (Dayjs | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => monthStart.add(i, "day")),
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceSubtle }]}
    >
      {/* Month navigator */}
      <View style={styles.monthBar}>
        <Pressable
          onPress={() => setCursor((c) => c.subtract(1, "month"))}
          hitSlop={12}
          style={styles.navButton}
        >
          <IconSymbol name="ChevronLeft" size={18} color={colors.inkMuted} />
        </Pressable>
        <ThemedText type="bodyBold" style={styles.monthLabel}>
          {MONTH_ABBRS[cursor.month()]} {cursor.year()}
        </ThemedText>
        <Pressable
          onPress={() => setCursor((c) => c.add(1, "month"))}
          hitSlop={12}
          style={styles.navButton}
        >
          <IconSymbol name="ChevronRight" size={18} color={colors.inkMuted} />
        </Pressable>
      </View>

      {/* Weekday header */}
      <View style={styles.weekRow}>
        {WEEKDAY_LETTERS.map((letter, i) => (
          <View key={i} style={styles.cell}>
            <ThemedText type="caption" muted style={styles.weekdayText}>
              {letter}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`b${i}`} style={styles.cell} />;

          const jsDate = day.toDate();
          const isSelected = value ? isSameDayDate(jsDate, value) : false;
          const isToday = isSameDayDate(jsDate, today.toDate());
          const isPast = day.isBefore(today, "day");

          return (
            <Pressable
              key={day.format("YYYY-MM-DD")}
              onPress={() => onSelect(jsDate)}
              style={styles.cell}
              hitSlop={6}
            >
              <View
                style={[
                  styles.dayPill,
                  isSelected && { backgroundColor: accentColor },
                ]}
              >
                <ThemedText
                  type="body"
                  style={[
                    styles.dayText,
                    { color: colors.ink },
                    isPast && { color: colors.inkMuted },
                    isToday && !isSelected && { color: accentColor },
                    isSelected && [styles.dayTextSelected, { color: colors.paper }],
                  ]}
                >
                  {day.date()}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
    gap: tokens.space.xs,
  },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.xs,
  },
  navButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 13,
  },
  weekRow: {
    flexDirection: "row",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 1,
  },
  weekdayText: {
    fontSize: 10,
  },
  dayPill: {
    width: 30,
    height: 30,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 13,
  },
  dayTextSelected: {
    fontWeight: "600",
  },
});
