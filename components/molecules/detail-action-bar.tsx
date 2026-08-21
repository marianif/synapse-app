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

interface ActionChipProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  iconColor: string;
  badgeColor: string;
  labelColor?: string;
  onPress: () => void;
  flex?: boolean;
  accessibilityState?: { selected: boolean };
}

function ActionChip({
  icon,
  label,
  iconColor,
  badgeColor,
  labelColor,
  onPress,
  flex,
  accessibilityState,
}: ActionChipProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.chip,
        flex && styles.chipFlex,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={label}
    >
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
      </View>
      <ThemedText
        type="mono"
        style={[styles.label, labelColor ? { color: labelColor } : null]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** A row of separated action chips for the sheet's immediate actions. */
export function DetailActionBar({
  primary,
  accentColor,
  onEdit,
  onDelete,
}: DetailActionBarProps): React.ReactElement {
  const { colors, scheme } = useTheme();
  const dangerBadge = tokens.feedback.dangerTint[scheme];

  return (
    <View style={styles.line}>
      {primary ? (
        <ActionChip
          icon={primary.icon}
          label={primary.label}
          iconColor={accentColor}
          badgeColor={colors.surfaceSubtle}
          labelColor={accentColor}
          onPress={primary.onPress}
          flex
          accessibilityState={{ selected: primary.done }}
        />
      ) : null}

      <ActionChip
        icon="pencil-outline"
        label="Edit"
        iconColor={colors.inkMuted}
        badgeColor={colors.surfaceSubtle}
        onPress={onEdit}
      />

      <ActionChip
        icon="trash-can-outline"
        label="Delete"
        iconColor={tokens.feedback.danger}
        badgeColor={dangerBadge}
        onPress={onDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 48,
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    paddingRight: tokens.space.md,
    paddingLeft: tokens.space.xs,
    borderRadius: tokens.radius.pill,
  },
  chipFlex: {
    flexShrink: 1,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.58,
  },
});
