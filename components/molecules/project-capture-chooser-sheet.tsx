import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

/**
 * The "what is it?" sheet shown when the project hero's pen is tapped.
 *
 * Three rows, each a type code. Tap → onPick fires and the parent opens the
 * matching composer (todo / deadline / idea). Notes are intentionally absent
 * here because the NOTES margin already owns the + write a note verb.
 *
 * Matches the visual grammar of ProjectOverflowSheet / IdeaActionSheet /
 * ProjectPullInSheet: paper scrim, surface sheet, dividers, dots-on-the-row
 * (since each row represents an entry type, the EntryDot is honest signal).
 */
export function ProjectCaptureChooserSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (type: "todo" | "deadline" | "idea") => void;
}): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          <ThemedText
            type="label"
            style={[styles.title, { color: colors.inkMuted }]}
          >
            ADD TO THIS PROJECT
          </ThemedText>

          <Row
            type="todo"
            label="To-do"
            hint="something to do"
            colors={colors}
            onPress={() => onPick("todo")}
          />
          <Divider colors={colors} />
          <Row
            type="deadline"
            label="Deadline"
            hint="something due by a date or window"
            colors={colors}
            onPress={() => onPick("deadline")}
          />
          <Divider colors={colors} />
          <Row
            type="idea"
            label="Idea"
            hint="something to keep, not act on"
            colors={colors}
            onPress={() => onPick("idea")}
          />
          <Divider colors={colors} />
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.cancelRow, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={colors.inkMuted}
            />
            <ThemedText type="body" muted style={{ flex: 1 }}>
              Cancel
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  type,
  label,
  hint,
  onPress,
  colors,
}: {
  type: EntryType;
  label: string;
  hint: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${hint}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <EntryDot type={type} />
      <View style={styles.rowCopy}>
        <ThemedText type="body" style={{ color: colors.ink }}>
          {label}
        </ThemedText>
        <ThemedText type="caption" style={{ color: colors.inkMuted }}>
          {hint}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function Divider({
  colors,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
}): React.ReactElement {
  return (
    <View
      style={[styles.divider, { backgroundColor: colors.surfaceSubtle }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
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
  title: {
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
    letterSpacing: 0.6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
    minHeight: 60,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  cancelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
    minHeight: 48,
  },
  divider: {
    height: 1,
    marginHorizontal: tokens.space.lg,
  },
  pressed: { opacity: 0.7 },
});
