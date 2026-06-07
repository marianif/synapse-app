import { useEffect, useRef } from "react";
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Circle } from "react-native-svg";

import { tokens } from "@/constants/theme";

import type { Heat } from "@/components/molecules/field-row";
import type { SharedValue } from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Same heat→glow scale as field-row.tsx, mirrored here for the halo. */
const GLOW_ALPHA: Record<Heat, number> = { hot: 0.22, warm: 0.12, cool: 0.05 };
const GLOW_PAD: Record<Heat, number> = { hot: 12, warm: 7, cool: 3 };

/** Where a dot starts its mount bloom — a baseline pip, scaled up to data size. */
const GROW_FROM = 0.4;
/**
 * Spring for the resting-radius change (when the data size actually shifts).
 * Lower damping than the mount spring so it overshoots a hair and settles.
 */
const BREATH_SPRING = { damping: 12, stiffness: 200 } as const;
/**
 * The breath pulse — a transient swell added on TOP of the resting radius on
 * every count change. Independent of the resting size, so it stays visible even
 * once the radius has saturated at its cap (where the resting value no longer
 * moves and a spring-to-same-value would be invisible).
 */
const BREATH_SWELL = 6; // px the dot puffs out at the peak of a breath
const BREATH_UP = 160; // ms to swell out
const BREATH_DOWN = 320; // ms to settle back
/** How far a pressed dot lunges toward the core, as a fraction of its spoke. */
const PRESS_PULL = 0.14;
/** Halo opacity multiplier while pressed — the dot brightens as you pluck it. */
const PRESS_FLARE = 1.6;

type OrbitDotProps = {
  /** Resting position on the ring. */
  x: number;
  /** Resting position on the ring. */
  y: number;
  /** Orbit center, so the dot knows which way "toward the core" is. */
  cx: number;
  cy: number;
  /** Final data-driven radius (count-encoded). */
  radius: number;
  /** Raw item count — the breath trigger, since radius saturates at the cap. */
  count: number;
  heat: Heat;
  color: string;
  /** Stagger index — dots settle in orbit order. */
  index: number;
  /** 0 → 1 press progress, owned by the parent so the hit-target drives it. */
  pressed: SharedValue<number>;
};

/**
 * One populated orbiting type-dot, animated.
 *
 * Mount (Approach 1): the radius springs from a baseline pip up to its
 * data-driven size, staggered by orbit position — the field blooms to match
 * what you're carrying. It keeps breathing after mount too, in two layers: the
 * resting radius springs to its new size when the data size changes, AND a
 * transient swell pulses on every count change on top of it. The swell is what
 * keeps the breath visible once the radius saturates at its cap — there the
 * resting size no longer moves, so without the additive pulse a 7th entry would
 * land silently. Press (Approach 2): the dot lunges along its spoke toward the
 * core and its halo flares, so a tap reads as plucking the type down.
 *
 * Both are state-driven and one-shot — no looping motion (DESIGN.md). Reduced
 * motion renders the dot at rest, full size, no entrance or press travel.
 */
export function OrbitDot({
  x,
  y,
  cx,
  cy,
  radius,
  count,
  heat,
  color,
  index,
  pressed,
}: OrbitDotProps): React.ReactElement {
  const reduced = useReducedMotion();

  // Resting radius. On mount it springs from a baseline pip up to the data
  // radius (in orbit order); when the data radius genuinely changes it springs
  // to the new size. Below the cap, this carries the size shift on its own.
  const liveR = useSharedValue(reduced ? radius : radius * GROW_FROM);
  const mounted = useRef(false);
  useEffect(() => {
    if (reduced) {
      liveR.value = radius;
      return;
    }
    if (!mounted.current) {
      mounted.current = true;
      liveR.value = withDelay(
        200 + index * 60,
        withSpring(radius, tokens.motion.spring),
      );
    } else {
      liveR.value = withSpring(radius, BREATH_SPRING);
    }
  }, [liveR, reduced, index, radius]);

  // Breath pulse, added on top of the resting radius. Fires on every COUNT
  // change (not radius) — so it stays visible once the radius saturates at its
  // cap, where the resting value stops moving. Swell out, then settle back to 0.
  const breath = useSharedValue(0);
  const prevCount = useRef(count);
  useEffect(() => {
    if (reduced || count === prevCount.current) {
      prevCount.current = count;
      return;
    }
    prevCount.current = count;
    breath.value = withSequence(
      withTiming(BREATH_SWELL, { duration: BREATH_UP }),
      withTiming(0, { duration: BREATH_DOWN }),
    );
  }, [breath, reduced, count]);

  // Vector from the dot back toward the core, scaled to the press-lunge depth.
  const pullX = (cx - x) * PRESS_PULL;
  const pullY = (cy - y) * PRESS_PULL;

  const dotProps = useAnimatedProps(() => {
    const p = reduced ? 0 : pressed.value;
    return {
      r: liveR.value + breath.value,
      cx: x + pullX * p,
      cy: y + pullY * p,
    };
  });

  const haloProps = useAnimatedProps(() => {
    const p = reduced ? 0 : pressed.value;
    return {
      r: liveR.value + breath.value + GLOW_PAD[heat],
      cx: x + pullX * p,
      cy: y + pullY * p,
      fillOpacity: GLOW_ALPHA[heat] * (1 + (PRESS_FLARE - 1) * p),
    };
  });

  return (
    <>
      <AnimatedCircle animatedProps={haloProps} fill={color} />
      <AnimatedCircle animatedProps={dotProps} fill={color} />
    </>
  );
}
