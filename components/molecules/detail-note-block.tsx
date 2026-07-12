import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

type DetailNoteBlockProps = {
  label: string;
  value: string;
};

// Tonal block for a labeled block of free text on the detail sheet —
// inspiration and notes share this shape, label micro + body on surfaceSubtle.
export function DetailNoteBlock({
  label,
  value,
}: DetailNoteBlockProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: colors.surfaceSubtle }]}>
      <ThemedText type="micro" muted>
        {label}
      </ThemedText>
      <ThemedText type="body" style={{ color: colors.ink }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.xs,
    marginTop: tokens.space.sm,
  },
});
