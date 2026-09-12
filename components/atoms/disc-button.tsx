import type { AccessibilityState } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { tokens, useTheme, type ThemeColors } from "@/constants/theme";

export type DiscButtonTone = "success" | "ink" | "danger" | "accent";

export interface DiscButtonProps {
  icon: IconSymbolName;
  label: string;
  onPress: () => void;
  /** Disc fill + glyph pairing. Defaults to "ink". */
  tone?: DiscButtonTone;
  /** Inverts the whole key to the ink slab — a latched / active state. */
  selected?: boolean;
  /** Stretch to fill its slot; two filled buttons split the row evenly. */
  fill?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}

/**
 * The Field Lab action key: a pill container holding a fully-rounded glyph disc
 * with the label beside it. The disc is where the colour lives, so a row of keys
 * never competes as a set of saturated slabs. Reuse it wherever a labeled action
 * needs the same weight (commit bars, sheets, prompt cards). When `selected`, the
 * key inverts to the ink slab — use it for latched or active states, not pressed.
 */
export function DiscButton({
  icon,
  label,
  onPress,
  tone = "ink",
  selected = false,
  fill = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: DiscButtonProps): React.ReactElement {
  const { colors } = useTheme();
  const disc = selected
    ? { fill: colors.paper, ink: colors.ink }
    : discColors(tone, colors);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [
        styles.button,
        fill && styles.fill,
        {
          backgroundColor: selected
            ? colors.ink
            : pressed
              ? colors.surface
              : colors.surfaceSubtle,
        },
      ]}
    >
      <View style={[styles.disc, { backgroundColor: disc.fill }]}>
        <IconSymbol name={icon} size={16} color={disc.ink} />
      </View>
      <ThemedText
        type="bodyBold"
        style={[styles.label, { color: selected ? colors.paper : colors.ink }]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function discColors(
  tone: DiscButtonTone,
  colors: ThemeColors,
): { fill: string; ink: string } {
  switch (tone) {
    case "success":
      return { fill: tokens.feedback.success, ink: tokens.color.light.ink };
    case "danger":
      return { fill: tokens.feedback.danger, ink: tokens.color.light.paper };
    case "accent":
      return { fill: colors.accent.clay, ink: colors.accent.onClay };
    case "ink":
    default:
      return { fill: colors.ink, ink: colors.paper };
  }
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
  },
  fill: {
    flex: 1,
  },
  disc: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flexGrow: 1,
    textAlign: "center",
  },
});
