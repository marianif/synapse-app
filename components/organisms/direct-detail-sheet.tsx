import { useRouter } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated";

import { ProjectBreadcrumb } from "@/components/atoms/project-breadcrumb";
import { ThemedText } from "@/components/atoms/themed-text";
import {
  DetailActionBar,
  type PrimaryAction,
} from "@/components/molecules/detail-action-bar";
import { DetailHeaderRow } from "@/components/molecules/detail-header-row";
import { DetailViewMeta } from "@/components/molecules/detail-view-meta";
import { TaskChecklist } from "@/components/molecules/task-checklist";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import { daysUntil, isDone, isWhenCharged, whenLabel } from "@/lib/direct-when";
import { horizonReadout } from "@/lib/horizons";
import { humanizeRule } from "@/lib/recurrence";
import { isTaskable } from "@/lib/types";

import type { DbEntry, DbProject } from "@/lib/types";

interface DirectDetailSheetProps {
  entry: DbEntry | null;
  project: DbProject | null;
  visible: boolean;
  onClose: () => void;
  onMarkDone: (entry: DbEntry) => void;
  onDelete: (entry: DbEntry) => void;
}

const STATUS_LABELS: Record<DbEntry["status"], string> = {
  scheduled: "Scheduled",
  active: "Active",
  completed: "Done",
  pending: "Pending",
  met: "Met",
  overdue: "Overdue",
};

function doneLabel(type: DbEntry["type"]): string {
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

// A pure glance-and-act surface. The body only reads; all identity, schedule,
// recurrence, and notes editing belongs to /edit.
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
  const router = useRouter();

  if (!entry) return null;

  const type = entry.type;
  const done = isDone(entry);
  const accent = entryKicker(type, scheme);
  const charged =
    !done &&
    isWhenCharged(daysUntil(entry.due_date ?? entry.scheduled_date ?? null));
  const urgency = urgencyTag(entry, accent);
  const statColor = statusColor(entry.status);

  const handleMarkDone = (): void => {
    onMarkDone(entry);
    onClose();
  };

  const handleDelete = (): void => {
    onDelete(entry);
    onClose();
  };

  const handleEdit = (): void => {
    onClose();
    router.push({ pathname: "/edit", params: { id: entry.id, entryType: type } });
  };

  const primary: PrimaryAction | undefined =
    !done && type !== "idea"
      ? {
          icon:
            type === "deadline"
              ? "check-decagram-outline"
              : "check-circle-outline",
          label: doneLabel(type),
          onPress: handleMarkDone,
          done,
        }
      : undefined;

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

              {narrativeFor(entry) ? (
                <ThemedText type="mono" muted style={styles.narrative}>
                  {narrativeFor(entry)}
                </ThemedText>
              ) : null}

              {/* ── Identity + WHEN glance, delete + mark-done ── */}
              <DetailViewMeta
                entry={entry}
                charged={charged}
                whenText={whenValue(entry)}
                recurrenceText={
                  entry.recurrence_rule ? recurrenceValue(entry) : null
                }
                done={done}
              />

              {/* ── Subtasks ── */}
              {/* Todo and deadline only. An idea that grows a checklist is a
                  project — `promoteIdeaToProject` is the path for that, and the
                  data layer's `isTaskable` guard rejects the write anyway. */}
              {isTaskable(type) ? (
                <TaskChecklist
                  entryId={entry.id}
                  accent={accent}
                  readOnly
                  toggleOnly
                />
              ) : null}

            </Animated.View>
          </ScrollView>

          <View style={styles.actions}>
            <DetailActionBar
              primary={primary}
              accentColor={accent}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </View>
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
  narrative: {
    marginBottom: tokens.space.sm,
  },
  actions: {
    marginTop: tokens.space.lg,
    paddingHorizontal: tokens.space.lg,
  },
});
