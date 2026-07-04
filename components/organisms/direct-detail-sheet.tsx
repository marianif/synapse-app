import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import {
  entryColor,
  tokens,
  useEntryKicker,
  useEntryTint,
  useTheme,
} from "@/constants/theme";
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
  /** The entry to inspect. Null when the sheet is closed. */
  entry: DbEntry | null;
  /** Owning project, or null for unfiled. */
  project: DbProject | null;
  visible: boolean;
  onClose: () => void;
  onMarkDone: (entry: DbEntry) => void;
  onDelete: (entry: DbEntry) => void;
  onEdit: (entry: DbEntry) => void;
}

const STATUS_LABELS: Record<DbEntry["status"], string> = {
  scheduled: "SCHEDULED",
  active: "ACTIVE",
  completed: "DONE",
  pending: "PENDING",
  met: "MET",
  overdue: "OVERDUE",
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

function projectValue(project: DbProject | null): string {
  if (!project) return "Unfiled";
  return project.emoji ? `${project.emoji} ${project.title}` : project.title;
}

/**
 * Field Card detail sheet — the consequence zone's read-out.
 *
 * A bottom sheet that turns a direct-row tap into a glanceable instrument
 * readout: type-tinted header, mono metadata compartments, narrative margin
 * note, and quick actions. No page navigation; the user reads it and returns
 * to the field in one tap.
 */
export function DirectDetailSheet({
  entry,
  project,
  visible,
  onClose,
  onMarkDone,
  onDelete,
  onEdit,
}: DirectDetailSheetProps): React.ReactElement | null {
  const { colors } = useTheme();
  const tint = useEntryTint(entry?.type ?? "todo");
  const kickerColor = useEntryKicker(entry?.type ?? "todo");

  if (!entry) return null;

  const type = entry.type;
  const done = isDone(entry);
  const accent = entryColor(type);
  const when = whenValue(entry);
  const whenCharged = !done && isWhenCharged(daysUntil(entry.due_date ?? entry.scheduled_date ?? null));
  const narrative = narrativeFor(entry);

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
            {/* ── Header block ── type tint, kicker, title, narrative note */}
            <View style={[styles.header, { backgroundColor: tint }]}>
              <View style={styles.headerRow}>
                <EntryDot type={type} size={8} />
                <ThemedText
                  type="micro"
                  style={[styles.kicker, { color: kickerColor }]}
                >
                  {type}
                </ThemedText>
              </View>

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

              {narrative ? (
                <ThemedText
                  type="hand"
                  style={[styles.narrative, { color: kickerColor }]}
                >
                  {narrative}
                </ThemedText>
              ) : null}
            </View>

            {/* ── Metadata bento ── */}
            <View style={styles.grid}>
              <View style={styles.gridRow}>
                <MetadataCell
                  label="WHEN"
                  value={when}
                  valueColor={whenCharged ? accent : colors.ink}
                />
                <MetadataCell label="PROJECT" value={projectValue(project)} />
              </View>

              <View style={styles.gridRow}>
                <MetadataCell
                  label="STATUS"
                  value={STATUS_LABELS[entry.status]}
                  valueColor={
                    done
                      ? tokens.feedback.success
                      : entry.status === "overdue"
                        ? tokens.feedback.danger
                        : colors.ink
                  }
                />
                <MetadataCell
                  label="REPEATS"
                  value={recurrenceValue(entry)}
                />
              </View>
            </View>

            {/* ── Subtitle ── */}
            {entry.subtitle ? (
              <InfoBlock label="SUBTITLE" value={entry.subtitle} />
            ) : null}

            {/* ── Inspiration ── ideas only */}
            {entry.inspiration ? (
              <InfoBlock label="INSPIRATION" value={entry.inspiration} />
            ) : null}

            {/* ── Notes ── */}
            {entry.notes ? (
              <InfoBlock label="NOTES" value={entry.notes} />
            ) : null}

            {/* ── Actions ── */}
            <View style={styles.actions}>
              <View style={styles.actionRow}>
                {!done ? (
                  <Pressable
                    onPress={handleMarkDone}
                    style={({ pressed }) => [
                      styles.doneButton,
                      {
                        backgroundColor: tokens.feedback.success,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={doneLabel(type)}
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={tokens.color.dark.paper}
                    />
                    <ThemedText
                      type="bodyBold"
                      style={{ color: tokens.color.dark.paper }}
                    >
                      {doneLabel(type)}
                    </ThemedText>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={handleEdit}
                  style={({ pressed }) => [
                    styles.editButton,
                    {
                      backgroundColor: colors.accent.clay,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit"
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={18}
                    color={colors.accent.onClay}
                  />
                  <ThemedText
                    type="bodyBold"
                    style={{ color: colors.accent.onClay }}
                  >
                    Edit
                  </ThemedText>
                </Pressable>
              </View>

              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete"
              >
                <ThemedText
                  type="body"
                  style={{ color: tokens.feedback.danger }}
                >
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MetadataCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.cell, { backgroundColor: colors.surfaceSubtle }]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        {label}
      </ThemedText>
      <ThemedText
        type="mono"
        numberOfLines={2}
        style={{ color: valueColor ?? colors.ink }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: colors.surfaceSubtle }]}>
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        {label}
      </ThemedText>
      <ThemedText type="body" style={{ color: colors.ink }}>
        {value}
      </ThemedText>
    </View>
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
    borderTopLeftRadius: tokens.radius.lg + 8,
    borderTopRightRadius: tokens.radius.lg + 8,
    maxHeight: "88%",
    paddingBottom: tokens.space.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.md,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  header: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  kicker: {
    letterSpacing: tokens.type.kicker.tracking,
  },
  title: {
    letterSpacing: tokens.type.title.tracking,
  },
  narrative: {
    marginTop: tokens.space.xs,
  },
  grid: {
    gap: tokens.space.sm,
  },
  gridRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  cell: {
    flex: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.xs,
    minHeight: 72,
  },
  block: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
  actions: {
    gap: tokens.space.sm,
    paddingTop: tokens.space.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  doneButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
    minHeight: 48,
    borderRadius: tokens.radius.md,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
    minHeight: 48,
    borderRadius: tokens.radius.md,
  },
  deleteButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  deleteButtonPressed: {
    backgroundColor: tokens.color.dark.paper + "14",
  },
});
