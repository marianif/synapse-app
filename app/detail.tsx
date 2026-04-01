import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CountdownChip } from "@/components/atoms/countdown-chip";
import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { DetailActionBar } from "@/components/molecules/detail-action-bar";
import { DetailMetadataRow } from "@/components/molecules/detail-metadata-row";
import { DetailSomedayHero } from "@/components/molecules/detail-someday-hero";
import { EmptyState } from "@/components/molecules/empty-state";
import { ListScreenHeader } from "@/components/organisms/list-screen-header";
import {
  EntryAccent,
  Radius,
  Spacing,
  Surface,
  TextColors,
} from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import {
  getEffectiveStatus,
  humanizeRule,
  isRecurringEntry,
} from "@/lib/recurrence";
import type { DbRecurrenceCompletion } from "@/lib/schema";

import type { EntryType } from "@/components/atoms/entry-dot";
import type { ActionItem } from "@/components/molecules/detail-action-bar";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_ABBRS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseDaysRemaining(dueDateStr: string | null): number {
  if (!dueDateStr) return 0;
  // Expects "DayName, Mon DD" e.g. "Thursday, Apr 10"
  const parts = dueDateStr.replace(",", "").split(" ");
  if (parts.length < 3) return 0;
  const monthIndex = MONTH_ABBRS.indexOf(parts[1]);
  const day = parseInt(parts[2], 10);
  if (monthIndex === -1 || isNaN(day)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(today.getFullYear(), monthIndex, day);
  return Math.max(0, Math.ceil((due.getTime() - today.getTime()) / 86_400_000));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  scheduled: "SCHEDULED",
  active: "ACTIVE NOW",
  completed: "COMPLETED",
  pending: "PENDING",
  overdue: "OVERDUE",
  met: "MET",
};

function getStatusColor(status: string, accentColor: string): string {
  if (status === "completed" || status === "met") return "#52C87A";
  if (status === "overdue") return "#FF4444";
  if (status === "active") return accentColor;
  return TextColors.tertiary;
}

// ─── Type chip ────────────────────────────────────────────────────────────────

function TypeChip({
  entryType,
  accentColor,
  isRecurring,
}: {
  entryType: EntryType;
  accentColor: string;
  isRecurring?: boolean;
}): React.ReactElement {
  const labels: Record<EntryType, string> = {
    todo: "TODO",
    deadline: "DEADLINE",
    event: "EVENT",
    someday: "ONE DAY",
  };
  return (
    <View style={[styles.typeChip, { backgroundColor: accentColor + "20" }]}>
      <EntryDot type={entryType} size={6} />
      <ThemedText
        type="caption"
        style={[styles.typeChipText, { color: accentColor }]}
      >
        {labels[entryType]}
      </ThemedText>
      {isRecurring && (
        <ThemedText
          type="caption"
          style={[styles.typeChipText, { color: accentColor }]}
        >
          ↻
        </ThemedText>
      )}
    </View>
  );
}

// ─── Section: TODOS hero ───────────────────────────────────────────────────────

function TaskHero({
  status,
  scheduledDate,
  scheduledTime,
  accentColor,
  recurrenceRule,
  recurrenceEndDate,
}: {
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  accentColor: string;
  recurrenceRule?: string | null;
  recurrenceEndDate?: string | null;
}): React.ReactElement {
  const statusColor = getStatusColor(status, accentColor);
  return (
    <View style={styles.heroBlock}>
      <View
        style={[styles.statusChip, { backgroundColor: statusColor + "18" }]}
      >
        <ThemedText
          type="label"
          style={[styles.statusLabel, { color: statusColor }]}
        >
          {STATUS_LABELS[status] ?? status.toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.metaList}>
        {scheduledDate ? (
          <DetailMetadataRow
            icon="calendar-outline"
            label="Date"
            value={scheduledDate}
            accentColor={accentColor}
          />
        ) : null}
        {scheduledTime ? (
          <DetailMetadataRow
            icon="clock-outline"
            label="Time"
            value={scheduledTime}
            accentColor={accentColor}
          />
        ) : null}
        {recurrenceRule ? (
          <DetailMetadataRow
            icon="repeat"
            label="Repeat"
            value={humanizeRule(recurrenceRule)}
            accentColor={accentColor}
          />
        ) : null}
        {recurrenceEndDate ? (
          <DetailMetadataRow
            icon="calendar-end"
            label="Ends"
            value={recurrenceEndDate}
            accentColor={accentColor}
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Section: Deadline hero ───────────────────────────────────────────────────

function DeadlineHero({
  status,
  dueDate,
  dueTime,
  accentColor,
  recurrenceRule,
  recurrenceEndDate,
}: {
  status: string;
  dueDate: string | null;
  dueTime: string | null;
  accentColor: string;
  recurrenceRule?: string | null;
  recurrenceEndDate?: string | null;
}): React.ReactElement {
  const daysRemaining = parseDaysRemaining(dueDate);
  return (
    <View style={styles.heroBlock}>
      <CountdownChip
        daysRemaining={daysRemaining}
        state={status as "pending" | "overdue" | "met"}
      />
      <View style={styles.metaList}>
        {dueDate ? (
          <DetailMetadataRow
            icon="calendar-alert"
            label="Due Date"
            value={dueDate}
            accentColor={accentColor}
          />
        ) : null}
        {dueTime ? (
          <DetailMetadataRow
            icon="clock-outline"
            label="Due Time"
            value={dueTime}
            accentColor={accentColor}
          />
        ) : null}
        {recurrenceRule ? (
          <DetailMetadataRow
            icon="repeat"
            label="Repeat"
            value={humanizeRule(recurrenceRule)}
            accentColor={accentColor}
          />
        ) : null}
        {recurrenceEndDate ? (
          <DetailMetadataRow
            icon="calendar-end"
            label="Ends"
            value={recurrenceEndDate}
            accentColor={accentColor}
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Delete scope sheet ────────────────────────────────────────────────────────

function DeleteScopeSheet({
  visible,
  onClose,
  onDeleteThis,
  onDeleteFuture,
  onDeleteAll,
}: {
  visible: boolean;
  onClose: () => void;
  onDeleteThis: () => void;
  onDeleteFuture: () => void;
  onDeleteAll: () => void;
}): React.ReactElement {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View style={styles.sheet}>
          <ThemedText type="bodyBold" style={styles.sheetTitle}>
            Delete recurring entry
          </ThemedText>
          <Pressable style={styles.sheetOption} onPress={onDeleteThis}>
            <ThemedText type="body">Delete this occurrence</ThemedText>
          </Pressable>
          <View style={styles.sheetDivider} />
          <Pressable style={styles.sheetOption} onPress={onDeleteFuture}>
            <ThemedText type="body">Delete this and all future</ThemedText>
          </Pressable>
          <View style={styles.sheetDivider} />
          <Pressable style={styles.sheetOption} onPress={onDeleteAll}>
            <ThemedText type="body" style={{ color: "#FF6B6B" }}>
              Delete entire series
            </ThemedText>
          </Pressable>
          <View style={styles.sheetDivider} />
          <Pressable style={styles.sheetOption} onPress={onClose}>
            <ThemedText type="bodyBold" muted>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id: rawId, entryType } = useLocalSearchParams<{
    id?: string;
    entryType?: string;
  }>();

  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  // Composite ID support: "masterId::instanceDate" for recurring instances
  const isRecurringInstance = rawId?.includes("::") ?? false;
  const [masterId, instanceDate] = isRecurringInstance
    ? (rawId ?? "").split("::")
    : [rawId, null];

  const accentColor = EntryAccent[entryType as EntryType] ?? EntryAccent.todo;
  const isSomeday = entryType === "someday";

  const {
    entries,
    ideas,
    recurrenceCompletions,
    isLoading,
    updateEntryStatus,
    deleteEntry,
    completeRecurringInstance,
    uncompleteRecurringInstance,
    skipRecurringInstance,
    deleteRecurringFuture,
    deleteRecurringSeries,
    fetchEntries,
    fetchIdeas,
  } = useDatabase();

  useFocusEffect(
    useCallback(() => {
      if (isSomeday) {
        fetchIdeas();
      } else {
        fetchEntries();
      }
    }, [isSomeday, fetchEntries, fetchIdeas]),
  );

  // ── Resolve entry ────────────────────────────────────────────────────────────

  const entry = isSomeday ? null : entries.find((e) => e.id === masterId);
  const idea = isSomeday ? ideas.find((i) => i.id === masterId) : null;

  const title = entry?.title ?? idea?.title ?? "";
  const notes = entry?.notes ?? idea?.notes ?? null;

  // Effective status: for recurring instances, use per-instance completion if present
  const completionsByKey = new Map<string, DbRecurrenceCompletion>();
  for (const c of recurrenceCompletions) {
    completionsByKey.set(`${c.entry_id}::${c.instance_date}`, c);
  }

  const effectiveStatus =
    entry && isRecurringInstance && instanceDate
      ? getEffectiveStatus(entry, instanceDate, completionsByKey)
      : (entry?.status ?? "scheduled");

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ListScreenHeader title="" onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={accentColor} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────

  if (!entry && !idea) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ListScreenHeader title="" onBack={() => router.back()} />
        <View style={styles.centered}>
          <EmptyState
            title="Entry not found"
            description="This entry may have been deleted."
            ctaLabel="Go Back"
            onCta={() => router.back()}
            accentColor={accentColor}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Action bar ───────────────────────────────────────────────────────────────

  async function handleComplete(): Promise<void> {
    if (!entry) return;
    if (isRecurringInstance && instanceDate) {
      const isDone = effectiveStatus === "completed";
      if (isDone) {
        await uncompleteRecurringInstance(entry.id, instanceDate);
      } else {
        await completeRecurringInstance(entry.id, instanceDate, "completed");
      }
    } else {
      const nextStatus =
        entry.status === "completed" ? "scheduled" : "completed";
      await updateEntryStatus(entry.id, nextStatus);
    }
  }

  async function handleMarkMet(): Promise<void> {
    if (!entry) return;
    if (isRecurringInstance && instanceDate) {
      const isDone = effectiveStatus === "met";
      if (isDone) {
        await uncompleteRecurringInstance(entry.id, instanceDate);
      } else {
        await completeRecurringInstance(entry.id, instanceDate, "met");
      }
    } else {
      const nextStatus = entry.status === "met" ? "pending" : "met";
      await updateEntryStatus(entry.id, nextStatus);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!entry) {
      router.back();
      return;
    }
    if (isRecurringInstance) {
      setDeleteSheetVisible(true);
    } else {
      await deleteEntry(entry.id);
      router.back();
    }
  }

  async function handleDeleteThis(): Promise<void> {
    if (!entry || !instanceDate) return;
    setDeleteSheetVisible(false);
    await skipRecurringInstance(entry.id, instanceDate);
    router.back();
  }

  async function handleDeleteFuture(): Promise<void> {
    if (!entry || !instanceDate) return;
    setDeleteSheetVisible(false);
    await deleteRecurringFuture(entry.id, instanceDate);
    router.back();
  }

  async function handleDeleteAll(): Promise<void> {
    if (!entry) return;
    setDeleteSheetVisible(false);
    await deleteRecurringSeries(entry.id);
    router.back();
  }

  const isCompleted = effectiveStatus === "completed";
  const isMet = effectiveStatus === "met";

  const actions: [ActionItem, ActionItem, ActionItem] =
    entryType === "todo" || entryType === "event"
      ? [
          {
            icon: "check-circle-outline",
            label: isCompleted ? "Completed" : "Complete",
            onPress: handleComplete,
            isPrimary: true,
            accentColor,
          },
          {
            icon: "pencil-outline",
            label: "Edit",
            onPress: () => {
              if (!entry) return;
              const params = new URLSearchParams();
              params.set("entryId", entry.id);
              params.set("type", entry.type);
              params.set("title", entry.title);
              if (entry.scheduled_date)
                params.set("date", entry.scheduled_date);
              if (entry.scheduled_time)
                params.set("time", entry.scheduled_time);
              if (entry.due_date) params.set("date", entry.due_date);
              if (entry.due_time) params.set("time", entry.due_time);
              if (entry.notes) params.set("notes", entry.notes);
              if (entry.recurrence_rule)
                params.set("recurrence", JSON.stringify(entry.recurrence_rule));
              if (entry.recurrence_end_date)
                params.set("recurrenceEndDate", entry.recurrence_end_date);
              router.push(`/modal?${params.toString()}`);
            },
            accentColor,
          },
          {
            icon: "trash-can-outline",
            label: "Delete",
            onPress: handleDelete,
            isDanger: true,
          },
        ]
      : entryType === "deadline"
        ? [
            {
              icon: "check-decagram-outline",
              label: isMet ? "Met" : "Mark Met",
              onPress: handleMarkMet,
              isPrimary: true,
              accentColor,
            },
            {
              icon: "pencil-outline",
              label: "Edit",
              onPress: () => {
                if (!entry) return;
                const params = new URLSearchParams();
                params.set("entryId", entry.id);
                params.set("type", entry.type);
                params.set("title", entry.title);
                if (entry.scheduled_date)
                  params.set("date", entry.scheduled_date);
                if (entry.scheduled_time)
                  params.set("time", entry.scheduled_time);
                if (entry.due_date) params.set("date", entry.due_date);
                if (entry.due_time) params.set("time", entry.due_time);
                if (entry.notes) params.set("notes", entry.notes);
                if (entry.recurrence_rule)
                  params.set(
                    "recurrence",
                    JSON.stringify(entry.recurrence_rule),
                  );
                if (entry.recurrence_end_date)
                  params.set("recurrenceEndDate", entry.recurrence_end_date);
                router.push(`/modal?${params.toString()}`);
              },
              accentColor,
            },
            {
              icon: "trash-can-outline",
              label: "Delete",
              onPress: handleDelete,
              isDanger: true,
            },
          ]
        : [
            {
              icon: "arrow-up-circle-outline",
              label: "Promote",
              onPress: () => {},
              isPrimary: true,
              accentColor,
            },
            { icon: "pencil-outline", label: "Edit", onPress: () => {} },
            {
              icon: "trash-can-outline",
              label: "Delete",
              onPress: () => router.back(),
              isDanger: true,
            },
          ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        {/* ── Header ───────────────────────────────────────────── */}
        <ListScreenHeader title="Detail" onBack={() => router.back()} />

        {/* ── Scrollable content ──────────────────────────────── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Type chip */}
          <TypeChip
            entryType={entryType as EntryType}
            accentColor={accentColor}
            isRecurring={entry ? isRecurringEntry(entry) : false}
          />

          {/* Title */}
          <ThemedText type="headline" style={styles.title}>
            {title}
          </ThemedText>

          {/* Type-specific hero block */}
          {entry && (entryType === "todo" || entryType === "event") ? (
            <TaskHero
              status={effectiveStatus}
              scheduledDate={entry.scheduled_date}
              scheduledTime={entry.scheduled_time}
              accentColor={accentColor}
              recurrenceRule={entry.recurrence_rule}
              recurrenceEndDate={entry.recurrence_end_date}
            />
          ) : entry && entryType === "deadline" ? (
            <DeadlineHero
              status={effectiveStatus}
              dueDate={entry.due_date}
              dueTime={entry.due_time}
              accentColor={accentColor}
              recurrenceRule={entry.recurrence_rule}
              recurrenceEndDate={entry.recurrence_end_date}
            />
          ) : idea ? (
            <DetailSomedayHero inspiration={idea.inspiration ?? undefined} />
          ) : null}

          {/* Project / subtitle (ideas only) */}
          {idea?.subtitle ? (
            <DetailMetadataRow
              icon="folder-outline"
              label="Project"
              value={idea.subtitle}
              accentColor={accentColor}
            />
          ) : null}

          {/* Notes */}
          {notes ? (
            <View style={styles.notesBlock}>
              <ThemedText type="caption" muted style={styles.notesLabel}>
                NOTES
              </ThemedText>
              <ThemedText type="body" style={styles.notesText}>
                {notes}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.contentSpacer} />
        </ScrollView>

        {/* ── Action bar — pinned above safe area ─────────────── */}
        <View style={styles.actionBarWrapper}>
          <DetailActionBar actions={actions} />
        </View>
      </View>

      {/* ── Delete scope sheet (recurring only) ─────────────── */}
      <DeleteScopeSheet
        visible={deleteSheetVisible}
        onClose={() => setDeleteSheetVisible(false)}
        onDeleteThis={handleDeleteThis}
        onDeleteFuture={handleDeleteFuture}
        onDeleteAll={handleDeleteAll}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  screen: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  typeChipText: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_700Bold",
  },
  // ── Hero block ──────────────────────────────────────────────
  heroBlock: {
    gap: Spacing.md,
  },
  statusChip: {
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  statusLabel: {
    letterSpacing: 0.8,
  },
  metaList: {
    gap: Spacing.sm,
  },
  // ── Notes ───────────────────────────────────────────────────
  notesBlock: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  notesLabel: {
    letterSpacing: 0.6,
  },
  notesText: {
    lineHeight: 22,
    color: TextColors.secondary,
  },
  contentSpacer: {
    height: Spacing.xl,
  },
  // ── Action bar ───────────────────────────────────────────────
  actionBarWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Surface.base,
  },
  // ── Delete scope sheet ───────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Surface.containerLow,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sheetTitle: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    color: TextColors.secondary,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Surface.outlineVariant,
    marginHorizontal: Spacing.lg,
  },
  sheetOption: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
});
