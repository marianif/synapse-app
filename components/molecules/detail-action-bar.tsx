import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

export interface PrimaryAction {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  done: boolean;
}

interface DetailActionBarProps {
  primary?: PrimaryAction;
  accentColor: string;
  onEdit: () => void;
  onDelete: () => void;
}

/** A quiet command line for the sheet's immediate actions. */
export function DetailActionBar({
  primary,
  accentColor,
  onEdit,
  onDelete,
}: DetailActionBarProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={styles.line}>
      {primary ? (
        <Pressable
          onPress={primary.onPress}
          hitSlop={8}
          style={({ pressed }) => [styles.command, styles.primary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ selected: primary.done }}
          accessibilityLabel={primary.label}
        >
          <MaterialCommunityIcons
            name={primary.icon}
            size={20}
            color={accentColor}
          />
          <ThemedText type="mono" style={[styles.label, { color: accentColor }]}>
            {primary.label}
          </ThemedText>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onEdit}
        hitSlop={8}
        style={({ pressed }) => [styles.command, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Edit"
      >
        <MaterialCommunityIcons
          name="pencil-outline"
          size={18}
          color={colors.inkMuted}
        />
        <ThemedText type="mono" muted style={styles.label}>
          Edit
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [styles.command, pressed && styles.deletePressed]}
        accessibilityRole="button"
        accessibilityLabel="Delete"
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={18}
          color={colors.inkMuted}
        />
        <ThemedText type="mono" muted style={styles.label}>
          Delete
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    gap: tokens.space.md,
  },
  command: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
    minHeight: 48,
    paddingHorizontal: tokens.space.xs,
    borderRadius: tokens.radius.sm,
  },
  primary: {
    flex: 1,
    justifyContent: "flex-start",
  },
  label: {
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.58,
  },
  deletePressed: {
    opacity: 0.58,
  },
});
