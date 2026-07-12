import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated";

import { ProjectBreadcrumb } from "@/components/atoms/project-breadcrumb";
import { ThemedText } from "@/components/atoms/themed-text";
import { DetailEditForm } from "@/components/molecules/detail-edit-form";
import { DetailHeaderRow } from "@/components/molecules/detail-header-row";
import { DetailViewMeta } from "@/components/molecules/detail-view-meta";
import { TaskChecklist } from "@/components/molecules/task-checklist";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { daysUntil, isDone, isWhenCharged, whenLabel } from "@/lib/direct-when";
import { horizonEndDate, horizonReadout } from "@/lib/horizons";
import { humanizeRule, parseRule } from "@/lib/recurrence";
import { isTaskable } from "@/lib/types";

import type {
  DbEntry,
  DbProject,
  DueRange,
  EntryType,
  RecurrenceFrequency,
  RecurrenceRule,
} from "@/lib/types";

interface DirectDetailSheetProps {
  entry: DbEntry | null;
  project: DbProject | null;
  visible: boolean;
  onClose: () => void;
  onMarkDone: (entry: DbEntry) => void;
  onDelete: (entry: DbEntry) => void;
}

// ── Inline-edit draft ───────────────────────────────────────────
// Mirrors the shape used by the detail screen's inline edit: date/time map to
// whichever pair the type uses, dueRange holds a deadline horizon (null = a
// precise day). Type itself is never editable here.
interface EditDraft {
  title: string;
  date: string;
  time: string;
  dueRange: DueRange | null;
  notes: string;
  recurrenceFreq: RecurrenceFrequency | null;
  recurrenceDays: number[];
  recurrenceEndDate: string;
}

function draftFromEntry(entry: DbEntry): EditDraft {
  const isDeadline = entry.type === "deadline";
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

const STATUS_LABELS: Record<DbEntry["status"], string> = {
  scheduled: "Scheduled",
  active: "Active",
  completed: "Done",
  pending: "Pending",
  met: "Met",
  overdue: "Overdue",
};

function doneLabel(type: EntryType): string {
  if (type === "deadline") return "Mark met";
  if (type === "idea") return "Archive";
  return "Complete";
}

function narrativeFor(entry: DbEntry): string | null {
  if (isDone(entry)) return "Settled";

  const dateStr = entry.due_date ?? entry.scheduled_date ?? null;
  const days = daysUntil(dateStr);
  if (days !== null) {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days <= 7) return `Due in ${days} days`;
  }

  if (entry.type === "idea") {
    const age = Math.floor((Date.now() - entry.created_at) / 86_400_000);
    if (age > 7) return `Sketched ${age} days ago`;
  }

  return null;
}

function whenValue(entry: DbEntry): string {
  const dateStr = entry.due_date ?? entry.scheduled_date ?? null;
  const time = entry.due_time ?? entry.scheduled_time ?? null;
  if (entry.due_range) {
    return horizonReadout(entry.due_range, dateStr);
  }
  return whenLabel(dateStr, time, daysUntil(dateStr));
}

function recurrenceValue(entry: DbEntry): string {
  if (!entry.recurrence_rule) return "Does not repeat";
  let label = humanizeRule(entry.recurrence_rule);
  if (entry.recurrence_end_date) {
    label += ` · ends ${entry.recurrence_end_date}`;
  }
  return label;
}

function urgencyTag(
  entry: DbEntry,
  typeShade: string,
): { text: string; color: string } | null {
  if (isDone(entry)) return null;

  const days = daysUntil(entry.due_date ?? entry.scheduled_date ?? null);
  if (days !== null) {
    if (days < 0)
      return {
        text: `Over by ${Math.abs(days)}d`,
        color: tokens.feedback.danger,
      };
    if (days === 0) return { text: "Today", color: tokens.feedback.warning };
    return { text: `${days}d left`, color: typeShade };
  }

  return null;
}

function statusColor(status: DbEntry["status"]): string | null {
  if (status === "overdue") return tokens.feedback.danger;
  if (status === "completed" || status === "met")
    return tokens.feedback.success;
  return null;
}

