import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens } from "@/constants/theme";

type IconPillProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
  /** When set, renders as a wider label pill instead of an icon-only circle. */
  label?: string;
};

// Tint-background circular action pill (icon-only) or, with `label`, a wider
// tint-background label pill. Shared shape for the sheet's inline delete /
// edit / complete actions — same press-opacity, same tint formula (color + "18"/"22").
export function IconPill({
  icon,
  color,
  onPress,
  accessibilityLabel,
  label,
}: IconPillProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        label ? styles.labelPill : styles.iconOnlyPill,
        { backgroundColor: color + (label ? "22" : "18") },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <MaterialCommunityIcons name={icon} size={label ? 14 : 15} color={color} />
      {label ? (
        <ThemedText type="bodyBold" style={{ color, fontSize: 13 }}>
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconOnlyPill: {
    width: 30,
    height: 30,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  labelPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
