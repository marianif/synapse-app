import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";

import type { DbTask } from "@/lib/types";

interface TaskChecklistProps {
  /** The owning todo or deadline. Ideas never render this — see `isTaskable`. */
  entryId: string;
  /** The parent's type shade; the open checkbox and the counter borrow it. */
  accent: string;
}

// ── Row ───────────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  accent,
  editing,
  onToggle,
  onRename,
  onDelete,
}: {
  task: DbTask;
  accent: string;
  editing: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const done = task.done === 1;

  // Local text state so each keystroke doesn't round-trip through SQLite; the
  // write happens on blur. Seeded from the row and never re-synced — the row is
  // the only thing that edits this title.
  const [text, setText] = useState(task.title);

  const commit = (): void => {
    const trimmed = text.trim();
    // An emptied title would leave an untappable ghost row. Snap back instead.
    if (!trimmed) {
      setText(task.title);
      return;
    }
    if (trimmed !== task.title) onRename(trimmed);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        style={styles.check}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={task.title}
      >
        <MaterialCommunityIcons
          name={done ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
          size={20}
          // Green is completion-only; an open box takes the parent's type shade.
          color={done ? tokens.feedback.success : accent}
        />
      </Pressable>

      {editing ? (
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          returnKeyType="done"
          style={[styles.input, { color: colors.ink }]}
          accessibilityLabel={`Rename ${task.title}`}
        />
      ) : (
        <ThemedText
          type="item"
          muted={done}
          numberOfLines={2}
          style={[
            styles.title,
            done && { textDecorationLine: "line-through" },
          ]}
        >
          {task.title}
        </ThemedText>
      )}

      {editing ? (
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={({ pressed }) => [styles.trash, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${task.title}`}
        >
          <MaterialCommunityIcons
            name="close"
            size={16}
            color={colors.inkMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Checklist ─────────────────────────────────────────────────────────────────

/**
 * The subtask checklist under a todo or a deadline. A kicker, a mono `2/5`
 * counter, rows on tone, and a always-mounted composer at the foot.
 *
 * The composer never hides behind a "+" — for a capture-first user, an add
 * affordance that costs a tap to reveal is the wrong trade. It re-focuses after
 * every submit so a burst of subtasks lands without touching the screen again.
 *
 * Completing every task deliberately does NOT complete the parent: closing an
 * entry stays the user's call. The counter is the entire progress surface — no
 * bar, no ring, no celebration (see DESIGN.md: no gamification).
 *
 * Owns its own edit toggle (a pencil beside the kicker) rather than taking one
 * from the parent sheet — rename/delete are per-task destructive actions
 * (ACTIONS.md tier 3) that stay off the default reading surface regardless of
 * whether the sheet's title/when are being edited.
 */
export function TaskChecklist({
  entryId,
  accent,
}: TaskChecklistProps): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const { tasks, createTask, setTaskDone, updateTaskTitle, deleteTask } =
    useDatabase();

  const [drafting, setDrafting] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // `tasks` is the flat store of every entry's subtasks; the DB hands them back
  // ordered by (entry_id, position), so filtering preserves the order.
  const mine = tasks.filter((t) => t.entry_id === entryId);
  const doneCount = mine.filter((t) => t.done === 1).length;

  const handleAdd = (): void => {
    const title = drafting.trim();
    if (!title) return;
    setDrafting("");
    void createTask(entryId, title).catch((error: unknown) => {
      console.error("[task-checklist] create failed:", error);
    });
    // Keep the caret alive so the next subtask needs no second tap.
    inputRef.current?.focus();
  };

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <ThemedText type="micro" muted style={styles.kicker}>
            Tasks
          </ThemedText>
          {mine.length > 0 ? (
            <Pressable
              onPress={() => setEditing((v) => !v)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.editPill,
                { backgroundColor: accent + (editing ? "22" : "18") },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={editing ? "Done editing tasks" : "Edit tasks"}
            >
              <MaterialCommunityIcons
                name={editing ? "check" : "pencil-outline"}
                size={13}
                color={accent}
              />
            </Pressable>
          ) : null}
        </View>
        {mine.length > 0 ? (
          <ThemedText
            type="mono"
            muted={doneCount < mine.length}
            style={
              doneCount === mine.length
                ? { color: tokens.feedback.success }
                : undefined
            }
            accessibilityLabel={`${doneCount} of ${mine.length} tasks done`}
          >
            {doneCount}/{mine.length}
          </ThemedText>
        ) : null}
      </View>

      <Animated.View
        layout={
          reduced
            ? undefined
            : LinearTransition.duration(220).easing(Easing.bezier(0.22, 1, 0.36, 1))
        }
      >
        {mine.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            accent={accent}
            editing={editing}
            onToggle={() => {
              void setTaskDone(task.id, task.done === 0).catch(
                (error: unknown) => {
                  console.error("[task-checklist] toggle failed:", error);
                },
              );
            }}
            onRename={(title) => {
              void updateTaskTitle(task.id, title).catch((error: unknown) => {
                console.error("[task-checklist] rename failed:", error);
              });
            }}
            onDelete={() => {
              void deleteTask(task.id).catch((error: unknown) => {
                console.error("[task-checklist] delete failed:", error);
              });
            }}
          />
        ))}
      </Animated.View>

      <View style={styles.row}>
        <View style={styles.check}>
          <MaterialCommunityIcons
            name="plus"
            size={18}
            color={colors.inkMuted}
          />
        </View>
        <TextInput
          ref={inputRef}
          value={drafting}
          onChangeText={setDrafting}
          onSubmitEditing={handleAdd}
          placeholder={mine.length ? "Add another" : "Add a task"}
          placeholderTextColor={colors.inkMuted}
          // `submitBehavior="submit"` keeps the keyboard up across submits, so a
          // burst of subtasks lands in one sitting. (RN 0.83 — replaces the
          // deprecated `blurOnSubmit={false}`.)
          submitBehavior="submit"
          returnKeyType="next"
          style={[styles.input, { color: colors.ink }]}
          accessibilityLabel="Add a task"
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  block: {
    marginTop: tokens.space.md,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.space.xs,
  },
  headLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  editPill: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    letterSpacing: tokens.type.micro.tracking,
  },
  // A row on tone: no fill, no border, no edge-bar. Spacing and the leading
  // glyph carry the structure. minHeight (never height) so it survives 2x type.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 48, // iOS 44pt / Android 48dp
  },
  check: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
  },
  input: {
    flex: 1,
    paddingVertical: tokens.space.sm,
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.lineHeight,
  },
  trash: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