export function DirectDetailSheet({
  entry,
  project,
  visible,
  onClose,
  onMarkDone,
  onDelete,
}: DirectDetailSheetProps): React.ReactElement | null {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const { updateEntry } = useDatabase();

  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editing = draft !== null;

  // Leaving the sheet (close, or the selected entry swaps under it) always
  // drops any in-flight edit — reopening starts fresh in view mode.
  useEffect(() => {
    if (!visible) setDraft(null);
  }, [visible]);
  useEffect(() => {
    setDraft(null);
  }, [entry?.id]);

  if (!entry) return null;

  const type = entry.type;
  const done = isDone(entry);
  const accent = entryKicker(type, scheme);
  const charged =
    !done &&
    isWhenCharged(daysUntil(entry.due_date ?? entry.scheduled_date ?? null));
  const urgency = urgencyTag(entry, accent);
  const statColor = statusColor(entry.status);
  const isDeadlineType = type === "deadline";

  const handleMarkDone = (): void => {
    onMarkDone(entry);
    onClose();
  };

  const handleStartEdit = (): void => {
    setDraft(draftFromEntry(entry));
  };

  const handleCancelEdit = (): void => {
    setDraft(null);
  };

  const patchDraft = (patch: Partial<EditDraft>): void => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!draft || isSaving) return;
    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) return;

    setIsSaving(true);
    try {
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
      console.error("[direct-detail-sheet] save edit failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const canSaveEdit = (draft?.title.trim().length ?? 0) > 0 && !isSaving;

  const handleDelete = (): void => {
    onDelete(entry);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.inkMuted }]} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={
                reduced
                  ? undefined
                  : FadeInUp.duration(280)
                      .delay(40)
                      .easing(Easing.out(Easing.cubic))
              }
            >
              {/* ── Project breadcrumb ── */}
              {project ? (
                <ProjectBreadcrumb emoji={project.emoji} title={project.title} />
              ) : null}

              {/* ── Header: type + status ── */}
              <DetailHeaderRow
                type={type}
                accent={accent}
                urgency={urgency}
                statusLabel={STATUS_LABELS[entry.status].toUpperCase()}
                statusColor={statColor}
              />

              {/* ── Identity ── */}
              {editing ? (
                <TextInput
                  value={draft.title}
                  onChangeText={(t) => patchDraft({ title: t })}
                  placeholder="Title"
                  placeholderTextColor={colors.inkMuted}
                  style={[
                    styles.titleInput,
                    {
                      color: colors.ink,
                      borderBottomColor: colors.surfaceSubtle,
                    },
                  ]}
                  multiline
                  autoFocus
                />
              ) : (
                <ThemedText
                  type="title"
                  style={[
                    styles.title,
                    {
                      color: colors.ink,
                      textDecorationLine: done ? "line-through" : "none",
                    },
                  ]}
                >
                  {entry.title}
                </ThemedText>
              )}

              {!editing && entry.subtitle ? (
                <ThemedText type="body" muted style={styles.subtitle}>
                  {entry.subtitle}
                </ThemedText>
              ) : null}

              {!editing && narrativeFor(entry) ? (
                <ThemedText type="mono" muted style={styles.narrative}>
                  {narrativeFor(entry)}
                </ThemedText>
              ) : null}

              {/* ── Divider ── */}
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.surfaceSubtle },
                ]}
              />

              {editing ? (
                <DetailEditForm
                  draft={draft}
                  patchDraft={patchDraft}
                  type={type}
                  isDeadlineType={isDeadlineType}
                  accent={accent}
                  reduced={reduced}
                />
              ) : (
                <DetailViewMeta
                  entry={entry}
                  accent={accent}
                  charged={charged}
                  whenText={whenValue(entry)}
                  recurrenceText={
                    entry.recurrence_rule ? recurrenceValue(entry) : null
                  }
                  done={done}
                  doneLabel={doneLabel(type)}
                  reduced={reduced}
                  onDelete={handleDelete}
                  onEdit={handleStartEdit}
                  onMarkDone={handleMarkDone}
                />
              )}

              {/* ── Subtasks ── */}
              {/* Todo and deadline only. An idea that grows a checklist is a
                  project — `promoteIdeaToProject` is the path for that, and the
                  data layer's `isTaskable` guard rejects the write anyway. */}
              {isTaskable(type) ? (
                <TaskChecklist
                  entryId={entry.id}
                  accent={accent}
                  editing={editing}
                />
              ) : null}

              {/* ── Actions ── */}
              {editing ? (
                <View style={styles.actions}>
                  <Pressable
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <ThemedText type="bodyBold" muted>
                      Cancel
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveEdit}
                    disabled={!canSaveEdit}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: accent + "22",
                        opacity: !canSaveEdit ? 0.5 : pressed ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Save"
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={accent}
                    />
                    <ThemedText type="bodyBold" style={{ color: accent }}>
                      {isSaving ? "Saving…" : "Save"}
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.scrim.strong,
  },
  sheet: {
    borderTopLeftRadius: tokens.radius.lg + 10,
    borderTopRightRadius: tokens.radius.lg + 10,
    maxHeight: "92%",
    paddingBottom: tokens.space.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.lg,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
  },

  // ── Identity ──
  title: {
    marginBottom: tokens.space.xs,
  },
  subtitle: {},
  narrative: {
    marginTop: tokens.space.xs,
  },
  titleInput: {
    marginBottom: tokens.space.xs,
    fontFamily: tokens.type.fontInter.bold,
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    paddingVertical: tokens.space.xs,
    borderBottomWidth: 1,
  },

  // ── Divider ──
  divider: {
    height: 1,
    marginTop: tokens.space.md,
    marginBottom: tokens.space.md,
  },

  // ── Actions ──
  actions: {
    flexDirection: "row",
    gap: tokens.space.sm,
    marginTop: tokens.space.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
    minHeight: 44,
    borderRadius: tokens.radius.md,
  },
});
