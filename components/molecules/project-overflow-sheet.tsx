import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

/**
 * Project overflow menu — the sheet behind the header's `··` button.
 *
 * Verbs that change the project itself, not its fields. Each maps to a call
 * from the parent — this molecule is dumb about persistence, just renders +
 * delegates.
 *
 *   1. Delete project — destructive. The parent routes this through its
 *      ConfirmSheet first (same voice as the shelf's swipe-to-delete); the
 *      project's todos/ideas stay on the board, just unfiled.
 *
 * Sheet pattern matches IdeaActionSheet / ProjectPullInSheet: paper scrim,
 * surface sheet, dividers between rows, tap-outside dismisses.
 */
export function ProjectOverflowSheet({
  visible,
  title,
  onClose,
  onDelete,
}: {
  visible: boolean;
  /** The project's title — shows in the sheet header so the menu reads as
   *  belonging to this project even when the sheet covers the screen's title. */
  title: string;
  onClose: () => void;
  onDelete: () => void;
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
          <View style={styles.titleRow}>
            <ThemedText
              type="label"
              numberOfLines={1}
              style={[styles.title, { color: colors.inkMuted }]}
            >
              {title.toUpperCase()}
            </ThemedText>
          </View>

          <Row
            icon="Trash2"
            label="Delete project"
            color={colors.feedback.danger}
            onPress={() => {
              onDelete();
              onClose();
            }}
          />
          <Divider colors={colors} />
          <Row
            icon="CloseCircle2"
            label="Cancel"
            color={colors.inkMuted}
            onPress={onClose}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  label: string;
  color: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconSymbol name={icon} size={20} color={color} />
      <ThemedText type="body" style={[styles.rowLabel, { color }]}>
        {label}
      </ThemedText>
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
  titleRow: {
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
  },
  title: {
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
    minHeight: 48,
  },
  rowLabel: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: tokens.space.lg,
  },
  pressed: { opacity: 0.7 },
});