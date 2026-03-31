import { useRouter } from "expo-router";
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

// ─── Mock data (matches design/home-screem.png) ───────────────────────────────

const WEEKLY_ENTRIES = [
  { day: "Mon", title: "Team standup @ 10am", entryType: "task" as const },
  { day: "Tue", title: "Submit weekly report", entryType: "task" as const },
  { day: "Wed", title: "Client presentation", entryType: "task" as const },
  { day: "Thu" },
  { day: "Fri", title: "Design system sync", entryType: "task" as const },
];

const DEADLINE_ENTRIES = [
  { day: "Mon" },
  { day: "Tue", title: "Product Launch v1" },
  { day: "Wed" },
  { day: "Thu" },
  { day: "Fri", title: "Quarterly Tax Filing" },
];

const TODAY_EVENTS = [
  {
    id: "1",
    title: "Sync with Design Team",
    timeRange: "10:30 - 11:15 AM",
    isActive: true,
    statusTime: "10:42",
    statusLabel: "12M LEFT",
  },
  {
    id: "2",
    title: "Quarterly Review",
    subtitle: "Tomorrow's Focus",
    isActive: false,
  },
];

const AGENDA_ENTRIES = [
  {
    id: "1",
    title: "Update Brand Guidelines",
    subtitle: "Internal Project",
    time: "02:00 PM",
    entryType: "task" as const,
  },
  {
    id: "2",
    title: "Product Launch Deadline",
    subtitle: "Marketing Phase 1",
    time: "04:30 PM",
    entryType: "deadline" as const,
  },
  {
    id: "3",
    title: "Community Meetup",
    subtitle: "Social Event",
    time: "06:00 PM",
    entryType: "event" as const,
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();

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
            totalCount={18}
            spanDays={5}
            entries={WEEKLY_ENTRIES}
          />
          <DeadlinesCard totalCount={2} entries={DEADLINE_ENTRIES} />
          <TodaySection events={TODAY_EVENTS} />
          <SomedayItem quote="If you can't explain it to a six year old, you don't understand it yourself." />
          <AgendaSection date="Friday, Oct 24" entries={AGENDA_ENTRIES} />
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
