import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { tokens, useTheme } from "@/constants/theme";

/**
 * The dock's fill register. The capture line reads as CONTENT while it waits to
 * be filled (`surface`, a quiet tile), and flips to the neutral INTERFACE slab
 * the moment the user acts — recording, or resolving a caught thought. That fill
 * shift IS a state signal: content-register while idle, interface-register while
 * acting (DESIGN.md — the neutral slab means "interface, not content").
 */
export type DockRegister = "surface" | "slab";

interface DockShellProps {
  /** Which fill the active content wants — drives the animated surface→slab lerp. */
  register: DockRegister;
  /**
   * A stable key for the active content. When it changes, the shell cross-fades
   * its body (old out, new in) instead of letting the swap pop — the instrument
   * transforms in place rather than swapping widgets.
   */
  contentKey: string;
  children: React.ReactNode;
}

/**
 * The one persistent frame every capture surface lives inside. The dock is a
 * single instrument that receives a thought and unfolds to file it — NOT three
 * widgets (bar / recorder / resolver) that each slide in with their own radius,
 * fill, and entrance. Before this shell those three read as "a bunch of things
 * anchored together"; the shell gives them one silhouette (`radius.lg`, one
 * elevation), one entrance (a single slide-up on first summon, never re-fired on
 * an inner swap), one animated fill (surface↔slab), and an animated height so
 * the panel grows and shrinks in place as its readout changes.
 *
 * The body cross-fades on `contentKey` change: the outgoing readout fades out as
 * the incoming fades in, both inside the same frame. The height tracks whichever
 * content is measured, so the frame reshapes smoothly around the swap. This is
 * the Field Lab instrument panel applied to capture — one panel, changing
 * readouts — instead of a stack of separate objects.
 */
export function DockShell({
  register,
  contentKey,
  children,
}: DockShellProps): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  // Single entrance: a soft fade paired with a short rise from below (not a
  // full slide from off-screen) on the first summon of this dock session.
  // Held in a ref so an inner content swap (bar → resolver) never re-triggers
  // it and jumps the panel mid-interaction — the frame is already on screen.
  // FadeInDown genuinely animates translateY back to 0 (unlike plain FadeIn,
  // which only fades and leaves any transform pinned at its initial value);
  // the shortened 16px travel + fade reads as a gentle rise into place rather
  // than a slide-up, which felt mechanical at the full distance.
  const firstMount = useRef(true);
  useEffect(() => {
    firstMount.current = false;
  }, []);
  const entering =
    reduced || !firstMount.current
      ? undefined
      : FadeInDown.duration(420)
          .easing(Easing.out(Easing.quad))
          .withInitialValues({ transform: [{ translateY: 16 }] });

  // Fill lerp: 0 = surface (idle, content register), 1 = slab (acting, interface
  // register). Animated so the register shift reads as a transition, not a cut.
  // Always starts from surface (0), even when the shell is summoned straight
  // into slab register (e.g. the global capture dock, which has no idle
  // surface state to sit in first) — otherwise the panel pops in already
  // fully clay-colored and slides on top of that flat fill, which reads as a
  // glitch next to the notes composer's calm surface-toned slide.
  const fill = useSharedValue(0);
  useEffect(() => {
    const to = register === "slab" ? 1 : 0;
    fill.value = reduced
      ? to
      : withTiming(to, {
          duration: tokens.motion.duration.base,
          easing: Easing.out(Easing.cubic),
        });
  }, [register, reduced, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fill.value,
      [0, 1],
      [colors.surface, colors.accent.clay],
    ),
  }));

  // The frame reshapes to whatever the active body naturally measures: the body
  // stays in-flow (it sizes the shell), and a layout animation on the shell
  // makes that reflow smooth, so a taller readout (the resolver workbench) grows
  // the panel and a shorter one (the idle line) shrinks it — in place, no cut.
  // Reanimated's layout animation drives height off the UI thread; on reduced
  // motion we drop it so resizing is instant (the brand's reduced-motion rule).
  const layout = reduced
    ? undefined
    : LinearTransition.duration(tokens.motion.duration.base).easing(
        Easing.out(Easing.cubic),
      );

  // Body cross-fade: keyed on contentKey so React swaps the child, and the fade
  // rides the swap. Reduced motion → instant (opacity stays 1, key swap is a cut
  // with no continuous motion, per the brand's reduced-motion contract).
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      return;
    }
    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: tokens.motion.duration.fast,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentKey, reduced, opacity]);

  const bodyStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      entering={entering}
      layout={layout}
      style={[styles.shell, fillStyle, tokens.elevation.capture]}
    >
      {/* The body sizes the shell (in-flow), and cross-fades on contentKey so
          the readout swaps inside one persistent frame. */}
      <Animated.View
        key={contentKey}
        layout={layout}
        style={[styles.body, bodyStyle]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // One silhouette for the whole dock: a single sharp instrument radius, one
  // clipped frame, one elevation. No per-surface radius/fill/margin — the shell
  // is the only frame.
  shell: {
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
  },
  body: {
    // In-flow so it sizes the shell; children own their internal padding.
    width: "100%",
  },
});
