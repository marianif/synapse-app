import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { ScreenHeader } from "@/components/organisms/screen-header";
import type { ThemeColors } from "@/constants/theme";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { horizonEndDate } from "@/lib/horizons";
import { getEffectiveStatus, humanizeRule, parseRule } from "@/lib/recurrence";
import { ConfirmKey } from "@/lib/settings";
import { isSomeday } from "@/lib/taxonomy";
import type {
  DbEntry,
  DbRecurrenceCompletion,
  DueRange,
  RecurrenceFrequency,
  RecurrenceRule,
} from "@/lib/types";

import type { EntryType } from "@/components/atoms/entry-dot";
import type { PrimaryAction } from "@/components/molecules/detail-action-bar";
import type { TelemetryChip } from "@/components/molecules/detail-hero";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_ABBRS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function parseDaysRemaining(dueDateStr: string | null): number {
  if (!dueDateStr) return 0;
  const parts = dueDateStr.split("/");
  if (parts.length < 3) return 0;
  const dd = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  const yyyy = parseInt(parts[2], 10);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(yyyy, mm - 1, dd);
  return Math.max(0, Math.ceil((due.getTime() - today.getTime()) / 86_400_000));
}

/** "12/06/2026" → "12 JUN 2026" for the mono readout. Falls back to the raw
 *  string (uppercased) when it isn't a parseable DD/MM/YYYY value. */
function readoutDate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length < 3) return dateStr.toUpperCase();
  const dd = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  const yyyy = parts[2];
  if (isNaN(dd) || isNaN(mm) || mm < 1 || mm > 12) return dateStr.toUpperCase();
  return `${dd} ${MONTH_ABBRS[mm - 1]} ${yyyy}`;
}

// ─── Inline-edit draft ────────────────────────────────────────────────────────

/**
 * The editable shape of an entry while in inline-edit mode. Date/time map to
 * whichever pair the type uses (scheduled for tasks/events, due for deadlines);
 * the screen reconciles that on save. Type is intentionally NOT editable here —
 * changing an entry's type is a creation-level decision, kept in /modal.
 */
interface EditDraft {
  title: string;
  date: string;
  time: string;
  // Deadline horizon: null = a precise day; otherwise the closing window. When
  // set, due_date is computed as the window's end at save time.
  dueRange: DueRange | null;
  notes: string;
  recurrenceFreq: RecurrenceFrequency | null;
  recurrenceDays: number[];
  recurrenceEndDate: string;
}

