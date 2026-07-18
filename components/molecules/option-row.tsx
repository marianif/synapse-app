import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens } from "@/constants/theme";

export function OptionRow({
  label,
  muted,
  children,
}: {
  label: string;
  muted: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.optionRow}>
      <ThemedText type="micro" style={[styles.optionLabel, { color: muted }]}>
        {label}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.optionRail}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    gap: tokens.space.xs,
  },
  optionLabel: {
    paddingLeft: tokens.space.xs,
  },
  optionRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingRight: tokens.space.sm,
  },
});
