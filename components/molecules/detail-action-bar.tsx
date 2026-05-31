import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { useTheme, tokens } from '@/constants/theme';

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

/**
 * Full-width row of exactly three action buttons for the detail screen.
 * Primary action uses the accent color background.
 * Danger action uses red coloring.
 * Secondary actions use the elevated surface background.
 */
export function DetailActionBar({ actions }: DetailActionBarProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={styles.bar}>
      {actions.map((action) => {
        const iconColor = action.isPrimary
          ? colors.paper
          : action.isDanger
            ? colors.feedback.danger
            : colors.inkMuted;
        const labelColor = action.isPrimary
          ? colors.paper
          : action.isDanger
            ? colors.feedback.danger
            : colors.inkMuted;
        const bgColor = action.isPrimary
          ? (action.accentColor ?? colors.inkMuted)
          : colors.surface;

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
    gap: tokens.space.sm,
  },
  button: {
    flex: 1,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xs,
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
