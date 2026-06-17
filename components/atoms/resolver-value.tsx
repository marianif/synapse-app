import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens } from "@/constants/theme";

/**
 * A single tappable value word in a resolver ValueRow. Colored (`color`) when
 * chosen, else the recessive `mutedColor`. The muted color is passed in rather
 * than read from theme, because the resolver's workbench is a fixed dark panel in
 * both schemes — its inks don't follow the app scheme.
 */
export function ResolverValue({
  label,
  color,
  mutedColor,
  selected,
  onPress,
}: {
  label: string;
  color: string;
  mutedColor: string;
  selected: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.value, pressed && { opacity: 0.5 }]}
    >
      <ThemedText
        type="body"
        numberOfLines={1}
        style={[
          styles.valueText,
          selected
            ? { color, fontFamily: tokens.type.fontInter.semiBold }
            : { color: mutedColor },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  value: {
    paddingVertical: tokens.space.xs,
  },
  valueText: {
    maxWidth: 160,
  },
});
