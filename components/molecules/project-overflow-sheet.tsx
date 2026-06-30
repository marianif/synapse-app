import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

import type { DbProject } from "@/lib/types";

/** Same quick-pick set used by the in-screen picker that this sheet replaces. */
const EMOJI_QUICK = [
  "🧠",
  "🎨",
  "🎭",
  "🪩",
  "🛠️",
  "🌿",
  "📚",
  "💼",
  "🎬",
  "🧪",
  "🪐",
  "✨",
];

type Mode = "menu" | "rename" | "emoji";

/**
 * Project overflow — the tier-3 settings sheet for one project.
 *
 * Collects every rare, shape-changing action under one affordance so the
 * project surface itself stays a working zone (capture, triage, pull-in)
 * rather than a settings page. Reached from `ScreenHeader`'s `··` glyph.
 *
 * Three modes inside one sheet:
 *   - menu — the default landing: Rename · Change emoji · Archive · Delete
 *   - rename — TextInput inline, Save commits via onRename
 *   - emoji — same quick-pick grid the hero used to host
 *
 * Switching modes never closes the sheet — the user can rename, then change
 * the emoji, then archive, all without dismissing. Tapping outside closes.
 */
export function ProjectOverflowSheet({
  visible,
  project,
  onClose,
  onRename,
  onChangeEmoji,
  onToggleArchive,
  onDelete,
  initialMode = "menu",
}: {
  visible: boolean;
  project: DbProject;
  onClose: () => void;
  onRename: (next: string) => void;
  onChangeEmoji: (next: string | null) => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  /**
   * Which pane the sheet lands on. The hero's emoji slot opens straight to
   * "emoji" so picking is a single tap; the header `··` overflow opens to
   * "menu" so all four verbs are visible.
   */
  initialMode?: Mode;
}): React.ReactElement {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [draft, setDraft] = useState(project.title);
  const emojiInputRef = useRef<TextInput>(null);

  // Reset mode + draft every time the sheet opens. Stale draft from a prior
  // cancelled rename would otherwise leak into the next session.
  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setDraft(project.title);
    }
  }, [visible, project.title, initialMode]);

  const close = (): void => {
    setMode("menu");
    onClose();
  };

  const archived = project.status === "archived";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable style={styles.overlay} onPress={close}>
        {/* Inner pressable swallows the tap so taps inside the sheet body
            don't close it. The outer one handles backdrop-tap-to-dismiss. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          {mode === "menu" ? (
            <View>
              <ThemedText
                type="label"
                style={[styles.title, { color: colors.inkMuted }]}
              >
                {project.title.toUpperCase()}
              </ThemedText>
              <Row
                icon="pencil-outline"
                label="Rename"
                colors={colors}
                onPress={() => setMode("rename")}
              />
              <Divider colors={colors} />
              <Row
                icon="emoticon-happy-outline"
                label={project.emoji ? "Change emoji" : "Pick an emoji"}
                colors={colors}
                onPress={() => setMode("emoji")}
              />
              <Divider colors={colors} />
              <Row
                icon={archived ? "archive-arrow-up-outline" : "archive-outline"}
                label={archived ? "Reactivate" : "Archive"}
                colors={colors}
                onPress={() => {
                  onToggleArchive();
                  close();
                }}
              />
              <Divider colors={colors} />
              <Row
                icon="trash-can-outline"
                label="Delete"
                colors={colors}
                tone="danger"
                onPress={() => {
                  // Let the parent's ConfirmSheet take over. Close ourselves
                  // first so two sheets don't stack visually.
                  close();
                  onDelete();
                }}
              />
              <Divider colors={colors} />
              <Row
                icon="close"
                label="Cancel"
                colors={colors}
                tone="quiet"
                onPress={close}
              />
            </View>
          ) : null}

          {mode === "rename" ? (
            <View style={styles.renameBlock}>
              <ThemedText
                type="label"
                style={[styles.title, { color: colors.inkMuted }]}
              >
                RENAME
              </ThemedText>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  const trimmed = draft.trim();
                  if (!trimmed || trimmed === project.title) {
                    setMode("menu");
                    return;
                  }
                  onRename(trimmed);
                  setMode("menu");
                }}
                placeholder="Project name"
                placeholderTextColor={colors.inkMuted}
                style={[
                  styles.renameInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.ink,
                  },
                ]}
                accessibilityLabel="Project name"
              />
              <View style={styles.renameActions}>
                <Pressable
                  onPress={() => setMode("menu")}
                  style={({ pressed }) => [
                    styles.renameCancel,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel rename"
                >
                  <ThemedText type="bodyBold" muted>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const trimmed = draft.trim();
                    if (!trimmed || trimmed === project.title) {
                      setMode("menu");
                      return;
                    }
                    onRename(trimmed);
                    setMode("menu");
                  }}
                  style={({ pressed }) => [
                    styles.renameSave,
                    { backgroundColor: colors.accent.clay },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save new name"
                >
                  <ThemedText
                    type="bodyBold"
                    style={{ color: colors.accent.onClay }}
                  >
                    Save
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}

          {mode === "emoji" ? (
            <View>
              <ThemedText
                type="label"
                style={[styles.title, { color: colors.inkMuted }]}
              >
                {project.emoji ? "CHANGE EMOJI" : "PICK AN EMOJI"}
              </ThemedText>
              <View style={styles.pickerRow}>
                {EMOJI_QUICK.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => {
                      onChangeEmoji(e);
                      setMode("menu");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set project emoji to ${e}`}
                    style={({ pressed }) => [
                      styles.pickerTile,
                      { backgroundColor: colors.surfaceSubtle },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText style={styles.pickerEmoji}>{e}</ThemedText>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => emojiInputRef.current?.focus()}
                  accessibilityRole="button"
                  accessibilityLabel="Pick a different emoji from the keyboard"
                  style={({ pressed }) => [
                    styles.pickerTile,
                    { backgroundColor: colors.surfaceSubtle },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                    MORE
                  </ThemedText>
                </Pressable>
                {project.emoji ? (
                  <Pressable
                    onPress={() => {
                      onChangeEmoji(null);
                      setMode("menu");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear project emoji"
                    style={({ pressed }) => [
                      styles.pickerTile,
                      { backgroundColor: colors.surfaceSubtle },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                      CLEAR
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                ref={emojiInputRef}
                value=""
                onChangeText={(t) => {
                  const trimmed = t.trim();
                  if (!trimmed) return;
                  onChangeEmoji(Array.from(trimmed)[0] ?? null);
                  emojiInputRef.current?.blur();
                  setMode("menu");
                }}
                style={styles.hiddenInput}
                caretHidden
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <View style={styles.pickerActions}>
                <Pressable
                  onPress={() => setMode("menu")}
                  style={({ pressed }) => [
                    styles.renameCancel,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Back to menu"
                >
                  <ThemedText type="bodyBold" muted>
                    Back
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}
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
  tone?: "default" | "danger" | "quiet";
}): React.ReactElement {
  const color =
    tone === "danger"
      ? tokens.feedback.danger
      : tone === "quiet"
        ? colors.inkMuted
        : colors.ink;
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
    minHeight: 48,
  },
  rowLabel: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: tokens.space.lg,
  },

  // Rename mode
  renameBlock: {
    paddingHorizontal: tokens.space.xl,
    gap: tokens.space.md,
  },
  renameInput: {
    minHeight: 52,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.md,
    fontSize: tokens.type.item.size,
    fontFamily: tokens.type.fontInter.medium,
  },
  renameActions: {
    flexDirection: "row",
    gap: tokens.space.sm,
    justifyContent: "flex-end",
    paddingTop: tokens.space.xs,
  },
  renameCancel: {
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  renameSave: {
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },

  // Emoji mode
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xl,
  },
  pickerTile: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  pickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
  },

  pressed: { opacity: 0.7 },
});
