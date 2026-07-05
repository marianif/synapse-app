import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

/**
 * The manual bar — the deliberate counterpart to capture. The pen key's TAP
 * raises this; its LONG-PRESS arms voice capture. Capture catches a thought and
 * resolves it into a board item (idea / todo / deadline / note); the manual bar
 * is for the one creation that is NOT a caught thought and has no capture path:
 * opening a PROJECT — a macro life area, a container, not a board item.
 *
 * It is NOT a second add-path for todos/deadlines (PRODUCT.md: one capture
 * trigger, no second add). It exists only for what capture structurally cannot
 * do. Built as a single-action bar today; the action set is data-driven so a
 * future deliberate-only action (e.g. archive review) can slot in without a
 * rewrite.
 *
 * Anatomy mirrors the CaptureBar so the dock reads as one instrument: the same
 * 56pt line inside the shared DockShell. It's FRAMELESS — the shell owns the
 * radius, elevation, entrance, and the NEUTRAL slab fill (`accent.clay`); this
 * bar renders only its row on-slab. The slab (never a type tint) is the surface
 * that means "interface, not content" — a project belongs to no entry type. A
 * mono "NEW PROJECT" kicker is the channel label, the instrument-panel parallel
 * to the edge-bar on the idle capture line.
 */
interface ManualBarProps {
  /** Create a project from the typed name and (typically) navigate to it. */
  onCreateProject: (title: string) => void;
  /** The input blurred with nothing typed — close the bar (matches CaptureBar). */
  onDismissEmpty: () => void;
}

export function ManualBar({
  onCreateProject,
  onDismissEmpty,
}: ManualBarProps): React.ReactElement {
  const { colors } = useTheme();

  const [draft, setDraft] = useState("");
  const hasText = draft.trim().length > 0;

  const onSlab = colors.accent.onClay;

  const handleBlur = (): void => {
    if (!hasText) onDismissEmpty();
  };

  const submit = (): void => {
    if (!hasText) return;
    onCreateProject(draft.trim());
    setDraft("");
  };

  return (
    <View style={styles.bar}>
      {/* The channel label — mono kicker reading what this line opens, the
          instrument-panel parallel to the capture line's amber edge-bar. */}
      <ThemedText type="label" style={[styles.kicker, { color: onSlab }]}>
        NEW PROJECT
      </ThemedText>

      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={submit}
        onBlur={handleBlur}
        autoFocus
        placeholder="Name a life area"
        placeholderTextColor={withDimmed(onSlab)}
        selectionColor={onSlab}
        returnKeyType="done"
        submitBehavior="submit"
        accessibilityLabel="New project name"
        accessibilityHint="Type a project name and submit to create it."
        style={[styles.input, { color: onSlab }]}
      />

      {hasText ? (
        <Pressable
          onPress={submit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Create project"
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: onSlab },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="arrow-up" size={22} color={colors.accent.clay} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onDismissEmpty}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <IconSymbol name="close" size={22} color={onSlab} />
        </Pressable>
      )}
    </View>
  );
}

// The placeholder reads on the slab without competing with typed text: the
// same on-slab ink at reduced alpha (no new token — derived from onClay).
function withDimmed(hex: string): string {
  return `${hex}99`;
}

const styles = StyleSheet.create({
  // Frameless: the DockShell owns radius, slab fill, clip, elevation, entrance.
  // The bar is just the row on-slab; it sizes the shell via minHeight.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.xs,
    gap: tokens.space.md,
  },
  kicker: {
    // The channel label sits flush left as a fixed prefix, not a growing word.
    opacity: 0.9,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.item.size,

    fontFamily: tokens.type.fontInter.medium,
  },
  // The send key — the slab's inverse, an off-slab key, mirroring the capture
  // bar's send. Tight 36pt visual, 44pt via hitSlop.
  sendBtn: {
    width: 36,
    height: 36,
    marginRight: tokens.space.xs,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
