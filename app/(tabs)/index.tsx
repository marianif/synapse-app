import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { CaptureBar } from "@/components/organisms/capture-bar";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { NarrativeAgenda } from "@/components/organisms/narrative-agenda";
import { PresentZone } from "@/components/organisms/present/present-zone";
import { ProjectsStrip } from "@/components/organisms/projects-strip";
import { StakesRunway } from "@/components/organisms/stakes-runway";

import {
  FieldGreeting,
  greetingFor,
} from "@/components/molecules/field-greeting";

import {
  CaptureResolver,
  type CaptureResolution,
  type LinkableIdea,
} from "@/components/molecules/capture-resolver";
import { tokens, useTheme } from "@/constants/theme";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useDatabase } from "@/hooks/use-database/use-database";
import { getEntriesForDay } from "@/hooks/use-database/use-database.helpers";
import { useDiary } from "@/hooks/use-diary";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";
import { splitCapture } from "@/lib/capture";
import { horizonHeat, horizonLabel, horizonReadout } from "@/lib/horizons";
import { buildNarrative } from "@/lib/narrative";
import { toPresentItems } from "@/lib/present";

import type { FieldRowItem, Heat } from "@/components/molecules/field-row";
import type { RunwayItem } from "@/components/molecules/stake-row";
import { FieldLegend } from "@/components/organisms/field-console/legend";
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

/**
 * Heat for a row, horizon-aware: a window commitment idles warm and turns hot
 * as the window closes; precise dates keep the distance-based heat.
 */
function entryHeat(e: DbEntry): Heat {
  const days = daysUntil(e.due_date ?? e.scheduled_date ?? null);
  return e.due_range ? horizonHeat(e.due_range, days) : heatOf(days);
}

function toRowItem(e: DbEntry): FieldRowItem {
  const dateStr = e.due_date ?? e.scheduled_date ?? null;
  const time = e.scheduled_time ?? e.due_time ?? null;
  const days = daysUntil(dateStr);
  return {
    id: e.id,
    type: e.type as EntryType,
    title: e.title,
    when: e.due_range ? horizonLabel(e.due_range) : whenLabel(dateStr, time, days),
    heat: entryHeat(e),
  };
}

