import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { Radius, Spacing, Surface, TextColors } from '@/constants/theme';

interface DetailMetadataRowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  /** Accent color for the icon. Defaults to secondary text. */
  accentColor?: string;
}

/**
 * A single metadata row used in detail screens.
 * Icon on the left, label (muted) + value (primary) stacked on the right.
 * Used for date, time, project, duration, etc.
 */
export function DetailMetadataRow({
  icon,
  label,
  value,
  accentColor = TextColors.secondary,
}: DetailMetadataRowProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <View style={styles.iconSlot}>
        <MaterialCommunityIcons name={icon} size={18} color={accentColor} />
      </View>
      <View style={styles.content}>
        <ThemedText type="caption" muted style={styles.label}>
          {label.toUpperCase()}
        </ThemedText>
        <ThemedText type="bodyBold">{value}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  iconSlot: {
    width: 36,
    height: 36,
    backgroundColor: Surface.containerHigh,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    letterSpacing: 0.5,
  },
});
