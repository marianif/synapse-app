import { useState } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

export interface SectionLayoutOption<T extends string = string> {
  key: T;
  label: string;
  icon: IconSymbolName;
}

export interface SectionLayoutMenuProps<T extends string = string> {
  options: SectionLayoutOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Voice-over label for the trigger button. Defaults to "Change layout". */
  accessibilityLabel?: string;
}

/**
 * Icon-triggered menu for choosing a section's layout (e.g. list vs grid).
 * Reusable across home sections — each section owns its current value and
 * passes the option set it supports. Presentation is a bottom sheet to stay
 * consistent with the rest of the field surface (see ConfirmSheet).
 */
export function SectionLayoutMenu<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel = "Change layout",
}: SectionLayoutMenuProps<T>): React.ReactElement {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const close = (): void => setOpen(false);
  const pick = (next: T): void => {
    onChange(next);
    close();
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <IconSymbol name="dots-horizontal" size={18} color={colors.inkMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <ThemedText
              type="label"
              style={[styles.kicker, { color: colors.inkMuted }]}
            >
              LAYOUT
            </ThemedText>

            {options.map((opt) => {
              const selected = opt.key === value;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => pick(opt.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={opt.label}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: selected
                        ? colors.surfaceSubtle
                        : "transparent",
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <IconSymbol
                    name={opt.icon}
                    size={20}
                    color={selected ? colors.ink : colors.inkMuted}
                  />
                  <ThemedText
                    type="body"
                    style={{ color: selected ? colors.ink : colors.inkMuted }}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
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
    gap: tokens.space.sm,
  },
  kicker: {
    letterSpacing: 0.8,
    marginBottom: tokens.space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 48,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
