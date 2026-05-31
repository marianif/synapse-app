import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AgendaSection } from "@/components/organisms/agenda-section";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { DeadlinesCard } from "@/components/organisms/deadlines-card";
import { Fab } from "@/components/organisms/fab";
import { TodaySection } from "@/components/organisms/today-section";
import { WeekStrip } from "@/components/organisms/week-strip";
import { NextUpCard } from "@/components/organisms/next-up-card";
import { WeeklyOverviewCard } from "@/components/organisms/weekly-overview-card";

import { SomedayItem } from "@/components/molecules/someday-item";
import { useTheme, tokens } from "@/constants/theme";
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
  const { colors } = useTheme();

  const { entries, recurrenceCompletions, fetchEntries } =
    useDatabase();

  const somedayEntries = entries.filter((e) => e.type === "someday" || e.type === "idea");

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
    }, [fetchEntries]),
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
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

        <NextUpCard entries={entries} />

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

        {somedayEntries.length > 0 && <SomedayItem ideas={somedayEntries} />}

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
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  fabSpacer: {
    height: 80,
  },
});
