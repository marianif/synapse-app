import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/atoms/themed-text";
import { EmptyState } from "@/components/molecules/empty-state";
import { ListItem } from "@/components/molecules/list-item";
import { WrapupCard } from "@/components/molecules/wrapup-card";
import { Fab } from "@/components/organisms/fab";
import { ListScreenHeader } from "@/components/organisms/list-screen-header";
import {
  entryColor,
  entryTint,
  useTheme,
  tokens,
} from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { isSameDay, parseDate } from "@/lib/date-utils";
import { isRecurringEntry } from "@/lib/recurrence";

import type { ItemStatus } from "@/components/molecules/list-item";
import type { DbEntry, EntryType } from "@/lib/types";

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
    // keep the real type (someday vs idea) so the edge-bar codes correctly
    entryType: entry.type,
    status: "scheduled",
  };
}

/** Temporal types Incoming surfaces — the time-driven lanes only. */
const INCOMING_TYPES: ReadonlySet<EntryType> = new Set([
  "deadline",
  "event",
  "todo",
]);

/**
 * "Incoming" sections — the temporal types together (deadlines, events, todos),
 * bucketed by whichever date the entry carries (scheduled or due), sorted
 * soonest-first. Untimed lanes (someday / idea) are deliberately excluded:
 * Incoming is the time-driven view, reached from the header tray.
 */
