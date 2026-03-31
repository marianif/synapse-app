import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AgendaSection } from "@/components/organisms/agenda-section";
import { AppHeader } from "@/components/organisms/app-header";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { DeadlinesCard } from "@/components/organisms/deadlines-card";
import { Fab } from "@/components/organisms/fab";
import { TodaySection } from "@/components/organisms/today-section";
import { WeekStrip } from "@/components/organisms/week-strip";
import { WeeklyOverviewCard } from "@/components/organisms/weekly-overview-card";

import type { EntryType } from "@/components/atoms/entry-dot";
import { SomedayItem } from "@/components/molecules/someday-item";
import { Spacing, Surface } from "@/constants/theme";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useDatabase } from "@/hooks/use-database";

dayjs.extend(customParseFormat);

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_ABBRS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDateLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_ABBRS[d.getMonth()]} ${d.getDate()}`;
}

function getWeekDays(): { abbr: string; fullName: string; date: Date }[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return ["Mon", "Tue", "Wed", "Thu", "Fri"].map((abbr, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { abbr, fullName: DAY_NAMES[d.getDay()], date: d };
  });
}

/** Compare a stored "DD/MM/YYYY" date string against a JS Date (day-level). */
function isSameDay(dateStr: string | null | undefined, target: Date): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return false;
  const [dd, mm, yyyy] = parts;
  const d = new Date(
    parseInt(yyyy, 10),
    parseInt(mm, 10) - 1,
    parseInt(dd, 10),
  );
  return (
    d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate()
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();

  const { entries, ideas, fetchEntries, fetchIdeas } = useDatabase();

  const { weekCounts, today: calendarToday } = useCalendarData(
    entries,
    new Date(),
  );

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
      fetchIdeas();
    }, [fetchEntries, fetchIdeas]),
  );

  const today = new Date();
  const todayLabel = formatDateLabel(today);
  const weekDays = getWeekDays();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

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
      setSheetVisible(false);
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

  const getEntriesForDay = useCallback(
    (
      date: Date,
    ): {
      id: string;
      title: string;
      type: EntryType;
      date: string;
      time: string | null;
    }[] => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return entries
        .filter((e) => {
          const entryDate = e.scheduled_date ?? e.due_date;
          return entryDate === key;
        })
        .map((e) => ({
          id: e.id,
          title: e.title,
          type: e.type as EntryType,
          date: key,
          time: e.scheduled_time ?? e.due_time ?? null,
        }));
    },
    [entries],
  );

  // ── Weekly todos ─────────────────────────────────────────────────────────────
  const taskEntries = entries.filter((e) => e.type === "todo");
  const weeklyEntries = weekDays.map(({ abbr, date }) => {
    const entry = taskEntries.find((e) => isSameDay(e.scheduled_date, date));
    const rawStatus = entry?.status;
    const status: "scheduled" | "active" | "completed" | undefined =
      rawStatus === "completed" || rawStatus === "met"
        ? "completed"
        : rawStatus === "active" || rawStatus === "overdue"
          ? "active"
          : "scheduled";
    return {
      day: abbr,
      title: entry?.title,
      entryType: "task" as const,
      status,
    };
  });

  // ── Deadlines ────────────────────────────────────────────────────────────────
  const deadlineEntries = entries.filter((e) => e.type === "deadline");

  const allDeadlines = deadlineEntries
    .filter((e) => e.due_date)
    .sort(
      (a, b) =>
        dayjs(a.due_date!, "DD/MM/YYYY").unix() -
        dayjs(b.due_date!, "DD/MM/YYYY").unix(),
    )
    .map((entry) => {
      const rawStatus = entry.status;
      const status: "scheduled" | "active" | "completed" | undefined =
        rawStatus === "completed" || rawStatus === "met"
          ? "completed"
          : rawStatus === "active" || rawStatus === "overdue"
            ? "active"
            : "scheduled";
      return {
        day: dayjs(entry.due_date!, "DD/MM/YYYY").format("DD/MM"),
        title: entry.title,
        status,
      };
    });

  // ── Today's events ────────────────────────────────────────────────────────────
  const todayEvents = entries
    .filter((e) => e.type === "event" && isSameDay(e.scheduled_date, today))
    .map((e) => ({
      id: e.id,
      title: e.title,
      timeRange: e.scheduled_time ?? undefined,
      isActive: e.status === "active",
    }));

  // ── Today's agenda (all types) ────────────────────────────────────────────────
  const todayAgenda = entries
    .filter((e) => isSameDay(e.scheduled_date, today))
    .map((e) => ({
      id: e.id,
      title: e.title,
      time: e.scheduled_time ?? e.due_time ?? undefined,
      entryType: e.type,
    }));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <AppHeader />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <WeekStrip
            weekCounts={weekCounts}
            today={calendarToday}
            onDayPress={handleDayPress}
          />

          <AgendaSection
            date={todayLabel}
            entries={todayAgenda}
            isEmpty={todayAgenda.length === 0}
            onAdd={() => router.push("/modal")}
          />
          <WeeklyOverviewCard
            totalCount={taskEntries.length}
            spanDays={weeklyEntries.filter((e) => e.title).length || 5}
            entries={weeklyEntries}
            isEmpty={taskEntries.length === 0}
            onAdd={() => router.push("/modal?type=task")}
          />
          <DeadlinesCard
            totalCount={deadlineEntries.length}
            entries={allDeadlines}
            isEmpty={deadlineEntries.length === 0}
            onAdd={() => router.push("/modal?type=deadline")}
          />
          <TodaySection
            events={todayEvents}
            isEmpty={todayEvents.length === 0}
            onAdd={() => router.push("/modal?type=event")}
          />

          {ideas.length > 0 && <SomedayItem ideas={ideas} />}

          {/* Bottom padding so FAB never overlaps the last entry */}
          <View style={styles.fabSpacer} />
        </ScrollView>
        <Fab onPress={() => router.push("/modal")} />
      </View>
      <DayDetailSheet
        visible={sheetVisible}
        date={selectedDate}
        entries={getEntriesForDay(selectedDate ?? new Date())}
        today={calendarToday}
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
    paddingBottom: Spacing.xl,
  },
  fabSpacer: {
    height: 80,
  },
});
