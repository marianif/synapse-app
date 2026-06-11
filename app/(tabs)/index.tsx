import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { CaptureBar } from "@/components/organisms/capture-bar";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";

import {
  FieldGreeting,
  greetingFor,
} from "@/components/molecules/field-greeting";
import { SomedayBadge } from "@/components/molecules/someday-badge";
import { ThemedText } from "@/components/atoms/themed-text";
import { EntryDot } from "@/components/atoms/entry-dot";

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
import { horizonLabel } from "@/lib/horizons";
import { isSomeday } from "@/lib/taxonomy";

import type { FieldRowItem, Heat } from "@/components/molecules/field-row";
import type { DbEntry, DbProject, EntryType } from "@/lib/types";

dayjs.extend(customParseFormat);

const TODAY_START = () => dayjs().startOf("day");

/** Days from today until an entry's date; null if undated. Negative = overdue. */
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return dayjs(dateStr, "DD/MM/YYYY").startOf("day").diff(TODAY_START(), "day");
}

/**
 * Heat is aliveness, NOT urgency-rank. A dated thing close in time runs hot; a
 * thing further out runs warm; an undated todo or idea runs cool — but cool
 * still glows. Nothing goes dark for lacking a deadline (the brief's core rule).
 */
function heatOf(days: number | null): Heat {
  if (days === null) return "cool"; // undated — present, not pressing
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
    when: e.due_range ? horizonLabel(e.due_range) : whenLabel(dateStr, time, days),
    heat: heatOf(days),
  };
}

/** Order: most burnt-down first (overdue → soonest), undated last. */
function byRunway(a: DbEntry, b: DbEntry): number {
  const da = daysUntil(a.due_date ?? a.scheduled_date ?? null);
  const db = daysUntil(b.due_date ?? b.scheduled_date ?? null);
  if (da === null && db === null) return 0;
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
}

// The direct zone the home surfaces at a glance: deadlines + todos (PRODUCT.md
// principle 2 — show projects and deadlines first). Ideas live in the narrative
// voice (FieldGreeting's summary), not as a direct row here.
const DIRECT_TYPES: EntryType[] = ["deadline", "todo"];

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
  } = useDatabase();

  const { addEntry: addDiaryEntry, refresh: refreshDiary } = useDiary();

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

  // The capture bar captures a THOUGHT, not (yet) a filed entry. A captured
  // thought is held here as "pending" while the CaptureResolver lets the user
  // file it as an idea (default), a todo, a deadline, an autonomous diary note,
  // or a note ON a recent idea.
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
  // resolver. Replacing a still-pending thought just swaps it.
  const handleCapture = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPicking(false);
    setPendingThought(trimmed);
  }, []);

  const resolveCapture = useCallback(
    (resolution: CaptureResolution) => {
      const text = pendingThought;
      setPendingThought(null);
      setPicking(false);
      if (!text) return;
      const { title, notes } = splitCapture(text);
      switch (resolution.kind) {
        case "idea":
          createEntry({ title, type: "idea", notes }).catch((err) =>
            console.error("Failed to capture idea:", err),
          );
          break;
        case "todo":
          createEntry({
            title,
            type: "todo",
            notes,
            scheduledDate: resolution.scheduledDate,
            scheduledTime: resolution.scheduledTime,
            projectId: resolution.projectId,
          }).catch((err) => console.error("Failed to capture todo:", err));
          break;
        case "deadline":
          createEntry({
            title,
            type: "deadline",
            notes,
            dueDate: resolution.dueDate,
            dueTime: resolution.dueTime,
            dueRange: resolution.dueRange,
            projectId: resolution.projectId,
          }).catch((err) => console.error("Failed to capture deadline:", err));
          break;
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
      }
    },
    [pendingThought, addDiaryEntry, createEntry],
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
  // pen key (text or voice). Guard with a ref so it fires once per intent.
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

  // The direct zone: open deadlines + todos, hottest/soonest first. FieldGreeting
  // also reads these streams for its summary voice. Ideas feed the greeting's
  // narrative line but are not a direct row on the home.
  const { directEntries, stakes, present } = useMemo(() => {
    const isDone = (e: DbEntry): boolean =>
      e.status === "completed" || e.status === "met";
    const open = entries.filter((e) => !isDone(e));
    const direct = open
      .filter((e) => DIRECT_TYPES.includes(e.type as EntryType))
      .sort(byRunway);
    return {
      directEntries: direct,
      stakes: direct.map(toRowItem),
      present: open
        .filter((e) => e.type === "idea")
        .map(toRowItem),
    };
  }, [entries]);

  const entriesForSheet = useMemo(
    () =>
      getEntriesForDay(entries, recurrenceCompletions, selectedDate ?? today),
    [entries, recurrenceCompletions, selectedDate, today],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active"),
    [projects],
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

        {/* TODO(flow): visual shaping pass — this is a minimal projects +
            deadlines overview that surfaces the core glanceable affordance
            (PRODUCT.md principle 2). Layout/visual design is deferred to a
            later /flow shape|craft pass. */}
        <ProjectsOverview projects={activeProjects} entries={entries} />
        <DirectOverview entries={directEntries} />

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
            projects={projects}
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
      />
    </View>
  );
}

