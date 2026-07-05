import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useEntryKicker, useTheme } from "@/constants/theme";

import type { DbEntry } from "@/lib/types";

/**
 * Idea actions — the long-press menu on an idea chip inside a project.
 *
 * Three verbs that change the idea's relationship to the project, not its
 * fields. Each maps to one DB call from the parent — this molecule is dumb
 * about persistence, just renders + delegates.
 *
 *   1. Make a todo from this — birth a sibling todo pre-filed under the
 *      project. The idea row stays put as provenance; the user gets a
 *      concrete action without losing the inspiration.
 *   2. Unfile from this project — clear `project_id`. The idea floats back
 *      to the pull-in pool, where this or any other project can claim it.
 *   3. Open — the plain-tap behavior; surfaced in the menu too so the
 *      long-press grammar feels complete (every menu has an "open").
 *
 * Sheet pattern matches ProjectOverflowSheet / ProjectPullInSheet: paper
 * scrim, surface sheet, dividers between rows, tap-outside dismisses.
 */
export function IdeaActionSheet({
  visible,
  idea,
  onClose,
  onMakeTodo,
  onUnfile,
  onOpen,
}: {
  visible: boolean;
  /** The idea the user long-pressed. Null when the sheet is closed. */
  idea: DbEntry | null;
  onClose: () => void;
  onMakeTodo: () => void;
  onUnfile: () => void;
  onOpen: () => void;
}): React.ReactElement | null {
  const { colors } = useTheme();
  const ideaAccent = useEntryKicker("idea");
  // Don't render the modal frame at all when there's no idea — saves a tree.
  if (!idea) return null;

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
            <View
              style={[
                styles.titleDot,
                { backgroundColor: ideaAccent },
              ]}
            />
            <ThemedText
              type="label"
              numberOfLines={2}
              style={[styles.title, { color: colors.inkMuted }]}
            >
              {idea.title.toUpperCase()}
            </ThemedText>
          </View>

          <Row
            icon="check-circle-outline"
            label="Make a todo from this"
            colors={colors}
            onPress={() => {
              onMakeTodo();
              onClose();
            }}
          />
          <Divider colors={colors} />
          <Row
            icon="folder-remove-outline"
            label="Unfile from this project"
            colors={colors}
            onPress={() => {
              onUnfile();
              onClose();
            }}
          />
          <Divider colors={colors} />
          <Row
            icon="arrow-top-right"
            label="Open"
            colors={colors}
            onPress={() => {
              onOpen();
              onClose();
            }}
          />
          <Divider colors={colors} />
          <Row
            icon="close"
            label="Cancel"
            colors={colors}
            tone="quiet"
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
  onPress,
  colors,
  tone = "default",
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
  tone?: "default" | "quiet";
}): React.ReactElement {
  const color = tone === "quiet" ? colors.inkMuted : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={color} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    flex: 1,
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
  rowLabel: { flex: 1 },
  divider: {
    height: 1,
    marginHorizontal: tokens.space.lg,
  },
  pressed: { opacity: 0.7 },
});
