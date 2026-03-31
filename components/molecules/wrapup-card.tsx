import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { Brand, Radius, Spacing, Surface, TextColors } from '@/constants/theme';

interface WrapupCardProps {
  title?: string;
  body?: string;
  onViewStats?: () => void;
}

/**
 * "Weekly Wrap-up" summary card shown at the bottom of the list screen.
 * Displays a motivational body text and a "View Stats" pill CTA.
 */
export function WrapupCard({
  title = 'Weekly Wrap-up',
  body = "You're on track to finish 95% of tasks.",
  onViewStats,
}: WrapupCardProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.textBlock}>
        <ThemedText type="bodyBold">{title}</ThemedText>
        <ThemedText type="body" muted style={styles.body}>
          {body}
        </ThemedText>
      </View>
      <Pressable
        onPress={onViewStats}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel="View stats"
      >
        <ThemedText type="bodyBold" style={styles.ctaText}>
          View{'\n'}Stats
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.xs,
  },
  body: {
    lineHeight: 20,
  },
  cta: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  ctaPressed: {
    opacity: 0.8,
  },
  ctaText: {
    color: TextColors.disabled, // dark text on light pill
    textAlign: 'center',
    lineHeight: 20,
  },
});
