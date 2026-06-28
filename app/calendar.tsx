import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { CalendarIcon } from "@/components/atoms/calendar-icon";
import { HorizonStrip } from "@/components/molecules/horizon-strip";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { MonthGrid } from "@/components/organisms/month-grid";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { UpcomingPreviewCard } from "@/components/organisms/upcoming-preview-card";
import { useTheme, tokens } from "@/constants/theme";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useDatabase } from "@/hooks/use-database/use-database";

dayjs.extend(customParseFormat);

export default function CalendarScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { entries } = useDatabase();

  const {
    calendarDays,
    currentMonthLabel,
    isCurrentMonth,
    today,
    getEntriesForDay,
    upcomingEntries,
  } = useCalendarData(entries, currentMonth);

  const handleMonthChange = useCallback((direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      if (direction === "prev") {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    });
  }, []);

  const handleGoToToday = useCallback(() => {
    setCurrentMonth(new Date());
  }, []);

  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(date);
    setSheetVisible(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setSelectedDate(null), 200);
  }, []);

  const selectedEntries = useMemo(
    () => (selectedDate ? getEntriesForDay(selectedDate) : []),
    [selectedDate, getEntriesForDay],
  );

  // Horizon deadlines pinned to their period: open window commitments whose
  // window END falls inside the visible month. They live in the strip above
  // the grid, not faked onto a single day cell.
  const horizonEntries = useMemo(() => {
    const month = dayjs(currentMonth);
    return entries.filter((e) => {
      if (!e.due_range || !e.due_date) return false;
      if (e.status === "completed" || e.status === "met") return false;
      return dayjs(e.due_date, "DD/MM/YYYY").isSame(month, "month");
    });
  }, [entries, currentMonth]);

  const monthGridProps = useMemo(
    () => ({
      currentMonth,
      currentMonthLabel,
      isCurrentMonth,
      calendarDays,
      today,
      getEntriesForDay,
      onMonthChange: handleMonthChange,
      onDayPress: handleDayPress,
      onGoToToday: handleGoToToday,
    }),
    [
      currentMonth,
      currentMonthLabel,
      isCurrentMonth,
      calendarDays,
      today,
      getEntriesForDay,
      handleMonthChange,
      handleDayPress,
      handleGoToToday,
    ],
  );

  const upcomingProps = useMemo(
    () => ({
      upcomingEntries,
    }),
    [upcomingEntries],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {/* Header owned by the navigator (Stack); the kicker tracks the visible
          month so the spine reflects what's on screen. */}
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="Calendar"
              kicker={currentMonthLabel.toUpperCase()}
              glyph={<CalendarIcon size={24} />}
              onBack={() => router.back()}
              inset
            />
          ),
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HorizonStrip entries={horizonEntries} />
        <MonthGrid {...monthGridProps} />
        <UpcomingPreviewCard {...upcomingProps} />
        <View style={styles.bottomSpacer} />
      </ScrollView>
      <DayDetailSheet
        visible={sheetVisible}
        date={selectedDate}
        entries={selectedEntries}
        today={today}
        onClose={handleCloseSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.lg,
    paddingTop: tokens.space.md,
  },
  bottomSpacer: {
    height: 80,
  },
});
