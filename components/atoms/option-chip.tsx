import { Pressable, StyleSheet, Text } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

export function OptionChip({
  label,
  emoji,
  icon,
  selected,
  muted,
  raised,
  ink,
  onPress,
}: {
  label: string;
  emoji?: string | null;
  icon?: IconSymbolName;
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
          {icon ? (
            <IconSymbol
              name={icon}
              size={13}
              color={selected || pressed ? clay : muted}
            />
          ) : emoji ? (
            <Text style={styles.emoji}>{emoji}</Text>
          ) : null}
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
    minHeight: 28,
    maxWidth: 160,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
  },
  emoji: {
    fontSize: 18,
    lineHeight: 18,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
