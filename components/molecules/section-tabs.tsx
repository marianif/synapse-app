import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

// Soft slide for the active underline — the same custom ease-in-out bezier and
// duration used by the shelf's list↔grid morph, so every layout shift in the
// app reads as one calm motion family: gentle onset, long settling tail, no
// spring bounce.
const TAB_MOTION = {
  duration: 260,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

/** One tab in a SectionTabs row. */
export interface SectionTab<T extends string> {
  value: T;
  label: string;
  /** Optional live tally, set in mono beside the label. */
  count?: number;
  /** Optional active-underline accent — tints the rule instead of neutral ink. */
  accent?: string;
  /** Optional per-tab accessible name; defaults to the label. */
  accessibilityLabel?: string;
}

interface SectionTabsProps<T extends string> {
  value: T;
  options: SectionTab<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the whole row (announced when rendered as a tablist). */
  accessibilityLabel: string;
  /** Label voice — editorial (Inter semi-bold) or mono (signal layer). */
  variant?: "editorial" | "mono";
  /** Render as an accessibility tablist/tab pair instead of plain buttons. */
  tabs?: boolean;
  /** Let the row wrap to a second line when it overflows. */
  wrap?: boolean;
}

/**
 * Editorial tab row — a line of section labels, the active one full-ink with a
 * thin underline rule, the rest muted with none. No pills, no fills. Optional
 * mono counts let a tab double as a live tally, and an optional `accent` tints
 * the active underline so a filter can speak the same color language as the
 * entries it narrows. Shared by the diary, direct, and list filter bars.
 *
 * Motion: a single 2px rule glides to the active tab rather than teleporting —
 * each tab keeps an invisible rule slot so the label-to-underline gap is
 * stable, and one animated rule slides between the measured slots. `transform`
 * + `opacity` + width on an absolutely-positioned overlay only; no layout
 * thrash on the tabs themselves.
 */
export function SectionTabs<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  variant = "editorial",
  tabs = false,
  wrap = false,
}: SectionTabsProps<T>): React.ReactElement {
  const { colors } = useTheme();

  // Measured frames (relative to the row) for every tab, keyed by value.
  // Collected via onLayout so the rule can slide to arbitrary-width tabs.
  const [frames, setFrames] = useState<Record<string, TabFrame>>({});
  const activeFrame = frames[value];
  const activeOption = options.find((option) => option.value === value);

  const ruleX = useSharedValue(0);
  const ruleY = useSharedValue(0);
  const ruleW = useSharedValue(0);
  const ruleOpacity = useSharedValue(0);
  // First measurement snaps the rule into place (no entry sweep from origin);
  // subsequent switches animate.
  const positioned = useRef(false);

  useEffect(() => {
    const frame = activeFrame;
    if (!frame) return;
    const x = frame.x;
    const y = frame.y + frame.height - 2; // rule is 2pt tall, sits on the tab's bottom edge
    const w = frame.width;
    if (!positioned.current) {
      ruleX.value = x;
      ruleY.value = y;
      ruleW.value = w;
      ruleOpacity.value = 1;
      positioned.current = true;
    } else {
      ruleX.value = withTiming(x, TAB_MOTION);
      ruleY.value = withTiming(y, TAB_MOTION);
      ruleW.value = withTiming(w, TAB_MOTION);
      ruleOpacity.value = withTiming(1, TAB_MOTION);
    }
  }, [activeFrame, ruleOpacity, ruleW, ruleX, ruleY]);

  const ruleStyle = useAnimatedStyle(() => ({
    opacity: ruleOpacity.value,
    transform: [
      { translateX: ruleX.value },
      { translateY: ruleY.value },
    ],
    width: ruleW.value,
  }));

  const handleTabLayout =
    (optionValue: T) =>
    (event: LayoutChangeEvent): void => {
      const { x, y, width, height } = event.nativeEvent.layout;
      setFrames((prev) => {
        const current = prev[optionValue];
        if (
          current &&
          current.x === x &&
          current.y === y &&
          current.width === width &&
          current.height === height
        ) {
          return prev;
        }
        return { ...prev, [optionValue]: { x, y, width, height } };
      });
    };

  return (
    <View
      style={[styles.row, wrap && styles.wrap]}
      accessibilityRole={tabs ? "tablist" : undefined}
      accessibilityLabel={tabs ? accessibilityLabel : undefined}
    >
      {options.map((option) => {
        const active = value === option.value;
        const labelColor = active ? colors.ink : colors.inkMuted;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            hitSlop={8}
            accessibilityRole={tabs ? "tab" : "button"}
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            onLayout={handleTabLayout(option.value)}
            style={styles.tab}
          >
            <View style={styles.tabHeader}>
              <ThemedText
                type={variant === "mono" ? "mono" : undefined}
                style={[
                  variant === "editorial" ? styles.editorial : undefined,
                  { color: labelColor },
                ]}
              >
                {option.label}
              </ThemedText>
              {option.count !== undefined ? (
                <ThemedText type="mono" style={{ color: labelColor }}>
                  {option.count}
                </ThemedText>
              ) : null}
            </View>
            {/* Invisible rule slot — keeps the label-to-underline gap stable
                and gives the sliding rule a measured target. */}
            <View style={styles.ruleSlot} />
          </Pressable>
        );
      })}

      {/* The one visible rule, gliding between tab slots. */}
      {activeFrame ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rule,
            { backgroundColor: activeOption?.accent ?? colors.ink },
            ruleStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

interface TabFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.space.lg,
  },
  wrap: {
    flexWrap: "wrap",
  },
  tab: {
    alignItems: "flex-start",
    gap: 5,
  },
  tabHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.sm,
  },
  editorial: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  ruleSlot: {
    alignSelf: "stretch",
    height: 2,
  },
  rule: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 2,
    borderRadius: tokens.radius.pill,
  },
});