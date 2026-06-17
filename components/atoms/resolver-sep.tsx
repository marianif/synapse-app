import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";

/** A faint middot separating resolver verbs — punctuation, not chrome. */
export function ResolverSep({ color }: { color: string }): React.ReactElement {
  return (
    <ThemedText type="item" style={[styles.sep, { color }]}>
      ·
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  sep: {
    opacity: 0.5,
  },
});
