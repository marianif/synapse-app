import { Pressable, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/atoms/themed-text';
import { Spacing, TextColors } from '@/constants/theme';

interface MonthNavigatorProps {
  label: string;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
}

export function MonthNavigator({
  label,
  isCurrentMonth,
  onPrev,
  onNext,
  onToday,
}: MonthNavigatorProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPrev}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={TextColors.primary}
        />
      </Pressable>

      <Pressable
        onPress={isCurrentMonth ? undefined : onToday}
        style={styles.labelWrapper}
        accessibilityRole="button"
        accessibilityLabel={isCurrentMonth ? label : `Go to ${label}`}
      >
        <ThemedText type="headline" style={styles.label}>
          {label}
        </ThemedText>
        {!isCurrentMonth && onToday && (
          <ThemedText type="caption" muted style={styles.todayHint}>
            Tap to return to today
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        onPress={onNext}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Next month"
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={TextColors.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  labelWrapper: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
  },
  todayHint: {
    fontSize: 10,
  },
});
