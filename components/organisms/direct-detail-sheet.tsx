import { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ProjectBreadcrumb } from "@/components/atoms/project-breadcrumb";
import { ThemedText } from "@/components/atoms/themed-text";
import { DetailHeaderRow } from "@/components/molecules/detail-header-row";
import {
  DetailViewMeta,
  type WhenDraft,
} from "@/components/molecules/detail-view-meta";
import { TaskChecklist } from "@/components/molecules/task-checklist";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { daysUntil, isDone, isWhenCharged, whenLabel } from "@/lib/direct-when";
import { horizonEndDate, horizonReadout } from "@/lib/horizons";
import { humanizeRule, parseRule } from "@/lib/recurrence";
import { isTaskable } from "@/lib/types";
import { useUIStore } from "@/stores/ui-store";

import type {
  DbEntry,
  DbProject,
  EntryType,
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

function whenDraftFromEntry(entry: DbEntry): WhenDraft {
  const isDeadline = entry.type === "deadline";
  const rule =
    typeof entry.recurrence_rule === "string"
      ? parseRule(entry.recurrence_rule)
      : (entry.recurrence_rule as RecurrenceRule | null);
  return {
    date: (isDeadline ? entry.due_date : entry.scheduled_date) ?? "",
    time: (isDeadline ? entry.due_time : entry.scheduled_time) ?? "",
    dueRange: entry.due_range,
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

// Only surfaces a narrative line when it adds information the header chip and
// the WHEN row don't already carry — both of those already read off the same
// `daysUntil` count, so restating "due in N days" here is pure repetition.
// This line exists for the two things that live nowhere else: a settled
// entry's closure, and a stale idea's age.
function narrativeFor(entry: DbEntry): string | null {
  if (isDone(entry)) return "Settled";

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
    // days === 0 is skipped here — the WHEN row already reads "Today" in the
    // same danger color, so a chip saying the same word would just repeat it.
    if (days > 0) return { text: `${days}d left`, color: typeShade };
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
  const setCaptureDockVisible = useUIStore((s) => s.setCaptureDockVisible);

  // One edit toggle drives title + when together — a single pencil (on the
  // title) opens both, a single check commits both. Per-field edit toggles
  // read as two separate controls doing the same job; the sheet has exactly
  // one editable identity (what it is + when it's due), not two.
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [whenDraft, setWhenDraft] = useState<WhenDraft | null>(null);

  // The sheet itself rides up over the keyboard by the same amount as its
  // height, matching CaptureDock's own listener pattern: iOS reports
  // willShow/willHide with a duration we can match; Android only fires
  // didShow/didHide, so we fall back to a quick eased timing.
  const keyboardLift = useSharedValue(0);

  // Leaving the sheet (close, or the selected entry swaps under it) always
  // drops any in-flight edit — reopening starts fresh in view mode.
  useEffect(() => {
    if (!visible) {
      setEditing(false);
      keyboardLift.value = 0;
    }
  }, [visible, keyboardLift]);
  useEffect(() => {
    setEditing(false);
  }, [entry?.id]);

  // The sheet's own inline title/when edit opens the keyboard directly over
  // this Modal. The always-on capture dock lives at the tab-layout level and
  // has no idea a different keyboard flow is active — left mounted, it lifts
  // itself alongside the sheet's keyboard and visually stacks on top of it
  // (see screenshot: "Put something in" floating over the edit fields). Hide
  // it for the sheet's entire lifetime, not just while a field is mid-edit,
  // since the sheet's own scroll + inline inputs already cover that need.
  useEffect(() => {
    setCaptureDockVisible(!visible);
    return () => setCaptureDockVisible(true);
  }, [visible, setCaptureDockVisible]);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      keyboardLift.value = withTiming(e.endCoordinates.height, {
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
  }, [keyboardLift]);

  // Growing the sheet's own height (via marginBottom) rather than
  // translateY — a translate would carry the sheet's top edge off past the
  // safe area on a small screen; shrinking the margin instead lets the sheet
  // grow upward exactly by the keyboard's height and never over-travels.
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: keyboardLift.value,
  }));

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
  const isTodoType = type === "todo";

  const handleMarkDone = (): void => {
    onMarkDone(entry);
    onClose();
  };

  const handleDelete = (): void => {
    onDelete(entry);
    onClose();
  };

  const handleStartEdit = (): void => {
    setTitleDraft(entry.title);
    setWhenDraft(whenDraftFromEntry(entry));
    setEditing(true);
  };

  const handleCommitEdit = (): void => {
    const draft = whenDraft;
    setEditing(false);

    const trimmedTitle = titleDraft.trim();
    if (trimmedTitle && trimmedTitle !== entry.title) {
      updateEntry(entry.id, { title: trimmedTitle }).catch((error: unknown) => {
        console.error("[direct-detail-sheet] title save failed:", error);
      });
    }

    if (!draft) return;

    const horizon = isDeadlineType ? draft.dueRange : null;
    const recurrenceRule: RecurrenceRule | null = draft.recurrenceFreq
      ? {
          freq: draft.recurrenceFreq,
          days:
            draft.recurrenceFreq === "weekly" ? draft.recurrenceDays : undefined,
        }
      : null;

    updateEntry(entry.id, {
      scheduledDate: isDeadlineType ? null : draft.date.trim() || null,
      scheduledTime: isDeadlineType ? null : draft.time.trim() || null,
      dueDate: isDeadlineType
        ? horizon
          ? horizonEndDate(horizon)
          : draft.date.trim() || null
        : null,
      dueTime: isDeadlineType && !horizon ? draft.time.trim() || null : null,
      dueRange: horizon,
      recurrenceRule,
      recurrenceEndDate: draft.recurrenceEndDate.trim() || null,
    }).catch((error: unknown) => {
      console.error("[direct-detail-sheet] when save failed:", error);
    });
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

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface },
            sheetAnimatedStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.inkMuted }]} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                <ProjectBreadcrumb
                  emoji={project.emoji}
                  title={project.title}
                />
              ) : null}

              {/* ── Header: type + status ── */}
              <DetailHeaderRow
                type={type}
                accent={accent}
                urgency={urgency}
                statusLabel={STATUS_LABELS[entry.status].toUpperCase()}
                statusColor={statColor}
              />

              {!editing && narrativeFor(entry) ? (
                <ThemedText type="mono" muted style={styles.narrative}>
                  {narrativeFor(entry)}
                </ThemedText>
              ) : null}

              {/* ── Identity + WHEN — one pencil (on the title) opens both ── */}
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
                editing={editing}
                onStartEdit={handleStartEdit}
                titleDraft={titleDraft}
                onTitleDraftChange={setTitleDraft}
                whenDraft={whenDraft ?? whenDraftFromEntry(entry)}
                onWhenDraftChange={(patch) =>
                  setWhenDraft((d) => (d ? { ...d, ...patch } : d))
                }
                onCommitEdit={handleCommitEdit}
                isDeadlineType={isDeadlineType}
                isTodoType={isTodoType}
                onDelete={handleDelete}
                onMarkDone={handleMarkDone}
              />

              {/* ── Subtasks ── */}
              {/* Todo and deadline only. An idea that grows a checklist is a
                  project — `promoteIdeaToProject` is the path for that, and the
                  data layer's `isTaskable` guard rejects the write anyway. */}
              {isTaskable(type) ? (
                <TaskChecklist entryId={entry.id} accent={accent} />
              ) : null}
            </Animated.View>
          </ScrollView>
        </Animated.View>
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
  narrative: {
    marginBottom: tokens.space.sm,
  },
});
