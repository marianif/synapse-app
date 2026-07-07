import { useEffect } from "react";
import { Keyboard, Platform, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  CaptureBackdrop,
  CaptureComposer,
} from "@/components/organisms/capture-composer";
import { tokens } from "@/constants/theme";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import type { DbProject } from "@/lib/types";

interface CaptureDockProps {
  cap: UseCaptureReturn;
  projects: DbProject[];
  /** Distance from the screen bottom the dock rests at when idle — the tab
   *  bar's own height plus the dock's `bottom` gap. Passed in by the layout
   *  that owns the tab bar, so this never has to re-guess that geometry. */
  restOffset: number;
}

/**
 * The capture dock overlay — backdrop + composer, riding above the keyboard.
 * Lives at the tab-layout level (not per-screen) so the SAME dock instance
 * floats over whichever tab is active; the pen key in the tab bar drives it
 * directly instead of navigating to a screen that happens to own one.
 */
export function CaptureDock({
  cap,
  projects,
  restOffset,
}: CaptureDockProps): React.ReactElement {
  const keyboardLift = useSharedValue(0);
  useEffect(() => {
    // iOS reports willShow/willHide with a duration we can match; Android only
    // fires didShow/didHide, so we fall back to a quick eased timing.
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      const lift = Math.max(0, e.endCoordinates.height - restOffset);
      keyboardLift.value = withTiming(lift, {
        duration: e.duration || 220,
        easing: Easing.out(Easing.cubic),
      });
    });
    const hide = Keyboard.addListener(hideEvt, (e) => {
      keyboardLift.value = withTiming(0, {
        duration: e?.duration || 200,
        easing: Easing.out(Easing.cubic),
      });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [restOffset, keyboardLift]);

  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardLift.value }],
  }));

  return (
    <>
      {/* Outside-tap backdrop — a transparent full-screen catcher that only
          exists while a dismissible dock surface is up. Screen-level (not
          inside the lifted dock) so it spans the whole field. */}
      <CaptureBackdrop cap={cap} />

      <Animated.View
        style={[styles.captureDock, { bottom: restOffset }, dockStyle]}
        pointerEvents="box-none"
      >
        <CaptureComposer cap={cap} projects={projects} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  captureDock: {
    position: "absolute",
    left: tokens.space.lg,
    right: tokens.space.lg,
    // `bottom` is supplied by the layout (restOffset) so the dock rests in the
    // band ABOVE the tab bar rather than overlapping it.
  },
});