function buildIncomingSections(entries: DbEntry[]): Section[] {
  const now = new Date();

  const dated = entries
    .filter((e) => INCOMING_TYPES.has(e.type))
    .map((e) => ({ e, date: parseDate(e.scheduled_date ?? e.due_date) }))
    .filter((x): x is { e: DbEntry; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const thisWeekItems: ListEntry[] = [];
  const laterItems: ListEntry[] = [];

  for (const { e } of dated) {
    const bucket = classifyEntry(e.scheduled_date ?? e.due_date, now);
    const item = entryToListEntry(e);
    if (bucket === "today" || bucket === "thisWeek") thisWeekItems.push(item);
    else laterItems.push(item);
  }

  const sections: Section[] = [];
  if (thisWeekItems.length > 0)
    sections.push({ label: "This Week", entries: thisWeekItems });
  if (laterItems.length > 0)
    sections.push({ label: "Later", entries: laterItems });
  return sections;
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
  const { colors, scheme } = useTheme();
  const { entryType } = useLocalSearchParams<{ entryType?: string }>();

  // No param → the mixed "Incoming" lane (reached from the sidebar). A bare
  // /list used to silently coerce to "todo", hiding every other type.
  const resolvedType: EntryType | null =
    entryType === "deadline"
      ? "deadline"
      : entryType === "someday"
        ? "someday"
        : entryType === "idea"
          ? "idea"
          : entryType === "event"
            ? "event"
            : entryType === "todo"
              ? "todo"
              : null;

  const isIncoming = resolvedType === null;
  const isSomedayLane = resolvedType === "someday" || resolvedType === "idea";

  // Accent + tint follow the lane's type; Incoming has no single owner, so it
  // borrows neutral ink and a faint surface tint.
  const accentColor = resolvedType ? entryColor(resolvedType) : colors.ink;
  const tintColor = resolvedType
    ? entryTint(resolvedType, scheme)
    : colors.surfaceSubtle;

  const screenTitle = isIncoming
    ? "Incoming"
    : resolvedType === "deadline"
      ? "Deadlines"
      : isSomedayLane
        ? "One Day"
        : "Weekly Todos";

  const { entries, updateEntryStatus, deleteEntry, fetchEntries } =
    useDatabase();

  useFocusEffect(
    useCallback(() => {
      // Incoming fetches every type; a lane fetches just its own.
      fetchEntries(resolvedType ?? undefined);
    }, [resolvedType, fetchEntries]),
  );

  // ── Build sections ────────────────────────────────────────────────────────────

  const somedayEntries = entries.filter(
    (e) => e.type === "someday" || e.type === "idea",
  );

  const sections: Section[] = isIncoming
    ? buildIncomingSections(entries)
    : isSomedayLane
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

  // ── Telemetry counts ──────────────────────────────────────────────────────────

  const allItems = sections.flatMap((s) => s.entries);
  const liveCount = allItems.filter((e) => e.status !== "completed").length;
  const doneCount = allItems.filter((e) => e.status === "completed").length;

  const showTelemetry = !isSomedayLane && sections.length > 0;

  const kicker = isIncoming
    ? "INCOMING"
    : resolvedType === "deadline"
      ? "DEADLINES"
      : isSomedayLane
        ? "IDEAS"
        : resolvedType === "event"
          ? "EVENTS"
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

  const emptyTitle = isIncoming
    ? "Nothing incoming"
    : resolvedType === "deadline"
      ? "No deadlines tracked"
      : isSomedayLane
        ? "Your ideas list is empty"
        : "No todos yet";

  const emptyDescription = isIncoming
    ? "Anything you schedule will land here, soonest first."
    : resolvedType === "deadline"
      ? "Add a deadline to stay ahead of critical dates."
      : isSomedayLane
        ? "Capture things you want to explore someday."
        : "Add todos to build your weekly focus.";

  const emptyCtaLabel = isIncoming
    ? "+ Capture"
    : resolvedType === "deadline"
      ? "+ Add Deadline"
      : isSomedayLane
        ? "+ Capture Idea"
        : "+ Add Todo";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["top"]}
    >
      <View style={[styles.screen, { backgroundColor: colors.paper }]}>
        <ListScreenHeader
          title={screenTitle}
          kicker={kicker}
          entryType={resolvedType ?? undefined}
          onBack={() => router.back()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Telemetry band — the opened tile's status line. Orientation, not
              a gamified score: "N live · M done this week" on the type tint. */}
          {showTelemetry ? (
            <View
              style={[styles.telemetry, { backgroundColor: tintColor }]}
            >
              <ThemedText
                type="mono"
                style={[styles.telemetryStrong, { color: accentColor }]}
              >
                {liveCount} live
              </ThemedText>
              <ThemedText
                type="mono"
                style={[styles.telemetryMuted, { color: colors.inkMuted }]}
              >
                {"  ·  "}
                {doneCount} done this week
              </ThemedText>
            </View>
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
                {/* Section header — primary section reads full-weight, later
                    sections recede so the live lane carries the eye. */}
                <View style={styles.sectionHeader}>
                  <ThemedText
                    type="label"
                    style={[
                      styles.sectionLabel,
                      {
                        color:
                          sectionIndex === 0 ? colors.ink : colors.inkMuted,
                      },
                    ]}
                  >
                    {section.label.toUpperCase()}
                  </ThemedText>
                  <View
                    style={[
                      styles.sectionRule,
                      { backgroundColor: colors.surfaceSubtle },
                    ]}
                  />
                  <ThemedText
                    type="micro"
                    style={[styles.sectionCount, { color: colors.inkMuted }]}
                  >
                    {section.entries.length}
                  </ThemedText>
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
                        entry.entryType === "someday" ||
                        entry.entryType === "idea"
                          ? undefined
                          : () => toggleItem(entry.id)
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

          {!isSomedayLane && !isIncoming && sections.length > 0 ? (
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
  telemetry: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  telemetryStrong: {},
  telemetryMuted: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
  },
  sectionLabel: {
    flexShrink: 0,
  },
  // hairline tonal rule — no 1px borders; this is a surface shift, not a stroke.
  sectionRule: {
    flex: 1,
    height: 2,
    borderRadius: tokens.radius.pill,
  },
  sectionCount: {
    flexShrink: 0,
  },
  itemList: {
    gap: tokens.space.sm,
  },
  fabSpacer: {
    height: 80,
  },
});
