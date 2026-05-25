import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { Brand, Radius, Spacing, Surface, TextColors } from "@/constants/theme";

interface WrapupCardProps {
  title?: string;
  body?: string;
}

/**
 * "Weekly Wrap-up" summary card shown at the bottom of the list screen.
 * Displays a motivational body text.
 */
export function WrapupCard({
  title = "Weekly Wrap-up",
  body = "You're on track to finish your weekly todos.",
}: WrapupCardProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.textBlock}>
        <ThemedText type="label" style={styles.label}>{title.toUpperCase()}</ThemedText>
        <ThemedText type="body" muted style={styles.body}>
          {body}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
  },
  textBlock: {
    flex: 1,
    gap: Spacing.xs,
  },
  label: {
    color: Brand.primary,
    letterSpacing: 0.5,
  },
  body: {
    lineHeight: 20,
    fontSize: 15,
    color: TextColors.secondary,
  },
});
