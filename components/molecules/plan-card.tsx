import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

export interface PlanCardProps {
  title: string;
  price: string;
  period?: string;
  /** Struck reference price shown above `price`. */
  strikePrice?: string;
  detail: string;
  /** Neutral informational chip (e.g. "ONE-TIME", "CURRENT PLAN"). */
  chip?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * One selectable plan on the paywall. Tonal selection (raised `surface` when
 * selected, recessed `surfaceSubtle` otherwise) rather than a border, with a
 * leading radio disc as the state control. The price is the loudest thing in
 * the row so the struck reference reads as an anchor, not decoration.
 */
export function PlanCard({
  title,
  price,
  period,
  strikePrice,
  detail,
  chip,
  selected,
  disabled = false,
  onPress,
}: PlanCardProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${title}, ${price}${period ?? ""}. ${detail}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.surface : colors.surfaceSubtle,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.radio,
          selected
            ? { backgroundColor: colors.accent.clay }
            : { borderWidth: 1.5, borderColor: colors.inkMuted },
        ]}
      >
        {selected ? (
          <IconSymbol
            name="Check"
            size={14}
            color={colors.accent.onClay}
          />
        ) : null}
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <ThemedText type="item" style={{ color: colors.ink }}>
            {title}
          </ThemedText>
          {chip ? (
            <View
              style={[
                styles.chip,
                // Inverse of the card tone so the chip keeps contrast on both
                // the selected (surface) and unselected (surfaceSubtle) card.
                {
                  backgroundColor: selected
                    ? colors.surfaceSubtle
                    : colors.surface,
                },
              ]}
            >
              <ThemedText type="micro" muted>
                {chip}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="caption" muted style={styles.detail}>
          {detail}
        </ThemedText>
      </View>

      <View style={styles.priceCol}>
        {strikePrice ? (
          <ThemedText type="caption" muted style={styles.strike}>
            {strikePrice}
          </ThemedText>
        ) : null}
        <View style={styles.priceRow}>
          <ThemedText type="title" style={{ color: colors.ink }}>
            {price}
          </ThemedText>
          {period ? (
            <ThemedText type="caption" muted>
              {period}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.lg,
    borderRadius: tokens.radius.lg,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.sm,
  },
  detail: {
    lineHeight: 16,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  strike: {
    textDecorationLine: "line-through",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
});