/** Trailing mono when-label for a stake: "2d over", "now", "tomorrow", "5d". */
function runwayReadout(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)}d over`;
  if (days === 0) return "now";
  if (days === 1) return "tomorrow";
  return `${days}d`;
}

function toRunwayItem(e: DbEntry, done = false): RunwayItem {
  const days = daysUntil(e.due_date ?? e.scheduled_date ?? null);
  const dated = days !== null;
  return {
    id: e.id,
    type: e.type as EntryType,
    title: e.title,
    // Horizon stakes read as the commitment ("by Sun", "by Dec"), not a countdown.
    readout: e.due_range
      ? horizonReadout(e.due_range, e.due_date)
      : runwayReadout(days),
    overdue: !done && days !== null && days < 0,
    dated,
    done,
  };
}

/** A stake stays in the "recently cleared" run this many days after being done. */
const DONE_WINDOW_DAYS = 7;

/** Most-recently-cleared first, so the freshest win sits at the top of the run. */
function byRecentlyDone(a: DbEntry, b: DbEntry): number {
  return b.updated_at - a.updated_at;
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
  const ra = HEAT_RANK[entryHeat(a)];
  const rb = HEAT_RANK[entryHeat(b)];
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

  // Capture intent param — set by the widget deep link (synapseapp:///?capture=voice)
  // and by the tab-bar pen key (tap → text, long-press → voice). Consumed once below.
  const { capture } = useLocalSearchParams<{ capture?: string }>();

  const {
    entries,
    projects,
    recurrenceCompletions,
    fetchEntries,
    createEntry,
    deleteEntry,
  } = useDatabase();

  const {
    entries: diaryEntries,
    addEntry: addDiaryEntry,
    refresh: refreshDiary,
  } = useDiary();

  // entryId → count of diary notes filed on it, for the idea-chip "N notes"
  // readout. Built once per diary change; ideas with no notes simply omit it.
  const noteCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of diaryEntries) {
      if (n.linked_entry_id) {
        map[n.linked_entry_id] = (map[n.linked_entry_id] ?? 0) + 1;
      }
    }
    return map;
  }, [diaryEntries]);

  const { today: calendarToday } = useCalendarData(
    entries,
    new Date(),
    recurrenceCompletions,
  );

  const { transcript, startRecording, stopRecording } = useSpeechRecognizer();
  const [isRecording, setIsRecording] = useState(false);

  // The text composer is summoned by the pen key (no always-idle bar — capture
  // has ONE trigger). It closes itself when the input blurs with nothing typed.
  const [composerOpen, setComposerOpen] = useState(false);

  // The capture bar captures a THOUGHT, not (yet) an idea. A captured thought is
  // held here as "pending" while the CaptureResolver lets the user file it as an
  // idea (the default), an autonomous diary note, or a note ON a recent idea.
  // Doing nothing auto-files an idea — old muscle memory (↵ then ignore) holds.
  const [pendingThought, setPendingThought] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  // Recent ideas offered under "Note on…". Capped + newest-first; reading from
  // the in-memory entries (single source of truth) keeps this in sync for free.
  const recentIdeas: LinkableIdea[] = useMemo(
    () =>
      entries
        .filter((e) => e.type === "idea")
        .slice(0, 8)
        .map((e) => ({ id: e.id, title: e.title })),
    [entries],
  );

  // A thought arrives from the bar (typed or spoken): stash it and surface the
  // resolver. Replacing a still-pending thought just swaps it (the resolver
  // re-arms its countdown on text change), so nothing is silently dropped.
  const handleCapture = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPicking(false);
    setPendingThought(trimmed);
  }, []);

  const fileAsIdea = useCallback(
    (text: string) => {
      const { title, notes } = splitCapture(text);
      createEntry({ title, type: "idea", notes }).catch((err) =>
        console.error("Failed to capture idea:", err),
      );
    },
    [createEntry],
  );

  const resolveCapture = useCallback(
    (resolution: CaptureResolution) => {
      const text = pendingThought;
      setPendingThought(null);
      setPicking(false);
      if (!text) return;
      switch (resolution.kind) {
        case "idea":
          fileAsIdea(text);
          break;
        case "todo": {
          const { title, notes } = splitCapture(text);
          createEntry({ title, type: "todo", notes }).catch((err) =>
            console.error("Failed to capture todo:", err),
          );
          break;
        }
        case "note":
          addDiaryEntry(text, null).catch((err) =>
            console.error("Failed to file diary note:", err),
          );
          break;
        case "note-on":
          addDiaryEntry(text, null, resolution.entryId).catch((err) =>
            console.error("Failed to file linked diary note:", err),
          );
          break;
        case "more":
          // Hand the thought to the rich entry form (dates, horizons, events).
          setComposerOpen(false);
          router.push({ pathname: "/modal", params: { title: text } });
          break;
      }
    },
    [pendingThought, fileAsIdea, addDiaryEntry, createEntry, router],
  );

  const handleStartRecording = useCallback(async () => {
    setIsRecording(true);
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
    setIsRecording(false);
    handleCapture(transcript);
  }, [stopRecording, transcript, handleCapture]);

  const handleCancelRecording = useCallback(async () => {
    await stopRecording();
    setIsRecording(false);
  }, [stopRecording]);

  // Arm capture when summoned — by the widget deep link (voice) or the tab-bar
  // pen key (text or voice). Guard with a ref so it fires once per intent, not
  // on every re-render, and clear the param off the URL so re-focusing the tab
  // doesn't re-trigger.
  const armedFromLink = useRef(false);
  useEffect(() => {
    if (capture === "voice" && !armedFromLink.current && !isRecording) {
      armedFromLink.current = true;
      handleStartRecording();
      router.setParams({ capture: undefined });
    } else if (capture === "text" && !armedFromLink.current) {
      armedFromLink.current = true;
      setComposerOpen(true);
      router.setParams({ capture: undefined });
    } else if (capture !== "voice" && capture !== "text") {
      armedFromLink.current = false;
    }
  }, [capture, isRecording, handleStartRecording, router]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
      refreshDiary();
    }, [fetchEntries, refreshDiary]),
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
  const { stakes, stakeGauges, doneStakes, present, presentItems } =
    useMemo(() => {
      const isDone = (e: DbEntry): boolean =>
        e.status === "completed" || e.status === "met";
      const open = entries.filter((e) => !isDone(e));
      const pick = (types: EntryType[]): FieldRowItem[] =>
        open
          .filter((e) => types.includes(e.type as EntryType))
          .sort(byHeatThenDate)
          .map(toRowItem);
      const stakeEntries = open
        .filter((e) => STAKES_TYPES.includes(e.type as EntryType))
        .sort(byRunway);
      // Stakes cleared recently — the activating "crossed off" run. Keyed off
      // updated_at (WHEN it was marked done), not the due date: a deadline a year
      // out, finished early, still earns a spot. updated_at is stored in SECONDS
      // (see database-context updateEntryStatus), so the window is in seconds too.
      const doneSince = today.getTime() / 1000 - DONE_WINDOW_DAYS * 86_400;
      const doneStakeEntries = entries
        .filter(
          (e) =>
            isDone(e) &&
            STAKES_TYPES.includes(e.type as EntryType) &&
            e.updated_at >= doneSince,
        )
        .sort(byRecentlyDone);
      const presentEntries = open.filter((e) =>
        PRESENT_TYPES.includes(e.type as EntryType),
      );
      return {
        stakes: pick(STAKES_TYPES),
        stakeGauges: stakeEntries.map((e) => toRunwayItem(e)),
        doneStakes: doneStakeEntries.map((e) => toRunwayItem(e, true)),
        present: pick(PRESENT_TYPES),
        presentItems: toPresentItems(
          presentEntries,
          today.getTime(),
          noteCounts,
        ),
      };
    }, [entries, today, noteCounts]);

  // Wipe the whole recently-cleared run. These are completed entries; clearing
  // deletes them for good (the organism gates this behind a confirm).
  const handleClearDoneStakes = useCallback(() => {
    Promise.all(doneStakes.map((s) => deleteEntry(s.id))).catch((err) =>
      console.error("Failed to clear done stakes:", err),
    );
  }, [doneStakes, deleteEntry]);

  const entriesForSheet = useMemo(
    () =>
      getEntriesForDay(entries, recurrenceCompletions, selectedDate ?? today),
    [entries, recurrenceCompletions, selectedDate, today],
  );

  // A truly clear field — no live stakes, nothing recently cleared, no present
  // things. This is the brand's first statement, so it gets the powered-on
  // console instead of three separate "·0" placeholders.
  const fieldIsEmpty =
    stakeGauges.length === 0 &&
    doneStakes.length === 0 &&
    presentItems.length === 0;

  // The agenda voice — deterministic narrative lines built from the board:
  // yesterday's diary trace, the longest-waiting deadline, the oldest
  // unpromoted idea. A layer above the zones, never a curtain.
  const narrativeLines = useMemo(
    () => buildNarrative(entries, diaryEntries, today.getTime()),
    [entries, diaryEntries, today],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FieldGreeting
          greeting={greetingFor(today.getHours())}
          stakes={stakes}
          present={present}
          focusedType={null}
        />
        <NarrativeAgenda lines={narrativeLines} />
        {fieldIsEmpty && <FieldLegend />}

        <>
          <StakesRunway
            items={stakeGauges}
            done={doneStakes}
            onClearDone={handleClearDoneStakes}
            itemHref={(item) => ({
              pathname: "/detail",
              params: { id: item.id, entryType: item.type },
            })}
            zoneHref="/list?entryType=deadline"
            emptyHint="Nothing's on the line. Add a bill, deadline, or to-do."
            index={0}
          />

          <PresentZone
            items={presentItems}
            itemHref={(item) => ({
              pathname: "/detail",
              params: { id: item.id, entryType: item.type },
            })}
            zoneHref="/list?entryType=idea"
            emptyHint="Catch an idea, a someday, or an event before it's gone."
            index={1}
          />

          {/* Projects live in the narrative side of the field: named, compact,
              never a tile. Hidden until the first project exists. */}
          <ProjectsStrip projects={projects} entries={entries} />
        </>

        <View style={styles.captureSpacer} />
      </ScrollView>

      {/* The capture dock is summoned, not always-on: the pen key (tab bar)
          opens the composer or starts voice; the dock vanishes when idle so the
          field stays clear. The resolver holds a captured thought until filed. */}
      <KeyboardAvoidingView
        style={styles.captureDock}
        pointerEvents="box-none"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {pendingThought !== null ? (
          <CaptureResolver
            text={pendingThought}
            ideas={recentIdeas}
            picking={picking}
            onTogglePicking={() => setPicking((p) => !p)}
            onResolve={resolveCapture}
            onDismiss={() => {
              setPendingThought(null);
              setPicking(false);
            }}
          />
        ) : null}
        {composerOpen || isRecording ? (
          <CaptureBar
            onSubmit={handleCapture}
            onVoice={handleStartRecording}
            isRecording={isRecording}
            transcript={transcript}
            onStop={handleStopRecording}
            onCancel={handleCancelRecording}
            autoFocus={composerOpen}
            onDismissEmpty={() => setComposerOpen(false)}
          />
        ) : null}
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
