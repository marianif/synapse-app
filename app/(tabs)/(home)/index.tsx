import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { DirectOverview } from "@/components/organisms/direct-overview";
import { ProjectsOverview } from "@/components/organisms/projects-overview";

import {
  FieldGreeting,
  greetingFor,
  seasonalNote,
} from "@/components/molecules/field-greeting";

import { tokens, useTheme } from "@/constants/theme";
import { useGlobalCapture } from "@/contexts/global-capture-context";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useDatabase } from "@/hooks/use-database/use-database";
import { getEntriesForDay } from "@/hooks/use-database/use-database.helpers";
import { byRunway, daysUntil } from "@/lib/direct-when";
import { horizonLabel } from "@/lib/horizons";

import type { FieldRowItem, Heat } from "@/components/molecules/field-row";
import type { DbEntry, EntryType } from "@/lib/types";

dayjs.extend(customParseFormat);

const TODAY_START = () => dayjs().startOf("day");

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
    when: e.due_range
      ? horizonLabel(e.due_range)
      : whenLabel(dateStr, time, days),
    heat: heatOf(days),
  };
}

// The direct zone the home surfaces at a glance: deadlines + todos + ideas
// (PRODUCT.md principle 2 — show projects and deadlines first). Ideas live in
// BOTH zones: they also feed the narrative voice (FieldGreeting's summary), but
// they earn a direct row too so a captured idea never falls out of sight.
const DIRECT_TYPES: EntryType[] = ["deadline", "todo", "idea"];

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();

  // Capture intent param — set by the widget deep link (synapseapp:///?capture=voice)
  // and by the tab-bar pen key (tap → text, long-press → voice). Consumed once below.
  const { capture } = useLocalSearchParams<{ capture?: string }>();

  const { entries, projects, recurrenceCompletions } = useDatabase();

  // Anchor "now" once per mount so date-derived reads (calendar, greeting,
  // seasonal note) stay stable across renders — React Compiler won't memoize a
  // fresh `new Date()` for us.
  const today = useMemo(() => new Date(), []);

  const { today: calendarToday } = useCalendarData(
    entries,
    today,
    recurrenceCompletions,
  );

  // The capture state machine is owned by the tab layout (GlobalCaptureContext)
  // so the tab bar's pen key can drive it from any tab. The home screen just
  // consumes it — for the widget deep-link arming below, and to seed a type
  // from the direct-zone's empty-state taps.
  const cap = useGlobalCapture();

  // Arm the dock when summoned — by the widget deep link (voice / text) or the
  // tab-bar pen key (tap → text, long-press → voice). Guard with a ref so it
  // fires once per intent. Each register opens its own bar and closes the other.
  const armedFromLink = useRef(false);
  useEffect(() => {
    const known = capture === "voice" || capture === "text";
    if (capture === "voice" && !armedFromLink.current && !cap.isRecording) {
      armedFromLink.current = true;
      cap.setComposerOpen(false);
      cap.startRecording();
      router.setParams({ capture: undefined });
    } else if (capture === "text" && !armedFromLink.current) {
      armedFromLink.current = true;
      cap.setComposerOpen(true);
      router.setParams({ capture: undefined });
    } else if (!known) {
      armedFromLink.current = false;
    }
  }, [capture, cap, router]);

  // The Field is the one surface where the capture affordance stays resting
  // and visible instead of appearing only on a pen-tap — it's the home screen,
  // so the "put something in" bar should read as always-there. Scoped to this
  // screen's focus so navigating into detail/project (pushed on the same
  // stack) reverts the dock to its normal on-demand behavior there.
  useFocusEffect(
    useCallback(() => {
      cap.setDockAlwaysVisible(true);
      return () => cap.setDockAlwaysVisible(false);
    }, [cap]),
  );

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setSelectedDate(null), 200);
  }, []);

  // The direct zone: deadlines + todos + ideas. DirectOverview owns the full set
  // (open AND done — it sinks completed lines to the bottom and strikes them
  // through), so it gets every status. FieldGreeting's summary voice reads the
  // OPEN streams (stakes + present); ideas feed the greeting's narrative line
  // AND appear as direct rows — held in sight in both zones.
  const { directEntries, stakes, present } = useMemo(() => {
    const isDone = (e: DbEntry): boolean =>
      e.status === "completed" || e.status === "met";
    const direct = entries.filter((e) =>
      DIRECT_TYPES.includes(e.type as EntryType),
    );
    const open = entries.filter((e) => !isDone(e));
    return {
      directEntries: direct,
      stakes: open
        .filter((e) => DIRECT_TYPES.includes(e.type as EntryType))
        .sort(byRunway)
        .map(toRowItem),
      present: open.filter((e) => e.type === "idea").map(toRowItem),
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
          dateLabel={dayjs(today).format("dddd, D MMMM")}
          seasonalNote={seasonalNote(today.getMonth(), today.getHours())}
          stakes={stakes}
          present={present}
        />

        {/* TODO(flow): visual shaping pass — this is a minimal projects +
            deadlines overview that surfaces the core glanceable affordance
            (PRODUCT.md principle 2). Layout/visual design is deferred to a
            later /flow shape|craft pass. */}
        <ProjectsOverview
          projects={activeProjects}
          entries={entries}
          // Creating a project is a deliberate act that lives on the Project
          // Shelf, not in the home capture dock — so "add project" navigates
          // there rather than raising a home-dock bar.
          onAddProject={() => router.push("/(tabs)/(projects)")}
        />
        <DirectOverview
          entries={directEntries}
          onCapture={(type) => {
            // A type-specific empty state (No deadlines / todos / ideas yet)
            // seeds the resolver so it opens on that door; the neutral "all"
            // empty state passes nothing and the resolver stays neutral.
            cap.setSeedType(type ?? null);
            cap.setComposerOpen(true);
          }}
        />

        <View style={styles.captureSpacer} />
      </ScrollView>

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
});
