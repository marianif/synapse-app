import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { EmptyState } from "@/components/molecules/empty-state";
import { ListFilterBar } from "@/components/molecules/list-filter-bar";
import { ListItem } from "@/components/molecules/list-item";
import { WrapupCard } from "@/components/molecules/wrapup-card";
import { ScreenHeader } from "@/components/organisms/screen-header";
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
import type {
  ListStatusFilter,
  ListTypeFilter,
} from "@/components/molecules/list-filter-bar";
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

function ideaEntryToListEntry(entry: DbEntry): ListEntry {
  return {
    id: entry.id,
    title: entry.title,
    subtitle: entry.subtitle ?? undefined,
    entryType: entry.type,
    status: "scheduled",
  };
}

/** Temporal types Incoming surfaces — the time-driven lanes only. */
const INCOMING_TYPES: ReadonlySet<EntryType> = new Set(["deadline", "todo"]);

/** True when an entry is finished (completed task/event or a met deadline). */
function isDoneEntry(e: DbEntry): boolean {
  return e.status === "completed" || e.status === "met";
}

/**
 * "Incoming" sections — the temporal types together (deadlines, events, todos),
 * bucketed by whichever date the entry carries (scheduled or due), sorted
 * soonest-first. Untimed lanes (someday / idea) are deliberately excluded:
 * Incoming is the time-driven view, reached from the header tray.
 *
 * Two optional lenses narrow it: `typeFilter` (one temporal type, or all) and
 * `statusFilter` (live / done / all). They compose, so "live deadlines" is one
 * focused view.
 */
function buildIncomingSections(
  entries: DbEntry[],
  typeFilter: ListTypeFilter,
  statusFilter: ListStatusFilter,
): Section[] {
  const now = new Date();

  const dated = entries
    .filter((e) => INCOMING_TYPES.has(e.type))
    .filter((e) => typeFilter === "all" || e.type === typeFilter)
    .filter((e) =>
      statusFilter === "all"
        ? true
        : statusFilter === "done"
          ? isDoneEntry(e)
          : !isDoneEntry(e),
    )
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
      : entryType === "idea"
        ? "idea"
        : entryType === "todo"
          ? "todo"
          : null;

  const isIncoming = resolvedType === null;
  const isIdeaLane = resolvedType === "idea";

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
      : isIdeaLane
        ? "Ideas"
        : "Weekly Todos";

  const { entries, updateEntryStatus, deleteEntry, fetchEntries } =
    useDatabase();

  // Incoming's persistent lenses. Session-local (resets on app restart) — a
  // glanceable view, not a saved preference. Only the Incoming lane shows these.
  const [typeFilter, setTypeFilter] = useState<ListTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ListStatusFilter>("all");

  useFocusEffect(
    useCallback(() => {
      // Incoming fetches every type; a lane fetches just its own.
      fetchEntries(resolvedType ?? undefined);
    }, [resolvedType, fetchEntries]),
  );

  // ── Build sections ────────────────────────────────────────────────────────────

  const ideaEntries = entries.filter((e) => e.type === "idea");

  const sections: Section[] = isIncoming
    ? buildIncomingSections(entries, typeFilter, statusFilter)
    : isIdeaLane
      ? ideaEntries.length > 0
        ? [
            {
              label: "Ideas",
              entries: ideaEntries.map(ideaEntryToListEntry),
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

  const showTelemetry = !isIdeaLane && sections.length > 0;

  const kicker = isIncoming
    ? "INCOMING"
    : resolvedType === "deadline"
      ? "DEADLINES"
      : isIdeaLane
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

  // In Incoming, distinguish "no scheduled entries at all" from "the active
  // filter hides them" — the copy and CTA differ, and a filtered-empty view must
  // keep the filter bar so the user can widen the lens back out.
  const hasAnyIncoming = isIncoming
    ? entries.some((e) => INCOMING_TYPES.has(e.type) && parseDate(e.scheduled_date ?? e.due_date) !== null)
    : false;
  const isFilteredEmpty =
    isIncoming && sections.length === 0 && hasAnyIncoming;

  const emptyTitle = isFilteredEmpty
    ? "Nothing matches"
    : isIncoming
      ? "Nothing incoming"
      : resolvedType === "deadline"
        ? "No deadlines tracked"
        : isIdeaLane
          ? "Your ideas list is empty"
          : "No todos yet";

  const emptyDescription = isFilteredEmpty
    ? "No entries fit this filter. Widen the lens above."
    : isIncoming
      ? "Anything you capture lands here, soonest first."
      : resolvedType === "deadline"
        ? "Capture a deadline to stay ahead of critical dates."
        : isIdeaLane
          ? "Capture things you want to explore someday."
          : "Capture todos to build your weekly focus.";

  // Capture (the tab-bar pen) is the only creation path, so the empty state
  // only offers a "clear filters" action when a filter hid everything.
  const emptyCtaLabel = isFilteredEmpty ? "Clear filters" : undefined;

  function handleEmptyCta(): void {
    // Capture (the tab-bar pen) is the only creation path now, so the empty CTA
    // only resets filters; there is no add affordance from the list.
    setTypeFilter("all");
    setStatusFilter("all");
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {/* Header lives on the navigator (Stack), not in the screen body — but
          its title/kicker/hue are param-driven, so we set them here. */}
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title={screenTitle}
              kicker={kicker}
              entryType={resolvedType ?? undefined}
              onBack={() => router.back()}
              inset
            />
          ),
        }}
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

          {/* Incoming's persistent filter — only when there's something to narrow.
              Stays visible in the filtered-empty state so the lens can reopen. */}
          {isIncoming && hasAnyIncoming ? (
            <ListFilterBar
              type={typeFilter}
              onType={setTypeFilter}
              status={statusFilter}
              onStatus={setStatusFilter}
            />
          ) : null}

          {/* Empty state — full-screen when no entries */}
          {sections.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <EmptyState
                title={emptyTitle}
                description={emptyDescription}
                ctaLabel={emptyCtaLabel}
                onCta={emptyCtaLabel ? handleEmptyCta : undefined}
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

          {!isIdeaLane && !isIncoming && sections.length > 0 ? (
            <WrapupCard />
          ) : null}

          {/* Bottom padding for comfortable scroll end */}
          <View style={styles.fabSpacer} />
        </ScrollView>
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
