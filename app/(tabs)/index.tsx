import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SomedayItem } from "@/components/molecules/someday-item";
import { AgendaSection } from "@/components/organisms/agenda-section";
import { AppHeader } from "@/components/organisms/app-header";
import { DeadlinesCard } from "@/components/organisms/deadlines-card";
import { Fab } from "@/components/organisms/fab";
import { TodaySection } from "@/components/organisms/today-section";
import { WeeklyOverviewCard } from "@/components/organisms/weekly-overview-card";
import { Spacing, Surface } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_ABBRS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_ABBRS[d.getMonth()]} ${d.getDate()}`;
}

function getWeekDays(): { abbr: string; fullName: string; date: Date }[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((abbr, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { abbr, fullName: DAY_NAMES[d.getDay()], date: d };
  });
}

/** Compare a stored "DD/MM/YYYY" date string against a JS Date (day-level). */
function isSameDay(dateStr: string | null | undefined, target: Date): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  const [dd, mm, yyyy] = parts;
  const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
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

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
      fetchIdeas();
    }, [fetchEntries, fetchIdeas]),
  );

  const today = new Date();
  const todayLabel = formatDateLabel(today);
  const weekDays = getWeekDays();

  // ── Weekly tasks ─────────────────────────────────────────────────────────────
  const taskEntries = entries.filter((e) => e.type === 'task');
  const weeklyEntries = weekDays.map(({ abbr, date }) => {
    const entry = taskEntries.find((e) => isSameDay(e.scheduled_date, date));
    const rawStatus = entry?.status;
    const status: 'scheduled' | 'active' | 'completed' | undefined =
      rawStatus === 'completed' || rawStatus === 'met' ? 'completed' :
      rawStatus === 'active' || rawStatus === 'overdue' ? 'active' :
      'scheduled';
    return {
      day: abbr,
      title: entry?.title,
      entryType: 'task' as const,
      status,
    };
  });

  // ── Deadlines ────────────────────────────────────────────────────────────────
  const deadlineEntries = entries.filter((e) => e.type === 'deadline');
  const weeklyDeadlines = weekDays.map(({ abbr, date }) => {
    const entry = deadlineEntries.find((e) => isSameDay(e.due_date, date));
    const rawStatus = entry?.status;
    const status: 'scheduled' | 'active' | 'completed' | undefined =
      rawStatus === 'completed' || rawStatus === 'met' ? 'completed' :
      rawStatus === 'active' || rawStatus === 'overdue' ? 'active' :
      'scheduled';
    return {
      day: abbr,
      title: entry?.title,
      status,
    };
  });

  // ── Today's events ────────────────────────────────────────────────────────────
  const todayEvents = entries
    .filter((e) => e.type === 'event' && isSameDay(e.scheduled_date, today))
    .map((e) => ({
      id: e.id,
      title: e.title,
      timeRange: e.scheduled_time ?? undefined,
      isActive: e.status === 'active',
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

  // ── Someday inspiration ───────────────────────────────────────────────────────
  const firstIdea = ideas[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <AppHeader />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <WeeklyOverviewCard
            totalCount={taskEntries.length}
            spanDays={weeklyEntries.filter((e) => e.title).length || 5}
            entries={weeklyEntries}
            isEmpty={taskEntries.length === 0}
            onAdd={() => router.push('/modal')}
          />
          <DeadlinesCard
            totalCount={deadlineEntries.length}
            entries={weeklyDeadlines}
            isEmpty={deadlineEntries.length === 0}
            onAdd={() => router.push('/modal')}
          />
          <TodaySection
            events={todayEvents}
            isEmpty={todayEvents.length === 0}
            onAdd={() => router.push('/modal')}
          />
          {firstIdea ? (
            <SomedayItem quote={firstIdea.inspiration ?? firstIdea.title} />
          ) : null}
          <AgendaSection
            date={todayLabel}
            entries={todayAgenda}
            isEmpty={todayAgenda.length === 0}
            onAdd={() => router.push('/modal')}
          />
          {/* Bottom padding so FAB never overlaps the last entry */}
          <View style={styles.fabSpacer} />
        </ScrollView>
        <Fab onPress={() => router.push('/modal')} />
      </View>
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
