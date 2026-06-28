import { StyleSheet, Text, View } from "react-native";

import { tokens, useTheme } from "@/constants/theme";

/**
 * An undated todo IS a "someday": present, not pressing. It keeps the cyan todo
 * code and earns this small neutral badge — never a separate color (see the
 * "Someday Is A Badge" rule in DESIGN.md). The chip is deliberately a neutral
 * surface tone, not a type hue, so it can never be read as another category.
 * It ships an accessible label so the undated state is not conveyed by sight
 * alone.
 */
export function SomedayBadge(): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: colors.surfaceSubtle }]}
      accessibilityLabel="No date — someday"
    >
      <Text style={[styles.label, { color: colors.inkMuted }]}>SOMEDAY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.sm,
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: tokens.type.micro.tracking,
  },
});
