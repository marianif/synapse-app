import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  CaptureBackdrop,
  CaptureComposer,
} from "@/components/organisms/capture-composer";
import { DayDetailSheet } from "@/components/organisms/day-detail-sheet";
import { DirectOverview } from "@/components/organisms/direct-overview";
import { ProjectsOverview } from "@/components/organisms/projects-overview";

import {
  FieldGreeting,
  greetingFor,
  seasonalNote,
} from "@/components/molecules/field-greeting";

import { tokens, useTheme } from "@/constants/theme";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useCapture } from "@/hooks/use-capture";
import { useDatabase } from "@/hooks/use-database/use-database";
import { getEntriesForDay } from "@/hooks/use-database/use-database.helpers";
import { useDiary } from "@/hooks/use-diary";
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

  const { entries, projects, recurrenceCompletions, fetchEntries, createProject } =
    useDatabase();

  const { refresh: refreshDiary } = useDiary();

  // Anchor "now" once per mount so date-derived reads (calendar, greeting,
  // seasonal note) stay stable across renders — React Compiler won't memoize a
  // fresh `new Date()` for us.
  const today = useMemo(() => new Date(), []);

  const { today: calendarToday } = useCalendarData(
    entries,
    today,
    recurrenceCompletions,
  );

  // The capture state machine — composer/recorder/resolver mutex, pending
  // thought, voice piping, recent-ideas pool, the resolveCapture switch.
  // Shared with the project surface (via useCapture(projectId)) so the dock
  // grammar stays identical across screens.
  const cap = useCapture();

  // The manual bar — the pen key's TAP register (long-press is voice). Deliberate
  // creation that capture can't reach: today, opening a project. Mutually
  // exclusive with the composer / recorder / resolver in the dock below.
  // Stays home-only; the project surface has no need to birth a sibling project.
  const [manualOpen, setManualOpen] = useState(false);

  // Create a project from the manual bar, then go straight into it — a project
  // is a place you open, so creating one lands you there.
  const handleCreateProject = useCallback(
    (title: string) => {
      setManualOpen(false);
      createProject(title)
        .then((project) =>
          router.push({ pathname: "/project", params: { id: project.id } }),
        )
        .catch((err) => console.error("Failed to create project:", err));
    },
    [createProject, router],
  );

  // Arm the dock when summoned — by the widget deep link (voice / text) or the
  // tab-bar pen key (tap → manual, long-press → voice). Guard with a ref so it
  // fires once per intent. Each register opens its own bar and closes the others.
  const armedFromLink = useRef(false);
  useEffect(() => {
    const known =
      capture === "voice" || capture === "text" || capture === "manual";
    if (capture === "voice" && !armedFromLink.current && !cap.isRecording) {
      armedFromLink.current = true;
      setManualOpen(false);
      cap.setComposerOpen(false);
      cap.startRecording();
      router.setParams({ capture: undefined });
    } else if (capture === "text" && !armedFromLink.current) {
      armedFromLink.current = true;
      setManualOpen(false);
      cap.setComposerOpen(true);
      router.setParams({ capture: undefined });
    } else if (capture === "manual" && !armedFromLink.current) {
      armedFromLink.current = true;
      cap.setComposerOpen(false);
      setManualOpen(true);
      router.setParams({ capture: undefined });
    } else if (!known) {
      armedFromLink.current = false;
    }
  }, [capture, cap, router]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
      refreshDiary();
    }, [fetchEntries, refreshDiary]),
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

  // The dock is an absolute overlay; it doesn't rest at the screen bottom — it
  // floats `space.lg` above the custom tab bar. So translating it up by the full
  // keyboard height double-counts that resting offset and overshoots, leaving a
  // big gap. We lift by (keyboard height − the dock's resting distance from the
  // screen bottom) so its lower edge lands just on top of the keyboard.
  //
  // Resting distance ≈ tab-bar height (its paddingTop + add-button + paddingBottom)
  // + the dock's own `bottom: space.lg`. Mirrors custom-tab-bar.tsx's constants.
  const dockRestOffset = 8 + 52 + 20 + tokens.space.lg; // tab bar + dock bottom gap
  const keyboardLift = useSharedValue(0);
  useEffect(() => {
    // iOS reports willShow/willHide with a duration we can match; Android only
    // fires didShow/didHide, so we fall back to a quick eased timing.
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      const lift = Math.max(0, e.endCoordinates.height - dockRestOffset);
      keyboardLift.value = withTiming(lift, {
        duration: e.duration || 220,
        easing: Easing.out(Easing.cubic),
      });
    });
    const hide = Keyboard.addListener(hideEvt, (e) => {
      keyboardLift.value = withTiming(0, {
        duration: e?.duration || 200,
        easing: Easing.out(Easing.cubic),
      });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [dockRestOffset, keyboardLift]);

  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardLift.value }],
  }));

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
          onAddProject={() => {
            cap.setComposerOpen(false);
            setManualOpen(true);
          }}
        />
        <DirectOverview
          entries={directEntries}
          onCapture={(type) => {
            setManualOpen(false);
            // A type-specific empty state (No deadlines / todos / ideas yet)
            // seeds the resolver so it opens on that door; the neutral "all"
            // empty state passes nothing and the resolver stays neutral.
            cap.setSeedType(type ?? null);
            cap.setComposerOpen(true);
          }}
        />

        <View style={styles.captureSpacer} />
      </ScrollView>

      {/* Outside-tap backdrop — a transparent full-screen catcher that only
          exists while a dismissible dock surface is up. It's screen-level (not
          inside the lifted dock) so it spans the whole field; the resolver is
          intentionally not covered so a caught thought isn't dropped. */}
      <CaptureBackdrop
        cap={cap}
        manualOpen={manualOpen}
        onManualDismiss={() => setManualOpen(false)}
      />

      {/* The capture dock is summoned, not always-on: the pen key (tab bar)
          opens the composer or starts voice; the dock vanishes when idle so the
          field stays clear. The resolver holds a captured thought until filed.
          It rides above the keyboard via a UI-thread translate (see dockStyle).
          Home also carries the ManualBar (new-project) — the one surface the
          project dock omits. */}
      <Animated.View
        style={[styles.captureDock, dockStyle]}
        pointerEvents="box-none"
      >
        <CaptureComposer
          cap={cap}
          projects={projects}
          onManualCreate={handleCreateProject}
          manualOpen={manualOpen}
          onManualDismiss={() => setManualOpen(false)}
        />
      </Animated.View>

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
  captureDock: {
    position: "absolute",
    left: tokens.space.lg,
    right: tokens.space.lg,
    bottom: tokens.space.lg,
  },
});
