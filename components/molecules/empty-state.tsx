import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens } from "@/constants/theme";

interface EmptyStateProps {
  /** Optional leading icon name. Accepted by callers; not rendered in this compact layout. */
  icon?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
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
      {onCta && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
    paddingVertical: tokens.space.lg,
  },
  text: {
    flex: 1,
    alignItems: "flex-start",
    gap: tokens.space.xs,
  },
  title: {
    fontFamily: "HostGrotesk_600SemiBold",
    textTransform: "uppercase",
  },
  description: {
    lineHeight: 16,
    fontSize: 11,
  },
  cta: {
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
  },
  ctaText: {
    fontFamily: "HostGrotesk_600SemiBold",
    letterSpacing: 0.4,
  },
});
