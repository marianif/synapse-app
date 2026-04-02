import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, ScrollView, StyleSheet, View } from "react-native";

import { AgendaSection } from "@/components/organisms/agenda-section";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { DeadlinesCard } from "@/components/organisms/deadlines-card";
import { Fab } from "@/components/organisms/fab";
import { TodaySection } from "@/components/organisms/today-section";
import { WeekStrip } from "@/components/organisms/week-strip";
import { WeeklyOverviewCard } from "@/components/organisms/weekly-overview-card";

import { SomedayItem } from "@/components/molecules/someday-item";
import { Spacing, Surface } from "@/constants/theme";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useDatabase } from "@/hooks/use-database/use-database";
import {
  getDeadlines,
  getEntriesForDay,
  getTodayAgenda,
  getTodayEvents,
  getWeeklyTodos,
} from "@/hooks/use-database/use-database.helpers";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";
import { DAY_NAMES, formatDateLabel } from "@/lib/date-utils";
import { ExtensionStorage } from "@bacons/apple-targets";

dayjs.extend(customParseFormat);

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

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();

  const { entries, ideas, recurrenceCompletions, fetchEntries, fetchIdeas } =
    useDatabase();

  const { weekCounts, today: calendarToday } = useCalendarData(
    entries,
    new Date(),
    recurrenceCompletions,
  );

  const { transcript, startRecording, stopRecording } = useSpeechRecognizer();
  const [isRecording, setIsRecording] = useState(false);

  const handleStartRecording = useCallback(async () => {
    setIsRecording(true);
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
    setIsRecording(false);
    if (transcript.trim()) {
      router.push({
        pathname: "/modal",
        params: { title: transcript.trim() },
      });
    }
  }, [stopRecording, transcript, router]);

  const handleCancelRecording = useCallback(async () => {
    await stopRecording();
    setIsRecording(false);
  }, [stopRecording]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
      fetchIdeas();
    }, [fetchEntries, fetchIdeas]),
  );

  const today = useMemo(() => new Date(), []);
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

  const handleFabPress = () => {
    isRecording ? handleStopRecording() : router.push("/voice-input");
  };

  const weeklyEntries = useMemo(
    () => getWeeklyTodos(entries, weekDays),
    [entries, weekDays],
  );

  const allDeadlines = useMemo(() => getDeadlines(entries), [entries]);

  const todayEvents = useMemo(
    () => getTodayEvents(entries, today),
    [entries, today],
  );

  const todayAgenda = useMemo(
    () => getTodayAgenda(entries, recurrenceCompletions, today),
    [entries, recurrenceCompletions, today],
  );

  const entriesForSheet = useMemo(
    () =>
      getEntriesForDay(entries, recurrenceCompletions, selectedDate ?? today),
    [entries, recurrenceCompletions, selectedDate, today],
  );

  const taskEntries = entries.filter((e) => e.type === "todo");
  const deadlineEntries = entries.filter((e) => e.type === "deadline");

  useEffect(() => {
    AppState.addEventListener("change", (status) => {
      if (status === "background") {
        ExtensionStorage.reloadWidget();
      }
    });
  }, []);

  return (
    <View style={styles.screen}>
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

        <View style={styles.fabSpacer} />
      </ScrollView>
      <Fab
        onPress={handleFabPress}
        onLongPress={handleStartRecording}
        isRecording={isRecording}
        transcript={transcript}
        onStop={handleStopRecording}
        onCancel={handleCancelRecording}
      />
      <DayDetailSheet
        visible={sheetVisible}
        date={selectedDate}
        entries={entriesForSheet}
        today={calendarToday}
        onClose={handleCloseSheet}
        onAdd={handleOpenAddModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
