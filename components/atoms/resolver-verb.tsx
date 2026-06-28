import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens } from "@/constants/theme";

/**
 * A single tappable verb on the capture resolver's destination line. The
 * affordance is the word itself in its type color — no enclosure. Picked dated
 * verbs go bold with a 2px underline in their color (the edge-bar pattern, laid
 * flat). Generous vertical padding + hitSlop keep the tap target ≥44pt though the
 * ink is small. Semibold at rest so it qualifies as large-text AA on the bar.
 */
export function ResolverVerb({
  label,
  color,
  selected = false,
  onPress,
  accessibilityLabel,
  accessibilityState,
}: {
  label: string;
  color: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState?: { selected?: boolean; expanded?: boolean };
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [styles.verb, pressed && { opacity: 0.5 }]}
    >
      <ThemedText
        type="item"
        style={[styles.verbText, { color }, selected && styles.verbSelected]}
      >
        {label}
      </ThemedText>
      <View
        style={[
          styles.verbUnderline,
          { backgroundColor: selected ? color : "transparent" },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  verb: {
    alignItems: "center",
    paddingVertical: tokens.space.xs,
  },
  verbText: {
    fontFamily: tokens.type.fontInter.semiBold,
  },
  verbSelected: {
    fontFamily: tokens.type.fontInter.bold,
  },
  verbUnderline: {
    height: 2,
    alignSelf: "stretch",
    marginTop: 2,
    borderRadius: tokens.radius.pill,
  },
});
