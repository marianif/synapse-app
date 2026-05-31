import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CaptureBar } from "@/components/organisms/capture-bar";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { FieldTile } from "@/components/organisms/field-tile";
import { WeekStrip } from "@/components/organisms/week-strip";

import { FieldGreeting } from "@/components/molecules/field-greeting";
import { tokens, useTheme } from "@/constants/theme";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useDatabase } from "@/hooks/use-database/use-database";
import { getEntriesForDay } from "@/hooks/use-database/use-database.helpers";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

import type { FieldTileItem, Urgency } from "@/components/organisms/field-tile";
import type { DbEntry, EntryType } from "@/lib/types";
import type { Href } from "expo-router";

dayjs.extend(customParseFormat);

const TODAY_START = () => dayjs().startOf("day");

/** Days from today until an entry's date; null if undated. Negative = overdue. */
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return dayjs(dateStr, "DD/MM/YYYY").startOf("day").diff(TODAY_START(), "day");
}

/**
 * Time-distance → visual weight. This is the design: a thing's urgency, not its
 * order, decides how loud it renders. Overdue or ≤1 day looms; within the week
 * is near; a week-plus out (or undated) recedes.
 */
function urgencyOf(days: number | null): Urgency {
  if (days === null) return "distant";
  if (days <= 1) return "looming"; // today, tomorrow, overdue
  if (days < 7) return "near";
  return "distant";
}

/** Absolute when-label sized to distance: time today, weekday this week, else date. */
function whenLabel(
  dateStr: string | null,
  time: string | null,
  days: number | null,
): string | undefined {
  if (days === null) return undefined;
  const d = dayjs(dateStr!, "DD/MM/YYYY");
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return time ?? "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return d.format("ddd");
  if (d.isSame(TODAY_START(), "year")) return d.format("D MMM");
  return d.format("MMM YYYY");
}

function toTileItems(entries: DbEntry[]): FieldTileItem[] {
  return entries.map((e) => {
    const dateStr = e.due_date ?? e.scheduled_date ?? null;
    const time = e.scheduled_time ?? e.due_time ?? null;
    const days = daysUntil(dateStr);
    return {
      id: e.id,
      title: e.title,
      when: whenLabel(dateStr, time, days),
      urgency: urgencyOf(days),
    };
  });
}

/** Sort by soonest date, undated last — used to order within a type group. */
function byDate(a: DbEntry, b: DbEntry): number {
  const da = a.due_date ?? a.scheduled_date;
  const db = b.due_date ?? b.scheduled_date;
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return dayjs(da, "DD/MM/YYYY").unix() - dayjs(db, "DD/MM/YYYY").unix();
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();

  const { entries, recurrenceCompletions, fetchEntries } = useDatabase();

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
      router.push({ pathname: "/modal", params: { title: transcript.trim() } });
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
        router.push({ pathname: "/modal", params: { date: `${dd}/${mm}/${yyyy}` } });
      } else {
        router.push("/modal");
      }
    },
    [router],
  );

  const handleCapturePress = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    } else {
      router.push("/voice-input");
    }
  }, [isRecording, handleStopRecording, router]);

  // The whole field, grouped by type — everything the user is carrying, never
  // curated to "today". Each group is sorted soonest-first.
  const byType = useMemo(() => {
    const groups: Record<EntryType, DbEntry[]> = {
      deadline: [],
      idea: [],
      todo: [],
      event: [],
      someday: [],
    };
    const open = entries.filter(
      (e) => e.status !== "completed" && e.status !== "met",
    );
    for (const e of open) {
      if (groups[e.type as EntryType]) groups[e.type as EntryType].push(e);
    }
    for (const k of Object.keys(groups) as EntryType[]) {
      groups[k] = [...groups[k]].sort(byDate);
    }
    return groups;
  }, [entries]);

  const fieldCount = useMemo(
    () =>
      Object.values(byType).reduce((sum, g) => sum + g.length, 0),
    [byType],
  );

  const entriesForSheet = useMemo(
    () => getEntriesForDay(entries, recurrenceCompletions, selectedDate ?? today),
    [entries, recurrenceCompletions, selectedDate, today],
  );

  // Order: bills first (most time-sensitive), then ideas, todos, events, someday.
  // Every type is always present — the field is never hidden.
  const tiles: {
    type: EntryType;
    label: string;
    items: FieldTileItem[];
    href: Href;
    emptyHint: string;
  }[] = [
    {
      type: "deadline",
      label: "Bills & Deadlines",
      items: toTileItems(byType.deadline),
      href: "/list?entryType=deadline",
      emptyHint: "Nothing due. Add a bill or deadline.",
    },
    {
      type: "idea",
      label: "Ideas",
      items: toTileItems(byType.idea),
      href: "/list?entryType=idea",
      emptyHint: "Catch an idea before it's gone.",
    },
    {
      type: "todo",
      label: "To-dos",
      items: toTileItems(byType.todo),
      href: "/list?entryType=todo",
      emptyHint: "Nothing to do. Add a task.",
    },
    {
      type: "event",
      label: "Events",
      items: toTileItems(byType.event),
      href: "/list?entryType=event",
      emptyHint: "No events scheduled.",
    },
    {
      type: "someday",
      label: "Someday",
      items: toTileItems(byType.someday),
      href: "/list?entryType=someday",
      emptyHint: "Park a maybe for later.",
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FieldGreeting now={today} fieldCount={fieldCount} />

        <WeekStrip
          weekCounts={weekCounts}
          today={calendarToday}
          onDayPress={handleDayPress}
        />

        {tiles.map((t, i) => (
          <FieldTile
            key={t.type}
            type={t.type}
            label={t.label}
            items={t.items}
            href={t.href}
            itemHref={(item) => ({
              pathname: "/detail",
              params: { id: item.id },
            })}
            emptyHint={t.emptyHint}
            index={i}
          />
        ))}

        <View style={styles.captureSpacer} />
      </ScrollView>

      <View style={styles.captureDock} pointerEvents="box-none">
        <CaptureBar
          onPress={handleCapturePress}
          onLongPress={handleStartRecording}
          isRecording={isRecording}
          transcript={transcript}
          onStop={handleStopRecording}
          onCancel={handleCancelRecording}
        />
      </View>

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
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.xl,
  },
  captureSpacer: {
    height: 72,
  },
  captureDock: {
    position: "absolute",
    left: tokens.space.lg,
    right: tokens.space.lg,
    bottom: tokens.space.lg,
  },
});
