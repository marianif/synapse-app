import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/atoms/themed-text";
import { EmptyState } from "@/components/molecules/empty-state";
import { ListItem } from "@/components/molecules/list-item";
import { WrapupCard } from "@/components/molecules/wrapup-card";
import { Fab } from "@/components/organisms/fab";
import { ListProgress } from "@/components/organisms/list-progress";
import { ListScreenHeader } from "@/components/organisms/list-screen-header";
import { entryColor, useTheme, tokens } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { isSameDay, parseDate } from "@/lib/date-utils";
import { isRecurringEntry } from "@/lib/recurrence";

import type { EntryType } from "@/components/atoms/entry-dot";
import type { ItemStatus } from "@/components/molecules/list-item";
import type { DbEntry } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListEntry {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  timeChip?: string;
  entryType: EntryType;
  status: ItemStatus;
  isRecurring?: boolean;
}

interface Section {
  label: string;
  entries: ListEntry[];
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function classifyEntry(
  dateStr: string | null,
  today: Date,
): "today" | "thisWeek" | "later" {
  if (!dateStr) return "later";

  const entryDate = parseDate(dateStr);
  if (!entryDate) return "later";

  if (isSameDay(dateStr, today)) return "today";

  // Calculate end of current week (Friday)
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  if (entryDate > today && entryDate <= friday) return "thisWeek";

  return "later";
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function entryToListEntry(e: DbEntry): ListEntry {
  const rawStatus = e.status;
  const status: ItemStatus =
    rawStatus === "completed" || rawStatus === "met"
      ? "completed"
      : rawStatus === "active" || rawStatus === "overdue"
        ? "active"
        : "scheduled";
  return {
    id: e.id,
    title: e.title,
    time: e.scheduled_time ?? e.due_time ?? undefined,
    entryType: e.type,
    status,
    isRecurring: isRecurringEntry(e),
  };
}

function somedayEntryToListEntry(entry: DbEntry): ListEntry {
  return {
    id: entry.id,
    title: entry.title,
    subtitle: entry.subtitle ?? undefined,
    entryType: "someday",
    status: "scheduled",
  };
}

function buildTaskSections(entries: DbEntry[]): Section[] {
  const now = new Date();

  const todayItems: ListEntry[] = [];
  const thisWeekItems: ListEntry[] = [];
  const laterItems: ListEntry[] = [];

  for (const e of entries) {
    const bucket = classifyEntry(e.scheduled_date, now);
    const item = entryToListEntry(e);
    if (bucket === "today") todayItems.push(item);
    else if (bucket === "thisWeek") thisWeekItems.push(item);
    else laterItems.push(item);
  }

  const sections: Section[] = [];
  if (todayItems.length > 0)
    sections.push({ label: "Today", entries: todayItems });
  if (thisWeekItems.length > 0)
    sections.push({ label: "This Week", entries: thisWeekItems });
  if (laterItems.length > 0)
    sections.push({ label: "Later", entries: laterItems });
  return sections;
}

function buildDeadlineSections(entries: DbEntry[]): Section[] {
  const now = new Date();

  const thisWeekItems: ListEntry[] = [];
  const laterItems: ListEntry[] = [];

  for (const e of entries) {
    const bucket = classifyEntry(e.due_date, now);
    const item = entryToListEntry(e);
    if (bucket === "today" || bucket === "thisWeek") thisWeekItems.push(item);
    else laterItems.push(item);
  }

  const sections: Section[] = [];
  if (thisWeekItems.length > 0)
    sections.push({ label: "This Week", entries: thisWeekItems });
  if (laterItems.length > 0)
    sections.push({ label: "Upcoming", entries: laterItems });
  return sections;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ListScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { entryType } = useLocalSearchParams<{ entryType?: string }>();

  const resolvedType: EntryType =
    entryType === "deadline"
      ? "deadline"
      : entryType === "someday"
        ? "someday"
        : "todo";

  const accentColor = entryColor(resolvedType);

  const screenTitle =
    resolvedType === "deadline"
      ? "Deadlines"
      : resolvedType === "someday"
        ? "One Day"
        : "Weekly Todos";

  const { entries, updateEntryStatus, deleteEntry, fetchEntries } =
    useDatabase();

  useFocusEffect(
    useCallback(() => {
      fetchEntries(resolvedType);
    }, [resolvedType, fetchEntries]),
  );

  // ── Build sections ────────────────────────────────────────────────────────────

  const somedayEntries = entries.filter(
    (e) => e.type === "someday" || e.type === "idea",
  );

  const sections: Section[] =
    resolvedType === "someday"
      ? somedayEntries.length > 0
        ? [
            {
              label: "Ideas",
              entries: somedayEntries.map(somedayEntryToListEntry),
            },
          ]
        : []
      : resolvedType === "deadline"
        ? buildDeadlineSections(entries)
        : buildTaskSections(entries);

  // ── Progress counts ───────────────────────────────────────────────────────────

  const allItems = sections.flatMap((s) => s.entries);
  const total = allItems.length;
  const completedCount = allItems.filter(
    (e) => e.status === "completed",
  ).length;

  const firstSectionCount =
    sections[0]?.entries.filter((e) => e.status !== "completed").length ?? 0;

  const badgeLabel =
    resolvedType === "deadline"
      ? "DEADLINES"
      : resolvedType === "someday"
        ? "IDEAS"
        : "TODOS";

  // ── Toggle handler ────────────────────────────────────────────────────────────

  async function toggleItem(id: string): Promise<void> {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const nextStatus = entry.status === "completed" ? "scheduled" : "completed";
    await updateEntryStatus(id, nextStatus);
  }

  // ── Delete handler ─────────────────────────────────────────────────────────────

  async function handleDelete(id: string): Promise<void> {
    await deleteEntry(id);
  }

  // ── Empty state config ────────────────────────────────────────────────────────

  const emptyTitle =
    resolvedType === "deadline"
      ? "No deadlines tracked"
      : resolvedType === "someday"
        ? "Your ideas list is empty"
        : "No todos yet";

  const emptyDescription =
    resolvedType === "deadline"
      ? "Add a deadline to stay ahead of critical dates."
      : resolvedType === "someday"
        ? "Capture things you want to explore someday."
        : "Add todos to build your weekly focus.";

  const emptyCtaLabel =
    resolvedType === "deadline"
      ? "+ Add Deadline"
      : resolvedType === "someday"
        ? "+ Capture Idea"
        : "+ Add Todo";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["top"]}
    >
      <View style={[styles.screen, { backgroundColor: colors.paper }]}>
        <ListScreenHeader title={screenTitle} onBack={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress header — hidden for someday */}
          {resolvedType !== "someday" ? (
            <ListProgress
              completed={completedCount}
              total={total}
              streak={0}
              entryType={resolvedType}
            />
          ) : null}

          {/* Empty state — full-screen when no entries */}
          {sections.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <EmptyState
                title={emptyTitle}
                description={emptyDescription}
                ctaLabel={emptyCtaLabel}
                onCta={() => router.push("/modal")}
                accentColor={accentColor}
              />
            </View>
          ) : (
            sections.map((section, sectionIndex) => (
              <View key={section.label} style={styles.section}>
                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <ThemedText
                    type="label"
                    style={[styles.sectionLabel, { color: colors.inkMuted }]}
                  >
                    {section.label.toUpperCase()}
                  </ThemedText>
                  {sectionIndex === 0 && firstSectionCount > 0 ? (
                    <View
                      style={[
                        styles.countBadge,
                        { backgroundColor: accentColor + "12" },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={[styles.countBadgeText, { color: accentColor }]}
                      >
                        {firstSectionCount} {badgeLabel}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                {/* Items */}
                <View style={styles.itemList}>
                  {section.entries.map((entry) => (
                    <ListItem
                      key={entry.id}
                      title={entry.title}
                      subtitle={entry.subtitle}
                      time={entry.time}
                      timeChip={entry.timeChip}
                      entryType={entry.entryType}
                      status={entry.status}
                      accentColor={accentColor}
                      isRecurring={entry.isRecurring}
                      onToggle={
                        resolvedType !== "someday"
                          ? () => toggleItem(entry.id)
                          : undefined
                      }
                      onPress={() =>
                        router.push(
                          `/detail?id=${encodeURIComponent(entry.id)}&entryType=${entry.entryType}`,
                        )
                      }
                      onDelete={() => handleDelete(entry.id)}
                    />
                  ))}
                </View>
              </View>
            ))
          )}

          {resolvedType !== "someday" && sections.length > 0 ? (
            <WrapupCard />
          ) : null}

          {/* Bottom padding so FAB never overlaps the last entry */}
          <View style={styles.fabSpacer} />
        </ScrollView>

        <Fab onPress={() => router.push("/modal")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.xl,
    paddingBottom: tokens.space.xl,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingTop: tokens.space.xl * 2,
  },
  section: {
    gap: tokens.space.lg,
    marginBottom: tokens.space.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.xs,
  },
  sectionLabel: {
    letterSpacing: 1,
    fontSize: 10,
    fontWeight: "700",
  },
  countBadge: {
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
  },
  countBadgeText: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  itemList: {
    gap: tokens.space.sm,
  },
  fabSpacer: {
    height: 80,
  },
});
