import { Pressable, StyleSheet, Text } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

export function OptionChip({
  label,
  emoji,
  selected,
  muted,
  raised,
  ink,
  onPress,
}: {
  label: string;
  emoji?: string | null;
  selected: boolean;
  muted: string;
  raised: string;
  ink: string;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const clay = colors.accent.clay;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.optionChip,
        {
          backgroundColor: selected || pressed ? ink : raised,
        },
        pressed && styles.pressed,
      ]}
    >
      {({ pressed }) => (
        <>
          {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
          <ThemedText
            type="label"
            numberOfLines={1}
            style={{ color: selected || pressed ? clay : muted }}
          >
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  optionChip: {
    minHeight: 32,
    maxWidth: 160,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
  },
  emoji: {
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
