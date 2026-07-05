import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import {
  daysUntil,
  isDone,
  isWhenCharged,
  whenLabel,
} from "@/lib/direct-when";
import { horizonReadout } from "@/lib/horizons";
import { humanizeRule } from "@/lib/recurrence";

import type { DbEntry, DbProject, EntryType } from "@/lib/types";

interface DirectDetailSheetProps {
  entry: DbEntry | null;
  project: DbProject | null;
  visible: boolean;
  onClose: () => void;
  onMarkDone: (entry: DbEntry) => void;
  onDelete: (entry: DbEntry) => void;
  onEdit: (entry: DbEntry) => void;
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
    if (days < 0) return { text: `Over by ${Math.abs(days)}d`, color: tokens.feedback.danger };
    if (days === 0) return { text: "Today", color: tokens.feedback.warning };
    return { text: `${days}d left`, color: typeShade };
  }

  return null;
}

function statusColor(status: DbEntry["status"]): string | null {
  if (status === "overdue") return tokens.feedback.danger;
  if (status === "completed" || status === "met") return tokens.feedback.success;
  return null;
}

export function DirectDetailSheet({
  entry,
  project,
  visible,
  onClose,
  onMarkDone,
  onDelete,
  onEdit,
}: DirectDetailSheetProps): React.ReactElement | null {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();

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

  const handleEdit = (): void => {
    onEdit(entry);
    onClose();
  };

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
                <View style={styles.breadcrumb}>
                  <MaterialCommunityIcons
                    name="folder-outline"
                    size={13}
                    color={colors.inkMuted}
                  />
                  <ThemedText type="micro" muted numberOfLines={1} style={styles.breadcrumbText}>
                    {project.emoji ? `${project.emoji} ${project.title}` : project.title}
                  </ThemedText>
                </View>
              ) : null}

              {/* ── Header: type + status ── */}
              <View style={styles.header}>
                <EntryDot type={type} size={8} />
                <ThemedText type="label" style={{ color: accent }}>
                  {type}
                </ThemedText>

                {urgency ? (
                  <View style={[styles.chip, { backgroundColor: urgency.color + "18" }]}>
                    <ThemedText type="micro" style={{ color: urgency.color }}>
                      {urgency.text}
                    </ThemedText>
                  </View>
                ) : null}

                {statColor ? (
                  <ThemedText type="micro" style={{ color: statColor }}>
                    {STATUS_LABELS[entry.status].toUpperCase()}
                  </ThemedText>
                ) : (
                  <ThemedText type="micro" muted>
                    {STATUS_LABELS[entry.status].toUpperCase()}
                  </ThemedText>
                )}
              </View>

              {/* ── Identity ── */}
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

              {entry.subtitle ? (
                <ThemedText type="body" muted style={styles.subtitle}>
                  {entry.subtitle}
                </ThemedText>
              ) : null}

              {narrativeFor(entry) ? (
                <ThemedText type="mono" muted style={styles.narrative}>
                  {narrativeFor(entry)}
                </ThemedText>
              ) : null}

              {/* ── Divider ── */}
              <View style={[styles.divider, { backgroundColor: colors.surfaceSubtle }]} />

              {/* ── Temporal metadata ── */}
              <View style={styles.meta}>
                <View style={styles.metaRow}>
                  <ThemedText type="micro" muted style={styles.metaLabel}>
                    WHEN
                  </ThemedText>
                  <ThemedText
                    type="mono"
                    style={[styles.metaValue, charged && { color: tokens.feedback.danger }]}
                  >
                    {whenValue(entry)}
                  </ThemedText>
                </View>

                {entry.recurrence_rule ? (
                  <View style={styles.metaRow}>
                    <ThemedText type="micro" muted style={styles.metaLabel}>
                      REPEATS
                    </ThemedText>
                    <ThemedText type="mono" style={styles.metaValue}>
                      {recurrenceValue(entry)}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {/* ── Notes ── */}
              {entry.inspiration ? (
                <View style={[styles.noteBlock, { backgroundColor: colors.surfaceSubtle }]}>
                  <ThemedText type="micro" muted>
                    INSPIRATION
                  </ThemedText>
                  <ThemedText type="body" style={{ color: colors.ink }}>
                    {entry.inspiration}
                  </ThemedText>
                </View>
              ) : null}

              {entry.notes ? (
                <View style={[styles.noteBlock, { backgroundColor: colors.surfaceSubtle }]}>
                  <ThemedText type="micro" muted>
                    NOTES
                  </ThemedText>
                  <ThemedText type="body" style={{ color: colors.ink }}>
                    {entry.notes}
                  </ThemedText>
                </View>
              ) : null}

              {/* ── Actions ── */}
              <View style={styles.actions}>
                {!done ? (
                  <Pressable
                    onPress={handleMarkDone}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.7 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={doneLabel(type)}
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={tokens.feedback.success}
                    />
                    <ThemedText type="bodyBold" style={{ color: tokens.feedback.success }}>
                      {doneLabel(type)}
                    </ThemedText>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={handleEdit}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit"
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={16}
                    color={colors.inkMuted}
                  />
                  <ThemedText type="bodyBold" muted>
                    Edit
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={16}
                    color={tokens.feedback.danger}
                  />
                  <ThemedText type="bodyBold" style={{ color: tokens.feedback.danger }}>
                    Delete
                  </ThemedText>
                </Pressable>
              </View>
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

  // ── Breadcrumb ──
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    marginBottom: tokens.space.md,
  },
  breadcrumbText: {
    flexShrink: 1,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  chip: {
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  // ── Identity ──
  title: {
    marginBottom: tokens.space.xs,
  },
  subtitle: {},
  narrative: {
    marginTop: tokens.space.xs,
  },

  // ── Divider ──
  divider: {
    height: 1,
    marginTop: tokens.space.md,
    marginBottom: tokens.space.md,
  },

  // ── Metadata ──
  meta: {
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.sm,
  },
  metaLabel: {
    width: 64,
  },
  metaValue: {
    flex: 1,
  },

  // ── Notes ──
  noteBlock: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.xs,
    marginTop: tokens.space.sm,
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
