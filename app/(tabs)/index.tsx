import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { CaptureBar } from "@/components/organisms/capture-bar";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { PresentZone } from "@/components/organisms/present/present-zone";
import { StakesRunway } from "@/components/organisms/stakes-runway";

import { FieldBriefing } from "@/components/molecules/field-briefing";
import { tokens, useTheme } from "@/constants/theme";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useDatabase } from "@/hooks/use-database/use-database";
import { getEntriesForDay } from "@/hooks/use-database/use-database.helpers";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";
import { toPresentItems } from "@/lib/present";

import type { FieldRowItem, Heat } from "@/components/molecules/field-row";
import type { RunwayItem } from "@/components/molecules/runway-gauge";
import type { DbEntry, EntryType } from "@/lib/types";

dayjs.extend(customParseFormat);

const TODAY_START = () => dayjs().startOf("day");

/** Days from today until an entry's date; null if undated. Negative = overdue. */
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return dayjs(dateStr, "DD/MM/YYYY").startOf("day").diff(TODAY_START(), "day");
}

/**
 * Heat is aliveness, NOT urgency-rank. A dated thing close in time runs hot; a
 * thing further out runs warm; an undated idea or someday runs cool — but cool
 * still glows. Nothing goes dark for lacking a deadline (the brief's core rule).
 */
function heatOf(days: number | null): Heat {
  if (days === null) return "cool"; // undated idea / someday — present, not pressing
  if (days <= 1) return "hot"; // overdue, today, tomorrow
  if (days < 7) return "warm";
  return "cool";
}

/** Absolute when-label sized to distance: time today, weekday this week, else date. */
function whenLabel(
  dateStr: string | null,
  time: string | null,
  days: number | null,
): string | undefined {
  if (days === null) return undefined;
  const d = dayjs(dateStr!, "DD/MM/YYYY");
  if (days < 0) return `${Math.abs(days)}d over`;
  if (days === 0) return time ?? "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return d.format("ddd");
  if (d.isSame(TODAY_START(), "year")) return d.format("D MMM");
  return d.format("MMM YYYY");
}

function toRowItem(e: DbEntry): FieldRowItem {
  const dateStr = e.due_date ?? e.scheduled_date ?? null;
  const time = e.scheduled_time ?? e.due_time ?? null;
  const days = daysUntil(dateStr);
  return {
    id: e.id,
    type: e.type as EntryType,
    title: e.title,
    when: whenLabel(dateStr, time, days),
    heat: heatOf(days),
  };
}

// Stakes are a runway against a fixed horizon: how close to the edge each one is.
const RUNWAY_HORIZON_DAYS = 14;

