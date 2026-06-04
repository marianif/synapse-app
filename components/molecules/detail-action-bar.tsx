import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { chipInk, useTheme, tokens } from "@/constants/theme";

export interface PrimaryAction {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  /** True once the entry is completed / met — the primary reads as "done". */
  done: boolean;
}

interface DetailActionBarProps {
  /** The one decision the screen exists for — Complete / Mark Met / Promote. */
  primary: PrimaryAction;
  /** The entry's type-color. The primary carries it; the screen's signal thread. */
  accentColor: string;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Detail-screen act surface, rebuilt around the action hierarchy rather than
 * three equal tiles.
 *
 * The screen exists to make ONE decision (complete / mark met / promote), so
 * the primary owns the zone: full-width, carrying the entry's type-color — the
 * same signal thread the home tile and the detail rail already speak in. When
 * the entry is already done, the primary recedes to an outlined "done" state so
 * it stops competing for the tap.
 *
 * Edit and Delete are subordinate: a quiet text/icon pair on a single row below.
 * Delete is muted ink, NOT red — it should not shout at the volume of the
 * primary. It only goes destructive on press (the confirm sheet carries the
 * danger color). This keeps the destructive action present but hard to fire by
 * reflex, which the old equal-weight red tile failed at.
 */
export function DetailActionBar({
  primary,
  accentColor,
  onEdit,
  onDelete,
}: DetailActionBarProps): React.ReactElement {
  const { colors } = useTheme();

  const primaryInk = primary.done ? accentColor : chipInk();

  return (
    <View style={styles.bar}>
      {/* Primary — the decision. Type-color fill, or outlined once done. */}
      <Pressable
        onPress={primary.onPress}
        style={({ pressed }) => [
          styles.primary,
          primary.done
            ? { backgroundColor: colors.surface }
            : { backgroundColor: accentColor },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: primary.done }}
        accessibilityLabel={primary.label}
      >
        <MaterialCommunityIcons
          name={primary.icon}
          size={22}
          color={primaryInk}
        />
        <ThemedText type="bodyBold" style={[styles.primaryLabel, { color: primaryInk }]}>
          {primary.label}
        </ThemedText>
      </Pressable>

      {/* Subordinate pair — quiet, equal to each other, below the decision. */}
      <View style={styles.secondaryRow}>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Edit"
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={18}
            color={colors.inkMuted}
          />
          <ThemedText type="mono" muted style={styles.secondaryLabel}>
            EDIT
          </ThemedText>
        </Pressable>

        <View style={[styles.spacer, { backgroundColor: colors.surfaceSubtle }]} />

        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={18}
            color={colors.inkMuted}
          />
          <ThemedText type="mono" muted style={styles.secondaryLabel}>
            DELETE
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: tokens.space.md,
  },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.lg,
    minHeight: 56,
  },
  primaryLabel: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
  secondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    minHeight: 44,
  },
  // Thin tonal seam between the two subordinate controls — no border, just a
  // recessed-surface sliver (brand: structure via tonal layering, not 1px lines).
  spacer: {
    width: 1.5,
    alignSelf: "stretch",
    marginVertical: tokens.space.xs,
  },
  secondaryLabel: {
    letterSpacing: 0.8,
  },
  pressed: {
    opacity: 0.7,
  },
});
