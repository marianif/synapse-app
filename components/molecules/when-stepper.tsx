import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens } from "@/constants/theme";

/**
 * A value flanked by two press-and-hold chevron steppers. Bare glyphs, no box.
 * A tap fires the small step (`onLeft`/`onRight`); holding fires the big jump
 * (`onLeftHold`/`onRightHold`) on repeat.
 */
export function WhenStepper({
  accent,
  onLeft,
  onRight,
  onLeftHold,
  onRightHold,
  accessibilityLabel,
  children,
}: {
  accent: string;
  onLeft: () => void;
  onRight: () => void;
  onLeftHold: () => void;
  onRightHold: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.stepper} accessibilityLabel={accessibilityLabel}>
      <RepeatButton
        onTrigger={onLeft}
        onRepeat={onLeftHold}
        accessibilityLabel="Decrease"
      >
        <IconSymbol name="ChevronLeft" size={22} color={accent} />
      </RepeatButton>
      {children}
      <RepeatButton
        onTrigger={onRight}
        onRepeat={onRightHold}
        accessibilityLabel="Increase"
      >
        <IconSymbol name="ChevronRight" size={22} color={accent} />
      </RepeatButton>
    </View>
  );
}

/**
 * Fires `onTrigger` once on press (a tap = small step). Hold past the delay and
 * it switches to `onRepeat` (a big jump) on a steady tick — so the user nudges
 * by ±1 with a tap and travels by the big step by holding, no press-press-press.
 */
function RepeatButton({
  onTrigger,
  onRepeat,
  accessibilityLabel,
  children,
}: {
  onTrigger: () => void;
  onRepeat: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start(): void {
    onTrigger();
    // Hold: after a short delay, repeat with the big jump at a steady tick.
    delay.current = setTimeout(() => {
      timer.current = setInterval(onRepeat, 120);
    }, 350);
  }

  function stop(): void {
    if (delay.current) clearTimeout(delay.current);
    if (timer.current) clearInterval(timer.current);
    delay.current = null;
    timer.current = null;
  }

  useEffect(() => stop, []);

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.repeat, pressed && { opacity: 0.5 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  repeat: {
    paddingVertical: tokens.space.xs,
  },
});
