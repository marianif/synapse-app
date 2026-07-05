import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { chipInk, tokens } from "@/constants/theme";

export function OptionChip({
  label,
  selected,
  color,
  muted,
  raised,
  onPress,
}: {
  label: string;
  selected: boolean;
  color: string;
  muted: string;
  raised: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.optionChip,
        { backgroundColor: selected ? color : raised },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="mono"
        numberOfLines={1}
        style={{ color: selected ? chipInk() : muted }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  optionChip: {
    minHeight: 28,
    maxWidth: 160,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.62,
  },
});
