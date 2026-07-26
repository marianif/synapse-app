import { useEffect, useRef } from "react";
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
import type { InputStageHandle } from "@/components/organisms/input-stage-view";
import { tokens } from "@/constants/theme";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import type { DbProject } from "@/lib/types";
import { useUIStore } from "@/stores/ui-store";

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
}: CaptureDockProps): React.ReactElement | null {
  const dockVisible = useUIStore((s) => s.captureDockVisible);
  const keyboardLift = useSharedValue(0);
  // The input never autofocuses on mount — only an explicit tap (the pen key,
  // or a tap on the resting bar itself) focuses it, via the imperative ref
  // registered through `registerDockFocus`. That keeps the keyboard's first
  // "show" decoupled from DockShell's 320ms entrance slide, so the two never
  // race into a rushed double-motion regardless of whether the dock just
  // mounted (project screens) or was already resting (home).
  const isOpen =
    cap.composerOpen || cap.isRecording || cap.pendingThought !== null;
  const justOpened = useRef(isOpen);
  const wasOpen = useRef(isOpen);
  if (isOpen && !wasOpen.current) justOpened.current = true;
  wasOpen.current = isOpen;

  // Park the input's focus handle with the capture hook so `requestCapture`
  // can focus it on a pen-tap while the dock is already resting visible
  // (home) instead of only firing at mount.
  const inputRef = useRef<InputStageHandle | null>(null);
  useEffect(
    () => cap.registerDockFocus(() => inputRef.current?.focus()),
    [cap],
  );

  useEffect(() => {
    // iOS reports willShow/willHide with a duration we can match; Android only
    // fires didShow/didHide, so we fall back to a quick eased timing.
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      // A keyboard opened by some OTHER surface (e.g. the detail sheet's
      // inline edit) while the dock is suppressed must not lift the dock —
      // it isn't rendered, but the shared value would still animate and jump
      // once dockVisible flips back on.
      if (!dockVisible) return;
      const lift = Math.max(0, e.endCoordinates.height - restOffset);
      if (justOpened.current) {
        justOpened.current = false;
        keyboardLift.value = lift;
        return;
      }
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
  }, [restOffset, keyboardLift, dockVisible]);

  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardLift.value * 1.05 }],
  }));

  // Suppressing the dock unmounts it without a matching keyboardDidHide (the
  // OTHER surface's keyboard fires that instead) — reset the lift so it isn't
  // still offset from a stale value when it reappears.
  useEffect(() => {
    if (!dockVisible) keyboardLift.value = 0;
  }, [dockVisible, keyboardLift]);

  if (!dockVisible) return null;

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
        <CaptureComposer ref={inputRef} cap={cap} projects={projects} />
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
