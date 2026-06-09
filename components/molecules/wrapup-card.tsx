import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { useTheme, tokens } from "@/constants/theme";

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
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceSubtle }]}>
      <View style={styles.textBlock}>
        <ThemedText type="label" style={[styles.label, { color: colors.accent.clay }]}>{title.toUpperCase()}</ThemedText>
        <ThemedText type="body" muted style={[styles.body, { color: colors.inkMuted }]}>
          {body}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xl,
    flexDirection: "row",
    alignItems: "center",
  },
  textBlock: {
    flex: 1,
    gap: tokens.space.xs,
  },
  label: {
    letterSpacing: 0.5,
  },
  body: {
    lineHeight: 20,
    fontSize: 15,
  },
});