/**
 * Projects overview — the macro life areas, present at a glance with a live
 * open-item count. Hidden until the first project exists. Each row opens the
 * project. (Minimal: visual design deferred.)
 */
function ProjectsOverview({
  projects,
  entries,
}: {
  projects: DbProject[];
  entries: DbEntry[];
}): React.ReactElement | null {
  const { colors } = useTheme();
  if (projects.length === 0) return null;

  const openCount = (projectId: string): number =>
    entries.filter(
      (e) =>
        e.project_id === projectId &&
        e.status !== "completed" &&
        e.status !== "met",
    ).length;

  return (
    <View style={styles.section}>
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        PROJECTS
      </ThemedText>
      {projects.map((p) => (
        <Link
          key={p.id}
          href={{ pathname: "/project", params: { id: p.id } }}
          asChild
        >
          <Pressable
            style={StyleSheet.flatten([
              styles.row,
              { backgroundColor: colors.surface },
            ])}
            accessibilityRole="button"
            accessibilityLabel={`Project ${p.title}`}
          >
            <ThemedText
              type="body"
              numberOfLines={1}
              style={[styles.rowTitle, { color: colors.ink }]}
            >
              {p.title}
            </ThemedText>
            <ThemedText type="mono" style={{ color: colors.inkMuted }}>
              {openCount(p.id)}
            </ThemedText>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

/**
 * Direct overview — open deadlines + todos, the consequence zone. An undated
 * todo wears the SOMEDAY badge (it stays cyan, present not pressing). Each row
 * opens the entry's detail. (Minimal: visual design deferred.)
 */
function DirectOverview({
  entries,
}: {
  entries: DbEntry[];
}): React.ReactElement | null {
  const { colors } = useTheme();
  if (entries.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        DEADLINES & TODOS
      </ThemedText>
      {entries.map((e) => (
        <Link
          key={e.id}
          href={{ pathname: "/detail", params: { id: e.id, entryType: e.type } }}
          asChild
        >
          <Pressable
            style={StyleSheet.flatten([
              styles.row,
              { backgroundColor: colors.surface },
            ])}
            accessibilityRole="button"
            accessibilityLabel={e.title}
          >
            <EntryDot type={e.type} />
            <ThemedText
              type="body"
              numberOfLines={1}
              style={[styles.rowTitle, { color: colors.ink }]}
            >
              {e.title}
            </ThemedText>
            {isSomeday(e) ? <SomedayBadge /> : null}
          </Pressable>
        </Link>
      ))}
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
  section: {
    gap: tokens.space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 48,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  rowTitle: {
    flex: 1,
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
