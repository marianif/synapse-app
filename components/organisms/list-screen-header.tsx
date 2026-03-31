import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/atoms/themed-text';
import { Spacing, TextColors } from '@/constants/theme';

interface ListScreenHeaderProps {
  title: string;
  onBack?: () => void;
  onOverflow?: () => void;
}

/**
 * Stack-screen header for the list view.
 * Back chevron on the left, dynamic title in the center, 3-dot overflow on the right.
 * Replaces the default React Navigation header (use headerShown: false on the route).
 */
export function ListScreenHeader({
  title,
  onBack,
  onOverflow,
}: ListScreenHeaderProps): React.ReactElement {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={TextColors.primary}
        />
      </Pressable>

      <ThemedText type="headline" style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>

      <Pressable
        onPress={onOverflow}
        hitSlop={12}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="More options"
      >
        <MaterialCommunityIcons
          name="dots-vertical"
          size={22}
          color={TextColors.secondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
