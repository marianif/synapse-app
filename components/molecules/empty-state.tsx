import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { Radius, Spacing, TextColors } from '@/constants/theme';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
  accentColor: string;
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  accentColor,
}: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={28} color={TextColors.tertiary} />
      <View style={styles.text}>
        <ThemedText type="body" style={styles.title}>{title}</ThemedText>
        <ThemedText type="caption" muted style={styles.description}>{description}</ThemedText>
      </View>
      <Pressable
        onPress={onCta}
        style={[styles.cta, { backgroundColor: accentColor + '1A' }]}
        accessibilityRole="button"
      >
        <ThemedText type="caption" style={[styles.ctaText, { color: accentColor }]}>
          {ctaLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  text: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    color: TextColors.secondary,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 220,
  },
  cta: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  ctaText: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4,
  },
});
