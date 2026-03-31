import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { Radius, Spacing, Surface, TextColors } from '@/constants/theme';

export interface ActionItem {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
  /** When true, button uses accent background and primary label color. */
  isPrimary?: boolean;
  /** When true, button uses a danger/destructive color (red). */
  isDanger?: boolean;
  accentColor?: string;
}

interface DetailActionBarProps {
  actions: [ActionItem, ActionItem, ActionItem];
}

const DANGER_COLOR = '#FF4444';

/**
 * Full-width row of exactly three action buttons for the detail screen.
 * Primary action uses the accent color background.
 * Danger action uses red coloring.
 * Secondary actions use Surface.containerHigh background.
 */
export function DetailActionBar({ actions }: DetailActionBarProps): React.ReactElement {
  return (
    <View style={styles.bar}>
      {actions.map((action) => {
        const iconColor = action.isPrimary
          ? '#131316'
          : action.isDanger
            ? DANGER_COLOR
            : TextColors.secondary;
        const labelColor = action.isPrimary
          ? '#131316'
          : action.isDanger
            ? DANGER_COLOR
            : TextColors.secondary;
        const bgColor = action.isPrimary
          ? (action.accentColor ?? TextColors.secondary)
          : Surface.containerHigh;

        return (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: bgColor },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <MaterialCommunityIcons name={action.icon} size={20} color={iconColor} />
            <ThemedText type="caption" style={[styles.label, { color: labelColor }]}>
              {action.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 60,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
