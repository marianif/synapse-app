import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import {
  entryKicker,
  entryTint,
  reverseEntryKicker,
  tokens,
  useTheme,
  type Scheme,
} from "@/constants/theme";
import type { EntryType } from "@/lib/types";

function typeIcon(variant: EntryType | "note"): IconSymbolName {
  switch (variant) {
    case "idea":
      return "Sparkles";
    case "todo":
      return "CheckSquare";
    case "deadline":
      return "Clock";
    case "note":
      return "Note2";
  }
}

export function TypeLane({
  variant,
  label,
  scheme,
  ink,
  raised,
  onPress,
}: {
  variant: EntryType | "note";
  label: string;
  scheme: Scheme;
  ink: string;
  raised: string;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const clay = colors.accent.clay;
  const isNote = variant === "note";
  const icon = typeIcon(variant);
  const foreground = isNote ? ink : reverseEntryKicker(variant, scheme);
  const pressedBackground = isNote ? ink : entryTint(variant, scheme);
  const pressedForeground = isNote ? clay : entryKicker(variant, scheme);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`File as ${label}`}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: pressed ? pressedBackground : raised,
        },
        pressed && styles.pressed,
      ]}
    >
      {({ pressed }) => (
        <>
          <IconSymbol
            name={icon}
            size={12}
            color={pressed ? pressedForeground : foreground}
          />
          <ThemedText
            type="label"
            style={{ color: pressed ? pressedForeground : foreground }}
          >
            {label}
          </ThemedText>
          <IconSymbol
            name="ChevronRight"
            size={10}
            color={pressed ? pressedForeground : foreground}
          />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    minHeight: 32,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
