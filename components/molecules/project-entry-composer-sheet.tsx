import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

/**
 * Shared shell for a project-scoped entry composer.
 *
 * Three verbs (idea / todo / deadline) all need the same chrome: a kicker
 * naming the project context, a title field that auto-focuses, optional
 * type-specific picker rows above the title, and a Save / Cancel pair on a
 * keyboard-avoiding sheet. This molecule renders the chrome; callers slot
 * their picker JSX via `pickerSlot`.
 *
 * The shape mirrors ProjectNoteComposerSheet (the existing note flow), so
 * the four authoring surfaces on a project — todo, deadline, idea, note —
 * read as one family rather than four bespoke shapes.
 */
export function ProjectEntryComposerSheet({
  visible,
  projectTitle,
  typeLabel,
  accentColor,
  placeholder,
  pickerSlot,
  canSave,
  onClose,
  onSave,
}: {
  visible: boolean;
  projectTitle: string;
  /** "TO-DO" / "DEADLINE" / "IDEA" — interpolated into the kicker. */
  typeLabel: string;
  /** Entry-type color for the title underline accent. */
  accentColor: string;
  placeholder: string;
  /** Type-specific picker JSX. Sits between kicker and title input.
   *  Null for the bare idea composer. */
  pickerSlot?: React.ReactNode;
  /** Parent owns whether Save is allowed (title required + any picker
   *  constraints — e.g. deadline needs a date when horizon = Day). */
  canSave: boolean;
  onClose: () => void;
  /** Parent reads the title from the input via the ref the kid hands back. */
  onSave: (title: string) => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setDraft("");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const titleOk = draft.trim().length > 0;
  const reallyCanSave = canSave && titleOk;

  const commit = (): void => {
    if (!reallyCanSave) return;
    onSave(draft.trim());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kbAvoid}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <ThemedText
              type="label"
              style={[styles.kicker, { color: accentColor }]}
            >
              {`${typeLabel} · ${projectTitle.toUpperCase()}`}
            </ThemedText>

            {pickerSlot}

            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              placeholderTextColor={colors.inkMuted}
              accessibilityLabel="Title"
              returnKeyType="done"
              onSubmitEditing={commit}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.ink,
                },
              ]}
            />

            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <ThemedText type="bodyBold" muted>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={commit}
                disabled={!reallyCanSave}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: reallyCanSave
                      ? colors.accent.clay
                      : colors.surfaceSubtle,
                  },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save"
                accessibilityState={{ disabled: !reallyCanSave }}
              >
                <ThemedText
                  type="bodyBold"
                  style={{
                    color: reallyCanSave
                      ? colors.accent.onClay
                      : colors.inkMuted,
                  }}
                >
                  Save
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/** Re-exported so the three thin wrappers can keep entry-type plumbing local. */
export type ComposerEntryType = Extract<EntryType, "todo" | "deadline" | "idea">;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: tokens.color.scrim.strong,
    justifyContent: "flex-end",
  },
  kbAvoid: { width: "100%" },
  sheet: {
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  kicker: {
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.md,
    fontSize: tokens.type.item.size,
    fontFamily: tokens.type.fontInter.medium,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.space.sm,
  },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  saveBtn: {
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  pressed: { opacity: 0.7 },
});