/** Big mono readout for a gauge: "2d over", "now", "tomorrow", "5d". */
function runwayReadout(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)}d over`;
  if (days === 0) return "now";
  if (days === 1) return "tomorrow";
  return `${days}d`;
}

function toRunwayItem(e: DbEntry): RunwayItem {
  const days = daysUntil(e.due_date ?? e.scheduled_date ?? null);
  const dated = days !== null;
  // 0 at the far horizon, 1 at/over the edge. clamp to the track.
  const fill =
    days === null
      ? 0
      : Math.min(1, Math.max(0, 1 - days / RUNWAY_HORIZON_DAYS));
  return {
    id: e.id,
    type: e.type as EntryType,
    title: e.title,
    readout: runwayReadout(days),
    fill,
    overdue: days !== null && days < 0,
    dated,
  };
}

/** Runway order: most burnt-down first (overdue → soonest), undated last. */
function byRunway(a: DbEntry, b: DbEntry): number {
  const da = daysUntil(a.due_date ?? a.scheduled_date ?? null);
  const db = daysUntil(b.due_date ?? b.scheduled_date ?? null);
  if (da === null && db === null) return 0;
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
}

/** Order within a zone: hottest first, then soonest date, undated last. */
const HEAT_RANK: Record<Heat, number> = { hot: 0, warm: 1, cool: 2 };

function byHeatThenDate(a: DbEntry, b: DbEntry): number {
  const ra =
    HEAT_RANK[heatOf(daysUntil(a.due_date ?? a.scheduled_date ?? null))];
  const rb =
    HEAT_RANK[heatOf(daysUntil(b.due_date ?? b.scheduled_date ?? null))];
  if (ra !== rb) return ra - rb;
  const da = a.due_date ?? a.scheduled_date;
  const db = b.due_date ?? b.scheduled_date;
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return dayjs(da, "DD/MM/YYYY").unix() - dayjs(db, "DD/MM/YYYY").unix();
}

// STAKES = things with consequences. PRESENT = things that must stay visible.
const STAKES_TYPES: EntryType[] = ["deadline", "todo"];
const PRESENT_TYPES: EntryType[] = ["idea", "event", "someday"];

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();

  const { entries, recurrenceCompletions, fetchEntries, createEntry } =
    useDatabase();

  const { today: calendarToday } = useCalendarData(
    entries,
    new Date(),
    recurrenceCompletions,
  );

  const { transcript, startRecording, stopRecording } = useSpeechRecognizer();
  const [isRecording, setIsRecording] = useState(false);

  // The capture bar is the quick IDEA line: typed or spoken, a note lands
  // straight in the Present cloud as an idea. Richer entries go through the
  // Add tab.
  const captureIdea = useCallback(
    (text: string) => {
      const title = text.trim();
      if (!title) return;
      createEntry({ title, type: "idea" }).catch((err) =>
        console.error("Failed to capture idea:", err),
      );
    },
    [createEntry],
  );

  const handleStartRecording = useCallback(async () => {
    setIsRecording(true);
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
    setIsRecording(false);
    captureIdea(transcript);
  }, [stopRecording, transcript, captureIdea]);

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

  // The field, split into the two zones the brief names: STAKES (consequence)
  // and PRESENT (must-not-fade). Each zone is sorted hottest-first, but heat is
  // aliveness not rank — a cool idea still glows beside a hot bill.
  const { stakes, stakeGauges, present, presentItems } = useMemo(() => {
    const open = entries.filter(
      (e) => e.status !== "completed" && e.status !== "met",
    );
    const pick = (types: EntryType[]): FieldRowItem[] =>
      open
        .filter((e) => types.includes(e.type as EntryType))
        .sort(byHeatThenDate)
        .map(toRowItem);
    const stakeEntries = open
      .filter((e) => STAKES_TYPES.includes(e.type as EntryType))
      .sort(byRunway);
    const presentEntries = open.filter((e) =>
      PRESENT_TYPES.includes(e.type as EntryType),
    );
    return {
      stakes: pick(STAKES_TYPES),
      stakeGauges: stakeEntries.map(toRunwayItem),
      present: pick(PRESENT_TYPES),
      presentItems: toPresentItems(presentEntries, today.getTime()),
    };
  }, [entries, today]);

  const entriesForSheet = useMemo(
    () =>
      getEntriesForDay(entries, recurrenceCompletions, selectedDate ?? today),
    [entries, recurrenceCompletions, selectedDate, today],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FieldBriefing now={today} stakes={stakes} present={present} />

        <StakesRunway
          items={stakeGauges}
          itemHref={(item) => ({
            pathname: "/detail",
            params: { id: item.id },
          })}
          zoneHref="/list?entryType=deadline"
          emptyHint="Nothing's on the line. Add a bill, deadline, or to-do."
          index={0}
        />

        <PresentZone
          items={presentItems}
          itemHref={(item) => ({
            pathname: "/detail",
            params: { id: item.id },
          })}
          zoneHref="/list?entryType=idea"
          emptyHint="Catch an idea, a someday, or an event before it's gone."
          index={1}
        />

        <View style={styles.captureSpacer} />
      </ScrollView>

      <KeyboardAvoidingView
        style={styles.captureDock}
        pointerEvents="box-none"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <CaptureBar
          onSubmitIdea={captureIdea}
          onVoice={handleStartRecording}
          isRecording={isRecording}
          transcript={transcript}
          onStop={handleStopRecording}
          onCancel={handleCancelRecording}
        />
      </KeyboardAvoidingView>

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
    gap: tokens.space.xl,
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
