import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens } from "@/constants/theme";

/**
 * A row of inline value words behind a mono kicker key — the resolver detail
 * readout that replaces chip rails. "WHEN  tomorrow  weekend  exact". The chosen
 * value is colored + medium-weight; the rest are muted (handled by the child
 * `ResolverValue`s). The `keyColor` is passed in because the resolver workbench
 * is a fixed dark panel that doesn't follow the app scheme.
 */
export function ValueRow({
  label,
  keyColor,
  children,
}: {
  label: string;
  keyColor: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.valueRow}>
      <ThemedText type="micro" style={[styles.valueKey, { color: keyColor }]}>
        {label}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.valueList}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
  },
  valueKey: {
    width: 52,
  },
  valueList: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.lg,
    paddingRight: tokens.space.sm,
  },
});
