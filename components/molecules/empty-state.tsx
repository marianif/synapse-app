import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { Radius, Spacing } from "@/constants/theme";

interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
  accentColor: string;
}

export function EmptyState({
  title,
  description,
  ctaLabel,
  onCta,
  accentColor,
}: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.text}>
        <ThemedText
          type="caption"
          style={[styles.title, { color: accentColor }]}
        >
          {title}
        </ThemedText>
        <ThemedText type="caption" muted style={styles.description}>
          {description}
        </ThemedText>
      </View>
      <Pressable
        onPress={onCta}
        style={[styles.cta, { backgroundColor: accentColor + "1A" }]}
        accessibilityRole="button"
      >
        <ThemedText
          type="caption"
          style={[styles.ctaText, { color: accentColor }]}
        >
          {ctaLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
  },
  text: {
    flex: 1,
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  description: {
    lineHeight: 16,
    fontSize: 11,
  },
  cta: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
  },
});
