import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

import type { DbTask } from "@/lib/types";

interface TaskRowProps {
  task: DbTask;
  accent: string;
  editing: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  /** Tap the resting title to open this row for inline editing. */
  onPressTitle: () => void;
  /** Focus the rename input the moment it mounts (the tapped row). */
  autoFocus: boolean;
  /** Called when the rename input ends (blur or submit) — lets the parent
   *  close the per-row editor, guarded so a row hopping away isn't reclosed. */
  onEndEdit: () => void;
  readOnly: boolean;
  toggleOnly: boolean;
}

/**
 * A single subtask row: a completion circle, a title that taps into an inline
 * rename input, and a delete affordance that appears while editing. The parent
 * (`TaskChecklist`) owns all state and persistence — this row is a leaf that
 * renders one task and reports gestures back.
 */
export function TaskRow({
  task,
  accent,
  editing,
  onToggle,
  onRename,
  onDelete,
  onPressTitle,
  autoFocus,
  onEndEdit,
  readOnly,
  toggleOnly,
}: TaskRowProps): React.ReactElement {
  const { colors } = useTheme();
  const done = task.done === 1;
  const canToggle = !readOnly || toggleOnly;

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
      {canToggle ? (
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
            color={done ? tokens.feedback.success : accent}
          />
        </Pressable>
      ) : (
        <View
          style={styles.check}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={task.title}
        >
          <MaterialCommunityIcons
            name={done ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
            size={20}
            color={done ? tokens.feedback.success : accent}
          />
        </View>
      )}

      {editing && !readOnly ? (
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={() => {
            commit();
            onEndEdit();
          }}
          onSubmitEditing={() => {
            commit();
            onEndEdit();
          }}
          autoFocus={autoFocus}
          returnKeyType="done"
          style={[styles.input, { color: colors.ink }]}
          accessibilityLabel={`Rename ${task.title}`}
        />
      ) : readOnly ? (
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
      ) : (
        // Tap the resting title to open this row for inline editing — the
        // rename input and delete affordance take over the row until blur.
        <Pressable
          onPress={onPressTitle}
          style={styles.titleButton}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${task.title}`}
        >
          <ThemedText
            type="item"
            muted={done}
            numberOfLines={2}
            style={[
              styles.titleButtonText,
              done && { textDecorationLine: "line-through" },
            ]}
          >
            {task.title}
          </ThemedText>
        </Pressable>
      )}

      {editing && !readOnly ? (
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

const styles = StyleSheet.create({
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
  // Tap target for the resting title — stretches the full row height so the
  // whole title band is pressable, not just the glyphs. The inner text does
  // NOT flex: it must stay content-height so the button can center it on the
  // circle's vertical midline.
  titleButton: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  titleButtonText: {},
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