import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/organisms/app-header";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { Fab } from "@/components/organisms/fab";
import { MonthGrid } from "@/components/organisms/month-grid";
import { UpcomingPreviewCard } from "@/components/organisms/upcoming-preview-card";
import { WeekStrip } from "@/components/organisms/week-strip";
import { Spacing, Surface } from "@/constants/theme";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useDatabase } from "@/hooks/use-database";

export default function CalendarScreen(): React.ReactElement {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { entries } = useDatabase({ fetchEntriesOnMount: true });

  const {
    calendarDays,
    currentMonthLabel,
    isCurrentMonth,
    today,
    getEntriesForDay,
    monthCount,
    upcomingEntries,
    weekCounts,
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

  const handleOpenAddModal = useCallback(
    (preselectedDate?: Date) => {
      if (preselectedDate) {
        const dd = String(preselectedDate.getDate()).padStart(2, "0");
        const mm = String(preselectedDate.getMonth() + 1).padStart(2, "0");
        const yyyy = preselectedDate.getFullYear();
        router.push({
          pathname: "/modal",
          params: { date: `${dd}/${mm}/${yyyy}` },
        });
      } else {
        router.push("/modal");
      }
    },
    [router],
  );

  const selectedEntries = useMemo(
    () => (selectedDate ? getEntriesForDay(selectedDate) : []),
    [selectedDate, getEntriesForDay],
  );

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
      monthCount,
      upcomingEntries,
      onAdd: handleOpenAddModal,
    }),
    [monthCount, upcomingEntries, handleOpenAddModal],
  );

  const weekStripProps = useMemo(
    () => ({
      weekCounts,
      today,
    }),
    [weekCounts, today],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <AppHeader />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <MonthGrid {...monthGridProps} />
          <UpcomingPreviewCard {...upcomingProps} />
          <WeekStrip {...weekStripProps} />
          <View style={styles.bottomSpacer} />
        </ScrollView>
        <Fab onPress={handleOpenAddModal} />
      </View>
      <DayDetailSheet
        visible={sheetVisible}
        date={selectedDate}
        entries={selectedEntries}
        onClose={handleCloseSheet}
        onAdd={handleOpenAddModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  screen: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  bottomSpacer: {
    height: 80,
  },
});
