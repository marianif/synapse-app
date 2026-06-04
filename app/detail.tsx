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
import { ThemedText } from "@/components/atoms/themed-text";
import { DetailActionBar } from "@/components/molecules/detail-action-bar";
import { DetailReadout } from "@/components/molecules/detail-readout";
import { EmptyState } from "@/components/molecules/empty-state";
import { SignalRail } from "@/components/molecules/signal-rail";
import { ListScreenHeader } from "@/components/organisms/list-screen-header";
import type { ThemeColors } from "@/constants/theme";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import {
  getEffectiveStatus,
  humanizeRule,
  isRecurringEntry,
} from "@/lib/recurrence";
import type { DbRecurrenceCompletion } from "@/lib/types";

import type { EntryType } from "@/components/atoms/entry-dot";
import type { PrimaryAction } from "@/components/molecules/detail-action-bar";
import type { ReadoutLine } from "@/components/molecules/detail-readout";

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

// ─── Delete confirm sheet (non-recurring) ─────────────────────────────────────

function DeleteConfirmSheet({
  visible,
  onClose,
  onConfirm,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
            DELETE ENTRY
          </ThemedText>
          <Pressable style={styles.sheetOption} onPress={onConfirm}>
            <ThemedText type="body" style={{ color: tokens.feedback.danger }}>
              Delete
            </ThemedText>
          </Pressable>
          <View
            style={[
              styles.sheetDivider,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          />
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
          <Pressable style={styles.sheetOption} onPress={onDeleteThis}>
            <ThemedText type="body">Delete this occurrence</ThemedText>
          </Pressable>
          <View
            style={[
              styles.sheetDivider,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          />
          <Pressable style={styles.sheetOption} onPress={onDeleteFuture}>
            <ThemedText type="body">Delete this and all future</ThemedText>
          </Pressable>
          <View
            style={[
              styles.sheetDivider,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          />
          <Pressable style={styles.sheetOption} onPress={onDeleteAll}>
            <ThemedText type="body" style={{ color: tokens.feedback.danger }}>
              Delete entire series
            </ThemedText>
          </Pressable>
          <View
            style={[
              styles.sheetDivider,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          />
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
  const { colors } = useTheme();
  const { id: rawId, entryType } = useLocalSearchParams<{
    id?: string;
    entryType?: string;
  }>();

  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

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
    fetchEntries,
  } = useDatabase();

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [fetchEntries]),
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
        edges={["top", "bottom"]}
      >
        <ListScreenHeader title="" onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={entryColor(hintType)} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────

  if (!entry) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.paper }]}
        edges={["top", "bottom"]}
      >
        <ListScreenHeader title="" onBack={() => router.back()} />
        <View style={styles.centered}>
          <EmptyState
            title="Entry not found"
            description="This entry may have been deleted."
            ctaLabel="Go Back"
            onCta={() => router.back()}
            accentColor={entryColor(hintType)}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Type, color & derived flags — from the ENTRY, the source of truth ────────
  // (not the URL param, which several navigation call sites omit). This is what
  // keeps the accent color and the primary action honest for every entry type.

  const type = entry.type;
  const accentColor = entryColor(type);
  const isSomeday = type === "someday" || type === "idea";

  // ── Action bar ───────────────────────────────────────────────────────────────

  function buildEditParams(): string {
    if (!entry) return "";
    const params = new URLSearchParams();
    params.set("entryId", entry.id);
    params.set("type", entry.type);
    params.set("title", entry.title);
    if (entry.scheduled_date) params.set("date", entry.scheduled_date);
    if (entry.scheduled_time) params.set("time", entry.scheduled_time);
    if (entry.due_date) params.set("date", entry.due_date);
    if (entry.due_time) params.set("time", entry.due_time);
    if (entry.notes) params.set("notes", entry.notes);
    if (entry.recurrence_rule)
      params.set("recurrence", JSON.stringify(entry.recurrence_rule));
    if (entry.recurrence_end_date)
      params.set("recurrenceEndDate", entry.recurrence_end_date);
    return params.toString();
  }

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
      setDeleteConfirmVisible(true);
    }
  }

  async function handleDeleteConfirmed(): Promise<void> {
    if (!entry) return;
    setDeleteConfirmVisible(false);
    await deleteEntry(entry.id);
    router.back();
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

  const handleEdit = (): void => {
    const qs = buildEditParams();
    if (qs) router.push(`/modal?${qs}`);
  };

  // someday / idea have no scheduled action, so they get NO primary — the bar
  // falls back to the quiet Edit / Delete pair. (The old "Promote" tile was a
  // no-op: there's no promote/convert path in the data layer.)
  const primary: PrimaryAction | undefined =
    type === "todo" || type === "event"
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

  // ── Readout lines (mono telemetry) ───────────────────────────────────────────

  const statusColor = getStatusColor(
    effectiveStatus,
    accentColor,
    colors.inkMuted,
  );

  const readoutLines: ReadoutLine[] = [];

  const isDeadline = type === "deadline";
  const isTask = type === "todo" || type === "event";

  if (isTask) {
    readoutLines.push({
      key: "STATUS",
      value: STATUS_LABELS[effectiveStatus] ?? effectiveStatus.toUpperCase(),
      dotColor: statusColor,
    });
    if (entry.scheduled_date)
      readoutLines.push({
        key: "DATE",
        value: readoutDate(entry.scheduled_date),
      });
    if (entry.scheduled_time)
      readoutLines.push({ key: "TIME", value: entry.scheduled_time });
  } else if (isDeadline) {
    if (entry.due_date)
      readoutLines.push({ key: "DUE", value: readoutDate(entry.due_date) });
    if (entry.due_time)
      readoutLines.push({ key: "TIME", value: entry.due_time });
  }

  if (entry.recurrence_rule)
    readoutLines.push({
      key: "REPEAT",
      value: humanizeRule(entry.recurrence_rule).toUpperCase(),
    });
  if (entry.recurrence_end_date)
    readoutLines.push({
      key: "ENDS",
      value: readoutDate(entry.recurrence_end_date),
    });
  if (entry.subtitle)
    readoutLines.push({ key: "PROJECT", value: entry.subtitle.toUpperCase() });

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["top", "bottom"]}
    >
      <View style={[styles.screen, { backgroundColor: colors.paper }]}>
        {/* ── Header ───────────────────────────────────────────── */}
        <ListScreenHeader title="Detail" onBack={() => router.back()} />

        {/* ── Scrollable content ──────────────────────────────── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Signal rail: type-color edge-bar + kicker + title + readout */}
          <SignalRail
            entryType={type}
            isRecurring={isRecurringEntry(entry)}
            title={title}
          >
            {/* Deadlines lead with the countdown, then the readout below it. */}
            {isDeadline ? (
              <View style={styles.countdownSlot}>
                <CountdownChip
                  daysRemaining={parseDaysRemaining(entry.due_date)}
                  state={effectiveStatus as "pending" | "overdue" | "met"}
                />
              </View>
            ) : null}

            {readoutLines.length > 0 ? (
              <View style={styles.railChild}>
                <DetailReadout lines={readoutLines} />
              </View>
            ) : null}

            {/* Someday / idea inspiration — the one place a softer voice fits. */}
            {isSomeday && entry.inspiration ? (
              <ThemedText
                type="body"
                style={[
                  styles.inspiration,
                  styles.railChild,
                  { color: colors.inkMuted },
                ]}
              >
                {entry.inspiration}
              </ThemedText>
            ) : null}
          </SignalRail>

          {/* Notes — Tier 3: the one block you actually read, so it earns a real
              break from the hero and its own air. */}
          {notes ? (
            <View
              style={[
                styles.notesBlock,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <ThemedText type="label" muted style={styles.notesLabel}>
                NOTES
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.notesText, { color: colors.ink }]}
              >
                {notes}
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        {/* ── Action bar — pinned above safe area ─────────────── */}
        <View
          style={[styles.actionBarWrapper, { backgroundColor: colors.paper }]}
        >
          <DetailActionBar
            primary={primary}
            accentColor={accentColor}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </View>
      </View>

      {/* ── Delete confirm sheet (non-recurring) ────────────── */}
      <DeleteConfirmSheet
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        onConfirm={handleDeleteConfirmed}
        colors={colors}
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
  // ── Signal rail children (Tier 2) ───────────────────────────
  // The rail itself is now the autonomous <SignalRail>. These margins set the
  // ratio for what the screen composes INSIDE it: telemetry / countdown /
  // inspiration sit one real breath below the hero title.
  railChild: {
    marginTop: tokens.space.md,
  },
  countdownSlot: {
    alignSelf: "flex-start",
    marginTop: tokens.space.md,
  },
  inspiration: {
    lineHeight: 22,
  },
  // ── Notes (Tier 3) ──────────────────────────────────────────
  notesBlock: {
    // A real zone break from the hero/telemetry above — this is the only block
    // the user reads, so the ratio gives it the biggest gap on the screen.
    marginTop: tokens.space.xl,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  notesLabel: {
    letterSpacing: 0.6,
  },
  notesText: {
    lineHeight: 22,
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
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  sheetTitle: {
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
    letterSpacing: 0.6,
  },
  sheetDivider: {
    height: 1,
    marginHorizontal: tokens.space.lg,
  },
  sheetOption: {
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
  },
});
