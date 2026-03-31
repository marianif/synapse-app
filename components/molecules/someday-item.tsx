import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { ThemedView } from "@/components/atoms/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EntryAccent, Radius, Spacing } from "@/constants/theme";

interface SomedayItemProps {
  quote: string;
}

/**
 * Someday idea card molecule.
 * Renders a single card with:
 * - Sparkle icon (top center)
 * - "ONE DAY" label (amber, all-caps)
 * - Italic centered quote
 * - Horizontal divider line
 *
 * Tapping the card navigates to the someday list screen.
 */
export function SomedayItem({ quote }: SomedayItemProps): React.ReactElement {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/list?entryType=someday')}
      accessibilityRole="button"
      accessibilityLabel="Open someday ideas list"
    >
      <ThemedView surface="container" style={styles.card}>
        {/* Sparkle icon */}
        <View style={styles.iconContainer}>
          <IconSymbol
            name="star-four-points"
            size={28}
            color={EntryAccent.someday}
          />
        </View>

        {/* "ONE DAY" label */}
        <ThemedText
          type="label"
          style={[styles.label, { color: EntryAccent.someday }]}
        >
          ONE DAY
        </ThemedText>

        {/* Italic centered quote */}
        <ThemedText type="body" style={styles.quote}>
          {quote}
        </ThemedText>

        {/* Horizontal divider line */}
        <View style={styles.divider} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    borderRadius: Radius.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  quote: {
    fontStyle: "italic",
    textAlign: "center",
    color: "#FAFAFA",
    lineHeight: 24,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: EntryAccent.someday,
    marginTop: Spacing.md,
  },
});
