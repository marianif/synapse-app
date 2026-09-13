import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

export interface ChoiceOption {
  value: string;
  label: string;
  /** Optional second line under the label — the trade-off in one breath. */
  description?: string;
}

interface ChoiceSheetProps {
  visible: boolean;
  title: string;
  options: ChoiceOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

/**
 * A small single-choice bottom sheet for Settings scalars (deadline lead time,
 * dormant-project behavior). Presentational only: the caller owns persistence
 * and the resync that follows. Selected row is marked with a clay check.
 */
export function ChoiceSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: ChoiceSheetProps): React.ReactElement {
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
            {title}
          </ThemedText>

          {options.map((option) => {
            const active = option.value === selected;
            return (
              <Pressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.copy}>
                  <ThemedText
                    type="body"
                    style={{ color: active ? colors.accent.clay : colors.ink }}
                  >
                    {option.label}
                  </ThemedText>
                  {option.description ? (
                    <ThemedText type="caption" muted style={styles.description}>
                      {option.description}
                    </ThemedText>
                  ) : null}
                </View>
                {active ? (
                  <IconSymbol
                    name="Check"
                    size={18}
                    color={colors.accent.clay}
                  />
                ) : null}
              </Pressable>
            );
          })}
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
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  title: {
    letterSpacing: 0.6,
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.xl,
    minHeight: 48,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  description: {
    lineHeight: 16,
  },
  pressed: { opacity: 0.7 },
});
