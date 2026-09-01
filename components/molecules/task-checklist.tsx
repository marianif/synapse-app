import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { TaskRow } from "@/components/molecules/task-row";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { ConfirmKey } from "@/lib/settings";

interface TaskChecklistProps {
  /** The owning todo or deadline. Ideas never render this — see `isTaskable`. */
  entryId: string;
  /** The parent's type shade; the open checkbox and the counter borrow it. */
  accent: string;
  /** Render progress and task labels without any mutation controls. */
  readOnly?: boolean;
  /** Keep completion toggles active while hiding task editing controls. */
  toggleOnly?: boolean;
  /** Exposes a `close()` so a host screen can dismiss the open swipe row on
   *  outside interaction (scrolling the editor, tapping elsewhere). */
  swipeController?: React.MutableRefObject<{ close: () => void } | null>;
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
  readOnly = false,
  toggleOnly = false,
  swipeController,
}: TaskChecklistProps): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const { tasks, createTask, setTaskDone, updateTaskTitle, deleteTask } =
    useDatabase();

  const [drafting, setDrafting] = useState("");
  const [editing, setEditing] = useState(false);
  // Per-row inline editing: the id of the task whose title the user tapped.
  // Tapping a row opens it directly; the pencil pill still offers bulk mode.
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Only one row is swiped open at a time. Track the open row's close handle
  // so any other interaction — another row, the composer, the header, or the
  // host screen scrolling — dismisses it back to its resting state.
  const openRowCloseRef = useRef<(() => void) | null>(null);
  const closeOpenRow = useCallback((): void => {
    openRowCloseRef.current?.();
    openRowCloseRef.current = null;
  }, []);
  const handleSwipeOpen = useCallback((close: () => void): void => {
    // Reopening the already-tracked row is a no-op: its stale close handle
    // would otherwise close the row that just opened (swipe → swipe-back →
    // swipe-again flashes the delete action and snaps shut).
    if (openRowCloseRef.current === close) return;
    // A stale close (row already closed) is a harmless no-op, so opening a new
    // row can simply close whatever was open and take its place.
    openRowCloseRef.current?.();
    openRowCloseRef.current = close;
  }, []);

  // Hand the close handle to the host screen (e.g. scroll-to-dismiss).
  useEffect(() => {
    if (swipeController) swipeController.current = { close: closeOpenRow };
    return () => {
      if (swipeController) swipeController.current = null;
    };
  }, [swipeController, closeOpenRow]);

  // `tasks` is the flat store of every entry's subtasks. Open subtasks sit on
  // top so the unfinished work reads first; done lines sink to the bottom, with
  // position order preserved inside each group so completing a task moves just
  // that line, not its peers.
  const mine = tasks
    .filter((t) => t.entry_id === entryId)
    .sort((a, b) =>
      a.done === b.done ? a.position - b.position : a.done - b.done,
    );
  const doneCount = mine.filter((t) => t.done === 1).length;

  // Deleting is a swipe on the row — the same gesture the feeds use. Read-only
  // and toggle-only renders keep rows gesture-free.
  const canSwipeDelete = !readOnly && !toggleOnly;

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
      <View style={styles.head} onTouchStart={closeOpenRow}>
        <View style={styles.headLeft}>
          <ThemedText type="micro" muted style={styles.kicker}>
            Tasks
          </ThemedText>
          {mine.length > 0 && !readOnly ? (
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
                <IconSymbol
                  name={editing ? "Check" : "Edit2"}
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
        {mine.map((task) => {
          const row = (
            <TaskRow
              key={task.id}
              task={task}
              accent={accent}
              editing={!readOnly && (editing || editingId === task.id)}
              autoFocus={!readOnly && editingId === task.id}
              onEndEdit={() =>
                setEditingId((current) =>
                  current === task.id ? null : current,
                )
              }
              readOnly={readOnly}
              toggleOnly={toggleOnly}
              onPressTitle={() => {
                if (readOnly) return;
                closeOpenRow();
                setEditingId(task.id);
              }}
              onToggle={() => {
                closeOpenRow();
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
            />
          );
          if (!canSwipeDelete) return row;
          return (
            <SwipeableRow
              key={task.id}
              onDelete={() => {
                void deleteTask(task.id).catch((error: unknown) => {
                  console.error("[task-checklist] delete failed:", error);
                });
              }}
              confirmKey={ConfirmKey.deleteTask}
              confirmKicker="DELETE TASK"
              confirmMessage="Removes this line from the checklist."
              onSwipeOpen={handleSwipeOpen}
            >
              {row}
            </SwipeableRow>
          );
        })}
      </Animated.View>

      {!readOnly ? (
        <View style={styles.row}>
          <View style={styles.check}>
            <IconSymbol name="Add2" size={18} color={colors.inkMuted} />
          </View>
          <TextInput
            ref={inputRef}
            value={drafting}
            onChangeText={setDrafting}
            onFocus={closeOpenRow}
            onSubmitEditing={handleAdd}
            placeholder={mine.length ? "Add another" : "Add a task"}
            placeholderTextColor={colors.inkMuted}
            submitBehavior="submit"
            returnKeyType="next"
            style={[styles.input, { color: colors.ink }]}
            accessibilityLabel="Add a task"
          />
        </View>
      ) : null}
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
  input: {
    flex: 1,
    paddingVertical: tokens.space.sm,
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.lineHeight,
  },
  pressed: {
    opacity: 0.6,
  },
});
