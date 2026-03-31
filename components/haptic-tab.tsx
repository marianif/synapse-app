import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

/**
 * Tab bar button that fires a light haptic impact on press.
 * Drop-in replacement for the default tab button via tabBarButton option.
 */
export function HapticTab({ children, onPress, style }: BottomTabBarButtonProps): React.ReactElement {
  return (
    <Pressable
      style={style}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
    >
      {children}
    </Pressable>
  );
}
