import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

export interface ConfirmSheetProps {
  visible: boolean;
  /** Mono kicker above the body — e.g. "DELETE ENTRY". Uppercased by the label scale. */
  kicker: string;
  /** The question, in the agenda voice. */
  message: string;
  /** Confirm button label — defaults to "Delete". */
  confirmLabel?: string;
  /** When set, renders the "Don't ask me again" checkbox in `dontAsk` state. */
  dontAsk?: boolean;
  onToggleDontAsk?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Branded destructive-confirm bottom sheet — the field-aesthetic replacement for
 * `Alert.alert`. A mono kicker, a one-line question, a danger-colored confirm,
 * a quiet cancel, and an optional "Don't ask me again" checkbox whose state the
 * caller owns (persisted via `lib/settings.ts`). Presentational only: it never
 * reads or writes the preference itself — see `useConfirm`.
 */
export function ConfirmSheet({
  visible,
  kicker,
  message,
  confirmLabel = "Delete",
  dontAsk,
  onToggleDontAsk,
  onConfirm,
  onCancel,
}: ConfirmSheetProps): React.ReactElement {
  const { colors } = useTheme();
  const showDontAsk = dontAsk !== undefined && onToggleDontAsk !== undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        {/* Stop the inner sheet from forwarding taps to the dismissing overlay. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          <ThemedText
            type="label"
            style={[styles.kicker, { color: colors.inkMuted }]}
          >
            {kicker}
          </ThemedText>

          <ThemedText type="body" style={[styles.message, { color: colors.ink }]}>
            {message}
          </ThemedText>

          {showDontAsk ? (
            <Pressable
              onPress={onToggleDontAsk}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: dontAsk }}
              accessibilityLabel="Don't ask me again"
              style={styles.dontAskRow}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: dontAsk
                      ? colors.accent.clay
                      : "transparent",
                    borderColor: dontAsk ? colors.accent.clay : colors.inkMuted,
                  },
                ]}
              >
                {dontAsk ? (
                  <IconSymbol
                    name="Check"
                    size={14}
                    color={colors.accent.onClay}
                  />
                ) : null}
              </View>
              <ThemedText type="body" style={{ color: colors.inkMuted }}>
                Don&apos;t ask me again
              </ThemedText>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirm,
                { backgroundColor: colors.feedback.danger },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <ThemedText
                type="bodyBold"
                style={{ color: tokens.color.dark.paper }}
              >
                {confirmLabel}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <ThemedText type="bodyBold" muted>
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.xl,
    paddingBottom: tokens.space.xxl,
    gap: tokens.space.lg,
  },
  kicker: {
    letterSpacing: 0.8,
  },
  message: {
    fontSize: tokens.type.item.size,
    lineHeight: 24,
  },
  dontAskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 32,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: tokens.radius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    gap: tokens.space.sm,
    marginTop: tokens.space.xs,
  },
  confirm: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.lg,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.75,
  },
});
