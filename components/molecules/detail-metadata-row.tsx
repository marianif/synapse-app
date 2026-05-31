import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { useTheme, tokens } from '@/constants/theme';

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
  accentColor,
}: DetailMetadataRowProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceSubtle }]}>
      <View style={[styles.iconSlot, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name={icon} size={18} color={accentColor ?? colors.inkMuted} />
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
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  iconSlot: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
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
