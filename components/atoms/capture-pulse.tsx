import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { IconSymbol } from "@/components/ui/icon-symbol";

/**
 * The capture prompt — a neutral capture-mark (a plus) marking "fill this line."
 * Type-agnostic: the bar no longer belongs to ideas, so the mark is a plain
 * interface glyph, not a type glyph. It breathes rather than blinks: one long,
 * slow sine-eased opacity swell between 0.6 and 1, no snap or hold, so it reads
 * as a calm presence, not a compulsive pulse. The breath fades opacity, never
 * the hue — tinted with the passed-in neutral signal.
 */
export function CapturePulse({ tint }: { tint: string }): React.ReactElement {
  const reduced = useReducedMotion();
  const breath = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      breath.value = 1;
      return;
    }
    // One slow, symmetric swell — withRepeat reverses it, so a single eased
    // timing gives a smooth in-out with no perceptible edges.
    breath.value = withRepeat(
      withTiming(0.6, {
        duration: 2200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [breath, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: breath.value }));

  return (
    <Animated.View style={style}>
      <IconSymbol name="Plus" size={22} color={tint} />
    </Animated.View>
  );
}