function draftFromEntry(entry: DbEntry): EditDraft {
  const isDeadline = entry.type === "deadline";
  // recurrence_rule is stored as serialized JSON; parseRule tolerates null.
  const rule =
    typeof entry.recurrence_rule === "string"
      ? parseRule(entry.recurrence_rule)
      : (entry.recurrence_rule as RecurrenceRule | null);
  return {
    title: entry.title,
    date: (isDeadline ? entry.due_date : entry.scheduled_date) ?? "",
    time: (isDeadline ? entry.due_time : entry.scheduled_time) ?? "",
    dueRange: entry.due_range,
    notes: entry.notes ?? "",
    recurrenceFreq: rule?.freq ?? null,
    recurrenceDays: rule?.days ?? [],
    recurrenceEndDate: entry.recurrence_end_date ?? "",
  };
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

function getStatusColor(
  status: string,
  accentColor: string,
  inkMuted: string,
): string {
  if (status === "completed" || status === "met")
    return tokens.feedback.success;
  if (status === "overdue") return tokens.feedback.danger;
  if (status === "active") return accentColor;
  return inkMuted;
}

// ─── Delete scope sheet (recurring) ───────────────────────────────────────────

function DeleteScopeSheet({
  visible,
  onClose,
  onDeleteThis,
  onDeleteFuture,
  onDeleteAll,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onDeleteThis: () => void;
  onDeleteFuture: () => void;
  onDeleteAll: () => void;
  colors: ThemeColors;
}): React.ReactElement {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <ThemedText
            type="label"
            style={[styles.sheetTitle, { color: colors.inkMuted }]}
          >
            DELETE RECURRING ENTRY
          </ThemedText>
          <Pressable
            onPress={onDeleteThis}
            style={({ pressed }) => [
              styles.sheetOption,
              pressed && { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <ThemedText type="body">Delete this occurrence</ThemedText>
          </Pressable>
          <Pressable
            onPress={onDeleteFuture}
            style={({ pressed }) => [
              styles.sheetOption,
              { backgroundColor: colors.surfaceSubtle },
              pressed && { backgroundColor: colors.paper },
            ]}
          >
            <ThemedText type="body">Delete this and all future</ThemedText>
          </Pressable>
          <Pressable
            onPress={onDeleteAll}
            style={({ pressed }) => [
              styles.sheetOption,
              pressed && { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <ThemedText type="body" style={{ color: tokens.feedback.danger }}>
              Delete entire series
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.sheetOption,
              { backgroundColor: colors.surfaceSubtle },
              pressed && { backgroundColor: colors.paper },
            ]}
          >
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
  const { colors, scheme } = useTheme();
  const { id: rawId, entryType } = useLocalSearchParams<{
    id?: string;
    entryType?: string;
  }>();

  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const deleteConfirm = useConfirm({ confirmKey: ConfirmKey.deleteEntry });

  // Inline edit mode — the detail screen is a view↔edit surface; /modal is now
  // creation-only. `draft` holds the in-flight edits; null means "viewing".
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editing = draft !== null;

  // Composite ID support: "masterId::instanceDate" for recurring instances
  const isRecurringInstance = rawId?.includes("::") ?? false;
  const [masterId, instanceDate] = isRecurringInstance
    ? (rawId ?? "").split("::")
    : [rawId, null];

  // The URL param is only a hint — several call sites omit it entirely, so it
  // can't be trusted for type/color/actions. It's used solely to tint the
  // loading spinner before the real entry (the source of truth) resolves.
  const hintType = (entryType as EntryType) ?? "todo";

  const {
    entries,
    recurrenceCompletions,
    isLoading,
    updateEntryStatus,
    deleteEntry,
    completeRecurringInstance,
    uncompleteRecurringInstance,
    skipRecurringInstance,
    deleteRecurringFuture,
    deleteRecurringSeries,
    updateEntry,
    fetchEntries,
    projects,
    promoteIdeaToProject,
  } = useDatabase();

  // Diary notes filed ON this entry (only ideas carry links today). Read-only
  // here — surfaced so an idea shows the reflections gathered around it.
  const { entries: diaryEntries, refresh: refreshDiary } = useDiary();

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
      refreshDiary();
    }, [fetchEntries, refreshDiary]),
  );

  // ── Resolve entry ────────────────────────────────────────────────────────────

  const entry = entries.find((e) => e.id === masterId);

  const title = entry?.title ?? "";
  const notes = entry?.notes ?? null;

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
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.paper }]}
        edges={["bottom"]}
      >
        <Stack.Screen
          options={{
            headerShown: true,
            header: () => (
              <ScreenHeader
                title=""
                entryType={hintType}
                onBack={() => router.back()}
                inset
              />
            ),
          }}
        />
        <View style={styles.centered}>
          <ActivityIndicator color={entryKicker(hintType, scheme)} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────

  if (!entry) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.paper }]}
        edges={["bottom"]}
      >
        <Stack.Screen
          options={{
            headerShown: true,
            header: () => (
              <ScreenHeader
                title="Not found"
                onBack={() => router.back()}
                inset
              />
            ),
          }}
        />
      </SafeAreaView>
    );
  }

  // ── Type, color & derived flags — from the ENTRY, the source of truth ────────
  // (not the URL param, which several navigation call sites omit). This is what
  // keeps the accent color and the primary action honest for every entry type.

  const type = entry.type;
  const accentColor = entryKicker(type, scheme);
  // An idea has no scheduled action (no primary, inspiration shown instead).
  const isIdea = type === "idea";
  // An undated todo IS a "someday" — surfaced by the badge, render-time only.
  const showSomedayBadge = isSomeday(entry);

  // Notes linked to this entry, newest-first (the diary store is already newest
  // -first, so a filter preserves order). Only ideas can be linked targets today.
  const relatedNotes = diaryEntries.filter(
    (n) => n.linked_entry_id === entry.id,
  );

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
      // Branded confirm (or immediate delete, if the user opted out of the prompt).
      const targetId = entry.id;
      void deleteConfirm.request(() => {
        void deleteEntry(targetId).then(() => router.back());
      });
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

  // ── Inline edit ──────────────────────────────────────────────────────────────
  // Editing happens in place on this screen now — no /modal round-trip. Entering
  // edit mode seeds the draft from the live entry; Save patches it back through
  // updateEntry; Cancel discards. /modal stays for creation only.

  function handleEdit(): void {
    if (!entry) return;
    setDraft(draftFromEntry(entry));
  }

  function patchDraft(patch: Partial<EditDraft>): void {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function handleCancelEdit(): void {
    setDraft(null);
  }

  async function handleSaveEdit(): Promise<void> {
    if (!entry || !draft || isSaving) return;
    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) return;

    setIsSaving(true);
    try {
      const isDeadlineType = entry.type === "deadline";
      const recurrenceRule: RecurrenceRule | null = draft.recurrenceFreq
        ? {
            freq: draft.recurrenceFreq,
            days:
              draft.recurrenceFreq === "weekly"
                ? draft.recurrenceDays
                : undefined,
          }
        : null;

      const horizon = isDeadlineType ? draft.dueRange : null;
      await updateEntry(entry.id, {
        title: trimmedTitle,
        scheduledDate: isDeadlineType ? null : draft.date.trim() || null,
        scheduledTime: isDeadlineType ? null : draft.time.trim() || null,
        dueDate: isDeadlineType
          ? horizon
            ? horizonEndDate(horizon)
            : draft.date.trim() || null
          : null,
        dueTime: isDeadlineType && !horizon ? draft.time.trim() || null : null,
        dueRange: horizon,
        notes: draft.notes.trim() || null,
        recurrenceRule,
        recurrenceEndDate: draft.recurrenceEndDate.trim() || null,
      });
      setDraft(null);
    } catch (error) {
      console.error("[detail] save edit failed:", error);
    } finally {
      setIsSaving(false);
    }
  }

  const canSaveEdit = (draft?.title.trim().length ?? 0) > 0 && !isSaving;

  // someday / idea have no scheduled action, so they get NO primary — the bar
  // falls back to the quiet Edit / Delete pair. (The old "Promote" tile was a
  // no-op: there's no promote/convert path in the data layer.)
  const primary: PrimaryAction | undefined =
    type === "todo"
      ? {
          icon: "check-circle-outline",
          label: isCompleted ? "Completed" : "Complete",
          onPress: handleComplete,
          done: isCompleted,
        }
      : type === "deadline"
        ? {
            icon: "check-decagram-outline",
            label: isMet ? "Met" : "Mark Met",
            onPress: handleMarkMet,
            done: isMet,
          }
        : undefined;

  // ── Telemetry chips — one glance-row, not a stack of separate cards ──────────

  const statusColor = getStatusColor(
    effectiveStatus,
    accentColor,
    colors.inkMuted,
  );

  const chips: TelemetryChip[] = [];

  const isDeadline = type === "deadline";
  const isTask = type === "todo";

  if (isTask) {
    chips.push({
      label: STATUS_LABELS[effectiveStatus] ?? effectiveStatus.toUpperCase(),
      dotColor: statusColor,
    });
    if (showSomedayBadge) {
      chips.push({ label: "SOMEDAY", neutral: true });
    } else {
      if (entry.scheduled_date)
        chips.push({ label: readoutDate(entry.scheduled_date) });
      if (entry.scheduled_time) chips.push({ label: entry.scheduled_time });
    }
  } else if (isDeadline) {
    const daysRemaining = parseDaysRemaining(entry.due_date);
    const countdownColor =
      effectiveStatus === "met"
        ? tokens.feedback.success
        : effectiveStatus === "overdue"
          ? tokens.feedback.danger
          : accentColor;
    const countdownLabel =
      effectiveStatus === "met"
        ? "MET"
        : effectiveStatus === "overdue"
          ? `OVERDUE BY ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? "DAY" : "DAYS"}`
          : daysRemaining === 0
            ? "DUE TODAY"
            : `DUE IN ${daysRemaining} ${daysRemaining === 1 ? "DAY" : "DAYS"}`;
    chips.push({ label: countdownLabel, dotColor: countdownColor });
    if (entry.due_time) chips.push({ label: entry.due_time });
  }

  if (entry.recurrence_rule)
    chips.push({ label: humanizeRule(entry.recurrence_rule).toUpperCase() });
  if (entry.recurrence_end_date)
    chips.push({ label: `ENDS ${readoutDate(entry.recurrence_end_date)}` });
  if (entry.subtitle) chips.push({ label: entry.subtitle.toUpperCase() });

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title={title}
              kicker={STATUS_LABELS[effectiveStatus] ?? undefined}
              entryType={type}
              onBack={() => router.back()}
              inset
            />
          ),
        }}
      />

      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.paper }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      ></KeyboardAvoidingView>

      {/* ── Delete confirm sheet (non-recurring) ────────────── */}
      <ConfirmSheet
        visible={deleteConfirm.visible}
        kicker="DELETE ENTRY"
        message="This removes it from the field for good."
        dontAsk={deleteConfirm.dontAsk}
        onToggleDontAsk={deleteConfirm.toggleDontAsk}
        onConfirm={deleteConfirm.confirm}
        onCancel={deleteConfirm.cancel}
      />

      {/* ── Delete scope sheet (recurring only) ─────────────── */}
      <DeleteScopeSheet
        visible={deleteSheetVisible}
        onClose={() => setDeleteSheetVisible(false)}
        onDeleteThis={handleDeleteThis}
        onDeleteFuture={handleDeleteFuture}
        onDeleteAll={handleDeleteAll}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
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
    paddingHorizontal: tokens.space.lg,
    // Top breath sets the hero off the header; bottom seats the body close to
    // the pinned action bar (no extra spacer block — the body shouldn't pad
    // itself to fill space it doesn't need). Vertical zone gaps are owned by
    // each block's marginTop, NOT a flat gap — the screen has a ratio now.
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.md,
  },
  // Idea inspiration sits one real breath below the hero's telemetry row.
  inspiration: {
    marginTop: tokens.space.md,
    lineHeight: 22,
  },
  // ── Notes (Tier 3) ──────────────────────────────────────────
  notesBlock: {
    // A real zone break from the hero/telemetry above — this is the only block
    // the user reads, so the ratio gives it the biggest gap on the screen.
    marginTop: tokens.space.xl,
    borderRadius: tokens.radius.sm,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  notesLabel: {
    letterSpacing: 0.6,
  },
  notesText: {
    lineHeight: 22,
  },
  // Same zone break as notesBlock — the empty state still earns its own air,
  // it just doesn't need a filled surface under it.
  notesEmpty: {
    marginTop: tokens.space.xl,
    fontSize: 20,
    lineHeight: 26,
  },
  // ── Inline edit ──────────────────────────────────────────────
  // The title input sits at display scale in the rail's title slot, so the hero
  // reads identically in view and edit — only the caret betrays the mode.
  titleInput: {
    marginTop: tokens.space.xs,
    fontFamily: tokens.type.fontInter.bold,
    fontSize: tokens.type.display.size,
    lineHeight: tokens.type.display.lineHeight,
    letterSpacing: tokens.type.display.tracking,
    padding: 0,
  },
  editBlock: {
    marginTop: tokens.space.xl,
    gap: tokens.space.xs,
  },
  horizonRow: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  horizonOption: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.xs,
  },
  editLabel: {
    letterSpacing: tokens.type.kicker.tracking,
  },
  notesInput: {
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    fontSize: tokens.type.body.size,
    lineHeight: 22,
    minHeight: 100,
  },
  editBar: {
    gap: tokens.space.sm,
  },
  saveButton: {
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.space.lg,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.space.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  promoteRow: {
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.xs,
    minHeight: 48,
    justifyContent: "center",
  },
  // ── Action bar ───────────────────────────────────────────────
  actionBarWrapper: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
    paddingTop: tokens.space.md,
  },
  // ── Delete sheets ────────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: tokens.color.scrim.strong,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: tokens.radius.sm,
    borderTopRightRadius: tokens.radius.sm,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  sheetTitle: {
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
    letterSpacing: 0.6,
  },
  sheetOption: {
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
  },
});
