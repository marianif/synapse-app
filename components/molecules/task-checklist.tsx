import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { TaskRow } from "@/components/molecules/task-row";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { ConfirmKey } from "@/lib/settings";
import type { DbTask } from "@/lib/types";

interface TaskChecklistProps {
  /** The owning entry — any type (todo, deadline, idea) can own a checklist. */
  entryId: string;
  /** The parent's type shade; the open checkbox and the counter borrow it. */
  accent: string;
  /** Kicker label for the checklist — "Tasks" for todos/deadlines, "Steps"
   *  for ideas (a checklist on an idea is how it gets built, not chores). */
  label?: string;
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
 * counter, rows on tone, and an always-mounted composer at the top.
 *
 * The composer sits directly under the header and never hides behind a "+" —
 * for a capture-first user, an add affordance that costs a tap (or a scroll
 * past a long list) is the wrong trade. It re-focuses after every submit so a
 * burst of subtasks lands without touching the screen again, and each new line
 * prepends to the open list so it lands directly under the caret.
 *
 * Completed lines sink to the bottom and fold into a single quiet `3 done` row,
 * so the open work never drowns under a finished pile. The row's Clear action
 * is the one deliberate sweep — it deletes every done line in a confirmed
 * batch, the answer to a checklist that has grown too long.
 *
 * Completing every task deliberately does NOT complete the parent: closing an
 * entry stays the user's call. The counter is the entire progress surface — no
 * bar, no ring, no celebration (see DESIGN.md: no gamification).
 *
 * Rename is per-row (tap a title); delete is a swipe (tier-3, confirmed); both
 * stay off the default reading surface.
 */
export function TaskChecklist({
  entryId,
  accent,
  label = "Tasks",
  readOnly = false,
  toggleOnly = false,
  swipeController,
}: TaskChecklistProps): React.ReactElement {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const { tasks, createTask, setTaskDone, updateTaskTitle, deleteTask } =
    useDatabase();

  const [drafting, setDrafting] = useState("");
  // Per-row inline editing: the id of the task whose title the user tapped.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [confirmCopy, setConfirmCopy] = useState({
    kicker: "CLEAR DONE",
    message: "Removes the done lines from this checklist.",
  });
  const inputRef = useRef<TextInput>(null);

  const clearConfirm = useConfirm({ confirmKey: ConfirmKey.deleteTask });

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
  // top so the unfinished work reads first; done lines sink to the bottom and
  // fold away behind a single summary row. Position order is preserved inside
  // each group, and new lines prepend (min - 1), so the newest sits directly
  // under the composer.
  const mine = tasks
    .filter((t) => t.entry_id === entryId)
    .sort((a, b) =>
      a.done === b.done ? a.position - b.position : a.done - b.done,
    );
  const openTasks = mine.filter((t) => t.done === 0);
  const doneTasks = mine.filter((t) => t.done === 1);
  const doneCount = doneTasks.length;

  // Deleting is a swipe on the row — the same gesture the feeds use. Read-only
  // and toggle-only renders keep rows gesture-free.
  const canSwipeDelete = !readOnly && !toggleOnly;

  const commitDraft = (): void => {
    const title = drafting.trim();
    if (!title) return;
    setDrafting("");
    void createTask(entryId, title).catch((error: unknown) => {
      console.error("[task-checklist] create failed:", error);
    });
  };

  const handleAdd = (): void => {
    commitDraft();
    // Keep the caret alive so the next subtask needs no second tap.
    inputRef.current?.focus();
  };

  // A draft left in the composer when the field blurs (tapping elsewhere, or
  // dismissing the editor) must not be lost — same write as a submit.
  const handleComposerBlur = (): void => {
    commitDraft();
  };

  // Clear is the one batch write: every done line, confirmed once. Each delete
  // rides its own thunk (the store updates optimistically per line).
  const clearDone = (): void => {
    const ids = doneTasks.map((t) => t.id);
    if (ids.length === 0) return;
    setConfirmCopy({
      kicker: "CLEAR DONE",
      message:
        ids.length === 1
          ? "Removes the done line from this checklist."
          : `Removes ${ids.length} done lines from this checklist.`,
    });
    void clearConfirm.request(() => {
      for (const id of ids) {
        void deleteTask(id).catch((error: unknown) => {
          console.error("[task-checklist] delete failed:", error);
        });
      }
    });
  };

  const renderRow = (task: DbTask): React.ReactElement => {
    const row = (
      <TaskRow
        key={task.id}
        task={task}
        accent={accent}
        editing={!readOnly && editingId === task.id}
        autoFocus={!readOnly && editingId === task.id}
        onEndEdit={() =>
          setEditingId((current) => (current === task.id ? null : current))
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
          void setTaskDone(task.id, task.done === 0).catch((error: unknown) => {
            console.error("[task-checklist] toggle failed:", error);
          });
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
        confirmKicker={`DELETE ${label.toUpperCase()}`}
        confirmMessage="Removes this line from the checklist."
        onSwipeOpen={handleSwipeOpen}
      >
        {row}
      </SwipeableRow>
    );
  };

  return (
    <View style={styles.block}>
      <View style={styles.head} onTouchStart={closeOpenRow}>
        <ThemedText type="micro" muted style={styles.kicker}>
          {label}
        </ThemedText>
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
            : LinearTransition.duration(220).easing(
                Easing.bezier(0.22, 1, 0.36, 1),
              )
        }
      >
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
              onBlur={handleComposerBlur}
              onSubmitEditing={handleAdd}
              placeholder={
                mine.length ? "Add another" : `Add a ${label.toLowerCase()}`
              }
              placeholderTextColor={colors.inkMuted}
              submitBehavior="submit"
              returnKeyType="next"
              style={[styles.input, { color: colors.ink }]}
              accessibilityLabel={`Add a ${label.toLowerCase()}`}
            />
          </View>
        ) : null}

        {openTasks.map(renderRow)}

        {doneCount > 0 ? (
          <View style={styles.foldRow}>
            <Pressable
              onPress={() => setDoneExpanded((value) => !value)}
              style={({ pressed }) => [
                styles.foldToggle,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${doneCount} done ${label.toLowerCase()}, ${
                doneExpanded ? "expanded" : "collapsed"
              }`}
              accessibilityState={{ expanded: doneExpanded }}
            >
              <IconSymbol
                name={doneExpanded ? "ChevronUp" : "ChevronDown"}
                size={16}
                color={colors.inkMuted}
              />
              <ThemedText type="mono" muted>
                {doneCount} done
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={clearDone}
              hitSlop={8}
              style={({ pressed }) => [
                styles.clearBtn,
                { backgroundColor: colors.feedback.dangerTint[scheme] },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Clear done ${label.toLowerCase()}`}
            >
              <IconSymbol
                name="Trash"
                size={16}
                color={tokens.feedback.danger}
              />
            </Pressable>
          </View>
        ) : null}

        {doneExpanded ? doneTasks.map(renderRow) : null}
      </Animated.View>

      <ConfirmSheet
        visible={clearConfirm.visible}
        kicker={confirmCopy.kicker}
        message={confirmCopy.message}
        dontAsk={clearConfirm.dontAsk}
        onToggleDontAsk={clearConfirm.toggleDontAsk}
        onConfirm={clearConfirm.confirm}
        onCancel={clearConfirm.cancel}
      />
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
  // The done fold: one quiet summary row where completed lines collect. The
  // toggle owns the row's left; Clear sits quietly at its end.
  foldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  foldToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 48,
  },
  clearBtn: {
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
