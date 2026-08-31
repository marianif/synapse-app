import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

// A single selectable pill — the shared chip used across the When / Repeat
// pickers and the type selector. Resting: recessed surfaceSubtle + muted ink.
// Selected: a soft accent tint + accent ink. Borderless, compact, one vocabulary.

type SelectChipProps = {
  label: string;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
  /** Stretch to fill an equal-width slot (segmented rows). */
  fill?: boolean;
  /** Tighter footprint for dense option rails (When quick-picks). */
  compact?: boolean;
};

export function SelectChip({
  label,
  selected,
  accentColor,
  onPress,
  fill = false,
  compact = false,
}: SelectChipProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.compact,
        fill && styles.fill,
        { backgroundColor: colors.surfaceSubtle },
        selected && { backgroundColor: accentColor + "22" },
        pressed && !selected && { opacity: 0.6 },
      ]}
    >
      <ThemedText
        type="caption"
        numberOfLines={1}
        style={
          selected
            ? { color: accentColor, fontWeight: "700" }
            : { color: colors.inkMuted }
        }
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

// Horizontal scrolling rail for a set of chips (When/Repeat option rows).
export function ChipRail({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.rail}
    >
      {children}
    </ScrollView>
  );
}

// Equal-width row of chips that fills the panel width (weekday segments).
export function ChipRow({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: tokens.space.md,
    minHeight: 32,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: {
    paddingHorizontal: tokens.space.sm,
    minHeight: 28,
  },
  fill: {
    flex: 1,
    paddingHorizontal: tokens.space.xs,
  },
  rail: {
    flexDirection: "row",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.lg,
  },
  row: {
    flexDirection: "row",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.lg,
  },
});
