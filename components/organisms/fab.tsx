import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View, StyleSheet } from 'react-native';

import { Brand, Radius, Shadow } from '@/constants/theme';

interface FabProps {
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * Floating Action Button — always visible, anchored bottom-right.
 * Glassmorphic gradient + permanent glow effect per DESIGN.md.
 * Shape: pill (borderRadius: full).
 */
export function Fab({ onPress, onLongPress }: FabProps): React.ReactElement {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Permanent glow layer behind the button */}
      <View style={styles.glow} />
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#1A1A2E" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Brand.fabGlow,
    // blur effect via shadow on iOS, ignored on Android (acceptable)
    ...Shadow.fab,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.fab,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
